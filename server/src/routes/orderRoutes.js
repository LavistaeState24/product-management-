import { Router } from 'express';
import {
  acceptOrderController,
  addProductionProgressController,
  assignOrderItemNumbersController,
  confirmNotificationForClientController,
  createOrderController,
  dispatchOrderController,
  getOrderController,
  getProductionOrderController,
  listClientMessageLogsController,
  listOrdersController,
  listOrderNotificationsController,
  listProductionActiveOrdersController,
  listProductionOrdersController,
  listProductionPendingOrdersController,
  listReadyForDispatchOrdersController,
  markNotificationSeenController,
  markProductionReadyController,
  openMessageInWhatsAppController,
  prepareAcceptedClientMessageController,
} from '../controllers/orderController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { uploadOrderProductReference } from '../middleware/uploadMiddleware.js';
import { requirePermission } from '../middleware/rbacMiddleware.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { createHttpError } from '../utils/httpError.js';
import { PERMISSIONS } from '../utils/permissions.js';
import {
  acceptOrderValidator,
  assignOrderItemNumbersValidator,
  createOrderValidator,
  markOrderReadyValidator,
  messageLogIdParamValidator,
  notificationIdParamValidator,
  orderIdParamValidator,
  progressOrderValidator,
} from '../validators/orderValidators.js';

const router = Router();

router.use(requireAuth);

function parseCreateOrderBody(req, res, next) {
  if (typeof req.body.items !== 'string') {
    next();
    return;
  }

  try {
    req.body.items = JSON.parse(req.body.items);
    next();
  } catch {
    next(createHttpError(400, 'Order items must be valid JSON.'));
  }
}

router.post(
  '/',
  requirePermission(PERMISSIONS.canCreateOrder),
  uploadOrderProductReference,
  parseCreateOrderBody,
  createOrderValidator,
  validateRequest,
  createOrderController,
);

router.get(
  '/',
  requirePermission(PERMISSIONS.canViewOrders),
  listOrdersController,
);

router.get(
  '/ready-for-dispatch',
  requirePermission(PERMISSIONS.canDispatchOrder),
  listReadyForDispatchOrdersController,
);

router.get(
  '/notifications',
  requirePermission(PERMISSIONS.canViewOrderClientDetails),
  listOrderNotificationsController,
);

router.patch(
  '/notifications/:notificationId/seen',
  requirePermission(PERMISSIONS.canViewOrderClientDetails),
  notificationIdParamValidator,
  validateRequest,
  markNotificationSeenController,
);

router.patch(
  '/notifications/:notificationId/client-confirmed',
  requirePermission(PERMISSIONS.canShareOrderMessageOnWhatsApp),
  notificationIdParamValidator,
  validateRequest,
  confirmNotificationForClientController,
);

router.post(
  '/notifications/:notificationId/prepare-client-message',
  requirePermission(PERMISSIONS.canShareOrderMessageOnWhatsApp),
  notificationIdParamValidator,
  validateRequest,
  prepareAcceptedClientMessageController,
);

router.get(
  '/message-logs',
  requirePermission(PERMISSIONS.canViewClientMessageLog),
  listClientMessageLogsController,
);

router.post(
  '/message-logs/:messageLogId/open-whatsapp',
  requirePermission(PERMISSIONS.canShareOrderMessageOnWhatsApp),
  messageLogIdParamValidator,
  validateRequest,
  openMessageInWhatsAppController,
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
  requirePermission(PERMISSIONS.canViewOrders),
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

router.patch(
  '/:orderId/progress',
  requirePermission(PERMISSIONS.canUpdateOrderProduction),
  progressOrderValidator,
  validateRequest,
  addProductionProgressController,
);

router.patch(
  '/:orderId/item-numbers',
  requirePermission(PERMISSIONS.canAssignOrderItemNumber),
  assignOrderItemNumbersValidator,
  validateRequest,
  assignOrderItemNumbersController,
);

router.patch(
  '/:orderId/ready',
  requirePermission(PERMISSIONS.canMarkOrderReady),
  markOrderReadyValidator,
  validateRequest,
  markProductionReadyController,
);

router.patch(
  '/:orderId/dispatch',
  requirePermission(PERMISSIONS.canDispatchOrder),
  orderIdParamValidator,
  validateRequest,
  dispatchOrderController,
);

export default router;
