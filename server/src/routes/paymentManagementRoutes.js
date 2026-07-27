import { Router } from 'express';
import {
  listPaymentManagementCustomers,
  listPaymentManagementPurchases,
  listPaymentReminders,
  listPurchasePayments,
  listSalePayments,
  recordPurchasePaymentController,
  recordSalePaymentController,
} from '../controllers/paymentHistoryController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireAnyPermission, requirePermission } from '../middleware/rbacMiddleware.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { PERMISSIONS } from '../utils/permissions.js';
import {
  listPaymentManagementValidator,
  purchasePaymentParamValidator,
  recordPaymentValidator,
  salePaymentParamValidator,
} from '../validators/paymentHistoryValidators.js';

const router = Router();

router.use(requireAuth);

router.get(
  '/reminders',
  requirePermission(PERMISSIONS.canViewPayments),
  listPaymentReminders,
);

router.get(
  '/purchases',
  requirePermission(PERMISSIONS.canViewPayments),
  listPaymentManagementValidator,
  validateRequest,
  listPaymentManagementPurchases,
);

router.post(
  '/purchases/:purchaseId/payments',
  requireAnyPermission([PERMISSIONS.canCreatePayments, PERMISSIONS.canManagePayments]),
  purchasePaymentParamValidator,
  recordPaymentValidator,
  validateRequest,
  recordPurchasePaymentController,
);

router.get(
  '/purchases/:purchaseId/payments',
  requirePermission(PERMISSIONS.canViewPayments),
  purchasePaymentParamValidator,
  validateRequest,
  listPurchasePayments,
);

router.get(
  '/customers',
  requirePermission(PERMISSIONS.canViewPayments),
  listPaymentManagementValidator,
  validateRequest,
  listPaymentManagementCustomers,
);

router.post(
  '/sales/:saleId/payments',
  requireAnyPermission([PERMISSIONS.canCreatePayments, PERMISSIONS.canManagePayments]),
  salePaymentParamValidator,
  recordPaymentValidator,
  validateRequest,
  recordSalePaymentController,
);

router.get(
  '/sales/:saleId/payments',
  requirePermission(PERMISSIONS.canViewPayments),
  salePaymentParamValidator,
  validateRequest,
  listSalePayments,
);

export default router;
