import { Router } from 'express';
import { getCurrentUser, login } from '../controllers/authController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { loginValidator } from '../validators/authValidators.js';

const router = Router();

router.post('/login', loginValidator, validateRequest, login);
router.get('/me', requireAuth, getCurrentUser);

export default router;
