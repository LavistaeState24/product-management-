import User from '../models/User.js';

export async function authenticateUser(email, password) {
  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

  if (!user || !user.isActive) {
    return null;
  }

  const isValid = await user.comparePassword(password);

  if (!isValid) {
    return null;
  }

  return user;
}
