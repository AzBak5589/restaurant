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
import { validate } from '../middlewares/validation.middleware';
import {
  getMenuItemCostAnalysisSchema,
  getRecipeByMenuItemSchema,
  getRecipesSchema,
} from '../validators/recipe.validation';

const router = Router();

router.use(authenticate, validateTenant);

router.get('/', validate(getRecipesSchema), getRecipes);
router.get('/cost-analysis', validate(getMenuItemCostAnalysisSchema), getMenuItemCostAnalysis);
router.get('/menu-item/:menuItemId', validate(getRecipeByMenuItemSchema), getRecipeByMenuItem);
router.post('/', authorize('ADMIN', 'MANAGER'), createRecipe);
router.put('/:id', authorize('ADMIN', 'MANAGER'), updateRecipe);
router.delete('/:id', authorize('ADMIN', 'MANAGER'), deleteRecipe);

export default router;
