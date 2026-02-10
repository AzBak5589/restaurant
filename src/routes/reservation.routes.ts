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

const router = Router();

router.use(authenticate);
router.use(validateTenant);

router.get('/', getReservations);
router.get('/today', getTodayReservations);
router.get('/available-tables', getAvailableTables);
router.get('/:id', getReservationById);
router.post('/', authorize('ADMIN', 'MANAGER', 'WAITER'), createReservation);
router.patch('/:id', authorize('ADMIN', 'MANAGER'), updateReservation);
router.patch('/:id/status', authorize('ADMIN', 'MANAGER', 'WAITER'), updateReservationStatus);
router.delete('/:id', authorize('ADMIN', 'MANAGER'), cancelReservation);

export default router;
