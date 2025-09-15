/**
 * 複数タブでの認証状態同期E2Eテスト
 */

import { test, expect } from '@playwright/test';

test.describe('複数タブでの認証状態同期', () => {
  test('一つのタブでログインすると他のタブでも認証状態が同期される', async ({ browser }) => {
    // 2つのタブを開く
    const page1 = await browser.newPage();
    const page2 = await browser.newPage();

    // 両方のタブでログインページを開く
    await page1.goto('/login');
    await page2.goto('/login');

    // タブ1でログイン
    await page1.fill('[data-testid="email-input"]', 'test@example.com');
    await page1.fill('[data-testid="password-input"]', 'password123');
    await page1.click('[data-testid="login-button"]');

    // タブ1がダッシュボードにリダイレクトされることを確認
    await expect(page1).toHaveURL('/dashboard');

    // タブ2でページをリロードして同期を確認
    await page2.reload();

    // タブ2もダッシュボードにリダイレクトされることを確認
    await expect(page2).toHaveURL('/dashboard');

    await page1.close();
    await page2.close();
  });

  test('一つのタブでログアウトすると他のタブでも認証状態が同期される', async ({ browser }) => {
    // 認証状態を事前にセット
    const context = await browser.newContext();
    await context.addInitScript(() => {
      localStorage.setItem('auth_access_token', 'valid-token');
      localStorage.setItem(
        'auth_state',
        JSON.stringify({
          isAuthenticated: true,
          user: { id: '1', email: 'test@example.com', name: 'Test User' },
        })
      );
    });

    // 2つのタブを開く
    const page1 = await context.newPage();
    const page2 = await context.newPage();

    // 両方のタブでダッシュボードを開く
    await page1.goto('/dashboard');
    await page2.goto('/dashboard');

    // 両方のタブでダッシュボードが表示されることを確認
    await expect(page1).toHaveURL('/dashboard');
    await expect(page2).toHaveURL('/dashboard');

    // タブ1でログアウト
    await page1.click('[data-testid="logout-button"]');

    // タブ1がログインページにリダイレクトされることを確認
    await expect(page1).toHaveURL('/login');

    // タブ2でページをリロードして同期を確認
    await page2.reload();

    // タブ2もログインページにリダイレクトされることを確認
    await expect(page2).toHaveURL('/login');

    await context.close();
  });

  test('トークン更新が複数タブで同期される', async ({ browser }) => {
    // 認証状態を事前にセット
    const context = await browser.newContext();
    await context.addInitScript(() => {
      localStorage.setItem('auth_access_token', 'old-token');
      localStorage.setItem('auth_refresh_token', 'refresh-token');
      localStorage.setItem(
        'auth_state',
        JSON.stringify({
          isAuthenticated: true,
          user: { id: '1', email: 'test@example.com', name: 'Test User' },
          tokenExpirationTime: new Date(Date.now() + 300000).toISOString(),
        })
      );
    });

    // 2つのタブを開く
    const page1 = await context.newPage();
    const page2 = await context.newPage();

    // トークン更新APIをモック
    await page1.route('**/api/auth/refresh', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          accessToken: 'new-token',
          expiresIn: 3600,
        }),
      });
    });

    await page2.route('**/api/auth/refresh', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          accessToken: 'new-token',
          expiresIn: 3600,
        }),
      });
    });

    // 両方のタブでダッシュボードを開く
    await page1.goto('/dashboard');
    await page2.goto('/dashboard');

    // タブ1でトークン更新をトリガー
    await page1.click('[data-testid="refresh-token-button"]');

    // 少し待機
    await page1.waitForTimeout(1000);

    // 両方のタブで新しいトークンが設定されていることを確認
    const token1 = await page1.evaluate(() => localStorage.getItem('auth_access_token'));
    const token2 = await page2.evaluate(() => localStorage.getItem('auth_access_token'));

    expect(token1).toBe('new-token');
    expect(token2).toBe('new-token');

    await context.close();
  });

  test('ネットワークエラー時の同期動作', async ({ browser }) => {
    // 認証状態を事前にセット
    const context = await browser.newContext();
    await context.addInitScript(() => {
      localStorage.setItem('auth_access_token', 'valid-token');
      localStorage.setItem(
        'auth_state',
        JSON.stringify({
          isAuthenticated: true,
          user: { id: '1', email: 'test@example.com', name: 'Test User' },
        })
      );
    });

    // 2つのタブを開く
    const page1 = await context.newPage();
    const page2 = await context.newPage();

    // ネットワークエラーをシミュレート
    await page1.route('**/api/**', route => {
      route.abort('failed');
    });

    // 両方のタブでダッシュボードを開く
    await page1.goto('/dashboard');
    await page2.goto('/dashboard');

    // タブ1でAPIリクエストを実行（エラーが発生）
    await page1.click('[data-testid="api-request-button"]');

    // エラー通知が表示されることを確認
    await expect(page1.locator('[data-testid="network-error-notification"]')).toBeVisible();

    // タブ2では正常に動作することを確認
    await expect(page2.locator('[data-testid="dashboard-content"]')).toBeVisible();

    await context.close();
  });
});
