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
        // The DatabasePanel facade module is named "index" (src/components/
        // DatabasePanel/index.ts), which Rollup would otherwise reuse to name
        // its own dynamic-import chunk "index-<hash>.js" — colliding in name
        // (though not in content) with the real entry chunk. Force a distinct
        // name so build tooling (and code-split verification scripts) can
        // unambiguously tell the lazy Glide-grid chunk apart from the main one.
        chunkFileNames: (chunkInfo) =>
          chunkInfo.moduleIds?.some((id) => id.includes('/components/DatabasePanel/'))
            ? 'assets/database-panel-[hash].js'
            : 'assets/[name]-[hash].js',
      },
    },
  },
}));
