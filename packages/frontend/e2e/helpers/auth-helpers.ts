import { Page, expect } from '@playwright/test';

export class AuthHelpers {
  constructor(private page: Page) {}

  /**
   * ログインページに移動
   */
  async goToLogin() {
    await this.page.goto('/login');
    // ページが読み込まれるまで待機
    await this.page.waitForLoadState('networkidle');
    // ログインページのタイトルが表示されるまで待機
    await expect(this.page.getByRole('heading', { name: 'ログイン' })).toBeVisible();
  }

  /**
   * サインアップページに移動
   */
  async goToSignup() {
    await this.page.goto('/signup');
    await this.page.waitForLoadState('networkidle');
    await expect(this.page.getByRole('heading', { name: 'サインアップ' })).toBeVisible();
  }

  /**
   * パスワードリセットページに移動
   */
  async goToPasswordReset() {
    await this.page.goto('/password-reset');
    await this.page.waitForLoadState('networkidle');
    await expect(this.page.getByRole('heading', { name: 'パスワードリセット' })).toBeVisible();
  }

  /**
   * ログインフォームに入力
   */
  async fillLoginForm(email: string, password: string) {
    await this.page.fill('#email', email);
    await this.page.fill('#password', password);
  }

  /**
   * サインアップフォームに入力
   */
  async fillSignupForm(name: string, email: string, password: string, confirmPassword: string) {
    await this.page.fill('#name', name);
    await this.page.fill('#email', email);
    await this.page.fill('#password', password);
    await this.page.fill('#confirmPassword', confirmPassword);
  }

  /**
   * パスワードリセットフォームに入力
   */
  async fillPasswordResetForm(email: string) {
    await this.page.fill('#email', email);
  }

  /**
   * ログインボタンをクリック
   */
  async clickLoginButton() {
    await this.page.click('button[type="submit"]');
  }

  /**
   * サインアップボタンをクリック
   */
  async clickSignupButton() {
    await this.page.click('button[type="submit"]');
  }

  /**
   * パスワードリセットボタンをクリック
   */
  async clickPasswordResetButton() {
    await this.page.click('button[type="submit"]');
  }

  /**
   * エラーメッセージの確認
   */
  async expectErrorMessage(message: string) {
    await expect(this.page.locator('[role="alert"]')).toContainText(message);
  }

  /**
   * 成功メッセージの確認
   */
  async expectSuccessMessage(message: string) {
    await expect(this.page.locator('.bg-green-50, .bg-green-100')).toContainText(message);
  }

  /**
   * バリデーションエラーの確認
   */
  async expectValidationError(fieldName: string, message: string) {
    await expect(this.page.locator(`#${fieldName}-error`)).toContainText(message);
  }

  /**
   * ローディング状態の確認
   */
  async expectLoading() {
    await expect(this.page.locator('button[type="submit"]')).toContainText('中...');
  }

  /**
   * ローディング完了の確認
   */
  async expectLoadingComplete() {
    await expect(this.page.locator('button[type="submit"]')).not.toContainText('中...');
  }

  /**
   * ページリダイレクトの確認
   */
  async expectRedirectTo(path: string) {
    await expect(this.page).toHaveURL(new RegExp(path));
  }

  /**
   * ナビゲーションリンクのクリック
   */
  async clickSignupLink() {
    await this.page.click('a[href="/signup"]');
  }

  async clickLoginLink() {
    await this.page.click('a[href="/login"]');
  }

  async clickPasswordResetLink() {
    await this.page.click('a[href="/password-reset"]');
  }

  /**
   * フォームの送信状態確認
   */
  async expectFormDisabled() {
    await expect(this.page.locator('button[type="submit"]')).toBeDisabled();
  }

  async expectFormEnabled() {
    await expect(this.page.locator('button[type="submit"]')).toBeEnabled();
  }
}
