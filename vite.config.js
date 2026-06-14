import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { resolve } from 'path';

export default defineConfig({
  plugins: [svelte()],
  resolve: {
    alias: {
      '$lib': resolve(import.meta.dirname, 'src/lib'),
    },
  },
  server: {
    proxy: {
      '/api/ws': {
        target: 'http://localhost:3001',
        ws: true,
      },
      '/api/health': 'http://localhost:3001',
    },
  },
});
