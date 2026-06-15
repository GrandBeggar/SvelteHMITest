import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { resolve } from 'path';

export default defineConfig({
  plugins: [svelte()],
  resolve: {
    conditions: ['browser'],
    alias: {
      $lib: resolve(import.meta.dirname, 'src/lib'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: false,
    restoreMocks: true,
  },
});
