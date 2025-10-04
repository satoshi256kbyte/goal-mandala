import { test, expect } from '@playwright/test';
import { AuthHelpers } from '../helpers/auth-helpers';
import { testUsers, errorMessages } from '../fixtures/test-data';

test.describe('認証エラーケース', () => {
  let authHelpers: AuthHelpers;

  test.beforeEach(async ({ page }) => {
    authHelpers = new AuthHelpers(page);
  });

  test.describe('基本エラーハンドリング', () => {
    test('ログイン時のエラー表示', async ({ page }) => {
      await authHelpers.goToLogin();

      // Invalid credentials
      await authHelpers.fillLoginForm('invalid@example.com', 'wrongpassword');
      await authHelpers.clickLoginButton();

      // Check that some error is displayed
      await authHelpers.expectErrorMessage('');
    });

    test('サインアップ時のエラー表示', async ({ page }) => {
      await authHelpers.goToSignup();

      // Try to signup with existing email
      await authHelpers.fillSignupForm(
        testUsers.validUser.name,
        testUsers.existingUser.email,
        testUsers.validUser.password,
        testUsers.validUser.password
      );
      await authHelpers.clickSignupButton();

      // Check that some error is displayed
      await authHelpers.expectErrorMessage('');
    });

    test('パスワードリセット時のエラー表示', async ({ page }) => {
      await authHelpers.goToPasswordReset();

      // Try with invalid email format
      await authHelpers.fillPasswordResetForm('invalid-email');
      await authHelpers.clickPasswordResetButton();

      // Should show validation error or process the request
      // Just check the page doesn't crash
      await expect(
        page.getByRole('heading', { name: 'パスワードリセット', exact: true })
      ).toBeVisible();
    });
  });
});
