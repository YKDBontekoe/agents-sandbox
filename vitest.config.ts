import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'node',
    exclude: ['src/lib/plugin-system.test.ts', 'src/lib/utils.test.ts'],
    include: ['src/**/*.{test,spec}.ts', 'tests/**/*.{test,spec}.ts'],
  },
});
