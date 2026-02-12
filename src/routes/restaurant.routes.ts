import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { validateTenant } from '../middlewares/tenant.middleware';
import {
  getCurrentRestaurant,
  updateCurrentRestaurant,
} from '../controllers/restaurant.controller';

const router = Router();

router.use(authenticate, validateTenant);

router.get('/current', getCurrentRestaurant);
router.patch('/current', authorize('SUPER_ADMIN', 'ADMIN'), updateCurrentRestaurant);

export default router;
