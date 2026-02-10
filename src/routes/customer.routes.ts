import { Router } from 'express';
import {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  addLoyaltyPoints,
  redeemLoyaltyPoints,
  getLoyaltyBalance,
  getLoyaltyTransactions,
} from '../controllers/customer.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { validateTenant } from '../middlewares/tenant.middleware';

const router = Router();

router.use(authenticate);
router.use(validateTenant);

// ─── Customers ────────────────────────────────────────────────
router.get('/', getCustomers);
router.get('/:id', getCustomerById);
router.post('/', authorize('ADMIN', 'MANAGER', 'WAITER', 'CASHIER'), createCustomer);
router.patch('/:id', authorize('ADMIN', 'MANAGER'), updateCustomer);

// ─── Loyalty ──────────────────────────────────────────────────
router.post('/loyalty/earn', authorize('ADMIN', 'MANAGER', 'CASHIER'), addLoyaltyPoints);
router.post('/loyalty/redeem', authorize('ADMIN', 'MANAGER', 'CASHIER'), redeemLoyaltyPoints);
router.get('/:customerId/loyalty', getLoyaltyBalance);
router.get('/:customerId/loyalty/transactions', getLoyaltyTransactions);

export default router;
