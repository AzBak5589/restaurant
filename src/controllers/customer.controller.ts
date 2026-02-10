import { Request, Response } from 'express';
import prisma from '../config/database';
import { AppError } from '../middlewares/error.middleware';

// ─── CUSTOMERS ────────────────────────────────────────────────

export const getCustomers = async (req: Request, res: Response): Promise<void> => {
  const restaurantId = req.user!.restaurantId;
  const { search, isActive } = req.query;

  const where: Record<string, unknown> = { restaurantId };
  if (isActive !== undefined) where.isActive = isActive === 'true';

  if (search) {
    where.OR = [
      { firstName: { contains: search as string, mode: 'insensitive' } },
      { lastName: { contains: search as string, mode: 'insensitive' } },
      { phone: { contains: search as string } },
      { email: { contains: search as string, mode: 'insensitive' } },
    ];
  }

  const customers = await prisma.customer.findMany({
    where,
    orderBy: { firstName: 'asc' },
  });

  res.json(customers);
};

export const getCustomerById = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const restaurantId = req.user!.restaurantId;

  const customer = await prisma.customer.findFirst({
    where: { id, restaurantId },
    include: {
      orders: {
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          orderNumber: true,
          total: true,
          status: true,
          paymentStatus: true,
          createdAt: true,
        },
      },
      reservations: {
        orderBy: { date: 'desc' },
        take: 10,
        select: {
          id: true,
          date: true,
          startTime: true,
          guestCount: true,
          status: true,
        },
      },
      loyaltyTransactions: {
        orderBy: { createdAt: 'desc' },
        take: 20,
      },
    },
  });

  if (!customer) {
    throw new AppError('Customer not found', 404);
  }

  res.json(customer);
};

export const createCustomer = async (req: Request, res: Response): Promise<void> => {
  const restaurantId = req.user!.restaurantId;
  const { firstName, lastName, email, phone, birthDate, address, notes } = req.body;

  const existing = await prisma.customer.findUnique({
    where: { restaurantId_phone: { restaurantId, phone } },
  });

  if (existing) {
    throw new AppError('Customer with this phone already exists', 400);
  }

  const customer = await prisma.customer.create({
    data: {
      restaurantId,
      firstName,
      lastName,
      email,
      phone,
      birthDate: birthDate ? new Date(birthDate) : undefined,
      address,
      notes,
    },
  });

  res.status(201).json(customer);
};

export const updateCustomer = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const restaurantId = req.user!.restaurantId;

  const customer = await prisma.customer.findFirst({ where: { id, restaurantId } });
  if (!customer) {
    throw new AppError('Customer not found', 404);
  }

  const data = { ...req.body };
  if (data.birthDate) data.birthDate = new Date(data.birthDate);

  const updatedCustomer = await prisma.customer.update({
    where: { id },
    data,
  });

  res.json(updatedCustomer);
};

// ─── LOYALTY ──────────────────────────────────────────────────

export const addLoyaltyPoints = async (req: Request, res: Response): Promise<void> => {
  const restaurantId = req.user!.restaurantId;
  const { customerId, points, type, reference, notes } = req.body;

  const customer = await prisma.customer.findFirst({
    where: { id: customerId, restaurantId },
  });

  if (!customer) {
    throw new AppError('Customer not found', 404);
  }

  const [transaction] = await prisma.$transaction([
    prisma.loyaltyTransaction.create({
      data: { customerId, points, type: type || 'EARN', reference, notes },
    }),
    prisma.customer.update({
      where: { id: customerId },
      data: { loyaltyPoints: { increment: points } },
    }),
  ]);

  res.status(201).json(transaction);
};

export const redeemLoyaltyPoints = async (req: Request, res: Response): Promise<void> => {
  const restaurantId = req.user!.restaurantId;
  const { customerId, points, notes } = req.body;

  const customer = await prisma.customer.findFirst({
    where: { id: customerId, restaurantId },
  });

  if (!customer) {
    throw new AppError('Customer not found', 404);
  }

  const program = await prisma.loyaltyProgram.findFirst({
    where: { restaurantId, isActive: true },
  });

  if (!program) {
    throw new AppError('No active loyalty program', 400);
  }

  if (points < program.minRedemption) {
    throw new AppError(`Minimum redemption is ${program.minRedemption} points`, 400);
  }

  if (customer.loyaltyPoints < points) {
    throw new AppError(
      `Insufficient points. Available: ${customer.loyaltyPoints}`,
      400
    );
  }

  const discountAmount = points * program.amountPerPoint;

  const [transaction] = await prisma.$transaction([
    prisma.loyaltyTransaction.create({
      data: {
        customerId,
        points: -points,
        type: 'REDEEM',
        notes: notes || `Redeemed ${points} points for ${discountAmount} discount`,
      },
    }),
    prisma.customer.update({
      where: { id: customerId },
      data: { loyaltyPoints: { decrement: points } },
    }),
  ]);

  res.json({
    transaction,
    discountAmount,
    remainingPoints: customer.loyaltyPoints - points,
  });
};

export const getLoyaltyBalance = async (req: Request, res: Response): Promise<void> => {
  const restaurantId = req.user!.restaurantId;
  const { customerId } = req.params;

  const customer = await prisma.customer.findFirst({
    where: { id: customerId, restaurantId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      loyaltyPoints: true,
      totalSpent: true,
      visitCount: true,
    },
  });

  if (!customer) {
    throw new AppError('Customer not found', 404);
  }

  const program = await prisma.loyaltyProgram.findFirst({
    where: { restaurantId, isActive: true },
  });

  res.json({
    customer,
    program: program
      ? {
          name: program.name,
          pointsPerAmount: program.pointsPerAmount,
          amountPerPoint: program.amountPerPoint,
          minRedemption: program.minRedemption,
          redeemableValue: customer.loyaltyPoints * (program.amountPerPoint || 0),
          canRedeem: customer.loyaltyPoints >= program.minRedemption,
        }
      : null,
  });
};

export const getLoyaltyTransactions = async (req: Request, res: Response): Promise<void> => {
  const restaurantId = req.user!.restaurantId;
  const { customerId } = req.params;

  const customer = await prisma.customer.findFirst({
    where: { id: customerId, restaurantId },
  });

  if (!customer) {
    throw new AppError('Customer not found', 404);
  }

  const transactions = await prisma.loyaltyTransaction.findMany({
    where: { customerId },
    orderBy: { createdAt: 'desc' },
  });

  res.json(transactions);
};
