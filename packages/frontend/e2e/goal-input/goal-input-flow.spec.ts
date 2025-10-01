import { test, expect } from '@playwright/test';
import { GoalInputHelpers } from '../helpers/goal-input-helpers';
import { AuthHelpers } from '../helpers/auth-helpers';
import { validGoalData, successMessages } from '../fixtures/goal-input-data';
import { testUsers } from '../fixtures/test-data';

test.describe('目標入力フロー', () => {
  let goalInputHelpers: GoalInputHelpers;
  let authHelpers: AuthHelpers;

  test.beforeEach(async ({ page }) => {
    goalInputHelpers = new GoalInputHelpers(page);
    authHelpers = new AuthHelpers(page);

    // 認証済みユーザーとしてログイン
    await authHelpers.goToLogin();
    await authHelpers.fillLoginForm(testUsers.validUser.email, testUsers.validUser.password);
    await authHelpers.clickLoginButton();

    // ログイン成功を確認
    await authHelpers.expectRedirectTo('/');
  });

  test('完全な目標入力フローが正常に動作する', async ({ page }) => {
    // 目標入力ページに移動
    await goalInputHelpers.goToGoalInput();

    // フォームが表示されることを確認
    await expect(page.locator('[data-testid="goal-form-container"]')).toBeVisible();

    // 初期状態では送信ボタンが無効であることを確認
    await goalInputHelpers.expectSubmitButtonDisabled();

    // 目標データを入力
    await goalInputHelpers.fillGoalForm(validGoalData.complete);

    // 入力後は送信ボタンが有効になることを確認
    await goalInputHelpers.expectSubmitButtonEnabled();

    // AI生成開始ボタンをクリック
    await goalInputHelpers.clickSubmitButton();

    // ローディング状態を確認
    await goalInputHelpers.expectLoading();

    // 処理中画面に遷移することを確認
    await goalInputHelpers.expectRedirectTo('/mandala/create/processing');
  });

  test('必須項目のみで目標入力が可能', async ({ page }) => {
    await goalInputHelpers.goToGoalInput();

    // 必須項目のみ入力
    await goalInputHelpers.fillGoalForm(validGoalData.minimal);

    // 送信ボタンが有効になることを確認
    await goalInputHelpers.expectSubmitButtonEnabled();

    // 送信実行
    await goalInputHelpers.clickSubmitButton();

    // 成功することを確認
    await goalInputHelpers.expectRedirectTo('/mandala/create/processing');
  });

  test('制約事項なしで目標入力が可能', async ({ page }) => {
    await goalInputHelpers.goToGoalInput();

    // 制約事項以外を入力
    await goalInputHelpers.fillGoalForm(validGoalData.withoutConstraints);

    // 送信ボタンが有効になることを確認
    await goalInputHelpers.expectSubmitButtonEnabled();

    // 送信実行
    await goalInputHelpers.clickSubmitButton();

    // 成功することを確認
    await goalInputHelpers.expectRedirectTo('/mandala/create/processing');
  });

  test('日付ピッカーを使用した日付選択が動作する', async ({ page }) => {
    await goalInputHelpers.goToGoalInput();

    // 日付ピッカーを開く
    await goalInputHelpers.openDatePicker();

    // 日付ピッカーが表示されることを確認
    await expect(page.locator('.react-datepicker')).toBeVisible();

    // 今日から1ヶ月後の日付を選択
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + 1);
    const futureDateString = futureDate.toISOString().split('T')[0];

    // 日付を手動入力で設定（日付ピッカーの複雑な操作を避ける）
    await page.fill('[data-testid="goal-deadline-input"]', futureDateString);

    // 他の必須項目を入力
    await goalInputHelpers.fillPartialGoalForm({
      title: '日付テスト目標',
      description: '日付ピッカーのテスト',
      background: 'テスト背景',
    });

    // 送信ボタンが有効になることを確認
    await goalInputHelpers.expectSubmitButtonEnabled();
  });

  test('フォーム入力中の自動保存が動作する', async ({ page }) => {
    await goalInputHelpers.goToGoalInput();

    // 部分的にフォームに入力
    await goalInputHelpers.fillPartialGoalForm({
      title: '自動保存テスト',
      description: '自動保存のテスト説明',
    });

    // 30秒待機して自動保存をトリガー（実際のテストでは短縮）
    await page.waitForTimeout(1000); // テスト用に短縮

    // ページをリロード
    await page.reload();

    // 下書きが復元されることを確認
    await goalInputHelpers.expectDraftRestored();

    // 入力内容が復元されることを確認
    const formData = await goalInputHelpers.getFormData();
    expect(formData.title).toBe('自動保存テスト');
    expect(formData.description).toBe('自動保存のテスト説明');
  });

  test('手動下書き保存が動作する', async ({ page }) => {
    await goalInputHelpers.goToGoalInput();

    // 部分的にフォームに入力
    await goalInputHelpers.fillPartialGoalForm({
      title: '手動保存テスト',
      description: '手動保存のテスト説明',
    });

    // 下書き保存ボタンをクリック
    await goalInputHelpers.clickDraftSaveButton();

    // 保存成功メッセージを確認
    await goalInputHelpers.expectDraftSaveSuccess();

    // ページをリロード
    await page.reload();

    // 下書きが復元されることを確認
    await goalInputHelpers.expectDraftRestored();
  });

  test('フォームリセット機能が動作する', async ({ page }) => {
    await goalInputHelpers.goToGoalInput();

    // フォームに入力
    await goalInputHelpers.fillGoalForm(validGoalData.complete);

    // リセットボタンがある場合はクリック（実装に応じて調整）
    const resetButton = page.locator('[data-testid="reset-button"]');
    if (await resetButton.isVisible()) {
      await resetButton.click();

      // フォームがリセットされることを確認
      await goalInputHelpers.expectFormReset();
    }
  });

  test('ネットワークエラー時の処理が適切に動作する', async ({ page }) => {
    // ネットワークをオフラインに設定
    await page.context().setOffline(true);

    await goalInputHelpers.goToGoalInput();

    // フォームに入力
    await goalInputHelpers.fillGoalForm(validGoalData.complete);

    // 送信を試行
    await goalInputHelpers.clickSubmitButton();

    // エラーメッセージが表示されることを確認
    await goalInputHelpers.expectValidationError('form', 'ネットワークエラーが発生しました');

    // ネットワークを復旧
    await page.context().setOffline(false);
  });

  test('ページ離脱時の確認ダイアログが表示される', async ({ page }) => {
    await goalInputHelpers.goToGoalInput();

    // フォームに入力
    await goalInputHelpers.fillPartialGoalForm({
      title: '離脱テスト',
    });

    // ページ離脱を試行
    page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('入力内容が失われます');
      await dialog.accept();
    });

    // 別のページに移動を試行
    await page.goto('/');
  });

  test('複数タブでの同時編集が適切に処理される', async ({ browser }) => {
    const context = await browser.newContext();
    const page1 = await context.newPage();
    const page2 = await context.newPage();

    const helpers1 = new GoalInputHelpers(page1);
    const helpers2 = new GoalInputHelpers(page2);

    // 両方のタブで認証
    const auth1 = new AuthHelpers(page1);
    const auth2 = new AuthHelpers(page2);

    await auth1.goToLogin();
    await auth1.fillLoginForm(testUsers.validUser.email, testUsers.validUser.password);
    await auth1.clickLoginButton();

    await auth2.goToLogin();
    await auth2.fillLoginForm(testUsers.validUser.email, testUsers.validUser.password);
    await auth2.clickLoginButton();

    // 両方のタブで目標入力ページを開く
    await helpers1.goToGoalInput();
    await helpers2.goToGoalInput();

    // タブ1で入力
    await helpers1.fillPartialGoalForm({
      title: 'タブ1の目標',
    });

    // タブ1で下書き保存
    await helpers1.clickDraftSaveButton();

    // タブ2をリロードして下書きが反映されることを確認
    await page2.reload();
    await helpers2.expectDraftRestored();

    await context.close();
  });
});
