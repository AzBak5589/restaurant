import { UserRole } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        restaurantId: string;
        email: string;
        role: UserRole;
      };
      restaurantId?: string;
    }
  }
}

export {};
