import { test, expect } from '@playwright/test';
import { AuthHelpers } from '../helpers/auth-helpers';
import { AuthMocks } from '../mocks/auth-mocks';
import { testUsers } from '../fixtures/test-data';

test.describe('認証フロー統合テスト', () => {
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

  test('完全なサインアップ→ログインフロー', async ({ page }) => {
    // 1. サインアップ
    await authHelpers.goToSignup();
    await authHelpers.fillSignupForm(
      testUsers.validUser.name,
      testUsers.validUser.email,
      testUsers.validUser.password,
      testUsers.validUser.password
    );
    await authHelpers.clickSignupButton();

    // サインアップ成功後、ログインページにリダイレクト
    await authHelpers.expectRedirectTo('/login');

    // 2. ログイン
    await authHelpers.fillLoginForm(testUsers.validUser.email, testUsers.validUser.password);
    await authHelpers.clickLoginButton();

    // ログイン成功後、TOP画面にリダイレクト
    await authHelpers.expectRedirectTo('/');

    // 認証状態の確認
    const token = await page.evaluate(() => localStorage.getItem('auth-token'));
    expect(token).toBe('mock-access-token');
  });

  test('ログイン→ログアウト→再ログインフロー', async ({ page }) => {
    // 1. ログイン
    await authHelpers.goToLogin();
    await authHelpers.fillLoginForm(testUsers.validUser.email, testUsers.validUser.password);
    await authHelpers.clickLoginButton();
    await authHelpers.expectRedirectTo('/');

    // 2. ログアウト
    await page.click('[data-testid="logout-button"]');
    await authHelpers.expectRedirectTo('/login');

    // 認証状態がクリアされることを確認
    const token = await page.evaluate(() => localStorage.getItem('auth-token'));
    expect(token).toBeNull();

    // 3. 再ログイン
    await authHelpers.fillLoginForm(testUsers.validUser.email, testUsers.validUser.password);
    await authHelpers.clickLoginButton();
    await authHelpers.expectRedirectTo('/');
  });

  test('パスワードリセット→新しいパスワードでログインフロー', async ({ page }) => {
    // 1. パスワードリセット
    await authHelpers.goToPasswordReset();
    await authHelpers.fillPasswordResetForm(testUsers.validUser.email);
    await authHelpers.clickPasswordResetButton();
    await authHelpers.expectSuccessMessage('パスワードリセットメールを送信しました');

    // 2. 新しいパスワード設定（メールリンクからのアクセスをシミュレート）
    await page.goto(
      '/new-password?token=reset-token&email=' + encodeURIComponent(testUsers.validUser.email)
    );

    const newPassword = 'NewPassword123!';
    await page.fill('[data-testid="new-password-input"]', newPassword);
    await page.fill('[data-testid="confirm-new-password-input"]', newPassword);
    await page.click('[data-testid="set-password-button"]');

    // パスワード設定成功後、ログインページにリダイレクト
    await authHelpers.expectRedirectTo('/login');

    // 3. 新しいパスワードでログイン
    await authHelpers.fillLoginForm(testUsers.validUser.email, newPassword);
    await authHelpers.clickLoginButton();
    await authHelpers.expectRedirectTo('/');
  });

  test('認証が必要なページへの直接アクセス', async ({ page }) => {
    // 未認証状態で保護されたページにアクセス
    await page.goto('/dashboard');

    // ログインページにリダイレクトされることを確認
    await authHelpers.expectRedirectTo('/login');

    // リダイレクト後のURLにreturn_toパラメータが含まれることを確認
    await expect(page).toHaveURL(/login\?return_to=%2Fdashboard/);

    // ログイン後、元のページにリダイレクトされることを確認
    await authHelpers.fillLoginForm(testUsers.validUser.email, testUsers.validUser.password);
    await authHelpers.clickLoginButton();
    await authHelpers.expectRedirectTo('/dashboard');
  });

  test('セッション期限切れ後の自動ログアウト', async ({ page }) => {
    // 認証済み状態に設定
    await authMocks.mockAuthenticatedUser();
    await page.goto('/dashboard');

    // セッション期限切れをシミュレート
    await page.route('**/api/**', async route => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'TokenExpired',
          message: 'セッションが期限切れです',
        }),
      });
    });

    // API呼び出しを実行
    await page.click('[data-testid="api-call-button"]');

    // 自動的にログインページにリダイレクトされることを確認
    await authHelpers.expectRedirectTo('/login');
    await authHelpers.expectErrorMessage('セッションが期限切れです。再度ログインしてください');
  });

  test('複数タブでの認証状態同期', async ({ context }) => {
    // 最初のタブでログイン
    const page1 = await context.newPage();
    const authHelpers1 = new AuthHelpers(page1);
    const authMocks1 = new AuthMocks(page1);

    await authMocks1.setupAuthMocks();
    await authHelpers1.goToLogin();
    await authHelpers1.fillLoginForm(testUsers.validUser.email, testUsers.validUser.password);
    await authHelpers1.clickLoginButton();
    await authHelpers1.expectRedirectTo('/');

    // 2番目のタブを開く
    const page2 = await context.newPage();
    await page2.goto('/');

    // 2番目のタブでも認証状態が同期されることを確認
    await expect(page2).toHaveURL('/');
    const token2 = await page2.evaluate(() => localStorage.getItem('auth-token'));
    expect(token2).toBe('mock-access-token');

    // 最初のタブでログアウト
    await page1.click('[data-testid="logout-button"]');

    // 2番目のタブでもログアウト状態が同期されることを確認
    await page2.reload();
    await expect(page2).toHaveURL(/\/login/);
  });

  test('ブラウザ戻る/進むボタンでの認証フロー', async ({ page }) => {
    // ログインページから開始
    await authHelpers.goToLogin();

    // サインアップページに移動
    await authHelpers.clickSignupLink();
    await authHelpers.expectRedirectTo('/signup');

    // ブラウザの戻るボタン
    await page.goBack();
    await authHelpers.expectRedirectTo('/login');

    // ブラウザの進むボタン
    await page.goForward();
    await authHelpers.expectRedirectTo('/signup');

    // パスワードリセットページに移動
    await authHelpers.clickPasswordResetLink();
    await authHelpers.expectRedirectTo('/password-reset');

    // 複数回戻る
    await page.goBack(); // signup
    await page.goBack(); // login

    // 各ページが正しく表示されることを確認
    await expect(page).toHaveTitle(/ログイン/);
  });

  test('フォーム入力中のページ離脱警告', async ({ page }) => {
    await authHelpers.goToSignup();

    // フォームに入力
    await page.fill('[data-testid="name-input"]', testUsers.validUser.name);
    await page.fill('[data-testid="email-input"]', testUsers.validUser.email);

    // ページ離脱を試行
    page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('入力内容が失われます');
      await dialog.accept();
    });

    await page.goto('/login');
  });

  test('認証エラー後の復旧フロー', async ({ page }) => {
    await authHelpers.goToLogin();

    // 最初は無効な認証情報でログイン失敗
    await authHelpers.fillLoginForm('invalid@example.com', 'wrongpassword');
    await authHelpers.clickLoginButton();
    await authHelpers.expectErrorMessage('メールアドレスまたはパスワードが正しくありません');

    // エラーメッセージをクリア
    await page.click('[data-testid="clear-error-button"]');
    await expect(page.locator('[data-testid="error-message"]')).not.toBeVisible();

    // 正しい認証情報でログイン成功
    await page.fill('[data-testid="email-input"]', testUsers.validUser.email);
    await page.fill('[data-testid="password-input"]', testUsers.validUser.password);
    await authHelpers.clickLoginButton();
    await authHelpers.expectRedirectTo('/');
  });

  test('レスポンシブデザインでの認証フロー', async ({ page }) => {
    // モバイルビューポートに設定
    await page.setViewportSize({ width: 375, height: 667 });

    await authHelpers.goToLogin();

    // モバイルレイアウトの確認
    await expect(page.locator('[data-testid="mobile-auth-layout"]')).toBeVisible();

    // フォーム入力
    await authHelpers.fillLoginForm(testUsers.validUser.email, testUsers.validUser.password);
    await authHelpers.clickLoginButton();

    // モバイルでも正常にログインできることを確認
    await authHelpers.expectRedirectTo('/');

    // タブレットビューポートに変更
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.reload();

    // タブレットレイアウトの確認
    await expect(page.locator('[data-testid="tablet-auth-layout"]')).toBeVisible();
  });
});
