import User from '../models/User.js';
import { createHttpError } from '../utils/httpError.js';
import {
  getDefaultPermissionsForRole,
  normalizePermissions,
  ROLES,
} from '../utils/permissions.js';
import { buildPagination, buildSearchFilter } from '../utils/queryHelpers.js';

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

function buildUserPayload(body, { isCreate = false } = {}) {
  const role = body.role || ROLES.User;
  const payload = {};

  if (body.name !== undefined || isCreate) payload.name = body.name?.trim();
  if (body.email !== undefined || isCreate) payload.email = normalizeEmail(body.email);
  if (body.password) payload.password = body.password;
  if (body.role !== undefined || isCreate) payload.role = role;
  if (body.isActive !== undefined) payload.isActive = body.isActive;

  if (body.permissions !== undefined) {
    payload.permissions = normalizePermissions(body.permissions);
  } else if (isCreate) {
    payload.permissions = getDefaultPermissionsForRole(role);
  }

  return payload;
}

async function assertEmailAvailable(email, excludedUserId) {
  if (!email) return;

  const existingUser = await User.findOne({ email });

  if (existingUser && String(existingUser._id) !== String(excludedUserId)) {
    throw createHttpError(409, 'A user with this email already exists.');
  }
}

async function assertCanModifyBossTarget(userId, payload) {
  const currentUser = await User.findById(userId);

  if (!currentUser) {
    throw createHttpError(404, 'User not found.');
  }

  const willNoLongerBeBoss =
    currentUser.role === ROLES.Boss &&
    (payload.role && payload.role !== ROLES.Boss || payload.isActive === false);

  if (!willNoLongerBeBoss) {
    return currentUser;
  }

  const activeBossCount = await User.countDocuments({
    _id: { $ne: currentUser._id },
    role: ROLES.Boss,
    isActive: true,
  });

  if (activeBossCount === 0) {
    throw createHttpError(400, 'At least one active Boss user is required.');
  }

  return currentUser;
}

export async function listUsers({ page = 1, limit = 20, search, role, isActive }) {
  const filter = {
    ...buildSearchFilter(search, ['name', 'email', 'role']),
  };

  if (role) filter.role = role;
  if (isActive !== undefined) filter.isActive = isActive;

  const skip = (page - 1) * limit;

  const [items, totalItems] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);

  return {
    items,
    pagination: buildPagination({ page, limit, totalItems }),
  };
}

export async function createUser(body) {
  const payload = buildUserPayload(body, { isCreate: true });

  await assertEmailAvailable(payload.email);

  return User.create(payload);
}

export async function getUserById(userId) {
  const user = await User.findById(userId);

  if (!user) {
    throw createHttpError(404, 'User not found.');
  }

  return user;
}

export async function updateUser(userId, body, actorUserId) {
  const payload = buildUserPayload(body);

  await assertEmailAvailable(payload.email, userId);
  const user = await assertCanModifyBossTarget(userId, payload);

  if (payload.isActive === false && String(user._id) === String(actorUserId)) {
    throw createHttpError(400, 'You cannot deactivate your own account.');
  }

  Object.assign(user, payload);

  if (payload.role && body.permissions === undefined) {
    user.permissions = getDefaultPermissionsForRole(payload.role);
  }

  await user.save();
  return user;
}

export async function setUserActiveStatus(userId, isActive, actorUserId) {
  return updateUser(userId, { isActive }, actorUserId);
}

export async function deleteUser(userId, actorUserId) {
  if (String(userId) === String(actorUserId)) {
    throw createHttpError(400, 'You cannot delete your own account.');
  }

  const user = await assertCanModifyBossTarget(userId, { isActive: false });

  await User.findByIdAndDelete(user._id);
}
