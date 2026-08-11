import fs from 'fs/promises';

export function notFoundHandler(req, res) {
  return res.status(404).json({
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}

export function errorHandler(error, req, res, next) {
  console.error(error);

  if (res.headersSent) {
    return next(error);
  }

  if (req.file?.path) {
    fs.unlink(req.file.path).catch((unlinkError) => {
      if (unlinkError.code !== 'ENOENT') {
        console.error(unlinkError);
      }
    });
  }

  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      message: 'File upload must be 10 MB or smaller.',
    });
  }

  return res.status(error.statusCode || 500).json({
    message: error.message || 'Internal server error.',
  });
}
