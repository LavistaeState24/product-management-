import { connectDatabase } from '../config/db.js';
import { env } from '../config/env.js';
import User from '../models/User.js';
import { ROLES } from '../utils/permissions.js';

async function seedBossUser() {
  await connectDatabase();

  const existingUser = await User.findOne({ email: env.bossEmail.toLowerCase() });

  if (existingUser) {
    console.log(`Boss user already exists: ${env.bossEmail}`);
    process.exit(0);
  }

  await User.create({
    name: env.bossName,
    email: env.bossEmail,
    password: env.bossPassword,
    role: ROLES.Boss,
  });

  console.log(`Boss user created: ${env.bossEmail}`);
  process.exit(0);
}

seedBossUser().catch((error) => {
  console.error('Failed to seed boss user', error);
  process.exit(1);
});
