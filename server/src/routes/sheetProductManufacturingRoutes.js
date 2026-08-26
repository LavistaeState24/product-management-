import { Router } from 'express';
import {
  createSheetProductManufacturing,
  getSheetProductManufacturing,
  listSheetProductManufacturing,
} from '../controllers/sheetProductManufacturingController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/rbacMiddleware.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { PERMISSIONS } from '../utils/permissions.js';
import {
  createSheetProductManufacturingValidator,
  getSheetProductManufacturingValidator,
  listSheetProductManufacturingValidator,
} from '../validators/sheetProductManufacturingValidators.js';

const router = Router();

router.use(requireAuth);

router.get(
  '/',
  requirePermission(PERMISSIONS.canViewSheetProduct),
  listSheetProductManufacturingValidator,
  validateRequest,
  listSheetProductManufacturing,
);

router.get(
  '/:id',
  requirePermission(PERMISSIONS.canViewSheetProduct),
  getSheetProductManufacturingValidator,
  validateRequest,
  getSheetProductManufacturing,
);

router.post(
  '/',
  requirePermission(PERMISSIONS.canCreateSheetProduct),
  createSheetProductManufacturingValidator,
  validateRequest,
  createSheetProductManufacturing,
);

export default router;
