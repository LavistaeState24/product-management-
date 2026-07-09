import { Router } from 'express';
import authRoutes from './authRoutes.js';
import purchaseRoutes from './purchaseRoutes.js';
import saleRoutes from './saleRoutes.js';
import stockRoutes from './stockRoutes.js';

const router = Router();

router.get('/health', (req, res) => {
  res.status(200).json({
    message: 'Operations CRM API is running.',
  });
});

router.use('/auth', authRoutes);
router.use('/purchases', purchaseRoutes);
router.use('/sales', saleRoutes);
router.use('/stocks', stockRoutes);

export default router;
