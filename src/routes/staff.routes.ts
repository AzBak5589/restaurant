import { Router } from "express";
import {
  getStaff,
  getStaffById,
  createStaffMember,
  updateStaffMember,
  toggleStaffActive,
  getShifts,
  createShift,
  updateShift,
  deleteShift,
  clockIn,
  clockOut,
  getClockHistory,
  getStaffPerformance,
} from "../controllers/staff.controller";
import { authenticate, authorize } from "../middlewares/auth.middleware";
import { validateTenant } from "../middlewares/tenant.middleware";

const router = Router();

router.use(authenticate);
router.use(validateTenant);

// ─── Self Profile ─────────────────────────────────────────────
router.patch("/me", async (req, res) => {
  const { firstName, lastName, email, phone } = req.body;
  const prisma = (await import("../config/database")).default;
  try {
    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        ...(firstName !== undefined && { firstName }),
        ...(lastName !== undefined && { lastName }),
        ...(email !== undefined && { email }),
        ...(phone !== undefined && { phone }),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
      },
    });
    res.json(user);
  } catch {
    res.status(500).json({ error: "Failed to update profile" });
  }
});

// ─── Staff Members ────────────────────────────────────────────
router.get("/", authorize("ADMIN", "MANAGER"), getStaff);
router.get("/performance", authorize("ADMIN", "MANAGER"), getStaffPerformance);
router.get("/:id", authorize("ADMIN", "MANAGER"), getStaffById);
router.post("/", authorize("ADMIN", "MANAGER"), createStaffMember);
router.patch("/:id", authorize("ADMIN", "MANAGER"), updateStaffMember);
router.patch("/:id/toggle-active", authorize("ADMIN"), toggleStaffActive);

// ─── Shifts ───────────────────────────────────────────────────
router.get("/shifts/all", authorize("ADMIN", "MANAGER"), getShifts);
router.post("/shifts", authorize("ADMIN", "MANAGER"), createShift);
router.patch("/shifts/:id", authorize("ADMIN", "MANAGER"), updateShift);
router.delete("/shifts/:id", authorize("ADMIN", "MANAGER"), deleteShift);

// ─── Clock In/Out ─────────────────────────────────────────────
router.post("/clock/in", clockIn);
router.post("/clock/out", clockOut);
router.get("/clock/history", authorize("ADMIN", "MANAGER"), getClockHistory);

export default router;
