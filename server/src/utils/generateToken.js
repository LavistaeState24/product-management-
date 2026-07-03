import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export function generateToken(user) {
  return jwt.sign(
    {
      sub: user._id.toString(),
      role: user.role,
      permissions: user.permissions,
    },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn },
  );
}
