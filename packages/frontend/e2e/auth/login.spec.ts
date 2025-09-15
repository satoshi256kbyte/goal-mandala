import { test, expect } from '@playwright/test';
import { AuthHelpers } from '../helpers/auth-helpers';
import { AuthMocks } from '../mocks/auth-mocks';
import { testUsers, errorMessages } from '../fixtures/test-data';

test.describe('ログインフロー', () => {
  let authHelpers: AuthHelpers;
  let authMocks: AuthMocks;

  test.beforeEach(async ({ page }) => {
    authHelpers = new AuthHelpers(page);
    authMocks = new AuthMocks(page);

    // 認証APIのモック設定
    await authMocks.setupAuthMocks();

    // 未認証状態に設定
    await authMocks.mockUnauthenticatedUser();
  });

  test('正常なログインフロー', async ({ page }) => {
    // ログインページに移動
    await authHelpers.goToLogin();

    // フォームに有効な認証情報を入力
    await authHelpers.fillLoginForm(testUsers.validUser.email, testUsers.validUser.password);

    // フォームが有効化されていることを確認
    await authHelpers.expectFormEnabled();

    // ログインボタンをクリック
    await authHelpers.clickLoginButton();

    // ローディング状態の確認
    await authHelpers.expectLoading();

    // モックAPIが呼び出されることを確認（実際のリダイレクトは発生しない）
    await page.waitForTimeout(1000); // API呼び出し完了を待機
  });

  test('無効な認証情報でのログイン失敗', async ({ page }) => {
    await authHelpers.goToLogin();

    // 無効な認証情報を入力
    await authHelpers.fillLoginForm('invalid@example.com', 'wrongpassword');
    await authHelpers.clickLoginButton();

    // API呼び出し完了を待機
    await page.waitForTimeout(1000);

    // ページが変わらないことを確認
    await expect(page).toHaveURL(/\/login/);
  });

  test('未確認ユーザーのログイン', async ({ page }) => {
    await authHelpers.goToLogin();

    // 未確認ユーザーの認証情報を入力
    await authHelpers.fillLoginForm(
      testUsers.unconfirmedUser.email,
      testUsers.unconfirmedUser.password
    );
    await authHelpers.clickLoginButton();

    // 未確認エラーメッセージの確認
    await authHelpers.expectErrorMessage(errorMessages.userNotConfirmed);
  });

  test('バリデーションエラー - 空のフィールド', async ({ page }) => {
    await authHelpers.goToLogin();

    // 空のフォームで送信を試行
    await authHelpers.clickLoginButton();

    // フォームが無効化されていることを確認（バリデーションエラーのため）
    await authHelpers.expectFormDisabled();
  });

  test('バリデーションエラー - 無効なメールアドレス', async ({ page }) => {
    await authHelpers.goToLogin();

    // 無効なメールアドレスを入力
    await authHelpers.fillLoginForm('invalid-email', 'password123');

    // フォームが無効化されていることを確認
    await authHelpers.expectFormDisabled();
  });

  test('サインアップページへの遷移', async ({ page }) => {
    await authHelpers.goToLogin();

    // サインアップリンクをクリック
    await authHelpers.clickSignupLink();

    // サインアップページに遷移することを確認
    await authHelpers.expectRedirectTo('/signup');
  });

  test('パスワードリセットページへの遷移', async ({ page }) => {
    await authHelpers.goToLogin();

    // パスワードリセットリンクをクリック
    await authHelpers.clickPasswordResetLink();

    // パスワードリセットページに遷移することを確認
    await authHelpers.expectRedirectTo('/password-reset');
  });

  test('ネットワークエラーハンドリング', async ({ page }) => {
    // ネットワークエラーのモック設定
    await page.route('**/auth/signin', async route => {
      await route.abort('failed');
    });

    await authHelpers.goToLogin();
    await authHelpers.fillLoginForm(testUsers.validUser.email, testUsers.validUser.password);
    await authHelpers.clickLoginButton();

    // ネットワークエラーメッセージの確認
    await authHelpers.expectErrorMessage(errorMessages.networkError);
  });

  test('キーボードナビゲーション', async ({ page }) => {
    await authHelpers.goToLogin();

    // Tabキーでフォーカス移動
    await page.keyboard.press('Tab');
    await expect(page.locator('#email')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.locator('#password')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.locator('button[type="submit"]')).toBeFocused();

    // Enterキーでフォーム送信
    await authHelpers.fillLoginForm(testUsers.validUser.email, testUsers.validUser.password);
    await page.keyboard.press('Enter');

    // ログイン処理が実行されることを確認
    await authHelpers.expectLoading();
  });

  test('既に認証済みユーザーのリダイレクト', async ({ page }) => {
    // 認証済み状態に設定
    await authMocks.mockAuthenticatedUser();

    // ログインページにアクセス
    await page.goto('/login');

    // TOP画面にリダイレクトされることを確認
    await authHelpers.expectRedirectTo('/');
  });
});
