import { test, expect } from '@playwright/test';
import { AuthHelpers } from '../helpers/auth-helpers';
import { ProgressDisplayHelpers } from '../helpers/progress-display-helpers';

/**
 * タスク完了から進捗更新までの流れのE2Eテスト
 *
 * 要件: 1.1, 1.2, 1.3, 1.4, 1.5
 */

test.describe('タスク完了から進捗更新までの流れ', () => {
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

  test('単一タスク完了時の進捗更新', async ({ page }) => {
    // マンダラチャート画面に移動
    await progressHelpers.goToMandalaChart('test-goal-1');

    // 初期進捗値を記録
    const initialActionProgress = await progressHelpers.getProgressValue(
      '[data-testid="action-1-progress-bar"]'
    );
    const initialSubGoalProgress = await progressHelpers.getProgressValue(
      '[data-testid="subgoal-1-progress-bar"]'
    );
    const initialGoalProgress = await progressHelpers.getProgressValue(
      '[data-testid="goal-progress-bar"]'
    );

    // タスクを完了
    await progressHelpers.completeTask('task-1-1');

    // マンダラチャート画面に戻る
    await progressHelpers.goToMandalaChart('test-goal-1');

    // アクション進捗が更新されていることを確認
    const updatedActionProgress = await progressHelpers.getProgressValue(
      '[data-testid="action-1-progress-bar"]'
    );
    expect(updatedActionProgress).toBeGreaterThan(initialActionProgress);

    // サブ目標進捗が更新されていることを確認
    const updatedSubGoalProgress = await progressHelpers.getProgressValue(
      '[data-testid="subgoal-1-progress-bar"]'
    );
    expect(updatedSubGoalProgress).toBeGreaterThan(initialSubGoalProgress);

    // 目標進捗が更新されていることを確認
    const updatedGoalProgress = await progressHelpers.getProgressValue(
      '[data-testid="goal-progress-bar"]'
    );
    expect(updatedGoalProgress).toBeGreaterThan(initialGoalProgress);

    // 進捗計算の整合性を確認
    await progressHelpers.verifyProgressCalculationConsistency('test-goal-1');
  });

  test('複数タスク完了時の階層的進捗更新', async ({ page }) => {
    await progressHelpers.goToMandalaChart('test-goal-1');

    // 初期進捗値を記録
    const initialProgress = {
      action1: await progressHelpers.getProgressValue('[data-testid="action-1-progress-bar"]'),
      action2: await progressHelpers.getProgressValue('[data-testid="action-2-progress-bar"]'),
      subgoal1: await progressHelpers.getProgressValue('[data-testid="subgoal-1-progress-bar"]'),
      goal: await progressHelpers.getProgressValue('[data-testid="goal-progress-bar"]'),
    };

    // 同じアクション内の複数タスクを完了
    await progressHelpers.completeMultipleTasks(['task-1-1', 'task-1-2', 'task-1-3']);

    // マンダラチャート画面に戻る
    await progressHelpers.goToMandalaChart('test-goal-1');

    // アクション1の進捗が大幅に更新されていることを確認
    const updatedAction1Progress = await progressHelpers.getProgressValue(
      '[data-testid="action-1-progress-bar"]'
    );
    expect(updatedAction1Progress).toBeGreaterThan(initialProgress.action1 + 30); // 30%以上の増加を期待

    // 異なるアクションのタスクも完了
    await progressHelpers.completeTask('task-2-1');
    await progressHelpers.goToMandalaChart('test-goal-1');

    // アクション2の進捗も更新されていることを確認
    const updatedAction2Progress = await progressHelpers.getProgressValue(
      '[data-testid="action-2-progress-bar"]'
    );
    expect(updatedAction2Progress).toBeGreaterThan(initialProgress.action2);

    // サブ目標進捗が複数アクションの平均として更新されていることを確認
    const updatedSubGoal1Progress = await progressHelpers.getProgressValue(
      '[data-testid="subgoal-1-progress-bar"]'
    );
    expect(updatedSubGoal1Progress).toBeGreaterThan(initialProgress.subgoal1);

    // 目標進捗が更新されていることを確認
    const updatedGoalProgress = await progressHelpers.getProgressValue(
      '[data-testid="goal-progress-bar"]'
    );
    expect(updatedGoalProgress).toBeGreaterThan(initialProgress.goal);
  });

  test('実行アクションの全タスク完了時の100%達成', async ({ page }) => {
    await progressHelpers.goToMandalaChart('test-goal-execution-action');

    // 実行アクションの全タスクを完了
    await progressHelpers.completeMultipleTasks([
      'execution-task-1',
      'execution-task-2',
      'execution-task-3',
      'execution-task-4',
    ]);

    await progressHelpers.goToMandalaChart('test-goal-execution-action');

    // アクション進捗が100%になることを確認
    await progressHelpers.expectProgressValue('[data-testid="execution-action-progress-bar"]', 100);

    // 100%達成時の色が適用されることを確認
    await progressHelpers.expectProgressColor(
      '[data-testid="execution-action-progress-bar"]',
      'bg-green-600'
    );

    // 達成アニメーションが表示されることを確認
    await progressHelpers.expectAchievementAnimation(
      '[data-testid="execution-action-progress-bar"]'
    );
  });

  test('習慣アクションの継続による進捗更新', async ({ page }) => {
    await progressHelpers.goToMandalaChart('test-goal-habit-action');

    // 初期進捗値を記録
    const initialHabitProgress = await progressHelpers.getProgressValue(
      '[data-testid="habit-action-progress-bar"]'
    );

    // 習慣タスクを継続状態に更新（複数日分）
    for (let day = 1; day <= 5; day++) {
      await progressHelpers.continueHabitTask(`habit-task-day-${day}`);
      await page.waitForTimeout(100); // 進捗計算処理のための待機
    }

    await progressHelpers.goToMandalaChart('test-goal-habit-action');

    // 習慣アクションの進捗が継続日数に応じて更新されていることを確認
    const updatedHabitProgress = await progressHelpers.getProgressValue(
      '[data-testid="habit-action-progress-bar"]'
    );
    expect(updatedHabitProgress).toBeGreaterThan(initialHabitProgress);

    // 継続率が80%に達した場合の達成確認
    if (updatedHabitProgress >= 80) {
      await progressHelpers.expectProgressColor(
        '[data-testid="habit-action-progress-bar"]',
        'bg-green-600'
      );
    }
  });

  test('混在アクション（実行+習慣）での進捗計算', async ({ page }) => {
    await progressHelpers.goToMandalaChart('test-goal-mixed-actions');

    // 実行アクションのタスクを完了
    await progressHelpers.completeMultipleTasks(['exec-task-1', 'exec-task-2']);

    // 習慣アクションのタスクを継続
    await progressHelpers.continueHabitTask('habit-task-1');
    await progressHelpers.continueHabitTask('habit-task-2');

    await progressHelpers.goToMandalaChart('test-goal-mixed-actions');

    // 実行アクションの進捗確認
    const execActionProgress = await progressHelpers.getProgressValue(
      '[data-testid="exec-action-progress-bar"]'
    );
    expect(execActionProgress).toBeGreaterThan(0);

    // 習慣アクションの進捗確認
    const habitActionProgress = await progressHelpers.getProgressValue(
      '[data-testid="habit-action-progress-bar"]'
    );
    expect(habitActionProgress).toBeGreaterThan(0);

    // サブ目標進捗が両方のアクションを考慮して計算されていることを確認
    const subgoalProgress = await progressHelpers.getProgressValue(
      '[data-testid="mixed-subgoal-progress-bar"]'
    );
    const expectedAverage = Math.round((execActionProgress + habitActionProgress) / 2);
    expect(Math.abs(subgoalProgress - expectedAverage)).toBeLessThanOrEqual(5); // 5%の誤差を許容
  });

  test('進捗更新のリアルタイム反映', async ({ page }) => {
    // 2つのタブで同じマンダラチャートを開く
    const secondPage = await page.context().newPage();
    const secondProgressHelpers = new ProgressDisplayHelpers(secondPage);

    // 両方のタブでマンダラチャートを表示
    await progressHelpers.goToMandalaChart('test-goal-realtime');
    await secondProgressHelpers.goToMandalaChart('test-goal-realtime');

    // 初期進捗値を記録
    const initialProgress = await progressHelpers.getProgressValue(
      '[data-testid="realtime-action-progress-bar"]'
    );

    // 一方のタブでタスクを完了
    await progressHelpers.completeTask('realtime-task-1');

    // もう一方のタブで進捗が更新されることを確認（WebSocketまたはポーリング）
    await secondProgressHelpers.waitForProgressValue(
      '[data-testid="realtime-action-progress-bar"]',
      initialProgress + 25,
      10000
    );

    await secondPage.close();
  });

  test('進捗更新時のエラーハンドリング', async ({ page }) => {
    // ネットワークエラーをシミュレート
    await page.route('**/api/progress/**', route => route.abort());

    await progressHelpers.goToMandalaChart('test-goal-1');

    // タスク完了を試行
    await progressHelpers.goToTaskDetail('task-error-test');
    await page.click('[data-testid="task-complete-button"]');

    // エラーメッセージが表示されることを確認
    await progressHelpers.expectProgressError('進捗の更新に失敗しました');

    // リトライ機能をテスト
    await page.unroute('**/api/progress/**'); // ネットワークエラーを解除
    await progressHelpers.testRetryFunctionality();

    // リトライ後に正常に更新されることを確認
    await expect(page.locator('[data-testid="task-status"]')).toContainText('完了');
  });

  test('大量タスク完了時のパフォーマンス', async ({ page }) => {
    // パフォーマンス測定
    const updateTime = await progressHelpers.measureProgressUpdatePerformance('performance-task-1');

    // 2秒以内に更新が完了することを確認
    expect(updateTime).toBeLessThan(2000);

    // 大量のタスクを一括完了
    const taskIds = Array.from({ length: 20 }, (_, i) => `bulk-task-${i + 1}`);
    const startTime = Date.now();

    await progressHelpers.completeMultipleTasks(taskIds);
    await progressHelpers.goToMandalaChart('test-goal-bulk-tasks');

    const totalTime = Date.now() - startTime;

    // 大量更新でも合理的な時間内に完了することを確認
    expect(totalTime).toBeLessThan(30000); // 30秒以内

    // 最終的な進捗が正しく計算されていることを確認
    const finalProgress = await progressHelpers.getProgressValue(
      '[data-testid="bulk-action-progress-bar"]'
    );
    expect(finalProgress).toBe(100); // 全タスク完了で100%
  });

  test('進捗データの永続化確認', async ({ page }) => {
    await progressHelpers.goToMandalaChart('test-goal-persistence');

    // タスクを完了
    await progressHelpers.completeTask('persistence-task-1');
    await progressHelpers.goToMandalaChart('test-goal-persistence');

    // 進捗値を記録
    const progressAfterCompletion = await progressHelpers.getProgressValue(
      '[data-testid="persistence-action-progress-bar"]'
    );

    // ページをリロード
    await page.reload();
    await page.waitForLoadState('networkidle');

    // 進捗が永続化されていることを確認
    const progressAfterReload = await progressHelpers.getProgressValue(
      '[data-testid="persistence-action-progress-bar"]'
    );
    expect(progressAfterReload).toBe(progressAfterCompletion);

    // ブラウザを再起動（新しいセッション）
    await page.context().close();
    const newContext = await page.context().browser()?.newContext();
    const newPage = await newContext!.newPage();
    const newProgressHelpers = new ProgressDisplayHelpers(newPage);

    // 再ログイン
    const newAuthHelpers = new AuthHelpers(newPage);
    await newAuthHelpers.goToLogin();
    await newAuthHelpers.fillLoginForm('test@example.com', 'password123');
    await newAuthHelpers.clickLoginButton();

    // 進捗が永続化されていることを確認
    await newProgressHelpers.goToMandalaChart('test-goal-persistence');
    const progressAfterRestart = await newProgressHelpers.getProgressValue(
      '[data-testid="persistence-action-progress-bar"]'
    );
    expect(progressAfterRestart).toBe(progressAfterCompletion);

    await newContext!.close();
  });
});
