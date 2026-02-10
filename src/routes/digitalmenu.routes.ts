import { Router } from 'express';
import {
  getPublicMenu,
  generateTableQRCode,
  generateAllTableQRCodes,
  checkItemAvailability,
} from '../controllers/digitalmenu.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { validateTenant } from '../middlewares/tenant.middleware';

const router = Router();

// ─── Public endpoints (no auth required) ──────────────────────
router.get('/public/:slug', getPublicMenu);
router.get('/public/:slug/item/:itemId', checkItemAvailability);

// ─── Protected endpoints (auth required) ──────────────────────
router.get(
  '/qr/:tableId',
  authenticate,
  validateTenant,
  authorize('ADMIN', 'MANAGER'),
  generateTableQRCode
);

router.get(
  '/qr',
  authenticate,
  validateTenant,
  authorize('ADMIN', 'MANAGER'),
  generateAllTableQRCodes
);

export default router;
