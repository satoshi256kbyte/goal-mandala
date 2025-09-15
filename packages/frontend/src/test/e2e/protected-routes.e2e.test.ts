/**
 * 保護されたルートのアクセス制御E2Eテスト
 */

import { test, expect } from '@playwright/test';

test.describe('保護されたルートのアクセス制御', () => {
  test.beforeEach(async ({ page }) => {
    // テスト前にローカルストレージをクリア
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('未認証ユーザーは保護されたページにアクセスできない', async ({ page }) => {
    // 保護されたページにアクセス
    await page.goto('/dashboard');

    // ログインページにリダイレクトされることを確認
    await expect(page).toHaveURL('/login');

    // ログインフォームが表示されることを確認
    await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
  });

  test('認証済みユーザーは保護されたページにアクセスできる', async ({ page }) => {
    // ログインページに移動
    await page.goto('/login');

    // ログイン
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');

    // ダッシュボードにリダイレクトされることを確認
    await expect(page).toHaveURL('/dashboard');

    // ダッシュボードコンテンツが表示されることを確認
    await expect(page.locator('[data-testid="dashboard-content"]')).toBeVisible();
  });

  test('認証済みユーザーがログインページにアクセスするとダッシュボードにリダイレクトされる', async ({
    page,
  }) => {
    // 認証状態をセット
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('auth_access_token', 'mock-token');
      localStorage.setItem(
        'auth_state',
        JSON.stringify({
          isAuthenticated: true,
          user: { id: '1', email: 'test@example.com', name: 'Test User' },
        })
      );
    });

    // ログインページにアクセス
    await page.goto('/login');

    // ダッシュボードにリダイレクトされることを確認
    await expect(page).toHaveURL('/dashboard');
  });

  test('ログアウト後は保護されたページにアクセスできない', async ({ page }) => {
    // 認証状態をセット
    await page.goto('/dashboard');
    await page.evaluate(() => {
      localStorage.setItem('auth_access_token', 'mock-token');
      localStorage.setItem(
        'auth_state',
        JSON.stringify({
          isAuthenticated: true,
          user: { id: '1', email: 'test@example.com', name: 'Test User' },
        })
      );
    });

    await page.reload();

    // ログアウト
    await page.click('[data-testid="logout-button"]');

    // ログインページにリダイレクトされることを確認
    await expect(page).toHaveURL('/login');

    // 保護されたページに再度アクセス
    await page.goto('/dashboard');

    // ログインページにリダイレクトされることを確認
    await expect(page).toHaveURL('/login');
  });
});
