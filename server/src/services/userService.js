import User from '../models/User.js';
import { createHttpError } from '../utils/httpError.js';
import {
  ALL_PERMISSIONS,
  getDefaultPermissionsForRole,
  normalizePermissions,
  ROLE_PERMISSIONS,
  ROLES,
} from '../utils/permissions.js';
import {
  buildPagination,
  buildSearchFilter,
} from '../utils/queryHelpers.js';

const VALID_ROLES = new Set(Object.values(ROLES));

const BOSS_ONLY_PERMISSIONS = new Set([
  // User administration
  'canManageUsers',

  // Destructive operations
  'canDeletePurchase',
  'canDeleteProduction',
  'canDeleteSheetProduction',
  'canDeleteSales',
  'canDeleteStock',
  'canDeletePayments',
  'canDeleteReports',
]);

function normalizeEmail(email) {
  if (typeof email !== 'string') {
    return email;
  }

  return email.trim().toLowerCase();
}

function validateRole(role) {
  if (!VALID_ROLES.has(role)) {
    throw createHttpError(400, 'Invalid user role.');
  }

  return role;
}

function normalizeRolePermissions(role, permissions) {
  const normalized = normalizePermissions(permissions);

  if (role === ROLES.Boss) {
    return [...ALL_PERMISSIONS];
  }

  const allowedPermissions = new Set(
    ROLE_PERMISSIONS[role] || [],
  );

  const invalidPermission = normalized.find(
    (permission) => !allowedPermissions.has(permission),
  );

  if (invalidPermission) {
    throw createHttpError(
      400,
      `${invalidPermission} is not allowed for the ${role} role.`,
    );
  }

  return normalized;
}

function buildUserPayload(body, { isCreate = false } = {}) {
  const payload = {};

  const role =
    body.role !== undefined
      ? validateRole(body.role)
      : isCreate
        ? ROLES.User
        : undefined;

  if (body.name !== undefined || isCreate) {
    payload.name = body.name?.trim();
  }

  if (body.email !== undefined || isCreate) {
    payload.email = normalizeEmail(body.email);
  }

  if (body.password) {
    payload.password = body.password;
  }

  if (role !== undefined) {
    payload.role = role;
  }

  if (body.isActive !== undefined) {
    payload.isActive = body.isActive;
  }

  if (body.permissions !== undefined) {
    const permissionRole = role || body.currentRole;

    payload.permissions = normalizeRolePermissions(
      permissionRole,
      body.permissions,
    );
  } else if (isCreate) {
    payload.permissions = getDefaultPermissionsForRole(role);
  }

  return payload;
}

async function assertEmailAvailable(email, excludedUserId) {
  if (!email) return;

  const existingUser = await User.findOne({ email });

  if (
    existingUser &&
    String(existingUser._id) !== String(excludedUserId)
  ) {
    throw createHttpError(
      409,
      'A user with this email already exists.',
    );
  }
}

async function assertCanModifyBossTarget(userId, payload) {
  const currentUser = await User.findById(userId);

  if (!currentUser) {
    throw createHttpError(404, 'User not found.');
  }

  const roleIsChangingFromBoss =
    currentUser.role === ROLES.Boss &&
    payload.role !== undefined &&
    payload.role !== ROLES.Boss;

  const bossIsBeingDeactivated =
    currentUser.role === ROLES.Boss &&
    payload.isActive === false;

  const willNoLongerBeBoss =
    roleIsChangingFromBoss || bossIsBeingDeactivated;

  if (!willNoLongerBeBoss) {
    return currentUser;
  }

  const activeBossCount = await User.countDocuments({
    _id: { $ne: currentUser._id },
    role: ROLES.Boss,
    isActive: true,
  });

  if (activeBossCount === 0) {
    throw createHttpError(
      400,
      'At least one active Boss user is required.',
    );
  }

  return currentUser;
}

export async function listUsers({
  page = 1,
  limit = 20,
  search,
  role,
  isActive,
}) {
  const parsedPage = Math.max(Number(page) || 1, 1);
  const parsedLimit = Math.min(
    Math.max(Number(limit) || 20, 1),
    100,
  );

  const filter = {
    ...buildSearchFilter(search, ['name', 'email', 'role']),
  };

  if (role) {
    filter.role = validateRole(role);
  }

  if (isActive !== undefined && isActive !== '') {
    if (isActive !== true && isActive !== false) {
      if (isActive !== 'true' && isActive !== 'false') {
        throw createHttpError(
          400,
          'isActive must be true or false.',
        );
      }

      filter.isActive = isActive === 'true';
    } else {
      filter.isActive = isActive;
    }
  }

  const skip = (parsedPage - 1) * parsedLimit;

  const [items, totalItems] = await Promise.all([
    User.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parsedLimit),

    User.countDocuments(filter),
  ]);

  return {
    items,
    pagination: buildPagination({
      page: parsedPage,
      limit: parsedLimit,
      totalItems,
    }),
  };
}

export async function createUser(body) {
  const payload = buildUserPayload(body, {
    isCreate: true,
  });

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

export async function updateUser(
  userId,
  body,
  actorUserId,
) {
  const existingUser = await User.findById(userId);

  if (!existingUser) {
    throw createHttpError(404, 'User not found.');
  }

  const effectiveRole =
    body.role !== undefined
      ? body.role
      : existingUser.role;

  const payload = buildUserPayload({
    ...body,
    currentRole: effectiveRole,
  });

  await assertEmailAvailable(payload.email, userId);

  const user = await assertCanModifyBossTarget(
    userId,
    payload,
  );

  if (
    payload.isActive === false &&
    String(user._id) === String(actorUserId)
  ) {
    throw createHttpError(
      400,
      'You cannot deactivate your own account.',
    );
  }

  Object.assign(user, payload);

  // Role changed, but no custom permissions were submitted:
  // apply the new role defaults.
  if (
    payload.role !== undefined &&
    body.permissions === undefined
  ) {
    user.permissions =
      getDefaultPermissionsForRole(payload.role);
  }

  // Boss always receives all permissions.
  if (user.role === ROLES.Boss) {
    user.permissions = [...ALL_PERMISSIONS];
  }

  await user.save();

  return user;
}

export async function setUserActiveStatus(
  userId,
  isActive,
  actorUserId,
) {
  return updateUser(
    userId,
    { isActive },
    actorUserId,
  );
}

export async function deleteUser(userId, actorUserId) {
  if (String(userId) === String(actorUserId)) {
    throw createHttpError(
      400,
      'You cannot delete your own account.',
    );
  }

  const user = await assertCanModifyBossTarget(
    userId,
    { isActive: false },
  );

  await User.findByIdAndDelete(user._id);
}