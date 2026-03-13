import { Request, Response } from 'express';
import prisma from '../config/database';

const buildDateRange = (
  query: Request['query'],
): { start: Date; end: Date } => {
  const { period, startDate, endDate } = query;

  let start: Date;
  let end: Date;

  if (startDate && endDate) {
    start = new Date(startDate as string);
    end = new Date(endDate as string);
  } else {
    end = new Date();
    start = new Date();
    switch (period) {
      case 'week':
        start.setDate(start.getDate() - 7);
        break;
      case 'month':
        start.setMonth(start.getMonth() - 1);
        break;
      case 'year':
        start.setFullYear(start.getFullYear() - 1);
        break;
      default:
        start.setDate(start.getDate() - 30);
    }
  }

  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  return { start, end };
};

export const getDashboard = async (req: Request, res: Response): Promise<void> => {
  const restaurantId = req.user!.restaurantId;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [
    todayOrders,
    todayPaidOrders,
    activeOrders,
    todayReservations,
    lowStockItems,
    tableStats,
  ] = await Promise.all([
    prisma.order.count({
      where: { restaurantId, createdAt: { gte: today, lt: tomorrow } },
    }),
    prisma.order.findMany({
      where: {
        restaurantId,
        createdAt: { gte: today, lt: tomorrow },
        paymentStatus: 'PAID',
      },
      select: { total: true, guestCount: true },
    }),
    prisma.order.count({
      where: {
        restaurantId,
        status: { in: ['PENDING', 'CONFIRMED', 'PREPARING', 'READY'] },
      },
    }),
    prisma.reservation.count({
      where: {
        restaurantId,
        date: { gte: today, lt: tomorrow },
        status: { in: ['PENDING', 'CONFIRMED', 'SEATED'] },
      },
    }),
    prisma.inventoryItem.findMany({
      where: { restaurantId, isActive: true },
    }),
    prisma.table.groupBy({
      by: ['status'],
      where: { restaurantId, isActive: true },
      _count: true,
    }),
  ]);

  const todayRevenue = todayPaidOrders.reduce((sum, o) => sum + o.total, 0);
  const avgTicket = todayPaidOrders.length > 0 ? todayRevenue / todayPaidOrders.length : 0;
  const totalGuests = todayPaidOrders.reduce((sum, o) => sum + o.guestCount, 0);
  const lowStock = lowStockItems.filter((i) => i.currentStock <= i.minStock).length;

  const tables: Record<string, number> = {};
  for (const t of tableStats) {
    tables[t.status] = t._count;
  }

  res.json({
    today: {
      revenue: Math.round(todayRevenue * 100) / 100,
      orders: todayOrders,
      paidOrders: todayPaidOrders.length,
      averageTicket: Math.round(avgTicket * 100) / 100,
      guests: totalGuests,
    },
    active: {
      orders: activeOrders,
      reservations: todayReservations,
    },
    tables,
    alerts: {
      lowStockItems: lowStock,
    },
  });
};

export const getRevenueReport = async (req: Request, res: Response): Promise<void> => {
  const restaurantId = req.user!.restaurantId;
  const { start, end } = buildDateRange(req.query);

  const orders = await prisma.order.findMany({
    where: {
      restaurantId,
      paymentStatus: 'PAID',
      createdAt: { gte: start, lte: end },
    },
    select: {
      total: true,
      subtotal: true,
      tax: true,
      serviceCharge: true,
      discount: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  const dailyRevenue: Record<string, { revenue: number; orders: number; tax: number }> = {};

  for (const order of orders) {
    const dateKey = order.createdAt.toISOString().split('T')[0];
    if (!dailyRevenue[dateKey]) {
      dailyRevenue[dateKey] = { revenue: 0, orders: 0, tax: 0 };
    }
    dailyRevenue[dateKey].revenue += order.total;
    dailyRevenue[dateKey].orders += 1;
    dailyRevenue[dateKey].tax += order.tax;
  }

  const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
  const totalTax = orders.reduce((sum, o) => sum + o.tax, 0);
  const totalDiscount = orders.reduce((sum, o) => sum + o.discount, 0);

  res.json({
    period: { start: start.toISOString(), end: end.toISOString() },
    summary: {
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalOrders: orders.length,
      totalTax: Math.round(totalTax * 100) / 100,
      totalDiscount: Math.round(totalDiscount * 100) / 100,
      averageTicket: orders.length > 0 ? Math.round((totalRevenue / orders.length) * 100) / 100 : 0,
    },
    daily: Object.entries(dailyRevenue)
      .map(([date, data]) => ({
        date,
        revenue: Math.round(data.revenue * 100) / 100,
        orders: data.orders,
        tax: Math.round(data.tax * 100) / 100,
        avgTicket: data.orders > 0 ? Math.round((data.revenue / data.orders) * 100) / 100 : 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date)),
  });
};

export const getSalesByCategory = async (req: Request, res: Response): Promise<void> => {
  const restaurantId = req.user!.restaurantId;
  const { start, end } = buildDateRange(req.query);

  const groupedItems = await prisma.orderItem.groupBy({
    by: ['menuItemId'],
    where: {
      order: {
        restaurantId,
        paymentStatus: 'PAID',
        createdAt: { gte: start, lte: end },
      },
    },
    _sum: { total: true, quantity: true },
  });

  const menuItemIds = groupedItems.map((item) => item.menuItemId);
  const menuItems = await prisma.menuItem.findMany({
    where: { id: { in: menuItemIds } },
    select: {
      id: true,
      name: true,
      category: { select: { id: true, name: true } },
    },
  });
  const menuItemMap = new Map(menuItems.map((item) => [item.id, item]));

  const categoryMap: Record<
    string,
    {
      name: string;
      revenue: number;
      quantity: number;
      items: Record<string, { name: string; revenue: number; quantity: number }>;
    }
  > = {};

  for (const groupedItem of groupedItems) {
    const menuItem = menuItemMap.get(groupedItem.menuItemId);
    if (!menuItem) continue;

    const catId = menuItem.category.id;
    const catName = menuItem.category.name;

    if (!categoryMap[catId]) {
      categoryMap[catId] = { name: catName, revenue: 0, quantity: 0, items: {} };
    }

    const revenue = groupedItem._sum.total || 0;
    const quantity = groupedItem._sum.quantity || 0;

    categoryMap[catId].revenue += revenue;
    categoryMap[catId].quantity += quantity;

    const itemId = menuItem.id;
    if (!categoryMap[catId].items[itemId]) {
      categoryMap[catId].items[itemId] = { name: menuItem.name, revenue: 0, quantity: 0 };
    }
    categoryMap[catId].items[itemId].revenue += revenue;
    categoryMap[catId].items[itemId].quantity += quantity;
  }

  const categories = Object.entries(categoryMap)
    .map(([id, data]) => ({
      categoryId: id,
      categoryName: data.name,
      revenue: Math.round(data.revenue * 100) / 100,
      totalQuantity: data.quantity,
      items: Object.values(data.items)
        .map((i) => ({
          ...i,
          revenue: Math.round(i.revenue * 100) / 100,
        }))
        .sort((a, b) => b.revenue - a.revenue),
    }))
    .sort((a, b) => b.revenue - a.revenue);

  const totalRevenue = categories.reduce((sum, c) => sum + c.revenue, 0);

  res.json({
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    categories: categories.map((c) => ({
      ...c,
      percentage: totalRevenue > 0 ? Math.round((c.revenue / totalRevenue) * 10000) / 100 : 0,
    })),
  });
};

export const getTopSellingItems = async (req: Request, res: Response): Promise<void> => {
  const restaurantId = req.user!.restaurantId;
  const { start, end } = buildDateRange(req.query);
  const requestedLimit = parseInt((req.query.limit as string) || '20', 10);
  const limit = Number.isNaN(requestedLimit)
    ? 20
    : Math.min(Math.max(requestedLimit, 1), 100);

  const groupedItems = await prisma.orderItem.groupBy({
    by: ['menuItemId'],
    where: {
      order: {
        restaurantId,
        paymentStatus: 'PAID',
        createdAt: { gte: start, lte: end },
      },
    },
    _sum: {
      total: true,
      quantity: true,
    },
    orderBy: {
      _sum: { quantity: 'desc' },
    },
    take: limit,
  });

  const menuItems = await prisma.menuItem.findMany({
    where: { id: { in: groupedItems.map((item) => item.menuItemId) } },
    select: { id: true, name: true, price: true, cost: true },
  });
  const menuItemMap = new Map(menuItems.map((item) => [item.id, item]));

  const items = groupedItems
    .map((groupedItem) => {
      const menuItem = menuItemMap.get(groupedItem.menuItemId);
      if (!menuItem) return null;

      const revenue = groupedItem._sum.total || 0;
      const quantity = groupedItem._sum.quantity || 0;

      return {
        menuItemId: menuItem.id,
        name: menuItem.name,
        price: menuItem.price,
        cost: menuItem.cost,
        revenue: Math.round(revenue * 100) / 100,
        quantity,
        profit: menuItem.cost
          ? Math.round((revenue - menuItem.cost * quantity) * 100) / 100
          : null,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  res.json(items);
};

export const getTableTurnoverReport = async (req: Request, res: Response): Promise<void> => {
  const restaurantId = req.user!.restaurantId;
  const { start, end } = buildDateRange(req.query);

  const [tables, tableOrderStats] = await Promise.all([
    prisma.table.findMany({
      where: { restaurantId, isActive: true },
      select: {
        id: true,
        number: true,
        zone: true,
        capacity: true,
      },
    }),
    prisma.order.groupBy({
      by: ['tableId'],
      where: {
        restaurantId,
        paymentStatus: 'PAID',
        createdAt: { gte: start, lte: end },
        tableId: { not: null },
      },
      _count: { id: true },
      _sum: { total: true, guestCount: true },
    }),
  ]);

  const tableStatsMap = new Map(
    tableOrderStats
      .filter((stats) => stats.tableId !== null)
      .map((stats) => [stats.tableId as string, stats]),
  );

  const report = tables.map((table) => {
    const stats = tableStatsMap.get(table.id);
    const orderCount = stats?._count.id || 0;
    const totalRevenue = stats?._sum.total || 0;
    const totalGuests = stats?._sum.guestCount || 0;

    return {
      tableId: table.id,
      tableNumber: table.number,
      zone: table.zone,
      capacity: table.capacity,
      orderCount,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalGuests,
      avgRevenuePerOrder: orderCount > 0
        ? Math.round((totalRevenue / orderCount) * 100) / 100
        : 0,
    };
  });

  res.json(report.sort((a, b) => b.totalRevenue - a.totalRevenue));
};
