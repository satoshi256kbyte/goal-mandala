import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : 1,
  reporter: process.env.CI ? 'github' : 'line',
  timeout: 30000, // Increased timeout to 30 seconds
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'off',
    screenshot: 'off',
    video: 'off',
    headless: true,
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        headless: true,
        launchOptions: {
          args: ['--disable-web-security'],
        },
      },
    },
    // Enable other browsers only in CI or when explicitly requested
    ...(process.env.CI || process.env.ALL_BROWSERS
      ? [
          {
            name: 'firefox',
            use: {
              ...devices['Desktop Firefox'],
              headless: true,
            },
          },
          {
            name: 'webkit',
            use: {
              ...devices['Desktop Safari'],
              headless: true,
            },
          },
        ]
      : []),
  ],

  webServer: {
    command: 'VITE_MOCK_AUTH_ENABLED=true npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
    env: {
      VITE_MOCK_AUTH_ENABLED: 'true',
    },
  },
});
