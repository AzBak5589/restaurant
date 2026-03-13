import { Router } from 'express';
import {
  getReservations,
  getReservationById,
  createReservation,
  updateReservation,
  updateReservationStatus,
  cancelReservation,
  getAvailableTables,
  getTodayReservations,
} from '../controllers/reservation.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { validateTenant } from '../middlewares/tenant.middleware';
import { validate } from '../middlewares/validation.middleware';
import {
  getAvailableTablesSchema,
  getReservationByIdSchema,
  getReservationsSchema,
  getTodayReservationsSchema,
} from '../validators/reservation.validation';

const router = Router();

router.use(authenticate);
router.use(validateTenant);

router.get('/', validate(getReservationsSchema), getReservations);
router.get('/today', validate(getTodayReservationsSchema), getTodayReservations);
router.get('/available-tables', validate(getAvailableTablesSchema), getAvailableTables);
router.get('/:id', validate(getReservationByIdSchema), getReservationById);
router.post('/', authorize('ADMIN', 'MANAGER', 'WAITER'), createReservation);
router.patch('/:id', authorize('ADMIN', 'MANAGER'), updateReservation);
router.patch('/:id/status', authorize('ADMIN', 'MANAGER', 'WAITER'), updateReservationStatus);
router.delete('/:id', authorize('ADMIN', 'MANAGER'), cancelReservation);

export default router;
