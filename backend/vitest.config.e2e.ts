import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    // Loads backend/.env.test on your laptop. In CI the values come from ci.yml.
    // Real environment variables always win over the file.
    env: loadEnv('test', process.cwd(), ''),
    setupFiles: ['./test/setup-e2e.ts'],
    // Test files share one database, so run them one at a time.
    fileParallelism: false,
    // Starting the app and hashing passwords can be slow on some laptops.
    hookTimeout: 30_000,
    testTimeout: 30_000,
  },
});
