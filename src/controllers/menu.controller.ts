import { Request, Response } from "express";
import prisma from "../config/database";
import { AppError } from "../middlewares/error.middleware";

export const getCategories = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const restaurantId = req.user!.restaurantId;

    const categories = await prisma.menuCategory.findMany({
      where: { restaurantId, isActive: true },
      orderBy: { sortOrder: "asc" },
      include: {
        menuItems: {
          where: { isActive: true },
          orderBy: { name: "asc" },
        },
      },
    });

    res.json(categories);
  } catch (error) {
    throw error;
  }
};

export const createCategory = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { name, description, image, sortOrder } = req.body;
    const restaurantId = req.user!.restaurantId;

    const category = await prisma.menuCategory.create({
      data: {
        restaurantId,
        name,
        description,
        image,
        sortOrder: sortOrder || 0,
      },
    });

    res.status(201).json(category);
  } catch (error) {
    throw error;
  }
};

export const updateCategory = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;
    const restaurantId = req.user!.restaurantId;

    const category = await prisma.menuCategory.findFirst({
      where: { id, restaurantId },
    });

    if (!category) {
      throw new AppError("Category not found", 404);
    }

    const updatedCategory = await prisma.menuCategory.update({
      where: { id },
      data: req.body,
    });

    res.json(updatedCategory);
  } catch (error) {
    throw error;
  }
};

export const deleteCategory = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;
    const restaurantId = req.user!.restaurantId;

    const category = await prisma.menuCategory.findFirst({
      where: { id, restaurantId },
    });

    if (!category) {
      throw new AppError("Category not found", 404);
    }

    await prisma.menuCategory.update({
      where: { id },
      data: { isActive: false },
    });

    res.status(204).send();
  } catch (error) {
    throw error;
  }
};

export const getMenuItems = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const restaurantId = req.user!.restaurantId;
    const { categoryId, isAvailable } = req.query;

    const where: any = { restaurantId, isActive: true };

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (isAvailable !== undefined) {
      where.isAvailable = isAvailable === "true";
    }

    const menuItems = await prisma.menuItem.findMany({
      where,
      include: {
        category: true,
      },
      orderBy: { name: "asc" },
    });

    res.json(menuItems);
  } catch (error) {
    throw error;
  }
};

export const getMenuItemById = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;
    const restaurantId = req.user!.restaurantId;

    const menuItem = await prisma.menuItem.findFirst({
      where: { id, restaurantId },
      include: {
        category: true,
        recipes: {
          include: {
            ingredients: {
              include: {
                item: true,
              },
            },
          },
        },
      },
    });

    if (!menuItem) {
      throw new AppError("Menu item not found", 404);
    }

    res.json(menuItem);
  } catch (error) {
    throw error;
  }
};

export const createMenuItem = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const {
      categoryId,
      name,
      description,
      price,
      cost,
      image,
      preparationTime,
      calories,
      tags,
      allergens,
    } = req.body;
    const restaurantId = req.user!.restaurantId;

    const menuItem = await prisma.menuItem.create({
      data: {
        restaurantId,
        categoryId,
        name,
        description,
        price,
        cost,
        image,
        preparationTime,
        calories,
        tags: tags || [],
        allergens: allergens || [],
      },
      include: {
        category: true,
      },
    });

    res.status(201).json(menuItem);
  } catch (error) {
    throw error;
  }
};

export const updateMenuItem = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;
    const restaurantId = req.user!.restaurantId;

    const menuItem = await prisma.menuItem.findFirst({
      where: { id, restaurantId },
    });

    if (!menuItem) {
      throw new AppError("Menu item not found", 404);
    }

    const updatedMenuItem = await prisma.menuItem.update({
      where: { id },
      data: req.body,
      include: {
        category: true,
      },
    });

    res.json(updatedMenuItem);
  } catch (error) {
    throw error;
  }
};

export const deleteMenuItem = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;
    const restaurantId = req.user!.restaurantId;

    const menuItem = await prisma.menuItem.findFirst({
      where: { id, restaurantId },
    });

    if (!menuItem) {
      throw new AppError("Menu item not found", 404);
    }

    await prisma.menuItem.update({
      where: { id },
      data: { isActive: false },
    });

    res.status(204).send();
  } catch (error) {
    throw error;
  }
};

export const toggleAvailability = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;
    const restaurantId = req.user!.restaurantId;

    const menuItem = await prisma.menuItem.findFirst({
      where: { id, restaurantId },
    });

    if (!menuItem) {
      throw new AppError("Menu item not found", 404);
    }

    const updatedMenuItem = await prisma.menuItem.update({
      where: { id },
      data: { isAvailable: !menuItem.isAvailable },
    });

    res.json(updatedMenuItem);
  } catch (error) {
    throw error;
  }
};
