/// <reference types="vitest/config" />
import path from 'node:path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Pinned: the API's CORS allowlist names this exact origin, so a busy port
  // that quietly moved the dev server to 5174 would fail every request from
  // the browser with no hint that the origin changed.
  server: {
    port: 5173,
    strictPort: true,
  },
  resolve: {
    alias: {
      '@api': path.resolve(import.meta.dirname, 'src/api'),
      '@components': path.resolve(import.meta.dirname, 'src/components'),
      '@lib': path.resolve(import.meta.dirname, 'src/lib'),
      '@pages': path.resolve(import.meta.dirname, 'src/pages'),
      '@routes': path.resolve(import.meta.dirname, 'src/routes'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.spec.{ts,tsx}'],
  },
});
