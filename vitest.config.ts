import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const appRoot = fileURLToPath(new URL('./app', import.meta.url));

export default defineConfig({
  test: {
    environment: 'happy-dom',
    include: ['tests/**/*.test.ts'],
    restoreMocks: true,
  },
  resolve: {
    alias: {
      '~': appRoot,
      '@': appRoot,
    },
  },
});
