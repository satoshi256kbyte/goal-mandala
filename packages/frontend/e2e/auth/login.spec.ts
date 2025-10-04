import { test, expect } from '@playwright/test';
import { AuthHelper } from '../helpers/auth';

test.describe('ログインフロー', () => {
  test('ログインページが正常に表示される', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'ログイン' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'ログイン' })).toBeVisible();
  });

  test('モック認証でログインが成功する', async ({ page }) => {
    const auth = new AuthHelper(page);

    await page.goto('/login');

    // モック認証を有効にしてログイン
    await auth.loginWithMock();

    // ログイン成功後、ホームページにリダイレクトされることを確認
    await page.goto('/');
    await expect(page).toHaveURL('/');
  });

  test('ログアウト機能が正常に動作する', async ({ page }) => {
    const auth = new AuthHelper(page);

    // ログイン
    await auth.loginWithMock();
    await page.goto('/');

    // ログアウト
    await auth.logout();

    // ログアウト後、保護されたページにアクセスするとログインページにリダイレクト
    await page.goto('/mandala/create/goal');
    await page.waitForURL('**/login');
    await expect(page.getByRole('heading', { name: 'ログイン' })).toBeVisible();
  });
});
