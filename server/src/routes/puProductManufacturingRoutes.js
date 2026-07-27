import { Router } from 'express';
import {
  createPUProductManufacturing,
  deletePUProductManufacturing,
  getPUProductManufacturing,
  listPUProductManufacturing,
  updatePUProductManufacturing,
} from '../controllers/puProductManufacturingController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireAnyPermission } from '../middleware/rbacMiddleware.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { PERMISSIONS } from '../utils/permissions.js';
import {
  createPUProductManufacturingValidator,
  deletePUProductManufacturingValidator,
  getPUProductManufacturingValidator,
  listPUProductManufacturingValidator,
  updatePUProductManufacturingValidator,
} from '../validators/puProductManufacturingValidators.js';

const router = Router();

router.use(requireAuth);

router.get(
  '/',
  requireAnyPermission([PERMISSIONS.canViewProduction, PERMISSIONS.canViewStock]),
  listPUProductManufacturingValidator,
  validateRequest,
  listPUProductManufacturing,
);

router.get(
  '/:id',
  requireAnyPermission([PERMISSIONS.canViewProduction, PERMISSIONS.canViewStock]),
  getPUProductManufacturingValidator,
  validateRequest,
  getPUProductManufacturing,
);

router.post(
  '/',
  requireAnyPermission([PERMISSIONS.canCreateProduction, PERMISSIONS.canManageStock]),
  createPUProductManufacturingValidator,
  validateRequest,
  createPUProductManufacturing,
);

router.put(
  '/:id',
  requireAnyPermission([PERMISSIONS.canEditProduction, PERMISSIONS.canManageStock]),
  updatePUProductManufacturingValidator,
  validateRequest,
  updatePUProductManufacturing,
);

router.delete(
  '/:id',
  requireAnyPermission([PERMISSIONS.canDeleteProduction, PERMISSIONS.canManageStock]),
  deletePUProductManufacturingValidator,
  validateRequest,
  deletePUProductManufacturing,
);

export default router;
