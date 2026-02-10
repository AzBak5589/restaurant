import { Request, Response } from 'express';
import prisma from '../config/database';
import { AppError } from '../middlewares/error.middleware';

export const getRecipes = async (req: Request, res: Response): Promise<void> => {
  const restaurantId = req.user!.restaurantId;

  const recipes = await prisma.recipe.findMany({
    where: { restaurantId },
    include: {
      menuItem: {
        select: { id: true, name: true, price: true, cost: true, categoryId: true },
      },
      ingredients: {
        include: {
          item: {
            select: { id: true, name: true, unit: true, unitCost: true, currentStock: true },
          },
        },
      },
    },
    orderBy: { menuItem: { name: 'asc' } },
  });

  res.json(recipes);
};

export const getRecipeByMenuItem = async (req: Request, res: Response): Promise<void> => {
  const { menuItemId } = req.params;
  const restaurantId = req.user!.restaurantId;

  const recipe = await prisma.recipe.findUnique({
    where: { restaurantId_menuItemId: { restaurantId, menuItemId } },
    include: {
      menuItem: true,
      ingredients: {
        include: {
          item: {
            select: { id: true, name: true, unit: true, unitCost: true, currentStock: true },
          },
        },
      },
    },
  });

  if (!recipe) {
    throw new AppError('Recipe not found for this menu item', 404);
  }

  const totalCost = recipe.ingredients.reduce(
    (sum, ing) => sum + ing.quantity * (ing.item.unitCost || 0),
    0
  );

  res.json({
    ...recipe,
    totalCost,
    profitMargin: recipe.menuItem.price > 0
      ? ((recipe.menuItem.price - totalCost) / recipe.menuItem.price) * 100
      : 0,
  });
};

export const createRecipe = async (req: Request, res: Response): Promise<void> => {
  const restaurantId = req.user!.restaurantId;
  const { menuItemId, portionSize, notes, ingredients } = req.body;

  const menuItem = await prisma.menuItem.findFirst({
    where: { id: menuItemId, restaurantId },
  });

  if (!menuItem) {
    throw new AppError('Menu item not found', 404);
  }

  const existingRecipe = await prisma.recipe.findUnique({
    where: { restaurantId_menuItemId: { restaurantId, menuItemId } },
  });

  if (existingRecipe) {
    throw new AppError('Recipe already exists for this menu item', 400);
  }

  for (const ing of ingredients) {
    const inventoryItem = await prisma.inventoryItem.findFirst({
      where: { id: ing.itemId, restaurantId },
    });
    if (!inventoryItem) {
      throw new AppError(`Inventory item ${ing.itemId} not found`, 404);
    }
  }

  const recipe = await prisma.recipe.create({
    data: {
      restaurantId,
      menuItemId,
      portionSize: portionSize || 1,
      notes,
      ingredients: {
        create: ingredients.map((ing: { itemId: string; quantity: number; unit: string }) => ({
          itemId: ing.itemId,
          quantity: ing.quantity,
          unit: ing.unit,
        })),
      },
    },
    include: {
      menuItem: true,
      ingredients: {
        include: {
          item: {
            select: { id: true, name: true, unit: true, unitCost: true },
          },
        },
      },
    },
  });

  const totalCost = recipe.ingredients.reduce(
    (sum, ing) => sum + ing.quantity * (ing.item.unitCost || 0),
    0
  );

  await prisma.menuItem.update({
    where: { id: menuItemId },
    data: { cost: totalCost },
  });

  res.status(201).json(recipe);
};

export const updateRecipe = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const restaurantId = req.user!.restaurantId;
  const { portionSize, notes, ingredients } = req.body;

  const recipe = await prisma.recipe.findFirst({
    where: { id, restaurantId },
  });

  if (!recipe) {
    throw new AppError('Recipe not found', 404);
  }

  if (ingredients) {
    for (const ing of ingredients) {
      const inventoryItem = await prisma.inventoryItem.findFirst({
        where: { id: ing.itemId, restaurantId },
      });
      if (!inventoryItem) {
        throw new AppError(`Inventory item ${ing.itemId} not found`, 404);
      }
    }
  }

  const updatedRecipe = await prisma.$transaction(async (tx) => {
    if (ingredients) {
      await tx.recipeIngredient.deleteMany({
        where: { recipeId: id },
      });
    }

    const result = await tx.recipe.update({
      where: { id },
      data: {
        ...(portionSize !== undefined && { portionSize }),
        ...(notes !== undefined && { notes }),
        ...(ingredients && {
          ingredients: {
            create: ingredients.map((ing: { itemId: string; quantity: number; unit: string }) => ({
              itemId: ing.itemId,
              quantity: ing.quantity,
              unit: ing.unit,
            })),
          },
        }),
      },
      include: {
        menuItem: true,
        ingredients: {
          include: {
            item: {
              select: { id: true, name: true, unit: true, unitCost: true },
            },
          },
        },
      },
    });

    const totalCost = result.ingredients.reduce(
      (sum, ing) => sum + ing.quantity * (ing.item.unitCost || 0),
      0
    );

    await tx.menuItem.update({
      where: { id: result.menuItemId },
      data: { cost: totalCost },
    });

    return result;
  });

  res.json(updatedRecipe);
};

export const deleteRecipe = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const restaurantId = req.user!.restaurantId;

  const recipe = await prisma.recipe.findFirst({
    where: { id, restaurantId },
  });

  if (!recipe) {
    throw new AppError('Recipe not found', 404);
  }

  await prisma.recipe.delete({ where: { id } });

  res.status(204).send();
};

export const getMenuItemCostAnalysis = async (req: Request, res: Response): Promise<void> => {
  const restaurantId = req.user!.restaurantId;

  const recipes = await prisma.recipe.findMany({
    where: { restaurantId },
    include: {
      menuItem: {
        select: { id: true, name: true, price: true, categoryId: true },
      },
      ingredients: {
        include: {
          item: { select: { unitCost: true } },
        },
      },
    },
  });

  const analysis = recipes.map((recipe) => {
    const totalCost = recipe.ingredients.reduce(
      (sum, ing) => sum + ing.quantity * (ing.item.unitCost || 0),
      0
    );
    const margin = recipe.menuItem.price - totalCost;
    const marginPercent = recipe.menuItem.price > 0
      ? (margin / recipe.menuItem.price) * 100
      : 0;

    return {
      menuItemId: recipe.menuItem.id,
      menuItemName: recipe.menuItem.name,
      sellingPrice: recipe.menuItem.price,
      foodCost: totalCost,
      margin,
      marginPercent: Math.round(marginPercent * 100) / 100,
      costRatio: recipe.menuItem.price > 0
        ? Math.round((totalCost / recipe.menuItem.price) * 10000) / 100
        : 0,
    };
  });

  const avgCostRatio = analysis.length > 0
    ? analysis.reduce((sum, a) => sum + a.costRatio, 0) / analysis.length
    : 0;

  res.json({
    averageCostRatio: Math.round(avgCostRatio * 100) / 100,
    itemCount: analysis.length,
    items: analysis.sort((a, b) => b.marginPercent - a.marginPercent),
  });
};
