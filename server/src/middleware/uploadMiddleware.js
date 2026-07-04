import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { createHttpError } from '../utils/httpError.js';

const uploadRoot = path.resolve(process.cwd(), 'uploads', 'bills');

fs.mkdirSync(uploadRoot, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadRoot);
  },
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname || '').toLowerCase();
    const safeName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`;
    cb(null, safeName);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = new Set([
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
    ]);

    if (!allowedMimeTypes.has(file.mimetype)) {
      cb(createHttpError(400, 'Only PDF, JPG, PNG, and WEBP bill files are allowed.'));
      return;
    }

    cb(null, true);
  },
});

export const uploadBill = upload.single('billUpload');
