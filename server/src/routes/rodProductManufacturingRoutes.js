import { Router } from 'express';
import {
  createRodProductManufacturing,
  getRodProductManufacturing,
  listRodProductManufacturing,
} from '../controllers/rodProductManufacturingController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/rbacMiddleware.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { PERMISSIONS } from '../utils/permissions.js';
import {
  createRodProductManufacturingValidator,
  getRodProductManufacturingValidator,
  listRodProductManufacturingValidator,
} from '../validators/rodProductManufacturingValidators.js';

const router = Router();

router.use(requireAuth);

router.get(
  '/',
  requirePermission(PERMISSIONS.canViewRodProduct),
  listRodProductManufacturingValidator,
  validateRequest,
  listRodProductManufacturing,
);

router.get(
  '/:id',
  requirePermission(PERMISSIONS.canViewRodProduct),
  getRodProductManufacturingValidator,
  validateRequest,
  getRodProductManufacturing,
);

router.post(
  '/',
  requirePermission(PERMISSIONS.canCreateRodProduct),
  createRodProductManufacturingValidator,
  validateRequest,
  createRodProductManufacturing,
);

export default router;
