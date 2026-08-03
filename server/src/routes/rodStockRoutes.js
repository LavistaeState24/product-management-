import { Router } from 'express';
import {
  listRodStocks,
  searchRodStocks,
} from '../controllers/rodProductionController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/rbacMiddleware.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { PERMISSIONS } from '../utils/permissions.js';
import {
  listRodStockValidator,
  searchRodStockValidator,
} from '../validators/rodProductionValidators.js';

const router = Router();

router.use(requireAuth);

router.get(
  '/search',
  requirePermission(PERMISSIONS.canViewStock),
  searchRodStockValidator,
  validateRequest,
  searchRodStocks,
);

router.get(
  '/',
  requirePermission(PERMISSIONS.canViewStock),
  listRodStockValidator,
  validateRequest,
  listRodStocks,
);

export default router;