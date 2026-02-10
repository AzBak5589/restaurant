import { Router } from "express";
import authRoutes from "./auth.routes";
import orderRoutes from "./order.routes";
import menuRoutes from "./menu.routes";
import inventoryRoutes from "./inventory.routes";
import paymentRoutes from "./payment.routes";
import tableRoutes from "./table.routes";
import reservationRoutes from "./reservation.routes";
import staffRoutes from "./staff.routes";
import reportingRoutes from "./reporting.routes";
import customerRoutes from "./customer.routes";
import digitalMenuRoutes from "./digitalmenu.routes";
import recipeRoutes from "./recipe.routes";
import activityRoutes from "./activity.routes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/orders", orderRoutes);
router.use("/menu", menuRoutes);
router.use("/inventory", inventoryRoutes);
router.use("/payments", paymentRoutes);
router.use("/tables", tableRoutes);
router.use("/reservations", reservationRoutes);
router.use("/staff", staffRoutes);
router.use("/reports", reportingRoutes);
router.use("/customers", customerRoutes);
router.use("/digital-menu", digitalMenuRoutes);
router.use("/recipes", recipeRoutes);
router.use("/activity", activityRoutes);

router.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

export default router;
