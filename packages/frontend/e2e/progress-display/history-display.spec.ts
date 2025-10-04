import { test, expect } from '@playwright/test';
import { AuthHelpers } from '../helpers/auth-helpers';
import { ProgressDisplayHelpers } from '../helpers/progress-display-helpers';

/**
 * 進捗履歴表示機能のE2Eテスト
 *
 * 要件: 5.1, 5.2, 5.3, 5.4, 5.5
 */

test.describe('進捗履歴表示機能', () => {
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

  test('進捗履歴グラフの基本表示', async ({ page }) => {
    await progressHelpers.goToProgressHistory('test-goal-with-history');

    // 履歴チャートの基本要素を確認
    await progressHelpers.expectProgressHistoryChart();

    // チャートタイトルの確認
    await expect(page.locator('[data-testid="chart-title"]')).toContainText('進捗履歴');

    // 軸ラベルの確認
    await expect(page.locator('.recharts-xAxis .recharts-text')).toHaveCount(1); // 日付軸
    await expect(page.locator('.recharts-yAxis .recharts-text')).toHaveCount(1); // 進捗率軸

    // データポイントの存在確認
    const dataPoints = page.locator('.recharts-dot');
    await expect(dataPoints).toHaveCount(1, { timeout: 5000 });

    // 線グラフの確認
    const line = page.locator('.recharts-line-curve');
    await expect(line).toBeVisible();
  });

  test('30日間の進捗履歴データ表示', async ({ page }) => {
    await progressHelpers.goToProgressHistory('test-goal-30days-history');

    // 30日間のデータが表示されることを確認
    const dataPoints = page.locator('.recharts-dot');
    const pointCount = await dataPoints.count();
    expect(pointCount).toBeGreaterThan(0);
    expect(pointCount).toBeLessThanOrEqual(30); // 最大30日分

    // 日付範囲の確認
    const xAxisLabels = page.locator('.recharts-xAxis .recharts-text');
    const firstLabel = await xAxisLabels.first().textContent();
    const lastLabel = await xAxisLabels.last().textContent();

    // 日付形式の確認（YYYY-MM-DD形式）
    expect(firstLabel).toMatch(/\d{4}-\d{2}-\d{2}/);
    expect(lastLabel).toMatch(/\d{4}-\d{2}-\d{2}/);

    // 進捗率軸の範囲確認（0-100%）
    const yAxisLabels = page.locator('.recharts-yAxis .recharts-text');
    const yAxisTexts = await yAxisLabels.allTextContents();
    expect(yAxisTexts.some(text => text.includes('0'))).toBeTruthy();
    expect(yAxisTexts.some(text => text.includes('100'))).toBeTruthy();
  });

  test('特定日付クリック時の詳細情報表示', async ({ page }) => {
    await progressHelpers.goToProgressHistory('test-goal-interactive-history');

    // データポイントをクリック
    await progressHelpers.clickHistoryDataPoint(0);

    // 詳細情報ツールチップの表示を確認
    await progressHelpers.expectHistoryDetailTooltip('2024-01-15', 45);

    // ツールチップの詳細内容を確認
    const tooltip = page.locator('[data-testid="history-tooltip"]');
    await expect(tooltip).toContainText('進捗: 45%');
    await expect(tooltip).toContainText('日付: 2024-01-15');
    await expect(tooltip).toContainText('変化: +5%'); // 前日からの変化

    // 変更理由が表示される場合の確認
    const changeReason = page.locator('[data-testid="change-reason"]');
    if (await changeReason.isVisible()) {
      await expect(changeReason).toContainText('タスク完了');
    }
  });

  test('大きな進捗変化があった日のハイライト表示', async ({ page }) => {
    await progressHelpers.goToProgressHistory('test-goal-significant-changes');

    // 重要な変化点のハイライト表示を確認
    await progressHelpers.expectSignificantChangeHighlight();

    // ハイライトされたポイントの詳細確認
    const significantPoint = page.locator('.recharts-dot.significant-change').first();
    await significantPoint.click();

    // 大きな変化の詳細情報を確認
    const tooltip = page.locator('[data-testid="history-tooltip"]');
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toContainText('大きな変化'); // 変化の説明
    await expect(tooltip).toContainText(/\+\d+%|\-\d+%/); // 変化量の表示

    // 変化理由の表示確認
    await expect(tooltip).toContainText(/複数タスク完了|大幅な進捗更新/);
  });

  test('進捗履歴データが存在しない場合の表示', async ({ page }) => {
    await progressHelpers.goToProgressHistory('new-goal-without-history');

    // 履歴なしメッセージの表示を確認
    await progressHelpers.expectNoHistoryMessage();

    // 代替コンテンツの確認
    await expect(page.locator('[data-testid="no-history-illustration"]')).toBeVisible();
    await expect(page.locator('[data-testid="start-tracking-button"]')).toBeVisible();

    // 「活動を開始」ボタンのクリック
    await page.click('[data-testid="start-tracking-button"]');
    await expect(page).toHaveURL(/\/mandala\/new-goal-without-history$/);
  });

  test('進捗トレンド分析結果の表示', async ({ page }) => {
    await progressHelpers.goToProgressHistory('test-goal-trend-analysis');

    // トレンド分析結果の表示を確認
    await progressHelpers.expectProgressTrend('increasing');

    // トレンド詳細情報の確認
    const trendDetails = page.locator('[data-testid="trend-details"]');
    await expect(trendDetails).toBeVisible();
    await expect(trendDetails).toContainText('信頼度:'); // 信頼度の表示
    await expect(trendDetails).toContainText(/\d+%/); // 信頼度の数値

    // トレンドアイコンの確認
    const trendIcon = page.locator('[data-testid="trend-icon"]');
    await expect(trendIcon).toBeVisible();
    await expect(trendIcon).toHaveClass(/trend-up|trend-down|trend-stable/);
  });

  test('履歴データの期間フィルタリング', async ({ page }) => {
    await progressHelpers.goToProgressHistory('test-goal-filterable-history');

    // 期間選択ドロップダウンの確認
    const periodSelector = page.locator('[data-testid="period-selector"]');
    await expect(periodSelector).toBeVisible();

    // 7日間フィルターを選択
    await periodSelector.selectOption('7days');
    await page.waitForLoadState('networkidle');

    // データポイント数が減ることを確認
    const dataPoints7days = page.locator('.recharts-dot');
    const count7days = await dataPoints7days.count();
    expect(count7days).toBeLessThanOrEqual(7);

    // 30日間フィルターに戻す
    await periodSelector.selectOption('30days');
    await page.waitForLoadState('networkidle');

    // データポイント数が増えることを確認
    const dataPoints30days = page.locator('.recharts-dot');
    const count30days = await dataPoints30days.count();
    expect(count30days).toBeGreaterThanOrEqual(count7days);
  });

  test('履歴チャートのレスポンシブ対応', async ({ page }) => {
    await progressHelpers.goToProgressHistory('test-goal-responsive-history');

    // デスクトップサイズでの表示確認
    await page.setViewportSize({ width: 1200, height: 800 });
    const desktopChart = page.locator('[data-testid="progress-history-chart"]');
    await expect(desktopChart).toBeVisible();

    // チャートサイズの確認
    const desktopWidth = await desktopChart.boundingBox();
    expect(desktopWidth?.width).toBeGreaterThan(800);

    // タブレットサイズでの表示確認
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(500); // リサイズ完了を待機

    const tabletWidth = await desktopChart.boundingBox();
    expect(tabletWidth?.width).toBeLessThan(desktopWidth?.width || 0);

    // モバイルサイズでの表示確認
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);

    const mobileWidth = await desktopChart.boundingBox();
    expect(mobileWidth?.width).toBeLessThan(tabletWidth?.width || 0);

    // モバイルでもチャートが表示されることを確認
    await expect(desktopChart).toBeVisible();
    await expect(page.locator('.recharts-line')).toBeVisible();
  });

  test('履歴データのエクスポート機能', async ({ page }) => {
    await progressHelpers.goToProgressHistory('test-goal-exportable-history');

    // エクスポートボタンの確認
    const exportButton = page.locator('[data-testid="export-history-button"]');
    await expect(exportButton).toBeVisible();

    // CSVエクスポートのテスト
    const downloadPromise = page.waitForEvent('download');
    await exportButton.click();
    await page.click('[data-testid="export-csv-option"]');

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/progress-history.*\.csv$/);

    // JSONエクスポートのテスト
    const jsonDownloadPromise = page.waitForEvent('download');
    await exportButton.click();
    await page.click('[data-testid="export-json-option"]');

    const jsonDownload = await jsonDownloadPromise;
    expect(jsonDownload.suggestedFilename()).toMatch(/progress-history.*\.json$/);
  });

  test('履歴データの統計情報表示', async ({ page }) => {
    await progressHelpers.goToProgressHistory('test-goal-statistics-history');

    // 統計情報パネルの確認
    const statsPanel = page.locator('[data-testid="history-statistics"]');
    await expect(statsPanel).toBeVisible();

    // 基本統計の確認
    await expect(statsPanel).toContainText('平均進捗率:');
    await expect(statsPanel).toContainText('最大進捗率:');
    await expect(statsPanel).toContainText('最小進捗率:');
    await expect(statsPanel).toContainText('総変化量:');

    // 統計値の妥当性確認
    const avgProgress = page.locator('[data-testid="avg-progress"]');
    const maxProgress = page.locator('[data-testid="max-progress"]');
    const minProgress = page.locator('[data-testid="min-progress"]');

    const avgText = await avgProgress.textContent();
    const maxText = await maxProgress.textContent();
    const minText = await minProgress.textContent();

    // 数値の妥当性確認
    expect(avgText).toMatch(/\d+%/);
    expect(maxText).toMatch(/\d+%/);
    expect(minText).toMatch(/\d+%/);

    // 最大値 >= 平均値 >= 最小値の関係確認
    const avgValue = parseInt(avgText?.match(/\d+/)?.[0] || '0');
    const maxValue = parseInt(maxText?.match(/\d+/)?.[0] || '0');
    const minValue = parseInt(minText?.match(/\d+/)?.[0] || '0');

    expect(maxValue).toBeGreaterThanOrEqual(avgValue);
    expect(avgValue).toBeGreaterThanOrEqual(minValue);
  });

  test('履歴データの自動更新', async ({ page }) => {
    await progressHelpers.goToProgressHistory('test-goal-auto-update-history');

    // 初期データポイント数を記録
    const initialDataPoints = page.locator('.recharts-dot');
    const initialCount = await initialDataPoints.count();

    // 別タブでタスクを完了（進捗を更新）
    const taskPage = await page.context().newPage();
    const taskProgressHelpers = new ProgressDisplayHelpers(taskPage);

    // ログイン
    const taskAuthHelpers = new AuthHelpers(taskPage);
    await taskAuthHelpers.goToLogin();
    await taskAuthHelpers.fillLoginForm('test@example.com', 'password123');
    await taskAuthHelpers.clickLoginButton();

    // タスクを完了
    await taskProgressHelpers.completeTask('auto-update-task-1');

    // 元のタブに戻って自動更新を確認
    await page.bringToFront();

    // 自動更新（ポーリングまたはWebSocket）を待機
    await page.waitForTimeout(5000);

    // データポイントが増加していることを確認
    const updatedDataPoints = page.locator('.recharts-dot');
    const updatedCount = await updatedDataPoints.count();
    expect(updatedCount).toBeGreaterThan(initialCount);

    await taskPage.close();
  });

  test('履歴データ取得エラー時の処理', async ({ page }) => {
    // 履歴APIエラーをシミュレート
    await page.route('**/api/progress-history/**', route => route.abort());

    await progressHelpers.goToProgressHistory('test-goal-error-history');

    // エラーメッセージの表示を確認
    await progressHelpers.expectProgressError('履歴データの取得に失敗しました');

    // リトライボタンの表示を確認
    const retryButton = page.locator('[data-testid="retry-button"]');
    await expect(retryButton).toBeVisible();

    // エラー状態でのUI確認
    await expect(page.locator('[data-testid="error-illustration"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-description"]')).toContainText(
      'ネットワーク接続を確認してください'
    );

    // リトライ機能のテスト
    await page.unroute('**/api/progress-history/**'); // エラーを解除
    await retryButton.click();

    // リトライ後に正常に表示されることを確認
    await progressHelpers.expectProgressHistoryChart();
  });

  test('履歴データの詳細モーダル表示', async ({ page }) => {
    await progressHelpers.goToProgressHistory('test-goal-detailed-history');

    // データポイントをダブルクリックして詳細モーダルを開く
    const dataPoint = page.locator('.recharts-dot').first();
    await dataPoint.dblclick();

    // 詳細モーダルの表示確認
    const detailModal = page.locator('[data-testid="history-detail-modal"]');
    await expect(detailModal).toBeVisible();

    // モーダル内容の確認
    await expect(detailModal).toContainText('進捗詳細情報');
    await expect(detailModal).toContainText('日付:');
    await expect(detailModal).toContainText('進捗率:');
    await expect(detailModal).toContainText('変化量:');
    await expect(detailModal).toContainText('完了タスク:');

    // 関連タスクリストの確認
    const taskList = page.locator('[data-testid="related-tasks-list"]');
    await expect(taskList).toBeVisible();

    // モーダルを閉じる
    await page.click('[data-testid="close-modal-button"]');
    await expect(detailModal).toBeHidden();
  });

  test('履歴データの比較機能', async ({ page }) => {
    await progressHelpers.goToProgressHistory('test-goal-comparison-history');

    // 比較モードを有効化
    await page.click('[data-testid="comparison-mode-toggle"]');

    // 2つのデータポイントを選択
    const dataPoints = page.locator('.recharts-dot');
    await dataPoints.nth(0).click();
    await dataPoints.nth(2).click();

    // 比較結果の表示確認
    const comparisonPanel = page.locator('[data-testid="comparison-panel"]');
    await expect(comparisonPanel).toBeVisible();

    // 比較データの確認
    await expect(comparisonPanel).toContainText('期間:');
    await expect(comparisonPanel).toContainText('進捗変化:');
    await expect(comparisonPanel).toContainText('平均変化率:');

    // 比較チャートの確認
    const comparisonChart = page.locator('[data-testid="comparison-chart"]');
    await expect(comparisonChart).toBeVisible();

    // 比較モードを無効化
    await page.click('[data-testid="comparison-mode-toggle"]');
    await expect(comparisonPanel).toBeHidden();
  });
});
