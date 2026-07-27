import { Router } from 'express';
import {
  cancelSale,
  createSale,
  deleteSale,
  getSaleById,
  getSaleFormOptions,
  listSales,
  updateSale,
} from '../controllers/saleController.js';
import { recordSalePaymentController } from '../controllers/paymentHistoryController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireAnyPermission, requirePermission } from '../middleware/rbacMiddleware.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { PERMISSIONS } from '../utils/permissions.js';
import {
  createSaleValidator,
  cancelSaleValidator,
  listSaleValidator,
  saleIdParamValidator,
  updateSaleValidator,
} from '../validators/saleValidators.js';
import { recordPaymentValidator } from '../validators/paymentHistoryValidators.js';

const router = Router();

router.use(requireAuth);

router.get(
  '/form-options',
  requirePermission(PERMISSIONS.canViewSales),
  getSaleFormOptions,
);

router.get(
  '/',
  requirePermission(PERMISSIONS.canViewSales),
  listSaleValidator,
  validateRequest,
  listSales,
);

router.get(
  '/:saleId',
  requirePermission(PERMISSIONS.canViewSales),
  saleIdParamValidator,
  validateRequest,
  getSaleById,
);

router.post(
  '/',
  requirePermission(PERMISSIONS.canCreateSales),
  createSaleValidator,
  validateRequest,
  createSale,
);

router.put(
  '/:saleId',
  requirePermission(PERMISSIONS.canEditSales),
  saleIdParamValidator,
  updateSaleValidator,
  validateRequest,
  updateSale,
);

router.patch(
  '/:saleId/cancel',
  requirePermission(PERMISSIONS.canDeleteSales),
  saleIdParamValidator,
  cancelSaleValidator,
  validateRequest,
  cancelSale,
);

router.post(
  '/:saleId/payments',
  requireAnyPermission([PERMISSIONS.canCreatePayments, PERMISSIONS.canManagePayments]),
  saleIdParamValidator,
  recordPaymentValidator,
  validateRequest,
  recordSalePaymentController,
);

router.delete(
  '/:saleId',
  requirePermission(PERMISSIONS.canDeleteSales),
  saleIdParamValidator,
  validateRequest,
  deleteSale,
);

export default router;
