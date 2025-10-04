import { test, expect } from '@playwright/test';

test.describe('Smoke Test', () => {
  test.beforeEach(async ({ page }) => {
    // Setup mock auth
    await page.addInitScript(() => {
      localStorage.setItem('mock_auth_enabled', 'true');
      localStorage.setItem(
        'mock_user',
        JSON.stringify({
          id: 'test-user-id',
          email: 'test@example.com',
          name: 'Test User',
        })
      );
      localStorage.setItem('mock_token', 'mock-jwt-token');
    });
  });

  test('アプリケーションが正常に起動する', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toBeVisible();
  });

  test('ログインページにアクセスできる', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('h1')).toContainText('ログイン');
  });

  test('メイン機能にアクセスできる', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toBeVisible();
  });
});
