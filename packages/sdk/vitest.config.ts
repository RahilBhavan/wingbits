import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    coverage: {
      provider: 'v8',
      thresholds: { lines: 90, functions: 90, branches: 85, statements: 90 },
      include: ['src/**'],
      exclude: ['src/index.ts'],
    },
    setupFiles: ['./tests/setup.ts'],
  },
});
