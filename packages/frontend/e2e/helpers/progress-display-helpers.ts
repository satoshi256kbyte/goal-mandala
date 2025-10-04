import { Page, expect, Locator } from '@playwright/test';

/**
 * 進捗表示機能のE2Eテスト用ヘルパークラス
 *
 * 進捗表示に関する共通操作とアサーションを提供
 */
export class ProgressDisplayHelpers {
  constructor(private page: Page) {}

  /**
   * マンダラチャート画面に移動
   */
  async goToMandalaChart(goalId: string = 'test-goal-1') {
    await this.page.goto(`/mandala/${goalId}`);
    await this.page.waitForLoadState('networkidle');

    // マンダラチャートが読み込まれるまで待機
    await expect(this.page.locator('.mandala-chart')).toBeVisible();
    await expect(this.page.locator('.mandala-grid')).toBeVisible();
  }

  /**
   * タスク詳細画面に移動
   */
  async goToTaskDetail(taskId: string) {
    await this.page.goto(`/tasks/${taskId}`);
    await this.page.waitForLoadState('networkidle');

    // タスク詳細画面が読み込まれるまで待機
    await expect(this.page.locator('[data-testid="task-detail-container"]')).toBeVisible();
  }

  /**
   * タスクリスト画面に移動
   */
  async goToTaskList() {
    await this.page.goto('/tasks');
    await this.page.waitForLoadState('networkidle');

    // タスクリストが読み込まれるまで待機
    await expect(this.page.locator('[data-testid="task-list-container"]')).toBeVisible();
  }

  /**
   * タスクを完了状態に更新
   */
  async completeTask(taskId?: string) {
    if (taskId) {
      await this.goToTaskDetail(taskId);
    }

    // 完了ボタンをクリック
    await this.page.click('[data-testid="task-complete-button"]');

    // 完了確認ダイアログが表示される場合は確認
    const confirmDialog = this.page.locator('[data-testid="confirm-dialog"]');
    if (await confirmDialog.isVisible()) {
      await this.page.click('[data-testid="confirm-button"]');
    }

    // 完了状態の更新を待機
    await expect(this.page.locator('[data-testid="task-status"]')).toContainText('完了');

    // 成功メッセージの確認
    await expect(this.page.locator('[data-testid="success-message"]')).toContainText(
      'タスクを完了しました'
    );
  }

  /**
   * 複数のタスクを一括完了
   */
  async completeMultipleTasks(taskIds: string[]) {
    for (const taskId of taskIds) {
      await this.completeTask(taskId);
      // 各タスク完了後に少し待機（進捗計算処理のため）
      await this.page.waitForTimeout(500);
    }
  }

  /**
   * 習慣タスクを継続状態に更新
   */
  async continueHabitTask(taskId: string) {
    await this.goToTaskDetail(taskId);

    // 継続ボタンをクリック
    await this.page.click('[data-testid="task-continue-button"]');

    // 継続状態の更新を待機
    await expect(this.page.locator('[data-testid="task-status"]')).toContainText('継続中');

    // 成功メッセージの確認
    await expect(this.page.locator('[data-testid="success-message"]')).toContainText(
      '習慣を継続しました'
    );
  }

  /**
   * プログレスバーの進捗値を取得
   */
  async getProgressValue(selector: string = '[data-testid="progress-bar"]'): Promise<number> {
    const progressBar = this.page.locator(selector);
    await expect(progressBar).toBeVisible();

    const ariaValueNow = await progressBar.getAttribute('aria-valuenow');
    return ariaValueNow ? parseInt(ariaValueNow, 10) : 0;
  }

  /**
   * プログレスバーの進捗値が期待値になるまで待機
   */
  async waitForProgressValue(selector: string, expectedValue: number, timeout: number = 5000) {
    await expect(async () => {
      const currentValue = await this.getProgressValue(selector);
      expect(currentValue).toBe(expectedValue);
    }).toPass({ timeout });
  }

  /**
   * プログレスバーの色を確認
   */
  async expectProgressColor(selector: string, expectedColorClass: string) {
    const progressFill = this.page.locator(`${selector} .h-full`);
    await expect(progressFill).toHaveClass(new RegExp(expectedColorClass));
  }

  /**
   * プログレスバーの進捗値を確認
   */
  async expectProgressValue(selector: string, expectedValue: number) {
    const progressBar = this.page.locator(selector);
    await expect(progressBar).toHaveAttribute('aria-valuenow', expectedValue.toString());
  }

  /**
   * アニメーション効果の確認
   */
  async expectProgressAnimation(selector: string = '[data-testid="progress-bar"]') {
    const progressFill = this.page.locator(`${selector} .h-full`);

    // トランジション効果が適用されていることを確認
    await expect(progressFill).toHaveCSS('transition-duration', /[0-9.]+s/);

    // アニメーション中のクラスが適用されることを確認
    await expect(progressFill).toHaveClass(/transition/);
  }

  /**
   * 達成アニメーション効果の確認
   */
  async expectAchievementAnimation(selector: string = '[data-testid="progress-bar"]') {
    const achievementElement = this.page.locator(
      `${selector} [data-testid="achievement-animation"]`
    );

    // 達成アニメーションが表示されることを確認
    await expect(achievementElement).toBeVisible();

    // グロー効果が適用されることを確認
    await expect(achievementElement).toHaveClass(/glow/);

    // アニメーション終了後に非表示になることを確認
    await expect(achievementElement).toBeHidden({ timeout: 2000 });
  }

  /**
   * マンダラセルの色分け表示を確認
   */
  async expectCellColorScheme(cellSelector: string, progress: number) {
    const cell = this.page.locator(cellSelector);

    if (progress === 0) {
      await expect(cell).toHaveClass(/bg-gray-100/);
    } else if (progress < 50) {
      await expect(cell).toHaveClass(/bg-red-50/);
    } else if (progress < 80) {
      await expect(cell).toHaveClass(/bg-yellow-50/);
    } else if (progress < 100) {
      await expect(cell).toHaveClass(/bg-green-50/);
    } else {
      await expect(cell).toHaveClass(/bg-green-100/);
    }
  }

  /**
   * セル色変化のトランジション効果を確認
   */
  async expectCellColorTransition(cellSelector: string) {
    const cell = this.page.locator(cellSelector);

    // トランジション効果が適用されていることを確認
    await expect(cell).toHaveCSS('transition-duration', /0\.3s/);
    await expect(cell).toHaveCSS('transition-property', /background-color|all/);
  }

  /**
   * 進捗履歴画面に移動
   */
  async goToProgressHistory(goalId: string = 'test-goal-1') {
    await this.page.goto(`/mandala/${goalId}/progress-history`);
    await this.page.waitForLoadState('networkidle');

    // 履歴画面が読み込まれるまで待機
    await expect(this.page.locator('[data-testid="progress-history-container"]')).toBeVisible();
  }

  /**
   * 進捗履歴チャートの表示を確認
   */
  async expectProgressHistoryChart() {
    // チャートコンテナが表示されることを確認
    await expect(this.page.locator('[data-testid="progress-history-chart"]')).toBeVisible();

    // Rechartsコンポーネントが表示されることを確認
    await expect(this.page.locator('.recharts-wrapper')).toBeVisible();

    // 日付軸が表示されることを確認
    await expect(this.page.locator('.recharts-xAxis')).toBeVisible();

    // 進捗率軸が表示されることを確認
    await expect(this.page.locator('.recharts-yAxis')).toBeVisible();

    // 線グラフが表示されることを確認
    await expect(this.page.locator('.recharts-line')).toBeVisible();
  }

  /**
   * 履歴データポイントのクリック
   */
  async clickHistoryDataPoint(index: number = 0) {
    const dataPoints = this.page.locator('.recharts-dot');
    await expect(dataPoints).toHaveCount(1, { timeout: 5000 });
    await dataPoints.nth(index).click();
  }

  /**
   * 履歴詳細情報の表示を確認
   */
  async expectHistoryDetailTooltip(expectedDate: string, expectedProgress: number) {
    const tooltip = this.page.locator('[data-testid="history-tooltip"]');
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toContainText(expectedDate);
    await expect(tooltip).toContainText(`${expectedProgress}%`);
  }

  /**
   * 重要な変化点のハイライト表示を確認
   */
  async expectSignificantChangeHighlight() {
    const highlightedPoints = this.page.locator('.recharts-dot.significant-change');
    await expect(highlightedPoints).toHaveCount(1, { timeout: 5000 });

    // ハイライト色が適用されていることを確認
    await expect(highlightedPoints.first()).toHaveCSS('fill', /rgb\(239, 68, 68\)/); // red-500
  }

  /**
   * 履歴データが存在しない場合のメッセージ確認
   */
  async expectNoHistoryMessage() {
    await expect(this.page.locator('[data-testid="no-history-message"]')).toBeVisible();
    await expect(this.page.locator('[data-testid="no-history-message"]')).toContainText(
      '進捗履歴データがありません'
    );
  }

  /**
   * ツールチップの表示を確認
   */
  async expectProgressTooltip(selector: string, expectedText: string) {
    const progressBar = this.page.locator(selector);

    // ホバーしてツールチップを表示
    await progressBar.hover();

    // ツールチップが表示されることを確認
    const tooltip = this.page.locator('[data-testid="progress-tooltip"]');
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toContainText(expectedText);
  }

  /**
   * 詳細な進捗ツールチップの内容を確認
   */
  async expectDetailedProgressTooltip(
    selector: string,
    expectedData: {
      currentValue?: number;
      previousValue?: number;
      completedTasks?: number;
      totalTasks?: number;
      lastUpdated?: string;
    }
  ) {
    const progressBar = this.page.locator(selector);
    await progressBar.hover();

    const tooltip = this.page.locator('[data-testid="progress-tooltip"]');
    await expect(tooltip).toBeVisible();

    if (expectedData.currentValue !== undefined) {
      await expect(tooltip).toContainText(`${expectedData.currentValue}%`);
    }
    if (expectedData.completedTasks !== undefined && expectedData.totalTasks !== undefined) {
      await expect(tooltip).toContainText(
        `${expectedData.completedTasks}/${expectedData.totalTasks}`
      );
    }
    if (expectedData.lastUpdated) {
      await expect(tooltip).toContainText(expectedData.lastUpdated);
    }
  }

  /**
   * モバイル対応のタッチ操作テスト
   */
  async testMobileTooltip(selector: string) {
    const progressBar = this.page.locator(selector);

    // タッチ操作でツールチップを表示
    await progressBar.tap();

    // ツールチップが表示されることを確認
    const tooltip = this.page.locator('[data-testid="progress-tooltip"]');
    await expect(tooltip).toBeVisible();

    // 3秒後に自動で非表示になることを確認
    await expect(tooltip).toBeHidden({ timeout: 4000 });
  }

  /**
   * 進捗トレンド分析結果の確認
   */
  async expectProgressTrend(expectedDirection: 'increasing' | 'decreasing' | 'stable') {
    const trendIndicator = this.page.locator('[data-testid="progress-trend"]');
    await expect(trendIndicator).toBeVisible();

    const trendText =
      expectedDirection === 'increasing'
        ? '増加'
        : expectedDirection === 'decreasing'
          ? '減少'
          : '安定';
    await expect(trendIndicator).toContainText(trendText);

    // トレンド率の表示を確認
    const trendRate = this.page.locator('[data-testid="trend-rate"]');
    await expect(trendRate).toBeVisible();
    await expect(trendRate).toContainText(/%\/日/);
  }

  /**
   * アニメーション設定の変更
   */
  async toggleAnimationSettings(enabled: boolean) {
    await this.page.goto('/settings');
    await this.page.waitForLoadState('networkidle');

    const checkbox = this.page.locator('[data-testid="animation-enabled-checkbox"]');
    const isChecked = await checkbox.isChecked();

    if ((enabled && !isChecked) || (!enabled && isChecked)) {
      await checkbox.click();
    }

    await this.page.click('[data-testid="save-settings-button"]');
    await expect(this.page.locator('[data-testid="settings-saved-message"]')).toBeVisible();
  }

  /**
   * カラーブラインドネス対応設定の変更
   */
  async toggleColorBlindFriendlyMode(enabled: boolean) {
    await this.page.goto('/settings');
    await this.page.waitForLoadState('networkidle');

    const checkbox = this.page.locator('[data-testid="color-blind-friendly-checkbox"]');
    const isChecked = await checkbox.isChecked();

    if ((enabled && !isChecked) || (!enabled && isChecked)) {
      await checkbox.click();
    }

    await this.page.click('[data-testid="save-settings-button"]');
    await expect(this.page.locator('[data-testid="settings-saved-message"]')).toBeVisible();
  }

  /**
   * ハイコントラストモード設定の変更
   */
  async toggleHighContrastMode(enabled: boolean) {
    await this.page.goto('/settings');
    await this.page.waitForLoadState('networkidle');

    const checkbox = this.page.locator('[data-testid="high-contrast-checkbox"]');
    const isChecked = await checkbox.isChecked();

    if ((enabled && !isChecked) || (!enabled && isChecked)) {
      await checkbox.click();
    }

    await this.page.click('[data-testid="save-settings-button"]');
    await expect(this.page.locator('[data-testid="settings-saved-message"]')).toBeVisible();
  }

  /**
   * 進捗計算の整合性を確認
   */
  async verifyProgressCalculationConsistency(goalId: string) {
    await this.goToMandalaChart(goalId);

    // 各階層の進捗値を取得
    const actionProgress = await this.getProgressValue('[data-testid="action-progress-bar"]');
    const subGoalProgress = await this.getProgressValue('[data-testid="subgoal-progress-bar"]');
    const goalProgress = await this.getProgressValue('[data-testid="goal-progress-bar"]');

    // 階層的な進捗計算の整合性を確認
    // サブ目標進捗はアクション進捗の平均以下であるべき
    expect(subGoalProgress).toBeLessThanOrEqual(actionProgress + 10); // 10%の誤差を許容

    // 目標進捗はサブ目標進捗の平均以下であるべき
    expect(goalProgress).toBeLessThanOrEqual(subGoalProgress + 10); // 10%の誤差を許容
  }

  /**
   * パフォーマンス測定
   */
  async measureProgressUpdatePerformance(taskId: string): Promise<number> {
    const startTime = Date.now();

    await this.completeTask(taskId);
    await this.goToMandalaChart();

    // 進捗バーが更新されるまで待機
    await expect(this.page.locator('[data-testid="action-progress-bar"]')).toBeVisible();

    const endTime = Date.now();
    return endTime - startTime;
  }

  /**
   * エラー状態の確認
   */
  async expectProgressError(errorMessage: string) {
    const errorElement = this.page.locator('[data-testid="progress-error-message"]');
    await expect(errorElement).toBeVisible();
    await expect(errorElement).toContainText(errorMessage);
  }

  /**
   * ローディング状態の確認
   */
  async expectProgressLoading() {
    const loadingElement = this.page.locator('[data-testid="progress-loading"]');
    await expect(loadingElement).toBeVisible();
  }

  /**
   * リトライ機能のテスト
   */
  async testRetryFunctionality() {
    const retryButton = this.page.locator('[data-testid="retry-button"]');
    await expect(retryButton).toBeVisible();
    await retryButton.click();

    // リトライ後にローディング状態になることを確認
    await this.expectProgressLoading();
  }

  /**
   * キーボードアクセシビリティのテスト
   */
  async testKeyboardAccessibility() {
    // Tabキーでプログレスバーにフォーカス
    await this.page.keyboard.press('Tab');
    const focusedElement = this.page.locator(':focus');
    await expect(focusedElement).toHaveAttribute('role', 'progressbar');

    // Enterキーでツールチップ表示
    await this.page.keyboard.press('Enter');
    const tooltip = this.page.locator('[data-testid="progress-tooltip"]');
    await expect(tooltip).toBeVisible();

    // Escapeキーでツールチップ非表示
    await this.page.keyboard.press('Escape');
    await expect(tooltip).toBeHidden();
  }

  /**
   * ARIA属性の確認
   */
  async expectARIAAttributes(selector: string, expectedLabel?: string) {
    const progressBar = this.page.locator(selector);

    // 基本的なARIA属性の確認
    await expect(progressBar).toHaveAttribute('role', 'progressbar');
    await expect(progressBar).toHaveAttribute('aria-valuenow', /\d+/);
    await expect(progressBar).toHaveAttribute('aria-valuemin', '0');
    await expect(progressBar).toHaveAttribute('aria-valuemax', '100');

    if (expectedLabel) {
      await expect(progressBar).toHaveAttribute('aria-label', expectedLabel);
    }
  }

  /**
   * 複数ブラウザでの表示確認
   */
  async verifyProgressDisplayConsistency() {
    await this.goToMandalaChart();

    // 各プログレスバーが正しく表示されることを確認
    await expect(this.page.locator('[data-testid="action-progress-bar"]')).toBeVisible();
    await expect(this.page.locator('[data-testid="subgoal-progress-bar"]')).toBeVisible();
    await expect(this.page.locator('[data-testid="goal-progress-bar"]')).toBeVisible();

    // 色分けが正しく適用されていることを確認
    const actionProgress = await this.getProgressValue('[data-testid="action-progress-bar"]');
    await this.expectProgressColor(
      '[data-testid="action-progress-bar"]',
      this.getExpectedColorClass(actionProgress)
    );
  }

  /**
   * 進捗値に応じた期待される色クラスを取得
   */
  private getExpectedColorClass(progress: number): string {
    if (progress === 0) return 'bg-gray-400';
    if (progress < 50) return 'bg-red-500';
    if (progress < 80) return 'bg-orange-500';
    return 'bg-green-600';
  }
}
