import { Request, Response } from "express";
import prisma from "../config/database";
import { AppError } from "../middlewares/error.middleware";
import { OrderStatus, Prisma } from "@prisma/client";
import { getIO } from "../config/socket";
import { restoreStockForOrder } from "../services/inventory.service";
import {
  addItemsToOrderTransactional,
  applyPromotionToOrderTransactional,
  createOrderTransactional,
} from "../services/order.service";

export const createOrder = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { tableId, items, guestCount, notes } = req.body;
  const restaurantId = req.user!.restaurantId;
  const userId = req.user!.id;

  const order = await createOrderTransactional({
    restaurantId,
    userId,
    tableId,
    items,
    guestCount,
    notes,
  });

  getIO().to(`restaurant:${restaurantId}`).emit("order:created", order);
  res.status(201).json(order);
};

export const getOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user!.restaurantId;
    const { status, date, tableId, sort } = req.query;

    const where: any = { restaurantId };
    const sortValue =
      (sort as "createdAt_desc" | "createdAt_asc" | "total_desc" | "total_asc" | undefined) ??
      "createdAt_desc";
    const orderByMap: Record<
      "createdAt_desc" | "createdAt_asc" | "total_desc" | "total_asc",
      Prisma.OrderOrderByWithRelationInput
    > = {
      createdAt_desc: { createdAt: "desc" },
      createdAt_asc: { createdAt: "asc" },
      total_desc: { total: "desc" },
      total_asc: { total: "asc" },
    };

    if (status) {
      where.status = status;
    }

    if (tableId) {
      where.tableId = tableId;
    }

    if (date) {
      const startDate = new Date(date as string);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);

      where.createdAt = {
        gte: startDate,
        lt: endDate,
      };
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        items: {
          include: {
            menuItem: true,
          },
        },
        table: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: orderByMap[sortValue],
    });

    res.json(orders);
  } catch (error) {
    throw error;
  }
};

export const getOrderById = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;
    const restaurantId = req.user!.restaurantId;

    const order = await prisma.order.findFirst({
      where: {
        id,
        restaurantId,
      },
      include: {
        items: {
          include: {
            menuItem: true,
          },
        },
        table: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        payments: true,
      },
    });

    if (!order) {
      throw new AppError("Order not found", 404);
    }

    res.json(order);
  } catch (error) {
    throw error;
  }
};

export const updateOrderStatus = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const restaurantId = req.user!.restaurantId;

    const order = await prisma.order.findFirst({
      where: { id, restaurantId },
    });

    if (!order) {
      throw new AppError("Order not found", 404);
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        status,
        ...(status === OrderStatus.SERVED && { completedAt: new Date() }),
      },
      include: {
        items: {
          include: {
            menuItem: true,
          },
        },
        table: true,
      },
    });

    getIO()
      .to(`restaurant:${restaurantId}`)
      .emit("order:updated", updatedOrder);

    res.json(updatedOrder);
  } catch (error) {
    throw error;
  }
};

export const updateOrderItemStatus = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { id, itemId } = req.params;
    const { status } = req.body;
    const restaurantId = req.user!.restaurantId;

    const order = await prisma.order.findFirst({
      where: { id, restaurantId },
    });

    if (!order) {
      throw new AppError("Order not found", 404);
    }

    const updatedItem = await prisma.orderItem.update({
      where: { id: itemId },
      data: {
        status,
        ...(status === OrderStatus.PREPARING && {
          sentToKitchenAt: new Date(),
        }),
        ...(status === OrderStatus.READY && { readyAt: new Date() }),
        ...(status === OrderStatus.SERVED && { servedAt: new Date() }),
      },
    });

    getIO().to(`restaurant:${restaurantId}`).emit("order:item:updated", {
      orderId: id,
      item: updatedItem,
    });

    res.json(updatedItem);
  } catch (error) {
    throw error;
  }
};

export const addItemsToOrder = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { id } = req.params;
  const { items } = req.body;
  const restaurantId = req.user!.restaurantId;
  const userId = req.user!.id;

  const updatedOrder = await addItemsToOrderTransactional({
    orderId: id,
    restaurantId,
    userId,
    items,
  });

  getIO().to(`restaurant:${restaurantId}`).emit("order:updated", updatedOrder);
  res.json(updatedOrder);
};

export const cancelOrder = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;
    const restaurantId = req.user!.restaurantId;

    const order = await prisma.order.findFirst({
      where: { id, restaurantId },
    });

    if (!order) {
      throw new AppError("Order not found", 404);
    }

    if (
      order.status === OrderStatus.SERVED ||
      order.status === OrderStatus.PAID
    ) {
      throw new AppError("Cannot cancel completed order", 400);
    }

    const updatedOrder = await prisma.$transaction(
      async (tx) => {
        const cancelledOrder = await tx.order.update({
          where: { id },
          data: { status: OrderStatus.CANCELLED },
        });

        if (order.tableId) {
          const activeOrders = await tx.order.count({
            where: {
              tableId: order.tableId,
              status: {
                notIn: [OrderStatus.CANCELLED, OrderStatus.PAID],
              },
            },
          });

          if (activeOrders === 0) {
            await tx.table.update({
              where: { id: order.tableId },
              data: { status: "AVAILABLE" },
            });
          }
        }

        await restoreStockForOrder(
          restaurantId,
          id,
          req.user!.id,
          order.orderNumber,
          tx,
        );

        return cancelledOrder;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    getIO()
      .to(`restaurant:${restaurantId}`)
      .emit("order:cancelled", updatedOrder);

    res.json(updatedOrder);
  } catch (error) {
    throw error;
  }
};

export const applyPromotionToOrder = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { id } = req.params;
  const { promotionId, promotionCode } = req.body as {
    promotionId?: string | null;
    promotionCode?: string | null;
  };
  const restaurantId = req.user!.restaurantId;

  const updatedOrder = await applyPromotionToOrderTransactional({
    orderId: id,
    restaurantId,
    promotionId,
    promotionCode,
  });

  getIO().to(`restaurant:${restaurantId}`).emit("order:updated", updatedOrder);
  res.json(updatedOrder);
};
