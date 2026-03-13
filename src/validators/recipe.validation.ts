import { z } from "zod";

export const getRecipesSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({
    sort: z.enum(["menuItemName_asc", "menuItemName_desc"]).optional(),
  }),
  params: z.object({}).optional(),
});

export const getMenuItemCostAnalysisSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({
    sort: z
      .enum([
        "marginPercent_desc",
        "marginPercent_asc",
        "costRatio_desc",
        "costRatio_asc",
      ])
      .optional(),
  }),
  params: z.object({}).optional(),
});

export const getRecipeByMenuItemSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({
    menuItemId: z.string().uuid(),
  }),
});
