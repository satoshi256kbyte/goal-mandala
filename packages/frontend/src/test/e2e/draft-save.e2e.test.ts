import { test, expect } from '@playwright/test';

test.describe('下書き保存機能 E2E テスト', () => {
  test.beforeEach(async ({ page }) => {
    // LocalStorageをクリア
    await page.evaluate(() => {
      localStorage.clear();
    });

    // 目標入力ページに移動
    await page.goto('/mandala/create/goal');
  });

  test('フォーム入力と下書き保存', async ({ page }) => {
    // フォームに入力
    await page.fill('[data-testid="goal-title-input"]', 'E2Eテスト目標');
    await page.fill('[data-testid="goal-description-textarea"]', 'E2Eテストの説明');
    await page.fill('[data-testid="goal-deadline-input"]', '2024-12-31');
    await page.fill('[data-testid="goal-background-textarea"]', 'E2Eテストの背景');
    await page.fill('[data-testid="goal-constraints-textarea"]', 'E2Eテストの制約');

    // 下書き保存ボタンをクリック
    await page.click('[data-testid="draft-save-button"]');

    // 保存成功メッセージを確認
    await expect(page.locator('text=に保存しました')).toBeVisible();

    // LocalStorageに保存されていることを確認
    const draftData = await page.evaluate(() => {
      return localStorage.getItem('goal-form-draft');
    });

    expect(draftData).toBeTruthy();

    const parsedData = JSON.parse(draftData!);
    expect(parsedData.formData.title).toBe('E2Eテスト目標');
    expect(parsedData.formData.description).toBe('E2Eテストの説明');
  });

  test('自動保存機能', async ({ page }) => {
    // フォームに入力
    await page.fill('[data-testid="goal-title-input"]', '自動保存テスト');
    await page.fill('[data-testid="goal-description-textarea"]', '自動保存の説明');

    // 30秒待機（自動保存の間隔）
    await page.waitForTimeout(31000);

    // LocalStorageに自動保存されていることを確認
    const draftData = await page.evaluate(() => {
      return localStorage.getItem('goal-form-draft');
    });

    expect(draftData).toBeTruthy();

    const parsedData = JSON.parse(draftData!);
    expect(parsedData.formData.title).toBe('自動保存テスト');
  });

  test('下書き復元機能', async ({ page }) => {
    // 事前に下書きデータを設定
    await page.evaluate(() => {
      const draftData = {
        formData: {
          title: '復元テスト目標',
          description: '復元テストの説明',
          deadline: '2024-12-31',
          background: '復元テストの背景',
          constraints: '復元テストの制約',
        },
        savedAt: new Date().toISOString(),
        version: 1,
      };
      localStorage.setItem('goal-form-draft', JSON.stringify(draftData));
    });

    // ページをリロード
    await page.reload();

    // 下書き復元通知が表示されることを確認
    await expect(page.locator('text=下書きが見つかりました')).toBeVisible();
    await expect(page.locator('text=復元テスト目標')).toBeVisible();

    // 復元ボタンをクリック
    await page.click('button:has-text("復元する")');

    // フォームに復元されたデータが表示されることを確認
    await expect(page.locator('[data-testid="goal-title-input"]')).toHaveValue('復元テスト目標');
    await expect(page.locator('[data-testid="goal-description-textarea"]')).toHaveValue(
      '復元テストの説明'
    );
    await expect(page.locator('[data-testid="goal-deadline-input"]')).toHaveValue('2024-12-31');
    await expect(page.locator('[data-testid="goal-background-textarea"]')).toHaveValue(
      '復元テストの背景'
    );
    await expect(page.locator('[data-testid="goal-constraints-textarea"]')).toHaveValue(
      '復元テストの制約'
    );

    // 復元通知が消えることを確認
    await expect(page.locator('text=下書きが見つかりました')).not.toBeVisible();
  });

  test('下書き復元の拒否', async ({ page }) => {
    // 事前に下書きデータを設定
    await page.evaluate(() => {
      const draftData = {
        formData: {
          title: '拒否テスト目標',
          description: '拒否テストの説明',
        },
        savedAt: new Date().toISOString(),
        version: 1,
      };
      localStorage.setItem('goal-form-draft', JSON.stringify(draftData));
    });

    // ページをリロード
    await page.reload();

    // 下書き復元通知が表示されることを確認
    await expect(page.locator('text=下書きが見つかりました')).toBeVisible();

    // 新規作成ボタンをクリック
    await page.click('button:has-text("新規作成")');

    // 復元通知が消えることを確認
    await expect(page.locator('text=下書きが見つかりました')).not.toBeVisible();

    // フォームが空のままであることを確認
    await expect(page.locator('[data-testid="goal-title-input"]')).toHaveValue('');
    await expect(page.locator('[data-testid="goal-description-textarea"]')).toHaveValue('');
  });

  test('下書きの削除', async ({ page }) => {
    // 事前に下書きデータを設定
    await page.evaluate(() => {
      const draftData = {
        formData: {
          title: '削除テスト目標',
          description: '削除テストの説明',
        },
        savedAt: new Date().toISOString(),
        version: 1,
      };
      localStorage.setItem('goal-form-draft', JSON.stringify(draftData));
    });

    // ページをリロード
    await page.reload();

    // 下書き復元通知が表示されることを確認
    await expect(page.locator('text=下書きが見つかりました')).toBeVisible();

    // 削除ボタンをクリック
    await page.click('button:has-text("削除")');

    // 復元通知が消えることを確認
    await expect(page.locator('text=下書きが見つかりました')).not.toBeVisible();

    // LocalStorageから削除されていることを確認
    const draftData = await page.evaluate(() => {
      return localStorage.getItem('goal-form-draft');
    });

    expect(draftData).toBeNull();
  });

  test('ページ離脱時の自動保存', async ({ page }) => {
    // フォームに入力
    await page.fill('[data-testid="goal-title-input"]', 'ページ離脱テスト');
    await page.fill('[data-testid="goal-description-textarea"]', 'ページ離脱時の保存テスト');

    // 別のページに移動
    await page.goto('/');

    // 元のページに戻る
    await page.goto('/mandala/create/goal');

    // LocalStorageに保存されていることを確認
    const draftData = await page.evaluate(() => {
      return localStorage.getItem('goal-form-draft');
    });

    expect(draftData).toBeTruthy();

    const parsedData = JSON.parse(draftData!);
    expect(parsedData.formData.title).toBe('ページ離脱テスト');
  });

  test('空のフォームは保存されない', async ({ page }) => {
    // 空のフォームで下書き保存ボタンをクリック
    await page.click('[data-testid="draft-save-button"]');

    // エラーメッセージが表示されることを確認
    await expect(page.locator('text=保存するデータがありません')).toBeVisible();

    // LocalStorageに保存されていないことを確認
    const draftData = await page.evaluate(() => {
      return localStorage.getItem('goal-form-draft');
    });

    expect(draftData).toBeNull();
  });

  test('保存エラーの処理', async ({ page }) => {
    // LocalStorageを無効にしてエラーを発生させる
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', {
        value: {
          setItem: () => {
            throw new Error('Storage error');
          },
          getItem: () => null,
          removeItem: () => {},
          clear: () => {},
        },
        writable: false,
      });
    });

    // ページをリロード
    await page.reload();

    // フォームに入力
    await page.fill('[data-testid="goal-title-input"]', 'エラーテスト');

    // 下書き保存ボタンをクリック
    await page.click('[data-testid="draft-save-button"]');

    // エラーメッセージが表示されることを確認
    await expect(page.locator('text=下書きの保存に失敗しました')).toBeVisible();
  });

  test('文字数制限での保存', async ({ page }) => {
    // 制限ギリギリの文字数で入力
    const longTitle = 'あ'.repeat(100); // 100文字（制限内）
    const tooLongTitle = 'あ'.repeat(101); // 101文字（制限超過）

    // 制限内の場合
    await page.fill('[data-testid="goal-title-input"]', longTitle);
    await page.click('[data-testid="draft-save-button"]');
    await expect(page.locator('text=に保存しました')).toBeVisible();

    // フォームをクリア
    await page.fill('[data-testid="goal-title-input"]', '');

    // 制限超過の場合
    await page.fill('[data-testid="goal-title-input"]', tooLongTitle);

    // バリデーションエラーが表示されることを確認
    await expect(page.locator('text=100文字以内で入力してください')).toBeVisible();

    // 下書き保存ボタンが無効になることを確認
    const saveButton = page.locator('[data-testid="draft-save-button"]');
    await expect(saveButton).toBeDisabled();
  });

  test('複数タブでの下書き保存', async ({ browser }) => {
    const context = await browser.newContext();
    const page1 = await context.newPage();
    const page2 = await context.newPage();

    // 1つ目のタブで下書き保存
    await page1.goto('/mandala/create/goal');
    await page1.fill('[data-testid="goal-title-input"]', 'タブ1の目標');
    await page1.click('[data-testid="draft-save-button"]');
    await expect(page1.locator('text=に保存しました')).toBeVisible();

    // 2つ目のタブで下書きが復元されることを確認
    await page2.goto('/mandala/create/goal');
    await expect(page2.locator('text=下書きが見つかりました')).toBeVisible();
    await expect(page2.locator('text=タブ1の目標')).toBeVisible();

    await context.close();
  });
});
