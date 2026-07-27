import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { getEffectivePermissions } from './permissions.js';

export function generateToken(user) {
  return jwt.sign(
    {
      sub: user._id.toString(),
      role: user.role,
      permissions: getEffectivePermissions(user),
    },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn },
  );
}
