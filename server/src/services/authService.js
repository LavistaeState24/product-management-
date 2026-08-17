import User from '../models/User.js';
import { env } from '../config/env.js';

function logAuthDebug(message, details = {}) {
  if (!env.authDebug) {
    return;
  }

  console.log('Auth debug:', message, details);
}

export async function authenticateUser(email, password) {
  const normalizedEmail = email.toLowerCase();
  const user = await User.findOne({ email: normalizedEmail }).select('+password');

  if (!user) {
    logAuthDebug('login failed: user not found', { email: normalizedEmail });
    return null;
  }

  if (!user.isActive) {
    logAuthDebug('login failed: user inactive', {
      email: normalizedEmail,
      userId: user._id,
    });
    return null;
  }

  const isValid = await user.comparePassword(password);

  if (!isValid) {
    logAuthDebug('login failed: password mismatch', {
      email: normalizedEmail,
      userId: user._id,
    });
    return null;
  }

  logAuthDebug('login succeeded', {
    email: normalizedEmail,
    userId: user._id,
    role: user.role,
  });

  const now = new Date();
  await User.updateOne(
    { _id: user._id },
    {
      $set: {
        lastLoginAt: now,
        lastSeenAt: now,
      },
    },
  );

  user.lastLoginAt = now;
  user.lastSeenAt = now;

  return user;
}
