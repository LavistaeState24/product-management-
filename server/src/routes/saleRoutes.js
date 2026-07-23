import { Router } from 'express';
import {
  cancelSale,
  createSale,
  deleteSale,
  getSaleById,
  getSaleFormOptions,
  listSales,
  recordSalePayment,
  updateSale,
} from '../controllers/saleController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/rbacMiddleware.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { PERMISSIONS } from '../utils/permissions.js';
import {
  createSaleValidator,
  cancelSaleValidator,
  listSaleValidator,
  recordSalePaymentValidator,
  saleIdParamValidator,
  updateSaleValidator,
} from '../validators/saleValidators.js';

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
  requirePermission(PERMISSIONS.canEditSales),
  saleIdParamValidator,
  recordSalePaymentValidator,
  validateRequest,
  recordSalePayment,
);

router.delete(
  '/:saleId',
  requirePermission(PERMISSIONS.canDeleteSales),
  saleIdParamValidator,
  validateRequest,
  deleteSale,
);

export default router;
