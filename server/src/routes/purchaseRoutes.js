import { Router } from 'express';
import {
  createPurchase,
  deletePurchase,
  getPurchaseById,
  getPurchaseFormOptions,
  listPurchases,
  updatePurchase,
} from '../controllers/purchaseController.js';
import { recordPurchasePaymentController } from '../controllers/paymentHistoryController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/rbacMiddleware.js';
import { uploadBill } from '../middleware/uploadMiddleware.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { PERMISSIONS } from '../utils/permissions.js';
import {
  createPurchaseValidator,
  listPurchaseValidator,
  purchaseIdParamValidator,
  updatePurchaseValidator,
} from '../validators/purchaseValidators.js';
import { recordPaymentValidator } from '../validators/paymentHistoryValidators.js';

const router = Router();

router.use(requireAuth);

router.get(
  '/form-options',
  requirePermission(PERMISSIONS.canViewPurchase),
  getPurchaseFormOptions,
);

router.get(
  '/',
  requirePermission(PERMISSIONS.canViewPurchase),
  listPurchaseValidator,
  validateRequest,
  listPurchases,
);

router.get(
  '/:purchaseId',
  requirePermission(PERMISSIONS.canViewPurchase),
  purchaseIdParamValidator,
  validateRequest,
  getPurchaseById,
);

router.post(
  '/',
  requirePermission(PERMISSIONS.canCreatePurchase),
  uploadBill,
  createPurchaseValidator,
  validateRequest,
  createPurchase,
);

router.put(
  '/:purchaseId',
  requirePermission(PERMISSIONS.canEditPurchase),
  purchaseIdParamValidator,
  uploadBill,
  updatePurchaseValidator,
  validateRequest,
  updatePurchase,
);

router.post(
  '/:purchaseId/payments',
  requirePermission(PERMISSIONS.canManagePayments),
  purchaseIdParamValidator,
  recordPaymentValidator,
  validateRequest,
  recordPurchasePaymentController,
);

router.delete(
  '/:purchaseId',
  requirePermission(PERMISSIONS.canDeletePurchase),
  purchaseIdParamValidator,
  validateRequest,
  deletePurchase,
);

export default router;
