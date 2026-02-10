import { Request, Response } from 'express';
import prisma from '../config/database';
import { AppError } from '../middlewares/error.middleware';
import { getIO } from '../config/socket';

// ─── INVENTORY ITEMS ──────────────────────────────────────────

export const getInventoryItems = async (req: Request, res: Response): Promise<void> => {
  const restaurantId = req.user!.restaurantId;
  const { category, location, lowStock } = req.query;

  const where: Record<string, unknown> = { restaurantId, isActive: true };

  if (category) where.category = category;
  if (location) where.location = location;

  if (lowStock === 'true') {
    where.currentStock = {
      lte: prisma.inventoryItem.fields.minStock,
    };
  }

  const items = await prisma.inventoryItem.findMany({
    where,
    include: {
      _count: { select: { movements: true, recipes: true } },
    },
    orderBy: { name: 'asc' },
  });

  if (lowStock === 'true') {
    const filtered = items.filter((item) => item.currentStock <= item.minStock);
    res.json(filtered);
    return;
  }

  res.json(items);
};

export const getInventoryItemById = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const restaurantId = req.user!.restaurantId;

  const item = await prisma.inventoryItem.findFirst({
    where: { id, restaurantId },
    include: {
      movements: {
        orderBy: { createdAt: 'desc' },
        take: 50,
      },
      recipes: {
        include: {
          recipe: {
            include: {
              menuItem: true,
            },
          },
        },
      },
    },
  });

  if (!item) {
    throw new AppError('Inventory item not found', 404);
  }

  res.json(item);
};

export const createInventoryItem = async (req: Request, res: Response): Promise<void> => {
  const restaurantId = req.user!.restaurantId;
  const { name, sku, unit, currentStock, minStock, maxStock, unitCost, supplier, category, location } = req.body;

  if (sku) {
    const existing = await prisma.inventoryItem.findUnique({
      where: { restaurantId_sku: { restaurantId, sku } },
    });
    if (existing) {
      throw new AppError('SKU already exists', 400);
    }
  }

  const item = await prisma.inventoryItem.create({
    data: {
      restaurantId,
      name,
      sku,
      unit,
      currentStock: currentStock || 0,
      minStock: minStock || 0,
      maxStock,
      unitCost,
      supplier,
      category,
      location,
    },
  });

  if (currentStock && currentStock > 0) {
    await prisma.inventoryMovement.create({
      data: {
        restaurantId,
        itemId: item.id,
        type: 'IN',
        quantity: currentStock,
        unitCost,
        totalCost: unitCost ? unitCost * currentStock : undefined,
        reference: 'INITIAL_STOCK',
        notes: 'Initial stock entry',
        createdBy: req.user!.id,
      },
    });
  }

  res.status(201).json(item);
};

export const updateInventoryItem = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const restaurantId = req.user!.restaurantId;

  const item = await prisma.inventoryItem.findFirst({
    where: { id, restaurantId },
  });

  if (!item) {
    throw new AppError('Inventory item not found', 404);
  }

  const { currentStock: _cs, ...updateData } = req.body;

  const updatedItem = await prisma.inventoryItem.update({
    where: { id },
    data: updateData,
  });

  res.json(updatedItem);
};

export const deleteInventoryItem = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const restaurantId = req.user!.restaurantId;

  const item = await prisma.inventoryItem.findFirst({
    where: { id, restaurantId },
  });

  if (!item) {
    throw new AppError('Inventory item not found', 404);
  }

  await prisma.inventoryItem.update({
    where: { id },
    data: { isActive: false },
  });

  res.status(204).send();
};

// ─── STOCK MOVEMENTS ──────────────────────────────────────────

export const getMovements = async (req: Request, res: Response): Promise<void> => {
  const restaurantId = req.user!.restaurantId;
  const { itemId, type, startDate, endDate } = req.query;

  const where: Record<string, unknown> = { restaurantId };

  if (itemId) where.itemId = itemId;
  if (type) where.type = type;

  if (startDate || endDate) {
    where.createdAt = {
      ...(startDate && { gte: new Date(startDate as string) }),
      ...(endDate && { lte: new Date(endDate as string) }),
    };
  }

  const movements = await prisma.inventoryMovement.findMany({
    where,
    include: {
      item: { select: { id: true, name: true, sku: true, unit: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  res.json(movements);
};

export const createMovement = async (req: Request, res: Response): Promise<void> => {
  const restaurantId = req.user!.restaurantId;
  const { itemId, type, quantity, unitCost, reference, notes } = req.body;

  const item = await prisma.inventoryItem.findFirst({
    where: { id: itemId, restaurantId },
  });

  if (!item) {
    throw new AppError('Inventory item not found', 404);
  }

  if (['OUT', 'LOSS'].includes(type) && item.currentStock < quantity) {
    throw new AppError(
      `Insufficient stock. Available: ${item.currentStock} ${item.unit}`,
      400
    );
  }

  const stockChange = ['IN', 'RETURN'].includes(type) ? quantity : -quantity;
  const newStock = item.currentStock + stockChange;

  const [movement] = await prisma.$transaction([
    prisma.inventoryMovement.create({
      data: {
        restaurantId,
        itemId,
        type,
        quantity,
        unitCost: unitCost || item.unitCost,
        totalCost: (unitCost || item.unitCost || 0) * quantity,
        reference,
        notes,
        createdBy: req.user!.id,
      },
      include: {
        item: { select: { id: true, name: true, sku: true, unit: true } },
      },
    }),
    prisma.inventoryItem.update({
      where: { id: itemId },
      data: {
        currentStock: newStock,
        ...(unitCost && { unitCost }),
      },
    }),
  ]);

  if (newStock <= item.minStock) {
    getIO().to(`restaurant:${restaurantId}`).emit('inventory:lowStock', {
      item: { id: item.id, name: item.name, sku: item.sku },
      currentStock: newStock,
      minStock: item.minStock,
      unit: item.unit,
    });
  }

  res.status(201).json(movement);
};

export const transferStock = async (req: Request, res: Response): Promise<void> => {
  const restaurantId = req.user!.restaurantId;
  const { itemId, quantity, fromLocation, toLocation, notes } = req.body;

  const item = await prisma.inventoryItem.findFirst({
    where: { id: itemId, restaurantId, location: fromLocation },
  });

  if (!item) {
    throw new AppError(`Inventory item not found at location: ${fromLocation}`, 404);
  }

  if (item.currentStock < quantity) {
    throw new AppError(
      `Insufficient stock at ${fromLocation}. Available: ${item.currentStock} ${item.unit}`,
      400
    );
  }

  let targetItem = await prisma.inventoryItem.findFirst({
    where: { restaurantId, name: item.name, location: toLocation, isActive: true },
  });

  await prisma.$transaction(async (tx) => {
    await tx.inventoryItem.update({
      where: { id: item.id },
      data: { currentStock: item.currentStock - quantity },
    });

    if (!targetItem) {
      targetItem = await tx.inventoryItem.create({
        data: {
          restaurantId,
          name: item.name,
          sku: item.sku ? `${item.sku}-${toLocation.toLowerCase()}` : undefined,
          unit: item.unit,
          currentStock: quantity,
          minStock: item.minStock,
          maxStock: item.maxStock,
          unitCost: item.unitCost,
          supplier: item.supplier,
          category: item.category,
          location: toLocation,
        },
      });
    } else {
      await tx.inventoryItem.update({
        where: { id: targetItem.id },
        data: { currentStock: targetItem.currentStock + quantity },
      });
    }

    await tx.inventoryMovement.create({
      data: {
        restaurantId,
        itemId: item.id,
        type: 'TRANSFER',
        quantity,
        reference: `TRANSFER:${fromLocation}->${toLocation}`,
        notes: notes || `Transfer from ${fromLocation} to ${toLocation}`,
        createdBy: req.user!.id,
      },
    });
  });

  res.json({ message: 'Stock transferred successfully' });
};

// ─── LOW STOCK ALERTS ─────────────────────────────────────────

export const getLowStockAlerts = async (req: Request, res: Response): Promise<void> => {
  const restaurantId = req.user!.restaurantId;

  const allItems = await prisma.inventoryItem.findMany({
    where: { restaurantId, isActive: true },
    orderBy: { name: 'asc' },
  });

  const lowStockItems = allItems.filter(
    (item) => item.currentStock <= item.minStock
  );

  res.json({
    count: lowStockItems.length,
    items: lowStockItems.map((item) => ({
      id: item.id,
      name: item.name,
      sku: item.sku,
      unit: item.unit,
      currentStock: item.currentStock,
      minStock: item.minStock,
      location: item.location,
      deficit: item.minStock - item.currentStock,
    })),
  });
};

// ─── STOCK VALUATION ──────────────────────────────────────────

export const getStockValuation = async (req: Request, res: Response): Promise<void> => {
  const restaurantId = req.user!.restaurantId;
  const { category, location } = req.query;

  const where: Record<string, unknown> = { restaurantId, isActive: true };
  if (category) where.category = category;
  if (location) where.location = location;

  const items = await prisma.inventoryItem.findMany({
    where,
    orderBy: { name: 'asc' },
  });

  const valuation = items.map((item) => ({
    id: item.id,
    name: item.name,
    sku: item.sku,
    unit: item.unit,
    currentStock: item.currentStock,
    unitCost: item.unitCost || 0,
    totalValue: item.currentStock * (item.unitCost || 0),
    location: item.location,
    category: item.category,
  }));

  const totalValue = valuation.reduce((sum, item) => sum + item.totalValue, 0);
  const totalItems = valuation.reduce((sum, item) => sum + item.currentStock, 0);

  res.json({
    totalValue,
    totalItems,
    itemCount: valuation.length,
    items: valuation,
  });
};
