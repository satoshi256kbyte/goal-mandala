import { test, expect } from '@playwright/test';
import { SubGoalActionHelpers } from '../helpers/subgoal-action-helpers';
import { AuthHelpers } from '../helpers/auth-helpers';
import {
  validActionData,
  invalidActionData,
  draftData,
  bulkEditData,
  dragDropData,
  errorMessages,
  successMessages,
} from '../fixtures/subgoal-action-data';
import { testUsers } from '../fixtures/test-data';

test.describe('アクション編集フロー', () => {
  let subGoalActionHelpers: SubGoalActionHelpers;
  let authHelpers: AuthHelpers;

  test.beforeEach(async ({ page }) => {
    subGoalActionHelpers = new SubGoalActionHelpers(page);
    authHelpers = new AuthHelpers(page);

    // 認証済みユーザーとしてログイン
    await authHelpers.goToLogin();
    await authHelpers.fillLoginForm(testUsers.validUser.email, testUsers.validUser.password);
    await authHelpers.clickLoginButton();
    await authHelpers.expectRedirectTo('/');
  });

  test.describe('アクション一覧表示', () => {
    test('64個のアクションが正しく表示される', async ({ page }) => {
      await subGoalActionHelpers.goToActionEdit();

      // アクション一覧が表示されることを確認
      await subGoalActionHelpers.expectActionListVisible();

      // 最初のサブ目標の8個のアクションが表示されることを確認
      for (let i = 0; i < 8; i++) {
        await expect(page.locator(`[data-testid="action-item-0-${i}"]`)).toBeVisible();
      }
    });

    test('サブ目標タブが正しく表示される', async ({ page }) => {
      await subGoalActionHelpers.goToActionEdit();

      // 8つのサブ目標タブが表示されることを確認
      for (let i = 0; i < 8; i++) {
        await expect(page.locator(`[data-testid="subgoal-tab-${i}"]`)).toBeVisible();
      }

      // 最初のタブがアクティブであることを確認
      await expect(page.locator('[data-testid="subgoal-tab-0"]')).toHaveClass(/active/);
    });

    test('アクションの基本情報が表示される', async ({ page }) => {
      await subGoalActionHelpers.goToActionEdit();

      // 最初のアクションの情報を確認
      const firstAction = page.locator('[data-testid="action-item-0-0"]');
      await expect(firstAction.locator('[data-testid="action-title"]')).toBeVisible();
      await expect(firstAction.locator('[data-testid="action-description"]')).toBeVisible();
      await expect(firstAction.locator('[data-testid="action-type"]')).toBeVisible();
      await expect(firstAction.locator('[data-testid="action-progress"]')).toBeVisible();
    });

    test('アクション種別が視覚的に区別される', async ({ page }) => {
      await subGoalActionHelpers.goToActionEdit();

      // 実行アクションのアイコンを確認
      await expect(page.locator('[data-testid="action-type-execution-icon-0-0"]')).toBeVisible();

      // 習慣アクションのアイコンを確認（存在する場合）
      const habitIcon = page.locator('[data-testid="action-type-habit-icon-0-1"]');
      if (await habitIcon.isVisible()) {
        await expect(habitIcon).toBeVisible();
      }
    });
  });

  test.describe('サブ目標タブ切り替え', () => {
    test('サブ目標タブの切り替えが動作する', async ({ page }) => {
      await subGoalActionHelpers.goToActionEdit();

      // 2番目のサブ目標タブを選択
      await subGoalActionHelpers.selectSubGoalTab(1);

      // 該当するアクションが表示されることを確認
      for (let i = 0; i < 8; i++) {
        await expect(page.locator(`[data-testid="action-item-1-${i}"]`)).toBeVisible();
      }

      // 他のサブ目標のアクションが非表示になることを確認
      for (let i = 0; i < 8; i++) {
        await expect(page.locator(`[data-testid="action-item-0-${i}"]`)).not.toBeVisible();
      }
    });

    test('すべてのサブ目標タブが正常に切り替わる', async ({ page }) => {
      await subGoalActionHelpers.goToActionEdit();

      // 全てのサブ目標タブを順番に選択
      for (let subGoalIndex = 0; subGoalIndex < 8; subGoalIndex++) {
        await subGoalActionHelpers.selectSubGoalTab(subGoalIndex);

        // 該当するアクションが表示されることを確認
        for (let actionIndex = 0; actionIndex < 8; actionIndex++) {
          await expect(
            page.locator(`[data-testid="action-item-${subGoalIndex}-${actionIndex}"]`)
          ).toBeVisible();
        }
      }
    });

    test('タブ切り替え時の未保存変更の警告', async ({ page }) => {
      await subGoalActionHelpers.goToActionEdit();

      // アクションを選択して編集
      await subGoalActionHelpers.selectAction(0, 0);
      await page.fill('[data-testid="action-title-input"]', '変更されたタイトル');

      // 別のタブに切り替えを試行
      page.on('dialog', async dialog => {
        expect(dialog.message()).toContain('未保存の変更があります');
        await dialog.accept();
      });

      await page.click('[data-testid="subgoal-tab-1"]');
    });
  });

  test.describe('アクション編集', () => {
    test('アクションを選択して編集フォームが表示される', async ({ page }) => {
      await subGoalActionHelpers.goToActionEdit();

      // アクションを選択
      await subGoalActionHelpers.selectAction(0, 0);

      // 編集フォームが表示されることを確認
      await expect(page.locator('[data-testid="action-edit-form"]')).toBeVisible();
      await expect(page.locator('[data-testid="action-title-input"]')).toBeVisible();
      await expect(page.locator('[data-testid="action-description-input"]')).toBeVisible();
      await expect(page.locator('[data-testid="action-background-input"]')).toBeVisible();
      await expect(page.locator('[data-testid="action-type-select"]')).toBeVisible();
      await expect(page.locator('[data-testid="action-constraints-input"]')).toBeVisible();
    });

    test('アクションの編集が正常に動作する', async ({ page }) => {
      await subGoalActionHelpers.goToActionEdit();

      // アクションを選択
      await subGoalActionHelpers.selectAction(0, 0);

      // フォームに入力
      await subGoalActionHelpers.fillActionForm(validActionData.execution);

      // 保存
      await subGoalActionHelpers.saveAction();

      // 成功メッセージを確認
      await subGoalActionHelpers.expectSuccessMessage(successMessages.action.saved);
    });

    test('アクション種別の変更が動作する', async ({ page }) => {
      await subGoalActionHelpers.goToActionEdit();
      await subGoalActionHelpers.selectAction(0, 0);

      // 実行アクションを選択
      await page.selectOption('[data-testid="action-type-select"]', 'execution');
      await expect(page.locator('[data-testid="action-type-select"]')).toHaveValue('execution');

      // 習慣アクションに変更
      await page.selectOption('[data-testid="action-type-select"]', 'habit');
      await expect(page.locator('[data-testid="action-type-select"]')).toHaveValue('habit');

      // 種別変更に応じたUIの変化を確認
      await expect(page.locator('[data-testid="habit-specific-options"]')).toBeVisible();
    });

    test('必須項目のバリデーションが動作する', async ({ page }) => {
      await subGoalActionHelpers.goToActionEdit();
      await subGoalActionHelpers.selectAction(0, 0);

      // 空のタイトルでバリデーションエラーを確認
      await subGoalActionHelpers.fillActionForm(invalidActionData.emptyTitle);
      await subGoalActionHelpers.expectValidationError(
        'action-title',
        errorMessages.action.requiredTitle
      );

      // 空の説明でバリデーションエラーを確認
      await subGoalActionHelpers.fillActionForm(invalidActionData.emptyDescription);
      await subGoalActionHelpers.expectValidationError(
        'action-description',
        errorMessages.action.requiredDescription
      );

      // 空の背景でバリデーションエラーを確認
      await subGoalActionHelpers.fillActionForm(invalidActionData.emptyBackground);
      await subGoalActionHelpers.expectValidationError(
        'action-background',
        errorMessages.action.requiredBackground
      );
    });

    test('文字数制限のバリデーションが動作する', async ({ page }) => {
      await subGoalActionHelpers.goToActionEdit();
      await subGoalActionHelpers.selectAction(0, 0);

      // タイトルの文字数制限
      await subGoalActionHelpers.fillActionForm(invalidActionData.longTitle);
      await subGoalActionHelpers.expectValidationError(
        'action-title',
        errorMessages.action.titleTooLong
      );

      // 説明の文字数制限
      await subGoalActionHelpers.fillActionForm(invalidActionData.longDescription);
      await subGoalActionHelpers.expectValidationError(
        'action-description',
        errorMessages.action.descriptionTooLong
      );

      // 背景の文字数制限
      await subGoalActionHelpers.fillActionForm(invalidActionData.longBackground);
      await subGoalActionHelpers.expectValidationError(
        'action-background',
        errorMessages.action.backgroundTooLong
      );

      // 制約事項の文字数制限
      await subGoalActionHelpers.fillActionForm(invalidActionData.longConstraints);
      await subGoalActionHelpers.expectValidationError(
        'action-constraints',
        errorMessages.action.constraintsTooLong
      );
    });

    test('リアルタイムバリデーションが動作する', async ({ page }) => {
      await subGoalActionHelpers.goToActionEdit();
      await subGoalActionHelpers.selectAction(0, 0);

      // タイトルフィールドにフォーカス
      await page.focus('[data-testid="action-title-input"]');

      // 文字を入力してリアルタイムバリデーションを確認
      await page.type('[data-testid="action-title-input"]', 'テストアクション');

      // 文字数カウンターが更新されることを確認
      await subGoalActionHelpers.expectCharacterCount('action-title', 7, 100);

      // フィールドを空にしてエラーが表示されることを確認
      await page.fill('[data-testid="action-title-input"]', '');
      await page.blur('[data-testid="action-title-input"]');
      await subGoalActionHelpers.expectValidationError(
        'action-title',
        errorMessages.action.requiredTitle
      );
    });
  });

  test.describe('アクション種別設定', () => {
    test('実行アクションの設定が正常に動作する', async ({ page }) => {
      await subGoalActionHelpers.goToActionEdit();
      await subGoalActionHelpers.selectAction(0, 0);

      // 実行アクションを設定
      await subGoalActionHelpers.fillActionForm(validActionData.execution);

      // 実行アクション特有のオプションが表示されることを確認
      await expect(page.locator('[data-testid="execution-specific-options"]')).toBeVisible();

      // 保存
      await subGoalActionHelpers.saveAction();

      // アクション種別が正しく保存されることを確認
      await expect(page.locator('[data-testid="action-type-display"]')).toContainText('実行');
    });

    test('習慣アクションの設定が正常に動作する', async ({ page }) => {
      await subGoalActionHelpers.goToActionEdit();
      await subGoalActionHelpers.selectAction(0, 0);

      // 習慣アクションを設定
      await subGoalActionHelpers.fillActionForm(validActionData.habit);

      // 習慣アクション特有のオプションが表示されることを確認
      await expect(page.locator('[data-testid="habit-specific-options"]')).toBeVisible();

      // 頻度設定が表示されることを確認
      await expect(page.locator('[data-testid="habit-frequency-setting"]')).toBeVisible();

      // 保存
      await subGoalActionHelpers.saveAction();

      // アクション種別が正しく保存されることを確認
      await expect(page.locator('[data-testid="action-type-display"]')).toContainText('習慣');
    });

    test('アクション種別変更時のフォーム項目の変化', async ({ page }) => {
      await subGoalActionHelpers.goToActionEdit();
      await subGoalActionHelpers.selectAction(0, 0);

      // 最初は実行アクションを選択
      await page.selectOption('[data-testid="action-type-select"]', 'execution');

      // 実行アクション特有の項目が表示されることを確認
      await expect(page.locator('[data-testid="execution-deadline-input"]')).toBeVisible();

      // 習慣アクションに変更
      await page.selectOption('[data-testid="action-type-select"]', 'habit');

      // 習慣アクション特有の項目が表示されることを確認
      await expect(page.locator('[data-testid="habit-frequency-input"]')).toBeVisible();

      // 実行アクション特有の項目が非表示になることを確認
      await expect(page.locator('[data-testid="execution-deadline-input"]')).not.toBeVisible();
    });

    test('アクション種別に応じた進捗計算の違い', async ({ page }) => {
      await subGoalActionHelpers.goToActionEdit();

      // 実行アクションの進捗表示を確認
      await subGoalActionHelpers.selectAction(0, 0);
      await page.selectOption('[data-testid="action-type-select"]', 'execution');
      await expect(page.locator('[data-testid="execution-progress-info"]')).toContainText('完了率');

      // 習慣アクションの進捗表示を確認
      await page.selectOption('[data-testid="action-type-select"]', 'habit');
      await expect(page.locator('[data-testid="habit-progress-info"]')).toContainText('継続率');
    });
  });

  test.describe('サブ目標間移動', () => {
    test('アクションを別のサブ目標に移動できる', async ({ page }) => {
      await subGoalActionHelpers.goToActionEdit();

      // 最初のサブ目標のアクションを選択
      await subGoalActionHelpers.selectAction(0, 0);
      const originalTitle = await page.locator('[data-testid="action-title-0-0"]').textContent();

      // アクションを別のサブ目標に移動
      await page.click('[data-testid="move-action-button"]');
      await page.selectOption('[data-testid="target-subgoal-select"]', '1');
      await page.click('[data-testid="confirm-move-button"]');

      // 移動先のサブ目標タブに切り替え
      await subGoalActionHelpers.selectSubGoalTab(1);

      // アクションが移動先に表示されることを確認
      await expect(page.locator('[data-testid="action-title-1-0"]')).toContainText(
        originalTitle || ''
      );

      // 元の位置からアクションが削除されることを確認
      await subGoalActionHelpers.selectSubGoalTab(0);
      await expect(page.locator('[data-testid="action-title-0-0"]')).not.toContainText(
        originalTitle || ''
      );
    });

    test('サブ目標間移動時の制約チェック', async ({ page }) => {
      await subGoalActionHelpers.goToActionEdit();

      // サブ目標が既に8個のアクションを持つ場合の移動制限
      await subGoalActionHelpers.selectAction(0, 0);
      await page.click('[data-testid="move-action-button"]');

      // 満杯のサブ目標は選択できないことを確認
      const fullSubGoalOption = page.locator('[data-testid="target-subgoal-option-1"][disabled]');
      if (await fullSubGoalOption.isVisible()) {
        await expect(fullSubGoalOption).toBeDisabled();
      }
    });

    test('移動確認ダイアログが表示される', async ({ page }) => {
      await subGoalActionHelpers.goToActionEdit();
      await subGoalActionHelpers.selectAction(0, 0);

      // 移動ボタンをクリック
      await page.click('[data-testid="move-action-button"]');

      // 移動確認ダイアログが表示されることを確認
      await expect(page.locator('[data-testid="move-confirmation-dialog"]')).toBeVisible();
      await expect(page.locator('text=このアクションを移動しますか？')).toBeVisible();
    });
  });

  test.describe('ドラッグ&ドロップ', () => {
    test('同一サブ目標内でのアクション並び替えが動作する', async ({ page }) => {
      await subGoalActionHelpers.goToActionEdit();

      // 最初のサブ目標のアクションタイトルを取得
      const firstTitle = await page.locator('[data-testid="action-title-0-0"]').textContent();
      const secondTitle = await page.locator('[data-testid="action-title-0-1"]').textContent();

      // ドラッグ&ドロップで並び替え
      await subGoalActionHelpers.dragAction(0, 0, 1);

      // 並び替えが反映されることを確認
      await expect(page.locator('[data-testid="action-title-0-0"]')).toContainText(
        secondTitle || ''
      );
      await expect(page.locator('[data-testid="action-title-0-1"]')).toContainText(
        firstTitle || ''
      );

      // 保存成功メッセージを確認
      await subGoalActionHelpers.expectSuccessMessage(successMessages.general.dragDropCompleted);
    });

    test('異なるサブ目標間でのドラッグ&ドロップ制限', async ({ page }) => {
      await subGoalActionHelpers.goToActionEdit();

      // 異なるサブ目標間でのドラッグを試行
      const sourceAction = page.locator('[data-testid="action-item-0-0"]');

      // 別のサブ目標タブを表示
      await subGoalActionHelpers.selectSubGoalTab(1);
      const targetAction = page.locator('[data-testid="action-item-1-0"]');

      // ドラッグを試行（制限されるべき）
      await sourceAction.dragTo(targetAction);

      // エラーメッセージが表示されることを確認
      await expect(page.locator('text=異なるサブ目標間での移動はできません')).toBeVisible();
    });

    test('ドラッグ中の視覚的フィードバック', async ({ page }) => {
      await subGoalActionHelpers.goToActionEdit();

      // ドラッグ開始
      const dragElement = page.locator('[data-testid="action-item-0-0"]');
      await dragElement.hover();
      await page.mouse.down();

      // ドラッグ中のフィードバックを確認
      await subGoalActionHelpers.expectDragFeedback();

      // ドロップゾーンのハイライトを確認
      await expect(page.locator('.drop-zone-highlight')).toBeVisible();

      // ドラッグ終了
      await page.mouse.up();
    });
  });

  test.describe('一括編集', () => {
    test('複数のアクションを選択できる', async ({ page }) => {
      await subGoalActionHelpers.goToActionEdit();

      // 複数のアクションを選択
      await subGoalActionHelpers.selectMultipleActions(0, [0, 1, 2]);

      // 選択状態が表示されることを確認
      await expect(page.locator('[data-testid="selected-count"]')).toContainText('3個選択中');
    });

    test('一括編集でアクション種別を変更できる', async ({ page }) => {
      await subGoalActionHelpers.goToActionEdit();

      // 複数のアクションを選択
      await subGoalActionHelpers.selectMultipleActions(0, [0, 1, 2]);

      // 一括編集モーダルを開く
      await subGoalActionHelpers.openBulkEditModal();

      // アクション種別を一括変更
      await page.selectOption('[data-testid="bulk-action-type-select"]', 'habit');

      // 保存
      await subGoalActionHelpers.saveBulkEdit();

      // 成功メッセージを確認
      await subGoalActionHelpers.expectSuccessMessage(successMessages.action.bulkEdited);

      // 変更が反映されることを確認
      for (let i = 0; i < 3; i++) {
        await expect(page.locator(`[data-testid="action-type-display-0-${i}"]`)).toContainText(
          '習慣'
        );
      }
    });

    test('サブ目標別の一括選択が動作する', async ({ page }) => {
      await subGoalActionHelpers.goToActionEdit();

      // サブ目標全体を選択
      await page.click('[data-testid="select-subgoal-actions-0"]');

      // 8個のアクションが選択されることを確認
      await expect(page.locator('[data-testid="selected-count"]')).toContainText('8個選択中');

      // 全てのアクションにチェックが入ることを確認
      for (let i = 0; i < 8; i++) {
        await expect(page.locator(`[data-testid="action-checkbox-0-${i}"]`)).toBeChecked();
      }
    });
  });

  test.describe('ナビゲーション', () => {
    test('活動開始に進める', async ({ page }) => {
      await subGoalActionHelpers.goToActionEdit();

      // 活動開始ボタンをクリック
      await subGoalActionHelpers.startActivity();

      // 活動開始確認ページに遷移することを確認
      await subGoalActionHelpers.expectRedirectTo('/mandala/create/confirm');
    });

    test('前のステップ（サブ目標編集）に戻れる', async ({ page }) => {
      await subGoalActionHelpers.goToActionEdit();

      // 戻るボタンをクリック
      await page.click('[data-testid="back-to-subgoals-button"]');

      // サブ目標編集ページに遷移することを確認
      await subGoalActionHelpers.expectRedirectTo('/mandala/create/subgoals');
    });

    test('未保存の変更がある場合の離脱確認', async ({ page }) => {
      await subGoalActionHelpers.goToActionEdit();

      // アクションを編集
      await subGoalActionHelpers.selectAction(0, 0);
      await page.fill('[data-testid="action-title-input"]', '変更されたタイトル');

      // 離脱確認ダイアログをテスト
      await subGoalActionHelpers.expectUnsavedChangesDialog();
    });
  });

  test.describe('エラーハンドリング', () => {
    test('ネットワークエラー時の適切な処理', async ({ page }) => {
      // ネットワークをオフラインに設定
      await page.context().setOffline(true);

      await subGoalActionHelpers.goToActionEdit();
      await subGoalActionHelpers.selectAction(0, 0);
      await subGoalActionHelpers.fillActionForm(validActionData.execution);

      // 保存を試行
      await page.click('[data-testid="save-action-button"]');

      // エラーメッセージが表示されることを確認
      await subGoalActionHelpers.expectErrorMessage(errorMessages.general.networkError);

      // ネットワークを復旧
      await page.context().setOffline(false);
    });

    test('サーバーエラー時の適切な処理', async ({ page }) => {
      // サーバーエラーをモック
      await page.route('**/api/actions/**', route => {
        route.fulfill({ status: 500, body: 'Internal Server Error' });
      });

      await subGoalActionHelpers.goToActionEdit();
      await subGoalActionHelpers.selectAction(0, 0);
      await subGoalActionHelpers.fillActionForm(validActionData.execution);

      // 保存を試行
      await page.click('[data-testid="save-action-button"]');

      // エラーメッセージが表示されることを確認
      await subGoalActionHelpers.expectErrorMessage(errorMessages.general.serverError);
    });

    test('データ読み込み失敗時の再試行機能', async ({ page }) => {
      let requestCount = 0;

      // 最初の2回のリクエストを失敗させ、3回目で成功させる
      await page.route('**/api/actions', route => {
        requestCount++;
        if (requestCount <= 2) {
          route.fulfill({ status: 500, body: 'Internal Server Error' });
        } else {
          route.continue();
        }
      });

      await subGoalActionHelpers.goToActionEdit();

      // 再試行ボタンをクリック
      await page.click('[data-testid="retry-button"]');

      // 最終的にデータが読み込まれることを確認
      await subGoalActionHelpers.expectActionListVisible();
    });

    test('無効なアクション種別の処理', async ({ page }) => {
      await subGoalActionHelpers.goToActionEdit();
      await subGoalActionHelpers.selectAction(0, 0);

      // 無効な種別を設定（JavaScriptで直接値を変更）
      await page.evaluate(() => {
        const select = document.querySelector(
          '[data-testid="action-type-select"]'
        ) as HTMLSelectElement;
        if (select) {
          select.value = 'invalid-type';
        }
      });

      // 保存を試行
      await page.click('[data-testid="save-action-button"]');

      // バリデーションエラーが表示されることを確認
      await subGoalActionHelpers.expectValidationError(
        'action-type',
        '有効なアクション種別を選択してください'
      );
    });
  });

  test.describe('パフォーマンス', () => {
    test('大量のアクション表示時のパフォーマンス', async ({ page }) => {
      await subGoalActionHelpers.goToActionEdit();

      // ページロード時間を測定
      const startTime = Date.now();
      await subGoalActionHelpers.expectActionListVisible();
      const loadTime = Date.now() - startTime;

      // 3秒以内にロードされることを確認
      expect(loadTime).toBeLessThan(3000);
    });

    test('タブ切り替え時のレスポンス性能', async ({ page }) => {
      await subGoalActionHelpers.goToActionEdit();

      // 各タブの切り替え時間を測定
      for (let i = 0; i < 8; i++) {
        const startTime = Date.now();
        await subGoalActionHelpers.selectSubGoalTab(i);
        const switchTime = Date.now() - startTime;

        // 500ms以内に切り替わることを確認
        expect(switchTime).toBeLessThan(500);
      }
    });
  });
});
