import { test, expect } from '@playwright/test';
import { AuthHelpers } from '../helpers/auth-helpers';
import { AuthMocks } from '../mocks/auth-mocks';
import { testUsers, errorMessages, successMessages } from '../fixtures/test-data';

test.describe('パスワードリセットフロー', () => {
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

  test('正常なパスワードリセットフロー', async ({ page }) => {
    // パスワードリセットページに移動
    await authHelpers.goToPasswordReset();

    // フォームに有効なメールアドレスを入力
    await authHelpers.fillPasswordResetForm(testUsers.validUser.email);

    // パスワードリセットボタンをクリック
    await authHelpers.clickPasswordResetButton();

    // ローディング状態の確認
    await authHelpers.expectLoading();

    // 成功メッセージの確認
    await authHelpers.expectLoadingComplete();
    await authHelpers.expectSuccessMessage(successMessages.passwordResetSent);

    // フォームが無効化されることを確認
    await expect(page.locator('[data-testid="email-input"]')).toBeDisabled();
    await expect(page.locator('[data-testid="password-reset-button"]')).toBeDisabled();
  });

  test('未登録メールアドレスでのパスワードリセット', async ({ page }) => {
    await authHelpers.goToPasswordReset();

    // 未登録のメールアドレスを入力
    await authHelpers.fillPasswordResetForm('unregistered@example.com');
    await authHelpers.clickPasswordResetButton();

    // セキュリティ上の理由で成功メッセージを表示
    await authHelpers.expectSuccessMessage(successMessages.passwordResetSent);
  });

  test('バリデーションエラー - 空のメールアドレス', async ({ page }) => {
    await authHelpers.goToPasswordReset();

    // 空のフォームで送信
    await authHelpers.clickPasswordResetButton();

    // バリデーションエラーの確認
    await authHelpers.expectValidationError('email', errorMessages.requiredField);

    // フォームが無効化されていることを確認
    await authHelpers.expectFormDisabled();
  });

  test('バリデーションエラー - 無効なメールアドレス', async ({ page }) => {
    await authHelpers.goToPasswordReset();

    // 無効なメールアドレスを入力
    await authHelpers.fillPasswordResetForm('invalid-email');

    // バリデーションエラーの確認
    await authHelpers.expectValidationError('email', errorMessages.invalidEmail);
  });

  test('ログインページへの遷移', async ({ page }) => {
    await authHelpers.goToPasswordReset();

    // ログインリンクをクリック
    await authHelpers.clickLoginLink();

    // ログインページに遷移することを確認
    await authHelpers.expectRedirectTo('/login');
  });

  test('サインアップページへの遷移', async ({ page }) => {
    await authHelpers.goToPasswordReset();

    // サインアップリンクをクリック
    await authHelpers.clickSignupLink();

    // サインアップページに遷移することを確認
    await authHelpers.expectRedirectTo('/signup');
  });

  test('ネットワークエラーハンドリング', async ({ page }) => {
    // ネットワークエラーのモック設定
    await page.route('**/auth/forgot-password', async route => {
      await route.abort('failed');
    });

    await authHelpers.goToPasswordReset();
    await authHelpers.fillPasswordResetForm(testUsers.validUser.email);
    await authHelpers.clickPasswordResetButton();

    // ネットワークエラーメッセージの確認
    await authHelpers.expectErrorMessage(errorMessages.networkError);
  });

  test('キーボードナビゲーション', async ({ page }) => {
    await authHelpers.goToPasswordReset();

    // Tabキーでフォーカス移動
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="email-input"]')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="password-reset-button"]')).toBeFocused();

    // Enterキーでフォーム送信
    await authHelpers.fillPasswordResetForm(testUsers.validUser.email);
    await page.keyboard.press('Enter');

    // パスワードリセット処理が実行されることを確認
    await authHelpers.expectLoading();
  });

  test('リアルタイムバリデーション', async ({ page }) => {
    await authHelpers.goToPasswordReset();

    // 無効なメールアドレスを入力
    await page.fill('[data-testid="email-input"]', 'invalid');
    await page.locator('[data-testid="email-input"]').blur();

    // リアルタイムバリデーションエラーの確認
    await authHelpers.expectValidationError('email', errorMessages.invalidEmail);

    // 有効なメールアドレスを入力
    await page.fill('[data-testid="email-input"]', testUsers.validUser.email);
    await page.locator('[data-testid="email-input"]').blur();

    // エラーが消えることを確認
    await expect(page.locator('[data-testid="email-error"]')).not.toBeVisible();

    // フォームが有効化されることを確認
    await authHelpers.expectFormEnabled();
  });

  test('複数回送信の制御', async ({ page }) => {
    await authHelpers.goToPasswordReset();

    // 最初の送信
    await authHelpers.fillPasswordResetForm(testUsers.validUser.email);
    await authHelpers.clickPasswordResetButton();

    // 成功メッセージの確認
    await authHelpers.expectSuccessMessage(successMessages.passwordResetSent);

    // フォームが無効化されることを確認
    await expect(page.locator('[data-testid="password-reset-button"]')).toBeDisabled();

    // 再送信ボタンが表示されることを確認（一定時間後）
    await page.waitForTimeout(1000);
    await expect(page.locator('[data-testid="resend-button"]')).toBeVisible();
  });

  test('メール送信後の案内表示', async ({ page }) => {
    await authHelpers.goToPasswordReset();

    await authHelpers.fillPasswordResetForm(testUsers.validUser.email);
    await authHelpers.clickPasswordResetButton();

    // 成功メッセージと案内の確認
    await authHelpers.expectSuccessMessage(successMessages.passwordResetSent);
    await expect(page.locator('[data-testid="reset-instructions"]')).toContainText(
      'メールに記載されたリンクをクリックして、新しいパスワードを設定してください'
    );
  });

  test('既に認証済みユーザーのリダイレクト', async ({ page }) => {
    // 認証済み状態に設定
    await authMocks.mockAuthenticatedUser();

    // パスワードリセットページにアクセス
    await page.goto('/password-reset');

    // TOP画面にリダイレクトされることを確認
    await authHelpers.expectRedirectTo('/');
  });
});
