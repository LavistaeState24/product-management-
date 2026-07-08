import { Router } from 'express';
import {
  createSale,
  deleteSale,
  getSaleById,
  getSaleFormOptions,
  listSales,
  updateSale,
} from '../controllers/saleController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/rbacMiddleware.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { PERMISSIONS } from '../utils/permissions.js';
import {
  createSaleValidator,
  listSaleValidator,
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

router.delete(
  '/:saleId',
  requirePermission(PERMISSIONS.canDeleteSales),
  saleIdParamValidator,
  validateRequest,
  deleteSale,
);

export default router;
