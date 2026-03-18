import { z } from "zod";

export const getCategoriesSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({
    sort: z
      .enum(["sortOrder_asc", "sortOrder_desc", "name_asc", "name_desc"])
      .optional(),
  }),
  params: z.object({}).optional(),
});

export const getMenuItemsSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({
    categoryId: z.string().uuid().optional(),
    isAvailable: z.enum(["true", "false"]).optional(),
    sort: z
      .enum([
        "name_asc",
        "name_desc",
        "price_asc",
        "price_desc",
        "preparationTime_asc",
        "preparationTime_desc",
      ])
      .optional(),
  }),
  params: z.object({}).optional(),
});

export const getMenuItemByIdSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({
    id: z.string().uuid(),
  }),
});
