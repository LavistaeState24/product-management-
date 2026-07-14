import { Router } from 'express';
import {
  getSheetStock,
  listSheetStocks,
  searchSheetStocks,
} from '../controllers/sheetProductionController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/rbacMiddleware.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { PERMISSIONS } from '../utils/permissions.js';
import {
  getSheetStockValidator,
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

router.get(
  '/:id',
  requirePermission(PERMISSIONS.canViewSheetStock),
  getSheetStockValidator,
  validateRequest,
  getSheetStock,
);

export default router;
