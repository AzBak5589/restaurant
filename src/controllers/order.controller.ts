import { Request, Response } from "express";
import prisma from "../config/database";
import { AppError } from "../middlewares/error.middleware";
import { OrderStatus, PaymentStatus } from "@prisma/client";
import { getIO } from "../config/socket";
import {
  deductStockForOrder,
  restoreStockForOrder,
} from "../services/inventory.service";

export const createOrder = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { tableId, items, guestCount, notes } = req.body;
    const restaurantId = req.user!.restaurantId;
    const userId = req.user!.id;

    const lastOrder = await prisma.order.findFirst({
      where: { restaurantId },
      orderBy: { createdAt: "desc" },
      select: { orderNumber: true },
    });

    const orderNumber = lastOrder
      ? `ORD-${(parseInt(lastOrder.orderNumber.split("-")[1]) + 1).toString().padStart(6, "0")}`
      : "ORD-000001";

    let subtotal = 0;
    const orderItems = [];

    for (const item of items) {
      const menuItem = await prisma.menuItem.findUnique({
        where: { id: item.menuItemId },
      });

      if (!menuItem || !menuItem.isAvailable) {
        throw new AppError(
          `Menu item ${item.menuItemId} is not available`,
          400,
        );
      }

      const itemTotal = menuItem.price * item.quantity;
      subtotal += itemTotal;

      orderItems.push({
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        unitPrice: menuItem.price,
        total: itemTotal,
        modifiers: item.modifiers || null,
        notes: item.notes || null,
      });
    }

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { taxRate: true, serviceCharge: true },
    });

    const tax = subtotal * (restaurant!.taxRate / 100);
    const serviceCharge = subtotal * (restaurant!.serviceCharge / 100);
    const total = subtotal + tax + serviceCharge;

    const order = await prisma.order.create({
      data: {
        restaurantId,
        tableId,
        userId,
        orderNumber,
        status: OrderStatus.PENDING,
        subtotal,
        tax,
        serviceCharge,
        total,
        guestCount: guestCount || 1,
        notes,
        paymentStatus: PaymentStatus.PENDING,
        items: {
          create: orderItems,
        },
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
      },
    });

    if (tableId) {
      await prisma.table.update({
        where: { id: tableId },
        data: { status: "OCCUPIED" },
      });
    }

    getIO().to(`restaurant:${restaurantId}`).emit("order:created", order);

    deductStockForOrder(
      restaurantId,
      items.map((item: { menuItemId: string; quantity: number }) => ({
        menuItemId: item.menuItemId,
        quantity: item.quantity,
      })),
      userId,
      orderNumber,
    ).catch((err) => {
      console.error("Stock deduction failed for order", orderNumber, err);
    });

    res.status(201).json(order);
  } catch (error) {
    throw error;
  }
};

export const getOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const restaurantId = req.user!.restaurantId;
    const { status, date, tableId } = req.query;

    const where: any = { restaurantId };

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
      orderBy: { createdAt: "desc" },
    });

    const statusPriority: Record<string, number> = {
      PENDING: 0,
      CONFIRMED: 1,
      PREPARING: 2,
      READY: 3,
      SERVED: 4,
      PAID: 5,
      CANCELLED: 6,
    };

    orders.sort((a, b) => {
      const pa = statusPriority[a.status] ?? 99;
      const pb = statusPriority[b.status] ?? 99;
      if (pa !== pb) return pa - pb;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
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
  try {
    const { id } = req.params;
    const { items } = req.body;
    const restaurantId = req.user!.restaurantId;
    const userId = req.user!.id;

    const order = await prisma.order.findFirst({
      where: { id, restaurantId },
      include: { items: true },
    });

    if (!order) {
      throw new AppError("Order not found", 404);
    }

    if (
      order.status === OrderStatus.PAID ||
      order.status === OrderStatus.CANCELLED
    ) {
      throw new AppError(
        "Cannot add items to a completed or cancelled order",
        400,
      );
    }

    let additionalSubtotal = 0;
    const newItems = [];

    for (const item of items) {
      const menuItem = await prisma.menuItem.findUnique({
        where: { id: item.menuItemId },
      });

      if (!menuItem || !menuItem.isAvailable) {
        throw new AppError(
          `Menu item ${item.menuItemId} is not available`,
          400,
        );
      }

      const itemTotal = menuItem.price * item.quantity;
      additionalSubtotal += itemTotal;

      newItems.push({
        orderId: order.id,
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        unitPrice: menuItem.price,
        total: itemTotal,
        modifiers: item.modifiers || null,
        notes: item.notes || null,
      });
    }

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { taxRate: true, serviceCharge: true },
    });

    const newSubtotal = order.subtotal + additionalSubtotal;
    const newTax = newSubtotal * (restaurant!.taxRate / 100);
    const newServiceCharge = newSubtotal * (restaurant!.serviceCharge / 100);
    const newTotal = newSubtotal + newTax + newServiceCharge - order.discount;

    await prisma.orderItem.createMany({ data: newItems });

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        subtotal: newSubtotal,
        tax: newTax,
        serviceCharge: newServiceCharge,
        total: newTotal,
      },
      include: {
        items: {
          include: { menuItem: true },
        },
        table: true,
        user: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    deductStockForOrder(
      restaurantId,
      items.map((item: { menuItemId: string; quantity: number }) => ({
        menuItemId: item.menuItemId,
        quantity: item.quantity,
      })),
      userId,
      order.orderNumber,
    ).catch((err) => {
      console.error(
        "Stock deduction failed for added items",
        order.orderNumber,
        err,
      );
    });

    getIO()
      .to(`restaurant:${restaurantId}`)
      .emit("order:updated", updatedOrder);

    res.json(updatedOrder);
  } catch (error) {
    throw error;
  }
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

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: { status: OrderStatus.CANCELLED },
    });

    if (order.tableId) {
      const activeOrders = await prisma.order.count({
        where: {
          tableId: order.tableId,
          status: {
            notIn: [OrderStatus.CANCELLED, OrderStatus.PAID],
          },
        },
      });

      if (activeOrders === 0) {
        await prisma.table.update({
          where: { id: order.tableId },
          data: { status: "AVAILABLE" },
        });
      }
    }

    restoreStockForOrder(
      restaurantId,
      id,
      req.user!.id,
      order.orderNumber,
    ).catch((err) => {
      console.error(
        "Stock restoration failed for order",
        order.orderNumber,
        err,
      );
    });

    getIO()
      .to(`restaurant:${restaurantId}`)
      .emit("order:cancelled", updatedOrder);

    res.json(updatedOrder);
  } catch (error) {
    throw error;
  }
};
