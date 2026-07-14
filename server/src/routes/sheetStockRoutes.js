import { Router } from 'express';
import {
  listSheetStocks,
  searchSheetStocks,
} from '../controllers/sheetProductionController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/rbacMiddleware.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { PERMISSIONS } from '../utils/permissions.js';
import {
  listSheetStockValidator,
  searchSheetStockValidator,
} from '../validators/sheetProductionValidators.js';

const router = Router();

router.use(requireAuth);

router.get(
  '/search',
  requirePermission(PERMISSIONS.canViewSheetStock),
  searchSheetStockValidator,
  validateRequest,
  searchSheetStocks,
);

router.get(
  '/',
  requirePermission(PERMISSIONS.canViewSheetStock),
  listSheetStockValidator,
  validateRequest,
  listSheetStocks,
);

export default router;
