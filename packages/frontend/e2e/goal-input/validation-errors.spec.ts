import { test, expect } from '@playwright/test';
import { GoalInputHelpers } from '../helpers/goal-input-helpers';
import { AuthHelpers } from '../helpers/auth-helpers';
import {
  invalidGoalData,
  characterLimitData,
  errorMessages,
  dateFormats,
} from '../fixtures/goal-input-data';
import { testUsers } from '../fixtures/test-data';

test.describe('バリデーションエラー', () => {
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

  test.describe('必須項目バリデーション', () => {
    test('目標タイトルが未入力の場合エラーが表示される', async ({ page }) => {
      // 目標タイトル以外を入力
      await goalInputHelpers.fillPartialGoalForm({
        description: invalidGoalData.emptyTitle.description,
        deadline: invalidGoalData.emptyTitle.deadline,
        background: invalidGoalData.emptyTitle.background,
      });

      // 送信ボタンが無効であることを確認
      await goalInputHelpers.expectSubmitButtonDisabled();

      // 目標タイトルフィールドからフォーカスを外す
      await page.click('[data-testid="goal-description-input"]');

      // バリデーションエラーが表示されることを確認
      await goalInputHelpers.expectValidationError('goal-title', errorMessages.requiredTitle);
    });

    test('目標説明が未入力の場合エラーが表示される', async ({ page }) => {
      // 目標説明以外を入力
      await goalInputHelpers.fillPartialGoalForm({
        title: invalidGoalData.emptyDescription.title,
        deadline: invalidGoalData.emptyDescription.deadline,
        background: invalidGoalData.emptyDescription.background,
      });

      // 送信ボタンが無効であることを確認
      await goalInputHelpers.expectSubmitButtonDisabled();

      // 目標説明フィールドからフォーカスを外す
      await page.click('[data-testid="goal-title-input"]');

      // バリデーションエラーが表示されることを確認
      await goalInputHelpers.expectValidationError(
        'goal-description',
        errorMessages.requiredDescription
      );
    });

    test('達成期限が未入力の場合エラーが表示される', async ({ page }) => {
      // 達成期限以外を入力
      await goalInputHelpers.fillPartialGoalForm({
        title: invalidGoalData.emptyDeadline.title,
        description: invalidGoalData.emptyDeadline.description,
        background: invalidGoalData.emptyDeadline.background,
      });

      // 送信ボタンが無効であることを確認
      await goalInputHelpers.expectSubmitButtonDisabled();

      // 達成期限フィールドからフォーカスを外す
      await page.click('[data-testid="goal-title-input"]');

      // バリデーションエラーが表示されることを確認
      await goalInputHelpers.expectValidationError('goal-deadline', errorMessages.requiredDeadline);
    });

    test('背景が未入力の場合エラーが表示される', async ({ page }) => {
      // 背景以外を入力
      await goalInputHelpers.fillPartialGoalForm({
        title: invalidGoalData.emptyBackground.title,
        description: invalidGoalData.emptyBackground.description,
        deadline: invalidGoalData.emptyBackground.deadline,
      });

      // 送信ボタンが無効であることを確認
      await goalInputHelpers.expectSubmitButtonDisabled();

      // 背景フィールドからフォーカスを外す
      await page.click('[data-testid="goal-title-input"]');

      // バリデーションエラーが表示されることを確認
      await goalInputHelpers.expectValidationError(
        'goal-background',
        errorMessages.requiredBackground
      );
    });
  });

  test.describe('文字数制限バリデーション', () => {
    test('目標タイトルが100文字を超える場合エラーが表示される', async ({ page }) => {
      // 100文字を超える目標タイトルを入力
      await goalInputHelpers.fillPartialGoalForm({
        title: invalidGoalData.longTitle.title,
      });

      // 文字数カウンターがエラー状態になることを確認
      await goalInputHelpers.expectCharacterError('goal-title');

      // バリデーションエラーが表示されることを確認
      await goalInputHelpers.expectValidationError('goal-title', errorMessages.titleTooLong);

      // 送信ボタンが無効であることを確認
      await goalInputHelpers.expectSubmitButtonDisabled();
    });

    test('目標説明が1000文字を超える場合エラーが表示される', async ({ page }) => {
      // 1000文字を超える目標説明を入力
      await goalInputHelpers.fillPartialGoalForm({
        description: invalidGoalData.longDescription.description,
      });

      // 文字数カウンターがエラー状態になることを確認
      await goalInputHelpers.expectCharacterError('goal-description');

      // バリデーションエラーが表示されることを確認
      await goalInputHelpers.expectValidationError(
        'goal-description',
        errorMessages.descriptionTooLong
      );

      // 送信ボタンが無効であることを確認
      await goalInputHelpers.expectSubmitButtonDisabled();
    });

    test('背景が500文字を超える場合エラーが表示される', async ({ page }) => {
      // 500文字を超える背景を入力
      await goalInputHelpers.fillPartialGoalForm({
        background: invalidGoalData.longBackground.background,
      });

      // 文字数カウンターがエラー状態になることを確認
      await goalInputHelpers.expectCharacterError('goal-background');

      // バリデーションエラーが表示されることを確認
      await goalInputHelpers.expectValidationError(
        'goal-background',
        errorMessages.backgroundTooLong
      );

      // 送信ボタンが無効であることを確認
      await goalInputHelpers.expectSubmitButtonDisabled();
    });

    test('制約事項が500文字を超える場合エラーが表示される', async ({ page }) => {
      // 500文字を超える制約事項を入力
      await goalInputHelpers.fillPartialGoalForm({
        constraints: invalidGoalData.longConstraints.constraints,
      });

      // 文字数カウンターがエラー状態になることを確認
      await goalInputHelpers.expectCharacterError('goal-constraints');

      // バリデーションエラーが表示されることを確認
      await goalInputHelpers.expectValidationError(
        'goal-constraints',
        errorMessages.constraintsTooLong
      );

      // 送信ボタンが無効であることを確認
      await goalInputHelpers.expectSubmitButtonDisabled();
    });
  });

  test.describe('文字数制限警告', () => {
    test('目標タイトルが80文字を超える場合警告が表示される', async ({ page }) => {
      // 80文字の目標タイトルを入力
      await goalInputHelpers.fillPartialGoalForm({
        title: characterLimitData.title.warning,
      });

      // 文字数カウンターが警告状態になることを確認
      await goalInputHelpers.expectCharacterWarning('goal-title');

      // 文字数が正しく表示されることを確認
      await goalInputHelpers.expectCharacterCount('goal-title', 80, 100);
    });

    test('目標説明が800文字を超える場合警告が表示される', async ({ page }) => {
      // 800文字の目標説明を入力
      await goalInputHelpers.fillPartialGoalForm({
        description: characterLimitData.description.warning,
      });

      // 文字数カウンターが警告状態になることを確認
      await goalInputHelpers.expectCharacterWarning('goal-description');

      // 文字数が正しく表示されることを確認
      await goalInputHelpers.expectCharacterCount('goal-description', 800, 1000);
    });

    test('背景が400文字を超える場合警告が表示される', async ({ page }) => {
      // 400文字の背景を入力
      await goalInputHelpers.fillPartialGoalForm({
        background: characterLimitData.background.warning,
      });

      // 文字数カウンターが警告状態になることを確認
      await goalInputHelpers.expectCharacterWarning('goal-background');

      // 文字数が正しく表示されることを確認
      await goalInputHelpers.expectCharacterCount('goal-background', 400, 500);
    });

    test('制約事項が400文字を超える場合警告が表示される', async ({ page }) => {
      // 400文字の制約事項を入力
      await goalInputHelpers.fillPartialGoalForm({
        constraints: characterLimitData.constraints.warning,
      });

      // 文字数カウンターが警告状態になることを確認
      await goalInputHelpers.expectCharacterWarning('goal-constraints');

      // 文字数が正しく表示されることを確認
      await goalInputHelpers.expectCharacterCount('goal-constraints', 400, 500);
    });
  });

  test.describe('日付バリデーション', () => {
    test('過去の日付を入力した場合エラーが表示される', async ({ page }) => {
      // 過去の日付を入力
      await goalInputHelpers.fillPartialGoalForm({
        deadline: invalidGoalData.pastDeadline.deadline,
      });

      // 日付フィールドからフォーカスを外す
      await page.click('[data-testid="goal-title-input"]');

      // バリデーションエラーが表示されることを確認
      await goalInputHelpers.expectValidationError('goal-deadline', errorMessages.pastDeadline);

      // 送信ボタンが無効であることを確認
      await goalInputHelpers.expectSubmitButtonDisabled();
    });

    test('1年以上先の日付を入力した場合エラーが表示される', async ({ page }) => {
      // 1年以上先の日付を入力
      await goalInputHelpers.fillPartialGoalForm({
        deadline: invalidGoalData.farFutureDeadline.deadline,
      });

      // 日付フィールドからフォーカスを外す
      await page.click('[data-testid="goal-title-input"]');

      // バリデーションエラーが表示されることを確認
      await goalInputHelpers.expectValidationError(
        'goal-deadline',
        errorMessages.farFutureDeadline
      );

      // 送信ボタンが無効であることを確認
      await goalInputHelpers.expectSubmitButtonDisabled();
    });

    test('無効な日付形式を入力した場合エラーが表示される', async ({ page }) => {
      for (const invalidDate of dateFormats.invalid) {
        // 無効な日付を入力
        await page.fill('[data-testid="goal-deadline-input"]', invalidDate);

        // 日付フィールドからフォーカスを外す
        await page.click('[data-testid="goal-title-input"]');

        // バリデーションエラーが表示されることを確認
        await goalInputHelpers.expectValidationError('goal-deadline', errorMessages.invalidDate);

        // フィールドをクリア
        await page.fill('[data-testid="goal-deadline-input"]', '');
      }
    });
  });

  test.describe('リアルタイムバリデーション', () => {
    test('入力中にリアルタイムで文字数カウンターが更新される', async ({ page }) => {
      const titleInput = page.locator('[data-testid="goal-title-input"]');

      // 段階的に文字を入力
      await titleInput.fill('短いタイトル');
      await goalInputHelpers.expectCharacterCount('goal-title', 6, 100);

      await titleInput.fill('もう少し長いタイトルです');
      await goalInputHelpers.expectCharacterCount('goal-title', 12, 100);

      // 警告レベルまで入力
      await titleInput.fill(characterLimitData.title.warning);
      await goalInputHelpers.expectCharacterWarning('goal-title');

      // 制限値まで入力
      await titleInput.fill(characterLimitData.title.limit);
      await goalInputHelpers.expectCharacterCount('goal-title', 100, 100);
    });

    test('フィールドからフォーカスが外れた時にバリデーションが実行される', async ({ page }) => {
      // 空の目標タイトルフィールドにフォーカス
      await page.click('[data-testid="goal-title-input"]');

      // 他のフィールドにフォーカスを移動
      await page.click('[data-testid="goal-description-input"]');

      // バリデーションエラーが表示されることを確認
      await goalInputHelpers.expectValidationError('goal-title', errorMessages.requiredTitle);
    });

    test('エラー状態から正常な値を入力するとエラーが解消される', async ({ page }) => {
      // まず無効な値を入力してエラー状態にする
      await goalInputHelpers.fillPartialGoalForm({
        title: invalidGoalData.longTitle.title,
      });

      // エラーが表示されることを確認
      await goalInputHelpers.expectValidationError('goal-title', errorMessages.titleTooLong);

      // 正常な値に修正
      await page.fill('[data-testid="goal-title-input"]', '正常なタイトル');

      // エラーが解消されることを確認
      const errorElement = page.locator('[data-testid="goal-title-error"]');
      await expect(errorElement).not.toBeVisible();
    });
  });

  test.describe('複合バリデーション', () => {
    test('複数のフィールドでエラーがある場合、すべてのエラーが表示される', async ({ page }) => {
      // 複数のフィールドに無効な値を入力
      await goalInputHelpers.fillPartialGoalForm({
        title: '', // 必須エラー
        description: invalidGoalData.longDescription.description, // 文字数制限エラー
        deadline: invalidGoalData.pastDeadline.deadline, // 日付エラー
        background: '', // 必須エラー
      });

      // 各フィールドからフォーカスを外してバリデーションをトリガー
      await page.click('[data-testid="goal-title-input"]');
      await page.click('[data-testid="goal-description-input"]');
      await page.click('[data-testid="goal-deadline-input"]');
      await page.click('[data-testid="goal-background-input"]');
      await page.click('[data-testid="goal-title-input"]'); // 最後にフォーカスを外す

      // すべてのエラーが表示されることを確認
      await goalInputHelpers.expectValidationError('goal-title', errorMessages.requiredTitle);
      await goalInputHelpers.expectValidationError(
        'goal-description',
        errorMessages.descriptionTooLong
      );
      await goalInputHelpers.expectValidationError('goal-deadline', errorMessages.pastDeadline);
      await goalInputHelpers.expectValidationError(
        'goal-background',
        errorMessages.requiredBackground
      );

      // 送信ボタンが無効であることを確認
      await goalInputHelpers.expectSubmitButtonDisabled();
    });

    test('エラーがある状態で送信を試行した場合、適切なエラーメッセージが表示される', async ({
      page,
    }) => {
      // 無効なデータを入力
      await goalInputHelpers.fillPartialGoalForm({
        title: invalidGoalData.longTitle.title,
        description: 'valid description',
        deadline: '2024-12-31',
        background: 'valid background',
      });

      // 送信ボタンをクリック（無効状態でもクリックを試行）
      const submitButton = page.locator('[data-testid="submit-button"]');
      if (await submitButton.isEnabled()) {
        await submitButton.click();

        // フォームレベルのエラーメッセージが表示されることを確認
        await goalInputHelpers.expectValidationError('form', '入力内容に誤りがあります');
      }
    });
  });

  test.describe('エラー状態の視覚的フィードバック', () => {
    test('エラーがあるフィールドは視覚的に区別される', async ({ page }) => {
      // エラー状態のフィールドを作成
      await goalInputHelpers.fillPartialGoalForm({
        title: invalidGoalData.longTitle.title,
      });

      // フィールドからフォーカスを外す
      await page.click('[data-testid="goal-description-input"]');

      // エラー状態のスタイルが適用されることを確認
      const titleInput = page.locator('[data-testid="goal-title-input"]');
      await expect(titleInput).toHaveClass(/border-red-500/);
    });

    test('文字数制限に近づくと警告色で表示される', async ({ page }) => {
      // 警告レベルの文字数を入力
      await goalInputHelpers.fillPartialGoalForm({
        title: characterLimitData.title.warning,
      });

      // 文字数カウンターが警告色になることを確認
      await goalInputHelpers.expectCharacterWarning('goal-title');
    });

    test('文字数制限を超えるとエラー色で表示される', async ({ page }) => {
      // 制限を超える文字数を入力
      await goalInputHelpers.fillPartialGoalForm({
        title: characterLimitData.title.over,
      });

      // 文字数カウンターがエラー色になることを確認
      await goalInputHelpers.expectCharacterError('goal-title');
    });
  });
});
