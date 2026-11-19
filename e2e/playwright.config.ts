import { defineConfig, devices } from '@playwright/test';
import { getTarget, requireEnv } from './utils/env.ts';

// TARGET=local (default) runs against the frontend dev server, started for you if it is not running.
// TARGET=staging runs against STAGING_URL and starts nothing.
const target = getTarget();
const baseURL =
  target === 'staging'
    ? requireEnv('STAGING_URL')
    : (process.env.LOCAL_URL ?? 'http://localhost:5173');

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  // No retries: login tests count against the lockout (FR-AUTH-04) and the
  // 10 logins/min per IP limit (NFR-SEC-07), so a retry can lock the test account.
  retries: 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    headless: process.env.HEADLESS !== 'false',
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  // Chrome only for now. SRS §5.4 also lists Firefox, Edge and Safari: add them as projects when needed.
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // Local only: start the frontend unless it is already running.
  webServer:
    target === 'local'
      ? {
          command: 'npm run dev --prefix ../frontend',
          url: baseURL,
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
        }
      : undefined,
});
