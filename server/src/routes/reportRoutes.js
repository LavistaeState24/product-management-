import { Router } from 'express';
import {
  getCustomerOutstandingReport,
  getGstReport,
  getInventoryValueReport,
  getLowStockReport,
  getProductionReport,
  getProfitLossReport,
  getPurchaseReport,
  getSalesReport,
  getStockReport,
  getSupplierOutstandingReport,
} from '../controllers/reportController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/rbacMiddleware.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { PERMISSIONS } from '../utils/permissions.js';
import {
  customerOutstandingReportValidator,
  gstReportValidator,
  inventoryValueReportValidator,
  lowStockReportValidator,
  productionReportValidator,
  profitLossReportValidator,
  purchaseReportValidator,
  salesReportValidator,
  stockReportValidator,
  supplierOutstandingReportValidator,
} from '../validators/reportValidators.js';

const router = Router();

router.use(requireAuth);
router.use(requirePermission(PERMISSIONS.canViewReports));

router.get('/purchases', purchaseReportValidator, validateRequest, getPurchaseReport);
router.get('/sales', salesReportValidator, validateRequest, getSalesReport);
router.get('/production', productionReportValidator, validateRequest, getProductionReport);
router.get('/stock', stockReportValidator, validateRequest, getStockReport);
router.get('/low-stock', lowStockReportValidator, validateRequest, getLowStockReport);
router.get(
  '/customer-outstanding',
  customerOutstandingReportValidator,
  validateRequest,
  getCustomerOutstandingReport,
);
router.get(
  '/supplier-outstanding',
  supplierOutstandingReportValidator,
  validateRequest,
  getSupplierOutstandingReport,
);
router.get('/profit-loss', profitLossReportValidator, validateRequest, getProfitLossReport);
router.get('/inventory-value', inventoryValueReportValidator, validateRequest, getInventoryValueReport);
router.get('/gst', gstReportValidator, validateRequest, getGstReport);

export default router;
