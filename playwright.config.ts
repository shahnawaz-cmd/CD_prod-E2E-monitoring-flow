import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  // Test execution timeout set to 120 minutes (7,200,000 ms)
  timeout: 7_200_000,
  globalTimeout: 7_200_000,
  // Enable retries (2 retries in CI, 1 retry locally).
  // Tests failing on attempt 1 but passing on retry are automatically marked as 'flaky'.
  retries: process.env.CI ? 2 : 1,
  // Run with 2 workers per matrix batch for accelerated execution
  workers: 2,
  reporter: [['html'], ['list']],
  use: {
    baseURL: 'https://classicdecoder.com/',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'Mobile Safari',
      use: {
        ...devices['iPhone 15 Pro Max'],
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
      },
    },
    {
      name: 'Desktop Chrome',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
    {
      name: 'Mobile Chrome',
      use: {
        ...devices['Pixel 7'],
      },
    },
  ],
});
