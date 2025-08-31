import { defineConfig } from 'vitest/config';

export default defineConfig({
  css: {
    postcss: null,
  },
  test: {
    environment: 'node',
  },
});
