import { Router } from 'express';
import {
  createRodProduction,
  listRodProductions,
} from '../controllers/rodProductionController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/rbacMiddleware.js';
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
  requirePermission(PERMISSIONS.canViewStock),
  listRodProductionValidator,
  validateRequest,
  listRodProductions,
);

router.post(
  '/',
  requirePermission(PERMISSIONS.canManageStock),
  createRodProductionValidator,
  validateRequest,
  createRodProduction,
);

export default router;
