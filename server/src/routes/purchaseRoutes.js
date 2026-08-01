import { Router } from 'express';

import {
  createPurchase,
  deletePurchase,
  getPurchaseBill,
  getPurchaseById,
  getPurchaseFormOptions,
  listPurchases,
  updatePurchase,
} from '../controllers/purchaseController.js';

import {
  recordPurchasePaymentController,
} from '../controllers/paymentHistoryController.js';

import {
  requireAuth,
} from '../middleware/authMiddleware.js';

import {
  requireAnyPermission,
  requirePermission,
} from '../middleware/rbacMiddleware.js';

import {
  uploadBill,
} from '../middleware/uploadMiddleware.js';

import {
  validateRequest,
} from '../middleware/validateRequest.js';

import {
  PERMISSIONS,
} from '../utils/permissions.js';

import {
  createPurchaseValidator,
  listPurchaseValidator,
  purchaseIdParamValidator,
  updatePurchaseValidator,
} from '../validators/purchaseValidators.js';

import {
  recordPaymentValidator,
} from '../validators/paymentHistoryValidators.js';

const router = Router();

router.use(requireAuth);

// Form dropdown options
router.get(
  '/form-options',
  requirePermission(
    PERMISSIONS.canViewPurchase,
  ),
  getPurchaseFormOptions,
);

// Purchase list
router.get(
  '/',
  requirePermission(
    PERMISSIONS.canViewPurchase,
  ),
  listPurchaseValidator,
  validateRequest,
  listPurchases,
);

// Generate private S3 signed URL
router.get(
  '/:purchaseId/bill',
  requirePermission(
    PERMISSIONS.canViewPurchase,
  ),
  purchaseIdParamValidator,
  validateRequest,
  getPurchaseBill,
);

// Purchase details
router.get(
  '/:purchaseId',
  requirePermission(
    PERMISSIONS.canViewPurchase,
  ),
  purchaseIdParamValidator,
  validateRequest,
  getPurchaseById,
);

// Create purchase with optional bill upload
router.post(
  '/',
  requirePermission(
    PERMISSIONS.canCreatePurchase,
  ),
  uploadBill,
  createPurchaseValidator,
  validateRequest,
  createPurchase,
);

// Update purchase and replace/remove bill
router.put(
  '/:purchaseId',
  requirePermission(
    PERMISSIONS.canEditPurchase,
  ),
  purchaseIdParamValidator,
  uploadBill,
  updatePurchaseValidator,
  validateRequest,
  updatePurchase,
);

// Add purchase payment
router.post(
  '/:purchaseId/payments',
  requireAnyPermission([
    PERMISSIONS.canCreatePayments,
    PERMISSIONS.canManagePayments,
  ]),
  purchaseIdParamValidator,
  recordPaymentValidator,
  validateRequest,
  recordPurchasePaymentController,
);

// Delete purchase and related bill
router.delete(
  '/:purchaseId',
  requirePermission(
    PERMISSIONS.canDeletePurchase,
  ),
  purchaseIdParamValidator,
  validateRequest,
  deletePurchase,
);

export default router;