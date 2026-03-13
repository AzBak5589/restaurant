import { InventoryMovementType } from "@prisma/client";
import { z } from "zod";

export const getInventoryItemsSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({
    category: z.string().trim().min(1).max(120).optional(),
    location: z.string().trim().min(1).max(120).optional(),
    lowStock: z.enum(["true", "false"]).optional(),
    sort: z
      .enum(["name_asc", "name_desc", "currentStock_asc", "currentStock_desc"])
      .optional(),
  }),
  params: z.object({}).optional(),
});

export const getInventoryItemByIdSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({
    id: z.string().uuid(),
  }),
});

export const getMovementsSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({
    itemId: z.string().uuid().optional(),
    type: z.nativeEnum(InventoryMovementType).optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    sort: z.enum(["createdAt_desc", "createdAt_asc"]).optional(),
  }),
  params: z.object({}).optional(),
});

export const getStockValuationSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({
    category: z.string().trim().min(1).max(120).optional(),
    location: z.string().trim().min(1).max(120).optional(),
    sort: z
      .enum(["name_asc", "name_desc", "totalValue_desc", "totalValue_asc"])
      .optional(),
  }),
  params: z.object({}).optional(),
});
