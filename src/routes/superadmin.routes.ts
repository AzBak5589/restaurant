import { Router } from "express";
import { authenticate, authorize } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validation.middleware";
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
import {
  listRestaurantsSchema,
  listUsersSchema,
  platformLogsSchema,
  securityOverviewSchema,
} from "../validators/superadmin.validation";

const router = Router();

// All routes require SUPER_ADMIN role — no tenant middleware needed
router.use(authenticate, authorize("SUPER_ADMIN"));

router.get("/restaurants", validate(listRestaurantsSchema), listRestaurants);
router.get("/stats", platformStats);
router.post("/restaurants", createRestaurant);
router.patch("/restaurants/:id", updateRestaurant);
router.delete("/restaurants/:id", deleteRestaurant);

router.get("/users", validate(listUsersSchema), listAllUsers);
router.patch("/users/:id", updateUser);
router.get("/logs", validate(platformLogsSchema), platformLogs);
router.get("/security", validate(securityOverviewSchema), securityOverview);

export default router;
