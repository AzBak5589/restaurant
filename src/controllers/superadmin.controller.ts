import { Request, Response } from "express";
import prisma from "../config/database";
import { hashPassword } from "../utils/password";

// GET /super-admin/restaurants — list all restaurants with stats
export const listRestaurants = async (
  _req: Request,
  res: Response,
): Promise<void> => {
  const restaurants = await prisma.restaurant.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: {
          users: true,
          orders: true,
          tables: true,
          menuItems: true,
        },
      },
    },
  });

  // Get today's revenue per restaurant
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const revenueByRestaurant = await prisma.order.groupBy({
    by: ["restaurantId"],
    where: {
      paymentStatus: "PAID",
      createdAt: { gte: today },
    },
    _sum: { total: true },
    _count: true,
  });

  const revenueMap = new Map(
    revenueByRestaurant.map((r) => [
      r.restaurantId,
      { revenue: r._sum.total || 0, paidOrders: r._count },
    ]),
  );

  const result = restaurants.map((r) => ({
    id: r.id,
    name: r.name,
    slug: r.slug,
    email: r.email,
    phone: r.phone,
    city: r.city,
    country: r.country,
    plan: r.plan,
    isActive: r.isActive,
    createdAt: r.createdAt,
    users: r._count.users,
    orders: r._count.orders,
    tables: r._count.tables,
    menuItems: r._count.menuItems,
    todayRevenue: revenueMap.get(r.id)?.revenue || 0,
    todayOrders: revenueMap.get(r.id)?.paidOrders || 0,
  }));

  res.json(result);
};

// GET /super-admin/stats — global platform stats
export const platformStats = async (
  _req: Request,
  res: Response,
): Promise<void> => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    totalRestaurants,
    activeRestaurants,
    totalUsers,
    totalOrders,
    todayOrders,
    todayRevenue,
  ] = await Promise.all([
    prisma.restaurant.count(),
    prisma.restaurant.count({ where: { isActive: true } }),
    prisma.user.count(),
    prisma.order.count(),
    prisma.order.count({ where: { createdAt: { gte: today } } }),
    prisma.order.aggregate({
      where: { paymentStatus: "PAID", createdAt: { gte: today } },
      _sum: { total: true },
    }),
  ]);

  res.json({
    totalRestaurants,
    activeRestaurants,
    totalUsers,
    totalOrders,
    todayOrders,
    todayRevenue: todayRevenue._sum.total || 0,
  });
};

// POST /super-admin/restaurants — create a new restaurant + admin user
export const createRestaurant = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const {
    name,
    slug,
    email,
    phone,
    city,
    country,
    plan,
    adminEmail,
    adminPassword,
    adminFirstName,
    adminLastName,
    adminPhone,
  } = req.body;

  if (
    !name ||
    !slug ||
    !adminEmail ||
    !adminPassword ||
    !adminFirstName ||
    !adminLastName
  ) {
    res
      .status(400)
      .json({
        error:
          "Missing required fields: name, slug, adminEmail, adminPassword, adminFirstName, adminLastName",
      });
    return;
  }

  // Check slug uniqueness
  const existing = await prisma.restaurant.findUnique({ where: { slug } });
  if (existing) {
    res.status(409).json({ error: "Restaurant slug already exists" });
    return;
  }

  const hashedPassword = await hashPassword(adminPassword);

  const restaurant = await prisma.restaurant.create({
    data: {
      name,
      slug,
      email: email || null,
      phone: phone || null,
      city: city || null,
      country: country || "Côte d'Ivoire",
      plan: plan || "standard",
      users: {
        create: {
          email: adminEmail,
          password: hashedPassword,
          firstName: adminFirstName,
          lastName: adminLastName,
          phone: adminPhone || null,
          role: "ADMIN",
        },
      },
    },
    include: {
      users: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
        },
      },
    },
  });

  res.status(201).json(restaurant);
};

// PATCH /super-admin/restaurants/:id — toggle active, change plan
export const updateRestaurant = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { id } = req.params;
  const { isActive, plan, name, email, phone } = req.body;

  const data: Record<string, unknown> = {};
  if (isActive !== undefined) data.isActive = isActive;
  if (plan) data.plan = plan;
  if (name) data.name = name;
  if (email !== undefined) data.email = email;
  if (phone !== undefined) data.phone = phone;

  const restaurant = await prisma.restaurant.update({
    where: { id },
    data,
  });

  res.json(restaurant);
};

// DELETE /super-admin/restaurants/:id — delete a restaurant (careful!)
export const deleteRestaurant = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { id } = req.params;

  await prisma.restaurant.delete({ where: { id } });

  res.json({ message: "Restaurant deleted" });
};

// GET /super-admin/users — list all users across all restaurants
export const listAllUsers = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { role, restaurantId, search } = req.query;

  const where: Record<string, unknown> = {};
  if (role && role !== "all") where.role = role;
  if (restaurantId && restaurantId !== "all") where.restaurantId = restaurantId;
  if (search) {
    where.OR = [
      { firstName: { contains: search as string, mode: "insensitive" } },
      { lastName: { contains: search as string, mode: "insensitive" } },
      { email: { contains: search as string, mode: "insensitive" } },
    ];
  }

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      role: true,
      isActive: true,
      lastLogin: true,
      createdAt: true,
      restaurantId: true,
      restaurant: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  res.json(users);
};

// PATCH /super-admin/users/:id — toggle active, change role
export const updateUser = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { id } = req.params;
  const { isActive, role } = req.body;

  const data: Record<string, unknown> = {};
  if (isActive !== undefined) data.isActive = isActive;
  if (role) data.role = role;

  const user = await prisma.user.update({
    where: { id },
    data,
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      isActive: true,
    },
  });

  res.json(user);
};

// GET /super-admin/logs — platform activity logs (recent orders, user creations, etc.)
export const platformLogs = async (
  _req: Request,
  res: Response,
): Promise<void> => {
  // Aggregate recent activity from multiple sources
  const [recentOrders, recentUsers, recentRestaurants] = await Promise.all([
    prisma.order.findMany({
      take: 30,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        total: true,
        createdAt: true,
        restaurant: { select: { name: true } },
        user: { select: { firstName: true, lastName: true } },
      },
    }),
    prisma.user.findMany({
      take: 20,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true,
        restaurant: { select: { name: true } },
      },
    }),
    prisma.restaurant.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, createdAt: true },
    }),
  ]);

  // Build a unified log
  const logs = [
    ...recentOrders.map((o) => ({
      type: "order" as const,
      action: `Order #${o.orderNumber} — ${o.status}`,
      user: o.user ? `${o.user.firstName} ${o.user.lastName}` : "System",
      details: `${o.total} FCFA @ ${o.restaurant?.name || "N/A"}`,
      timestamp: o.createdAt,
    })),
    ...recentUsers.map((u) => ({
      type: "user" as const,
      action: `User created — ${u.role}`,
      user: `${u.firstName} ${u.lastName}`,
      details: `${u.email} @ ${u.restaurant?.name || "Platform"}`,
      timestamp: u.createdAt,
    })),
    ...recentRestaurants.map((r) => ({
      type: "restaurant" as const,
      action: "Restaurant created",
      user: "System",
      details: r.name,
      timestamp: r.createdAt,
    })),
  ]
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    )
    .slice(0, 50);

  res.json(logs);
};

// GET /super-admin/security — security overview
export const securityOverview = async (
  _req: Request,
  res: Response,
): Promise<void> => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    totalUsers,
    activeUsers,
    inactiveUsers,
    recentLogins,
    suspendedRestaurants,
    totalRestaurants,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isActive: true } }),
    prisma.user.count({ where: { isActive: false } }),
    prisma.user.findMany({
      where: { lastLogin: { gte: today } },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        lastLogin: true,
        restaurant: { select: { name: true } },
      },
      orderBy: { lastLogin: "desc" },
      take: 20,
    }),
    prisma.restaurant.count({ where: { isActive: false } }),
    prisma.restaurant.count(),
  ]);

  res.json({
    totalUsers,
    activeUsers,
    inactiveUsers,
    suspendedRestaurants,
    totalRestaurants,
    activeSessionsEstimate: recentLogins.length,
    recentLogins,
  });
};
