import { test, expect } from '@playwright/test';

test.describe('ユーザビリティテスト - サブ目標・アクション入力フォーム', () => {
  test.beforeEach(async ({ page }) => {
    // テスト用のページに移動
    await page.goto('/subgoals/edit/test-goal-id');
  });

  test('サブ目標編集の基本フロー', async ({ page }) => {
    // サブ目標一覧が表示されることを確認
    await expect(page.locator('[data-testid="subgoal-list"]')).toBeVisible();

    // サブ目標を選択
    await page.click('[data-testid="subgoal-item-0"]');

    // 編集フォームが表示されることを確認
    await expect(page.locator('[data-testid="subgoal-form"]')).toBeVisible();

    // タイトルフィールドに入力
    const titleField = page.locator('[data-testid="subgoal-title"]');
    await titleField.fill('テスト用サブ目標');

    // リアルタイムバリデーションが動作することを確認
    await expect(titleField).toHaveValue('テスト用サブ目標');

    // 保存ボタンをクリック
    await page.click('[data-testid="save-button"]');

    // 成功メッセージが表示されることを確認
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
  });

  test('アクション編集の基本フロー', async ({ page }) => {
    // アクション編集ページに移動
    await page.goto('/actions/edit/test-goal-id');

    // アクション一覧が表示されることを確認
    await expect(page.locator('[data-testid="action-list"]')).toBeVisible();

    // サブ目標タブを選択
    await page.click('[data-testid="subgoal-tab-0"]');

    // アクションを選択
    await page.click('[data-testid="action-item-0"]');

    // 編集フォームが表示されることを確認
    await expect(page.locator('[data-testid="action-form"]')).toBeVisible();

    // アクション種別を変更
    await page.selectOption('[data-testid="action-type"]', 'habit');

    // 保存ボタンをクリック
    await page.click('[data-testid="save-button"]');

    // 成功メッセージが表示されることを確認
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
  });

  test('ドラッグ&ドロップ操作', async ({ page }) => {
    // ドラッグ可能な要素を確認
    const draggableItem = page.locator('[data-testid="draggable-subgoal-0"]');
    await expect(draggableItem).toHaveAttribute('draggable', 'true');

    // ドラッグ&ドロップを実行
    const sourceItem = page.locator('[data-testid="draggable-subgoal-0"]');
    const targetItem = page.locator('[data-testid="draggable-subgoal-1"]');

    await sourceItem.dragTo(targetItem);

    // 順序が変更されたことを確認
    await expect(page.locator('[data-testid="subgoal-list"] > div:first-child')).toContainText(
      'サブ目標2'
    );
  });

  test('一括編集操作', async ({ page }) => {
    // 複数項目を選択
    await page.check('[data-testid="select-subgoal-0"]');
    await page.check('[data-testid="select-subgoal-1"]');

    // 一括編集ボタンをクリック
    await page.click('[data-testid="bulk-edit-button"]');

    // 一括編集モーダルが表示されることを確認
    await expect(page.locator('[data-testid="bulk-edit-modal"]')).toBeVisible();

    // 共通フィールドを編集
    await page.fill('[data-testid="bulk-background"]', '共通の背景情報');

    // 保存ボタンをクリック
    await page.click('[data-testid="bulk-save-button"]');

    // 成功メッセージが表示されることを確認
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
  });

  test('エラーハンドリングの分かりやすさ', async ({ page }) => {
    // 必須フィールドを空にしてエラーを発生させる
    await page.click('[data-testid="subgoal-item-0"]');
    await page.fill('[data-testid="subgoal-title"]', '');
    await page.click('[data-testid="save-button"]');

    // エラーメッセージが表示されることを確認
    const errorMessage = page.locator('[data-testid="error-message"]');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toContainText('タイトルは必須です');

    // エラーメッセージが分かりやすいことを確認
    await expect(errorMessage).toHaveClass(/error/);

    // フィールドがエラー状態になることを確認
    await expect(page.locator('[data-testid="subgoal-title"]')).toHaveAttribute(
      'aria-invalid',
      'true'
    );
  });

  test('レスポンス時間の確認', async ({ page }) => {
    const startTime = Date.now();

    // フォーム表示
    await page.goto('/subgoals/edit/test-goal-id');
    await expect(page.locator('[data-testid="subgoal-list"]')).toBeVisible();

    const loadTime = Date.now() - startTime;

    // 3秒以内に表示されることを確認
    expect(loadTime).toBeLessThan(3000);

    // バリデーション応答速度をテスト
    const validationStartTime = Date.now();
    await page.fill('[data-testid="subgoal-title"]', 'テスト');

    // バリデーション結果が500ms以内に表示されることを確認
    await expect(page.locator('[data-testid="character-count"]')).toBeVisible({ timeout: 500 });

    const validationTime = Date.now() - validationStartTime;
    expect(validationTime).toBeLessThan(500);
  });

  test('キーボード操作の確認', async ({ page }) => {
    // Tabキーでフォーカス移動
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="subgoal-item-0"]')).toBeFocused();

    // Enterキーで選択
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-testid="subgoal-form"]')).toBeVisible();

    // Tabキーでフィールド間移動
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="subgoal-title"]')).toBeFocused();

    // Escapeキーでモーダルを閉じる
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-testid="subgoal-form"]')).not.toBeVisible();
  });

  test('モバイル操作の確認', async ({ page }) => {
    // モバイルビューポートに設定
    await page.setViewportSize({ width: 375, height: 667 });

    // タッチ操作でサブ目標を選択
    await page.tap('[data-testid="subgoal-item-0"]');

    // モバイル用レイアウトが表示されることを確認
    await expect(page.locator('[data-testid="mobile-layout"]')).toBeVisible();

    // スワイプジェスチャーをシミュレート
    await page.touchscreen.tap(100, 300);
    await page.mouse.move(100, 300);
    await page.mouse.down();
    await page.mouse.move(200, 300);
    await page.mouse.up();

    // スワイプ操作が認識されることを確認
    await expect(page.locator('[data-testid="swipe-indicator"]')).toBeVisible();
  });
});
