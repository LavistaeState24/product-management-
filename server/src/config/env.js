import dotenv from 'dotenv';

dotenv.config();

function required(name, fallback = '') {
  const value = process.env[name] || fallback;

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 5000),
  mongoUri: required('MONGO_URI', 'mongodb://127.0.0.1:27017/operations-crm'),
  jwtSecret: required('JWT_SECRET', 'super-secret-change-me'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  bossName: process.env.BOSS_NAME || 'Operations Boss',
  bossEmail: process.env.BOSS_EMAIL || 'boss@operationscrm.com',
  bossPassword: process.env.BOSS_PASSWORD || 'Boss@12345',
};
