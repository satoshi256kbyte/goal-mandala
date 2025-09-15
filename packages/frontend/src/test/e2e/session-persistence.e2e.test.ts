/**
 * セッション永続化のE2Eテスト
 */

import { test, expect } from '@playwright/test';

test.describe('セッション永続化', () => {
  test('ブラウザ再起動後もログイン状態が維持される', async ({ page }) => {
    // ログイン
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');

    // ダッシュボードに移動することを確認
    await expect(page).toHaveURL('/dashboard');

    // ローカルストレージにトークンが保存されていることを確認
    const token = await page.evaluate(() => localStorage.getItem('auth_access_token'));
    expect(token).toBeTruthy();

    // ページをリロード
    await page.reload();

    // ログイン状態が維持されていることを確認
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
  });

  test('タブを閉じて再度開いてもログイン状態が維持される', async ({ browser }) => {
    // 新しいページでログイン
    const page1 = await browser.newPage();
    await page1.goto('/login');
    await page1.fill('[data-testid="email-input"]', 'test@example.com');
    await page1.fill('[data-testid="password-input"]', 'password123');
    await page1.click('[data-testid="login-button"]');

    await expect(page1).toHaveURL('/dashboard');

    // ページを閉じる
    await page1.close();

    // 新しいページを開く
    const page2 = await browser.newPage();
    await page2.goto('/dashboard');

    // ログイン状態が維持されていることを確認
    await expect(page2).toHaveURL('/dashboard');
    await expect(page2.locator('[data-testid="dashboard-content"]')).toBeVisible();

    await page2.close();
  });

  test('期限切れトークンは自動的にクリアされる', async ({ page }) => {
    // 期限切れトークンをセット
    await page.goto('/');
    await page.evaluate(() => {
      const expiredToken = 'expired-token';
      const expiredState = JSON.stringify({
        isAuthenticated: true,
        user: { id: '1', email: 'test@example.com', name: 'Test User' },
        tokenExpirationTime: new Date(Date.now() - 3600000).toISOString(), // 1時間前
      });

      localStorage.setItem('auth_access_token', expiredToken);
      localStorage.setItem('auth_state', expiredState);
    });

    // 保護されたページにアクセス
    await page.goto('/dashboard');

    // ログインページにリダイレクトされることを確認
    await expect(page).toHaveURL('/login');

    // トークンがクリアされていることを確認
    const token = await page.evaluate(() => localStorage.getItem('auth_access_token'));
    expect(token).toBeNull();
  });
});
