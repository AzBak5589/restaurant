import { Request, Response } from 'express';
import prisma from '../config/database';
import { AppError } from '../middlewares/error.middleware';
import QRCode from 'qrcode';

export const getPublicMenu = async (req: Request, res: Response): Promise<void> => {
  const { slug } = req.params;

  const restaurant = await prisma.restaurant.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      logo: true,
      currency: true,
      address: true,
      phone: true,
    },
  });

  if (!restaurant || !restaurant.id) {
    throw new AppError('Restaurant not found', 404);
  }

  const categories = await prisma.menuCategory.findMany({
    where: { restaurantId: restaurant.id, isActive: true },
    orderBy: { sortOrder: 'asc' },
    include: {
      menuItems: {
        where: { isActive: true, isAvailable: true },
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          image: true,
          preparationTime: true,
          calories: true,
          tags: true,
          allergens: true,
          isAvailable: true,
        },
        orderBy: { name: 'asc' },
      },
    },
  });

  res.json({
    restaurant: {
      name: restaurant.name,
      logo: restaurant.logo,
      currency: restaurant.currency,
      address: restaurant.address,
      phone: restaurant.phone,
    },
    categories: categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      description: cat.description,
      image: cat.image,
      items: cat.menuItems,
    })),
  });
};

export const generateTableQRCode = async (req: Request, res: Response): Promise<void> => {
  const restaurantId = req.user!.restaurantId;
  const { tableId } = req.params;
  const { baseUrl } = req.query;

  const table = await prisma.table.findFirst({
    where: { id: tableId, restaurantId },
  });

  if (!table) {
    throw new AppError('Table not found', 404);
  }

  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: { slug: true },
  });

  const menuUrl = `${baseUrl || 'https://your-app.com'}/menu/${restaurant!.slug}?table=${table.number}`;

  const qrDataUrl = await QRCode.toDataURL(menuUrl, {
    width: 400,
    margin: 2,
    color: { dark: '#000000', light: '#FFFFFF' },
  });

  res.json({
    tableNumber: table.number,
    menuUrl,
    qrCode: qrDataUrl,
  });
};

export const generateAllTableQRCodes = async (req: Request, res: Response): Promise<void> => {
  const restaurantId = req.user!.restaurantId;
  const { baseUrl } = req.query;

  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: { slug: true },
  });

  const tables = await prisma.table.findMany({
    where: { restaurantId, isActive: true },
    orderBy: { number: 'asc' },
  });

  const qrCodes = await Promise.all(
    tables.map(async (table) => {
      const menuUrl = `${baseUrl || 'https://your-app.com'}/menu/${restaurant!.slug}?table=${table.number}`;
      const qrCode = await QRCode.toDataURL(menuUrl, {
        width: 400,
        margin: 2,
      });
      return {
        tableId: table.id,
        tableNumber: table.number,
        zone: table.zone,
        menuUrl,
        qrCode,
      };
    })
  );

  res.json(qrCodes);
};

export const checkItemAvailability = async (req: Request, res: Response): Promise<void> => {
  const { slug } = req.params;
  const { itemId } = req.params;

  const restaurant = await prisma.restaurant.findUnique({
    where: { slug },
    select: { id: true },
  });

  if (!restaurant) {
    throw new AppError('Restaurant not found', 404);
  }

  const item = await prisma.menuItem.findFirst({
    where: { id: itemId, restaurantId: restaurant.id, isActive: true },
    select: { id: true, name: true, isAvailable: true, price: true },
  });

  if (!item) {
    throw new AppError('Item not found', 404);
  }

  res.json(item);
};
