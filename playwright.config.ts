import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',

  // The assignment app uses one shared local DB.
  // Running lifecycle tests in parallel can cause reset/scan/status race conditions.
  workers: 1,
  fullyParallel: false,

  timeout: 120_000,

  expect: {
    timeout: 10_000,
  },

  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
  ],

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],
});