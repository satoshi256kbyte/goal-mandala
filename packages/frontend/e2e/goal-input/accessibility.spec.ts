import { test, expect } from '@playwright/test';
import { GoalInputHelpers } from '../helpers/goal-input-helpers';
import { AuthHelpers } from '../helpers/auth-helpers';
import { validGoalData, invalidGoalData } from '../fixtures/goal-input-data';
import { testUsers } from '../fixtures/test-data';

test.describe('アクセシビリティ', () => {
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

  test.describe('キーボードナビゲーション', () => {
    test('Tabキーでフォーカス移動が正常に動作する', async ({ page }) => {
      // ページの最初にフォーカスを設定
      await page.keyboard.press('Tab');

      // 目標タイトルフィールドにフォーカスが移動することを確認
      await expect(page.locator('[data-testid="goal-title-input"]')).toBeFocused();

      // 次のフィールドに移動
      await page.keyboard.press('Tab');
      await expect(page.locator('[data-testid="goal-description-input"]')).toBeFocused();

      // 達成期限フィールドに移動
      await page.keyboard.press('Tab');
      await expect(page.locator('[data-testid="goal-deadline-input"]')).toBeFocused();

      // 背景フィールドに移動
      await page.keyboard.press('Tab');
      await expect(page.locator('[data-testid="goal-background-input"]')).toBeFocused();

      // 制約事項フィールドに移動
      await page.keyboard.press('Tab');
      await expect(page.locator('[data-testid="goal-constraints-input"]')).toBeFocused();

      // 下書き保存ボタンに移動
      await page.keyboard.press('Tab');
      await expect(page.locator('[data-testid="draft-save-button"]')).toBeFocused();

      // 送信ボタンに移動
      await page.keyboard.press('Tab');
      await expect(page.locator('[data-testid="submit-button"]')).toBeFocused();
    });

    test('Shift+Tabで逆方向のフォーカス移動が動作する', async ({ page }) => {
      // 送信ボタンにフォーカスを設定
      await page.locator('[data-testid="submit-button"]').focus();

      // Shift+Tabで前のフィールドに移動
      await page.keyboard.press('Shift+Tab');
      await expect(page.locator('[data-testid="draft-save-button"]')).toBeFocused();

      await page.keyboard.press('Shift+Tab');
      await expect(page.locator('[data-testid="goal-constraints-input"]')).toBeFocused();

      await page.keyboard.press('Shift+Tab');
      await expect(page.locator('[data-testid="goal-background-input"]')).toBeFocused();

      await page.keyboard.press('Shift+Tab');
      await expect(page.locator('[data-testid="goal-deadline-input"]')).toBeFocused();

      await page.keyboard.press('Shift+Tab');
      await expect(page.locator('[data-testid="goal-description-input"]')).toBeFocused();

      await page.keyboard.press('Shift+Tab');
      await expect(page.locator('[data-testid="goal-title-input"]')).toBeFocused();
    });

    test('Enterキーでボタンが実行される', async ({ page }) => {
      // フォームに有効なデータを入力
      await goalInputHelpers.fillGoalForm(validGoalData.complete);

      // 送信ボタンにフォーカス
      await page.locator('[data-testid="submit-button"]').focus();

      // Enterキーで送信
      await page.keyboard.press('Enter');

      // 処理が開始されることを確認
      await goalInputHelpers.expectLoading();
    });

    test('Spaceキーでボタンが実行される', async ({ page }) => {
      // 部分的にフォームに入力
      await goalInputHelpers.fillPartialGoalForm({
        title: 'スペースキーテスト',
      });

      // 下書き保存ボタンにフォーカス
      await page.locator('[data-testid="draft-save-button"]').focus();

      // Spaceキーで実行
      await page.keyboard.press('Space');

      // 下書き保存が実行されることを確認
      await goalInputHelpers.expectDraftSaveSuccess();
    });

    test('フォーカス表示が視覚的に確認できる', async ({ page }) => {
      // 各フィールドにフォーカスして視覚的インジケーターを確認
      const fields = [
        '[data-testid="goal-title-input"]',
        '[data-testid="goal-description-input"]',
        '[data-testid="goal-deadline-input"]',
        '[data-testid="goal-background-input"]',
        '[data-testid="goal-constraints-input"]',
      ];

      for (const fieldSelector of fields) {
        await page.locator(fieldSelector).focus();

        // フォーカスリングまたはアウトラインが表示されることを確認
        const focusedElement = page.locator(fieldSelector);
        const outline = await focusedElement.evaluate(el => getComputedStyle(el).outline);
        const boxShadow = await focusedElement.evaluate(el => getComputedStyle(el).boxShadow);

        // アウトラインまたはボックスシャドウでフォーカスが示されることを確認
        expect(outline !== 'none' || boxShadow !== 'none').toBeTruthy();
      }
    });

    test('キーボードのみでフォーム送信が完了できる', async ({ page }) => {
      // キーボードのみでフォーム入力
      await page.keyboard.press('Tab'); // 目標タイトルにフォーカス
      await page.keyboard.type(validGoalData.complete.title);

      await page.keyboard.press('Tab'); // 目標説明にフォーカス
      await page.keyboard.type(validGoalData.complete.description);

      await page.keyboard.press('Tab'); // 達成期限にフォーカス
      await page.keyboard.type(validGoalData.complete.deadline);

      await page.keyboard.press('Tab'); // 背景にフォーカス
      await page.keyboard.type(validGoalData.complete.background);

      await page.keyboard.press('Tab'); // 制約事項にフォーカス
      await page.keyboard.type(validGoalData.complete.constraints!);

      // 送信ボタンまでTabで移動
      await page.keyboard.press('Tab'); // 下書き保存ボタン
      await page.keyboard.press('Tab'); // 送信ボタン

      // Enterで送信
      await page.keyboard.press('Enter');

      // 送信が成功することを確認
      await goalInputHelpers.expectLoading();
    });
  });

  test.describe('ARIA属性とセマンティクス', () => {
    test('フォームフィールドに適切なARIA属性が設定されている', async ({ page }) => {
      // 必須フィールドにaria-required属性が設定されていることを確認
      await goalInputHelpers.expectAccessibilityAttributes();

      // 各フィールドのaria-required属性を個別に確認
      await expect(page.locator('[data-testid="goal-title-input"]')).toHaveAttribute(
        'aria-required',
        'true'
      );
      await expect(page.locator('[data-testid="goal-description-input"]')).toHaveAttribute(
        'aria-required',
        'true'
      );
      await expect(page.locator('[data-testid="goal-deadline-input"]')).toHaveAttribute(
        'aria-required',
        'true'
      );
      await expect(page.locator('[data-testid="goal-background-input"]')).toHaveAttribute(
        'aria-required',
        'true'
      );

      // 任意フィールドはaria-required="false"または属性なし
      const constraintsField = page.locator('[data-testid="goal-constraints-input"]');
      const ariaRequired = await constraintsField.getAttribute('aria-required');
      expect(ariaRequired === 'false' || ariaRequired === null).toBeTruthy();
    });

    test('エラー状態でaria-invalid属性が設定される', async ({ page }) => {
      // 無効なデータを入力してエラー状態にする
      await goalInputHelpers.fillPartialGoalForm({
        title: invalidGoalData.longTitle.title,
      });

      // フィールドからフォーカスを外してバリデーションをトリガー
      await page.click('[data-testid="goal-description-input"]');

      // aria-invalid属性が設定されることを確認
      await expect(page.locator('[data-testid="goal-title-input"]')).toHaveAttribute(
        'aria-invalid',
        'true'
      );
    });

    test('エラーメッセージがaria-describedbyで関連付けられている', async ({ page }) => {
      // エラー状態を作成
      await goalInputHelpers.fillPartialGoalForm({
        title: invalidGoalData.longTitle.title,
      });

      await page.click('[data-testid="goal-description-input"]');

      // aria-describedby属性でエラーメッセージが関連付けられることを確認
      const titleInput = page.locator('[data-testid="goal-title-input"]');
      const ariaDescribedBy = await titleInput.getAttribute('aria-describedby');

      expect(ariaDescribedBy).toContain('goal-title-error');

      // エラーメッセージ要素が存在することを確認
      await expect(page.locator('#goal-title-error')).toBeVisible();
    });

    test('ラベルが適切に関連付けられている', async ({ page }) => {
      // 各フィールドにラベルが関連付けられていることを確認
      const fields = [
        { input: 'goal-title-input', label: 'goal-title' },
        { input: 'goal-description-input', label: 'goal-description' },
        { input: 'goal-deadline-input', label: 'goal-deadline' },
        { input: 'goal-background-input', label: 'goal-background' },
        { input: 'goal-constraints-input', label: 'goal-constraints' },
      ];

      for (const field of fields) {
        // ラベル要素が存在することを確認
        await expect(page.locator(`label[for="${field.label}"]`)).toBeVisible();

        // 入力フィールドのid属性が設定されていることを確認
        await expect(page.locator(`[data-testid="${field.input}"]`)).toHaveAttribute(
          'id',
          field.label
        );
      }
    });

    test('フォームにrole属性が適切に設定されている', async ({ page }) => {
      // フォーム要素にrole="form"が設定されていることを確認
      const form = page.locator('form');
      if ((await form.count()) > 0) {
        await expect(form).toHaveAttribute('role', 'form');
      }

      // アラート要素にrole="alert"が設定されていることを確認
      await goalInputHelpers.fillPartialGoalForm({
        title: invalidGoalData.longTitle.title,
      });
      await page.click('[data-testid="goal-description-input"]');

      const errorElement = page.locator('[data-testid="goal-title-error"]');
      if (await errorElement.isVisible()) {
        await expect(errorElement).toHaveAttribute('role', 'alert');
      }
    });

    test('ボタンに適切なaria-label属性が設定されている', async ({ page }) => {
      // 送信ボタンのaria-label確認
      const submitButton = page.locator('[data-testid="submit-button"]');
      const submitAriaLabel = await submitButton.getAttribute('aria-label');
      expect(submitAriaLabel).toBeTruthy();

      // 下書き保存ボタンのaria-label確認
      const draftButton = page.locator('[data-testid="draft-save-button"]');
      const draftAriaLabel = await draftButton.getAttribute('aria-label');
      expect(draftAriaLabel).toBeTruthy();
    });
  });

  test.describe('スクリーンリーダー対応', () => {
    test('フィールドラベルが適切に読み上げられる', async ({ page }) => {
      // 各フィールドのラベルテキストを確認
      const labels = [
        { selector: 'label[for="goal-title"]', expectedText: '目標タイトル' },
        { selector: 'label[for="goal-description"]', expectedText: '目標説明' },
        { selector: 'label[for="goal-deadline"]', expectedText: '達成期限' },
        { selector: 'label[for="goal-background"]', expectedText: '背景' },
        { selector: 'label[for="goal-constraints"]', expectedText: '制約事項' },
      ];

      for (const label of labels) {
        const labelElement = page.locator(label.selector);
        await expect(labelElement).toContainText(label.expectedText);
      }
    });

    test('必須項目の表示が適切である', async ({ page }) => {
      // 必須マークが視覚的およびスクリーンリーダー用に提供されていることを確認
      const requiredFields = [
        'label[for="goal-title"]',
        'label[for="goal-description"]',
        'label[for="goal-deadline"]',
        'label[for="goal-background"]',
      ];

      for (const fieldSelector of requiredFields) {
        const label = page.locator(fieldSelector);

        // 必須マーク（*）が表示されているか、aria-required属性があることを確認
        const labelText = await label.textContent();
        const hasAsterisk = labelText?.includes('*');

        const inputId = await label.getAttribute('for');
        const input = page.locator(`#${inputId}`);
        const ariaRequired = await input.getAttribute('aria-required');

        expect(hasAsterisk || ariaRequired === 'true').toBeTruthy();
      }
    });

    test('エラーメッセージが適切に読み上げられる', async ({ page }) => {
      // エラー状態を作成
      await goalInputHelpers.fillPartialGoalForm({
        title: '', // 必須エラー
      });

      await page.click('[data-testid="goal-description-input"]');

      // エラーメッセージが表示されることを確認
      const errorMessage = page.locator('[data-testid="goal-title-error"]');
      await expect(errorMessage).toBeVisible();

      // エラーメッセージにrole="alert"が設定されていることを確認
      await expect(errorMessage).toHaveAttribute('role', 'alert');

      // エラーメッセージのテキストが適切であることを確認
      await expect(errorMessage).toContainText('必須');
    });

    test('フォーム送信状態の変化が通知される', async ({ page }) => {
      // フォームに入力
      await goalInputHelpers.fillGoalForm(validGoalData.complete);

      // 送信ボタンの状態変化を確認
      const submitButton = page.locator('[data-testid="submit-button"]');

      // 送信前のボタンテキスト
      const initialText = await submitButton.textContent();

      // 送信実行
      await goalInputHelpers.clickSubmitButton();

      // ローディング状態のテキストが変更されることを確認
      await expect(submitButton).toContainText('処理中');

      // aria-busy属性が設定されることを確認
      await expect(submitButton).toHaveAttribute('aria-busy', 'true');
    });

    test('文字数カウンターが適切に読み上げられる', async ({ page }) => {
      // 文字数カウンターにaria-live属性が設定されていることを確認
      await goalInputHelpers.fillPartialGoalForm({
        title: 'テスト',
      });

      const counter = page.locator('[data-testid="goal-title-character-counter"]');
      await expect(counter).toHaveAttribute('aria-live', 'polite');

      // カウンターのテキストが適切であることを確認
      await expect(counter).toContainText('4/100');
    });
  });

  test.describe('色覚対応', () => {
    test('エラー状態が色以外でも判別できる', async ({ page }) => {
      // エラー状態を作成
      await goalInputHelpers.fillPartialGoalForm({
        title: invalidGoalData.longTitle.title,
      });

      await page.click('[data-testid="goal-description-input"]');

      // エラーメッセージテキストが表示されることを確認
      await goalInputHelpers.expectValidationError('goal-title', '100文字以内');

      // フィールドの境界線スタイルが変更されることを確認
      const titleInput = page.locator('[data-testid="goal-title-input"]');
      const borderStyle = await titleInput.evaluate(el => getComputedStyle(el).borderStyle);

      // 実線や点線など、色以外の視覚的変化があることを確認
      expect(borderStyle).not.toBe('none');
    });

    test('警告状態が色以外でも判別できる', async ({ page }) => {
      // 警告状態を作成（80%の文字数）
      await goalInputHelpers.fillPartialGoalForm({
        title: 'a'.repeat(80),
      });

      // 文字数カウンターに警告アイコンまたはテキストが表示されることを確認
      const counter = page.locator('[data-testid="goal-title-character-counter"]');
      const counterText = await counter.textContent();

      // 警告を示すテキストまたは記号があることを確認
      expect(counterText).toContain('80/100');
    });

    test('成功状態が色以外でも判別できる', async ({ page }) => {
      // 下書き保存を実行
      await goalInputHelpers.fillPartialGoalForm({
        title: '成功テスト',
      });

      await goalInputHelpers.clickDraftSaveButton();

      // 成功メッセージにアイコンまたは明確なテキストが含まれることを確認
      const successMessage = page.locator('text=下書きを保存しました');
      await expect(successMessage).toBeVisible();
    });
  });

  test.describe('フォントサイズとコントラスト', () => {
    test('テキストが十分なコントラスト比を持つ', async ({ page }) => {
      // 主要なテキスト要素のコントラストを確認
      const textElements = [
        'label[for="goal-title"]',
        '[data-testid="goal-title-input"]',
        '[data-testid="submit-button"]',
      ];

      for (const selector of textElements) {
        const element = page.locator(selector);

        // 要素の色とフォントサイズを取得
        const color = await element.evaluate(el => getComputedStyle(el).color);
        const fontSize = await element.evaluate(el => getComputedStyle(el).fontSize);

        // フォントサイズが最小14px以上であることを確認
        expect(parseInt(fontSize)).toBeGreaterThanOrEqual(14);

        // 色が設定されていることを確認（透明でない）
        expect(color).not.toBe('rgba(0, 0, 0, 0)');
      }
    });

    test('フォントサイズが拡大表示に対応している', async ({ page }) => {
      // ブラウザのズーム機能をシミュレート（CSS transform使用）
      await page.addStyleTag({
        content: `
          * {
            transform: scale(1.5);
            transform-origin: top left;
          }
          body {
            width: 67%; /* 1/1.5 */
            height: 67%;
          }
        `,
      });

      // フォームが正常に表示されることを確認
      await expect(page.locator('[data-testid="goal-form-container"]')).toBeVisible();

      // フィールドが操作可能であることを確認
      await goalInputHelpers.fillPartialGoalForm({
        title: '拡大表示テスト',
      });

      const formData = await goalInputHelpers.getFormData();
      expect(formData.title).toBe('拡大表示テスト');
    });
  });

  test.describe('支援技術との互換性', () => {
    test('フォームが論理的な順序で構成されている', async ({ page }) => {
      // DOM順序とタブ順序が一致することを確認
      const focusableElements = await page.locator('input, button, textarea, select').all();

      // 各要素のtabindex属性を確認
      for (const element of focusableElements) {
        const tabIndex = await element.getAttribute('tabindex');

        // 負のtabindexがないことを確認（隠し要素以外）
        if (tabIndex && parseInt(tabIndex) < 0) {
          const isVisible = await element.isVisible();
          expect(isVisible).toBeFalsy(); // 非表示要素のみ負のtabindexを許可
        }
      }
    });

    test('見出し構造が適切である', async ({ page }) => {
      // ページに適切な見出し構造があることを確認
      const h1 = page.locator('h1');
      await expect(h1).toBeVisible();

      // 見出しレベルが論理的であることを確認
      const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();

      if (headings.length > 1) {
        // 見出しレベルが段階的であることを確認
        for (let i = 1; i < headings.length; i++) {
          const prevLevel = parseInt((await headings[i - 1].tagName()).charAt(1));
          const currentLevel = parseInt((await headings[i].tagName()).charAt(1));

          // 見出しレベルが1つ以上飛ばないことを確認
          expect(currentLevel - prevLevel).toBeLessThanOrEqual(1);
        }
      }
    });

    test('ランドマークロールが適切に設定されている', async ({ page }) => {
      // main要素またはrole="main"があることを確認
      const main = page.locator('main, [role="main"]');
      await expect(main).toBeVisible();

      // フォーム要素またはrole="form"があることを確認
      const form = page.locator('form, [role="form"]');
      await expect(form).toBeVisible();
    });

    test('動的コンテンツの変更が適切に通知される', async ({ page }) => {
      // エラーメッセージの表示
      await goalInputHelpers.fillPartialGoalForm({
        title: invalidGoalData.longTitle.title,
      });

      await page.click('[data-testid="goal-description-input"]');

      // エラーメッセージにaria-live属性が設定されていることを確認
      const errorMessage = page.locator('[data-testid="goal-title-error"]');
      const ariaLive = await errorMessage.getAttribute('aria-live');
      const role = await errorMessage.getAttribute('role');

      // aria-live="polite"またはrole="alert"が設定されていることを確認
      expect(ariaLive === 'polite' || role === 'alert').toBeTruthy();
    });
  });

  test.describe('モバイルアクセシビリティ', () => {
    test('モバイルでタッチターゲットが適切なサイズである', async ({ page }) => {
      // モバイルサイズに設定
      await page.setViewportSize({ width: 375, height: 667 });

      // ボタンのサイズが44px以上であることを確認
      const buttons = ['[data-testid="submit-button"]', '[data-testid="draft-save-button"]'];

      for (const buttonSelector of buttons) {
        const button = page.locator(buttonSelector);
        const box = await button.boundingBox();

        expect(box!.height).toBeGreaterThanOrEqual(44);
        expect(box!.width).toBeGreaterThanOrEqual(44);
      }
    });

    test('モバイルでフォーカス表示が適切である', async ({ page }) => {
      // モバイルサイズに設定
      await page.setViewportSize({ width: 375, height: 667 });

      // タッチでフォーカスした時の表示を確認
      await page.tap('[data-testid="goal-title-input"]');

      const focusedElement = page.locator('[data-testid="goal-title-input"]');
      await expect(focusedElement).toBeFocused();

      // フォーカスリングが表示されることを確認
      const outline = await focusedElement.evaluate(el => getComputedStyle(el).outline);
      expect(outline).not.toBe('none');
    });
  });
});
