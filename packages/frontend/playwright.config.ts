import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30000, // 30秒
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 2, // CI では1並列
  reporter: 'dot', // 最小限のレポート
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure', // 失敗時のみトレース
    screenshot: 'only-on-failure', // 失敗時のみスクリーンショット
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
    // Firefox, Safari は削除（Chromium のみ）
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
