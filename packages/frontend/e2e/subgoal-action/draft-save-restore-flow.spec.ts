import { test, expect } from '@playwright/test';
import { SubGoalActionHelpers } from '../helpers/subgoal-action-helpers';
import { AuthHelpers } from '../helpers/auth-helpers';
import {
  validSubGoalData,
  validActionData,
  draftData,
  errorMessages,
  successMessages,
} from '../fixtures/subgoal-action-data';
import { testUsers } from '../fixtures/test-data';

test.describe('下書き保存・復元フロー', () => {
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

  test.describe('自動保存機能', () => {
    test('サブ目標編集時の自動保存が動作する', async ({ page }) => {
      await subGoalActionHelpers.goToSubGoalEdit();
      await subGoalActionHelpers.selectSubGoal(0);

      // フォームに入力
      await subGoalActionHelpers.fillSubGoalForm(draftData.subGoal.partial);

      // 自動保存がトリガーされるまで待機（30秒間隔をテスト用に短縮）
      await page.waitForTimeout(2000);

      // 自動保存インジケーターを確認
      await subGoalActionHelpers.expectAutoSave();
    });

    test('アクション編集時の自動保存が動作する', async ({ page }) => {
      await subGoalActionHelpers.goToActionEdit();
      await subGoalActionHelpers.selectAction(0, 0);

      // フォームに入力
      await subGoalActionHelpers.fillActionForm(draftData.action.partial);

      // 自動保存がトリガーされるまで待機
      await page.waitForTimeout(2000);

      // 自動保存インジケーターを確認
      await subGoalActionHelpers.expectAutoSave();
    });

    test('自動保存の間隔設定が正しく動作する', async ({ page }) => {
      await subGoalActionHelpers.goToSubGoalEdit();
      await subGoalActionHelpers.selectSubGoal(0);

      // フォームに入力
      await page.fill('[data-testid="subgoal-title-input"]', '自動保存テスト1');

      // 最初の自動保存を待機
      await page.waitForTimeout(2000);
      await subGoalActionHelpers.expectAutoSave();

      // 追加の変更
      await page.fill('[data-testid="subgoal-description-input"]', '自動保存テスト説明');

      // 次の自動保存を待機
      await page.waitForTimeout(2000);
      await subGoalActionHelpers.expectAutoSave();
    });

    test('自動保存中のユーザー操作が適切に処理される', async ({ page }) => {
      await subGoalActionHelpers.goToSubGoalEdit();
      await subGoalActionHelpers.selectSubGoal(0);

      // フォームに入力
      await subGoalActionHelpers.fillSubGoalForm(draftData.subGoal.partial);

      // 自動保存中に追加の変更を行う
      await page.fill('[data-testid="subgoal-title-input"]', '自動保存中の変更');

      // 自動保存が完了するまで待機
      await page.waitForTimeout(3000);

      // 最新の変更が保存されることを確認
      await subGoalActionHelpers.expectAutoSave();
    });

    test('自動保存のエラーハンドリング', async ({ page }) => {
      // ネットワークエラーをシミュレート
      await page.route('**/api/drafts/**', route => {
        route.fulfill({ status: 500, body: 'Internal Server Error' });
      });

      await subGoalActionHelpers.goToSubGoalEdit();
      await subGoalActionHelpers.selectSubGoal(0);

      // フォームに入力
      await subGoalActionHelpers.fillSubGoalForm(draftData.subGoal.partial);

      // 自動保存エラーを待機
      await page.waitForTimeout(2000);

      // エラーメッセージが表示されることを確認
      await expect(page.locator('text=自動保存に失敗しました')).toBeVisible();

      // リトライボタンが表示されることを確認
      await expect(page.locator('[data-testid="retry-auto-save-button"]')).toBeVisible();
    });

    test('自動保存の差分検出機能', async ({ page }) => {
      await subGoalActionHelpers.goToSubGoalEdit();
      await subGoalActionHelpers.selectSubGoal(0);

      // 初期データを入力
      await subGoalActionHelpers.fillSubGoalForm(draftData.subGoal.complete);

      // 最初の自動保存
      await page.waitForTimeout(2000);
      await subGoalActionHelpers.expectAutoSave();

      // 変更なしで時間経過
      await page.waitForTimeout(2000);

      // 変更がない場合は自動保存されないことを確認
      await expect(page.locator('text=変更がないため保存をスキップしました')).toBeVisible();
    });
  });

  test.describe('手動保存機能', () => {
    test('サブ目標の手動下書き保存が動作する', async ({ page }) => {
      await subGoalActionHelpers.goToSubGoalEdit();
      await subGoalActionHelpers.selectSubGoal(0);

      // フォームに入力
      await subGoalActionHelpers.fillSubGoalForm(draftData.subGoal.complete);

      // 手動で下書き保存
      await subGoalActionHelpers.saveDraft();

      // 成功メッセージを確認
      await subGoalActionHelpers.expectSuccessMessage(successMessages.general.draftSaved);
    });

    test('アクションの手動下書き保存が動作する', async ({ page }) => {
      await subGoalActionHelpers.goToActionEdit();
      await subGoalActionHelpers.selectAction(0, 0);

      // フォームに入力
      await subGoalActionHelpers.fillActionForm(draftData.action.complete);

      // 手動で下書き保存
      await subGoalActionHelpers.saveDraft();

      // 成功メッセージを確認
      await subGoalActionHelpers.expectSuccessMessage(successMessages.general.draftSaved);
    });

    test('部分的な入力での手動保存', async ({ page }) => {
      await subGoalActionHelpers.goToSubGoalEdit();
      await subGoalActionHelpers.selectSubGoal(0);

      // 部分的にフォームに入力
      await page.fill('[data-testid="subgoal-title-input"]', '部分的な下書き');

      // 手動で下書き保存
      await subGoalActionHelpers.saveDraft();

      // 成功メッセージを確認
      await subGoalActionHelpers.expectSuccessMessage(successMessages.general.draftSaved);
    });

    test('手動保存のキーボードショートカット', async ({ page }) => {
      await subGoalActionHelpers.goToSubGoalEdit();
      await subGoalActionHelpers.selectSubGoal(0);

      // フォームに入力
      await subGoalActionHelpers.fillSubGoalForm(draftData.subGoal.partial);

      // Ctrl+S（macOSではCmd+S）で保存
      const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
      await page.keyboard.press(`${modifier}+KeyS`);

      // 成功メッセージを確認
      await subGoalActionHelpers.expectSuccessMessage(successMessages.general.draftSaved);
    });

    test('手動保存中の重複保存防止', async ({ page }) => {
      await subGoalActionHelpers.goToSubGoalEdit();
      await subGoalActionHelpers.selectSubGoal(0);

      // フォームに入力
      await subGoalActionHelpers.fillSubGoalForm(draftData.subGoal.complete);

      // 手動保存ボタンを連続でクリック
      await page.click('[data-testid="save-draft-button"]');
      await page.click('[data-testid="save-draft-button"]');

      // 保存中はボタンが無効になることを確認
      await expect(page.locator('[data-testid="save-draft-button"]')).toBeDisabled();

      // 保存完了後にボタンが有効になることを確認
      await page.waitForTimeout(1000);
      await expect(page.locator('[data-testid="save-draft-button"]')).toBeEnabled();
    });
  });

  test.describe('下書き復元機能', () => {
    test('ページリロード後の下書き復元', async ({ page }) => {
      await subGoalActionHelpers.goToSubGoalEdit();
      await subGoalActionHelpers.selectSubGoal(0);

      // フォームに入力して保存
      await subGoalActionHelpers.fillSubGoalForm(draftData.subGoal.complete);
      await subGoalActionHelpers.saveDraft();

      // ページをリロード
      await page.reload();

      // 下書き復元メッセージを確認
      await subGoalActionHelpers.expectDraftRestored();

      // 入力内容が復元されることを確認
      const formData = await subGoalActionHelpers.getSubGoalFormData();
      expect(formData.title).toBe(draftData.subGoal.complete.title);
      expect(formData.description).toBe(draftData.subGoal.complete.description);
      expect(formData.background).toBe(draftData.subGoal.complete.background);
      expect(formData.constraints).toBe(draftData.subGoal.complete.constraints);
    });

    test('ブラウザタブ間での下書き同期', async ({ browser }) => {
      const context = await browser.newContext();
      const page1 = await context.newPage();
      const page2 = await context.newPage();

      const helpers1 = new SubGoalActionHelpers(page1);
      const helpers2 = new SubGoalActionHelpers(page2);
      const auth1 = new AuthHelpers(page1);
      const auth2 = new AuthHelpers(page2);

      // 両方のタブで認証
      await auth1.goToLogin();
      await auth1.fillLoginForm(testUsers.validUser.email, testUsers.validUser.password);
      await auth1.clickLoginButton();

      await auth2.goToLogin();
      await auth2.fillLoginForm(testUsers.validUser.email, testUsers.validUser.password);
      await auth2.clickLoginButton();

      // タブ1で下書き保存
      await helpers1.goToSubGoalEdit();
      await helpers1.selectSubGoal(0);
      await helpers1.fillSubGoalForm(draftData.subGoal.complete);
      await helpers1.saveDraft();

      // タブ2で下書きが同期されることを確認
      await helpers2.goToSubGoalEdit();
      await helpers2.selectSubGoal(0);
      await helpers2.expectDraftRestored();

      await context.close();
    });

    test('下書き復元の選択的適用', async ({ page }) => {
      await subGoalActionHelpers.goToSubGoalEdit();
      await subGoalActionHelpers.selectSubGoal(0);

      // 既存データがある状態で下書きを保存
      await page.fill('[data-testid="subgoal-title-input"]', '既存タイトル');
      await subGoalActionHelpers.saveDraft();

      // 新しいデータを入力
      await page.fill('[data-testid="subgoal-title-input"]', '新しいタイトル');

      // ページリロード
      await page.reload();

      // 下書き復元の選択ダイアログが表示されることを確認
      await expect(page.locator('[data-testid="draft-restore-dialog"]')).toBeVisible();
      await expect(page.locator('text=下書きを復元しますか？')).toBeVisible();

      // 復元を選択
      await page.click('[data-testid="restore-draft-button"]');

      // 下書きが復元されることを確認
      await expect(page.locator('[data-testid="subgoal-title-input"]')).toHaveValue('既存タイトル');
    });

    test('複数項目の下書き復元', async ({ page }) => {
      await subGoalActionHelpers.goToSubGoalEdit();

      // 複数のサブ目標を編集して保存
      for (let i = 0; i < 3; i++) {
        await subGoalActionHelpers.selectSubGoal(i);
        await page.fill('[data-testid="subgoal-title-input"]', `下書きサブ目標${i + 1}`);
        await subGoalActionHelpers.saveDraft();
      }

      // ページリロード
      await page.reload();

      // 複数の下書きが復元されることを確認
      await subGoalActionHelpers.expectDraftRestored();

      // 各サブ目標の下書きが復元されることを確認
      for (let i = 0; i < 3; i++) {
        await subGoalActionHelpers.selectSubGoal(i);
        await expect(page.locator('[data-testid="subgoal-title-input"]')).toHaveValue(
          `下書きサブ目標${i + 1}`
        );
      }
    });

    test('下書き復元の期限切れ処理', async ({ page }) => {
      // 期限切れの下書きをモック
      await page.addInitScript(() => {
        const expiredDraft = {
          timestamp: Date.now() - 7 * 24 * 60 * 60 * 1000, // 7日前
          data: { title: '期限切れ下書き' },
        };
        localStorage.setItem('draft_subgoal_0', JSON.stringify(expiredDraft));
      });

      await subGoalActionHelpers.goToSubGoalEdit();
      await subGoalActionHelpers.selectSubGoal(0);

      // 期限切れメッセージが表示されることを確認
      await expect(page.locator('text=下書きの保存期限が切れています')).toBeVisible();

      // 下書きが自動削除されることを確認
      const draftExists = await page.evaluate(() => {
        return localStorage.getItem('draft_subgoal_0') !== null;
      });
      expect(draftExists).toBe(false);
    });
  });

  test.describe('画面離脱時の確認', () => {
    test('未保存の変更がある場合の離脱確認ダイアログ', async ({ page }) => {
      await subGoalActionHelpers.goToSubGoalEdit();
      await subGoalActionHelpers.selectSubGoal(0);

      // フォームに入力（保存しない）
      await page.fill('[data-testid="subgoal-title-input"]', '未保存の変更');

      // ページ離脱を試行
      let dialogShown = false;
      page.on('dialog', async dialog => {
        expect(dialog.message()).toContain('未保存の変更があります');
        dialogShown = true;
        await dialog.accept();
      });

      // 別のページに移動を試行
      await page.goto('/');

      // ダイアログが表示されたことを確認
      expect(dialogShown).toBe(true);
    });

    test('保存済みの場合は離脱確認が表示されない', async ({ page }) => {
      await subGoalActionHelpers.goToSubGoalEdit();
      await subGoalActionHelpers.selectSubGoal(0);

      // フォームに入力して保存
      await subGoalActionHelpers.fillSubGoalForm(draftData.subGoal.complete);
      await subGoalActionHelpers.saveDraft();

      // ページ離脱を試行
      let dialogShown = false;
      page.on('dialog', async dialog => {
        dialogShown = true;
        await dialog.accept();
      });

      // 別のページに移動
      await page.goto('/');

      // ダイアログが表示されないことを確認
      expect(dialogShown).toBe(false);
    });

    test('ブラウザタブを閉じる際の確認', async ({ page }) => {
      await subGoalActionHelpers.goToSubGoalEdit();
      await subGoalActionHelpers.selectSubGoal(0);

      // フォームに入力（保存しない）
      await page.fill('[data-testid="subgoal-title-input"]', '未保存の変更');

      // beforeunloadイベントが設定されることを確認
      const hasBeforeUnload = await page.evaluate(() => {
        return window.onbeforeunload !== null;
      });
      expect(hasBeforeUnload).toBe(true);
    });

    test('フォーム送信時は離脱確認をスキップ', async ({ page }) => {
      await subGoalActionHelpers.goToSubGoalEdit();
      await subGoalActionHelpers.selectSubGoal(0);

      // フォームに入力
      await subGoalActionHelpers.fillSubGoalForm(validSubGoalData.complete);

      // フォーム送信（保存）
      await subGoalActionHelpers.saveSubGoal();

      // 送信後は離脱確認が無効になることを確認
      const hasBeforeUnload = await page.evaluate(() => {
        return window.onbeforeunload !== null;
      });
      expect(hasBeforeUnload).toBe(false);
    });
  });

  test.describe('下書きデータ管理', () => {
    test('下書きデータの圧縮保存', async ({ page }) => {
      await subGoalActionHelpers.goToSubGoalEdit();
      await subGoalActionHelpers.selectSubGoal(0);

      // 大量のデータを入力
      const largeData = {
        title: 'a'.repeat(100),
        description: 'b'.repeat(500),
        background: 'c'.repeat(500),
        constraints: 'd'.repeat(300),
      };

      await subGoalActionHelpers.fillSubGoalForm(largeData);
      await subGoalActionHelpers.saveDraft();

      // ローカルストレージのデータサイズを確認
      const storageSize = await page.evaluate(() => {
        const draft = localStorage.getItem('draft_subgoal_0');
        return draft ? draft.length : 0;
      });

      // 圧縮により元データより小さくなることを確認
      const originalSize = JSON.stringify(largeData).length;
      expect(storageSize).toBeLessThan(originalSize);
    });

    test('下書きデータの暗号化', async ({ page }) => {
      await subGoalActionHelpers.goToSubGoalEdit();
      await subGoalActionHelpers.selectSubGoal(0);

      // 機密データを入力
      const sensitiveData = {
        title: '機密プロジェクト',
        description: '社外秘の内容',
        background: '競合他社に知られてはいけない情報',
        constraints: '法的制約あり',
      };

      await subGoalActionHelpers.fillSubGoalForm(sensitiveData);
      await subGoalActionHelpers.saveDraft();

      // ローカルストレージのデータが暗号化されていることを確認
      const encryptedData = await page.evaluate(() => {
        return localStorage.getItem('draft_subgoal_0');
      });

      // 平文でデータが保存されていないことを確認
      expect(encryptedData).not.toContain('機密プロジェクト');
      expect(encryptedData).not.toContain('社外秘の内容');
    });

    test('下書きデータの自動削除', async ({ page }) => {
      await subGoalActionHelpers.goToSubGoalEdit();
      await subGoalActionHelpers.selectSubGoal(0);

      // 下書きを保存
      await subGoalActionHelpers.fillSubGoalForm(draftData.subGoal.complete);
      await subGoalActionHelpers.saveDraft();

      // 正式保存を実行
      await subGoalActionHelpers.saveSubGoal();

      // 下書きデータが自動削除されることを確認
      const draftExists = await page.evaluate(() => {
        return localStorage.getItem('draft_subgoal_0') !== null;
      });
      expect(draftExists).toBe(false);
    });

    test('ストレージ容量制限の処理', async ({ page }) => {
      // ローカルストレージを満杯にする
      await page.evaluate(() => {
        try {
          let i = 0;
          while (true) {
            localStorage.setItem(`dummy_${i}`, 'x'.repeat(1024 * 1024)); // 1MB
            i++;
          }
        } catch (e) {
          // ストレージが満杯になったら停止
        }
      });

      await subGoalActionHelpers.goToSubGoalEdit();
      await subGoalActionHelpers.selectSubGoal(0);

      // 下書き保存を試行
      await subGoalActionHelpers.fillSubGoalForm(draftData.subGoal.complete);
      await page.click('[data-testid="save-draft-button"]');

      // ストレージ不足エラーが表示されることを確認
      await expect(page.locator('text=ストレージ容量が不足しています')).toBeVisible();

      // 古い下書きの削除提案が表示されることを確認
      await expect(page.locator('[data-testid="cleanup-storage-button"]')).toBeVisible();
    });
  });

  test.describe('エラーハンドリング', () => {
    test('下書き保存APIエラーの処理', async ({ page }) => {
      // APIエラーをモック
      await page.route('**/api/drafts/**', route => {
        route.fulfill({ status: 500, body: 'Internal Server Error' });
      });

      await subGoalActionHelpers.goToSubGoalEdit();
      await subGoalActionHelpers.selectSubGoal(0);

      // 下書き保存を試行
      await subGoalActionHelpers.fillSubGoalForm(draftData.subGoal.complete);
      await subGoalActionHelpers.saveDraft();

      // エラーメッセージが表示されることを確認
      await subGoalActionHelpers.expectErrorMessage('下書きの保存に失敗しました');

      // ローカル保存へのフォールバックが動作することを確認
      await expect(page.locator('text=ローカルに保存しました')).toBeVisible();
    });

    test('下書き復元APIエラーの処理', async ({ page }) => {
      // APIエラーをモック
      await page.route('**/api/drafts/**', route => {
        route.fulfill({ status: 404, body: 'Not Found' });
      });

      await subGoalActionHelpers.goToSubGoalEdit();

      // 下書き復元エラーメッセージが表示されることを確認
      await expect(page.locator('text=下書きの復元に失敗しました')).toBeVisible();

      // ローカル下書きからの復元が試行されることを確認
      await expect(page.locator('text=ローカルの下書きから復元しています')).toBeVisible();
    });

    test('破損した下書きデータの処理', async ({ page }) => {
      // 破損した下書きデータを設定
      await page.addInitScript(() => {
        localStorage.setItem('draft_subgoal_0', 'invalid-json-data');
      });

      await subGoalActionHelpers.goToSubGoalEdit();
      await subGoalActionHelpers.selectSubGoal(0);

      // 破損データエラーメッセージが表示されることを確認
      await expect(page.locator('text=下書きデータが破損しています')).toBeVisible();

      // 破損データが自動削除されることを確認
      const draftExists = await page.evaluate(() => {
        return localStorage.getItem('draft_subgoal_0') !== null;
      });
      expect(draftExists).toBe(false);
    });
  });
});
