import { Router } from 'express';
import {
  getDashboard,
  getRevenueReport,
  getSalesByCategory,
  getTopSellingItems,
  getTableTurnoverReport,
  getPromotionPerformance,
} from '../controllers/reporting.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { validateTenant } from '../middlewares/tenant.middleware';
import { validate } from '../middlewares/validation.middleware';
import {
  revenueReportSchema,
  salesByCategorySchema,
  tableTurnoverSchema,
  topSellingItemsSchema,
  promotionPerformanceSchema,
} from '../validators/reporting.validation';

const router = Router();

router.use(authenticate);
router.use(validateTenant);

router.get('/dashboard', getDashboard);
router.get('/revenue', authorize('ADMIN', 'MANAGER'), validate(revenueReportSchema), getRevenueReport);
router.get(
  '/sales-by-category',
  authorize('ADMIN', 'MANAGER'),
  validate(salesByCategorySchema),
  getSalesByCategory,
);
router.get('/top-items', authorize('ADMIN', 'MANAGER'), validate(topSellingItemsSchema), getTopSellingItems);
router.get('/table-turnover', authorize('ADMIN', 'MANAGER'), validate(tableTurnoverSchema), getTableTurnoverReport);
router.get(
  '/promotion-performance',
  authorize('ADMIN', 'MANAGER'),
  validate(promotionPerformanceSchema),
  getPromotionPerformance,
);

export default router;
