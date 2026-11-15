import { defineConfig } from 'vite';

// Relative base so the build works on any static host (GitHub Pages subpaths included).
export default defineConfig({
  base: './',
  server: { host: true },
  build: { chunkSizeWarningLimit: 800 }, // three.js alone is ~500 kB
});
