import app from './app.js';
import { connectDatabase } from './config/db.js';
import { env } from './config/env.js';

async function startServer() {
  console.log('Starting CRM server...');
  console.log(`Environment: ${env.nodeEnv}`);

  try {
    await connectDatabase();

    app.listen(env.port, '0.0.0.0', () => {
      console.log(`Server listening on port ${env.port}`);
    });
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    throw error;
  }
}

startServer().catch((error) => {
  console.error('Failed to start server', error);
  process.exit(1);
});
