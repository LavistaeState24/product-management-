import { Router } from 'express';
import {
  createPUProductManufacturing,
  deletePUProductManufacturing,
  getPUProductManufacturing,
  listPUProductManufacturing,
  updatePUProductManufacturing,
} from '../controllers/puProductManufacturingController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/rbacMiddleware.js';
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
  requirePermission(PERMISSIONS.canViewStock),
  listPUProductManufacturingValidator,
  validateRequest,
  listPUProductManufacturing,
);

router.get(
  '/:id',
  requirePermission(PERMISSIONS.canViewStock),
  getPUProductManufacturingValidator,
  validateRequest,
  getPUProductManufacturing,
);

router.post(
  '/',
  requirePermission(PERMISSIONS.canManageStock),
  createPUProductManufacturingValidator,
  validateRequest,
  createPUProductManufacturing,
);

router.put(
  '/:id',
  requirePermission(PERMISSIONS.canManageStock),
  updatePUProductManufacturingValidator,
  validateRequest,
  updatePUProductManufacturing,
);

router.delete(
  '/:id',
  requirePermission(PERMISSIONS.canManageStock),
  deletePUProductManufacturingValidator,
  validateRequest,
  deletePUProductManufacturing,
);

export default router;
