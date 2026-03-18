import { Router } from "express";
import {
  getExpenses,
  getExpenseById,
  createExpense,
  updateExpense,
  deleteExpense,
  getExpenseSummary,
} from "../controllers/expense.controller";
import { authenticate, authorize } from "../middlewares/auth.middleware";
import { validateTenant } from "../middlewares/tenant.middleware";
import { validate } from "../middlewares/validation.middleware";
import {
  getExpenseByIdSchema,
  getExpensesSchema,
  getExpenseSummarySchema,
} from "../validators/expense.validation";

const router = Router();

router.use(authenticate, validateTenant);

router.get("/", validate(getExpensesSchema), getExpenses);
router.get(
  "/summary",
  authorize("ADMIN", "MANAGER"),
  validate(getExpenseSummarySchema),
  getExpenseSummary,
);
router.get("/:id", validate(getExpenseByIdSchema), getExpenseById);
router.post("/", authorize("ADMIN", "MANAGER"), createExpense);
router.patch("/:id", authorize("ADMIN", "MANAGER"), updateExpense);
router.delete("/:id", authorize("ADMIN", "MANAGER"), deleteExpense);

export default router;
