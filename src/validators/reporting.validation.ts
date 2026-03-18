import { z } from "zod";

const periodEnum = z.enum(["week", "month", "year"]);

export const revenueReportSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    period: periodEnum.optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  }),
});

export const salesByCategorySchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    period: periodEnum.optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  }),
});

export const topSellingItemsSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    period: periodEnum.optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    limit: z.coerce.number().int().positive().optional(),
  }),
});

export const tableTurnoverSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    period: periodEnum.optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  }),
});

export const promotionPerformanceSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    period: periodEnum.optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  }),
});
