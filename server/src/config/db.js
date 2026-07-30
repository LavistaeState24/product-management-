import dns from 'node:dns';
import mongoose from 'mongoose';
import { env, logMongoConfiguration } from './env.js';

function classifyMongoConnectionError(error) {
  const message = error?.message || '';
  const name = error?.name || '';
  const codeName = error?.codeName || '';
  const reasonMessage = error?.reason?.message || '';
  const combinedMessage = `${message} ${reasonMessage}`;

  if (
    error?.code === 18 ||
    codeName === 'AuthenticationFailed' ||
    /bad auth|auth(?:entication)? failed|AuthenticationFailed|SCRAM/i.test(
      combinedMessage,
    )
  ) {
    return {
      category: 'authentication',
      detail:
        'MongoDB rejected the configured username/password. Verify the Atlas database user, password, authSource, and URL-encode special characters in the username or password.',
    };
  }

  if (
    name === 'MongoParseError' ||
    /Invalid scheme|connection string|URI malformed|query string/i.test(combinedMessage)
  ) {
    return {
      category: 'configuration',
      detail:
        'The MongoDB connection string is malformed. It must start with mongodb:// or mongodb+srv:// and include a host; include /<database-name> before query parameters.',
    };
  }

  if (
    name === 'MongoNetworkError' ||
    name === 'MongoServerSelectionError' ||
    /ENOTFOUND|ECONNREFUSED|ETIMEDOUT|ESERVFAIL|querySrv|server selection timed out/i.test(combinedMessage)
  ) {
    return {
      category: 'network',
      detail:
        'MongoDB could not be reached. Check DNS, IP access list, cluster status, connection host, and network/firewall access.',
    };
  }

  return {
    category: 'unknown',
    detail: 'MongoDB connection failed before the server could start.',
  };
}

export async function connectDatabase() {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
  logMongoConfiguration();

  if (env.mongoInfo.passwordLooksPlaceholder) {
    console.error(
      'MongoDB connection failed (configuration): MONGO_URI contains a placeholder password.',
    );
    console.error(
      'Replace the password in the environment variable with the real Atlas database user password. URL-encode special characters such as @, :, /, ?, #, [, ], and %.',
    );
    process.exit(1);
  }

  try {
    await mongoose.connect(env.mongoUri);
    console.log(
      `MongoDB connected: database=${
        mongoose.connection.name || env.mongoInfo.databaseName || '[default]'
      }`,
    );
  } catch (error) {
    const { category, detail } = classifyMongoConnectionError(error);

    console.error(`MongoDB connection failed (${category}): ${error.message}`);
    console.error(detail);
    process.exit(1);
  }
}
