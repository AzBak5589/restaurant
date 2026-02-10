import { Router } from 'express';
import {
  getInventoryItems,
  getInventoryItemById,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  getMovements,
  createMovement,
  transferStock,
  getLowStockAlerts,
  getStockValuation,
} from '../controllers/inventory.controller';
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

router.use(authenticate);
router.use(validateTenant);

// ─── Inventory Items ──────────────────────────────────────────
router.get('/items', getInventoryItems);
router.get('/items/:id', getInventoryItemById);
router.post('/items', authorize('ADMIN', 'MANAGER'), createInventoryItem);
router.patch('/items/:id', authorize('ADMIN', 'MANAGER'), updateInventoryItem);
router.delete('/items/:id', authorize('ADMIN', 'MANAGER'), deleteInventoryItem);

// ─── Stock Movements ──────────────────────────────────────────
router.get('/movements', getMovements);
router.post('/movements', authorize('ADMIN', 'MANAGER'), createMovement);
router.post('/transfers', authorize('ADMIN', 'MANAGER'), transferStock);

// ─── Alerts & Valuation ──────────────────────────────────────
router.get('/alerts/low-stock', getLowStockAlerts);
router.get('/valuation', getStockValuation);

// ─── Recipes ──────────────────────────────────────────────────
router.get('/recipes', getRecipes);
router.get('/recipes/cost-analysis', getMenuItemCostAnalysis);
router.get('/recipes/menu-item/:menuItemId', getRecipeByMenuItem);
router.post('/recipes', authorize('ADMIN', 'MANAGER', 'CHEF'), createRecipe);
router.patch('/recipes/:id', authorize('ADMIN', 'MANAGER', 'CHEF'), updateRecipe);
router.delete('/recipes/:id', authorize('ADMIN', 'MANAGER'), deleteRecipe);

export default router;
