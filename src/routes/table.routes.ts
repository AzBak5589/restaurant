import { Router } from 'express';
import {
  getTables,
  getTableById,
  createTable,
  updateTable,
  deleteTable,
  updateTableStatus,
  mergeTable,
  getFloorPlan,
} from '../controllers/table.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { validateTenant } from '../middlewares/tenant.middleware';

const router = Router();

router.use(authenticate);
router.use(validateTenant);

router.get('/', getTables);
router.get('/floor-plan', getFloorPlan);
router.get('/:id', getTableById);
router.post('/', authorize('ADMIN', 'MANAGER'), createTable);
router.patch('/:id', authorize('ADMIN', 'MANAGER'), updateTable);
router.delete('/:id', authorize('ADMIN', 'MANAGER'), deleteTable);
router.patch('/:id/status', authorize('ADMIN', 'MANAGER', 'WAITER'), updateTableStatus);
router.post('/merge', authorize('ADMIN', 'MANAGER', 'WAITER'), mergeTable);

export default router;
