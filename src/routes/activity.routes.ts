import { Router } from 'express';
import { getRecentActivity } from '../controllers/activity.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validateTenant } from '../middlewares/tenant.middleware';

const router = Router();

router.use(authenticate, validateTenant);

router.get('/', getRecentActivity);

export default router;
