import { defineConfig } from 'vite';

export default defineConfig({
  base: '/brainrot-survivors/', // GitHub Pages base path
  build: {
    assetsInlineLimit: 0,
    outDir: 'dist'
  },
  server: {
    port: 3000,
    open: true,
  },
});