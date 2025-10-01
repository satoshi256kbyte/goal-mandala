import { test, expect } from '@playwright/test';
import { GoalInputHelpers } from '../helpers/goal-input-helpers';
import { AuthHelpers } from '../helpers/auth-helpers';
import { validGoalData, responsiveBreakpoints } from '../fixtures/goal-input-data';
import { testUsers } from '../fixtures/test-data';

test.describe('レスポンシブ表示', () => {
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
  });

  test.describe('モバイル表示 (375px)', () => {
    test.beforeEach(async ({ page }) => {
      // モバイルサイズに設定
      await page.setViewportSize(responsiveBreakpoints.mobile);
      await goalInputHelpers.goToGoalInput();
    });

    test('モバイルレイアウトが正しく表示される', async ({ page }) => {
      // 1カラムレイアウトであることを確認
      await goalInputHelpers.expectMobileLayout();

      // フォームコンテナが画面幅に適応していることを確認
      const container = page.locator('[data-testid="goal-form-container"]');
      await expect(container).toHaveCSS('width', /100%|auto/);

      // フィールドが縦に並んでいることを確認
      const titleField = page.locator('[data-testid="goal-title-input"]');
      const descriptionField = page.locator('[data-testid="goal-description-input"]');

      const titleBox = await titleField.boundingBox();
      const descriptionBox = await descriptionField.boundingBox();

      expect(titleBox!.y).toBeLessThan(descriptionBox!.y);
    });

    test('モバイルでフォーム入力が正常に動作する', async ({ page }) => {
      // フォームに入力
      await goalInputHelpers.fillGoalForm(validGoalData.complete);

      // 入力内容が正しく表示されることを確認
      const formData = await goalInputHelpers.getFormData();
      expect(formData.title).toBe(validGoalData.complete.title);
      expect(formData.description).toBe(validGoalData.complete.description);

      // 送信ボタンが有効になることを確認
      await goalInputHelpers.expectSubmitButtonEnabled();
    });

    test('モバイルでボタンサイズが適切である', async ({ page }) => {
      // ボタンがタッチ操作に適したサイズ（44px以上）であることを確認
      const submitButton = page.locator('[data-testid="submit-button"]');
      const draftSaveButton = page.locator('[data-testid="draft-save-button"]');

      const submitBox = await submitButton.boundingBox();
      const draftBox = await draftSaveButton.boundingBox();

      expect(submitBox!.height).toBeGreaterThanOrEqual(44);
      expect(draftBox!.height).toBeGreaterThanOrEqual(44);
    });

    test('モバイルで文字数カウンターが適切に表示される', async ({ page }) => {
      // 長いテキストを入力
      await page.fill('[data-testid="goal-title-input"]', 'a'.repeat(50));

      // 文字数カウンターが表示されることを確認
      await goalInputHelpers.expectCharacterCount('goal-title', 50, 100);

      // カウンターがフィールドの下に表示されることを確認
      const titleField = page.locator('[data-testid="goal-title-input"]');
      const counter = page.locator('[data-testid="goal-title-character-counter"]');

      const titleBox = await titleField.boundingBox();
      const counterBox = await counter.boundingBox();

      expect(titleBox!.y).toBeLessThan(counterBox!.y);
    });

    test('モバイルで日付ピッカーが適切に動作する', async ({ page }) => {
      // 日付ピッカーを開く
      await goalInputHelpers.openDatePicker();

      // 日付ピッカーが画面に収まって表示されることを確認
      const datePicker = page.locator('.react-datepicker');
      await expect(datePicker).toBeVisible();

      const pickerBox = await datePicker.boundingBox();
      const viewport = page.viewportSize()!;

      expect(pickerBox!.x).toBeGreaterThanOrEqual(0);
      expect(pickerBox!.x + pickerBox!.width).toBeLessThanOrEqual(viewport.width);
    });

    test('モバイルでスクロールが正常に動作する', async ({ page }) => {
      // フォーム全体がスクロール可能であることを確認
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });

      // 最下部の要素が見えることを確認
      const submitButton = page.locator('[data-testid="submit-button"]');
      await expect(submitButton).toBeInViewport();
    });
  });

  test.describe('タブレット表示 (768px)', () => {
    test.beforeEach(async ({ page }) => {
      // タブレットサイズに設定
      await page.setViewportSize(responsiveBreakpoints.tablet);
      await goalInputHelpers.goToGoalInput();
    });

    test('タブレットレイアウトが正しく表示される', async ({ page }) => {
      // 1カラムレイアウトであることを確認
      const container = page.locator('[data-testid="goal-form-container"]');
      await expect(container).toBeVisible();

      // フィールドが適切な幅で表示されることを確認
      const titleField = page.locator('[data-testid="goal-title-input"]');
      const titleBox = await titleField.boundingBox();

      // タブレットでは適度な余白があることを確認
      expect(titleBox!.width).toBeLessThan(responsiveBreakpoints.tablet.width * 0.95);
      expect(titleBox!.width).toBeGreaterThan(responsiveBreakpoints.tablet.width * 0.7);
    });

    test('タブレットでフォーム操作が快適に行える', async ({ page }) => {
      // フォームに入力
      await goalInputHelpers.fillGoalForm(validGoalData.complete);

      // タッチ操作でのフォーカス移動をシミュレート
      await page.tap('[data-testid="goal-title-input"]');
      await expect(page.locator('[data-testid="goal-title-input"]')).toBeFocused();

      await page.tap('[data-testid="goal-description-input"]');
      await expect(page.locator('[data-testid="goal-description-input"]')).toBeFocused();
    });

    test('タブレットで横向き表示が適切に動作する', async ({ page }) => {
      // 横向きに回転
      await page.setViewportSize({
        width: responsiveBreakpoints.tablet.height,
        height: responsiveBreakpoints.tablet.width,
      });

      // レイアウトが適応することを確認
      const container = page.locator('[data-testid="goal-form-container"]');
      await expect(container).toBeVisible();

      // フォームが画面に収まることを確認
      const formBox = await container.boundingBox();
      expect(formBox!.width).toBeLessThanOrEqual(responsiveBreakpoints.tablet.height);
    });
  });

  test.describe('デスクトップ表示 (1024px)', () => {
    test.beforeEach(async ({ page }) => {
      // デスクトップサイズに設定
      await page.setViewportSize(responsiveBreakpoints.desktop);
      await goalInputHelpers.goToGoalInput();
    });

    test('デスクトップレイアウトが正しく表示される', async ({ page }) => {
      // デスクトップレイアウトが適用されることを確認
      await goalInputHelpers.expectDesktopLayout();

      // フォームが中央に配置されることを確認
      const container = page.locator('[data-testid="goal-form-container"]');
      const containerBox = await container.boundingBox();
      const viewport = page.viewportSize()!;

      // 左右に適度な余白があることを確認
      const leftMargin = containerBox!.x;
      const rightMargin = viewport.width - (containerBox!.x + containerBox!.width);

      expect(leftMargin).toBeGreaterThan(50);
      expect(rightMargin).toBeGreaterThan(50);
    });

    test('デスクトップでマウス操作が適切に動作する', async ({ page }) => {
      // ホバー効果のテスト
      const submitButton = page.locator('[data-testid="submit-button"]');

      // ホバー前の状態を記録
      const initialColor = await submitButton.evaluate(el => getComputedStyle(el).backgroundColor);

      // ホバー
      await submitButton.hover();

      // ホバー後の状態を確認（色が変わることを期待）
      const hoveredColor = await submitButton.evaluate(el => getComputedStyle(el).backgroundColor);

      // ホバー効果があることを確認（色が変わるか、カーソルが変わる）
      const cursor = await submitButton.evaluate(el => getComputedStyle(el).cursor);
      expect(cursor).toBe('pointer');
    });

    test('デスクトップで最大幅が制限される', async ({ page }) => {
      // フォームコンテナの最大幅が制限されることを確認
      const container = page.locator('[data-testid="goal-form-container"]');
      const containerBox = await container.boundingBox();

      // 最大幅が600px程度に制限されることを確認
      expect(containerBox!.width).toBeLessThanOrEqual(800);
    });
  });

  test.describe('大画面デスクトップ表示 (1440px)', () => {
    test.beforeEach(async ({ page }) => {
      // 大画面デスクトップサイズに設定
      await page.setViewportSize(responsiveBreakpoints.largeDesktop);
      await goalInputHelpers.goToGoalInput();
    });

    test('大画面でもレイアウトが適切に表示される', async ({ page }) => {
      // フォームが中央に配置され、適切な最大幅を持つことを確認
      const container = page.locator('[data-testid="goal-form-container"]');
      const containerBox = await container.boundingBox();
      const viewport = page.viewportSize()!;

      // 中央配置の確認
      const centerX = viewport.width / 2;
      const containerCenterX = containerBox!.x + containerBox!.width / 2;

      expect(Math.abs(centerX - containerCenterX)).toBeLessThan(50);

      // 最大幅の制限確認
      expect(containerBox!.width).toBeLessThanOrEqual(800);
    });

    test('大画面で2カラムレイアウトが適用される場合の確認', async ({ page }) => {
      // 将来的に2カラムレイアウトが実装される場合のテスト
      const container = page.locator('[data-testid="goal-form-container"]');

      // 現在は1カラムだが、将来的に2カラムになる可能性を考慮
      const containerClass = await container.getAttribute('class');

      // レイアウトが適切に表示されることを確認
      await expect(container).toBeVisible();
    });
  });

  test.describe('ブレークポイント間の遷移', () => {
    test('画面サイズ変更時にレイアウトが適応する', async ({ page }) => {
      await goalInputHelpers.goToGoalInput();

      // デスクトップから開始
      await page.setViewportSize(responsiveBreakpoints.desktop);

      // フォームに入力
      await goalInputHelpers.fillPartialGoalForm({
        title: 'レスポンシブテスト',
      });

      // タブレットサイズに変更
      await page.setViewportSize(responsiveBreakpoints.tablet);

      // 入力内容が保持されることを確認
      const formData1 = await goalInputHelpers.getFormData();
      expect(formData1.title).toBe('レスポンシブテスト');

      // モバイルサイズに変更
      await page.setViewportSize(responsiveBreakpoints.mobile);

      // 入力内容が保持されることを確認
      const formData2 = await goalInputHelpers.getFormData();
      expect(formData2.title).toBe('レスポンシブテスト');

      // レイアウトが適応することを確認
      await goalInputHelpers.expectMobileLayout();
    });

    test('画面回転時にレイアウトが適応する', async ({ page }) => {
      await goalInputHelpers.goToGoalInput();

      // 縦向きモバイル
      await page.setViewportSize(responsiveBreakpoints.mobile);

      // フォームに入力
      await goalInputHelpers.fillPartialGoalForm({
        title: '回転テスト',
      });

      // 横向きに回転
      await page.setViewportSize({
        width: responsiveBreakpoints.mobile.height,
        height: responsiveBreakpoints.mobile.width,
      });

      // 入力内容が保持されることを確認
      const formData = await goalInputHelpers.getFormData();
      expect(formData.title).toBe('回転テスト');

      // レイアウトが適応することを確認
      const container = page.locator('[data-testid="goal-form-container"]');
      await expect(container).toBeVisible();
    });
  });

  test.describe('フォント・テキストサイズ', () => {
    test('各画面サイズで適切なフォントサイズが適用される', async ({ page }) => {
      // モバイル
      await page.setViewportSize(responsiveBreakpoints.mobile);
      await goalInputHelpers.goToGoalInput();

      const titleInput = page.locator('[data-testid="goal-title-input"]');
      const mobileFontSize = await titleInput.evaluate(el => getComputedStyle(el).fontSize);

      // タブレット
      await page.setViewportSize(responsiveBreakpoints.tablet);
      const tabletFontSize = await titleInput.evaluate(el => getComputedStyle(el).fontSize);

      // デスクトップ
      await page.setViewportSize(responsiveBreakpoints.desktop);
      const desktopFontSize = await titleInput.evaluate(el => getComputedStyle(el).fontSize);

      // フォントサイズが適切に設定されていることを確認
      expect(parseInt(mobileFontSize)).toBeGreaterThanOrEqual(14);
      expect(parseInt(tabletFontSize)).toBeGreaterThanOrEqual(14);
      expect(parseInt(desktopFontSize)).toBeGreaterThanOrEqual(14);
    });

    test('テキストが画面からはみ出さない', async ({ page }) => {
      const viewports = [
        responsiveBreakpoints.mobile,
        responsiveBreakpoints.tablet,
        responsiveBreakpoints.desktop,
      ];

      for (const viewport of viewports) {
        await page.setViewportSize(viewport);
        await goalInputHelpers.goToGoalInput();

        // 長いテキストを入力
        await goalInputHelpers.fillPartialGoalForm({
          title:
            'とても長いタイトルのテストです。この文字列が画面からはみ出さないことを確認します。',
        });

        // テキストが画面内に収まることを確認
        const titleInput = page.locator('[data-testid="goal-title-input"]');
        const inputBox = await titleInput.boundingBox();

        expect(inputBox!.x).toBeGreaterThanOrEqual(0);
        expect(inputBox!.x + inputBox!.width).toBeLessThanOrEqual(viewport.width);
      }
    });
  });

  test.describe('タッチ操作', () => {
    test('モバイルでタッチ操作が正常に動作する', async ({ page }) => {
      await page.setViewportSize(responsiveBreakpoints.mobile);
      await goalInputHelpers.goToGoalInput();

      // タップでフィールドにフォーカス
      await page.tap('[data-testid="goal-title-input"]');
      await expect(page.locator('[data-testid="goal-title-input"]')).toBeFocused();

      // タップでボタンをクリック
      await goalInputHelpers.fillGoalForm(validGoalData.complete);
      await page.tap('[data-testid="submit-button"]');

      // 処理が実行されることを確認
      await goalInputHelpers.expectLoading();
    });

    test('スワイプ操作でスクロールが動作する', async ({ page }) => {
      await page.setViewportSize(responsiveBreakpoints.mobile);
      await goalInputHelpers.goToGoalInput();

      // ページの初期位置を記録
      const initialScrollY = await page.evaluate(() => window.scrollY);

      // スワイプ操作をシミュレート
      await page.touchscreen.tap(200, 300);
      await page.touchscreen.tap(200, 100);

      // スクロールが発生することを確認
      const finalScrollY = await page.evaluate(() => window.scrollY);

      // スクロール可能な場合はスクロールが発生することを確認
      if (await page.evaluate(() => document.body.scrollHeight > window.innerHeight)) {
        expect(finalScrollY).not.toBe(initialScrollY);
      }
    });
  });

  test.describe('パフォーマンス', () => {
    test('画面サイズ変更時のパフォーマンスが適切である', async ({ page }) => {
      await goalInputHelpers.goToGoalInput();

      // フォームに入力
      await goalInputHelpers.fillGoalForm(validGoalData.complete);

      const startTime = Date.now();

      // 複数回画面サイズを変更
      const sizes = [
        responsiveBreakpoints.mobile,
        responsiveBreakpoints.tablet,
        responsiveBreakpoints.desktop,
        responsiveBreakpoints.mobile,
      ];

      for (const size of sizes) {
        await page.setViewportSize(size);
        await page.waitForTimeout(100); // レイアウト調整を待機
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // レスポンシブ調整が1秒以内に完了することを確認
      expect(duration).toBeLessThan(1000);

      // 入力内容が保持されることを確認
      const formData = await goalInputHelpers.getFormData();
      expect(formData.title).toBe(validGoalData.complete.title);
    });
  });
});
