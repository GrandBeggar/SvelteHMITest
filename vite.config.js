import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { resolve } from 'path';

const backendTarget = process.env.HMI_BACKEND_URL ?? 'http://localhost:3001';

export default defineConfig({
  plugins: [svelte()],
  resolve: {
    alias: {
      $lib: resolve(import.meta.dirname, 'src/lib'),
    },
  },
  server: {
    proxy: {
      '/api/ws': {
        target: backendTarget,
        ws: true,
      },
      '/api/health': backendTarget,
    },
  },
});
