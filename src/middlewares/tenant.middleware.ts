import { Request, Response, NextFunction } from "express";
import prisma from "../config/database";

export const validateTenant = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    // SUPER_ADMIN operates at platform level — skip tenant check
    if (req.user?.role === "SUPER_ADMIN") {
      next();
      return;
    }

    const restaurantId = req.restaurantId || req.user?.restaurantId;

    if (!restaurantId) {
      res.status(400).json({ error: "Restaurant ID is required" });
      return;
    }

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { id: true, isActive: true },
    });

    if (!restaurant) {
      res.status(404).json({ error: "Restaurant not found" });
      return;
    }

    if (!restaurant.isActive) {
      res.status(403).json({ error: "Restaurant account is inactive" });
      return;
    }

    next();
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};
