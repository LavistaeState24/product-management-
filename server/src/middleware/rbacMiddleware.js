export function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    if (!req.user.permissions.includes(permission)) {
      return res.status(403).json({ message: 'Insufficient permissions.' });
    }

    return next();
  };
}
