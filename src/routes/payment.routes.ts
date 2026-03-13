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
import { validate } from '../middlewares/validation.middleware';
import {
  closeCashSessionSchema,
  generateZReportSchema,
  getCashSessionHistorySchema,
  getOrderPaymentsSchema,
  getReceiptDataSchema,
  openCashSessionSchema,
  processPaymentSchema,
  refundPaymentSchema,
  splitPaymentSchema,
} from '../validators/payment.validation';

const router = Router();

router.use(authenticate);
router.use(validateTenant);

// ─── Payments ─────────────────────────────────────────────────
router.post(
  '/',
  authorize('ADMIN', 'MANAGER', 'CASHIER'),
  validate(processPaymentSchema),
  processPayment
);
router.post(
  '/split',
  authorize('ADMIN', 'MANAGER', 'CASHIER'),
  validate(splitPaymentSchema),
  splitPayment
);
router.get('/order/:orderId', validate(getOrderPaymentsSchema), getOrderPayments);
router.post(
  '/refund/:paymentId',
  authorize('ADMIN', 'MANAGER'),
  validate(refundPaymentSchema),
  refundPayment
);
router.get('/receipt/:orderId', validate(getReceiptDataSchema), getReceiptData);

// ─── Cash Sessions ────────────────────────────────────────────
router.post(
  '/cash/open',
  authorize('ADMIN', 'MANAGER', 'CASHIER'),
  validate(openCashSessionSchema),
  openCashSession
);
router.post(
  '/cash/close/:sessionId',
  authorize('ADMIN', 'MANAGER', 'CASHIER'),
  validate(closeCashSessionSchema),
  closeCashSession
);
router.get('/cash/active', getActiveSessions);
router.get('/cash/history', validate(getCashSessionHistorySchema), getCashSessionHistory);

// ─── Z Report ─────────────────────────────────────────────────
router.get(
  '/z-report',
  authorize('ADMIN', 'MANAGER'),
  validate(generateZReportSchema),
  generateZReport
);

export default router;
