import { ROLES } from '../utils/permissions.js';

function canAccess(user, permissions = []) {
  if (!user) {
    return false;
  }

  if (user.role === ROLES.Boss) {
    return true;
  }

  const userPermissions = Array.isArray(user.permissions)
    ? user.permissions
    : [];

  return permissions.some((permission) =>
    userPermissions.includes(permission),
  );
}

export function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        message: 'Authentication required.',
      });
    }

    if (!canAccess(req.user, [permission])) {
      return res.status(403).json({
        message: 'Insufficient permissions.',
      });
    }

    next();
  };
}

export function requireAnyPermission(permissions) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        message: 'Authentication required.',
      });
    }

    if (!canAccess(req.user, permissions)) {
      return res.status(403).json({
        message: 'Insufficient permissions.',
      });
    }

    next();
  };
}