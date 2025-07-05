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
    // Force cache refresh in development
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  },
});