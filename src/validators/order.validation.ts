import { OrderStatus } from "@prisma/client";
import { z } from "zod";

const orderItemInputSchema = z.object({
  menuItemId: z.string().uuid(),
  quantity: z.number().int().positive(),
  modifiers: z.unknown().optional(),
  notes: z.string().max(500).optional(),
});

export const createOrderSchema = z.object({
  body: z.object({
    tableId: z.string().uuid().optional(),
    guestCount: z.number().int().positive().optional(),
    notes: z.string().max(1000).optional(),
    items: z.array(orderItemInputSchema).min(1),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const getOrdersSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({
    status: z.nativeEnum(OrderStatus).optional(),
    date: z.string().optional(),
    tableId: z.string().uuid().optional(),
  }),
  params: z.object({}).optional(),
});

export const getOrderByIdSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({
    id: z.string().uuid(),
  }),
});

export const updateOrderStatusSchema = z.object({
  body: z.object({
    status: z.nativeEnum(OrderStatus),
  }),
  query: z.object({}).optional(),
  params: z.object({
    id: z.string().uuid(),
  }),
});

export const updateOrderItemStatusSchema = z.object({
  body: z.object({
    status: z.nativeEnum(OrderStatus),
  }),
  query: z.object({}).optional(),
  params: z.object({
    id: z.string().uuid(),
    itemId: z.string().uuid(),
  }),
});

export const addItemsToOrderSchema = z.object({
  body: z.object({
    items: z.array(orderItemInputSchema).min(1),
  }),
  query: z.object({}).optional(),
  params: z.object({
    id: z.string().uuid(),
  }),
});

export const cancelOrderSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({
    id: z.string().uuid(),
  }),
});
