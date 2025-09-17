import { test, expect } from '@playwright/test';

test.describe('マンダラチャート表示', () => {
  test.beforeEach(async ({ page }) => {
    // モックデータでページを設定
    await page.goto('/');
  });

  test('マンダラチャートが正常に表示される', async ({ page }) => {
    // マンダラチャートコンポーネントが表示されることを確認
    await expect(page.locator('.mandala-grid')).toBeVisible();

    // 81個のセルが表示されることを確認
    const cells = page.locator('.mandala-cell');
    await expect(cells).toHaveCount(81);
  });

  test('セルクリック操作が動作する', async ({ page }) => {
    // 目標セルをクリック
    const goalCell = page.locator('.mandala-cell').nth(40); // 中央セル
    await goalCell.click();

    // クリックイベントが発生することを確認
    await expect(goalCell).toBeFocused();
  });

  test('キーボードナビゲーションが動作する', async ({ page }) => {
    // 最初のセルにフォーカス
    const firstCell = page.locator('.mandala-cell').first();
    await firstCell.focus();

    // 矢印キーでナビゲーション
    await page.keyboard.press('ArrowRight');

    // フォーカスが移動することを確認
    const secondCell = page.locator('.mandala-cell').nth(1);
    await expect(secondCell).toBeFocused();
  });

  test('レスポンシブ表示が動作する', async ({ page }) => {
    // デスクトップサイズ
    await page.setViewportSize({ width: 1200, height: 800 });
    await expect(page.locator('.mandala-grid')).toBeVisible();

    // タブレットサイズ
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('.mandala-grid')).toBeVisible();

    // モバイルサイズ
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('.mandala-grid')).toBeVisible();
  });
});
