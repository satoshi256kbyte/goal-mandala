import { test, expect } from '@playwright/test';
import { AuthHelpers } from '../helpers/auth-helpers';
import { AuthMocks } from '../mocks/auth-mocks';
import { testUsers, errorMessages, successMessages } from '../fixtures/test-data';

test.describe('サインアップフロー', () => {
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

  test('正常なサインアップフロー', async ({ page }) => {
    // サインアップページに移動
    await authHelpers.goToSignup();

    // フォームに有効な情報を入力
    await authHelpers.fillSignupForm(
      testUsers.validUser.name,
      testUsers.validUser.email,
      testUsers.validUser.password,
      testUsers.validUser.password
    );

    // サインアップボタンをクリック
    await authHelpers.clickSignupButton();

    // ローディング状態の確認
    await authHelpers.expectLoading();

    // 成功メッセージの確認
    await authHelpers.expectLoadingComplete();
    await authHelpers.expectSuccessMessage(successMessages.signupSuccess);

    // ログインページにリダイレクトされることを確認
    await authHelpers.expectRedirectTo('/login');
  });

  test('既存ユーザーでのサインアップ失敗', async ({ page }) => {
    await authHelpers.goToSignup();

    // 既存ユーザーの情報を入力
    await authHelpers.fillSignupForm(
      testUsers.existingUser.name,
      testUsers.existingUser.email,
      testUsers.existingUser.password,
      testUsers.existingUser.password
    );
    await authHelpers.clickSignupButton();

    // エラーメッセージの確認
    await authHelpers.expectErrorMessage('このメールアドレスは既に使用されています');

    // ページが変わらないことを確認
    await expect(page).toHaveURL(/\/signup/);
  });

  test('バリデーションエラー - 必須フィールド', async ({ page }) => {
    await authHelpers.goToSignup();

    // 空のフォームで送信
    await authHelpers.clickSignupButton();

    // バリデーションエラーの確認
    await authHelpers.expectValidationError('name', errorMessages.requiredField);
    await authHelpers.expectValidationError('email', errorMessages.requiredField);
    await authHelpers.expectValidationError('password', errorMessages.requiredField);
    await authHelpers.expectValidationError('confirm-password', errorMessages.requiredField);

    // フォームが無効化されていることを確認
    await authHelpers.expectFormDisabled();
  });

  test('バリデーションエラー - 無効なメールアドレス', async ({ page }) => {
    await authHelpers.goToSignup();

    // 無効なメールアドレスを入力
    await authHelpers.fillSignupForm(
      testUsers.validUser.name,
      'invalid-email',
      testUsers.validUser.password,
      testUsers.validUser.password
    );

    // バリデーションエラーの確認
    await authHelpers.expectValidationError('email', errorMessages.invalidEmail);
  });

  test('バリデーションエラー - 弱いパスワード', async ({ page }) => {
    await authHelpers.goToSignup();

    // 弱いパスワードを入力
    await authHelpers.fillSignupForm(
      testUsers.validUser.name,
      testUsers.validUser.email,
      'weak',
      'weak'
    );

    // バリデーションエラーの確認
    await authHelpers.expectValidationError('password', errorMessages.weakPassword);
  });

  test('バリデーションエラー - パスワード不一致', async ({ page }) => {
    await authHelpers.goToSignup();

    // パスワードが一致しない情報を入力
    await authHelpers.fillSignupForm(
      testUsers.validUser.name,
      testUsers.validUser.email,
      testUsers.validUser.password,
      'DifferentPassword123!'
    );

    // バリデーションエラーの確認
    await authHelpers.expectValidationError('confirm-password', errorMessages.passwordMismatch);
  });

  test('パスワード強度インジケーター', async ({ page }) => {
    await authHelpers.goToSignup();

    // 弱いパスワードを入力
    await page.fill('[data-testid="password-input"]', 'weak');
    await expect(page.locator('[data-testid="password-strength"]')).toContainText('弱い');

    // 中程度のパスワードを入力
    await page.fill('[data-testid="password-input"]', 'Medium123');
    await expect(page.locator('[data-testid="password-strength"]')).toContainText('中程度');

    // 強いパスワードを入力
    await page.fill('[data-testid="password-input"]', 'StrongPassword123!');
    await expect(page.locator('[data-testid="password-strength"]')).toContainText('強い');
  });

  test('リアルタイムパスワード確認バリデーション', async ({ page }) => {
    await authHelpers.goToSignup();

    // パスワードを入力
    await page.fill('[data-testid="password-input"]', testUsers.validUser.password);

    // 異なる確認パスワードを入力
    await page.fill('[data-testid="confirm-password-input"]', 'different');
    await page.locator('[data-testid="confirm-password-input"]').blur();

    // リアルタイムバリデーションエラーの確認
    await authHelpers.expectValidationError('confirm-password', errorMessages.passwordMismatch);

    // 正しい確認パスワードを入力
    await page.fill('[data-testid="confirm-password-input"]', testUsers.validUser.password);
    await page.locator('[data-testid="confirm-password-input"]').blur();

    // エラーが消えることを確認
    await expect(page.locator('[data-testid="confirm-password-error"]')).not.toBeVisible();
  });

  test('ログインページへの遷移', async ({ page }) => {
    await authHelpers.goToSignup();

    // ログインリンクをクリック
    await authHelpers.clickLoginLink();

    // ログインページに遷移することを確認
    await authHelpers.expectRedirectTo('/login');
  });

  test('ネットワークエラーハンドリング', async ({ page }) => {
    // ネットワークエラーのモック設定
    await page.route('**/auth/signup', async route => {
      await route.abort('failed');
    });

    await authHelpers.goToSignup();
    await authHelpers.fillSignupForm(
      testUsers.validUser.name,
      testUsers.validUser.email,
      testUsers.validUser.password,
      testUsers.validUser.password
    );
    await authHelpers.clickSignupButton();

    // ネットワークエラーメッセージの確認
    await authHelpers.expectErrorMessage(errorMessages.networkError);
  });

  test('キーボードナビゲーション', async ({ page }) => {
    await authHelpers.goToSignup();

    // Tabキーでフォーカス移動
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="name-input"]')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="email-input"]')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="password-input"]')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="confirm-password-input"]')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="signup-button"]')).toBeFocused();
  });

  test('フォーム入力の永続化', async ({ page }) => {
    await authHelpers.goToSignup();

    // フォームに入力
    await page.fill('[data-testid="name-input"]', testUsers.validUser.name);
    await page.fill('[data-testid="email-input"]', testUsers.validUser.email);

    // ページをリロード
    await page.reload();

    // 入力値が保持されていることを確認（セキュリティ上、パスワードは除く）
    await expect(page.locator('[data-testid="name-input"]')).toHaveValue(testUsers.validUser.name);
    await expect(page.locator('[data-testid="email-input"]')).toHaveValue(
      testUsers.validUser.email
    );
    await expect(page.locator('[data-testid="password-input"]')).toHaveValue('');
    await expect(page.locator('[data-testid="confirm-password-input"]')).toHaveValue('');
  });

  test('既に認証済みユーザーのリダイレクト', async ({ page }) => {
    // 認証済み状態に設定
    await authMocks.mockAuthenticatedUser();

    // サインアップページにアクセス
    await page.goto('/signup');

    // TOP画面にリダイレクトされることを確認
    await authHelpers.expectRedirectTo('/');
  });
});
