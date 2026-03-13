import { Request, Response } from 'express';
import prisma from '../config/database';
import { parsePagination } from '../utils/pagination';

export const getRecentActivity = async (req: Request, res: Response): Promise<void> => {
  const restaurantId = req.user!.restaurantId;
  const { page, limit, skip } = parsePagination(
    req.query.page,
    req.query.limit,
    100,
    50,
  );
  const typeFilter = req.query.type as string | undefined;

  // Fetch enough source rows to allow stable page slicing after merge/sort.
  const sourceTake = Math.min(500, page * limit);

  const [orders, payments, reservations, inventoryMovements] = await Promise.all([
    prisma.order.findMany({
      where: { restaurantId },
      orderBy: { createdAt: 'desc' },
      take: sourceTake,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        total: true,
        paymentStatus: true,
        createdAt: true,
        user: { select: { firstName: true, lastName: true } },
        table: { select: { number: true } },
      },
    }),
    prisma.payment.findMany({
      where: { order: { restaurantId } },
      orderBy: { createdAt: 'desc' },
      take: sourceTake,
      select: {
        id: true,
        amount: true,
        method: true,
        createdAt: true,
        order: { select: { orderNumber: true } },
      },
    }),
    prisma.reservation.findMany({
      where: { restaurantId },
      orderBy: { createdAt: 'desc' },
      take: sourceTake,
      select: {
        id: true,
        customerName: true,
        guestCount: true,
        status: true,
        date: true,
        createdAt: true,
      },
    }),
    prisma.inventoryMovement.findMany({
      where: { restaurantId },
      orderBy: { createdAt: 'desc' },
      take: sourceTake,
      select: {
        id: true,
        type: true,
        quantity: true,
        notes: true,
        createdAt: true,
        item: { select: { name: true, unit: true } },
      },
    }),
  ]);

  const activities = [
    ...orders.map((o) => ({
      id: o.id,
      type: 'order' as const,
      title: `Order ${o.orderNumber}`,
      description: `${o.status} — ${o.total.toLocaleString()} FCFA${o.table ? ` (Table ${o.table.number})` : ''}`,
      actor: `${o.user.firstName} ${o.user.lastName}`,
      timestamp: o.createdAt,
    })),
    ...payments.map((p) => ({
      id: p.id,
      type: 'payment' as const,
      title: `Payment for ${p.order.orderNumber}`,
      description: `${p.method} — ${p.amount.toLocaleString()} FCFA`,
      actor: null,
      timestamp: p.createdAt,
    })),
    ...reservations.map((r) => ({
      id: r.id,
      type: 'reservation' as const,
      title: `Reservation — ${r.customerName}`,
      description: `${r.guestCount} guests, ${r.status}`,
      actor: null,
      timestamp: r.createdAt,
    })),
    ...inventoryMovements.map((m) => ({
      id: m.id,
      type: 'inventory' as const,
      title: `Inventory ${m.type}`,
      description: `${m.item.name}: ${m.quantity} ${m.item.unit}${m.notes ? ` — ${m.notes}` : ''}`,
      actor: null,
      timestamp: m.createdAt,
    })),
  ];

  activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const filteredActivities = typeFilter
    ? activities.filter((activity) => activity.type === typeFilter)
    : activities;

  res.json(filteredActivities.slice(skip, skip + limit));
};
