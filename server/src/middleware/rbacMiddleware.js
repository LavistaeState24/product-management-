import { ROLES } from '../utils/permissions.js';

function canAccess(user, permissions) {
  if (user.role === ROLES.Boss) {
    return true;
  }

  return permissions.some((permission) => user.permissions.includes(permission));
}

export function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    if (!canAccess(req.user, [permission])) {
      return res.status(403).json({ message: 'Insufficient permissions.' });
    }

    return next();
  };
}

export function requireAnyPermission(permissions) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    if (!canAccess(req.user, permissions)) {
      return res.status(403).json({ message: 'Insufficient permissions.' });
    }

    return next();
  };
}
