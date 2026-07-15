import { Router } from 'express';
import {
  getPUProductStock,
  listPUProductStock,
  searchPUProductStock,
} from '../controllers/puProductManufacturingController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/rbacMiddleware.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { PERMISSIONS } from '../utils/permissions.js';
import {
  getPUProductStockValidator,
  listPUProductStockValidator,
  searchPUProductStockValidator,
} from '../validators/puProductManufacturingValidators.js';

const router = Router();

router.use(requireAuth);

router.get(
  '/search',
  requirePermission(PERMISSIONS.canViewStock),
  searchPUProductStockValidator,
  validateRequest,
  searchPUProductStock,
);

router.get(
  '/',
  requirePermission(PERMISSIONS.canViewStock),
  listPUProductStockValidator,
  validateRequest,
  listPUProductStock,
);

router.get(
  '/:id',
  requirePermission(PERMISSIONS.canViewStock),
  getPUProductStockValidator,
  validateRequest,
  getPUProductStock,
);

export default router;
