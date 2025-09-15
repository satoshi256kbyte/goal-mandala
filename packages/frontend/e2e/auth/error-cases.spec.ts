import { test, expect } from '@playwright/test';
import { AuthHelpers } from '../helpers/auth-helpers';
import { AuthMocks } from '../mocks/auth-mocks';
import { testUsers, errorMessages } from '../fixtures/test-data';

test.describe('認証エラーケース', () => {
  let authHelpers: AuthHelpers;
  let authMocks: AuthMocks;

  test.beforeEach(async ({ page }) => {
    authHelpers = new AuthHelpers(page);
    authMocks = new AuthMocks(page);

    // 未認証状態に設定
    await authMocks.mockUnauthenticatedUser();
  });

  test.describe('ネットワークエラー', () => {
    test('ログイン時のネットワークエラー', async ({ page }) => {
      // ネットワークエラーのモック
      await page.route('**/auth/signin', async route => {
        await route.abort('failed');
      });

      await authHelpers.goToLogin();
      await authHelpers.fillLoginForm(testUsers.validUser.email, testUsers.validUser.password);
      await authHelpers.clickLoginButton();

      // ネットワークエラーメッセージと再試行ボタンの確認
      await authHelpers.expectErrorMessage(errorMessages.networkError);
      await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();

      // 再試行ボタンのクリック
      await page.click('[data-testid="retry-button"]');
      await authHelpers.expectLoading();
    });

    test('サインアップ時のネットワークエラー', async ({ page }) => {
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

      await authHelpers.expectErrorMessage(errorMessages.networkError);
      await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
    });

    test('パスワードリセット時のネットワークエラー', async ({ page }) => {
      await page.route('**/auth/forgot-password', async route => {
        await route.abort('failed');
      });

      await authHelpers.goToPasswordReset();
      await authHelpers.fillPasswordResetForm(testUsers.validUser.email);
      await authHelpers.clickPasswordResetButton();

      await authHelpers.expectErrorMessage(errorMessages.networkError);
      await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
    });
  });

  test.describe('サーバーエラー', () => {
    test('500エラーハンドリング', async ({ page }) => {
      await page.route('**/auth/signin', async route => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'InternalServerError',
            message: 'サーバーエラーが発生しました',
          }),
        });
      });

      await authHelpers.goToLogin();
      await authHelpers.fillLoginForm(testUsers.validUser.email, testUsers.validUser.password);
      await authHelpers.clickLoginButton();

      await authHelpers.expectErrorMessage('サーバーエラーが発生しました');
    });

    test('503エラーハンドリング（サービス利用不可）', async ({ page }) => {
      await page.route('**/auth/signin', async route => {
        await route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'ServiceUnavailable',
            message: 'サービスが一時的に利用できません',
          }),
        });
      });

      await authHelpers.goToLogin();
      await authHelpers.fillLoginForm(testUsers.validUser.email, testUsers.validUser.password);
      await authHelpers.clickLoginButton();

      await authHelpers.expectErrorMessage('サービスが一時的に利用できません');
    });
  });

  test.describe('Cognitoエラー', () => {
    test('TooManyRequestsException', async ({ page }) => {
      await page.route('**/auth/signin', async route => {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'TooManyRequestsException',
            message: 'リクエストが多すぎます。しばらく待ってから再試行してください',
          }),
        });
      });

      await authHelpers.goToLogin();
      await authHelpers.fillLoginForm(testUsers.validUser.email, testUsers.validUser.password);
      await authHelpers.clickLoginButton();

      await authHelpers.expectErrorMessage(
        'リクエストが多すぎます。しばらく待ってから再試行してください'
      );
    });

    test('PasswordResetRequiredException', async ({ page }) => {
      await page.route('**/auth/signin', async route => {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'PasswordResetRequiredException',
            message: 'パスワードのリセットが必要です',
          }),
        });
      });

      await authHelpers.goToLogin();
      await authHelpers.fillLoginForm(testUsers.validUser.email, testUsers.validUser.password);
      await authHelpers.clickLoginButton();

      await authHelpers.expectErrorMessage('パスワードのリセットが必要です');

      // パスワードリセットリンクが表示されることを確認
      await expect(page.locator('[data-testid="password-reset-link"]')).toBeVisible();
    });

    test('UserLambdaValidationException', async ({ page }) => {
      await page.route('**/auth/signup', async route => {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'UserLambdaValidationException',
            message: '入力内容に問題があります',
          }),
        });
      });

      await authHelpers.goToSignup();
      await authHelpers.fillSignupForm(
        testUsers.validUser.name,
        testUsers.validUser.email,
        testUsers.validUser.password,
        testUsers.validUser.password
      );
      await authHelpers.clickSignupButton();

      await authHelpers.expectErrorMessage('入力内容に問題があります');
    });
  });

  test.describe('タイムアウトエラー', () => {
    test('リクエストタイムアウト', async ({ page }) => {
      await page.route('**/auth/signin', async route => {
        // 30秒待機してタイムアウトをシミュレート
        await new Promise(resolve => setTimeout(resolve, 30000));
        await route.fulfill({
          status: 408,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'RequestTimeout',
            message: 'リクエストがタイムアウトしました',
          }),
        });
      });

      await authHelpers.goToLogin();
      await authHelpers.fillLoginForm(testUsers.validUser.email, testUsers.validUser.password);
      await authHelpers.clickLoginButton();

      // タイムアウトエラーメッセージの確認
      await authHelpers.expectErrorMessage('リクエストがタイムアウトしました');
    });
  });

  test.describe('フォームバリデーションエラー', () => {
    test('複数フィールドの同時バリデーションエラー', async ({ page }) => {
      await authHelpers.goToSignup();

      // 全て無効な値を入力
      await page.fill('[data-testid="name-input"]', '');
      await page.fill('[data-testid="email-input"]', 'invalid-email');
      await page.fill('[data-testid="password-input"]', 'weak');
      await page.fill('[data-testid="confirm-password-input"]', 'different');

      await authHelpers.clickSignupButton();

      // 複数のバリデーションエラーが同時に表示されることを確認
      await authHelpers.expectValidationError('name', errorMessages.requiredField);
      await authHelpers.expectValidationError('email', errorMessages.invalidEmail);
      await authHelpers.expectValidationError('password', errorMessages.weakPassword);
      await authHelpers.expectValidationError('confirm-password', errorMessages.passwordMismatch);
    });

    test('動的バリデーションエラーの解消', async ({ page }) => {
      await authHelpers.goToSignup();

      // 無効な値を入力してエラーを発生させる
      await page.fill('[data-testid="email-input"]', 'invalid');
      await page.locator('[data-testid="email-input"]').blur();
      await authHelpers.expectValidationError('email', errorMessages.invalidEmail);

      // 有効な値に修正
      await page.fill('[data-testid="email-input"]', testUsers.validUser.email);
      await page.locator('[data-testid="email-input"]').blur();

      // エラーが解消されることを確認
      await expect(page.locator('[data-testid="email-error"]')).not.toBeVisible();
    });
  });

  test.describe('セッション管理エラー', () => {
    test('期限切れトークンでのアクセス', async ({ page }) => {
      // 期限切れトークンを設定
      await page.addInitScript(() => {
        localStorage.setItem('auth-token', 'expired-token');
      });

      // 保護されたページにアクセス
      await page.goto('/dashboard');

      // ログインページにリダイレクトされることを確認
      await authHelpers.expectRedirectTo('/login');
      await authHelpers.expectErrorMessage('セッションが期限切れです。再度ログインしてください');
    });

    test('無効なトークンでのアクセス', async ({ page }) => {
      // 無効なトークンを設定
      await page.addInitScript(() => {
        localStorage.setItem('auth-token', 'invalid-token');
      });

      await page.goto('/dashboard');

      await authHelpers.expectRedirectTo('/login');
      await authHelpers.expectErrorMessage('認証情報が無効です。再度ログインしてください');
    });
  });

  test.describe('ブラウザ互換性エラー', () => {
    test('LocalStorage利用不可', async ({ page }) => {
      // LocalStorageを無効化
      await page.addInitScript(() => {
        Object.defineProperty(window, 'localStorage', {
          value: null,
          writable: false,
        });
      });

      await authHelpers.goToLogin();
      await authHelpers.fillLoginForm(testUsers.validUser.email, testUsers.validUser.password);
      await authHelpers.clickLoginButton();

      // LocalStorage利用不可エラーの確認
      await authHelpers.expectErrorMessage('ブラウザの設定により、ログイン状態を保存できません');
    });
  });

  test.describe('アクセシビリティエラー', () => {
    test('スクリーンリーダー用エラー通知', async ({ page }) => {
      await authHelpers.goToLogin();
      await authHelpers.fillLoginForm('invalid@example.com', 'wrongpassword');
      await authHelpers.clickLoginButton();

      // ARIA live regionでエラーが通知されることを確認
      const errorRegion = page.locator('[aria-live="polite"]');
      await expect(errorRegion).toContainText(errorMessages.invalidCredentials);
    });

    test('フォーカス管理エラー', async ({ page }) => {
      await authHelpers.goToLogin();
      await authHelpers.fillLoginForm('', '');
      await authHelpers.clickLoginButton();

      // エラー発生時に最初のエラーフィールドにフォーカスが移ることを確認
      await expect(page.locator('[data-testid="email-input"]')).toBeFocused();
    });
  });
});
