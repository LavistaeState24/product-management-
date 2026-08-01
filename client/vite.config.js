import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiBaseUrl = env.VITE_API_BASE_URL || '';

  if (mode === 'production') {
    if (!apiBaseUrl) {
      throw new Error(
        'Missing VITE_API_BASE_URL for production build.',
      );
    }

    if (/\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(apiBaseUrl)) {
      throw new Error(
        'VITE_API_BASE_URL must not point to localhost in production.',
      );
    }
  }

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 5173,
    },
  };
});
