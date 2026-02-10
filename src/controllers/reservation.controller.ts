import { Request, Response } from 'express';
import prisma from '../config/database';
import { AppError } from '../middlewares/error.middleware';
import { ReservationStatus } from '@prisma/client';
import { getIO } from '../config/socket';

export const getReservations = async (req: Request, res: Response): Promise<void> => {
  const restaurantId = req.user!.restaurantId;
  const { date, status, tableId } = req.query;

  const where: Record<string, unknown> = { restaurantId };
  if (status) where.status = status;
  if (tableId) where.tableId = tableId;

  if (date) {
    const d = new Date(date as string);
    const start = new Date(d);
    start.setHours(0, 0, 0, 0);
    const end = new Date(d);
    end.setHours(23, 59, 59, 999);
    where.date = { gte: start, lte: end };
  }

  const reservations = await prisma.reservation.findMany({
    where,
    include: {
      table: { select: { id: true, number: true, capacity: true, zone: true } },
      customer: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: { startTime: 'asc' },
  });

  res.json(reservations);
};

export const getReservationById = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const restaurantId = req.user!.restaurantId;

  const reservation = await prisma.reservation.findFirst({
    where: { id, restaurantId },
    include: {
      table: true,
      customer: true,
    },
  });

  if (!reservation) {
    throw new AppError('Reservation not found', 404);
  }

  res.json(reservation);
};

export const createReservation = async (req: Request, res: Response): Promise<void> => {
  const restaurantId = req.user!.restaurantId;
  const {
    tableId,
    customerId,
    customerName,
    customerPhone,
    customerEmail,
    guestCount,
    date,
    startTime,
    endTime,
    notes,
  } = req.body;

  if (tableId) {
    const table = await prisma.table.findFirst({
      where: { id: tableId, restaurantId },
    });

    if (!table) {
      throw new AppError('Table not found', 404);
    }

    if (guestCount > table.capacity) {
      throw new AppError(
        `Table ${table.number} capacity (${table.capacity}) is less than guest count (${guestCount})`,
        400
      );
    }

    const conflicting = await prisma.reservation.findFirst({
      where: {
        tableId,
        status: { in: ['PENDING', 'CONFIRMED'] },
        date: new Date(date),
        OR: [
          {
            startTime: { lte: new Date(startTime) },
            endTime: { gt: new Date(startTime) },
          },
          {
            startTime: { lt: new Date(endTime || startTime) },
            endTime: { gte: new Date(endTime || startTime) },
          },
        ],
      },
    });

    if (conflicting) {
      throw new AppError('Table is already reserved for this time slot', 409);
    }
  }

  const reservation = await prisma.reservation.create({
    data: {
      restaurantId,
      tableId,
      customerId,
      customerName,
      customerPhone,
      customerEmail,
      guestCount,
      date: new Date(date),
      startTime: new Date(startTime),
      endTime: endTime ? new Date(endTime) : undefined,
      notes,
      status: 'CONFIRMED',
    },
    include: {
      table: { select: { id: true, number: true, capacity: true } },
    },
  });

  getIO().to(`restaurant:${restaurantId}`).emit('reservation:created', reservation);

  res.status(201).json(reservation);
};

export const updateReservation = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const restaurantId = req.user!.restaurantId;

  const reservation = await prisma.reservation.findFirst({
    where: { id, restaurantId },
  });

  if (!reservation) {
    throw new AppError('Reservation not found', 404);
  }

  const updatedReservation = await prisma.reservation.update({
    where: { id },
    data: req.body,
    include: {
      table: { select: { id: true, number: true, capacity: true } },
    },
  });

  res.json(updatedReservation);
};

export const updateReservationStatus = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { status } = req.body;
  const restaurantId = req.user!.restaurantId;

  const reservation = await prisma.reservation.findFirst({
    where: { id, restaurantId },
  });

  if (!reservation) {
    throw new AppError('Reservation not found', 404);
  }

  const updatedReservation = await prisma.reservation.update({
    where: { id },
    data: { status: status as ReservationStatus },
    include: { table: true },
  });

  if (status === 'SEATED' && reservation.tableId) {
    await prisma.table.update({
      where: { id: reservation.tableId },
      data: { status: 'OCCUPIED' },
    });
  }

  if (status === 'COMPLETED' && reservation.tableId) {
    await prisma.table.update({
      where: { id: reservation.tableId },
      data: { status: 'AVAILABLE' },
    });
  }

  getIO().to(`restaurant:${restaurantId}`).emit('reservation:updated', updatedReservation);

  res.json(updatedReservation);
};

export const cancelReservation = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const restaurantId = req.user!.restaurantId;

  const reservation = await prisma.reservation.findFirst({
    where: { id, restaurantId },
  });

  if (!reservation) {
    throw new AppError('Reservation not found', 404);
  }

  const updatedReservation = await prisma.reservation.update({
    where: { id },
    data: { status: 'CANCELLED' },
  });

  if (reservation.tableId) {
    await prisma.table.update({
      where: { id: reservation.tableId },
      data: { status: 'AVAILABLE' },
    });
  }

  res.json(updatedReservation);
};

export const getAvailableTables = async (req: Request, res: Response): Promise<void> => {
  const restaurantId = req.user!.restaurantId;
  const { date, startTime, endTime, guestCount } = req.query;

  if (!date || !startTime) {
    throw new AppError('date and startTime are required', 400);
  }

  const tables = await prisma.table.findMany({
    where: {
      restaurantId,
      isActive: true,
      ...(guestCount && { capacity: { gte: parseInt(guestCount as string) } }),
    },
    orderBy: { capacity: 'asc' },
  });

  const reservedTableIds = await prisma.reservation.findMany({
    where: {
      restaurantId,
      status: { in: ['PENDING', 'CONFIRMED'] },
      date: new Date(date as string),
      OR: [
        {
          startTime: { lte: new Date(startTime as string) },
          endTime: { gt: new Date(startTime as string) },
        },
        ...(endTime
          ? [
              {
                startTime: { lt: new Date(endTime as string) },
                endTime: { gte: new Date(endTime as string) },
              },
            ]
          : []),
      ],
    },
    select: { tableId: true },
  });

  const reservedIds = new Set(reservedTableIds.map((r) => r.tableId).filter(Boolean));

  const availableTables = tables.filter((t) => !reservedIds.has(t.id));

  res.json(availableTables);
};

export const getTodayReservations = async (req: Request, res: Response): Promise<void> => {
  const restaurantId = req.user!.restaurantId;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const reservations = await prisma.reservation.findMany({
    where: {
      restaurantId,
      date: { gte: today, lt: tomorrow },
      status: { in: ['PENDING', 'CONFIRMED', 'SEATED'] },
    },
    include: {
      table: { select: { number: true, capacity: true, zone: true } },
    },
    orderBy: { startTime: 'asc' },
  });

  res.json(reservations);
};
