import { Router } from 'express';
import {
  createRodProduction,
  listRodProductions,
} from '../controllers/rodProductionController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireAnyPermission } from '../middleware/rbacMiddleware.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { PERMISSIONS } from '../utils/permissions.js';
import {
  createRodProductionValidator,
  listRodProductionValidator,
} from '../validators/rodProductionValidators.js';

const router = Router();

router.use(requireAuth);

router.get(
  '/',
  requireAnyPermission([PERMISSIONS.canViewProduction, PERMISSIONS.canViewStock]),
  listRodProductionValidator,
  validateRequest,
  listRodProductions,
);

router.post(
  '/',
  requireAnyPermission([PERMISSIONS.canCreateProduction, PERMISSIONS.canManageStock]),
  createRodProductionValidator,
  validateRequest,
  createRodProduction,
);

export default router;
