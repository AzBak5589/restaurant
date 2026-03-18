import { OrderStatus, PaymentStatus, Prisma, Promotion } from "@prisma/client";
import prisma from "../config/database";
import { AppError } from "../middlewares/error.middleware";
import { deductStockForOrder } from "./inventory.service";

export interface OrderItemInput {
  menuItemId: string;
  quantity: number;
  modifiers?: unknown;
  notes?: string;
}

interface CreateOrderParams {
  restaurantId: string;
  userId: string;
  tableId?: string;
  items: OrderItemInput[];
  guestCount?: number;
  notes?: string;
}

interface AddItemsParams {
  orderId: string;
  restaurantId: string;
  userId: string;
  items: OrderItemInput[];
}

interface ApplyPromotionParams {
  orderId: string;
  restaurantId: string;
  promotionId?: string | null;
  promotionCode?: string | null;
}

const toNullableJson = (
  value: unknown,
): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput => {
  if (value == null) {
    return Prisma.JsonNull;
  }
  return value as Prisma.InputJsonValue;
};

const getNextOrderNumber = async (
  tx: Prisma.TransactionClient,
  restaurantId: string,
): Promise<string> => {
  const lastOrder = await tx.order.findFirst({
    where: { restaurantId },
    orderBy: { createdAt: "desc" },
    select: { orderNumber: true },
  });

  return lastOrder
    ? `ORD-${(parseInt(lastOrder.orderNumber.split("-")[1]) + 1).toString().padStart(6, "0")}`
    : "ORD-000001";
};

const calculateDiscountAmount = (
  promotion: Promotion,
  grossAmount: number,
): number => {
  const rawDiscount =
    promotion.discountType === "PERCENTAGE"
      ? (grossAmount * promotion.discountValue) / 100
      : promotion.discountValue;
  return Math.max(0, Math.min(rawDiscount, grossAmount));
};

export const createOrderTransactional = async ({
  restaurantId,
  userId,
  tableId,
  items,
  guestCount,
  notes,
}: CreateOrderParams) => {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const order = await prisma.$transaction(
        async (tx) => {
          const orderNumber = await getNextOrderNumber(tx, restaurantId);

          let subtotal = 0;
          const orderItems: Prisma.OrderItemUncheckedCreateWithoutOrderInput[] = [];

          for (const item of items) {
            const menuItem = await tx.menuItem.findUnique({
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
              modifiers: toNullableJson(item.modifiers),
              notes: item.notes || null,
            });
          }

          const restaurant = await tx.restaurant.findUnique({
            where: { id: restaurantId },
            select: { taxRate: true, serviceCharge: true },
          });

          if (!restaurant) {
            throw new AppError("Restaurant not found", 404);
          }

          const tax = subtotal * (restaurant.taxRate / 100);
          const serviceCharge = subtotal * (restaurant.serviceCharge / 100);
          const total = subtotal + tax + serviceCharge;

          const createdOrder = await tx.order.create({
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
            await tx.table.update({
              where: { id: tableId },
              data: { status: "OCCUPIED" },
            });
          }

          await deductStockForOrder(
            restaurantId,
            items.map((item) => ({
              menuItemId: item.menuItemId,
              quantity: item.quantity,
            })),
            userId,
            orderNumber,
            tx,
          );

          return createdOrder;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
      return order;
    } catch (error) {
      const isUniqueConflict =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002";
      if (isUniqueConflict && attempt < 2) {
        continue;
      }
      throw error;
    }
  }
  throw new AppError("Failed to create order", 500);
};

export const addItemsToOrderTransactional = async ({
  orderId,
  restaurantId,
  userId,
  items,
}: AddItemsParams) => {
  const order = await prisma.order.findFirst({
    where: { id: orderId, restaurantId },
    include: { items: true },
  });

  if (!order) {
    throw new AppError("Order not found", 404);
  }

  if (order.status === OrderStatus.PAID || order.status === OrderStatus.CANCELLED) {
    throw new AppError("Cannot add items to a completed or cancelled order", 400);
  }

  return prisma.$transaction(
    async (tx) => {
      let additionalSubtotal = 0;
      const newItems: Prisma.OrderItemCreateManyInput[] = [];

      for (const item of items) {
        const menuItem = await tx.menuItem.findUnique({
          where: { id: item.menuItemId },
        });

        if (!menuItem || !menuItem.isAvailable) {
          throw new AppError(`Menu item ${item.menuItemId} is not available`, 400);
        }

        const itemTotal = menuItem.price * item.quantity;
        additionalSubtotal += itemTotal;

        newItems.push({
          orderId: order.id,
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          unitPrice: menuItem.price,
          total: itemTotal,
          modifiers: toNullableJson(item.modifiers),
          notes: item.notes || null,
        });
      }

      const restaurant = await tx.restaurant.findUnique({
        where: { id: restaurantId },
        select: { taxRate: true, serviceCharge: true },
      });

      if (!restaurant) {
        throw new AppError("Restaurant not found", 404);
      }

      const newSubtotal = order.subtotal + additionalSubtotal;
      const newTax = newSubtotal * (restaurant.taxRate / 100);
      const newServiceCharge = newSubtotal * (restaurant.serviceCharge / 100);
      const newGross = newSubtotal + newTax + newServiceCharge;
      let discount = order.discount;
      if (order.appliedPromotionId) {
        const appliedPromotion = await tx.promotion.findUnique({
          where: { id: order.appliedPromotionId },
        });
        if (appliedPromotion) {
          discount = calculateDiscountAmount(appliedPromotion, newGross);
        } else {
          discount = 0;
        }
      }
      const newTotal = newGross - discount;

      await tx.orderItem.createMany({ data: newItems });

      await deductStockForOrder(
        restaurantId,
        items.map((item) => ({
          menuItemId: item.menuItemId,
          quantity: item.quantity,
        })),
        userId,
        order.orderNumber,
        tx,
      );

      return tx.order.update({
        where: { id: orderId },
        data: {
          subtotal: newSubtotal,
          tax: newTax,
          serviceCharge: newServiceCharge,
          discount,
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
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
};

export const applyPromotionToOrderTransactional = async ({
  orderId,
  restaurantId,
  promotionId,
  promotionCode,
}: ApplyPromotionParams) => {
  if (promotionId && promotionCode) {
    throw new AppError("Provide either promotionId or promotionCode, not both", 400);
  }

  return prisma.$transaction(
    async (tx) => {
      const order = await tx.order.findFirst({
        where: { id: orderId, restaurantId },
      });

      if (!order) {
        throw new AppError("Order not found", 404);
      }

      if (order.status === OrderStatus.CANCELLED || order.status === OrderStatus.PAID) {
        throw new AppError("Cannot apply promotion on this order", 400);
      }

      let discount = 0;
      let appliedPromotionId: string | null = null;
      let appliedPromotionCode: string | null = null;

      if (promotionId || promotionCode) {
        const normalizedCode = promotionCode
          ? promotionCode.trim().toUpperCase()
          : undefined;
        const promotion = await tx.promotion.findFirst({
          where: {
            restaurantId,
            isActive: true,
            ...(promotionId ? { id: promotionId } : {}),
            ...(normalizedCode ? { code: normalizedCode } : {}),
          },
        });

        if (!promotion) {
          throw new AppError("Promotion not found or inactive", 404);
        }

        const now = new Date();
        if (promotion.startDate > now || promotion.endDate < now) {
          throw new AppError("Promotion is not valid for current date", 400);
        }

        if (promotion.minAmount != null && order.subtotal < promotion.minAmount) {
          throw new AppError(
            `Minimum amount for this promotion is ${promotion.minAmount}`,
            400,
          );
        }

        const gross = order.subtotal + order.tax + order.serviceCharge;
        discount = calculateDiscountAmount(promotion, gross);
        appliedPromotionId = promotion.id;
        appliedPromotionCode = promotion.code;
      }

      const total = order.subtotal + order.tax + order.serviceCharge - discount;

      return tx.order.update({
        where: { id: orderId },
        data: {
          discount,
          appliedPromotionId,
          appliedPromotionCode,
          total,
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
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
};

