import prisma from '../config/database';
import { getIO } from '../config/socket';
import logger from '../config/logger';

interface OrderItemForDeduction {
  menuItemId: string;
  quantity: number;
}

export const deductStockForOrder = async (
  restaurantId: string,
  orderItems: OrderItemForDeduction[],
  userId: string,
  orderNumber: string
): Promise<void> => {
  for (const orderItem of orderItems) {
    const recipe = await prisma.recipe.findUnique({
      where: {
        restaurantId_menuItemId: {
          restaurantId,
          menuItemId: orderItem.menuItemId,
        },
      },
      include: {
        ingredients: {
          include: {
            item: true,
          },
        },
      },
    });

    if (!recipe) continue;

    for (const ingredient of recipe.ingredients) {
      const totalQuantity = ingredient.quantity * orderItem.quantity * recipe.portionSize;

      const item = ingredient.item;
      if (!item.isActive) continue;

      const newStock = item.currentStock - totalQuantity;

      await prisma.$transaction([
        prisma.inventoryItem.update({
          where: { id: item.id },
          data: { currentStock: Math.max(0, newStock) },
        }),
        prisma.inventoryMovement.create({
          data: {
            restaurantId,
            itemId: item.id,
            type: 'OUT',
            quantity: totalQuantity,
            unitCost: item.unitCost,
            totalCost: item.unitCost ? item.unitCost * totalQuantity : undefined,
            reference: `ORDER:${orderNumber}`,
            notes: `Auto-deduction for order ${orderNumber}`,
            createdBy: userId,
          },
        }),
      ]);

      if (newStock <= item.minStock) {
        logger.warn(
          `Low stock alert: ${item.name} (${newStock} ${item.unit}) - min: ${item.minStock}`
        );

        getIO().to(`restaurant:${restaurantId}`).emit('inventory:lowStock', {
          item: { id: item.id, name: item.name, sku: item.sku },
          currentStock: Math.max(0, newStock),
          minStock: item.minStock,
          unit: item.unit,
        });
      }
    }
  }
};

export const restoreStockForOrder = async (
  restaurantId: string,
  orderId: string,
  userId: string,
  orderNumber: string
): Promise<void> => {
  const orderItems = await prisma.orderItem.findMany({
    where: { orderId },
    select: { menuItemId: true, quantity: true },
  });

  for (const orderItem of orderItems) {
    const recipe = await prisma.recipe.findUnique({
      where: {
        restaurantId_menuItemId: {
          restaurantId,
          menuItemId: orderItem.menuItemId,
        },
      },
      include: {
        ingredients: {
          include: {
            item: true,
          },
        },
      },
    });

    if (!recipe) continue;

    for (const ingredient of recipe.ingredients) {
      const totalQuantity = ingredient.quantity * orderItem.quantity * recipe.portionSize;

      await prisma.$transaction([
        prisma.inventoryItem.update({
          where: { id: ingredient.item.id },
          data: {
            currentStock: { increment: totalQuantity },
          },
        }),
        prisma.inventoryMovement.create({
          data: {
            restaurantId,
            itemId: ingredient.item.id,
            type: 'RETURN',
            quantity: totalQuantity,
            unitCost: ingredient.item.unitCost,
            totalCost: ingredient.item.unitCost
              ? ingredient.item.unitCost * totalQuantity
              : undefined,
            reference: `CANCEL:${orderNumber}`,
            notes: `Stock restored from cancelled order ${orderNumber}`,
            createdBy: userId,
          },
        }),
      ]);
    }
  }
};

export const checkStockAvailability = async (
  restaurantId: string,
  items: OrderItemForDeduction[]
): Promise<{ available: boolean; shortages: Array<{ itemName: string; needed: number; available: number; unit: string }> }> => {
  const shortages: Array<{ itemName: string; needed: number; available: number; unit: string }> = [];

  for (const orderItem of items) {
    const recipe = await prisma.recipe.findUnique({
      where: {
        restaurantId_menuItemId: {
          restaurantId,
          menuItemId: orderItem.menuItemId,
        },
      },
      include: {
        ingredients: {
          include: {
            item: { select: { name: true, currentStock: true, unit: true } },
          },
        },
      },
    });

    if (!recipe) continue;

    for (const ingredient of recipe.ingredients) {
      const needed = ingredient.quantity * orderItem.quantity * recipe.portionSize;
      if (ingredient.item.currentStock < needed) {
        shortages.push({
          itemName: ingredient.item.name,
          needed,
          available: ingredient.item.currentStock,
          unit: ingredient.item.unit,
        });
      }
    }
  }

  return { available: shortages.length === 0, shortages };
};
