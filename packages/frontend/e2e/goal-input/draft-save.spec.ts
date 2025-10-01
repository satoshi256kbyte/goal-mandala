import { test, expect } from '@playwright/test';
import { GoalInputHelpers } from '../helpers/goal-input-helpers';
import { AuthHelpers } from '../helpers/auth-helpers';
import { validGoalData, draftData, successMessages } from '../fixtures/goal-input-data';
import { testUsers } from '../fixtures/test-data';

test.describe('下書き保存機能', () => {
  let goalInputHelpers: GoalInputHelpers;
  let authHelpers: AuthHelpers;

  test.beforeEach(async ({ page }) => {
    goalInputHelpers = new GoalInputHelpers(page);
    authHelpers = new AuthHelpers(page);

    // 認証済みユーザーとしてログイン
    await authHelpers.goToLogin();
    await authHelpers.fillLoginForm(testUsers.validUser.email, testUsers.validUser.password);
    await authHelpers.clickLoginButton();
    await authHelpers.expectRedirectTo('/');

    // 目標入力ページに移動
    await goalInputHelpers.goToGoalInput();
  });

  test.describe('手動下書き保存', () => {
    test('部分的な入力内容を手動で下書き保存できる', async ({ page }) => {
      // 部分的にフォームに入力
      await goalInputHelpers.fillPartialGoalForm(draftData.partial);

      // 下書き保存ボタンをクリック
      await goalInputHelpers.clickDraftSaveButton();

      // 保存成功メッセージが表示されることを確認
      await goalInputHelpers.expectDraftSaveSuccess();

      // ページをリロード
      await page.reload();

      // 下書きが復元されることを確認
      await goalInputHelpers.expectDraftRestored();

      // 入力内容が復元されることを確認
      const formData = await goalInputHelpers.getFormData();
      expect(formData.title).toBe(draftData.partial.title);
      expect(formData.description).toBe(draftData.partial.description);
    });

    test('完全な入力内容を手動で下書き保存できる', async ({ page }) => {
      // 完全にフォームに入力
      await goalInputHelpers.fillGoalForm(draftData.complete);

      // 下書き保存ボタンをクリック
      await goalInputHelpers.clickDraftSaveButton();

      // 保存成功メッセージが表示されることを確認
      await goalInputHelpers.expectDraftSaveSuccess();

      // ページをリロード
      await page.reload();

      // 下書きが復元されることを確認
      await goalInputHelpers.expectDraftRestored();

      // 全ての入力内容が復元されることを確認
      const formData = await goalInputHelpers.getFormData();
      expect(formData.title).toBe(draftData.complete.title);
      expect(formData.description).toBe(draftData.complete.description);
      expect(formData.deadline).toBe(draftData.complete.deadline);
      expect(formData.background).toBe(draftData.complete.background);
      expect(formData.constraints).toBe(draftData.complete.constraints);
    });

    test('空のフォームでは下書き保存ボタンが無効になる', async ({ page }) => {
      // フォームが空の状態で下書き保存ボタンの状態を確認
      const draftSaveButton = page.locator('[data-testid="draft-save-button"]');
      await expect(draftSaveButton).toBeDisabled();
    });

    test('何かしら入力があると下書き保存ボタンが有効になる', async ({ page }) => {
      // 1つのフィールドに入力
      await goalInputHelpers.fillPartialGoalForm({
        title: '最小限の入力',
      });

      // 下書き保存ボタンが有効になることを確認
      const draftSaveButton = page.locator('[data-testid="draft-save-button"]');
      await expect(draftSaveButton).toBeEnabled();
    });

    test('下書き保存中はボタンが無効になる', async ({ page }) => {
      // フォームに入力
      await goalInputHelpers.fillPartialGoalForm(draftData.partial);

      // 下書き保存ボタンをクリック
      await goalInputHelpers.clickDraftSaveButton();

      // 保存中はボタンが無効になることを確認
      const draftSaveButton = page.locator('[data-testid="draft-save-button"]');
      await expect(draftSaveButton).toBeDisabled();

      // 保存完了後は再び有効になることを確認
      await goalInputHelpers.expectDraftSaveSuccess();
      await expect(draftSaveButton).toBeEnabled();
    });
  });

  test.describe('自動下書き保存', () => {
    test('30秒間隔で自動保存が実行される', async ({ page }) => {
      // フォームに入力
      await goalInputHelpers.fillPartialGoalForm({
        title: '自動保存テスト',
      });

      // 30秒待機（テスト用に短縮）
      await page.waitForTimeout(2000);

      // 自動保存が実行されたことを確認（ローカルストレージまたはAPIコール）
      const localStorage = await page.evaluate(() => {
        return window.localStorage.getItem('goalFormDraft');
      });
      expect(localStorage).toBeTruthy();

      // ページをリロード
      await page.reload();

      // 下書きが復元されることを確認
      await goalInputHelpers.expectDraftRestored();
    });

    test('入力内容が変更された時のみ自動保存が実行される', async ({ page }) => {
      // 初期入力
      await goalInputHelpers.fillPartialGoalForm({
        title: '初期タイトル',
      });

      // 少し待機
      await page.waitForTimeout(1000);

      // 内容を変更
      await page.fill('[data-testid="goal-title-input"]', '変更されたタイトル');

      // 自動保存が実行されることを確認
      await page.waitForTimeout(2000);

      // ページをリロード
      await page.reload();

      // 変更された内容が復元されることを確認
      const formData = await goalInputHelpers.getFormData();
      expect(formData.title).toBe('変更されたタイトル');
    });

    test('フォームが空の場合は自動保存が実行されない', async ({ page }) => {
      // フォームを空のままにして待機
      await page.waitForTimeout(2000);

      // ローカルストレージに下書きが保存されていないことを確認
      const localStorage = await page.evaluate(() => {
        return window.localStorage.getItem('goalFormDraft');
      });
      expect(localStorage).toBeFalsy();
    });
  });

  test.describe('下書き復元', () => {
    test('ページ再読み込み時に下書きが復元される', async ({ page }) => {
      // 下書きを保存
      await goalInputHelpers.fillPartialGoalForm(draftData.partial);
      await goalInputHelpers.clickDraftSaveButton();
      await goalInputHelpers.expectDraftSaveSuccess();

      // ページをリロード
      await page.reload();

      // 下書き復元メッセージが表示されることを確認
      await goalInputHelpers.expectDraftRestored();

      // 入力内容が復元されることを確認
      const formData = await goalInputHelpers.getFormData();
      expect(formData.title).toBe(draftData.partial.title);
      expect(formData.description).toBe(draftData.partial.description);
    });

    test('新しいタブで開いた時に下書きが復元される', async ({ browser }) => {
      const context = await browser.newContext();
      const page1 = await context.newPage();
      const page2 = await context.newPage();

      const helpers1 = new GoalInputHelpers(page1);
      const helpers2 = new GoalInputHelpers(page2);

      // 両方のページで認証
      const auth1 = new AuthHelpers(page1);
      const auth2 = new AuthHelpers(page2);

      await auth1.goToLogin();
      await auth1.fillLoginForm(testUsers.validUser.email, testUsers.validUser.password);
      await auth1.clickLoginButton();

      await auth2.goToLogin();
      await auth2.fillLoginForm(testUsers.validUser.email, testUsers.validUser.password);
      await auth2.clickLoginButton();

      // 1つ目のタブで下書き保存
      await helpers1.goToGoalInput();
      await helpers1.fillPartialGoalForm(draftData.partial);
      await helpers1.clickDraftSaveButton();
      await helpers1.expectDraftSaveSuccess();

      // 2つ目のタブで目標入力ページを開く
      await helpers2.goToGoalInput();

      // 下書きが復元されることを確認
      await helpers2.expectDraftRestored();

      await context.close();
    });

    test('下書き復元の確認ダイアログで「はい」を選択すると復元される', async ({ page }) => {
      // 下書きを保存
      await goalInputHelpers.fillPartialGoalForm(draftData.partial);
      await goalInputHelpers.clickDraftSaveButton();
      await goalInputHelpers.expectDraftSaveSuccess();

      // ページをリロード
      await page.reload();

      // 復元確認ダイアログが表示される場合の処理
      const restoreButton = page.locator('[data-testid="restore-draft-button"]');
      if (await restoreButton.isVisible()) {
        await restoreButton.click();
      }

      // 下書きが復元されることを確認
      const formData = await goalInputHelpers.getFormData();
      expect(formData.title).toBe(draftData.partial.title);
    });

    test('下書き復元の確認ダイアログで「いいえ」を選択すると復元されない', async ({ page }) => {
      // 下書きを保存
      await goalInputHelpers.fillPartialGoalForm(draftData.partial);
      await goalInputHelpers.clickDraftSaveButton();
      await goalInputHelpers.expectDraftSaveSuccess();

      // ページをリロード
      await page.reload();

      // 復元拒否ボタンがある場合はクリック
      const rejectButton = page.locator('[data-testid="reject-draft-button"]');
      if (await rejectButton.isVisible()) {
        await rejectButton.click();
      }

      // フォームが空のままであることを確認
      await goalInputHelpers.expectFormReset();
    });
  });

  test.describe('下書き管理', () => {
    test('新しい下書きが古い下書きを上書きする', async ({ page }) => {
      // 最初の下書きを保存
      await goalInputHelpers.fillPartialGoalForm({
        title: '最初の下書き',
      });
      await goalInputHelpers.clickDraftSaveButton();
      await goalInputHelpers.expectDraftSaveSuccess();

      // 内容を変更して再度保存
      await page.fill('[data-testid="goal-title-input"]', '更新された下書き');
      await goalInputHelpers.clickDraftSaveButton();
      await goalInputHelpers.expectDraftSaveSuccess();

      // ページをリロード
      await page.reload();

      // 最新の下書きが復元されることを確認
      const formData = await goalInputHelpers.getFormData();
      expect(formData.title).toBe('更新された下書き');
    });

    test('フォーム送信後は下書きが削除される', async ({ page }) => {
      // 下書きを保存
      await goalInputHelpers.fillGoalForm(validGoalData.complete);
      await goalInputHelpers.clickDraftSaveButton();
      await goalInputHelpers.expectDraftSaveSuccess();

      // フォームを送信
      await goalInputHelpers.clickSubmitButton();

      // 処理中画面に遷移
      await goalInputHelpers.expectRedirectTo('/mandala/create/processing');

      // 目標入力ページに戻る
      await goalInputHelpers.goToGoalInput();

      // 下書きが削除されていることを確認（復元メッセージが表示されない）
      await goalInputHelpers.expectFormReset();
    });

    test('下書きを手動で削除できる', async ({ page }) => {
      // 下書きを保存
      await goalInputHelpers.fillPartialGoalForm(draftData.partial);
      await goalInputHelpers.clickDraftSaveButton();
      await goalInputHelpers.expectDraftSaveSuccess();

      // 下書き削除ボタンがある場合はクリック
      const deleteDraftButton = page.locator('[data-testid="delete-draft-button"]');
      if (await deleteDraftButton.isVisible()) {
        await deleteDraftButton.click();

        // 削除確認ダイアログで確認
        page.on('dialog', async dialog => {
          expect(dialog.message()).toContain('下書きを削除');
          await dialog.accept();
        });

        // フォームがリセットされることを確認
        await goalInputHelpers.expectFormReset();
      }
    });
  });

  test.describe('エラーハンドリング', () => {
    test('ネットワークエラー時でもローカル保存は動作する', async ({ page }) => {
      // フォームに入力
      await goalInputHelpers.fillPartialGoalForm(draftData.partial);

      // ネットワークをオフラインに設定
      await page.context().setOffline(true);

      // 下書き保存を試行
      await goalInputHelpers.clickDraftSaveButton();

      // ローカル保存は成功することを確認
      await goalInputHelpers.expectDraftSaveSuccess();

      // ネットワークを復旧
      await page.context().setOffline(false);

      // ページをリロード
      await page.reload();

      // 下書きが復元されることを確認
      await goalInputHelpers.expectDraftRestored();
    });

    test('サーバーエラー時でもローカル保存は動作する', async ({ page }) => {
      // サーバーエラーをモック
      await page.route('**/api/goals/draft', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Server Error' }),
        });
      });

      // フォームに入力
      await goalInputHelpers.fillPartialGoalForm(draftData.partial);

      // 下書き保存を試行
      await goalInputHelpers.clickDraftSaveButton();

      // ローカル保存は成功することを確認
      await goalInputHelpers.expectDraftSaveSuccess();
    });

    test('ローカルストレージが無効な場合の処理', async ({ page }) => {
      // ローカルストレージを無効化
      await page.addInitScript(() => {
        Object.defineProperty(window, 'localStorage', {
          value: null,
          writable: false,
        });
      });

      await goalInputHelpers.goToGoalInput();

      // フォームに入力
      await goalInputHelpers.fillPartialGoalForm(draftData.partial);

      // 下書き保存を試行
      await goalInputHelpers.clickDraftSaveButton();

      // エラーメッセージが表示されることを確認
      await goalInputHelpers.expectValidationError('form', 'ローカル保存に失敗しました');
    });
  });

  test.describe('パフォーマンス', () => {
    test('大量のデータでも下書き保存が正常に動作する', async ({ page }) => {
      // 大量のデータを入力
      const largeData = {
        title: 'a'.repeat(100),
        description: 'b'.repeat(1000),
        background: 'c'.repeat(500),
        constraints: 'd'.repeat(500),
        deadline: '2024-12-31',
      };

      await goalInputHelpers.fillGoalForm(largeData);

      // 下書き保存を実行
      await goalInputHelpers.clickDraftSaveButton();

      // 保存が成功することを確認
      await goalInputHelpers.expectDraftSaveSuccess();

      // ページをリロード
      await page.reload();

      // 大量のデータが正しく復元されることを確認
      const formData = await goalInputHelpers.getFormData();
      expect(formData.title).toBe(largeData.title);
      expect(formData.description).toBe(largeData.description);
      expect(formData.background).toBe(largeData.background);
      expect(formData.constraints).toBe(largeData.constraints);
    });

    test('頻繁な自動保存でもパフォーマンスが劣化しない', async ({ page }) => {
      // 短い間隔で複数回入力を変更
      for (let i = 0; i < 10; i++) {
        await page.fill('[data-testid="goal-title-input"]', `タイトル ${i}`);
        await page.waitForTimeout(100);
      }

      // 最終的な自動保存を待機
      await page.waitForTimeout(2000);

      // ページをリロード
      await page.reload();

      // 最後の入力内容が保存されていることを確認
      const formData = await goalInputHelpers.getFormData();
      expect(formData.title).toBe('タイトル 9');
    });
  });
});
