import { Page, expect } from '@playwright/test';

export class GoalInputHelpers {
  constructor(private page: Page) {}

  /**
   * 目標入力ページに移動
   */
  async goToGoalInput() {
    await this.page.goto('/mandala/create/goal');
    await this.page.waitForLoadState('networkidle');
    // ページが読み込まれるまで待機
    await expect(this.page.locator('h1')).toContainText('目標入力');
  }

  /**
   * 目標入力フォームに入力
   */
  async fillGoalForm(data: {
    title: string;
    description: string;
    deadline: string;
    background: string;
    constraints?: string;
  }) {
    // 目標タイトル入力
    await this.page.fill('[data-testid="goal-title-input"]', data.title);

    // 目標説明入力
    await this.page.fill('[data-testid="goal-description-input"]', data.description);

    // 達成期限入力
    await this.page.fill('[data-testid="goal-deadline-input"]', data.deadline);

    // 背景入力
    await this.page.fill('[data-testid="goal-background-input"]', data.background);

    // 制約事項入力（任意）
    if (data.constraints) {
      await this.page.fill('[data-testid="goal-constraints-input"]', data.constraints);
    }
  }

  /**
   * 部分的にフォームに入力（バリデーションテスト用）
   */
  async fillPartialGoalForm(
    data: Partial<{
      title: string;
      description: string;
      deadline: string;
      background: string;
      constraints: string;
    }>
  ) {
    if (data.title !== undefined) {
      await this.page.fill('[data-testid="goal-title-input"]', data.title);
    }
    if (data.description !== undefined) {
      await this.page.fill('[data-testid="goal-description-input"]', data.description);
    }
    if (data.deadline !== undefined) {
      await this.page.fill('[data-testid="goal-deadline-input"]', data.deadline);
    }
    if (data.background !== undefined) {
      await this.page.fill('[data-testid="goal-background-input"]', data.background);
    }
    if (data.constraints !== undefined) {
      await this.page.fill('[data-testid="goal-constraints-input"]', data.constraints);
    }
  }

  /**
   * AI生成開始ボタンをクリック
   */
  async clickSubmitButton() {
    await this.page.click('[data-testid="submit-button"]');
  }

  /**
   * 下書き保存ボタンをクリック
   */
  async clickDraftSaveButton() {
    await this.page.click('[data-testid="draft-save-button"]');
  }

  /**
   * フィールドの文字数カウンターを確認
   */
  async expectCharacterCount(fieldName: string, count: number, limit: number) {
    const counterSelector = `[data-testid="${fieldName}-character-counter"]`;
    await expect(this.page.locator(counterSelector)).toContainText(`${count}/${limit}`);
  }

  /**
   * 文字数制限警告の確認
   */
  async expectCharacterWarning(fieldName: string) {
    const counterSelector = `[data-testid="${fieldName}-character-counter"]`;
    await expect(this.page.locator(counterSelector)).toHaveClass(/text-yellow-600/);
  }

  /**
   * 文字数制限エラーの確認
   */
  async expectCharacterError(fieldName: string) {
    const counterSelector = `[data-testid="${fieldName}-character-counter"]`;
    await expect(this.page.locator(counterSelector)).toHaveClass(/text-red-600/);
  }

  /**
   * バリデーションエラーメッセージの確認
   */
  async expectValidationError(fieldName: string, message: string) {
    const errorSelector = `[data-testid="${fieldName}-error"]`;
    await expect(this.page.locator(errorSelector)).toContainText(message);
  }

  /**
   * 成功メッセージの確認
   */
  async expectSuccessMessage(message: string) {
    await expect(this.page.locator('[role="alert"]')).toContainText(message);
  }

  /**
   * 下書き保存成功メッセージの確認
   */
  async expectDraftSaveSuccess() {
    await expect(this.page.locator('text=下書きを保存しました')).toBeVisible();
  }

  /**
   * 下書き復元メッセージの確認
   */
  async expectDraftRestored() {
    await expect(this.page.locator('text=下書きが復元されました')).toBeVisible();
  }

  /**
   * ローディング状態の確認
   */
  async expectLoading() {
    await expect(this.page.locator('[data-testid="submit-button"]')).toContainText('処理中');
  }

  /**
   * ボタンの有効/無効状態確認
   */
  async expectSubmitButtonEnabled() {
    await expect(this.page.locator('[data-testid="submit-button"]')).toBeEnabled();
  }

  async expectSubmitButtonDisabled() {
    await expect(this.page.locator('[data-testid="submit-button"]')).toBeDisabled();
  }

  /**
   * 日付ピッカーを開く
   */
  async openDatePicker() {
    await this.page.click('[data-testid="goal-deadline-input"]');
  }

  /**
   * 日付ピッカーで日付を選択
   */
  async selectDateFromPicker(date: string) {
    await this.openDatePicker();
    // 日付ピッカーが表示されるまで待機
    await expect(this.page.locator('.react-datepicker')).toBeVisible();

    // 特定の日付をクリック
    await this.page.click(`[aria-label*="${date}"]`);
  }

  /**
   * フォームフィールドの値を取得
   */
  async getFieldValue(fieldName: string): Promise<string> {
    return await this.page.inputValue(`[data-testid="${fieldName}-input"]`);
  }

  /**
   * フォームの全データを取得
   */
  async getFormData() {
    return {
      title: await this.getFieldValue('goal-title'),
      description: await this.getFieldValue('goal-description'),
      deadline: await this.getFieldValue('goal-deadline'),
      background: await this.getFieldValue('goal-background'),
      constraints: await this.getFieldValue('goal-constraints'),
    };
  }

  /**
   * ページリダイレクトの確認
   */
  async expectRedirectTo(path: string) {
    await expect(this.page).toHaveURL(new RegExp(path));
  }

  /**
   * フォームリセットの確認
   */
  async expectFormReset() {
    await expect(this.page.locator('[data-testid="goal-title-input"]')).toHaveValue('');
    await expect(this.page.locator('[data-testid="goal-description-input"]')).toHaveValue('');
    await expect(this.page.locator('[data-testid="goal-deadline-input"]')).toHaveValue('');
    await expect(this.page.locator('[data-testid="goal-background-input"]')).toHaveValue('');
    await expect(this.page.locator('[data-testid="goal-constraints-input"]')).toHaveValue('');
  }

  /**
   * キーボードナビゲーションのテスト
   */
  async testKeyboardNavigation() {
    // Tabキーでフォーカス移動
    await this.page.keyboard.press('Tab');
    await expect(this.page.locator('[data-testid="goal-title-input"]')).toBeFocused();

    await this.page.keyboard.press('Tab');
    await expect(this.page.locator('[data-testid="goal-description-input"]')).toBeFocused();

    await this.page.keyboard.press('Tab');
    await expect(this.page.locator('[data-testid="goal-deadline-input"]')).toBeFocused();

    await this.page.keyboard.press('Tab');
    await expect(this.page.locator('[data-testid="goal-background-input"]')).toBeFocused();

    await this.page.keyboard.press('Tab');
    await expect(this.page.locator('[data-testid="goal-constraints-input"]')).toBeFocused();
  }

  /**
   * レスポンシブレイアウトの確認
   */
  async expectMobileLayout() {
    // モバイルレイアウトでは1カラム表示
    const container = this.page.locator('[data-testid="goal-form-container"]');
    await expect(container).toHaveClass(/flex-col/);
  }

  async expectDesktopLayout() {
    // デスクトップレイアウトでは2カラム表示の可能性
    const container = this.page.locator('[data-testid="goal-form-container"]');
    await expect(container).toBeVisible();
  }

  /**
   * アクセシビリティ属性の確認
   */
  async expectAccessibilityAttributes() {
    // ARIA属性の確認
    await expect(this.page.locator('[data-testid="goal-title-input"]')).toHaveAttribute(
      'aria-required',
      'true'
    );
    await expect(this.page.locator('[data-testid="goal-description-input"]')).toHaveAttribute(
      'aria-required',
      'true'
    );
    await expect(this.page.locator('[data-testid="goal-deadline-input"]')).toHaveAttribute(
      'aria-required',
      'true'
    );
    await expect(this.page.locator('[data-testid="goal-background-input"]')).toHaveAttribute(
      'aria-required',
      'true'
    );

    // ラベルの関連付け確認
    await expect(this.page.locator('label[for="goal-title"]')).toBeVisible();
    await expect(this.page.locator('label[for="goal-description"]')).toBeVisible();
    await expect(this.page.locator('label[for="goal-deadline"]')).toBeVisible();
    await expect(this.page.locator('label[for="goal-background"]')).toBeVisible();
  }
}
