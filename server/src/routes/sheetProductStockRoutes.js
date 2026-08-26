import { Router } from 'express';
import {
  getSheetProductStock,
  listSheetProductStock,
  searchSheetProductStock,
} from '../controllers/sheetProductManufacturingController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/rbacMiddleware.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { PERMISSIONS } from '../utils/permissions.js';
import {
  getSheetProductStockValidator,
  listSheetProductStockValidator,
  searchSheetProductStockValidator,
} from '../validators/sheetProductManufacturingValidators.js';

const router = Router();

router.use(requireAuth);

router.get(
  '/search',
  requirePermission(PERMISSIONS.canViewSheetProductStock),
  searchSheetProductStockValidator,
  validateRequest,
  searchSheetProductStock,
);

router.get(
  '/',
  requirePermission(PERMISSIONS.canViewSheetProductStock),
  listSheetProductStockValidator,
  validateRequest,
  listSheetProductStock,
);

router.get(
  '/:id',
  requirePermission(PERMISSIONS.canViewSheetProductStock),
  getSheetProductStockValidator,
  validateRequest,
  getSheetProductStock,
);

export default router;
