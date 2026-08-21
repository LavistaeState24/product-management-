const fallbackApiBaseUrl = import.meta.env.DEV
  ? 'http://localhost:5000/api'
  : '';

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || fallbackApiBaseUrl;

if (!API_BASE_URL) {
  throw new Error(
    'Missing VITE_API_BASE_URL for production build.',
  );
}

if (
  import.meta.env.PROD &&
  /\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(API_BASE_URL)
) {
  throw new Error(
    'VITE_API_BASE_URL must not point to localhost in production.',
  );
}
