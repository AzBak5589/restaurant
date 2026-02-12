import { Request, Response } from 'express';
import prisma from '../config/database';

// GET /restaurants/current — get current user's restaurant
export const getCurrentRestaurant = async (req: Request, res: Response): Promise<void> => {
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: req.user!.restaurantId },
  });

  if (!restaurant) {
    res.status(404).json({ error: 'Restaurant not found' });
    return;
  }

  res.json(restaurant);
};

// PATCH /restaurants/current — update current user's restaurant
export const updateCurrentRestaurant = async (req: Request, res: Response): Promise<void> => {
  const { name, slug, email, phone, address, currency, taxRate, timezone, serviceCharge } = req.body;

  const data: Record<string, unknown> = {};
  if (name !== undefined) data.name = name;
  if (slug !== undefined) data.slug = slug;
  if (email !== undefined) data.email = email;
  if (phone !== undefined) data.phone = phone;
  if (address !== undefined) data.address = address;
  if (currency !== undefined) data.currency = currency;
  if (taxRate !== undefined) data.taxRate = parseFloat(taxRate);
  if (timezone !== undefined) data.timezone = timezone;
  if (serviceCharge !== undefined) data.serviceCharge = parseFloat(serviceCharge);

  const restaurant = await prisma.restaurant.update({
    where: { id: req.user!.restaurantId },
    data,
  });

  res.json(restaurant);
};
