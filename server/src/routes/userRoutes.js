import { Router } from 'express';
import {
  createUserController,
  deleteUserController,
  getUserController,
  getUserManagementOptions,
  listUsersController,
  setUserActiveStatusController,
  updateUserController,
} from '../controllers/userController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/rbacMiddleware.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { PERMISSIONS } from '../utils/permissions.js';
import {
  createUserValidator,
  deleteUserValidator,
  getUserValidator,
  listUsersValidator,
  setUserActiveStatusValidator,
  updateUserValidator,
} from '../validators/userValidators.js';

const router = Router();

router.use(requireAuth);
router.use(requirePermission(PERMISSIONS.canManageUsers));

router.get('/options', getUserManagementOptions);

router.get('/', listUsersValidator, validateRequest, listUsersController);
router.post('/', createUserValidator, validateRequest, createUserController);
router.get('/:userId', getUserValidator, validateRequest, getUserController);
router.put('/:userId', updateUserValidator, validateRequest, updateUserController);
router.patch(
  '/:userId/active-status',
  setUserActiveStatusValidator,
  validateRequest,
  setUserActiveStatusController,
);
router.delete(
  '/:userId',
  deleteUserValidator,
  validateRequest,
  deleteUserController,
);

export default router;