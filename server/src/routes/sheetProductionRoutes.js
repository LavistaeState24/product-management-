import { Router } from 'express';
import {
  createSheetProduction,
  deleteSheetProduction,
  getSheetProduction,
  listSheetProductions,
  updateSheetProduction,
} from '../controllers/sheetProductionController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/rbacMiddleware.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { PERMISSIONS } from '../utils/permissions.js';
import {
  createSheetProductionValidator,
  deleteSheetProductionValidator,
  getSheetProductionValidator,
  listSheetProductionValidator,
  updateSheetProductionValidator,
} from '../validators/sheetProductionValidators.js';

const router = Router();

router.use(requireAuth);

router.get(
  '/',
  requirePermission(PERMISSIONS.canViewSheetProduction),
  listSheetProductionValidator,
  validateRequest,
  listSheetProductions,
);

router.get(
  '/:id',
  requirePermission(PERMISSIONS.canViewSheetProduction),
  getSheetProductionValidator,
  validateRequest,
  getSheetProduction,
);

router.post(
  '/',
  requirePermission(PERMISSIONS.canCreateSheetProduction),
  createSheetProductionValidator,
  validateRequest,
  createSheetProduction,
);

router.put(
  '/:id',
  requirePermission(PERMISSIONS.canUpdateSheetProduction),
  updateSheetProductionValidator,
  validateRequest,
  updateSheetProduction,
);

router.delete(
  '/:id',
  requirePermission(PERMISSIONS.canDeleteSheetProduction),
  deleteSheetProductionValidator,
  validateRequest,
  deleteSheetProduction,
);

export default router;