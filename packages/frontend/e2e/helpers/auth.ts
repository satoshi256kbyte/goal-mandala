import { Page } from '@playwright/test';

/**
 * E2Eテスト用認証ヘルパー
 */
export class AuthHelper {
  constructor(private page: Page) {}

  /**
   * モック認証でログイン
   */
  async loginWithMock() {
    // モック認証用のローカルストレージを設定
    await this.page.addInitScript(() => {
      localStorage.setItem('mock_auth_enabled', 'true');
      localStorage.setItem(
        'mock_user',
        JSON.stringify({
          id: 'test-user-id',
          email: 'test@example.com',
          name: 'Test User',
          cognitoSub: 'mock-cognito-sub',
        })
      );
      localStorage.setItem('mock_token', 'mock-jwt-token');
    });

    // ページをリロードして認証状態を反映
    await this.page.reload();
  }

  /**
   * ログアウト
   */
  async logout() {
    // ページ内でローカルストレージをクリア
    await this.page.addInitScript(() => {
      localStorage.removeItem('mock_auth_enabled');
      localStorage.removeItem('mock_user');
      localStorage.removeItem('mock_token');
    });

    // ページをリロードして認証状態を反映
    await this.page.reload();
  }

  /**
   * 認証済み状態でページに移動
   */
  async gotoAuthenticated(url: string) {
    await this.loginWithMock();
    await this.page.goto(url);
  }
}
