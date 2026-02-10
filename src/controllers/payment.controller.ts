import { Request, Response } from 'express';
import prisma from '../config/database';
import { AppError } from '../middlewares/error.middleware';
import { OrderStatus, PaymentStatus, PaymentMethod } from '@prisma/client';
import { getIO } from '../config/socket';

// ─── PAYMENTS ─────────────────────────────────────────────────

export const processPayment = async (req: Request, res: Response): Promise<void> => {
  const restaurantId = req.user!.restaurantId;
  const { orderId, amount, method, reference, notes } = req.body;

  const order = await prisma.order.findFirst({
    where: { id: orderId, restaurantId },
    include: { payments: true },
  });

  if (!order) {
    throw new AppError('Order not found', 404);
  }

  if (order.status === OrderStatus.CANCELLED) {
    throw new AppError('Cannot pay for a cancelled order', 400);
  }

  const totalPaid = order.payments.reduce((sum, p) => sum + p.amount, 0);
  const remaining = order.total - totalPaid;

  if (amount > remaining + 0.01) {
    throw new AppError(`Amount exceeds remaining balance: ${remaining}`, 400);
  }

  const payment = await prisma.payment.create({
    data: {
      orderId,
      amount,
      method: method as PaymentMethod,
      reference,
      notes,
    },
  });

  const newTotalPaid = totalPaid + amount;
  const isPaid = newTotalPaid >= order.total - 0.01;

  await prisma.order.update({
    where: { id: orderId },
    data: {
      paymentStatus: isPaid ? PaymentStatus.PAID : PaymentStatus.PARTIAL,
      paymentMethod: method as PaymentMethod,
      ...(isPaid && { status: OrderStatus.PAID, completedAt: new Date() }),
    },
  });

  getIO().to(`restaurant:${restaurantId}`).emit('order:paid', {
    orderId,
    payment,
    paymentStatus: isPaid ? 'PAID' : 'PARTIAL',
    totalPaid: newTotalPaid,
    remaining: Math.max(0, order.total - newTotalPaid),
  });

  res.status(201).json({
    payment,
    orderTotal: order.total,
    totalPaid: newTotalPaid,
    remaining: Math.max(0, order.total - newTotalPaid),
    paymentStatus: isPaid ? 'PAID' : 'PARTIAL',
  });
};

export const splitPayment = async (req: Request, res: Response): Promise<void> => {
  const restaurantId = req.user!.restaurantId;
  const { orderId, splits } = req.body;

  const order = await prisma.order.findFirst({
    where: { id: orderId, restaurantId },
  });

  if (!order) {
    throw new AppError('Order not found', 404);
  }

  const totalSplitAmount = splits.reduce(
    (sum: number, s: { amount: number }) => sum + s.amount,
    0
  );

  if (Math.abs(totalSplitAmount - order.total) > 0.01) {
    throw new AppError(
      `Split amounts (${totalSplitAmount}) must equal order total (${order.total})`,
      400
    );
  }

  const payments = await prisma.$transaction(
    splits.map((split: { amount: number; method: PaymentMethod; reference?: string }) =>
      prisma.payment.create({
        data: {
          orderId,
          amount: split.amount,
          method: split.method,
          reference: split.reference,
        },
      })
    )
  );

  await prisma.order.update({
    where: { id: orderId },
    data: {
      paymentStatus: PaymentStatus.PAID,
      status: OrderStatus.PAID,
      completedAt: new Date(),
    },
  });

  res.status(201).json({ payments, orderTotal: order.total });
};

export const getOrderPayments = async (req: Request, res: Response): Promise<void> => {
  const restaurantId = req.user!.restaurantId;
  const { orderId } = req.params;

  const order = await prisma.order.findFirst({
    where: { id: orderId, restaurantId },
    include: { payments: { orderBy: { createdAt: 'asc' } } },
  });

  if (!order) {
    throw new AppError('Order not found', 404);
  }

  const totalPaid = order.payments.reduce((sum, p) => sum + p.amount, 0);

  res.json({
    payments: order.payments,
    orderTotal: order.total,
    totalPaid,
    remaining: Math.max(0, order.total - totalPaid),
    paymentStatus: order.paymentStatus,
  });
};

export const refundPayment = async (req: Request, res: Response): Promise<void> => {
  const restaurantId = req.user!.restaurantId;
  const { paymentId } = req.params;
  const { amount, notes } = req.body;

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { order: true },
  });

  if (!payment || payment.order.restaurantId !== restaurantId) {
    throw new AppError('Payment not found', 404);
  }

  const refundAmount = amount || payment.amount;

  if (refundAmount > payment.amount) {
    throw new AppError('Refund amount exceeds payment amount', 400);
  }

  const refund = await prisma.payment.create({
    data: {
      orderId: payment.orderId,
      amount: -refundAmount,
      method: payment.method,
      reference: `REFUND:${payment.id}`,
      notes: notes || `Refund of payment ${payment.id}`,
    },
  });

  const allPayments = await prisma.payment.findMany({
    where: { orderId: payment.orderId },
  });

  const newTotal = allPayments.reduce((sum, p) => sum + p.amount, 0);

  await prisma.order.update({
    where: { id: payment.orderId },
    data: {
      paymentStatus: newTotal <= 0 ? PaymentStatus.REFUNDED : PaymentStatus.PARTIAL,
    },
  });

  res.json(refund);
};

// ─── CASH REGISTER / SESSIONS ─────────────────────────────────

export const openCashSession = async (req: Request, res: Response): Promise<void> => {
  const restaurantId = req.user!.restaurantId;
  const { registerId, openingAmount } = req.body;

  const register = await prisma.cashRegister.findFirst({
    where: { id: registerId, restaurantId, isActive: true },
  });

  if (!register) {
    throw new AppError('Cash register not found', 404);
  }

  const activeSession = await prisma.cashSession.findFirst({
    where: { registerId, closedAt: null },
  });

  if (activeSession) {
    throw new AppError('There is already an active session on this register', 400);
  }

  const session = await prisma.cashSession.create({
    data: {
      registerId,
      userId: req.user!.id,
      openingAmount: openingAmount || 0,
    },
    include: {
      register: true,
      user: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  res.status(201).json(session);
};

export const closeCashSession = async (req: Request, res: Response): Promise<void> => {
  const { sessionId } = req.params;
  const { closingAmount, notes } = req.body;

  const session = await prisma.cashSession.findUnique({
    where: { id: sessionId },
    include: { register: true },
  });

  if (!session) {
    throw new AppError('Cash session not found', 404);
  }

  if (session.closedAt) {
    throw new AppError('Session is already closed', 400);
  }

  const cashPayments = await prisma.payment.findMany({
    where: {
      method: 'CASH',
      createdAt: { gte: session.openedAt },
      order: { restaurantId: session.register.restaurantId },
    },
  });

  const totalCashReceived = cashPayments.reduce((sum, p) => sum + p.amount, 0);
  const expectedAmount = session.openingAmount + totalCashReceived;
  const difference = closingAmount - expectedAmount;

  const updatedSession = await prisma.cashSession.update({
    where: { id: sessionId },
    data: {
      closingAmount,
      expectedAmount,
      difference,
      closedAt: new Date(),
      notes,
    },
    include: {
      register: true,
      user: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  res.json(updatedSession);
};

export const getActiveSessions = async (req: Request, res: Response): Promise<void> => {
  const restaurantId = req.user!.restaurantId;

  const sessions = await prisma.cashSession.findMany({
    where: {
      closedAt: null,
      register: { restaurantId },
    },
    include: {
      register: true,
      user: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  res.json(sessions);
};

export const getCashSessionHistory = async (req: Request, res: Response): Promise<void> => {
  const restaurantId = req.user!.restaurantId;
  const { startDate, endDate } = req.query;

  const where: Record<string, unknown> = {
    register: { restaurantId },
    closedAt: { not: null },
  };

  if (startDate || endDate) {
    where.openedAt = {
      ...(startDate && { gte: new Date(startDate as string) }),
      ...(endDate && { lte: new Date(endDate as string) }),
    };
  }

  const sessions = await prisma.cashSession.findMany({
    where,
    include: {
      register: true,
      user: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: { openedAt: 'desc' },
  });

  res.json(sessions);
};

// ─── Z REPORT (END OF DAY) ───────────────────────────────────

export const generateZReport = async (req: Request, res: Response): Promise<void> => {
  const restaurantId = req.user!.restaurantId;
  const { date } = req.query;

  const reportDate = date ? new Date(date as string) : new Date();
  const startOfDay = new Date(reportDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(reportDate);
  endOfDay.setHours(23, 59, 59, 999);

  const orders = await prisma.order.findMany({
    where: {
      restaurantId,
      createdAt: { gte: startOfDay, lte: endOfDay },
    },
    include: { payments: true, items: true },
  });

  const paidOrders = orders.filter((o) => o.paymentStatus === 'PAID');
  const cancelledOrders = orders.filter((o) => o.status === 'CANCELLED');

  const allPayments = paidOrders.flatMap((o) => o.payments);

  const paymentByMethod: Record<string, number> = {};
  for (const p of allPayments) {
    if (p.amount > 0) {
      paymentByMethod[p.method] = (paymentByMethod[p.method] || 0) + p.amount;
    }
  }

  const totalRevenue = paidOrders.reduce((sum, o) => sum + o.total, 0);
  const totalTax = paidOrders.reduce((sum, o) => sum + o.tax, 0);
  const totalServiceCharge = paidOrders.reduce((sum, o) => sum + o.serviceCharge, 0);
  const totalDiscount = paidOrders.reduce((sum, o) => sum + o.discount, 0);
  const totalSubtotal = paidOrders.reduce((sum, o) => sum + o.subtotal, 0);
  const totalRefunds = allPayments
    .filter((p) => p.amount < 0)
    .reduce((sum, p) => sum + Math.abs(p.amount), 0);

  const sessions = await prisma.cashSession.findMany({
    where: {
      register: { restaurantId },
      openedAt: { gte: startOfDay, lte: endOfDay },
    },
    include: {
      register: true,
      user: { select: { firstName: true, lastName: true } },
    },
  });

  const avgTicket = paidOrders.length > 0 ? totalRevenue / paidOrders.length : 0;

  res.json({
    date: reportDate.toISOString().split('T')[0],
    summary: {
      totalOrders: orders.length,
      paidOrders: paidOrders.length,
      cancelledOrders: cancelledOrders.length,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalSubtotal: Math.round(totalSubtotal * 100) / 100,
      totalTax: Math.round(totalTax * 100) / 100,
      totalServiceCharge: Math.round(totalServiceCharge * 100) / 100,
      totalDiscount: Math.round(totalDiscount * 100) / 100,
      totalRefunds: Math.round(totalRefunds * 100) / 100,
      netRevenue: Math.round((totalRevenue - totalRefunds) * 100) / 100,
      averageTicket: Math.round(avgTicket * 100) / 100,
    },
    paymentBreakdown: paymentByMethod,
    cashSessions: sessions,
  });
};

// ─── RECEIPT DATA ─────────────────────────────────────────────

export const getReceiptData = async (req: Request, res: Response): Promise<void> => {
  const restaurantId = req.user!.restaurantId;
  const { orderId } = req.params;

  const order = await prisma.order.findFirst({
    where: { id: orderId, restaurantId },
    include: {
      items: { include: { menuItem: { select: { name: true } } } },
      payments: true,
      table: { select: { number: true } },
      user: { select: { firstName: true, lastName: true } },
      restaurant: {
        select: { name: true, address: true, phone: true, email: true, currency: true },
      },
    },
  });

  if (!order) {
    throw new AppError('Order not found', 404);
  }

  res.json({
    restaurant: order.restaurant,
    orderNumber: order.orderNumber,
    date: order.createdAt,
    table: order.table?.number || 'N/A',
    server: `${order.user.firstName} ${order.user.lastName}`,
    guestCount: order.guestCount,
    items: order.items.map((item) => ({
      name: item.menuItem.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      total: item.total,
      notes: item.notes,
    })),
    subtotal: order.subtotal,
    tax: order.tax,
    serviceCharge: order.serviceCharge,
    discount: order.discount,
    total: order.total,
    payments: order.payments.map((p) => ({
      method: p.method,
      amount: p.amount,
      reference: p.reference,
    })),
    currency: order.restaurant.currency,
  });
};
