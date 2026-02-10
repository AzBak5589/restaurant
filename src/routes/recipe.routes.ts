import { Router } from 'express';
import {
  getRecipes,
  getRecipeByMenuItem,
  createRecipe,
  updateRecipe,
  deleteRecipe,
  getMenuItemCostAnalysis,
} from '../controllers/recipe.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { validateTenant } from '../middlewares/tenant.middleware';

const router = Router();

router.use(authenticate, validateTenant);

router.get('/', getRecipes);
router.get('/cost-analysis', getMenuItemCostAnalysis);
router.get('/menu-item/:menuItemId', getRecipeByMenuItem);
router.post('/', authorize('ADMIN', 'MANAGER'), createRecipe);
router.put('/:id', authorize('ADMIN', 'MANAGER'), updateRecipe);
router.delete('/:id', authorize('ADMIN', 'MANAGER'), deleteRecipe);

export default router;
