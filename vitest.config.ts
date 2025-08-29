import { defineConfig, configDefaults } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'node',
    exclude: [
      ...configDefaults.exclude,
      '**/plugin-system.sandbox.test.ts',
      '**/plugin-system.test.ts',
    ],
  },
});
