import { z } from "zod";

export const getExpensesSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({
    category: z.string().trim().min(1).max(120).optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    sort: z.enum(["date_desc", "date_asc", "amount_desc", "amount_asc"]).optional(),
  }),
  params: z.object({}).optional(),
});

export const getExpenseSummarySchema = z.object({
  body: z.object({}).optional(),
  query: z.object({
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  }),
  params: z.object({}).optional(),
});

export const getExpenseByIdSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({
    id: z.string().uuid(),
  }),
});
