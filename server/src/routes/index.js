import { Router } from 'express';
import authRoutes from './authRoutes.js';
import purchaseRoutes from './purchaseRoutes.js';

const router = Router();

router.get('/health', (req, res) => {
  res.status(200).json({
    message: 'Operations CRM API is running.',
  });
});

router.use('/auth', authRoutes);
router.use('/purchases', purchaseRoutes);

export default router;
