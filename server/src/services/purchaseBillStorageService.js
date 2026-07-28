import crypto from 'crypto';
import path from 'path';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createHttpError } from '../utils/httpError.js';

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

const ALLOWED_EXTENSIONS = new Set([
  '.pdf',
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
]);

function getAwsRegion() {
  const region = process.env.AWS_REGION;

  if (!region) {
    throw new Error('AWS_REGION is not configured.');
  }

  return region;
}

function getBucketName() {
  const bucketName = process.env.AWS_S3_BUCKET;

  if (!bucketName) {
    throw new Error('AWS_S3_BUCKET is not configured.');
  }

  return bucketName;
}

/**
 * Let the AWS SDK resolve credentials from:
 * environment variables, IAM role, ECS, EC2, etc.
 */
let s3Client;

function getS3Client() {
  if (!s3Client) {
    s3Client = new S3Client({
      region: getAwsRegion(),
    });
  }

  return s3Client;
}

function getSafeExtension(originalName = '') {
  const extension = path
    .extname(originalName)
    .toLowerCase();

  return ALLOWED_EXTENSIONS.has(extension)
    ? extension
    : '';
}

function sanitizeOriginalName(originalName = '') {
  const baseName = path.basename(originalName);

  return baseName
    .replace(/[\r\n"]/g, '')
    .trim()
    .slice(0, 255);
}

function validateFile(file) {
  if (!file) {
    throw createHttpError(
      400,
      'Purchase bill file is required.',
    );
  }

  if (!file.buffer) {
    throw createHttpError(
      500,
      'Bill file buffer is missing. Multer must use memoryStorage().',
    );
  }

  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    throw createHttpError(
      400,
      'Unsupported bill file type. Only PDF, JPG, PNG and WEBP are allowed.',
    );
  }

  const extension = getSafeExtension(
    file.originalname,
  );

  if (!extension) {
    throw createHttpError(
      400,
      'Unsupported bill file extension.',
    );
  }

  if (!Number.isFinite(file.size) || file.size <= 0) {
    throw createHttpError(
      400,
      'Purchase bill file is empty.',
    );
  }

  return extension;
}

export async function uploadPurchaseBill(file) {
  if (!file) return null;

  const extension = validateFile(file);

  const filename =
    `${Date.now()}-${crypto.randomUUID()}${extension}`;

  const storagePath =
    `purchase-bills/${filename}`;

  const originalName = sanitizeOriginalName(
    file.originalname,
  );

  await getS3Client().send(
    new PutObjectCommand({
      Bucket: getBucketName(),
      Key: storagePath,
      Body: file.buffer,
      ContentType: file.mimetype,

      Metadata: {
        originalname: originalName,
      },
    }),
  );

  return {
    originalName,
    filename,
    mimeType: file.mimetype,
    size: file.size,
    storagePath,
    url: null,
    uploadedAt: new Date(),
  };
}

export async function deletePurchaseBill(
  storagePath,
) {
  if (!storagePath) return;

  await getS3Client().send(
    new DeleteObjectCommand({
      Bucket: getBucketName(),
      Key: storagePath,
    }),
  );
}

export async function getPurchaseBillSignedUrl(
  storagePath,
  options = {},
) {
  if (!storagePath) {
    throw new Error(
      'Purchase bill storage path is required.',
    );
  }

  const expiresIn = Math.min(
    900,
    Math.max(
      60,
      Number(options.expiresIn) || 300,
    ),
  );

  const originalName =
    sanitizeOriginalName(
      options.originalName ||
        'purchase-bill',
    );

  const command = new GetObjectCommand({
    Bucket: getBucketName(),
    Key: storagePath,

    ResponseContentDisposition:
      `inline; filename="${originalName}"`,
  });

  return getSignedUrl(
    getS3Client(),
    command,
    {
      expiresIn,
    },
  );
}
