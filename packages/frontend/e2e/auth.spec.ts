import { test, expect } from '@playwright/test';

/**
 * E2Eテスト: 認証フロー
 *
 * このテストは認証に関する重要なフローを検証します。
 * - ログイン
 * - 認証状態の確認
 * - ログアウト
 */

test.describe('認証フロー', () => {
  test.beforeEach(async ({ page }) => {
    // モック認証を有効化
    await page.addInitScript(() => {
      localStorage.setItem('mock_auth_enabled', 'true');
    });
  });

  test('ログインページが正常に表示される', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'ログイン' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'ログイン' })).toBeVisible();
  });

  test('モック認証でログインできる', async ({ page }) => {
    await page.goto('/login');

    // モック認証情報を設定
    await page.addInitScript(() => {
      localStorage.setItem(
        'mock_user',
        JSON.stringify({
          id: 'test-user-id',
          email: 'test@example.com',
          name: 'Test User',
          profileComplete: true,
        })
      );
      localStorage.setItem('mock_token', 'mock-jwt-token');
    });

    // ログインボタンをクリック
    await page.getByRole('button', { name: 'ログイン' }).click();

    // ログイン後のページが表示されることを確認
    await expect(page).toHaveURL('/');
  });

  test('認証済み状態で保護されたページにアクセスできる', async ({ page }) => {
    // 認証情報を設定
    await page.addInitScript(() => {
      localStorage.setItem(
        'mock_user',
        JSON.stringify({
          id: 'test-user-id',
          email: 'test@example.com',
          name: 'Test User',
          profileComplete: true,
        })
      );
      localStorage.setItem('mock_token', 'mock-jwt-token');
    });

    // 保護されたページに直接アクセス
    await page.goto('/mandala/create/goal');

    // ページが表示されることを確認
    await expect(page).toHaveURL('/mandala/create/goal');
  });

  test('ログアウト後は保護されたページにアクセスできない', async ({ page }) => {
    // 一度ログイン
    await page.addInitScript(() => {
      localStorage.setItem(
        'mock_user',
        JSON.stringify({
          id: 'test-user-id',
          email: 'test@example.com',
          name: 'Test User',
          profileComplete: true,
        })
      );
      localStorage.setItem('mock_token', 'mock-jwt-token');
    });

    await page.goto('/');

    // ログアウト（実装に応じて調整）
    await page.evaluate(() => {
      localStorage.removeItem('mock_user');
      localStorage.removeItem('mock_token');
    });

    // 保護されたページにアクセスしようとするとログインページにリダイレクト
    await page.goto('/mandala/create/goal');
    await page.waitForURL('**/login', { timeout: 5000 });
    await expect(page.getByRole('heading', { name: 'ログイン' })).toBeVisible();
  });
});
