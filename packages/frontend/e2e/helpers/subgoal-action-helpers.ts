import { Page, expect } from '@playwright/test';

export class SubGoalActionHelpers {
  constructor(private page: Page) {}

  /**
   * サブ目標確認・編集ページに移動
   */
  async goToSubGoalEdit(goalId: string = 'test-goal-id') {
    await this.page.goto(`/mandala/create/subgoals?goalId=${goalId}`);
    await this.page.waitForLoadState('networkidle');
    await expect(this.page.locator('h1')).toContainText('サブ目標確認・編集');
  }

  /**
   * アクション確認・編集ページに移動
   */
  async goToActionEdit(goalId: string = 'test-goal-id') {
    await this.page.goto(`/mandala/create/actions?goalId=${goalId}`);
    await this.page.waitForLoadState('networkidle');
    await expect(this.page.locator('h1')).toContainText('アクション確認・編集');
  }

  // === サブ目標編集関連 ===

  /**
   * サブ目標一覧の表示を確認
   */
  async expectSubGoalListVisible() {
    await expect(this.page.locator('[data-testid="subgoal-list"]')).toBeVisible();

    // 8つのサブ目標が表示されることを確認
    const subGoalItems = this.page.locator('[data-testid^="subgoal-item-"]');
    await expect(subGoalItems).toHaveCount(8);
  }

  /**
   * 特定のサブ目標を選択
   */
  async selectSubGoal(index: number) {
    await this.page.click(`[data-testid="subgoal-item-${index}"]`);
    await expect(this.page.locator(`[data-testid="subgoal-item-${index}"]`)).toHaveClass(
      /selected/
    );
  }

  /**
   * サブ目標編集フォームに入力
   */
  async fillSubGoalForm(data: {
    title: string;
    description: string;
    background: string;
    constraints?: string;
  }) {
    await this.page.fill('[data-testid="subgoal-title-input"]', data.title);
    await this.page.fill('[data-testid="subgoal-description-input"]', data.description);
    await this.page.fill('[data-testid="subgoal-background-input"]', data.background);

    if (data.constraints) {
      await this.page.fill('[data-testid="subgoal-constraints-input"]', data.constraints);
    }
  }

  /**
   * サブ目標の保存
   */
  async saveSubGoal() {
    await this.page.click('[data-testid="save-subgoal-button"]');
    await expect(this.page.locator('text=保存しました')).toBeVisible();
  }

  /**
   * サブ目標の再生成
   */
  async regenerateSubGoals() {
    await this.page.click('[data-testid="regenerate-subgoals-button"]');
    await expect(this.page.locator('text=再生成中')).toBeVisible();
  }

  /**
   * 次のステップ（アクション編集）に進む
   */
  async proceedToActions() {
    await this.page.click('[data-testid="proceed-to-actions-button"]');
    await this.expectRedirectTo('/mandala/create/actions');
  }

  // === アクション編集関連 ===

  /**
   * アクション一覧の表示を確認（64個）
   */
  async expectActionListVisible() {
    await expect(this.page.locator('[data-testid="action-list"]')).toBeVisible();

    // 64個のアクションが表示されることを確認
    const actionItems = this.page.locator('[data-testid^="action-item-"]');
    await expect(actionItems).toHaveCount(64);
  }

  /**
   * サブ目標タブを選択
   */
  async selectSubGoalTab(index: number) {
    await this.page.click(`[data-testid="subgoal-tab-${index}"]`);
    await expect(this.page.locator(`[data-testid="subgoal-tab-${index}"]`)).toHaveClass(/active/);

    // 該当するサブ目標の8個のアクションが表示されることを確認
    const visibleActions = this.page.locator('[data-testid^="action-item-"]:visible');
    await expect(visibleActions).toHaveCount(8);
  }

  /**
   * 特定のアクションを選択
   */
  async selectAction(subGoalIndex: number, actionIndex: number) {
    const actionId = `action-item-${subGoalIndex}-${actionIndex}`;
    await this.page.click(`[data-testid="${actionId}"]`);
    await expect(this.page.locator(`[data-testid="${actionId}"]`)).toHaveClass(/selected/);
  }

  /**
   * アクション編集フォームに入力
   */
  async fillActionForm(data: {
    title: string;
    description: string;
    background: string;
    type: 'execution' | 'habit';
    constraints?: string;
  }) {
    await this.page.fill('[data-testid="action-title-input"]', data.title);
    await this.page.fill('[data-testid="action-description-input"]', data.description);
    await this.page.fill('[data-testid="action-background-input"]', data.background);

    // アクション種別を選択
    await this.page.selectOption('[data-testid="action-type-select"]', data.type);

    if (data.constraints) {
      await this.page.fill('[data-testid="action-constraints-input"]', data.constraints);
    }
  }

  /**
   * アクションの保存
   */
  async saveAction() {
    await this.page.click('[data-testid="save-action-button"]');
    await expect(this.page.locator('text=保存しました')).toBeVisible();
  }

  /**
   * 活動開始に進む
   */
  async startActivity() {
    await this.page.click('[data-testid="start-activity-button"]');
    await this.expectRedirectTo('/mandala/create/confirm');
  }

  // === ドラッグ&ドロップ関連 ===

  /**
   * サブ目標をドラッグ&ドロップで並び替え
   */
  async dragSubGoal(fromIndex: number, toIndex: number) {
    const fromElement = this.page.locator(`[data-testid="subgoal-item-${fromIndex}"]`);
    const toElement = this.page.locator(`[data-testid="subgoal-item-${toIndex}"]`);

    await fromElement.dragTo(toElement);

    // 並び替えが完了するまで待機
    await this.page.waitForTimeout(500);
  }

  /**
   * アクションをドラッグ&ドロップで並び替え
   */
  async dragAction(subGoalIndex: number, fromActionIndex: number, toActionIndex: number) {
    const fromElement = this.page.locator(
      `[data-testid="action-item-${subGoalIndex}-${fromActionIndex}"]`
    );
    const toElement = this.page.locator(
      `[data-testid="action-item-${subGoalIndex}-${toActionIndex}"]`
    );

    await fromElement.dragTo(toElement);

    // 並び替えが完了するまで待機
    await this.page.waitForTimeout(500);
  }

  /**
   * ドラッグ中の視覚的フィードバックを確認
   */
  async expectDragFeedback() {
    // ドラッグ中の要素にクラスが付与されることを確認
    await expect(this.page.locator('.dragging')).toBeVisible();
  }

  // === 一括編集関連 ===

  /**
   * 複数のサブ目標を選択
   */
  async selectMultipleSubGoals(indices: number[]) {
    // 一括選択モードに切り替え
    await this.page.click('[data-testid="bulk-edit-mode-button"]');

    // 複数のサブ目標を選択
    for (const index of indices) {
      await this.page.click(`[data-testid="subgoal-checkbox-${index}"]`);
    }

    // 選択された項目数を確認
    await expect(this.page.locator('[data-testid="selected-count"]')).toContainText(
      `${indices.length}個選択中`
    );
  }

  /**
   * 複数のアクションを選択
   */
  async selectMultipleActions(subGoalIndex: number, actionIndices: number[]) {
    // 一括選択モードに切り替え
    await this.page.click('[data-testid="bulk-edit-mode-button"]');

    // 複数のアクションを選択
    for (const actionIndex of actionIndices) {
      await this.page.click(`[data-testid="action-checkbox-${subGoalIndex}-${actionIndex}"]`);
    }

    // 選択された項目数を確認
    await expect(this.page.locator('[data-testid="selected-count"]')).toContainText(
      `${actionIndices.length}個選択中`
    );
  }

  /**
   * 一括編集モーダルを開く
   */
  async openBulkEditModal() {
    await this.page.click('[data-testid="bulk-edit-button"]');
    await expect(this.page.locator('[data-testid="bulk-edit-modal"]')).toBeVisible();
  }

  /**
   * 一括編集で共通項目を変更
   */
  async bulkEditCommonFields(data: { background?: string; constraints?: string }) {
    if (data.background) {
      await this.page.fill('[data-testid="bulk-background-input"]', data.background);
    }

    if (data.constraints) {
      await this.page.fill('[data-testid="bulk-constraints-input"]', data.constraints);
    }
  }

  /**
   * 一括編集を保存
   */
  async saveBulkEdit() {
    await this.page.click('[data-testid="save-bulk-edit-button"]');
    await expect(this.page.locator('text=一括編集を保存しました')).toBeVisible();
  }

  /**
   * 一括削除を実行
   */
  async bulkDelete() {
    await this.page.click('[data-testid="bulk-delete-button"]');

    // 確認ダイアログが表示されることを確認
    await expect(this.page.locator('[data-testid="delete-confirmation-dialog"]')).toBeVisible();

    // 削除を確定
    await this.page.click('[data-testid="confirm-delete-button"]');

    await expect(this.page.locator('text=削除しました')).toBeVisible();
  }

  // === 下書き保存関連 ===

  /**
   * 下書き保存ボタンをクリック
   */
  async saveDraft() {
    await this.page.click('[data-testid="save-draft-button"]');
    await expect(this.page.locator('text=下書きを保存しました')).toBeVisible();
  }

  /**
   * 自動保存の動作を確認
   */
  async expectAutoSave() {
    // 自動保存インジケーターが表示されることを確認
    await expect(this.page.locator('[data-testid="auto-save-indicator"]')).toBeVisible();
    await expect(this.page.locator('text=自動保存中')).toBeVisible();

    // 自動保存完了を確認
    await expect(this.page.locator('text=自動保存完了')).toBeVisible();
  }

  /**
   * 下書き復元の確認
   */
  async expectDraftRestored() {
    await expect(this.page.locator('text=下書きが復元されました')).toBeVisible();
  }

  /**
   * 画面離脱時の確認ダイアログ
   */
  async expectUnsavedChangesDialog() {
    // ページ離脱を試行
    this.page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('未保存の変更があります');
      await dialog.accept();
    });
  }

  // === バリデーション関連 ===

  /**
   * バリデーションエラーメッセージの確認
   */
  async expectValidationError(fieldName: string, message: string) {
    const errorSelector = `[data-testid="${fieldName}-error"]`;
    await expect(this.page.locator(errorSelector)).toContainText(message);
  }

  /**
   * 文字数カウンターの確認
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

  // === アクセシビリティ関連 ===

  /**
   * キーボードナビゲーションのテスト
   */
  async testKeyboardNavigation() {
    // Tabキーでフォーカス移動
    await this.page.keyboard.press('Tab');

    // フォーカスが適切に移動することを確認
    const focusedElement = await this.page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  }

  /**
   * ARIA属性の確認
   */
  async expectAccessibilityAttributes() {
    // 必須フィールドのaria-required属性を確認
    await expect(this.page.locator('[data-testid="subgoal-title-input"]')).toHaveAttribute(
      'aria-required',
      'true'
    );
    await expect(this.page.locator('[data-testid="action-title-input"]')).toHaveAttribute(
      'aria-required',
      'true'
    );

    // ラベルの関連付けを確認
    await expect(this.page.locator('label[for="subgoal-title"]')).toBeVisible();
    await expect(this.page.locator('label[for="action-title"]')).toBeVisible();
  }

  /**
   * スクリーンリーダー対応の確認
   */
  async expectScreenReaderSupport() {
    // ライブリージョンの確認
    await expect(this.page.locator('[aria-live="polite"]')).toBeVisible();

    // 状態変更の通知確認
    await expect(this.page.locator('[role="status"]')).toBeVisible();
  }

  // === レスポンシブ対応関連 ===

  /**
   * モバイルレイアウトの確認
   */
  async expectMobileLayout() {
    // モバイルでは縦スクロール表示
    const container = this.page.locator('[data-testid="subgoal-action-container"]');
    await expect(container).toHaveClass(/flex-col/);
  }

  /**
   * タブレットレイアウトの確認
   */
  async expectTabletLayout() {
    // タブレットでは中間レイアウト
    const container = this.page.locator('[data-testid="subgoal-action-container"]');
    await expect(container).toBeVisible();
  }

  /**
   * デスクトップレイアウトの確認
   */
  async expectDesktopLayout() {
    // デスクトップでは横並び表示
    const container = this.page.locator('[data-testid="subgoal-action-container"]');
    await expect(container).toHaveClass(/flex-row/);
  }

  // === ユーティリティ関数 ===

  /**
   * ページリダイレクトの確認
   */
  async expectRedirectTo(path: string) {
    await expect(this.page).toHaveURL(new RegExp(path));
  }

  /**
   * ローディング状態の確認
   */
  async expectLoading() {
    await expect(this.page.locator('[data-testid="loading-indicator"]')).toBeVisible();
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
   * フォームデータの取得
   */
  async getSubGoalFormData() {
    return {
      title: await this.page.inputValue('[data-testid="subgoal-title-input"]'),
      description: await this.page.inputValue('[data-testid="subgoal-description-input"]'),
      background: await this.page.inputValue('[data-testid="subgoal-background-input"]'),
      constraints: await this.page.inputValue('[data-testid="subgoal-constraints-input"]'),
    };
  }

  /**
   * アクションフォームデータの取得
   */
  async getActionFormData() {
    return {
      title: await this.page.inputValue('[data-testid="action-title-input"]'),
      description: await this.page.inputValue('[data-testid="action-description-input"]'),
      background: await this.page.inputValue('[data-testid="action-background-input"]'),
      type: await this.page.inputValue('[data-testid="action-type-select"]'),
      constraints: await this.page.inputValue('[data-testid="action-constraints-input"]'),
    };
  }
}
