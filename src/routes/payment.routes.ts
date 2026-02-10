import { Router } from 'express';
import {
  processPayment,
  splitPayment,
  getOrderPayments,
  refundPayment,
  openCashSession,
  closeCashSession,
  getActiveSessions,
  getCashSessionHistory,
  generateZReport,
  getReceiptData,
} from '../controllers/payment.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { validateTenant } from '../middlewares/tenant.middleware';

const router = Router();

router.use(authenticate);
router.use(validateTenant);

// ─── Payments ─────────────────────────────────────────────────
router.post('/', authorize('ADMIN', 'MANAGER', 'CASHIER'), processPayment);
router.post('/split', authorize('ADMIN', 'MANAGER', 'CASHIER'), splitPayment);
router.get('/order/:orderId', getOrderPayments);
router.post('/refund/:paymentId', authorize('ADMIN', 'MANAGER'), refundPayment);
router.get('/receipt/:orderId', getReceiptData);

// ─── Cash Sessions ────────────────────────────────────────────
router.post('/cash/open', authorize('ADMIN', 'MANAGER', 'CASHIER'), openCashSession);
router.post('/cash/close/:sessionId', authorize('ADMIN', 'MANAGER', 'CASHIER'), closeCashSession);
router.get('/cash/active', getActiveSessions);
router.get('/cash/history', getCashSessionHistory);

// ─── Z Report ─────────────────────────────────────────────────
router.get('/z-report', authorize('ADMIN', 'MANAGER'), generateZReport);

export default router;
