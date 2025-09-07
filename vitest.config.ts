import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@arcane/ui': resolve(__dirname, 'packages/ui/src'),
      '@engine': resolve(__dirname, 'packages/engine/src'),
    },
  },
  test: {
    environment: 'node',
  },
});
