import { Request, Response } from "express";
import prisma from "../config/database";
import { hashPassword, comparePassword } from "../utils/password";
import { generateAccessToken, generateRefreshToken } from "../utils/jwt";
import { AppError } from "../middlewares/error.middleware";

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, firstName, lastName, phone, role, restaurantId } =
      req.body;

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
    });

    res.status(201).json({
      user,
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
