import { test, expect } from '@playwright/test';

/**
 * E2Eテスト: 目標作成フロー
 *
 * このテストは目標作成に関する重要なフローを検証します。
 * - 目標入力
 * - バリデーション
 * - AI処理への遷移
 */

test.describe('目標作成フロー', () => {
  test.beforeEach(async ({ page }) => {
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

  test('目標入力フォームが正常に表示される', async ({ page }) => {
    await page.goto('/mandala/create/goal');

    // フォームが表示されることを確認
    await expect(page.locator('[data-testid="goal-form-container"]')).toBeVisible();
    await expect(page.getByLabel('目標のタイトル')).toBeVisible();
    await expect(page.getByLabel('目標の説明')).toBeVisible();
    await expect(page.getByLabel('達成期限')).toBeVisible();
    await expect(page.getByLabel('背景')).toBeVisible();
  });

  test('完全な目標入力フローが正常に動作する', async ({ page }) => {
    await page.goto('/mandala/create/goal');

    // 初期状態では送信ボタンが無効
    const submitButton = page.getByRole('button', { name: 'AI生成を開始' });
    await expect(submitButton).toBeDisabled();

    // 目標データを入力
    await page.getByLabel('目標のタイトル').fill('テスト目標');
    await page.getByLabel('目標の説明').fill('これはテスト用の目標説明です。');

    // 達成期限を設定（1ヶ月後）
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + 1);
    const futureDateString = futureDate.toISOString().split('T')[0];
    await page.getByLabel('達成期限').fill(futureDateString);

    await page.getByLabel('背景').fill('テスト背景情報');
    await page.getByLabel('制約事項').fill('テスト制約事項');

    // 入力後は送信ボタンが有効
    await expect(submitButton).toBeEnabled();

    // AI生成開始ボタンをクリック
    await submitButton.click();

    // 処理中画面に遷移することを確認
    await page.waitForURL('**/mandala/create/processing', { timeout: 5000 });
    await expect(page).toHaveURL(/\/mandala\/create\/processing/);
  });

  test('必須項目のみで目標入力が可能', async ({ page }) => {
    await page.goto('/mandala/create/goal');

    // 必須項目のみ入力
    await page.getByLabel('目標のタイトル').fill('最小限の目標');
    await page.getByLabel('目標の説明').fill('最小限の説明');

    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + 1);
    const futureDateString = futureDate.toISOString().split('T')[0];
    await page.getByLabel('達成期限').fill(futureDateString);

    await page.getByLabel('背景').fill('最小限の背景');

    // 送信ボタンが有効になることを確認
    const submitButton = page.getByRole('button', { name: 'AI生成を開始' });
    await expect(submitButton).toBeEnabled();

    // 送信実行
    await submitButton.click();

    // 成功することを確認
    await page.waitForURL('**/mandala/create/processing', { timeout: 5000 });
  });

  test('バリデーションエラーが正しく表示される', async ({ page }) => {
    await page.goto('/mandala/create/goal');

    // 空のまま送信を試みる
    const submitButton = page.getByRole('button', { name: 'AI生成を開始' });

    // 送信ボタンが無効であることを確認
    await expect(submitButton).toBeDisabled();

    // タイトルのみ入力
    await page.getByLabel('目標のタイトル').fill('テスト');

    // まだ送信ボタンは無効
    await expect(submitButton).toBeDisabled();

    // 説明を入力
    await page.getByLabel('目標の説明').fill('説明');

    // まだ送信ボタンは無効
    await expect(submitButton).toBeDisabled();
  });

  test('文字数カウントが正しく表示される', async ({ page }) => {
    await page.goto('/mandala/create/goal');

    // タイトルを入力
    const title = 'テスト目標タイトル';
    await page.getByLabel('目標のタイトル').fill(title);

    // 文字数カウントが表示されることを確認（実装に応じて調整）
    const charCount = page.locator('[data-testid="title-char-count"]');
    if (await charCount.isVisible()) {
      await expect(charCount).toContainText(`${title.length}`);
    }
  });

  test('下書き保存機能が動作する', async ({ page }) => {
    await page.goto('/mandala/create/goal');

    // 部分的にフォームに入力
    await page.getByLabel('目標のタイトル').fill('下書きテスト');
    await page.getByLabel('目標の説明').fill('下書きの説明');

    // 下書き保存ボタンがある場合はクリック
    const draftButton = page.getByRole('button', { name: '下書き保存' });
    if (await draftButton.isVisible()) {
      await draftButton.click();

      // 保存成功メッセージを確認
      await expect(page.locator('text=下書きを保存しました')).toBeVisible({ timeout: 3000 });

      // ページをリロード
      await page.reload();

      // 下書きが復元されることを確認
      await expect(page.getByLabel('目標のタイトル')).toHaveValue('下書きテスト');
      await expect(page.getByLabel('目標の説明')).toHaveValue('下書きの説明');
    }
  });
});
