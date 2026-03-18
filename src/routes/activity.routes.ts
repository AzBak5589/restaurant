import { Router } from 'express';
import { getRecentActivity } from '../controllers/activity.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validateTenant } from '../middlewares/tenant.middleware';
import { validate } from '../middlewares/validation.middleware';
import { getRecentActivitySchema } from '../validators/activity.validation';

const router = Router();

router.use(authenticate, validateTenant);

router.get('/', validate(getRecentActivitySchema), getRecentActivity);

export default router;
