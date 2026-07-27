import {
  createUser,
  deleteUser,
  getUserById,
  listUsers,
  setUserActiveStatus,
  updateUser,
} from '../services/userService.js';
import { formatUser } from '../utils/formatUser.js';
import { ALL_PERMISSIONS, CRM_MODULE_PERMISSIONS, ROLE_PERMISSIONS, ROLES } from '../utils/permissions.js';

export async function getUserManagementOptions(req, res) {
  return res.status(200).json({
    roles: Object.values(ROLES),
    permissions: ALL_PERMISSIONS,
    modulePermissions: CRM_MODULE_PERMISSIONS,
    rolePermissions: ROLE_PERMISSIONS,
  });
}

export async function listUsersController(req, res) {
  const result = await listUsers({
    page: req.query.page || 1,
    limit: req.query.limit || 20,
    search: req.query.search?.trim(),
    role: req.query.role,
    isActive: req.query.isActive,
  });

  return res.status(200).json({
    items: result.items.map(formatUser),
    pagination: result.pagination,
  });
}

export async function getUserController(req, res) {
  const user = await getUserById(req.params.userId);

  return res.status(200).json({
    user: formatUser(user),
  });
}

export async function createUserController(req, res) {
  const user = await createUser(req.body);

  return res.status(201).json({
    message: 'User created successfully.',
    user: formatUser(user),
  });
}

export async function updateUserController(req, res) {
  const user = await updateUser(req.params.userId, req.body, req.user._id);

  return res.status(200).json({
    message: 'User updated successfully.',
    user: formatUser(user),
  });
}

export async function setUserActiveStatusController(req, res) {
  const user = await setUserActiveStatus(req.params.userId, req.body.isActive, req.user._id);

  return res.status(200).json({
    message: user.isActive ? 'User activated successfully.' : 'User deactivated successfully.',
    user: formatUser(user),
  });
}

export async function deleteUserController(req, res) {
  await deleteUser(req.params.userId, req.user._id);

  return res.status(200).json({
    message: 'User deleted successfully.',
  });
}
