import { Router } from 'express';
import { listFinishedGoods } from '../controllers/finishedGoodsStockController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/rbacMiddleware.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { PERMISSIONS } from '../utils/permissions.js';
import { listFinishedGoodsStockValidator } from '../validators/finishedGoodsStockValidators.js';

const router = Router();

router.use(requireAuth);

router.get(
  '/',
  requirePermission(PERMISSIONS.canViewStock),
  listFinishedGoodsStockValidator,
  validateRequest,
  listFinishedGoods,
);

export default router;
