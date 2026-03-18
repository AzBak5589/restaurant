import { TableStatus } from "@prisma/client";
import { z } from "zod";

export const getTablesSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({
    zone: z.string().trim().min(1).max(120).optional(),
    status: z.nativeEnum(TableStatus).optional(),
    sort: z
      .enum(["number_asc", "number_desc", "capacity_asc", "capacity_desc"])
      .optional(),
  }),
  params: z.object({}).optional(),
});

export const getFloorPlanSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({
    sort: z.enum(["number_asc", "number_desc"]).optional(),
  }),
  params: z.object({}).optional(),
});

export const getTableByIdSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({
    id: z.string().uuid(),
  }),
});
