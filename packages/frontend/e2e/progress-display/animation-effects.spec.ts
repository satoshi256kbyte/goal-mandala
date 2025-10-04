import { test, expect } from '@playwright/test';
import { AuthHelpers } from '../helpers/auth-helpers';
import { ProgressDisplayHelpers } from '../helpers/progress-display-helpers';

/**
 * アニメーション効果のE2Eテスト
 *
 * 要件: 4.1, 4.2, 4.3, 4.4, 4.5
 */

test.describe('アニメーション効果', () => {
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

    // アニメーションを有効化
    await progressHelpers.toggleAnimationSettings(true);
  });

  test('プログレスバーの進捗変化アニメーション', async ({ page }) => {
    await progressHelpers.goToMandalaChart('test-goal-animation');

    // 初期状態でアニメーション設定を確認
    const progressBar = page.locator('[data-testid="animated-progress-bar"]');
    const progressFill = page.locator('[data-testid="animated-progress-bar"] .h-full');

    // トランジション設定が適用されていることを確認
    await expect(progressFill).toHaveCSS('transition-duration', /0\.3s/);
    await expect(progressFill).toHaveCSS('transition-property', /width|all/);
    await expect(progressFill).toHaveCSS('transition-timing-function', /ease-out/);

    // タスクを完了してアニメーションをトリガー
    await progressHelpers.completeTask('animation-task-1');
    await progressHelpers.goToMandalaChart('test-goal-animation');

    // アニメーション効果を確認
    await progressHelpers.expectProgressAnimation('[data-testid="animated-progress-bar"]');

    // アニメーション完了後の状態を確認
    await page.waitForTimeout(500); // アニメーション完了を待機
    const finalProgress = await progressHelpers.getProgressValue(
      '[data-testid="animated-progress-bar"]'
    );
    expect(finalProgress).toBeGreaterThan(0);
  });

  test('セル色変化のフェードイン効果', async ({ page }) => {
    await progressHelpers.goToMandalaChart('test-goal-cell-animation');

    // 初期セル状態を確認
    const cell = page.locator('[data-testid="animated-cell-1"]');
    await progressHelpers.expectCellColorScheme('[data-testid="animated-cell-1"]', 20);

    // セルのトランジション設定を確認
    await progressHelpers.expectCellColorTransition('[data-testid="animated-cell-1"]');

    // タスクを完了してセル色変化をトリガー
    await progressHelpers.completeTask('cell-animation-task-1');
    await progressHelpers.goToMandalaChart('test-goal-cell-animation');

    // セル色が変化していることを確認
    await progressHelpers.expectCellColorScheme('[data-testid="animated-cell-1"]', 60);

    // フェードイン効果の確認
    await expect(cell).toHaveCSS('transition-duration', /0\.3s/);
    await expect(cell).toHaveCSS('transition-timing-function', /ease-in-out/);
  });

  test('100%達成時の特別なアニメーション効果', async ({ page }) => {
    await progressHelpers.goToMandalaChart('test-goal-achievement');

    // アクションの全タスクを完了して100%にする
    await progressHelpers.completeMultipleTasks([
      'achievement-task-1',
      'achievement-task-2',
      'achievement-task-3',
      'achievement-task-4',
    ]);

    await progressHelpers.goToMandalaChart('test-goal-achievement');

    // 達成アニメーション効果を確認
    await progressHelpers.expectAchievementAnimation('[data-testid="achievement-progress-bar"]');

    // グロー効果の詳細確認
    const achievementElement = page.locator(
      '[data-testid="achievement-progress-bar"] [data-testid="achievement-animation"]'
    );

    // スケール効果の確認
    await expect(achievementElement).toHaveCSS('transform', /scale\(1\.05\)/);

    // ボックスシャドウ（グロー）効果の確認
    await expect(achievementElement).toHaveCSS('box-shadow', /rgba\(34, 197, 94/); // green glow

    // アニメーション終了後の状態確認
    await page.waitForTimeout(1000); // アニメーション完了を待機
    await expect(achievementElement).toHaveCSS('transform', /scale\(1\)/); // 元のサイズに戻る
  });

  test('複数要素の同時達成時のアニメーション調整', async ({ page }) => {
    await progressHelpers.goToMandalaChart('test-goal-multiple-achievement');

    // 複数のアクションを同時に100%にする
    await progressHelpers.completeMultipleTasks([
      'multi-achievement-task-1-1',
      'multi-achievement-task-1-2',
      'multi-achievement-task-2-1',
      'multi-achievement-task-2-2',
    ]);

    await progressHelpers.goToMandalaChart('test-goal-multiple-achievement');

    // 複数の達成アニメーションが同時に実行されることを確認
    const achievement1 = page.locator(
      '[data-testid="achievement-progress-bar-1"] [data-testid="achievement-animation"]'
    );
    const achievement2 = page.locator(
      '[data-testid="achievement-progress-bar-2"] [data-testid="achievement-animation"]'
    );

    await expect(achievement1).toBeVisible();
    await expect(achievement2).toBeVisible();

    // アニメーションが重複せずに適切に実行されることを確認
    await expect(achievement1).toHaveClass(/glow/);
    await expect(achievement2).toHaveClass(/glow/);

    // 時間差でアニメーションが終了することを確認（パフォーマンス考慮）
    await page.waitForTimeout(1200);
    await expect(achievement1).toBeHidden();
    await expect(achievement2).toBeHidden();
  });

  test('アニメーション中断機能', async ({ page }) => {
    await progressHelpers.goToMandalaChart('test-goal-interruption');

    // 長めのアニメーションを開始
    await progressHelpers.completeTask('interruption-task-1');
    await progressHelpers.goToMandalaChart('test-goal-interruption');

    const progressBar = page.locator('[data-testid="interruption-progress-bar"]');

    // アニメーション中にユーザー操作を行う
    await progressBar.click(); // マウスクリック

    // アニメーションが中断されずに継続することを確認
    await progressHelpers.expectProgressAnimation('[data-testid="interruption-progress-bar"]');

    // キーボード操作でも中断されないことを確認
    await progressBar.focus();
    await page.keyboard.press('Enter');

    // アニメーションが継続していることを確認
    const progressFill = page.locator('[data-testid="interruption-progress-bar"] .h-full');
    await expect(progressFill).toHaveClass(/transition/);
  });

  test('アニメーション無効設定時の動作', async ({ page }) => {
    // アニメーションを無効化
    await progressHelpers.toggleAnimationSettings(false);

    await progressHelpers.goToMandalaChart('test-goal-disabled-animation');

    // タスクを完了
    await progressHelpers.completeTask('disabled-animation-task-1');
    await progressHelpers.goToMandalaChart('test-goal-disabled-animation');

    // アニメーションが無効になっていることを確認
    const progressFill = page.locator('[data-testid="disabled-animation-progress-bar"] .h-full');
    await expect(progressFill).toHaveClass(/transition-none/);

    // 達成時でもアニメーションが表示されないことを確認
    await progressHelpers.completeMultipleTasks([
      'disabled-achievement-task-1',
      'disabled-achievement-task-2',
      'disabled-achievement-task-3',
    ]);

    await progressHelpers.goToMandalaChart('test-goal-disabled-animation');

    // 達成アニメーションが表示されないことを確認
    const achievementElement = page.locator(
      '[data-testid="disabled-animation-progress-bar"] [data-testid="achievement-animation"]'
    );
    await expect(achievementElement).toBeHidden();
  });

  test('アクセシビリティ対応のアニメーション制御', async ({ page }) => {
    // システムのprefers-reduced-motionを有効化（エミュレート）
    await page.emulateMedia({ reducedMotion: 'reduce' });

    await progressHelpers.goToMandalaChart('test-goal-reduced-motion');

    // タスクを完了
    await progressHelpers.completeTask('reduced-motion-task-1');
    await progressHelpers.goToMandalaChart('test-goal-reduced-motion');

    // アニメーションが無効化されていることを確認
    const progressFill = page.locator('[data-testid="reduced-motion-progress-bar"] .h-full');
    await expect(progressFill).toHaveClass(/transition-none/);

    // 達成時でもアニメーションが表示されないことを確認
    await progressHelpers.completeMultipleTasks([
      'reduced-motion-achievement-1',
      'reduced-motion-achievement-2',
    ]);

    await progressHelpers.goToMandalaChart('test-goal-reduced-motion');

    const achievementElement = page.locator(
      '[data-testid="reduced-motion-progress-bar"] [data-testid="achievement-animation"]'
    );
    await expect(achievementElement).toBeHidden();
  });

  test('カスタムアニメーション設定', async ({ page }) => {
    // カスタムアニメーション設定を適用
    await page.goto('/settings');
    await page.selectOption('[data-testid="animation-duration-select"]', '0.5s');
    await page.selectOption('[data-testid="animation-easing-select"]', 'ease-in');
    await page.click('[data-testid="save-settings-button"]');

    await progressHelpers.goToMandalaChart('test-goal-custom-animation');

    // カスタム設定が適用されていることを確認
    const progressFill = page.locator('[data-testid="custom-animation-progress-bar"] .h-full');
    await expect(progressFill).toHaveCSS('transition-duration', /0\.5s/);
    await expect(progressFill).toHaveCSS('transition-timing-function', /ease-in/);

    // タスクを完了してアニメーションを確認
    await progressHelpers.completeTask('custom-animation-task-1');
    await progressHelpers.goToMandalaChart('test-goal-custom-animation');

    // カスタム設定でアニメーションが実行されることを確認
    await progressHelpers.expectProgressAnimation('[data-testid="custom-animation-progress-bar"]');
  });

  test('モバイルデバイスでのアニメーション最適化', async ({ page }) => {
    // モバイルビューポートに設定
    await page.setViewportSize({ width: 375, height: 667 });

    await progressHelpers.goToMandalaChart('test-goal-mobile-animation');

    // モバイル用の最適化されたアニメーション設定を確認
    const progressFill = page.locator('[data-testid="mobile-animation-progress-bar"] .h-full');

    // モバイルでは短めのアニメーション時間が適用されることを確認
    await expect(progressFill).toHaveCSS('transition-duration', /0\.2s|0\.25s/);

    // タスクを完了してアニメーションを確認
    await progressHelpers.completeTask('mobile-animation-task-1');
    await progressHelpers.goToMandalaChart('test-goal-mobile-animation');

    // モバイルでもスムーズにアニメーションが実行されることを確認
    await progressHelpers.expectProgressAnimation('[data-testid="mobile-animation-progress-bar"]');
  });

  test('パフォーマンス重視のアニメーション制御', async ({ page }) => {
    // 低性能デバイスをエミュレート
    await page.emulateMedia({ reducedMotion: 'no-preference' });

    // CPU制限を設定（Playwrightの機能を使用）
    const client = await page.context().newCDPSession(page);
    await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });

    await progressHelpers.goToMandalaChart('test-goal-performance-animation');

    // 大量のタスクを一括完了してアニメーション負荷をかける
    const taskIds = Array.from({ length: 10 }, (_, i) => `performance-task-${i + 1}`);
    await progressHelpers.completeMultipleTasks(taskIds);

    await progressHelpers.goToMandalaChart('test-goal-performance-animation');

    // パフォーマンス制限下でもアニメーションが適切に実行されることを確認
    const progressBars = page.locator('[data-testid*="performance-progress-bar"]');
    const count = await progressBars.count();

    for (let i = 0; i < count; i++) {
      const progressBar = progressBars.nth(i);
      const progressFill = progressBar.locator('.h-full');

      // アニメーションが適用されていることを確認
      await expect(progressFill).toHaveClass(/transition/);
    }

    // CPU制限を解除
    await client.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  });

  test('アニメーション品質の視覚的確認', async ({ page }) => {
    await progressHelpers.goToMandalaChart('test-goal-visual-quality');

    // スクリーンショットを撮影してアニメーション前の状態を記録
    await page.screenshot({ path: 'test-results/animation-before.png' });

    // タスクを完了
    await progressHelpers.completeTask('visual-quality-task-1');
    await progressHelpers.goToMandalaChart('test-goal-visual-quality');

    // アニメーション中のスクリーンショット
    await page.waitForTimeout(150); // アニメーション途中
    await page.screenshot({ path: 'test-results/animation-during.png' });

    // アニメーション完了後のスクリーンショット
    await page.waitForTimeout(500); // アニメーション完了
    await page.screenshot({ path: 'test-results/animation-after.png' });

    // 最終的な進捗値が正しく表示されていることを確認
    const finalProgress = await progressHelpers.getProgressValue(
      '[data-testid="visual-quality-progress-bar"]'
    );
    expect(finalProgress).toBeGreaterThan(0);
  });
});
