import { Router } from 'express';
import authRoutes from './authRoutes.js';
import finishedGoodsStockRoutes from './finishedGoodsStockRoutes.js';
import paymentManagementRoutes from './paymentManagementRoutes.js';
import paymentHistoryRoutes from './paymentHistoryRoutes.js';
import purchaseRoutes from './purchaseRoutes.js';
import puProductManufacturingRoutes from './puProductManufacturingRoutes.js';
import puProductStockRoutes from './puProductStockRoutes.js';
import rodProductionRoutes from './rodProductionRoutes.js';
import rodStockRoutes from './rodStockRoutes.js';
import saleRoutes from './saleRoutes.js';
import sheetProductionRoutes from './sheetProductionRoutes.js';
import sheetStockRoutes from './sheetStockRoutes.js';
import stockRoutes from './stockRoutes.js';

const router = Router();

router.get('/health', (req, res) => {
  res.status(200).json({
    message: 'Operations CRM API is running.',
  });
});

router.use('/auth', authRoutes);
router.use('/finished-goods-stock', finishedGoodsStockRoutes);
router.use('/payment-management', paymentManagementRoutes);
router.use('/payments', paymentHistoryRoutes);
router.use('/purchases', purchaseRoutes);
router.use('/pu-product-manufacturing', puProductManufacturingRoutes);
router.use('/pu-product-stock', puProductStockRoutes);
router.use('/rod-productions', rodProductionRoutes);
router.use('/rod-stocks', rodStockRoutes);
router.use('/sales', saleRoutes);
router.use('/sheet-production', sheetProductionRoutes);
router.use('/sheet-stock', sheetStockRoutes);
router.use('/stocks', stockRoutes);

export default router;
