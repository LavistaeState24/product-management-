import { connectDatabase } from '../config/db.js';
import { env } from '../config/env.js';
import User from '../models/User.js';
import { getDefaultPermissionsForRole, ROLES } from '../utils/permissions.js';

async function seedBossUser() {
  await connectDatabase();

  if (!env.bossEmail || !env.bossPassword) {
    throw new Error(
      'BOSS_EMAIL and BOSS_PASSWORD are required to seed the boss user.',
    );
  }

  const normalizedEmail = env.bossEmail.toLowerCase();
  const existingUser = await User.findOne({ email: normalizedEmail }).select('+password');

  if (existingUser) {
    const passwordMatches = await existingUser.comparePassword(env.bossPassword);

    existingUser.name = env.bossName;
    existingUser.role = ROLES.Boss;
    existingUser.permissions = getDefaultPermissionsForRole(ROLES.Boss);
    existingUser.isActive = true;

    if (!passwordMatches) {
      existingUser.password = env.bossPassword;
    }

    await existingUser.save();

    console.log(
      `Boss user updated: ${normalizedEmail} passwordReset=${!passwordMatches}`,
    );
    process.exit(0);
  }

  await User.create({
    name: env.bossName,
    email: normalizedEmail,
    password: env.bossPassword,
    role: ROLES.Boss,
  });

  console.log(`Boss user created: ${normalizedEmail}`);
  process.exit(0);
}

seedBossUser().catch((error) => {
  console.error('Failed to seed boss user', error);
  process.exit(1);
});
