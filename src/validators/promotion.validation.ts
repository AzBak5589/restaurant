import { z } from "zod";

const discountTypeEnum = z.enum(["PERCENTAGE", "FIXED"]);

export const getPromotionsSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    search: z.string().optional(),
    code: z.string().optional(),
    isActive: z.enum(["true", "false"]).optional(),
    activeOn: z.string().optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().optional(),
  }),
});

export const getPromotionByIdSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({
    id: z.string().uuid(),
  }),
});

export const createPromotionSchema = z.object({
  body: z.object({
    code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9_-]{3,30}$/)
      .optional(),
    name: z.string().min(1).max(120),
    description: z.string().max(500).optional(),
    discountType: discountTypeEnum,
    discountValue: z.coerce.number().positive(),
    minAmount: z.coerce.number().nonnegative().optional(),
    startDate: z.string().min(1),
    endDate: z.string().min(1),
    isActive: z.boolean().optional(),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

export const updatePromotionSchema = z.object({
  body: z.object({
    code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9_-]{3,30}$/)
      .nullable()
      .optional(),
    name: z.string().min(1).max(120).optional(),
    description: z.string().max(500).nullable().optional(),
    discountType: discountTypeEnum.optional(),
    discountValue: z.coerce.number().positive().optional(),
    minAmount: z.coerce.number().nonnegative().nullable().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    isActive: z.boolean().optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({
    id: z.string().uuid(),
  }),
});

export const validatePromotionByCodeSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9_-]{3,30}$/),
    subtotal: z.coerce.number().nonnegative().optional(),
  }),
});

export const deletePromotionSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({
    id: z.string().uuid(),
  }),
});

