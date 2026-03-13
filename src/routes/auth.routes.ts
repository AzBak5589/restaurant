import { Router } from "express";
import {
  register,
  login,
  getProfile,
  refreshTokens,
} from "../controllers/auth.controller";
import { authenticate, authorize } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validation.middleware";
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
} from "../validators/auth.validation";

const router = Router();

router.post(
  "/register",
  authenticate,
  authorize("SUPER_ADMIN", "ADMIN"),
  validate(registerSchema),
  register,
);
router.post("/login", validate(loginSchema), login);
router.post("/refresh", validate(refreshTokenSchema), refreshTokens);
router.get("/profile", authenticate, getProfile);

export default router;
