import { Router } from "express";
import { authenticate, authorize } from "../middlewares/auth.middleware";
import { validateTenant } from "../middlewares/tenant.middleware";
import { validate } from "../middlewares/validation.middleware";
import {
  createPromotion,
  deletePromotion,
  getPromotionById,
  getPromotions,
  updatePromotion,
  validatePromotionByCode,
} from "../controllers/promotion.controller";
import {
  createPromotionSchema,
  deletePromotionSchema,
  getPromotionByIdSchema,
  getPromotionsSchema,
  updatePromotionSchema,
  validatePromotionByCodeSchema,
} from "../validators/promotion.validation";

const router = Router();

router.use(authenticate, validateTenant);

router.get("/", validate(getPromotionsSchema), getPromotions);
router.get(
  "/validate/code",
  validate(validatePromotionByCodeSchema),
  validatePromotionByCode,
);
router.get("/:id", validate(getPromotionByIdSchema), getPromotionById);
router.post(
  "/",
  authorize("ADMIN", "MANAGER"),
  validate(createPromotionSchema),
  createPromotion,
);
router.patch(
  "/:id",
  authorize("ADMIN", "MANAGER"),
  validate(updatePromotionSchema),
  updatePromotion,
);
router.delete(
  "/:id",
  authorize("ADMIN", "MANAGER"),
  validate(deletePromotionSchema),
  deletePromotion,
);

export default router;

