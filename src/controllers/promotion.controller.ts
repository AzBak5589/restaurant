import { Request, Response } from "express";
import prisma from "../config/database";
import { AppError } from "../middlewares/error.middleware";
import { parsePagination } from "../utils/pagination";
import { Prisma } from "@prisma/client";

export const getPromotions = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const restaurantId = req.user!.restaurantId;
  const { search, isActive, code } = req.query;
  const activeOn = req.query.activeOn as string | undefined;
  const { skip, limit } = parsePagination(req.query.page, req.query.limit, 100, 20);

  const where: Record<string, unknown> = { restaurantId };

  if (typeof isActive === "string") {
    where.isActive = isActive === "true";
  }

  if (search) {
    where.OR = [
      { name: { contains: search as string, mode: "insensitive" } },
      { description: { contains: search as string, mode: "insensitive" } },
    ];
  }

  if (code) {
    where.code = String(code).trim().toUpperCase();
  }

  if (activeOn) {
    const activeDate = new Date(activeOn);
    where.startDate = { lte: activeDate };
    where.endDate = { gte: activeDate };
    where.isActive = true;
  }

  const promotions = await prisma.promotion.findMany({
    where,
    orderBy: { startDate: "desc" },
    skip,
    take: limit,
  });

  res.json(promotions);
};

export const getPromotionById = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const restaurantId = req.user!.restaurantId;
  const { id } = req.params;

  const promotion = await prisma.promotion.findFirst({
    where: { id, restaurantId },
  });

  if (!promotion) {
    throw new AppError("Promotion not found", 404);
  }

  res.json(promotion);
};

export const createPromotion = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const restaurantId = req.user!.restaurantId;
  const {
    code,
    name,
    description,
    discountType,
    discountValue,
    minAmount,
    startDate,
    endDate,
    isActive,
  } = req.body;

  const parsedStart = new Date(startDate);
  const parsedEnd = new Date(endDate);
  if (parsedEnd < parsedStart) {
    throw new AppError("endDate must be greater than or equal to startDate", 400);
  }

  let promotion;
  try {
    promotion = await prisma.promotion.create({
      data: {
        restaurantId,
        code: code ? String(code).trim().toUpperCase() : null,
        name,
        description: description || null,
        discountType,
        discountValue: Number(discountValue),
        minAmount: minAmount != null ? Number(minAmount) : null,
        startDate: parsedStart,
        endDate: parsedEnd,
        isActive: isActive ?? true,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new AppError("Promotion code already exists", 409);
    }
    throw error;
  }

  res.status(201).json(promotion);
};

export const updatePromotion = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const restaurantId = req.user!.restaurantId;
  const { id } = req.params;

  const existing = await prisma.promotion.findFirst({
    where: { id, restaurantId },
  });
  if (!existing) {
    throw new AppError("Promotion not found", 404);
  }

  const data: Record<string, unknown> = { ...req.body };
  if (data.code !== undefined) {
    data.code = data.code ? String(data.code).trim().toUpperCase() : null;
  }
  if (data.discountValue != null) data.discountValue = Number(data.discountValue);
  if (data.minAmount != null) data.minAmount = Number(data.minAmount);
  if (data.startDate) data.startDate = new Date(data.startDate as string);
  if (data.endDate) data.endDate = new Date(data.endDate as string);

  const nextStart = (data.startDate as Date | undefined) || existing.startDate;
  const nextEnd = (data.endDate as Date | undefined) || existing.endDate;
  if (nextEnd < nextStart) {
    throw new AppError("endDate must be greater than or equal to startDate", 400);
  }

  let promotion;
  try {
    promotion = await prisma.promotion.update({
      where: { id },
      data,
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new AppError("Promotion code already exists", 409);
    }
    throw error;
  }

  res.json(promotion);
};

export const deletePromotion = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const restaurantId = req.user!.restaurantId;
  const { id } = req.params;

  const existing = await prisma.promotion.findFirst({
    where: { id, restaurantId },
  });
  if (!existing) {
    throw new AppError("Promotion not found", 404);
  }

  await prisma.promotion.delete({ where: { id } });
  res.status(204).send();
};

export const validatePromotionByCode = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const restaurantId = req.user!.restaurantId;
  const code = String(req.query.code || "")
    .trim()
    .toUpperCase();
  const subtotal =
    req.query.subtotal !== undefined
      ? Number(req.query.subtotal)
      : undefined;

  const now = new Date();
  const promotion = await prisma.promotion.findFirst({
    where: {
      restaurantId,
      code,
      isActive: true,
      startDate: { lte: now },
      endDate: { gte: now },
    },
  });

  if (!promotion) {
    throw new AppError("Promotion code is invalid or expired", 404);
  }

  if (subtotal != null && promotion.minAmount != null && subtotal < promotion.minAmount) {
    throw new AppError(
      `Minimum amount for this promotion is ${promotion.minAmount}`,
      400,
    );
  }

  res.json(promotion);
};

