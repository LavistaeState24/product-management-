import { Router } from 'express';
import { listPaymentHistory } from '../controllers/paymentHistoryController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/rbacMiddleware.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { PERMISSIONS } from '../utils/permissions.js';
import { listPaymentHistoryValidator } from '../validators/paymentHistoryValidators.js';

const router = Router();

router.use(requireAuth);

router.get(
  '/',
  requirePermission(PERMISSIONS.canViewPayments),
  listPaymentHistoryValidator,
  validateRequest,
  listPaymentHistory,
);

export default router;
