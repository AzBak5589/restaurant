import { Request, Response } from 'express';
import prisma from '../config/database';
import { AppError } from '../middlewares/error.middleware';
import { hashPassword } from '../utils/password';
import { ShiftStatus, UserRole } from '@prisma/client';

// ─── USER / STAFF MANAGEMENT ─────────────────────────────────

export const getStaff = async (req: Request, res: Response): Promise<void> => {
  const restaurantId = req.user!.restaurantId;
  const { role, isActive } = req.query;

  const where: Record<string, unknown> = { restaurantId };
  if (role) where.role = role;
  if (isActive !== undefined) where.isActive = isActive === 'true';

  const staff = await prisma.user.findMany({
    where,
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      role: true,
      avatar: true,
      isActive: true,
      lastLogin: true,
      createdAt: true,
    },
    orderBy: { firstName: 'asc' },
  });

  res.json(staff);
};

export const getStaffById = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const restaurantId = req.user!.restaurantId;

  const user = await prisma.user.findFirst({
    where: { id, restaurantId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      role: true,
      avatar: true,
      isActive: true,
      lastLogin: true,
      createdAt: true,
      _count: { select: { orders: true, shifts: true, clockIns: true } },
    },
  });

  if (!user) {
    throw new AppError('Staff member not found', 404);
  }

  res.json(user);
};

export const createStaffMember = async (req: Request, res: Response): Promise<void> => {
  const restaurantId = req.user!.restaurantId;
  const { email, password, firstName, lastName, phone, role } = req.body;

  const existing = await prisma.user.findUnique({
    where: { restaurantId_email: { restaurantId, email } },
  });

  if (existing) {
    throw new AppError('Email already in use', 400);
  }

  const hashedPassword = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      restaurantId,
      email,
      password: hashedPassword,
      firstName,
      lastName,
      phone,
      role: role as UserRole,
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  });

  res.status(201).json(user);
};

export const updateStaffMember = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const restaurantId = req.user!.restaurantId;

  const user = await prisma.user.findFirst({ where: { id, restaurantId } });
  if (!user) {
    throw new AppError('Staff member not found', 404);
  }

  const { password, ...updateData } = req.body;

  const data: Record<string, unknown> = { ...updateData };
  if (password) {
    data.password = await hashPassword(password);
  }

  const updatedUser = await prisma.user.update({
    where: { id },
    data,
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      role: true,
      isActive: true,
    },
  });

  res.json(updatedUser);
};

export const toggleStaffActive = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const restaurantId = req.user!.restaurantId;

  const user = await prisma.user.findFirst({ where: { id, restaurantId } });
  if (!user) {
    throw new AppError('Staff member not found', 404);
  }

  const updatedUser = await prisma.user.update({
    where: { id },
    data: { isActive: !user.isActive },
    select: { id: true, firstName: true, lastName: true, isActive: true },
  });

  res.json(updatedUser);
};

// ─── SHIFTS ───────────────────────────────────────────────────

export const getShifts = async (req: Request, res: Response): Promise<void> => {
  const restaurantId = req.user!.restaurantId;
  const { userId, startDate, endDate, status } = req.query;

  const where: Record<string, unknown> = { restaurantId };
  if (userId) where.userId = userId;
  if (status) where.status = status;

  if (startDate || endDate) {
    where.startTime = {
      ...(startDate && { gte: new Date(startDate as string) }),
      ...(endDate && { lte: new Date(endDate as string) }),
    };
  }

  const shifts = await prisma.shift.findMany({
    where,
    include: {
      user: { select: { id: true, firstName: true, lastName: true, role: true } },
    },
    orderBy: { startTime: 'asc' },
  });

  res.json(shifts);
};

export const createShift = async (req: Request, res: Response): Promise<void> => {
  const restaurantId = req.user!.restaurantId;
  const { userId, startTime, endTime, notes } = req.body;

  const user = await prisma.user.findFirst({ where: { id: userId, restaurantId } });
  if (!user) {
    throw new AppError('Staff member not found', 404);
  }

  const shift = await prisma.shift.create({
    data: {
      restaurantId,
      userId,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      notes,
      status: 'SCHEDULED',
    },
    include: {
      user: { select: { id: true, firstName: true, lastName: true, role: true } },
    },
  });

  res.status(201).json(shift);
};

export const updateShift = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const restaurantId = req.user!.restaurantId;

  const shift = await prisma.shift.findFirst({ where: { id, restaurantId } });
  if (!shift) {
    throw new AppError('Shift not found', 404);
  }

  const updatedShift = await prisma.shift.update({
    where: { id },
    data: {
      ...req.body,
      ...(req.body.startTime && { startTime: new Date(req.body.startTime) }),
      ...(req.body.endTime && { endTime: new Date(req.body.endTime) }),
      ...(req.body.status && { status: req.body.status as ShiftStatus }),
    },
    include: {
      user: { select: { id: true, firstName: true, lastName: true, role: true } },
    },
  });

  res.json(updatedShift);
};

export const deleteShift = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const restaurantId = req.user!.restaurantId;

  const shift = await prisma.shift.findFirst({ where: { id, restaurantId } });
  if (!shift) {
    throw new AppError('Shift not found', 404);
  }

  await prisma.shift.delete({ where: { id } });
  res.status(204).send();
};

// ─── CLOCK IN / OUT ───────────────────────────────────────────

export const clockIn = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const { notes } = req.body;

  const activeClockIn = await prisma.clockIn.findFirst({
    where: { userId, clockOut: null },
  });

  if (activeClockIn) {
    throw new AppError('Already clocked in. Please clock out first.', 400);
  }

  const clockInRecord = await prisma.clockIn.create({
    data: { userId, clockIn: new Date(), notes },
  });

  res.status(201).json(clockInRecord);
};

export const clockOut = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const { notes } = req.body;

  const activeClockIn = await prisma.clockIn.findFirst({
    where: { userId, clockOut: null },
  });

  if (!activeClockIn) {
    throw new AppError('Not clocked in', 400);
  }

  const clockOutTime = new Date();
  const totalHours =
    (clockOutTime.getTime() - activeClockIn.clockIn.getTime()) / (1000 * 60 * 60);

  const updatedRecord = await prisma.clockIn.update({
    where: { id: activeClockIn.id },
    data: {
      clockOut: clockOutTime,
      totalHours: Math.round(totalHours * 100) / 100,
      notes: notes || activeClockIn.notes,
    },
  });

  res.json(updatedRecord);
};

export const getClockHistory = async (req: Request, res: Response): Promise<void> => {
  const restaurantId = req.user!.restaurantId;
  const { userId, startDate, endDate } = req.query;

  const where: Record<string, unknown> = {
    user: { restaurantId },
  };

  if (userId) where.userId = userId;

  if (startDate || endDate) {
    where.clockIn = {
      ...(startDate && { gte: new Date(startDate as string) }),
      ...(endDate && { lte: new Date(endDate as string) }),
    };
  }

  const records = await prisma.clockIn.findMany({
    where,
    include: {
      user: { select: { id: true, firstName: true, lastName: true, role: true } },
    },
    orderBy: { clockIn: 'desc' },
    take: 200,
  });

  res.json(records);
};

export const getStaffPerformance = async (req: Request, res: Response): Promise<void> => {
  const restaurantId = req.user!.restaurantId;
  const { startDate, endDate } = req.query;

  const dateFilter: Record<string, unknown> = {};
  if (startDate || endDate) {
    dateFilter.createdAt = {
      ...(startDate && { gte: new Date(startDate as string) }),
      ...(endDate && { lte: new Date(endDate as string) }),
    };
  }

  const staff = await prisma.user.findMany({
    where: { restaurantId, isActive: true },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      role: true,
      orders: {
        where: { ...dateFilter, status: 'PAID' },
        select: { total: true },
      },
      clockIns: {
        where: {
          ...(startDate && { clockIn: { gte: new Date(startDate as string) } }),
          ...(endDate && { clockIn: { lte: new Date(endDate as string) } }),
        },
        select: { totalHours: true },
      },
    },
  });

  const performance = staff.map((s) => {
    const totalSales = s.orders.reduce((sum, o) => sum + o.total, 0);
    const totalHours = s.clockIns.reduce((sum, c) => sum + (c.totalHours || 0), 0);

    return {
      id: s.id,
      name: `${s.firstName} ${s.lastName}`,
      role: s.role,
      totalOrders: s.orders.length,
      totalSales: Math.round(totalSales * 100) / 100,
      totalHours: Math.round(totalHours * 100) / 100,
      salesPerHour: totalHours > 0
        ? Math.round((totalSales / totalHours) * 100) / 100
        : 0,
    };
  });

  res.json(performance.sort((a, b) => b.totalSales - a.totalSales));
};
