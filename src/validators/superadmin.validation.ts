import { z } from "zod";

export const listRestaurantsSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().optional(),
    search: z.string().optional(),
    isActive: z.enum(["true", "false"]).optional(),
    plan: z.string().optional(),
  }),
});

export const listUsersSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().optional(),
    role: z.string().optional(),
    restaurantId: z.string().optional(),
    search: z.string().optional(),
  }),
});

export const platformLogsSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().optional(),
    type: z.enum(["order", "user", "restaurant"]).optional(),
  }),
});

export const securityOverviewSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    loginLimit: z.coerce.number().int().positive().optional(),
  }),
});
