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
import { validate } from "../middlewares/validation.middleware";
import {
  addItemsToOrderSchema,
  cancelOrderSchema,
  createOrderSchema,
  getOrderByIdSchema,
  getOrdersSchema,
  updateOrderItemStatusSchema,
  updateOrderStatusSchema,
} from "../validators/order.validation";

const router = Router();

router.use(authenticate);
router.use(validateTenant);

router.post(
  "/",
  authorize("ADMIN", "MANAGER", "WAITER"),
  validate(createOrderSchema),
  createOrder,
);
router.get("/", validate(getOrdersSchema), getOrders);
router.get("/:id", validate(getOrderByIdSchema), getOrderById);
router.patch(
  "/:id/status",
  authorize("ADMIN", "MANAGER", "WAITER", "CHEF"),
  validate(updateOrderStatusSchema),
  updateOrderStatus,
);
router.patch(
  "/:id/items/:itemId/status",
  authorize("ADMIN", "MANAGER", "CHEF"),
  validate(updateOrderItemStatusSchema),
  updateOrderItemStatus,
);
router.post(
  "/:id/items",
  authorize("ADMIN", "MANAGER", "WAITER"),
  validate(addItemsToOrderSchema),
  addItemsToOrder,
);
router.delete(
  "/:id",
  authorize("ADMIN", "MANAGER"),
  validate(cancelOrderSchema),
  cancelOrder,
);

export default router;
