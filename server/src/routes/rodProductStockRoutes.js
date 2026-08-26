import { Router } from 'express';
import {
  getRodProductStock,
  listRodProductStock,
  searchRodProductStock,
} from '../controllers/rodProductManufacturingController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/rbacMiddleware.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { PERMISSIONS } from '../utils/permissions.js';
import {
  getRodProductStockValidator,
  listRodProductStockValidator,
  searchRodProductStockValidator,
} from '../validators/rodProductManufacturingValidators.js';

const router = Router();

router.use(requireAuth);

router.get(
  '/search',
  requirePermission(PERMISSIONS.canViewRodProductStock),
  searchRodProductStockValidator,
  validateRequest,
  searchRodProductStock,
);

router.get(
  '/',
  requirePermission(PERMISSIONS.canViewRodProductStock),
  listRodProductStockValidator,
  validateRequest,
  listRodProductStock,
);

router.get(
  '/:id',
  requirePermission(PERMISSIONS.canViewRodProductStock),
  getRodProductStockValidator,
  validateRequest,
  getRodProductStock,
);

export default router;
