import { test, expect } from '@playwright/test';

test.describe('Smoke Test', () => {
  test('アプリケーションが正常に起動する', async ({ page }) => {
    // Setup mock auth for authenticated test
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

    await page.goto('/');
    await expect(page.locator('h1')).toBeVisible();
  });

  test('ログインページにアクセスできる', async ({ page }) => {
    // No auth setup for login page test
    await page.addInitScript(() => {
      localStorage.setItem('mock_auth_enabled', 'true');
      // Clear any existing auth data
      localStorage.removeItem('mock_user');
      localStorage.removeItem('mock_token');
    });

    await page.goto('/login');
    await expect(page.locator('h1')).toContainText('ログイン');
  });

  test('メイン機能にアクセスできる', async ({ page }) => {
    // Setup mock auth for authenticated test
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

    await page.goto('/');
    await expect(page.locator('h1')).toBeVisible();
  });
});
