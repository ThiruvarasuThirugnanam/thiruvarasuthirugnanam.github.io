import { defineConfig } from 'vite';

export default defineConfig({
  // Served from the root of thiruvarasuthirugnanam.com, so base is '/'.
  base: '/',

  build: {
    outDir: 'dist',
    // Named 'static' so Vite's hashed bundles never collide with the
    // files you hand-place in public/assets/ (the resume PDF lives there).
    assetsDir: 'static',
    target: 'es2019',
    sourcemap: false,
    chunkSizeWarningLimit: 900,
  },

  server: {
    port: 5173,
    open: true,
  },
});
