import { Router } from 'express';
import {
  createSheetProduction,
  deleteSheetProduction,
  getSheetProduction,
  listSheetProductions,
  updateSheetProduction,
} from '../controllers/sheetProductionController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireAnyPermission } from '../middleware/rbacMiddleware.js';
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
  requireAnyPermission([PERMISSIONS.canViewSheetProduction, PERMISSIONS.canViewProduction]),
  listSheetProductionValidator,
  validateRequest,
  listSheetProductions,
);

router.get(
  '/:id',
  requireAnyPermission([PERMISSIONS.canViewSheetProduction, PERMISSIONS.canViewProduction]),
  getSheetProductionValidator,
  validateRequest,
  getSheetProduction,
);

router.post(
  '/',
  requireAnyPermission([PERMISSIONS.canCreateSheetProduction, PERMISSIONS.canCreateProduction]),
  createSheetProductionValidator,
  validateRequest,
  createSheetProduction,
);

router.put(
  '/:id',
  requireAnyPermission([PERMISSIONS.canUpdateSheetProduction, PERMISSIONS.canEditProduction]),
  updateSheetProductionValidator,
  validateRequest,
  updateSheetProduction,
);

router.delete(
  '/:id',
  requireAnyPermission([PERMISSIONS.canDeleteSheetProduction, PERMISSIONS.canDeleteProduction]),
  deleteSheetProductionValidator,
  validateRequest,
  deleteSheetProduction,
);

export default router;
