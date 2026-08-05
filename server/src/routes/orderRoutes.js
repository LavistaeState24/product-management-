import { Router } from 'express';
import {
  acceptOrderController,
  createOrderController,
  getOrderController,
  getProductionOrderController,
  listOrdersController,
  listProductionActiveOrdersController,
  listProductionOrdersController,
  listProductionPendingOrdersController,
} from '../controllers/orderController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/rbacMiddleware.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { PERMISSIONS } from '../utils/permissions.js';
import {
  acceptOrderValidator,
  createOrderValidator,
  orderIdParamValidator,
} from '../validators/orderValidators.js';

const router = Router();

router.use(requireAuth);

router.post(
  '/',
  requirePermission(PERMISSIONS.canCreateOrder),
  createOrderValidator,
  validateRequest,
  createOrderController,
);

router.get(
  '/',
  requirePermission(PERMISSIONS.canViewOrderClientDetails),
  listOrdersController,
);

router.get(
  '/production/pending',
  requirePermission(PERMISSIONS.canViewOrders),
  listProductionPendingOrdersController,
);

router.get(
  '/production/active',
  requirePermission(PERMISSIONS.canViewOrders),
  listProductionActiveOrdersController,
);

router.get(
  '/production/all',
  requirePermission(PERMISSIONS.canViewOrders),
  listProductionOrdersController,
);

router.get(
  '/production/:orderId',
  requirePermission(PERMISSIONS.canViewOrders),
  orderIdParamValidator,
  validateRequest,
  getProductionOrderController,
);

router.get(
  '/:orderId',
  requirePermission(PERMISSIONS.canViewOrderClientDetails),
  orderIdParamValidator,
  validateRequest,
  getOrderController,
);

router.patch(
  '/:orderId/accept',
  requirePermission(PERMISSIONS.canAcceptOrder),
  acceptOrderValidator,
  validateRequest,
  acceptOrderController,
);

export default router;