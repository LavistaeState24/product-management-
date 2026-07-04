import fs from 'fs/promises';
import { validationResult } from 'express-validator';

async function removeUploadedFile(req) {
  if (!req.file?.path) {
    return;
  }

  try {
    await fs.unlink(req.file.path);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error(error);
    }
  }
}

export async function validateRequest(req, res, next) {
  const result = validationResult(req);

  if (result.isEmpty()) {
    return next();
  }

  await removeUploadedFile(req);

  return res.status(422).json({
    message: 'Validation failed.',
    errors: result.array().map((item) => ({
      field: item.path,
      message: item.msg,
    })),
  });
}
