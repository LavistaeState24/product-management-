import { authenticateUser } from '../services/authService.js';
import { formatUser } from '../utils/formatUser.js';
import { generateToken } from '../utils/generateToken.js';

export async function login(req, res) {
  const { email, password } = req.body;
  const user = await authenticateUser(email, password);

  if (!user) {
    return res.status(401).json({ message: 'Invalid email or password.' });
  }

  const token = generateToken(user);

  return res.status(200).json({
    message: 'Login successful.',
    token,
    user: formatUser(user),
  });
}

export async function getCurrentUser(req, res) {
  return res.status(200).json({
    user: formatUser(req.user),
  });
}
