import { test, expect } from '@playwright/test';
import { AuthHelper } from '../helpers/auth';

test.describe('認証フロー統合テスト', () => {
  test('ログインページが正常に表示される', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'ログイン' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'ログイン' })).toBeVisible();
  });

  test('モック認証でログインできる', async ({ page }) => {
    const auth = new AuthHelper(page);

    // モック認証でログイン
    await auth.loginWithMock();
    await page.goto('/');

    // ログイン後のページが表示されることを確認
    await expect(page).toHaveURL('/');
  });

  test('認証済み状態で保護されたページにアクセスできる', async ({ page }) => {
    const auth = new AuthHelper(page);

    // 認証済み状態でページに移動
    await auth.gotoAuthenticated('/mandala/create/goal');

    // 保護されたページが表示されることを確認
    await expect(page).toHaveURL('/mandala/create/goal');
  });

  test('ログアウト後は保護されたページにアクセスできない', async ({ page }) => {
    const auth = new AuthHelper(page);

    // 一度ログインしてからログアウト
    await auth.loginWithMock();
    await auth.logout();

    // 保護されたページにアクセスしようとするとログインページにリダイレクト
    await page.goto('/mandala/create/goal');
    await page.waitForURL('**/login');
    await expect(page.getByRole('heading', { name: 'ログイン' })).toBeVisible();
  });
});
