import { Router } from "express";
import {
  createOrder,
  getOrders,
  getOrderById,
  updateOrderStatus,
  updateOrderItemStatus,
  addItemsToOrder,
  cancelOrder,
} from "../controllers/order.controller";
import { authenticate, authorize } from "../middlewares/auth.middleware";
import { validateTenant } from "../middlewares/tenant.middleware";

const router = Router();

router.use(authenticate);
router.use(validateTenant);

router.post("/", authorize("ADMIN", "MANAGER", "WAITER"), createOrder);
router.get("/", getOrders);
router.get("/:id", getOrderById);
router.patch(
  "/:id/status",
  authorize("ADMIN", "MANAGER", "WAITER", "CHEF"),
  updateOrderStatus,
);
router.patch(
  "/:id/items/:itemId/status",
  authorize("ADMIN", "MANAGER", "CHEF"),
  updateOrderItemStatus,
);
router.post(
  "/:id/items",
  authorize("ADMIN", "MANAGER", "WAITER"),
  addItemsToOrder,
);
router.delete("/:id", authorize("ADMIN", "MANAGER"), cancelOrder);

export default router;
