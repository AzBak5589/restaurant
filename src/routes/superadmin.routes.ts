import { Router } from "express";
import { authenticate, authorize } from "../middlewares/auth.middleware";
import {
  listRestaurants,
  platformStats,
  createRestaurant,
  updateRestaurant,
  deleteRestaurant,
  listAllUsers,
  updateUser,
  platformLogs,
  securityOverview,
} from "../controllers/superadmin.controller";

const router = Router();

// All routes require SUPER_ADMIN role — no tenant middleware needed
router.use(authenticate, authorize("SUPER_ADMIN"));

router.get("/restaurants", listRestaurants);
router.get("/stats", platformStats);
router.post("/restaurants", createRestaurant);
router.patch("/restaurants/:id", updateRestaurant);
router.delete("/restaurants/:id", deleteRestaurant);

router.get("/users", listAllUsers);
router.patch("/users/:id", updateUser);
router.get("/logs", platformLogs);
router.get("/security", securityOverview);

export default router;
