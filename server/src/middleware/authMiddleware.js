import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import User from '../models/User.js';
import { LAST_SEEN_UPDATE_INTERVAL_MS } from '../utils/userActivity.js';

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
      '_id name email role permissions isActive lastLoginAt lastSeenAt'
    );

    if (!user || !user.isActive) {
      return res.status(401).json({
        message: 'Invalid session.',
      });
    }

    req.user = user;

    const now = new Date();
    const previousLastSeenAt = user.lastSeenAt
      ? new Date(user.lastSeenAt).getTime()
      : 0;

    if (now.getTime() - previousLastSeenAt >= LAST_SEEN_UPDATE_INTERVAL_MS) {
      try {
        await User.updateOne(
          { _id: user._id },
          { $set: { lastSeenAt: now } },
        );

        user.lastSeenAt = now;
      } catch {
        // Activity tracking must not block otherwise valid authenticated requests.
      }
    }

    next();
  } catch {
    return res.status(401).json({
      message: 'Invalid or expired token.',
    });
  }
}
