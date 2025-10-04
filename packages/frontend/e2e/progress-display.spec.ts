import { test, expect, Page } from '@playwright/test';
import { AuthHelpers } from './helpers/auth-helpers';

/**
 * 進捗表示機能のE2Eテスト
 *
 * テスト対象:
 * - ユーザーがタスクを完了し、進捗が更新される流れ
 * - アニメーション効果が適切に表示されること
 * - 履歴表示機能が正しく動作すること
 *
 * 要件: 全要件 (1.1-5.5)
 */

class ProgressDisplayHelpers {
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
  }

  /**
   * プログレスバーの進捗値を取得
   */
  async getProgressValue(selector: string = '[data-testid="progress-bar"]'): Promise<number> {
    const progressBar = this.page.locator(selector);
    const ariaValueNow = await progressBar.getAttribute('aria-valuenow');
    return ariaValueNow ? parseInt(ariaValueNow, 10) : 0;
  }

  /**
   * プログレスバーの色を確認
   */
  async expectProgressColor(selector: string, expectedColorClass: string) {
    const progressFill = this.page.locator(`${selector} .h-full`);
    await expect(progressFill).toHaveClass(new RegExp(expectedColorClass));
  }

  /**
   * アニメーション効果の確認
   */
  async expectProgressAnimation(selector: string = '[data-testid="progress-bar"]') {
    const progressFill = this.page.locator(`${selector} .h-full`);

    // トランジション効果が適用されていることを確認
    await expect(progressFill).toHaveCSS('transition-duration', /[0-9.]+s/);

    // アニメーション中のクラスが適用されることを確認（一時的に）
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
}

test.describe('進捗表示機能 E2E テスト', () => {
  let authHelpers: AuthHelpers;
  let progressHelpers: ProgressDisplayHelpers;

  test.beforeEach(async ({ page }) => {
    authHelpers = new AuthHelpers(page);
    progressHelpers = new ProgressDisplayHelpers(page);

    // ログイン処理
    await authHelpers.goToLogin();
    await authHelpers.fillLoginForm('test@example.com', 'password123');
    await authHelpers.clickLoginButton();
    await authHelpers.expectRedirectTo('/');
  });

  test.describe('タスク完了から進捗更新までの流れ', () => {
    test('タスクを完了すると進捗が更新される', async ({ page }) => {
      // マンダラチャート画面に移動
      await progressHelpers.goToMandalaChart();

      // 初期進捗値を記録
      const initialProgress = await progressHelpers.getProgressValue(
        '[data-testid="action-progress-bar"]'
      );

      // タスクを完了
      await progressHelpers.completeTask('task-1');

      // マンダラチャート画面に戻る
      await progressHelpers.goToMandalaChart();

      // 進捗が更新されていることを確認
      const updatedProgress = await progressHelpers.getProgressValue(
        '[data-testid="action-progress-bar"]'
      );
      expect(updatedProgress).toBeGreaterThan(initialProgress);
    });

    test('複数のタスクを完了すると階層的に進捗が更新される', async ({ page }) => {
      await progressHelpers.goToMandalaChart();

      // 初期進捗値を記録
      const initialActionProgress = await progressHelpers.getProgressValue(
        '[data-testid="action-progress-bar"]'
      );
      const initialSubGoalProgress = await progressHelpers.getProgressValue(
        '[data-testid="subgoal-progress-bar"]'
      );
      const initialGoalProgress = await progressHelpers.getProgressValue(
        '[data-testid="goal-progress-bar"]'
      );

      // 複数のタスクを完了
      await progressHelpers.completeTask('task-1');
      await progressHelpers.completeTask('task-2');
      await progressHelpers.completeTask('task-3');

      // マンダラチャート画面に戻る
      await progressHelpers.goToMandalaChart();

      // 各階層の進捗が更新されていることを確認
      const updatedActionProgress = await progressHelpers.getProgressValue(
        '[data-testid="action-progress-bar"]'
      );
      const updatedSubGoalProgress = await progressHelpers.getProgressValue(
        '[data-testid="subgoal-progress-bar"]'
      );
      const updatedGoalProgress = await progressHelpers.getProgressValue(
        '[data-testid="goal-progress-bar"]'
      );

      expect(updatedActionProgress).toBeGreaterThan(initialActionProgress);
      expect(updatedSubGoalProgress).toBeGreaterThan(initialSubGoalProgress);
      expect(updatedGoalProgress).toBeGreaterThan(initialGoalProgress);
    });

    test('習慣アクションの継続により進捗が更新される', async ({ page }) => {
      await progressHelpers.goToMandalaChart();

      // 習慣アクションの初期進捗を記録
      const initialProgress = await progressHelpers.getProgressValue(
        '[data-testid="habit-action-progress-bar"]'
      );

      // 習慣タスクを継続状態に更新
      await progressHelpers.goToTaskDetail('habit-task-1');
      await page.click('[data-testid="task-continue-button"]');
      await expect(page.locator('[data-testid="task-status"]')).toContainText('継続中');

      // マンダラチャート画面に戻る
      await progressHelpers.goToMandalaChart();

      // 習慣アクションの進捗が更新されていることを確認
      const updatedProgress = await progressHelpers.getProgressValue(
        '[data-testid="habit-action-progress-bar"]'
      );
      expect(updatedProgress).toBeGreaterThan(initialProgress);
    });
  });

  test.describe('アニメーション効果', () => {
    test('進捗変化時にスムーズなアニメーションが表示される', async ({ page }) => {
      await progressHelpers.goToMandalaChart();

      // タスクを完了してアニメーションをトリガー
      await progressHelpers.completeTask('task-1');
      await progressHelpers.goToMandalaChart();

      // プログレスバーのアニメーション効果を確認
      await progressHelpers.expectProgressAnimation('[data-testid="action-progress-bar"]');
    });

    test('100%達成時に特別なアニメーション効果が表示される', async ({ page }) => {
      await progressHelpers.goToMandalaChart();

      // アクションの全タスクを完了して100%にする
      await progressHelpers.completeTask('task-1');
      await progressHelpers.completeTask('task-2');
      await progressHelpers.completeTask('task-3');
      await progressHelpers.completeTask('task-4');

      await progressHelpers.goToMandalaChart();

      // 達成アニメーション効果を確認
      await progressHelpers.expectAchievementAnimation('[data-testid="action-progress-bar"]');
    });

    test('セル色変化のフェードイン効果が表示される', async ({ page }) => {
      await progressHelpers.goToMandalaChart();

      // 初期セル色を確認
      await progressHelpers.expectCellColorScheme('[data-testid="mandala-cell-action-1"]', 20);

      // タスクを完了して進捗を変更
      await progressHelpers.completeTask('task-1');
      await progressHelpers.goToMandalaChart();

      // セル色が変化していることを確認
      await progressHelpers.expectCellColorScheme('[data-testid="mandala-cell-action-1"]', 60);

      // フェードイン効果が適用されていることを確認
      const cell = page.locator('[data-testid="mandala-cell-action-1"]');
      await expect(cell).toHaveCSS('transition-duration', /0\.3s/);
    });

    test('アニメーション無効設定時はアニメーションが表示されない', async ({ page }) => {
      // アニメーション無効設定を適用
      await page.goto('/settings');
      await page.click('[data-testid="disable-animation-checkbox"]');
      await page.click('[data-testid="save-settings-button"]');

      await progressHelpers.goToMandalaChart();

      // タスクを完了
      await progressHelpers.completeTask('task-1');
      await progressHelpers.goToMandalaChart();

      // アニメーションが無効になっていることを確認
      const progressFill = page.locator('[data-testid="action-progress-bar"] .h-full');
      await expect(progressFill).toHaveClass(/transition-none/);
    });
  });

  test.describe('進捗色分け表示', () => {
    test('進捗値に応じてプログレスバーの色が変化する', async ({ page }) => {
      await progressHelpers.goToMandalaChart();

      // 0%時の色確認（グレー）
      await progressHelpers.expectProgressColor('[data-testid="zero-progress-bar"]', 'bg-gray-400');

      // 30%時の色確認（赤）
      await progressHelpers.expectProgressColor('[data-testid="low-progress-bar"]', 'bg-red-500');

      // 60%時の色確認（オレンジ）
      await progressHelpers.expectProgressColor(
        '[data-testid="medium-progress-bar"]',
        'bg-orange-500'
      );

      // 90%時の色確認（緑）
      await progressHelpers.expectProgressColor(
        '[data-testid="high-progress-bar"]',
        'bg-green-600'
      );
    });

    test('マンダラセルの進捗に応じた色分け表示', async ({ page }) => {
      await progressHelpers.goToMandalaChart();

      // 各進捗レベルのセル色を確認
      await progressHelpers.expectCellColorScheme('[data-testid="mandala-cell-0"]', 0);
      await progressHelpers.expectCellColorScheme('[data-testid="mandala-cell-30"]', 30);
      await progressHelpers.expectCellColorScheme('[data-testid="mandala-cell-60"]', 60);
      await progressHelpers.expectCellColorScheme('[data-testid="mandala-cell-90"]', 90);
      await progressHelpers.expectCellColorScheme('[data-testid="mandala-cell-100"]', 100);
    });

    test('カラーブラインドネス対応モードでの色分け', async ({ page }) => {
      // カラーブラインドネス対応モードを有効化
      await page.goto('/settings');
      await page.click('[data-testid="color-blind-friendly-checkbox"]');
      await page.click('[data-testid="save-settings-button"]');

      await progressHelpers.goToMandalaChart();

      // カラーブラインドネス対応色が適用されていることを確認
      await progressHelpers.expectProgressColor('[data-testid="low-progress-bar"]', 'bg-blue-600');
      await progressHelpers.expectProgressColor(
        '[data-testid="medium-progress-bar"]',
        'bg-purple-600'
      );
      await progressHelpers.expectProgressColor('[data-testid="high-progress-bar"]', 'bg-teal-600');
    });
  });

  test.describe('ツールチップ機能', () => {
    test('プログレスバーホバー時に詳細情報が表示される', async ({ page }) => {
      await progressHelpers.goToMandalaChart();

      // ツールチップの表示を確認
      await progressHelpers.expectProgressTooltip(
        '[data-testid="action-progress-bar"]',
        '進捗: 45%'
      );
    });

    test('詳細な進捗情報がツールチップに表示される', async ({ page }) => {
      await progressHelpers.goToMandalaChart();

      const progressBar = page.locator('[data-testid="detailed-progress-bar"]');
      await progressBar.hover();

      const tooltip = page.locator('[data-testid="progress-tooltip"]');
      await expect(tooltip).toBeVisible();
      await expect(tooltip).toContainText('完了タスク: 3/8');
      await expect(tooltip).toContainText('最終更新:');
      await expect(tooltip).toContainText('完了予定:');
    });
  });

  test.describe('進捗履歴表示機能', () => {
    test('進捗履歴グラフが正しく表示される', async ({ page }) => {
      await progressHelpers.goToProgressHistory();

      // 履歴チャートの表示を確認
      await progressHelpers.expectProgressHistoryChart();
    });

    test('特定日付クリック時に詳細情報が表示される', async ({ page }) => {
      await progressHelpers.goToProgressHistory();

      // データポイントをクリック
      await progressHelpers.clickHistoryDataPoint(0);

      // 詳細情報ツールチップの表示を確認
      await progressHelpers.expectHistoryDetailTooltip('2024-01-15', 45);
    });

    test('大きな進捗変化があった日がハイライト表示される', async ({ page }) => {
      await progressHelpers.goToProgressHistory();

      // 重要な変化点のハイライト表示を確認
      await progressHelpers.expectSignificantChangeHighlight();
    });

    test('進捗履歴データが存在しない場合の適切なメッセージ表示', async ({ page }) => {
      // 履歴データのない新しい目標に移動
      await progressHelpers.goToProgressHistory('new-goal-without-history');

      // メッセージの表示を確認
      await progressHelpers.expectNoHistoryMessage();
    });

    test('進捗トレンド分析結果が表示される', async ({ page }) => {
      await progressHelpers.goToProgressHistory();

      // トレンド分析結果の表示を確認
      const trendIndicator = page.locator('[data-testid="progress-trend"]');
      await expect(trendIndicator).toBeVisible();
      await expect(trendIndicator).toContainText(/増加|減少|安定/);

      // トレンド率の表示を確認
      const trendRate = page.locator('[data-testid="trend-rate"]');
      await expect(trendRate).toBeVisible();
      await expect(trendRate).toContainText(/%\/日/);
    });
  });

  test.describe('レスポンシブ対応', () => {
    test('モバイル画面でのプログレスバー表示', async ({ page }) => {
      // モバイルビューポートに設定
      await page.setViewportSize({ width: 375, height: 667 });

      await progressHelpers.goToMandalaChart();

      // モバイル対応のプログレスバーが表示されることを確認
      const progressBar = page.locator('[data-testid="mobile-progress-bar"]');
      await expect(progressBar).toBeVisible();
      await expect(progressBar).toHaveClass(/h-2/); // モバイルでは小さめのサイズ
    });

    test('モバイルでのタッチ操作によるツールチップ表示', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await progressHelpers.goToMandalaChart();

      // タッチ操作でのツールチップテスト
      await progressHelpers.testMobileTooltip('[data-testid="action-progress-bar"]');
    });

    test('タブレット画面での履歴チャート表示', async ({ page }) => {
      // タブレットビューポートに設定
      await page.setViewportSize({ width: 768, height: 1024 });

      await progressHelpers.goToProgressHistory();

      // タブレット対応のチャートが表示されることを確認
      const chart = page.locator('[data-testid="progress-history-chart"]');
      await expect(chart).toBeVisible();

      // チャートサイズがタブレットに適応していることを確認
      const chartContainer = page.locator('[data-testid="chart-container"]');
      await expect(chartContainer).toHaveCSS('width', /600px|700px|800px/);
    });
  });

  test.describe('アクセシビリティ', () => {
    test('プログレスバーのARIA属性が正しく設定される', async ({ page }) => {
      await progressHelpers.goToMandalaChart();

      const progressBar = page.locator('[data-testid="action-progress-bar"]');

      // ARIA属性の確認
      await expect(progressBar).toHaveAttribute('role', 'progressbar');
      await expect(progressBar).toHaveAttribute('aria-valuenow', /\d+/);
      await expect(progressBar).toHaveAttribute('aria-valuemin', '0');
      await expect(progressBar).toHaveAttribute('aria-valuemax', '100');
      await expect(progressBar).toHaveAttribute('aria-label', /進捗/);
    });

    test('キーボードナビゲーションでの操作', async ({ page }) => {
      await progressHelpers.goToMandalaChart();

      // Tabキーでプログレスバーにフォーカス
      await page.keyboard.press('Tab');
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toHaveAttribute('role', 'progressbar');

      // Enterキーでツールチップ表示
      await page.keyboard.press('Enter');
      const tooltip = page.locator('[data-testid="progress-tooltip"]');
      await expect(tooltip).toBeVisible();
    });

    test('スクリーンリーダー対応のラベル設定', async ({ page }) => {
      await progressHelpers.goToMandalaChart();

      // 各プログレスバーに適切なラベルが設定されていることを確認
      await expect(page.locator('[data-testid="action-progress-bar"]')).toHaveAttribute(
        'aria-label',
        /アクション進捗/
      );
      await expect(page.locator('[data-testid="subgoal-progress-bar"]')).toHaveAttribute(
        'aria-label',
        /サブ目標進捗/
      );
      await expect(page.locator('[data-testid="goal-progress-bar"]')).toHaveAttribute(
        'aria-label',
        /目標進捗/
      );
    });
  });

  test.describe('パフォーマンス', () => {
    test('大量データでの進捗計算パフォーマンス', async ({ page }) => {
      // 大量のタスクを持つ目標に移動
      await progressHelpers.goToMandalaChart('large-goal-with-many-tasks');

      // ページロード時間を測定
      const startTime = Date.now();
      await expect(page.locator('[data-testid="goal-progress-bar"]')).toBeVisible();
      const loadTime = Date.now() - startTime;

      // 2秒以内にロードされることを確認
      expect(loadTime).toBeLessThan(2000);
    });

    test('アニメーション処理のパフォーマンス', async ({ page }) => {
      await progressHelpers.goToMandalaChart();

      // 複数のプログレスバーが同時にアニメーションしても滑らかに動作することを確認
      await progressHelpers.completeTask('task-1');
      await progressHelpers.completeTask('task-2');
      await progressHelpers.completeTask('task-3');

      await progressHelpers.goToMandalaChart();

      // 全てのプログレスバーが表示されることを確認
      await expect(page.locator('[data-testid="action-progress-bar"]')).toBeVisible();
      await expect(page.locator('[data-testid="subgoal-progress-bar"]')).toBeVisible();
      await expect(page.locator('[data-testid="goal-progress-bar"]')).toBeVisible();

      // アニメーションが滑らかに実行されることを確認（フレームレート測定は困難なため、視覚的確認）
      await progressHelpers.expectProgressAnimation('[data-testid="action-progress-bar"]');
    });
  });

  test.describe('エラーハンドリング', () => {
    test('進捗計算エラー時のフォールバック表示', async ({ page }) => {
      // ネットワークエラーをシミュレート
      await page.route('**/api/progress/**', route => route.abort());

      await progressHelpers.goToMandalaChart();

      // エラー時のフォールバック表示を確認
      const errorMessage = page.locator('[data-testid="progress-error-message"]');
      await expect(errorMessage).toBeVisible();
      await expect(errorMessage).toContainText('進捗データの取得に失敗しました');

      // フォールバック値（0%）が表示されることを確認
      const progressBar = page.locator('[data-testid="action-progress-bar"]');
      await expect(progressBar).toHaveAttribute('aria-valuenow', '0');
    });

    test('履歴データ取得エラー時の適切な処理', async ({ page }) => {
      // 履歴APIエラーをシミュレート
      await page.route('**/api/progress-history/**', route => route.abort());

      await progressHelpers.goToProgressHistory();

      // エラーメッセージの表示を確認
      const errorMessage = page.locator('[data-testid="history-error-message"]');
      await expect(errorMessage).toBeVisible();
      await expect(errorMessage).toContainText('履歴データの取得に失敗しました');

      // リトライボタンの表示を確認
      const retryButton = page.locator('[data-testid="retry-button"]');
      await expect(retryButton).toBeVisible();
    });
  });
});
