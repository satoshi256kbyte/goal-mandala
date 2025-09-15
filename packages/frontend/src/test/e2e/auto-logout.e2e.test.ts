/**
 * 自動ログアウトのE2Eテスト
 */

import { test, expect } from '@playwright/test';

test.describe('自動ログアウト', () => {
  test('トークン期限切れ時に自動ログアウトされる', async ({ page }) => {
    // 短い有効期限のトークンをセット
    await page.goto('/');
    await page.evaluate(() => {
      const shortLivedToken = 'short-lived-token';
      const shortLivedState = JSON.stringify({
        isAuthenticated: true,
        user: { id: '1', email: 'test@example.com', name: 'Test User' },
        tokenExpirationTime: new Date(Date.now() + 2000).toISOString(), // 2秒後に期限切れ
      });

      localStorage.setItem('auth_access_token', shortLivedToken);
      localStorage.setItem('auth_state', shortLivedState);
    });

    // ダッシュボードに移動
    await page.goto('/dashboard');
    await expect(page).toHaveURL('/dashboard');

    // 3秒待機（トークン期限切れを待つ）
    await page.waitForTimeout(3000);

    // 自動ログアウトされてログインページにリダイレクトされることを確認
    await expect(page).toHaveURL('/login');

    // ログアウト通知が表示されることを確認
    await expect(page.locator('[data-testid="logout-notification"]')).toBeVisible();
  });

  test('非アクティブタイムアウト時に自動ログアウトされる', async ({ page }) => {
    // 短い非アクティブタイムアウトを設定
    await page.goto('/');
    await page.evaluate(() => {
      // 非アクティブタイムアウトを5秒に設定
      window.authConfig = {
        inactivityTimeout: 5000,
      };

      localStorage.setItem('auth_access_token', 'valid-token');
      localStorage.setItem(
        'auth_state',
        JSON.stringify({
          isAuthenticated: true,
          user: { id: '1', email: 'test@example.com', name: 'Test User' },
          lastActivity: new Date().toISOString(),
        })
      );
    });

    // ダッシュボードに移動
    await page.goto('/dashboard');
    await expect(page).toHaveURL('/dashboard');

    // 6秒間非アクティブ状態を維持
    await page.waitForTimeout(6000);

    // 自動ログアウトされることを確認
    await expect(page).toHaveURL('/login');

    // タイムアウト通知が表示されることを確認
    await expect(page.locator('[data-testid="timeout-notification"]')).toBeVisible();
  });

  test('401エラー時に自動ログアウトされる', async ({ page }) => {
    // APIリクエストで401エラーをモック
    await page.route('**/api/**', route => {
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Unauthorized' }),
      });
    });

    // 認証状態をセット
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('auth_access_token', 'invalid-token');
      localStorage.setItem(
        'auth_state',
        JSON.stringify({
          isAuthenticated: true,
          user: { id: '1', email: 'test@example.com', name: 'Test User' },
        })
      );
    });

    // ダッシュボードに移動
    await page.goto('/dashboard');

    // APIリクエストをトリガー
    await page.click('[data-testid="refresh-data-button"]');

    // 401エラーにより自動ログアウトされることを確認
    await expect(page).toHaveURL('/login');

    // エラー通知が表示されることを確認
    await expect(page.locator('[data-testid="auth-error-notification"]')).toBeVisible();
  });
});
