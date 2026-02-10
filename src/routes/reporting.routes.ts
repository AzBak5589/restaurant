import { Router } from 'express';
import {
  getDashboard,
  getRevenueReport,
  getSalesByCategory,
  getTopSellingItems,
  getTableTurnoverReport,
} from '../controllers/reporting.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { validateTenant } from '../middlewares/tenant.middleware';

const router = Router();

router.use(authenticate);
router.use(validateTenant);

router.get('/dashboard', getDashboard);
router.get('/revenue', authorize('ADMIN', 'MANAGER'), getRevenueReport);
router.get('/sales-by-category', authorize('ADMIN', 'MANAGER'), getSalesByCategory);
router.get('/top-items', authorize('ADMIN', 'MANAGER'), getTopSellingItems);
router.get('/table-turnover', authorize('ADMIN', 'MANAGER'), getTableTurnoverReport);

export default router;
