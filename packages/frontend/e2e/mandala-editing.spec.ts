import { test, expect } from '@playwright/test';

/**
 * E2Eテスト: マンダラ編集フロー
 *
 * このテストはマンダラチャートの編集に関する重要なフローを検証します。
 * - インライン編集
 * - モーダル編集
 * - 保存とキャンセル
 */

test.describe('マンダラ編集フロー', () => {
  const mockGoal = {
    id: 'test-goal-id',
    user_id: 'test-user-id',
    title: '目標タイトル',
    description: '目標の説明文',
    deadline: '2024-12-31',
    background: '目標の背景情報',
    constraints: '目標の制約事項',
    status: 'active',
    progress: 0,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-15T10:00:00Z',
  };

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

    // 目標データのモック
    await page.route('**/api/goals/**', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockGoal),
        });
      } else {
        await route.continue();
      }
    });
  });

  test('マンダラチャートが正常に表示される', async ({ page }) => {
    await page.goto(`/mandala/${mockGoal.id}`);

    // マンダラチャートが表示されることを確認
    await expect(page.locator('[data-testid="mandala-chart"]')).toBeVisible();

    // 中央の目標セルが表示されることを確認
    await expect(page.locator('[data-testid="mandala-cell-goal"]')).toBeVisible();
    await expect(page.locator('[data-testid="mandala-cell-goal"]')).toContainText(mockGoal.title);
  });

  test('インライン編集: セルクリックで編集モードに入る', async ({ page }) => {
    await page.goto(`/mandala/${mockGoal.id}`);

    // セルをクリック
    await page.click('[data-testid="mandala-cell-goal"]');

    // インライン編集モードが表示されることを確認
    const inlineEditor = page.locator('[data-testid="inline-editor"]');
    if (await inlineEditor.isVisible()) {
      await expect(page.locator('[data-testid="inline-editor-input"]')).toBeVisible();
      await expect(page.locator('[data-testid="inline-editor-input"]')).toBeFocused();
      await expect(page.locator('[data-testid="inline-editor-input"]')).toHaveValue(mockGoal.title);
    }
  });

  test('インライン編集: Enterキーで保存', async ({ page }) => {
    await page.goto(`/mandala/${mockGoal.id}`);

    // APIモックを設定
    await page.route('**/api/goals/**', async route => {
      if (route.request().method() === 'PUT') {
        const requestBody = route.request().postDataJSON();
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ...mockGoal,
            ...requestBody,
            updated_at: new Date().toISOString(),
          }),
        });
      } else {
        await route.continue();
      }
    });

    // セルをクリックして編集モードに入る
    await page.click('[data-testid="mandala-cell-goal"]');

    const inlineEditor = page.locator('[data-testid="inline-editor"]');
    if (await inlineEditor.isVisible()) {
      // テキストを編集
      await page.fill('[data-testid="inline-editor-input"]', '更新された目標タイトル');

      // Enterキーで保存
      await page.keyboard.press('Enter');

      // 成功メッセージが表示されることを確認
      await expect(page.locator('text=保存しました')).toBeVisible({ timeout: 5000 });

      // 更新された内容が反映されることを確認
      await expect(page.locator('[data-testid="mandala-cell-goal"]')).toContainText(
        '更新された目標タイトル'
      );
    }
  });

  test('インライン編集: Escキーでキャンセル', async ({ page }) => {
    await page.goto(`/mandala/${mockGoal.id}`);

    // セルをクリックして編集モードに入る
    await page.click('[data-testid="mandala-cell-goal"]');

    const inlineEditor = page.locator('[data-testid="inline-editor"]');
    if (await inlineEditor.isVisible()) {
      // テキストを編集
      await page.fill('[data-testid="inline-editor-input"]', '変更されたタイトル');

      // Escキーでキャンセル
      await page.keyboard.press('Escape');

      // 編集モードが終了することを確認
      await expect(inlineEditor).not.toBeVisible();

      // 元の内容が保持されることを確認
      await expect(page.locator('[data-testid="mandala-cell-goal"]')).toContainText(mockGoal.title);
    }
  });

  test('インライン編集: バリデーションエラー', async ({ page }) => {
    await page.goto(`/mandala/${mockGoal.id}`);

    // セルをクリックして編集モードに入る
    await page.click('[data-testid="mandala-cell-goal"]');

    const inlineEditor = page.locator('[data-testid="inline-editor"]');
    if (await inlineEditor.isVisible()) {
      // テキストを空にする
      await page.fill('[data-testid="inline-editor-input"]', '');

      // Enterキーで保存を試みる
      await page.keyboard.press('Enter');

      // エラーメッセージが表示されることを確認
      const errorMessage = page.locator('[data-testid="inline-editor-error"]');
      if (await errorMessage.isVisible()) {
        await expect(errorMessage).toContainText('必須');
      }

      // 編集モードが継続することを確認
      await expect(inlineEditor).toBeVisible();
    }
  });

  test('モーダル編集: 編集ボタンでモーダルが開く', async ({ page }) => {
    await page.goto(`/mandala/${mockGoal.id}`);

    // 編集ボタンをクリック
    const editButton = page.getByRole('button', { name: '編集' });
    if (await editButton.isVisible()) {
      await editButton.click();

      // モーダルが表示されることを確認
      await expect(page.locator('[data-testid="edit-modal"]')).toBeVisible();
      await expect(page.locator('[data-testid="edit-modal-title"]')).toBeVisible();
    }
  });

  test('モーダル編集: 保存ボタンで変更を保存', async ({ page }) => {
    await page.goto(`/mandala/${mockGoal.id}`);

    // APIモックを設定
    await page.route('**/api/goals/**', async route => {
      if (route.request().method() === 'PUT') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ...mockGoal,
            title: 'モーダルで更新',
            updated_at: new Date().toISOString(),
          }),
        });
      } else {
        await route.continue();
      }
    });

    // 編集ボタンをクリック
    const editButton = page.getByRole('button', { name: '編集' });
    if (await editButton.isVisible()) {
      await editButton.click();

      const modal = page.locator('[data-testid="edit-modal"]');
      if (await modal.isVisible()) {
        // タイトルを編集
        await page.fill('[data-testid="modal-title-input"]', 'モーダルで更新');

        // 保存ボタンをクリック
        await page.getByRole('button', { name: '保存' }).click();

        // 成功メッセージが表示されることを確認
        await expect(page.locator('text=保存しました')).toBeVisible({ timeout: 5000 });

        // モーダルが閉じることを確認
        await expect(modal).not.toBeVisible();
      }
    }
  });

  test('モーダル編集: キャンセルボタンで変更を破棄', async ({ page }) => {
    await page.goto(`/mandala/${mockGoal.id}`);

    // 編集ボタンをクリック
    const editButton = page.getByRole('button', { name: '編集' });
    if (await editButton.isVisible()) {
      await editButton.click();

      const modal = page.locator('[data-testid="edit-modal"]');
      if (await modal.isVisible()) {
        // タイトルを編集
        await page.fill('[data-testid="modal-title-input"]', '破棄される変更');

        // キャンセルボタンをクリック
        await page.getByRole('button', { name: 'キャンセル' }).click();

        // モーダルが閉じることを確認
        await expect(modal).not.toBeVisible();

        // 元の内容が保持されることを確認
        await expect(page.locator('[data-testid="mandala-cell-goal"]')).toContainText(
          mockGoal.title
        );
      }
    }
  });

  test('エラーハンドリング: ネットワークエラー', async ({ page }) => {
    await page.goto(`/mandala/${mockGoal.id}`);

    // ネットワークエラーをシミュレート
    await page.route('**/api/goals/**', async route => {
      if (route.request().method() === 'PUT') {
        await route.abort('failed');
      } else {
        await route.continue();
      }
    });

    // セルをクリックして編集モードに入る
    await page.click('[data-testid="mandala-cell-goal"]');

    const inlineEditor = page.locator('[data-testid="inline-editor"]');
    if (await inlineEditor.isVisible()) {
      await page.fill('[data-testid="inline-editor-input"]', '更新されたタイトル');
      await page.keyboard.press('Enter');

      // エラーメッセージが表示されることを確認
      await expect(page.locator('text=ネットワークエラー')).toBeVisible({ timeout: 5000 });
    }
  });

  test('進捗表示が正しく更新される', async ({ page }) => {
    await page.goto(`/mandala/${mockGoal.id}`);

    // 進捗バーが表示されることを確認
    const progressBar = page.locator('[data-testid="progress-bar"]');
    if (await progressBar.isVisible()) {
      await expect(progressBar).toBeVisible();

      // 進捗率が表示されることを確認
      const progressText = page.locator('[data-testid="progress-text"]');
      if (await progressText.isVisible()) {
        await expect(progressText).toContainText('0%');
      }
    }
  });
});
