import { Page } from '@playwright/test';
import { testUsers, errorMessages, successMessages } from '../fixtures/test-data';

export class AuthMocks {
  constructor(private page: Page) {}

  /**
   * 認証APIのモック設定
   */
  async setupAuthMocks() {
    // ログイン成功のモック
    await this.page.route('**/auth/signin', async route => {
      const request = route.request();
      const postData = JSON.parse(request.postData() || '{}');

      if (
        postData.email === testUsers.validUser.email &&
        postData.password === testUsers.validUser.password
      ) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            user: {
              id: 'user-123',
              email: testUsers.validUser.email,
              name: testUsers.validUser.name,
            },
            tokens: {
              accessToken: 'mock-access-token',
              refreshToken: 'mock-refresh-token',
            },
          }),
        });
      } else if (postData.email === testUsers.unconfirmedUser.email) {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'UserNotConfirmedException',
            message: errorMessages.userNotConfirmed,
          }),
        });
      } else {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'NotAuthorizedException',
            message: errorMessages.invalidCredentials,
          }),
        });
      }
    });

    // サインアップ成功のモック
    await this.page.route('**/auth/signup', async route => {
      const request = route.request();
      const postData = JSON.parse(request.postData() || '{}');

      if (postData.email === testUsers.existingUser.email) {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'UsernameExistsException',
            message: 'このメールアドレスは既に使用されています',
          }),
        });
      } else if (postData.email === testUsers.validUser.email) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            message: successMessages.signupSuccess,
          }),
        });
      } else {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'InvalidParameterException',
            message: '入力内容に問題があります',
          }),
        });
      }
    });

    // パスワードリセット成功のモック
    await this.page.route('**/auth/forgot-password', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: successMessages.passwordResetSent,
        }),
      });
    });

    // ネットワークエラーのモック
    await this.page.route('**/auth/network-error', async route => {
      await route.abort('failed');
    });
  }

  /**
   * 認証状態のモック
   */
  async mockAuthenticatedUser() {
    await this.page.addInitScript(() => {
      localStorage.setItem('auth-token', 'mock-access-token');
      localStorage.setItem(
        'user',
        JSON.stringify({
          id: 'user-123',
          email: 'test@example.com',
          name: 'テストユーザー',
        })
      );
    });
  }

  /**
   * 未認証状態のモック
   */
  async mockUnauthenticatedUser() {
    await this.page.addInitScript(() => {
      localStorage.removeItem('auth-token');
      localStorage.removeItem('user');
    });
  }
}
