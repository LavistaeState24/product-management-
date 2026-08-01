import multer from 'multer';
import { createHttpError } from '../utils/httpError.js';

const allowedMimeTypes = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

const storage = multer.memoryStorage();

const upload = multer({
  storage,

  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 1,
  },

  fileFilter: (req, file, cb) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      cb(
        createHttpError(
          400,
          'Only PDF, JPG, PNG, and WEBP bill files are allowed.',
        ),
      );
      return;
    }

    cb(null, true);
  },
});

export const uploadBill = upload.single('billUpload');