import dotenv from 'dotenv';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const initialNodeEnv = process.env.NODE_ENV || 'development';
const protectedEnvKeys = new Set(Object.keys(process.env));
const serverRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const envSources = new Map();
const loadedEnvFiles = [];

function loadEnvFile(fileName) {
  const filePath = resolve(serverRoot, fileName);

  if (!existsSync(filePath)) {
    return;
  }

  const parsed = dotenv.parse(readFileSync(filePath));
  loadedEnvFiles.push(fileName);

  for (const [key, value] of Object.entries(parsed)) {
    if (protectedEnvKeys.has(key)) {
      envSources.set(key, 'process environment');
      continue;
    }

    process.env[key] = value;
    envSources.set(key, fileName);
  }
}

['.env', '.env.local'].forEach(loadEnvFile);

const runtimeNodeEnv = process.env.NODE_ENV || initialNodeEnv;
const nodeEnv = runtimeNodeEnv;
const isProduction = nodeEnv === 'production';

[
  `.env.${runtimeNodeEnv}`,
  `.env.${runtimeNodeEnv}.local`,
].forEach(loadEnvFile);

function getEnvValue(name, aliases = []) {
  return [
    name,
    ...aliases,
  ]
    .map((key) => process.env[key])
    .find((value) => value != null && value !== '');
}

function getEnvSource(name, aliases = []) {
  return [
    name,
    ...aliases,
  ].find((key) => process.env[key] != null && process.env[key] !== '');
}

function required(name, options = {}) {
  const value =
    getEnvValue(name, options.aliases) ||
    options.fallback;

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function optional(name, fallback = '') {
  return getEnvValue(name) || fallback;
}

function optionalBoolean(name, fallback = false) {
  const value = getEnvValue(name);

  if (value == null) {
    return fallback;
  }

  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

function parseOriginList(value) {
  return String(value || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
    .map((origin) => origin.replace(/\/+$/, ''));
}

function redact(value) {
  return value ? '[set]' : '[not set]';
}

function safeDecodeURIComponent(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function parseMongoUri(uri) {
  const match = uri.match(/^(mongodb(?:\+srv)?):\/\/(.+)$/i);

  if (!match) {
    throw new Error('MONGO_URI must start with mongodb:// or mongodb+srv://.');
  }

  const [, , uriBody] = match;
  const queryStart = uriBody.indexOf('?');
  const withoutQuery =
    queryStart === -1 ? uriBody : uriBody.slice(0, queryStart);
  const pathStart = withoutQuery.indexOf('/');
  const authority =
    pathStart === -1 ? withoutQuery : withoutQuery.slice(0, pathStart);
  const pathname = pathStart === -1 ? '' : withoutQuery.slice(pathStart + 1);
  const authEnd = authority.lastIndexOf('@');
  const auth = authEnd === -1 ? '' : authority.slice(0, authEnd);
  const host = authEnd === -1 ? authority : authority.slice(authEnd + 1);
  const usernameEnd = auth.indexOf(':');
  const encodedUsername = usernameEnd === -1 ? auth : auth.slice(0, usernameEnd);
  const encodedPassword = usernameEnd === -1 ? '' : auth.slice(usernameEnd + 1);

  if (!host) {
    throw new Error('MONGO_URI must include a MongoDB host.');
  }

  const databaseName = pathname ? safeDecodeURIComponent(pathname) : '';
  const decodedPassword = safeDecodeURIComponent(encodedPassword);

  return {
    host,
    databaseName,
    username: encodedUsername
      ? safeDecodeURIComponent(encodedUsername)
      : '[not set]',
    hasPassword: Boolean(encodedPassword),
    passwordLooksPlaceholder: Boolean(
      decodedPassword &&
      (/^\*+$/.test(decodedPassword) ||
        /^<.+>$/.test(decodedPassword) ||
        /^replace[-_]/i.test(decodedPassword) ||
        /^your[-_]/i.test(decodedPassword)),
    ),
    uriHasDatabaseName: Boolean(databaseName),
  };
}

function assertProductionConfig(config) {
  if (!config.isProduction) {
    return;
  }

  if (/localhost|127\.0\.0\.1|operations-crm-dev/.test(config.mongoUri)) {
    throw new Error(
      'MONGO_URI must point to a production database when NODE_ENV=production.',
    );
  }

  if (
    config.clientUrls.some((clientUrl) =>
      /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(clientUrl),
    )
  ) {
    throw new Error(
      'CLIENT_URL must point to the deployed frontend when NODE_ENV=production.',
    );
  }

  if (!process.env.AWS_REGION || !process.env.AWS_S3_BUCKET) {
    throw new Error(
      'AWS_REGION and AWS_S3_BUCKET are required when NODE_ENV=production.',
    );
  }
}

const mongoEnvKey = getEnvSource('MONGO_URI', ['MONGO_URL']);
const mongoUri = required('MONGO_URI', {
  aliases: ['MONGO_URL'],
  fallback: isProduction
    ? undefined
    : 'mongodb://127.0.0.1:27017/operations-crm-dev',
});
const mongoInfo = parseMongoUri(mongoUri);
const clientUrl = required('CLIENT_URL', {
  fallback: isProduction
    ? undefined
    : 'http://localhost:5173',
});

export const env = {
  nodeEnv,
  isProduction,
  port: Number(process.env.PORT || 5000),
  mongoUri,
  mongoInfo,
  mongoUriSource: mongoEnvKey
    ? envSources.get(mongoEnvKey) || 'process environment'
    : 'development fallback',
  loadedEnvFiles,
  jwtSecret: required('JWT_SECRET', {
    fallback: isProduction
      ? undefined
      : 'super-secret-change-me',
  }),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  clientUrl,
  clientUrls: parseOriginList(clientUrl),
  bossName: optional('BOSS_NAME', 'Operations Boss'),
  bossEmail: optional(
    'BOSS_EMAIL',
    isProduction ? '' : 'boss@operationscrm.com',
  ),
  bossPassword: optional(
    'BOSS_PASSWORD',
    isProduction ? '' : 'Boss@12345',
  ),
  authDebug: optionalBoolean('AUTH_DEBUG', false),
};

assertProductionConfig(env);

export function logMongoConfiguration() {
  console.log(
    [
      'MongoDB configuration:',
      `host=${env.mongoInfo.host}`,
      `database=${env.mongoInfo.databaseName || '[not specified]'}`,
      `username=${env.mongoInfo.username}`,
      `password=${
        env.mongoInfo.passwordLooksPlaceholder
          ? '[placeholder]'
          : redact(env.mongoInfo.hasPassword)
      }`,
      `uriSource=${env.mongoUriSource}`,
      `loadedEnvFiles=${
        env.loadedEnvFiles.length ? env.loadedEnvFiles.join(',') : '[none]'
      }`,
    ].join(' '),
  );

  if (!env.mongoInfo.uriHasDatabaseName) {
    console.warn(
      'MongoDB configuration warning: MONGO_URI does not include a database name in the path. Add /<database-name> before query parameters to avoid connecting to the driver default database.',
    );
  }
}
