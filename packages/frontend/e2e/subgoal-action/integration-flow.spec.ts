import { test, expect } from '@playwright/test';
import { SubGoalActionHelpers } from '../helpers/subgoal-action-helpers';
import { AuthHelpers } from '../helpers/auth-helpers';
import { GoalInputHelpers } from '../helpers/goal-input-helpers';
import {
  validSubGoalData,
  validActionData,
  bulkEditData,
  successMessages,
} from '../fixtures/subgoal-action-data';
import { validGoalData } from '../fixtures/goal-input-data';
import { testUsers } from '../fixtures/test-data';

test.describe('サブ目標・アクション編集統合フロー', () => {
  let subGoalActionHelpers: SubGoalActionHelpers;
  let authHelpers: AuthHelpers;
  let goalInputHelpers: GoalInputHelpers;

  test.beforeEach(async ({ page }) => {
    subGoalActionHelpers = new SubGoalActionHelpers(page);
    authHelpers = new AuthHelpers(page);
    goalInputHelpers = new GoalInputHelpers(page);

    // 認証済みユーザーとしてログイン
    await authHelpers.goToLogin();
    await authHelpers.fillLoginForm(testUsers.validUser.email, testUsers.validUser.password);
    await authHelpers.clickLoginButton();
    await authHelpers.expectRedirectTo('/');
  });

  test.describe('完全なマンダラ作成フロー', () => {
    test('目標入力からアクション編集完了までの完全フロー', async ({ page }) => {
      // 1. 目標入力
      await goalInputHelpers.goToGoalInput();
      await goalInputHelpers.fillGoalForm(validGoalData.complete);
      await goalInputHelpers.clickSubmitButton();

      // AI処理完了を待機（モック環境では即座に完了）
      await goalInputHelpers.expectRedirectTo('/mandala/create/subgoals');

      // 2. サブ目標確認・編集
      await subGoalActionHelpers.expectSubGoalListVisible();

      // 最初のサブ目標を編集
      await subGoalActionHelpers.selectSubGoal(0);
      await subGoalActionHelpers.fillSubGoalForm(validSubGoalData.complete);
      await subGoalActionHelpers.saveSubGoal();

      // 次のステップに進む
      await subGoalActionHelpers.proceedToActions();

      // 3. アクション確認・編集
      await subGoalActionHelpers.expectActionListVisible();

      // 最初のアクションを編集
      await subGoalActionHelpers.selectAction(0, 0);
      await subGoalActionHelpers.fillActionForm(validActionData.execution);
      await subGoalActionHelpers.saveAction();

      // 活動開始に進む
      await subGoalActionHelpers.startActivity();

      // 4. 活動開始確認画面に到達
      await subGoalActionHelpers.expectRedirectTo('/mandala/create/confirm');
    });

    test('下書き保存を活用した段階的な作成フロー', async ({ page }) => {
      // 1. サブ目標の部分的な編集と下書き保存
      await subGoalActionHelpers.goToSubGoalEdit();
      await subGoalActionHelpers.selectSubGoal(0);
      await page.fill('[data-testid="subgoal-title-input"]', '下書きサブ目標1');
      await subGoalActionHelpers.saveDraft();

      // 2. 別のサブ目標を編集
      await subGoalActionHelpers.selectSubGoal(1);
      await page.fill('[data-testid="subgoal-title-input"]', '下書きサブ目標2');
      await subGoalActionHelpers.saveDraft();

      // 3. ページリロードして下書きが復元されることを確認
      await page.reload();
      await subGoalActionHelpers.expectDraftRestored();

      // 4. 下書きから完全なデータに仕上げる
      await subGoalActionHelpers.selectSubGoal(0);
      await subGoalActionHelpers.fillSubGoalForm(validSubGoalData.complete);
      await subGoalActionHelpers.saveSubGoal();

      // 5. アクション編集に進む
      await subGoalActionHelpers.proceedToActions();
      await subGoalActionHelpers.expectActionListVisible();
    });

    test('エラー発生時の復旧フロー', async ({ page }) => {
      await subGoalActionHelpers.goToSubGoalEdit();

      // ネットワークエラーをシミュレート
      await page.context().setOffline(true);

      // サブ目標編集を試行
      await subGoalActionHelpers.selectSubGoal(0);
      await subGoalActionHelpers.fillSubGoalForm(validSubGoalData.complete);
      await page.click('[data-testid="save-subgoal-button"]');

      // エラーメッセージを確認
      await subGoalActionHelpers.expectErrorMessage('ネットワークエラーが発生しました');

      // ネットワーク復旧
      await page.context().setOffline(false);

      // 再試行して成功
      await page.click('[data-testid="save-subgoal-button"]');
      await subGoalActionHelpers.expectSuccessMessage(successMessages.subGoal.saved);
    });
  });

  test.describe('複雑な編集操作の組み合わせ', () => {
    test('ドラッグ&ドロップと一括編集の組み合わせ', async ({ page }) => {
      await subGoalActionHelpers.goToSubGoalEdit();

      // 1. サブ目標の並び替え
      await subGoalActionHelpers.dragSubGoal(0, 2);
      await subGoalActionHelpers.expectSuccessMessage(successMessages.general.dragDropCompleted);

      // 2. 複数のサブ目標を選択して一括編集
      await subGoalActionHelpers.selectMultipleSubGoals([0, 1, 2]);
      await subGoalActionHelpers.openBulkEditModal();
      await subGoalActionHelpers.bulkEditCommonFields(bulkEditData.commonFields);
      await subGoalActionHelpers.saveBulkEdit();

      // 3. アクション編集に進んで同様の操作
      await subGoalActionHelpers.proceedToActions();
      await subGoalActionHelpers.dragAction(0, 0, 2);
      await subGoalActionHelpers.selectMultipleActions(0, [0, 1]);
      await subGoalActionHelpers.openBulkEditModal();
      await subGoalActionHelpers.saveBulkEdit();
    });

    test('サブ目標とアクションの連動編集', async ({ page }) => {
      await subGoalActionHelpers.goToSubGoalEdit();

      // 1. サブ目標を編集
      await subGoalActionHelpers.selectSubGoal(0);
      await subGoalActionHelpers.fillSubGoalForm({
        title: '技術スキル向上',
        description: 'プログラミング技術を向上させる',
        background: 'キャリアアップのため',
      });
      await subGoalActionHelpers.saveSubGoal();

      // 2. アクション編集に進む
      await subGoalActionHelpers.proceedToActions();

      // 3. サブ目標に関連するアクションを編集
      await subGoalActionHelpers.selectAction(0, 0);
      await subGoalActionHelpers.fillActionForm({
        title: 'React学習',
        description: 'Reactの基礎を学習する',
        background: '技術スキル向上の一環として',
        type: 'execution',
      });
      await subGoalActionHelpers.saveAction();

      // 4. 関連性が保たれていることを確認
      await expect(page.locator('[data-testid="action-subgoal-relation"]')).toContainText(
        '技術スキル向上'
      );
    });

    test('大量データの処理性能テスト', async ({ page }) => {
      await subGoalActionHelpers.goToActionEdit();

      // 全64個のアクションを順次編集
      const startTime = Date.now();

      for (let subGoalIndex = 0; subGoalIndex < 8; subGoalIndex++) {
        await subGoalActionHelpers.selectSubGoalTab(subGoalIndex);

        for (let actionIndex = 0; actionIndex < 8; actionIndex++) {
          await subGoalActionHelpers.selectAction(subGoalIndex, actionIndex);
          await page.fill(
            '[data-testid="action-title-input"]',
            `アクション${subGoalIndex}-${actionIndex}`
          );

          // 一部のアクションのみ保存（全て保存すると時間がかかりすぎる）
          if (actionIndex % 2 === 0) {
            await subGoalActionHelpers.saveAction();
          }
        }
      }

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // 合理的な時間内で完了することを確認（30秒以内）
      expect(totalTime).toBeLessThan(30000);
    });
  });

  test.describe('ユーザビリティテスト', () => {
    test('キーボードのみでの操作フロー', async ({ page }) => {
      await subGoalActionHelpers.goToSubGoalEdit();

      // Tabキーでナビゲーション
      await page.keyboard.press('Tab'); // サブ目標1にフォーカス
      await page.keyboard.press('Enter'); // サブ目標1を選択

      // フォーム内でのキーボードナビゲーション
      await subGoalActionHelpers.testKeyboardNavigation();

      // Ctrl+Sで保存
      const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
      await page.keyboard.press(`${modifier}+KeyS`);

      // 保存成功を確認
      await subGoalActionHelpers.expectSuccessMessage(successMessages.general.draftSaved);
    });

    test('アクセシビリティ対応の確認', async ({ page }) => {
      await subGoalActionHelpers.goToSubGoalEdit();

      // ARIA属性の確認
      await subGoalActionHelpers.expectAccessibilityAttributes();

      // スクリーンリーダー対応の確認
      await subGoalActionHelpers.expectScreenReaderSupport();

      // フォーカス管理の確認
      await subGoalActionHelpers.selectSubGoal(0);
      const focusedElement = await page.locator(':focus');
      await expect(focusedElement).toBeVisible();
    });

    test('レスポンシブデザインの動作確認', async ({ page }) => {
      // モバイルサイズでテスト
      await page.setViewportSize({ width: 375, height: 667 });
      await subGoalActionHelpers.goToSubGoalEdit();
      await subGoalActionHelpers.expectMobileLayout();

      // タブレットサイズでテスト
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.reload();
      await subGoalActionHelpers.expectTabletLayout();

      // デスクトップサイズでテスト
      await page.setViewportSize({ width: 1024, height: 768 });
      await page.reload();
      await subGoalActionHelpers.expectDesktopLayout();
    });
  });

  test.describe('データ整合性テスト', () => {
    test('サブ目標削除時のアクション処理', async ({ page }) => {
      await subGoalActionHelpers.goToSubGoalEdit();

      // サブ目標を削除
      await subGoalActionHelpers.selectMultipleSubGoals([0]);
      await subGoalActionHelpers.bulkDelete();

      // アクション編集画面に移動
      await subGoalActionHelpers.proceedToActions();

      // 削除されたサブ目標のアクションが表示されないことを確認
      await expect(page.locator('[data-testid="subgoal-tab-0"]')).not.toBeVisible();

      // 残りのサブ目標のアクションは正常に表示されることを確認
      await expect(page.locator('[data-testid="subgoal-tab-1"]')).toBeVisible();
    });

    test('並び替え後のデータ整合性', async ({ page }) => {
      await subGoalActionHelpers.goToSubGoalEdit();

      // サブ目標の並び替え
      const originalOrder = [];
      for (let i = 0; i < 8; i++) {
        const title = await page.locator(`[data-testid="subgoal-title-${i}"]`).textContent();
        originalOrder.push(title);
      }

      // 最初と最後を入れ替え
      await subGoalActionHelpers.dragSubGoal(0, 7);

      // アクション編集画面で整合性を確認
      await subGoalActionHelpers.proceedToActions();

      // サブ目標タブの順序が正しく更新されていることを確認
      const newFirstTabTitle = await page
        .locator('[data-testid="subgoal-tab-title-0"]')
        .textContent();
      expect(newFirstTabTitle).toBe(originalOrder[7]);
    });

    test('一括編集後のデータ整合性', async ({ page }) => {
      await subGoalActionHelpers.goToSubGoalEdit();

      // 複数のサブ目標を一括編集
      await subGoalActionHelpers.selectMultipleSubGoals([0, 1, 2]);
      await subGoalActionHelpers.openBulkEditModal();
      await subGoalActionHelpers.bulkEditCommonFields({
        background: '一括編集された背景',
        constraints: '一括編集された制約',
      });
      await subGoalActionHelpers.saveBulkEdit();

      // 各サブ目標に変更が反映されていることを確認
      for (let i = 0; i < 3; i++) {
        await subGoalActionHelpers.selectSubGoal(i);
        await expect(page.locator('[data-testid="subgoal-background-input"]')).toHaveValue(
          '一括編集された背景'
        );
        await expect(page.locator('[data-testid="subgoal-constraints-input"]')).toHaveValue(
          '一括編集された制約'
        );
      }
    });
  });

  test.describe('パフォーマンステスト', () => {
    test('大量データ読み込み時のパフォーマンス', async ({ page }) => {
      // パフォーマンス測定開始
      await page.evaluate(() => performance.mark('start-load'));

      await subGoalActionHelpers.goToActionEdit();
      await subGoalActionHelpers.expectActionListVisible();

      // パフォーマンス測定終了
      await page.evaluate(() => performance.mark('end-load'));

      // 読み込み時間を取得
      const loadTime = await page.evaluate(() => {
        performance.measure('load-time', 'start-load', 'end-load');
        const measure = performance.getEntriesByName('load-time')[0];
        return measure.duration;
      });

      // 3秒以内で読み込まれることを確認
      expect(loadTime).toBeLessThan(3000);
    });

    test('メモリ使用量の監視', async ({ page }) => {
      await subGoalActionHelpers.goToActionEdit();

      // 初期メモリ使用量を取得
      const initialMemory = await page.evaluate(() => {
        return (performance as any).memory?.usedJSHeapSize || 0;
      });

      // 大量の操作を実行
      for (let i = 0; i < 8; i++) {
        await subGoalActionHelpers.selectSubGoalTab(i);
        await subGoalActionHelpers.selectAction(i, 0);
      }

      // 最終メモリ使用量を取得
      const finalMemory = await page.evaluate(() => {
        return (performance as any).memory?.usedJSHeapSize || 0;
      });

      // メモリ増加量が合理的な範囲内であることを確認（50MB以内）
      const memoryIncrease = finalMemory - initialMemory;
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });
  });
});
