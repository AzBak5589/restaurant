import { Router } from 'express';
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getMenuItems,
  getMenuItemById,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  toggleAvailability,
} from '../controllers/menu.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { validateTenant } from '../middlewares/tenant.middleware';

const router = Router();

router.use(authenticate);
router.use(validateTenant);

router.get('/categories', getCategories);
router.post('/categories', authorize('ADMIN', 'MANAGER'), createCategory);
router.patch('/categories/:id', authorize('ADMIN', 'MANAGER'), updateCategory);
router.delete('/categories/:id', authorize('ADMIN', 'MANAGER'), deleteCategory);

router.get('/items', getMenuItems);
router.get('/items/:id', getMenuItemById);
router.post('/items', authorize('ADMIN', 'MANAGER'), createMenuItem);
router.patch('/items/:id', authorize('ADMIN', 'MANAGER'), updateMenuItem);
router.delete('/items/:id', authorize('ADMIN', 'MANAGER'), deleteMenuItem);
router.patch('/items/:id/availability', authorize('ADMIN', 'MANAGER', 'CHEF'), toggleAvailability);

export default router;
