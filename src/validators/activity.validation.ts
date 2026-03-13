import { z } from "zod";

export const getRecentActivitySchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().optional(),
    type: z.enum(["order", "payment", "reservation", "inventory"]).optional(),
  }),
});
