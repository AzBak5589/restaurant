import { Router } from 'express';
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
} from '../controllers/staff.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { validateTenant } from '../middlewares/tenant.middleware';

const router = Router();

router.use(authenticate);
router.use(validateTenant);

// ─── Staff Members ────────────────────────────────────────────
router.get('/', authorize('ADMIN', 'MANAGER'), getStaff);
router.get('/performance', authorize('ADMIN', 'MANAGER'), getStaffPerformance);
router.get('/:id', authorize('ADMIN', 'MANAGER'), getStaffById);
router.post('/', authorize('ADMIN', 'MANAGER'), createStaffMember);
router.patch('/:id', authorize('ADMIN', 'MANAGER'), updateStaffMember);
router.patch('/:id/toggle-active', authorize('ADMIN'), toggleStaffActive);

// ─── Shifts ───────────────────────────────────────────────────
router.get('/shifts/all', authorize('ADMIN', 'MANAGER'), getShifts);
router.post('/shifts', authorize('ADMIN', 'MANAGER'), createShift);
router.patch('/shifts/:id', authorize('ADMIN', 'MANAGER'), updateShift);
router.delete('/shifts/:id', authorize('ADMIN', 'MANAGER'), deleteShift);

// ─── Clock In/Out ─────────────────────────────────────────────
router.post('/clock/in', clockIn);
router.post('/clock/out', clockOut);
router.get('/clock/history', authorize('ADMIN', 'MANAGER'), getClockHistory);

export default router;
