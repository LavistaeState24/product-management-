import { getEffectivePermissions } from './permissions.js';
import { isUserOnline } from './userActivity.js';

export function formatUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    permissions: getEffectivePermissions(user),
    isActive: user.isActive,
    lastLoginAt: user.lastLoginAt || null,
    lastSeenAt: user.lastSeenAt || null,
    isOnline: isUserOnline(user),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
