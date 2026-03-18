import { Request, Response } from "express";
import { UserRole } from "@prisma/client";
import prisma from "../config/database";
import { hashPassword, comparePassword } from "../utils/password";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../utils/jwt";
import { AppError } from "../middlewares/error.middleware";

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, firstName, lastName, phone, role, restaurantId } =
      req.body;
    const authenticatedUser = req.user;

    if (!authenticatedUser) {
      throw new AppError("Unauthorized", 401);
    }

    const allowedRoles: UserRole[] = [
      "ADMIN",
      "MANAGER",
      "CASHIER",
      "WAITER",
      "CHEF",
      "BARTENDER",
    ];
    if (!allowedRoles.includes(role)) {
      throw new AppError("Role not allowed for registration", 403);
    }

    if (
      authenticatedUser.role !== "SUPER_ADMIN" &&
      role === "ADMIN"
    ) {
      throw new AppError("Only super admin can create admin users", 403);
    }

    if (
      authenticatedUser.role !== "SUPER_ADMIN" &&
      authenticatedUser.restaurantId !== restaurantId
    ) {
      throw new AppError(
        "You can only create users in your own restaurant",
        403,
      );
    }

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { id: true, isActive: true },
    });

    if (!restaurant || !restaurant.isActive) {
      throw new AppError("Restaurant not found or inactive", 400);
    }

    const existingUser = await prisma.user.findUnique({
      where: {
        restaurantId_email: {
          restaurantId,
          email,
        },
      },
    });

    if (existingUser) {
      throw new AppError("User already exists", 400);
    }

    const hashedPassword = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        phone,
        role,
        restaurantId,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        restaurantId: true,
        refreshTokenVersion: true,
      },
    });

    const accessToken = generateAccessToken({
      id: user.id,
      restaurantId: user.restaurantId,
      email: user.email,
      role: user.role,
    });

    const refreshToken = generateRefreshToken({
      id: user.id,
      restaurantId: user.restaurantId,
      email: user.email,
      role: user.role,
      tokenVersion: user.refreshTokenVersion,
    });

    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        restaurantId: user.restaurantId,
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    throw error;
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, restaurantId } = req.body;

    // SUPER_ADMIN can login without restaurantId (email-only lookup)
    const user = restaurantId
      ? await prisma.user.findUnique({
          where: {
            restaurantId_email: {
              restaurantId,
              email,
            },
          },
        })
      : await prisma.user.findFirst({
          where: { email, role: "SUPER_ADMIN", restaurantId: null },
        });

    if (!user) {
      throw new AppError("Invalid credentials", 401);
    }

    if (!user.isActive) {
      throw new AppError("Account is inactive", 403);
    }

    const isPasswordValid = await comparePassword(password, user.password);

    if (!isPasswordValid) {
      throw new AppError("Invalid credentials", 401);
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    const accessToken = generateAccessToken({
      id: user.id,
      restaurantId: user.restaurantId,
      email: user.email,
      role: user.role,
    });

    const refreshToken = generateRefreshToken({
      id: user.id,
      restaurantId: user.restaurantId,
      email: user.email,
      role: user.role,
      tokenVersion: user.refreshTokenVersion,
    });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        restaurantId: user.restaurantId,
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    throw error;
  }
};

export const getProfile = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        avatar: true,
        restaurantId: true,
        restaurant: {
          select: {
            id: true,
            name: true,
            slug: true,
            logo: true,
          },
        },
      },
    });

    if (!user) {
      throw new AppError("User not found", 404);
    }

    res.json(user);
  } catch (error) {
    throw error;
  }
};

export const refreshTokens = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { refreshToken } = req.body as { refreshToken: string };
    const payload = verifyRefreshToken(refreshToken);

    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        restaurantId: true,
        isActive: true,
        refreshTokenVersion: true,
      },
    });

    if (!user) {
      throw new AppError("User not found", 401);
    }

    if (!user.isActive) {
      throw new AppError("Account is inactive", 403);
    }

    if (
      typeof payload.tokenVersion !== "number" ||
      payload.tokenVersion !== user.refreshTokenVersion
    ) {
      throw new AppError("Refresh token revoked", 401);
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        refreshTokenVersion: {
          increment: 1,
        },
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        restaurantId: true,
        refreshTokenVersion: true,
      },
    });

    const accessToken = generateAccessToken({
      id: updatedUser.id,
      restaurantId: updatedUser.restaurantId,
      email: updatedUser.email,
      role: updatedUser.role,
    });

    const nextRefreshToken = generateRefreshToken({
      id: updatedUser.id,
      restaurantId: updatedUser.restaurantId,
      email: updatedUser.email,
      role: updatedUser.role,
      tokenVersion: updatedUser.refreshTokenVersion,
    });

    res.json({
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        role: updatedUser.role,
        restaurantId: updatedUser.restaurantId,
      },
      accessToken,
      refreshToken: nextRefreshToken,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "JsonWebTokenError") {
      throw new AppError("Invalid refresh token", 401);
    }

    if (error instanceof Error && error.name === "TokenExpiredError") {
      throw new AppError("Refresh token expired", 401);
    }

    throw error;
  }
};

export const logout = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError("Unauthorized", 401);
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      refreshTokenVersion: {
        increment: 1,
      },
    },
  });

  res.status(204).send();
};
