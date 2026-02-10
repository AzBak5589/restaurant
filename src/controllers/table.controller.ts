import { Request, Response } from 'express';
import prisma from '../config/database';
import { AppError } from '../middlewares/error.middleware';
import { getIO } from '../config/socket';
import { TableStatus } from '@prisma/client';

export const getTables = async (req: Request, res: Response): Promise<void> => {
  const restaurantId = req.user!.restaurantId;
  const { zone, status } = req.query;

  const where: Record<string, unknown> = { restaurantId, isActive: true };
  if (zone) where.zone = zone;
  if (status) where.status = status;

  const tables = await prisma.table.findMany({
    where,
    include: {
      orders: {
        where: {
          status: { notIn: ['CANCELLED', 'PAID'] },
        },
        select: { id: true, orderNumber: true, status: true, total: true, guestCount: true },
      },
      reservations: {
        where: {
          status: { in: ['CONFIRMED', 'PENDING'] },
          date: { gte: new Date() },
        },
        select: { id: true, customerName: true, guestCount: true, startTime: true, status: true },
        take: 3,
      },
    },
    orderBy: { number: 'asc' },
  });

  res.json(tables);
};

export const getTableById = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const restaurantId = req.user!.restaurantId;

  const table = await prisma.table.findFirst({
    where: { id, restaurantId },
    include: {
      orders: {
        where: { status: { notIn: ['CANCELLED', 'PAID'] } },
        include: {
          items: { include: { menuItem: { select: { name: true } } } },
          user: { select: { firstName: true, lastName: true } },
        },
      },
      reservations: {
        where: { date: { gte: new Date() } },
        orderBy: { startTime: 'asc' },
        take: 5,
      },
    },
  });

  if (!table) {
    throw new AppError('Table not found', 404);
  }

  res.json(table);
};

export const createTable = async (req: Request, res: Response): Promise<void> => {
  const restaurantId = req.user!.restaurantId;
  const { number, capacity, zone, posX, posY } = req.body;

  const existing = await prisma.table.findUnique({
    where: { restaurantId_number: { restaurantId, number: String(number) } },
  });

  if (existing) {
    throw new AppError(`Table number ${number} already exists`, 400);
  }

  const table = await prisma.table.create({
    data: {
      restaurantId,
      number: String(number),
      capacity,
      zone,
      posX,
      posY,
    },
  });

  res.status(201).json(table);
};

export const updateTable = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const restaurantId = req.user!.restaurantId;

  const table = await prisma.table.findFirst({ where: { id, restaurantId } });
  if (!table) {
    throw new AppError('Table not found', 404);
  }

  const updatedTable = await prisma.table.update({
    where: { id },
    data: req.body,
  });

  res.json(updatedTable);
};

export const deleteTable = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const restaurantId = req.user!.restaurantId;

  const table = await prisma.table.findFirst({ where: { id, restaurantId } });
  if (!table) {
    throw new AppError('Table not found', 404);
  }

  await prisma.table.update({ where: { id }, data: { isActive: false } });
  res.status(204).send();
};

export const updateTableStatus = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { status } = req.body;
  const restaurantId = req.user!.restaurantId;

  const table = await prisma.table.findFirst({ where: { id, restaurantId } });
  if (!table) {
    throw new AppError('Table not found', 404);
  }

  const updatedTable = await prisma.table.update({
    where: { id },
    data: { status: status as TableStatus },
  });

  getIO().to(`restaurant:${restaurantId}`).emit('table:statusChanged', updatedTable);

  res.json(updatedTable);
};

export const mergeTable = async (req: Request, res: Response): Promise<void> => {
  const restaurantId = req.user!.restaurantId;
  const { sourceTableId, targetTableId } = req.body;

  const sourceTable = await prisma.table.findFirst({ where: { id: sourceTableId, restaurantId } });
  const targetTable = await prisma.table.findFirst({ where: { id: targetTableId, restaurantId } });

  if (!sourceTable || !targetTable) {
    throw new AppError('One or both tables not found', 404);
  }

  await prisma.order.updateMany({
    where: {
      tableId: sourceTableId,
      status: { notIn: ['CANCELLED', 'PAID'] },
    },
    data: { tableId: targetTableId },
  });

  await prisma.table.update({
    where: { id: sourceTableId },
    data: { status: 'AVAILABLE' },
  });

  await prisma.table.update({
    where: { id: targetTableId },
    data: { status: 'OCCUPIED' },
  });

  getIO().to(`restaurant:${restaurantId}`).emit('table:merged', {
    sourceTableId,
    targetTableId,
  });

  res.json({ message: 'Tables merged successfully' });
};

export const getFloorPlan = async (req: Request, res: Response): Promise<void> => {
  const restaurantId = req.user!.restaurantId;

  const tables = await prisma.table.findMany({
    where: { restaurantId, isActive: true },
    select: {
      id: true,
      number: true,
      capacity: true,
      zone: true,
      status: true,
      posX: true,
      posY: true,
    },
    orderBy: { number: 'asc' },
  });

  const zones = [...new Set(tables.map((t) => t.zone).filter(Boolean))];

  res.json({ tables, zones });
};
