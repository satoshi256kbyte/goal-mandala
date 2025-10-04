import { test, expect } from '@playwright/test';
import { SubGoalActionHelpers } from '../helpers/subgoal-action-helpers';
import { AuthHelpers } from '../helpers/auth-helpers';
import {
  validSubGoalData,
  invalidSubGoalData,
  draftData,
  bulkEditData,
  dragDropData,
  errorMessages,
  successMessages,
} from '../fixtures/subgoal-action-data';
import { testUsers } from '../fixtures/test-data';

test.describe('サブ目標編集フロー', () => {
  let subGoalActionHelpers: SubGoalActionHelpers;
  let authHelpers: AuthHelpers;

  test.beforeEach(async ({ page }) => {
    subGoalActionHelpers = new SubGoalActionHelpers(page);

    // モック認証を設定
    await page.addInitScript(() => {
      localStorage.setItem('mock_auth_enabled', 'true');
      localStorage.setItem(
        'mock_user',
        JSON.stringify({
          id: 'test-user-id',
          email: 'test@example.com',
          name: 'Test User',
          profileComplete: true,
        })
      );
      localStorage.setItem('mock_token', 'mock-jwt-token');
    });
  });

  test.describe('サブ目標一覧表示', () => {
    test('8つのサブ目標が正しく表示される', async ({ page }) => {
      await subGoalActionHelpers.goToSubGoalEdit();

      // サブ目標一覧が表示されることを確認
      await subGoalActionHelpers.expectSubGoalListVisible();

      // 各サブ目標が表示されることを確認
      for (let i = 0; i < 8; i++) {
        await expect(page.locator(`[data-testid="subgoal-item-${i}"]`)).toBeVisible();
      }
    });

    test('サブ目標の基本情報が表示される', async ({ page }) => {
      await subGoalActionHelpers.goToSubGoalEdit();

      // 最初のサブ目標の情報を確認
      const firstSubGoal = page.locator('[data-testid="subgoal-item-0"]');
      await expect(firstSubGoal.locator('[data-testid="subgoal-title"]')).toBeVisible();
      await expect(firstSubGoal.locator('[data-testid="subgoal-description"]')).toBeVisible();
      await expect(firstSubGoal.locator('[data-testid="subgoal-progress"]')).toBeVisible();
    });

    test('サブ目標の進捗が視覚的に表示される', async ({ page }) => {
      await subGoalActionHelpers.goToSubGoalEdit();

      // 進捗バーが表示されることを確認
      await expect(page.locator('[data-testid="subgoal-progress-bar-0"]')).toBeVisible();

      // 進捗パーセンテージが表示されることを確認
      await expect(page.locator('[data-testid="subgoal-progress-text-0"]')).toBeVisible();
    });
  });

  test.describe('サブ目標編集', () => {
    test('サブ目標を選択して編集フォームが表示される', async ({ page }) => {
      await subGoalActionHelpers.goToSubGoalEdit();

      // サブ目標を選択
      await subGoalActionHelpers.selectSubGoal(0);

      // 編集フォームが表示されることを確認
      await expect(page.locator('[data-testid="subgoal-edit-form"]')).toBeVisible();
      await expect(page.locator('[data-testid="subgoal-title-input"]')).toBeVisible();
      await expect(page.locator('[data-testid="subgoal-description-input"]')).toBeVisible();
      await expect(page.locator('[data-testid="subgoal-background-input"]')).toBeVisible();
      await expect(page.locator('[data-testid="subgoal-constraints-input"]')).toBeVisible();
    });

    test('サブ目標の編集が正常に動作する', async ({ page }) => {
      await subGoalActionHelpers.goToSubGoalEdit();

      // サブ目標を選択
      await subGoalActionHelpers.selectSubGoal(0);

      // フォームに入力
      await subGoalActionHelpers.fillSubGoalForm(validSubGoalData.complete);

      // 保存
      await subGoalActionHelpers.saveSubGoal();

      // 成功メッセージを確認
      await subGoalActionHelpers.expectSuccessMessage(successMessages.subGoal.saved);
    });

    test('必須項目のバリデーションが動作する', async ({ page }) => {
      await subGoalActionHelpers.goToSubGoalEdit();
      await subGoalActionHelpers.selectSubGoal(0);

      // 空のタイトルでバリデーションエラーを確認
      await subGoalActionHelpers.fillSubGoalForm(invalidSubGoalData.emptyTitle);
      await subGoalActionHelpers.expectValidationError(
        'subgoal-title',
        errorMessages.subGoal.requiredTitle
      );

      // 空の説明でバリデーションエラーを確認
      await subGoalActionHelpers.fillSubGoalForm(invalidSubGoalData.emptyDescription);
      await subGoalActionHelpers.expectValidationError(
        'subgoal-description',
        errorMessages.subGoal.requiredDescription
      );

      // 空の背景でバリデーションエラーを確認
      await subGoalActionHelpers.fillSubGoalForm(invalidSubGoalData.emptyBackground);
      await subGoalActionHelpers.expectValidationError(
        'subgoal-background',
        errorMessages.subGoal.requiredBackground
      );
    });

    test('文字数制限のバリデーションが動作する', async ({ page }) => {
      await subGoalActionHelpers.goToSubGoalEdit();
      await subGoalActionHelpers.selectSubGoal(0);

      // タイトルの文字数制限
      await subGoalActionHelpers.fillSubGoalForm(invalidSubGoalData.longTitle);
      await subGoalActionHelpers.expectValidationError(
        'subgoal-title',
        errorMessages.subGoal.titleTooLong
      );

      // 説明の文字数制限
      await subGoalActionHelpers.fillSubGoalForm(invalidSubGoalData.longDescription);
      await subGoalActionHelpers.expectValidationError(
        'subgoal-description',
        errorMessages.subGoal.descriptionTooLong
      );

      // 背景の文字数制限
      await subGoalActionHelpers.fillSubGoalForm(invalidSubGoalData.longBackground);
      await subGoalActionHelpers.expectValidationError(
        'subgoal-background',
        errorMessages.subGoal.backgroundTooLong
      );

      // 制約事項の文字数制限
      await subGoalActionHelpers.fillSubGoalForm(invalidSubGoalData.longConstraints);
      await subGoalActionHelpers.expectValidationError(
        'subgoal-constraints',
        errorMessages.subGoal.constraintsTooLong
      );
    });

    test('リアルタイムバリデーションが動作する', async ({ page }) => {
      await subGoalActionHelpers.goToSubGoalEdit();
      await subGoalActionHelpers.selectSubGoal(0);

      // タイトルフィールドにフォーカス
      await page.focus('[data-testid="subgoal-title-input"]');

      // 文字を入力してリアルタイムバリデーションを確認
      await page.type('[data-testid="subgoal-title-input"]', 'テスト');

      // 文字数カウンターが更新されることを確認
      await subGoalActionHelpers.expectCharacterCount('subgoal-title', 3, 100);

      // フィールドを空にしてエラーが表示されることを確認
      await page.fill('[data-testid="subgoal-title-input"]', '');
      await page.blur('[data-testid="subgoal-title-input"]');
      await subGoalActionHelpers.expectValidationError(
        'subgoal-title',
        errorMessages.subGoal.requiredTitle
      );
    });

    test('AI再生成機能が動作する', async ({ page }) => {
      await subGoalActionHelpers.goToSubGoalEdit();

      // 再生成ボタンをクリック
      await subGoalActionHelpers.regenerateSubGoals();

      // ローディング状態を確認
      await subGoalActionHelpers.expectLoading();

      // 再生成完了後、新しいサブ目標が表示されることを確認
      await expect(page.locator('text=再生成が完了しました')).toBeVisible();
    });
  });

  test.describe('ドラッグ&ドロップ', () => {
    test('サブ目標の並び替えが動作する', async ({ page }) => {
      await subGoalActionHelpers.goToSubGoalEdit();

      // 最初のサブ目標のタイトルを取得
      const firstTitle = await page.locator('[data-testid="subgoal-title-0"]').textContent();
      const secondTitle = await page.locator('[data-testid="subgoal-title-1"]').textContent();

      // ドラッグ&ドロップで並び替え
      await subGoalActionHelpers.dragSubGoal(0, 1);

      // 並び替えが反映されることを確認
      await expect(page.locator('[data-testid="subgoal-title-0"]')).toContainText(
        secondTitle || ''
      );
      await expect(page.locator('[data-testid="subgoal-title-1"]')).toContainText(firstTitle || '');

      // 保存成功メッセージを確認
      await subGoalActionHelpers.expectSuccessMessage(successMessages.general.dragDropCompleted);
    });

    test('ドラッグ中の視覚的フィードバックが表示される', async ({ page }) => {
      await subGoalActionHelpers.goToSubGoalEdit();

      // ドラッグ開始
      const dragElement = page.locator('[data-testid="subgoal-item-0"]');
      await dragElement.hover();
      await page.mouse.down();

      // ドラッグ中のフィードバックを確認
      await subGoalActionHelpers.expectDragFeedback();

      // ドラッグ終了
      await page.mouse.up();
    });

    test('無効な位置へのドロップが適切に処理される', async ({ page }) => {
      await subGoalActionHelpers.goToSubGoalEdit();

      // 元の位置を記録
      const originalTitle = await page.locator('[data-testid="subgoal-title-0"]').textContent();

      // 無効な位置（範囲外）にドロップを試行
      const dragElement = page.locator('[data-testid="subgoal-item-0"]');
      await dragElement.dragTo(page.locator('body'));

      // 元の位置に戻ることを確認
      await expect(page.locator('[data-testid="subgoal-title-0"]')).toContainText(
        originalTitle || ''
      );
    });
  });

  test.describe('一括編集', () => {
    test('複数のサブ目標を選択できる', async ({ page }) => {
      await subGoalActionHelpers.goToSubGoalEdit();

      // 複数のサブ目標を選択
      await subGoalActionHelpers.selectMultipleSubGoals([0, 1, 2]);

      // 選択状態が表示されることを確認
      await expect(page.locator('[data-testid="selected-count"]')).toContainText('3個選択中');
    });

    test('一括編集モーダルが正しく動作する', async ({ page }) => {
      await subGoalActionHelpers.goToSubGoalEdit();

      // 複数のサブ目標を選択
      await subGoalActionHelpers.selectMultipleSubGoals([0, 1]);

      // 一括編集モーダルを開く
      await subGoalActionHelpers.openBulkEditModal();

      // モーダルが表示されることを確認
      await expect(page.locator('[data-testid="bulk-edit-modal"]')).toBeVisible();

      // 共通フィールドが表示されることを確認
      await expect(page.locator('[data-testid="bulk-background-input"]')).toBeVisible();
      await expect(page.locator('[data-testid="bulk-constraints-input"]')).toBeVisible();
    });

    test('一括編集で共通項目を変更できる', async ({ page }) => {
      await subGoalActionHelpers.goToSubGoalEdit();

      // 複数のサブ目標を選択
      await subGoalActionHelpers.selectMultipleSubGoals([0, 1, 2]);

      // 一括編集モーダルを開く
      await subGoalActionHelpers.openBulkEditModal();

      // 共通フィールドを編集
      await subGoalActionHelpers.bulkEditCommonFields(bulkEditData.commonFields);

      // 保存
      await subGoalActionHelpers.saveBulkEdit();

      // 成功メッセージを確認
      await subGoalActionHelpers.expectSuccessMessage(successMessages.subGoal.bulkEdited);
    });

    test('一括削除が動作する', async ({ page }) => {
      await subGoalActionHelpers.goToSubGoalEdit();

      // 複数のサブ目標を選択
      await subGoalActionHelpers.selectMultipleSubGoals([0, 1]);

      // 一括削除を実行
      await subGoalActionHelpers.bulkDelete();

      // 成功メッセージを確認
      await subGoalActionHelpers.expectSuccessMessage(successMessages.subGoal.deleted);

      // 削除されたサブ目標が表示されないことを確認
      await expect(page.locator('[data-testid="subgoal-item-0"]')).not.toBeVisible();
      await expect(page.locator('[data-testid="subgoal-item-1"]')).not.toBeVisible();
    });

    test('全選択・全解除機能が動作する', async ({ page }) => {
      await subGoalActionHelpers.goToSubGoalEdit();

      // 一括選択モードに切り替え
      await page.click('[data-testid="bulk-edit-mode-button"]');

      // 全選択
      await page.click('[data-testid="select-all-button"]');

      // 8個すべてが選択されることを確認
      await expect(page.locator('[data-testid="selected-count"]')).toContainText('8個選択中');

      // 全解除
      await page.click('[data-testid="deselect-all-button"]');

      // 選択が解除されることを確認
      await expect(page.locator('[data-testid="selected-count"]')).toContainText('0個選択中');
    });
  });

  test.describe('ナビゲーション', () => {
    test('次のステップ（アクション編集）に進める', async ({ page }) => {
      await subGoalActionHelpers.goToSubGoalEdit();

      // 次のステップボタンをクリック
      await subGoalActionHelpers.proceedToActions();

      // アクション編集ページに遷移することを確認
      await subGoalActionHelpers.expectRedirectTo('/mandala/create/actions');
    });

    test('前のステップ（目標入力）に戻れる', async ({ page }) => {
      await subGoalActionHelpers.goToSubGoalEdit();

      // 戻るボタンをクリック
      await page.click('[data-testid="back-to-goal-button"]');

      // 目標入力ページに遷移することを確認
      await subGoalActionHelpers.expectRedirectTo('/mandala/create/goal');
    });

    test('未保存の変更がある場合の離脱確認', async ({ page }) => {
      await subGoalActionHelpers.goToSubGoalEdit();

      // サブ目標を編集
      await subGoalActionHelpers.selectSubGoal(0);
      await page.fill('[data-testid="subgoal-title-input"]', '変更されたタイトル');

      // 離脱確認ダイアログをテスト
      await subGoalActionHelpers.expectUnsavedChangesDialog();
    });
  });

  test.describe('エラーハンドリング', () => {
    test('ネットワークエラー時の適切な処理', async ({ page }) => {
      // ネットワークをオフラインに設定
      await page.context().setOffline(true);

      await subGoalActionHelpers.goToSubGoalEdit();
      await subGoalActionHelpers.selectSubGoal(0);
      await subGoalActionHelpers.fillSubGoalForm(validSubGoalData.complete);

      // 保存を試行
      await page.click('[data-testid="save-subgoal-button"]');

      // エラーメッセージが表示されることを確認
      await subGoalActionHelpers.expectErrorMessage(errorMessages.general.networkError);

      // ネットワークを復旧
      await page.context().setOffline(false);
    });

    test('サーバーエラー時の適切な処理', async ({ page }) => {
      // サーバーエラーをモック
      await page.route('**/api/subgoals/**', route => {
        route.fulfill({ status: 500, body: 'Internal Server Error' });
      });

      await subGoalActionHelpers.goToSubGoalEdit();
      await subGoalActionHelpers.selectSubGoal(0);
      await subGoalActionHelpers.fillSubGoalForm(validSubGoalData.complete);

      // 保存を試行
      await page.click('[data-testid="save-subgoal-button"]');

      // エラーメッセージが表示されることを確認
      await subGoalActionHelpers.expectErrorMessage(errorMessages.general.serverError);
    });

    test('データ読み込み失敗時の再試行機能', async ({ page }) => {
      let requestCount = 0;

      // 最初の2回のリクエストを失敗させ、3回目で成功させる
      await page.route('**/api/subgoals', route => {
        requestCount++;
        if (requestCount <= 2) {
          route.fulfill({ status: 500, body: 'Internal Server Error' });
        } else {
          route.continue();
        }
      });

      await subGoalActionHelpers.goToSubGoalEdit();

      // 再試行ボタンをクリック
      await page.click('[data-testid="retry-button"]');

      // 最終的にデータが読み込まれることを確認
      await subGoalActionHelpers.expectSubGoalListVisible();
    });
  });
});
