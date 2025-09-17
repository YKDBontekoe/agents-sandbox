import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@/utils/performance': resolve(__dirname, 'packages/utils/performance'),
      '@': resolve(__dirname, 'src'),
      '@arcane/ui': resolve(__dirname, 'packages/ui/src'),
      '@engine': resolve(__dirname, 'packages/engine/src'),
    },
  },
  test: {
    environment: 'node',
    environmentMatchGlobs: [
      [
        'src/state/**/*.test.{ts,tsx}',
        'jsdom',
      ],
      [
        'src/components/**/*.test.{ts,tsx}',
        'jsdom',
      ],
    ],
  },
});
