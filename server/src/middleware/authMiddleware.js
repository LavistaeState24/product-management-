import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import User from '../models/User.js';

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization;

  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({
      message: 'Authentication required.',
    });
  }

  try {
    const token = header.slice(7);

    const payload = jwt.verify(token, env.jwtSecret);

    const user = await User.findById(payload.sub).select(
      '_id name email role permissions isActive'
    );

    if (!user || !user.isActive) {
      return res.status(401).json({
        message: 'Invalid session.',
      });
    }

    req.user = user;

    next();
  } catch {
    return res.status(401).json({
      message: 'Invalid or expired token.',
    });
  }
}