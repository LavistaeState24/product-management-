import { Router } from 'express';
import authRoutes from './authRoutes.js';
import dashboardRoutes from './dashboardRoutes.js';
import finishedGoodsStockRoutes from './finishedGoodsStockRoutes.js';
import paymentManagementRoutes from './paymentManagementRoutes.js';
import paymentHistoryRoutes from './paymentHistoryRoutes.js';
import orderRoutes from './orderRoutes.js';
import purchaseRoutes from './purchaseRoutes.js';
import reportRoutes from './reportRoutes.js';
import puProductManufacturingRoutes from './puProductManufacturingRoutes.js';
import puProductStockRoutes from './puProductStockRoutes.js';
import rodProductionRoutes from './rodProductionRoutes.js';
import rodProductManufacturingRoutes from './rodProductManufacturingRoutes.js';
import rodProductStockRoutes from './rodProductStockRoutes.js';
import rodStockRoutes from './rodStockRoutes.js';
import saleRoutes from './saleRoutes.js';
import sheetProductionRoutes from './sheetProductionRoutes.js';
import sheetProductManufacturingRoutes from './sheetProductManufacturingRoutes.js';
import sheetProductStockRoutes from './sheetProductStockRoutes.js';
import sheetStockRoutes from './sheetStockRoutes.js';
import stockRoutes from './stockRoutes.js';
import userRoutes from './userRoutes.js';

const router = Router();

router.get('/health', (req, res) => {
  res.status(200).json({
    message: 'Operations CRM API is running.',
  });
});

router.use('/auth', authRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/finished-goods-stock', finishedGoodsStockRoutes);
router.use('/payment-management', paymentManagementRoutes);
router.use('/payments', paymentHistoryRoutes);
router.use('/orders', orderRoutes);
router.use('/purchases', purchaseRoutes);
router.use('/reports', reportRoutes);
router.use('/pu-product-manufacturing', puProductManufacturingRoutes);
router.use('/pu-product-stock', puProductStockRoutes);
router.use('/rod-productions', rodProductionRoutes);
router.use('/rod-product-manufacturing', rodProductManufacturingRoutes);
router.use('/rod-product-stock', rodProductStockRoutes);
router.use('/rod-stocks', rodStockRoutes);
router.use('/sales', saleRoutes);
router.use('/sheet-production', sheetProductionRoutes);
router.use('/sheet-product-manufacturing', sheetProductManufacturingRoutes);
router.use('/sheet-product-stock', sheetProductStockRoutes);
router.use('/sheet-stock', sheetStockRoutes);
router.use('/stocks', stockRoutes);
router.use('/users', userRoutes);

export default router;
