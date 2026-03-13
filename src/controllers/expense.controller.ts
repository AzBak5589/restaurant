import { Request, Response } from "express";
import prisma from "../config/database";
import { AppError } from "../middlewares/error.middleware";

export const getExpenses = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const restaurantId = req.user!.restaurantId;
  const { category, startDate, endDate } = req.query;

  const where: any = { restaurantId };

  if (category) {
    where.category = category;
  }

  if (startDate || endDate) {
    where.date = {};
    if (startDate) where.date.gte = new Date(startDate as string);
    if (endDate) where.date.lte = new Date(endDate as string);
  }

  const expenses = await prisma.expense.findMany({
    where,
    include: {
      createdBy: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
    orderBy: { date: "desc" },
  });

  res.json(expenses);
};

export const getExpenseById = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { id } = req.params;
  const restaurantId = req.user!.restaurantId;

  const expense = await prisma.expense.findFirst({
    where: { id, restaurantId },
    include: {
      createdBy: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  });

  if (!expense) {
    throw new AppError("Expense not found", 404);
  }

  res.json(expense);
};

export const createExpense = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const restaurantId = req.user!.restaurantId;
  const userId = req.user!.id;

  const {
    category,
    description,
    amount,
    date,
    supplier,
    reference,
    paymentMethod,
    notes,
    isRecurring,
  } = req.body;

  if (!category || !description || !amount || !date) {
    throw new AppError(
      "category, description, amount and date are required",
      400,
    );
  }

  const expense = await prisma.expense.create({
    data: {
      restaurantId,
      createdById: userId,
      category,
      description,
      amount: parseFloat(amount),
      date: new Date(date),
      supplier: supplier || null,
      reference: reference || null,
      paymentMethod: paymentMethod || null,
      notes: notes || null,
      isRecurring: isRecurring || false,
    },
    include: {
      createdBy: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  });

  res.status(201).json(expense);
};

export const updateExpense = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { id } = req.params;
  const restaurantId = req.user!.restaurantId;

  const expense = await prisma.expense.findFirst({
    where: { id, restaurantId },
  });

  if (!expense) {
    throw new AppError("Expense not found", 404);
  }

  const data = { ...req.body };
  if (data.amount) data.amount = parseFloat(data.amount);
  if (data.date) data.date = new Date(data.date);

  const updated = await prisma.expense.update({
    where: { id },
    data,
    include: {
      createdBy: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  });

  res.json(updated);
};

export const deleteExpense = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { id } = req.params;
  const restaurantId = req.user!.restaurantId;

  const expense = await prisma.expense.findFirst({
    where: { id, restaurantId },
  });

  if (!expense) {
    throw new AppError("Expense not found", 404);
  }

  await prisma.expense.delete({ where: { id } });

  res.status(204).send();
};

export const getExpenseSummary = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const restaurantId = req.user!.restaurantId;
  const { startDate, endDate } = req.query;

  const where: any = { restaurantId };
  if (startDate || endDate) {
    where.date = {};
    if (startDate) where.date.gte = new Date(startDate as string);
    if (endDate) where.date.lte = new Date(endDate as string);
  }

  const expenses = await prisma.expense.findMany({ where });

  const totalExpenses = expenses.reduce(
    (sum: number, e: { amount: number }) => sum + e.amount,
    0,
  );

  const byCategory: Record<string, number> = {};
  for (const e of expenses) {
    byCategory[e.category] = (byCategory[e.category] || 0) + e.amount;
  }

  // Get revenue for the same period
  const orderWhere: any = {
    restaurantId,
    status: { in: ["SERVED", "PAID"] },
  };
  if (startDate || endDate) {
    orderWhere.createdAt = {};
    if (startDate) orderWhere.createdAt.gte = new Date(startDate as string);
    if (endDate) orderWhere.createdAt.lte = new Date(endDate as string);
  }

  const orders = await prisma.order.findMany({
    where: orderWhere,
    select: { total: true },
  });

  const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);

  res.json({
    totalExpenses,
    totalRevenue,
    netProfit: totalRevenue - totalExpenses,
    expenseCount: expenses.length,
    orderCount: orders.length,
    byCategory,
  });
};
