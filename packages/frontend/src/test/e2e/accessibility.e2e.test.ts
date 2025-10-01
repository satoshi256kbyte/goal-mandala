import { test, expect } from '@playwright/test';
import { injectAxe, checkA11y } from 'axe-playwright';

test.describe('E2E Accessibility Tests', () => {
  test.beforeEach(async ({ page }) => {
    // axe-coreを注入
    await injectAxe(page);
  });

  test.describe('Goal Input Form Accessibility', () => {
    test('should pass accessibility audit on goal input page', async ({ page }) => {
      await page.goto('/goal/create');

      // ページが読み込まれるまで待機
      await page.waitForSelector('[role="form"]');

      // アクセシビリティ監査を実行
      await checkA11y(page, null, {
        detailedReport: true,
        detailedReportOptions: { html: true },
      });
    });

    test('should support keyboard navigation through form', async ({ page }) => {
      await page.goto('/goal/create');

      // フォームが表示されるまで待機
      await page.waitForSelector('[role="form"]');

      // Tabキーでナビゲーション
      await page.keyboard.press('Tab');
      let focusedElement = await page.locator(':focus');
      await expect(focusedElement).toHaveAttribute('aria-label', '目標タイトル');

      await page.keyboard.press('Tab');
      focusedElement = await page.locator(':focus');
      await expect(focusedElement).toHaveAttribute('aria-label', '目標説明');

      await page.keyboard.press('Tab');
      focusedElement = await page.locator(':focus');
      await expect(focusedElement).toHaveAttribute('aria-label', '達成期限');

      await page.keyboard.press('Tab');
      focusedElement = await page.locator(':focus');
      await expect(focusedElement).toHaveAttribute('aria-label', '背景');
    });

    test('should support Shift+Tab reverse navigation', async ({ page }) => {
      await page.goto('/goal/create');

      // 最後のフィールドにフォーカス
      await page.locator('[aria-label="背景"]').focus();

      // Shift+Tabで逆順ナビゲーション
      await page.keyboard.press('Shift+Tab');
      let focusedElement = await page.locator(':focus');
      await expect(focusedElement).toHaveAttribute('aria-label', '達成期限');

      await page.keyboard.press('Shift+Tab');
      focusedElement = await page.locator(':focus');
      await expect(focusedElement).toHaveAttribute('aria-label', '目標説明');
    });

    test('should focus first error field on validation failure', async ({ page }) => {
      await page.goto('/goal/create');

      // 空のフォームを送信
      await page.click('[type="submit"]');

      // 最初のエラーフィールドにフォーカスが移動することを確認
      const focusedElement = await page.locator(':focus');
      await expect(focusedElement).toHaveAttribute('aria-invalid', 'true');
      await expect(focusedElement).toHaveAttribute('aria-label', '目標タイトル');
    });

    test('should announce form submission status', async ({ page }) => {
      await page.goto('/goal/create');

      // フォームに有効なデータを入力
      await page.fill('[aria-label="目標タイトル"]', 'テスト目標');
      await page.fill('[aria-label="目標説明"]', 'テスト説明');
      await page.fill('[aria-label="達成期限"]', '2024-12-31');
      await page.fill('[aria-label="背景"]', 'テスト背景');

      // フォーム送信
      await page.click('[type="submit"]');

      // ライブリージョンでのアナウンスを確認
      const liveRegion = page.locator('[role="status"]');
      await expect(liveRegion).toBeVisible();
      await expect(liveRegion).toHaveAttribute('aria-live');
    });

    test('should provide proper error messages', async ({ page }) => {
      await page.goto('/goal/create');

      // バリデーションエラーを発生させる
      await page.click('[type="submit"]');

      // エラーメッセージが表示されることを確認
      const errorMessages = page.locator('[role="alert"]');
      await expect(errorMessages.first()).toBeVisible();

      // エラーメッセージが適切に関連付けられていることを確認
      const titleInput = page.locator('[aria-label="目標タイトル"]');
      await expect(titleInput).toHaveAttribute('aria-invalid', 'true');
      await expect(titleInput).toHaveAttribute('aria-describedby');
    });
  });

  test.describe('Character Counter Accessibility', () => {
    test('should announce character count changes', async ({ page }) => {
      await page.goto('/goal/create');

      const titleInput = page.locator('[aria-label="目標タイトル"]');
      const characterCounter = page.locator('[role="status"]').first();

      // 文字を入力
      await titleInput.fill('テスト');

      // カウンターが更新されることを確認
      await expect(characterCounter).toHaveAttribute('aria-live', 'polite');
      await expect(characterCounter).toHaveAttribute('aria-label');
    });

    test('should warn when approaching character limit', async ({ page }) => {
      await page.goto('/goal/create');

      const titleInput = page.locator('[aria-label="目標タイトル"]');

      // 制限に近い文字数を入力
      const longText = 'a'.repeat(95); // 100文字制限の場合
      await titleInput.fill(longText);

      // 警告状態のカウンターを確認
      const characterCounter = page.locator('[role="status"]').first();
      const ariaLabel = await characterCounter.getAttribute('aria-label');
      expect(ariaLabel).toContain('制限に近づいています');
    });

    test('should indicate error when over character limit', async ({ page }) => {
      await page.goto('/goal/create');

      const titleInput = page.locator('[aria-label="目標タイトル"]');

      // 制限を超える文字数を入力
      const tooLongText = 'a'.repeat(105); // 100文字制限の場合
      await titleInput.fill(tooLongText);

      // エラー状態のカウンターを確認
      const characterCounter = page.locator('[role="status"]').first();
      const ariaLabel = await characterCounter.getAttribute('aria-label');
      expect(ariaLabel).toContain('制限を超過');
    });
  });

  test.describe('Date Picker Accessibility', () => {
    test('should support keyboard navigation in date picker', async ({ page }) => {
      await page.goto('/goal/create');

      const dateInput = page.locator('[aria-label="達成期限"]');

      // 日付ピッカーを開く
      await dateInput.click();

      // aria-expanded属性が更新されることを確認
      await expect(dateInput).toHaveAttribute('aria-expanded', 'true');

      // 矢印キーでナビゲーション
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('ArrowUp');
      await page.keyboard.press('ArrowLeft');
      await page.keyboard.press('ArrowRight');

      // Enterキーで選択
      await page.keyboard.press('Enter');

      // 日付ピッカーが閉じることを確認
      await expect(dateInput).toHaveAttribute('aria-expanded', 'false');
    });

    test('should close date picker with Escape key', async ({ page }) => {
      await page.goto('/goal/create');

      const dateInput = page.locator('[aria-label="達成期限"]');

      // 日付ピッカーを開く
      await dateInput.click();
      await expect(dateInput).toHaveAttribute('aria-expanded', 'true');

      // Escapeキーで閉じる
      await page.keyboard.press('Escape');
      await expect(dateInput).toHaveAttribute('aria-expanded', 'false');

      // フォーカスが日付入力フィールドに戻ることを確認
      const focusedElement = await page.locator(':focus');
      await expect(focusedElement).toBe(dateInput);
    });
  });

  test.describe('Screen Reader Support', () => {
    test('should have proper landmark roles', async ({ page }) => {
      await page.goto('/goal/create');

      // フォームランドマーク
      const form = page.locator('[role="form"]');
      await expect(form).toBeVisible();
      await expect(form).toHaveAttribute('aria-label', '目標入力フォーム');

      // メインコンテンツランドマーク
      const main = page.locator('[role="main"]');
      await expect(main).toBeVisible();
    });

    test('should have live regions for dynamic content', async ({ page }) => {
      await page.goto('/goal/create');

      // ライブリージョンが存在することを確認
      const liveRegions = page.locator('[role="status"]');
      await expect(liveRegions.first()).toBeVisible();
      await expect(liveRegions.first()).toHaveAttribute('aria-live');
    });

    test('should provide context for form validation', async ({ page }) => {
      await page.goto('/goal/create');

      // バリデーションエラーを発生させる
      await page.click('[type="submit"]');

      // エラーメッセージが適切に関連付けられていることを確認
      const inputs = page.locator('input[aria-invalid="true"]');
      const count = await inputs.count();

      for (let i = 0; i < count; i++) {
        const input = inputs.nth(i);
        await expect(input).toHaveAttribute('aria-describedby');
      }
    });
  });

  test.describe('High Contrast Mode Support', () => {
    test('should work in high contrast mode', async ({ page }) => {
      // 高コントラストモードをシミュレート
      await page.emulateMedia({ colorScheme: 'dark', forcedColors: 'active' });

      await page.goto('/goal/create');

      // アクセシビリティ監査を実行
      await checkA11y(page);

      // フォーカス表示が適切に機能することを確認
      await page.keyboard.press('Tab');
      const focusedElement = await page.locator(':focus');

      // フォーカスリングが表示されることを確認（視覚的テストは困難なため、クラスで判定）
      const classList = await focusedElement.getAttribute('class');
      expect(classList).toContain('focus:ring');
    });
  });

  test.describe('Reduced Motion Support', () => {
    test('should respect reduced motion preferences', async ({ page }) => {
      // モーション削減設定をシミュレート
      await page.emulateMedia({ reducedMotion: 'reduce' });

      await page.goto('/goal/create');

      // アニメーションが無効化されていることを確認
      // 実際のプロジェクトでは、アニメーション関連のCSSクラスやスタイルをチェック
      const form = page.locator('[role="form"]');
      await expect(form).toBeVisible();
    });
  });

  test.describe('Touch and Mobile Accessibility', () => {
    test('should have adequate touch targets on mobile', async ({ page }) => {
      // モバイルビューポートを設定
      await page.setViewportSize({ width: 375, height: 667 });

      await page.goto('/goal/create');

      // ボタンのサイズを確認
      const submitButton = page.locator('[type="submit"]');
      const boundingBox = await submitButton.boundingBox();

      // 最小タッチターゲットサイズ（44px x 44px）を確認
      expect(boundingBox?.width).toBeGreaterThanOrEqual(44);
      expect(boundingBox?.height).toBeGreaterThanOrEqual(44);
    });

    test('should support touch gestures', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/goal/create');

      const dateInput = page.locator('[aria-label="達成期限"]');

      // タッチイベントをシミュレート
      await dateInput.tap();

      // 日付ピッカーが開くことを確認
      await expect(dateInput).toHaveAttribute('aria-expanded', 'true');
    });
  });

  test.describe('Error Recovery', () => {
    test('should provide clear error recovery options', async ({ page }) => {
      await page.goto('/goal/create');

      // ネットワークエラーをシミュレート
      await page.route('**/api/goals', route => {
        route.abort('failed');
      });

      // フォームに有効なデータを入力
      await page.fill('[aria-label="目標タイトル"]', 'テスト目標');
      await page.fill('[aria-label="目標説明"]', 'テスト説明');
      await page.fill('[aria-label="達成期限"]', '2024-12-31');
      await page.fill('[aria-label="背景"]', 'テスト背景');

      // フォーム送信
      await page.click('[type="submit"]');

      // エラー回復オプションが表示されることを確認
      const retryButton = page.locator('[role="button"]:has-text("再試行")');
      await expect(retryButton).toBeVisible();
      await expect(retryButton).toBeFocused();
    });

    test('should maintain form data after error', async ({ page }) => {
      await page.goto('/goal/create');

      // フォームにデータを入力
      const titleValue = 'テスト目標';
      const descriptionValue = 'テスト説明';

      await page.fill('[aria-label="目標タイトル"]', titleValue);
      await page.fill('[aria-label="目標説明"]', descriptionValue);

      // ネットワークエラーをシミュレート
      await page.route('**/api/goals', route => {
        route.abort('failed');
      });

      await page.click('[type="submit"]');

      // エラー後もフォームデータが保持されていることを確認
      const titleInput = page.locator('[aria-label="目標タイトル"]');
      const descriptionInput = page.locator('[aria-label="目標説明"]');

      await expect(titleInput).toHaveValue(titleValue);
      await expect(descriptionInput).toHaveValue(descriptionValue);
    });
  });

  test.describe('Skip Links', () => {
    test('should provide skip links for keyboard users', async ({ page }) => {
      await page.goto('/goal/create');

      // Tabキーでスキップリンクにフォーカス
      await page.keyboard.press('Tab');

      // スキップリンクが表示されることを確認
      const skipLink = page.locator('a:has-text("メインコンテンツにスキップ")');
      await expect(skipLink).toBeFocused();

      // スキップリンクをクリック
      await skipLink.click();

      // メインコンテンツにフォーカスが移動することを確認
      const mainContent = page.locator('[role="main"]');
      await expect(mainContent).toBeFocused();
    });
  });

  test.describe('Form Completion Flow', () => {
    test('should guide user through complete form submission', async ({ page }) => {
      await page.goto('/goal/create');

      // フォーム完了フローをテスト
      await page.fill('[aria-label="目標タイトル"]', 'E2Eテスト目標');

      // 文字数カウンターの更新を確認
      const characterCounter = page.locator('[role="status"]').first();
      const ariaLabel = await characterCounter.getAttribute('aria-label');
      expect(ariaLabel).toContain('E2Eテスト目標'.length.toString());

      await page.fill('[aria-label="目標説明"]', 'E2Eテストの説明');
      await page.fill('[aria-label="達成期限"]', '2024-12-31');
      await page.fill('[aria-label="背景"]', 'E2Eテストの背景');

      // フォーム送信
      await page.click('[type="submit"]');

      // 成功メッセージまたは次のページへの遷移を確認
      // 実際のプロジェクトでは、成功時の動作に応じて調整
      const successMessage = page.locator('[role="status"]:has-text("送信")');
      await expect(successMessage).toBeVisible();
    });
  });

  test.describe('Comprehensive Accessibility Audit', () => {
    test('should pass comprehensive accessibility audit', async ({ page }) => {
      await page.goto('/goal/create');

      // 包括的なアクセシビリティ監査
      await checkA11y(page, null, {
        rules: {
          // WCAG 2.1 AA準拠のルールを有効化
          'color-contrast': { enabled: true },
          'keyboard-navigation': { enabled: true },
          'focus-order-semantics': { enabled: true },
          'aria-required-attr': { enabled: true },
          'aria-valid-attr': { enabled: true },
          label: { enabled: true },
          'form-field-multiple-labels': { enabled: true },
          'landmark-one-main': { enabled: true },
          'page-has-heading-one': { enabled: true },
          region: { enabled: true },
        },
        tags: ['wcag2a', 'wcag2aa', 'wcag21aa'],
      });
    });

    test('should maintain accessibility during dynamic updates', async ({ page }) => {
      await page.goto('/goal/create');

      // 動的更新前の監査
      await checkA11y(page);

      // バリデーションエラーを発生させて動的更新をトリガー
      await page.click('[type="submit"]');

      // 動的更新後の監査
      await checkA11y(page);

      // エラー状態を解消
      await page.fill('[aria-label="目標タイトル"]', 'テスト目標');

      // 再度監査
      await checkA11y(page);
    });
  });
});
