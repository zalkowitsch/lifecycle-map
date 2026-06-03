import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

// GitHub Pages serves from /lifecycle-map/, so we need the base path
// in production. Dev uses '/' so localhost:5173 works normally.
export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? '/lifecycle-map/' : '/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5173,
    open: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    target: 'es2022',
    rollupOptions: {
      output: {
        manualChunks: {
          // pako and js-yaml are loaded at boot but heavy — split them
          'vendor-compress': ['pako'],
          'vendor-yaml': ['js-yaml'],
        },
      },
    },
  },
}));
