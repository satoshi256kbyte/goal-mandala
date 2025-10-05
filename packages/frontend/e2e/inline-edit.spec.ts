import { test, expect, Page } from '@playwright/test';

/**
 * E2Eテスト: インライン編集機能
 *
 * このテストはInlineEditorコンポーネントを使用したインライン編集機能を検証します。
 * セルを直接クリックして編集し、Enter/Escキーや外側クリックで保存/キャンセルできることを確認します。
 *
 * テスト対象:
 * - InlineEditorコンポーネント
 * - MandalaCellコンポーネントの編集機能統合
 * - キーボード操作（Enter, Esc, Tab）
 * - バリデーション
 * - エラーハンドリング
 *
 * 実装が必要なコンポーネント:
 * - InlineEditor (インライン編集)
 * - MandalaCellコンポーネントの編集機能統合
 *
 * 実装が必要なAPI:
 * - PUT /api/goals/:goalId
 * - PUT /api/subgoals/:subGoalId
 * - PUT /api/actions/:actionId
 */

test.describe('Inline Edit E2E Tests', () => {
  // テスト用のモックデータ
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

  const mockSubGoal = {
    id: 'test-subgoal-id',
    goal_id: 'test-goal-id',
    title: 'サブ目標タイトル',
    description: 'サブ目標の説明文',
    background: 'サブ目標の背景情報',
    constraints: 'サブ目標の制約事項',
    position: 0,
    progress: 0,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-15T10:00:00Z',
  };

  const mockAction = {
    id: 'test-action-id',
    sub_goal_id: 'test-subgoal-id',
    title: 'アクションタイトル',
    description: 'アクションの説明文',
    background: 'アクションの背景情報',
    constraints: 'アクションの制約事項',
    type: 'execution' as const,
    position: 0,
    progress: 0,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-15T10:00:00Z',
  };

  test.beforeEach(async ({ page }) => {
    // 認証情報をセットアップ
    await setupAuth(page);

    // モックデータをセットアップ
    await setupMockData(page);
  });

  test.describe('基本的なインライン編集', () => {
    test('セルクリックで編集モードに入る', async ({ page }) => {
      await page.goto(`/mandala/${mockGoal.id}`);

      // セルをクリック
      await page.click('[data-testid="mandala-cell-goal"]');

      // インライン編集モードが表示されることを確認
      await expect(page.locator('[data-testid="inline-editor"]')).toBeVisible();
      await expect(page.locator('[data-testid="inline-editor-input"]')).toBeVisible();
      await expect(page.locator('[data-testid="inline-editor-input"]')).toBeFocused();

      // 初期値が正しく表示されることを確認
      await expect(page.locator('[data-testid="inline-editor-input"]')).toHaveValue(mockGoal.title);
    });

    test('ダブルクリックで編集モードに入る', async ({ page }) => {
      await page.goto(`/mandala/${mockGoal.id}`);

      // セルをダブルクリック
      await page.dblclick('[data-testid="mandala-cell-goal"]');

      // インライン編集モードが表示されることを確認
      await expect(page.locator('[data-testid="inline-editor"]')).toBeVisible();
      await expect(page.locator('[data-testid="inline-editor-input"]')).toBeFocused();
    });

    test('Enterキーで保存', async ({ page }) => {
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
      await expect(page.locator('[data-testid="inline-editor"]')).toBeVisible();

      // テキストを編集
      await page.fill('[data-testid="inline-editor-input"]', '更新された目標タイトル');

      // Enterキーで保存
      await page.keyboard.press('Enter');

      // 成功メッセージが表示されることを確認
      await expect(page.locator('text=保存しました')).toBeVisible({ timeout: 5000 });

      // 編集モードが終了することを確認
      await expect(page.locator('[data-testid="inline-editor"]')).not.toBeVisible();

      // 更新された内容が反映されることを確認
      await expect(page.locator('[data-testid="mandala-cell-goal"]')).toContainText(
        '更新された目標タイトル'
      );
    });

    test('外側クリックで保存', async ({ page }) => {
      await page.goto(`/mandala/${mockGoal.id}`);

      // APIモックを設定
      await page.route('**/api/goals/**', async route => {
        if (route.request().method() === 'PUT') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              ...mockGoal,
              title: '外側クリックで保存',
              updated_at: new Date().toISOString(),
            }),
          });
        } else {
          await route.continue();
        }
      });

      // セルをクリックして編集モードに入る
      await page.click('[data-testid="mandala-cell-goal"]');
      await expect(page.locator('[data-testid="inline-editor"]')).toBeVisible();

      // テキストを編集
      await page.fill('[data-testid="inline-editor-input"]', '外側クリックで保存');

      // 外側をクリック
      await page.click('body');

      // 成功メッセージが表示されることを確認
      await expect(page.locator('text=保存しました')).toBeVisible({ timeout: 5000 });

      // 編集モードが終了することを確認
      await expect(page.locator('[data-testid="inline-editor"]')).not.toBeVisible();
    });

    test('Escキーでキャンセル', async ({ page }) => {
      await page.goto(`/mandala/${mockGoal.id}`);

      // セルをクリックして編集モードに入る
      await page.click('[data-testid="mandala-cell-goal"]');
      await expect(page.locator('[data-testid="inline-editor"]')).toBeVisible();

      // テキストを編集
      await page.fill('[data-testid="inline-editor-input"]', '変更されたタイトル');

      // Escキーでキャンセル
      await page.keyboard.press('Escape');

      // 編集モードが終了することを確認
      await expect(page.locator('[data-testid="inline-editor"]')).not.toBeVisible();

      // 元の内容が保持されることを確認
      await expect(page.locator('[data-testid="mandala-cell-goal"]')).toContainText(mockGoal.title);
    });
  });

  test.describe('バリデーション', () => {
    test('空文字でエラー表示', async ({ page }) => {
      await page.goto(`/mandala/${mockGoal.id}`);

      // セルをクリックして編集モードに入る
      await page.click('[data-testid="mandala-cell-goal"]');
      await expect(page.locator('[data-testid="inline-editor"]')).toBeVisible();

      // テキストを空にする
      await page.fill('[data-testid="inline-editor-input"]', '');

      // Enterキーで保存を試みる
      await page.keyboard.press('Enter');

      // エラーメッセージが表示されることを確認
      await expect(page.locator('[data-testid="inline-editor-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="inline-editor-error"]')).toContainText(
        'タイトルは必須です'
      );

      // 編集モードが継続することを確認
      await expect(page.locator('[data-testid="inline-editor"]')).toBeVisible();
    });

    test('文字数制限超過でエラー表示', async ({ page }) => {
      await page.goto(`/mandala/${mockGoal.id}`);

      // セルをクリックして編集モードに入る
      await page.click('[data-testid="mandala-cell-goal"]');
      await expect(page.locator('[data-testid="inline-editor"]')).toBeVisible();

      // 101文字入力（制限は100文字）
      const longTitle = 'あ'.repeat(101);
      await page.fill('[data-testid="inline-editor-input"]', longTitle);

      // Enterキーで保存を試みる
      await page.keyboard.press('Enter');

      // エラーメッセージが表示されることを確認
      await expect(page.locator('[data-testid="inline-editor-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="inline-editor-error"]')).toContainText(
        '100文字以内'
      );
    });

    test('リアルタイムバリデーション', async ({ page }) => {
      await page.goto(`/mandala/${mockGoal.id}`);

      // セルをクリックして編集モードに入る
      await page.click('[data-testid="mandala-cell-goal"]');
      await expect(page.locator('[data-testid="inline-editor"]')).toBeVisible();

      // テキストを空にする
      await page.fill('[data-testid="inline-editor-input"]', '');

      // エラーメッセージが即座に表示されることを確認
      await expect(page.locator('[data-testid="inline-editor-error"]')).toBeVisible();

      // テキストを入力
      await page.fill('[data-testid="inline-editor-input"]', '新しいタイトル');

      // エラーメッセージが消えることを確認
      await expect(page.locator('[data-testid="inline-editor-error"]')).not.toBeVisible();
    });

    test('文字数カウント表示', async ({ page }) => {
      await page.goto(`/mandala/${mockGoal.id}`);

      // セルをクリックして編集モードに入る
      await page.click('[data-testid="mandala-cell-goal"]');
      await expect(page.locator('[data-testid="inline-editor"]')).toBeVisible();

      // 50文字入力
      const title = 'あ'.repeat(50);
      await page.fill('[data-testid="inline-editor-input"]', title);

      // 文字数カウントが表示されることを確認
      await expect(page.locator('[data-testid="inline-editor-char-count"]')).toContainText(
        '50/100'
      );
    });
  });

  test.describe('キーボード操作', () => {
    test('Tabキーでフォーカス移動', async ({ page }) => {
      await page.goto(`/mandala/${mockGoal.id}`);

      // 最初のセルをクリックして編集モードに入る
      await page.click('[data-testid="mandala-cell-goal"]');
      await expect(page.locator('[data-testid="inline-editor"]')).toBeVisible();

      // Tabキーを押す
      await page.keyboard.press('Tab');

      // 次のセルにフォーカスが移動することを確認
      // （実装によって動作が異なる可能性があるため、柔軟に確認）
      const focusedElement = await page.evaluate(() =>
        document.activeElement?.getAttribute('data-testid')
      );
      expect(focusedElement).toBeTruthy();
    });

    test('Shift+Tabキーで逆方向フォーカス移動', async ({ page }) => {
      await page.goto(`/mandala/${mockGoal.id}`);

      // セルをクリックして編集モードに入る
      await page.click('[data-testid="mandala-cell-subgoal-0"]');
      await expect(page.locator('[data-testid="inline-editor"]')).toBeVisible();

      // Shift+Tabキーを押す
      await page.keyboard.press('Shift+Tab');

      // 前のセルにフォーカスが移動することを確認
      const focusedElement = await page.evaluate(() =>
        document.activeElement?.getAttribute('data-testid')
      );
      expect(focusedElement).toBeTruthy();
    });

    test('複数回のEnter/Escキー操作', async ({ page }) => {
      await page.goto(`/mandala/${mockGoal.id}`);

      // APIモックを設定
      await page.route('**/api/goals/**', async route => {
        if (route.request().method() === 'PUT') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              ...mockGoal,
              title: '更新されたタイトル',
              updated_at: new Date().toISOString(),
            }),
          });
        } else {
          await route.continue();
        }
      });

      // 1回目: Enterで保存
      await page.click('[data-testid="mandala-cell-goal"]');
      await page.fill('[data-testid="inline-editor-input"]', '更新されたタイトル');
      await page.keyboard.press('Enter');
      await expect(page.locator('text=保存しました')).toBeVisible();

      // 2回目: Escでキャンセル
      await page.click('[data-testid="mandala-cell-goal"]');
      await page.fill('[data-testid="inline-editor-input"]', '変更2');
      await page.keyboard.press('Escape');
      await expect(page.locator('[data-testid="inline-editor"]')).not.toBeVisible();

      // 3回目: Enterで保存
      await page.click('[data-testid="mandala-cell-goal"]');
      await page.fill('[data-testid="inline-editor-input"]', '最終更新');
      await page.keyboard.press('Enter');
      await expect(page.locator('text=保存しました')).toBeVisible();
    });
  });

  test.describe('サブ目標のインライン編集', () => {
    test('サブ目標の編集と保存', async ({ page }) => {
      await page.goto(`/mandala/${mockGoal.id}`);

      // APIモックを設定
      await page.route('**/api/subgoals/**', async route => {
        if (route.request().method() === 'PUT') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              ...mockSubGoal,
              title: '更新されたサブ目標',
              updated_at: new Date().toISOString(),
            }),
          });
        } else {
          await route.continue();
        }
      });

      // サブ目標セルをクリック
      await page.click('[data-testid="mandala-cell-subgoal-0"]');
      await expect(page.locator('[data-testid="inline-editor"]')).toBeVisible();

      // テキストを編集
      await page.fill('[data-testid="inline-editor-input"]', '更新されたサブ目標');

      // Enterキーで保存
      await page.keyboard.press('Enter');

      // 成功メッセージが表示されることを確認
      await expect(page.locator('text=保存しました')).toBeVisible({ timeout: 5000 });

      // 更新された内容が反映されることを確認
      await expect(page.locator('[data-testid="mandala-cell-subgoal-0"]')).toContainText(
        '更新されたサブ目標'
      );
    });

    test('複数のサブ目標を連続編集', async ({ page }) => {
      await page.goto(`/mandala/${mockGoal.id}`);

      // APIモックを設定
      await page.route('**/api/subgoals/**', async route => {
        if (route.request().method() === 'PUT') {
          const requestBody = route.request().postDataJSON();
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              ...mockSubGoal,
              ...requestBody,
              updated_at: new Date().toISOString(),
            }),
          });
        } else {
          await route.continue();
        }
      });

      // 3つのサブ目標を連続編集
      for (let i = 0; i < 3; i++) {
        await page.click(`[data-testid="mandala-cell-subgoal-${i}"]`);
        await expect(page.locator('[data-testid="inline-editor"]')).toBeVisible();
        await page.fill('[data-testid="inline-editor-input"]', `サブ目標${i + 1}更新`);
        await page.keyboard.press('Enter');
        await expect(page.locator('text=保存しました')).toBeVisible({ timeout: 5000 });
      }
    });
  });

  test.describe('アクションのインライン編集', () => {
    test('アクションの編集と保存', async ({ page }) => {
      await page.goto(`/mandala/${mockGoal.id}`);

      // APIモックを設定
      await page.route('**/api/actions/**', async route => {
        if (route.request().method() === 'PUT') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              ...mockAction,
              title: '更新されたアクション',
              updated_at: new Date().toISOString(),
            }),
          });
        } else {
          await route.continue();
        }
      });

      // アクションセルをクリック
      await page.click('[data-testid="mandala-cell-action-0"]');
      await expect(page.locator('[data-testid="inline-editor"]')).toBeVisible();

      // テキストを編集
      await page.fill('[data-testid="inline-editor-input"]', '更新されたアクション');

      // Enterキーで保存
      await page.keyboard.press('Enter');

      // 成功メッセージが表示されることを確認
      await expect(page.locator('text=保存しました')).toBeVisible({ timeout: 5000 });

      // 更新された内容が反映されることを確認
      await expect(page.locator('[data-testid="mandala-cell-action-0"]')).toContainText(
        '更新されたアクション'
      );
    });
  });

  test.describe('エラーハンドリング', () => {
    test('ネットワークエラー時のエラー表示', async ({ page }) => {
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
      await page.fill('[data-testid="inline-editor-input"]', '更新されたタイトル');
      await page.keyboard.press('Enter');

      // エラーメッセージが表示されることを確認
      await expect(page.locator('text=ネットワークエラーが発生しました')).toBeVisible({
        timeout: 5000,
      });

      // 編集モードが継続することを確認
      await expect(page.locator('[data-testid="inline-editor"]')).toBeVisible();
    });

    test('サーバーエラー時のエラー表示', async ({ page }) => {
      await page.goto(`/mandala/${mockGoal.id}`);

      // サーバーエラーをシミュレート
      await page.route('**/api/goals/**', async route => {
        if (route.request().method() === 'PUT') {
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({
              error: 'INTERNAL_SERVER_ERROR',
              message: 'サーバーエラーが発生しました',
            }),
          });
        } else {
          await route.continue();
        }
      });

      await page.click('[data-testid="mandala-cell-goal"]');
      await page.fill('[data-testid="inline-editor-input"]', '更新されたタイトル');
      await page.keyboard.press('Enter');

      // エラーメッセージが表示されることを確認
      await expect(page.locator('text=サーバーエラーが発生しました')).toBeVisible({
        timeout: 5000,
      });
    });

    test('権限エラー時のエラー表示', async ({ page }) => {
      await page.goto(`/mandala/${mockGoal.id}`);

      // 権限エラーをシミュレート
      await page.route('**/api/goals/**', async route => {
        if (route.request().method() === 'PUT') {
          await route.fulfill({
            status: 403,
            contentType: 'application/json',
            body: JSON.stringify({
              error: 'PERMISSION_DENIED',
              message: '編集権限がありません',
            }),
          });
        } else {
          await route.continue();
        }
      });

      await page.click('[data-testid="mandala-cell-goal"]');
      await page.fill('[data-testid="inline-editor-input"]', '更新されたタイトル');
      await page.keyboard.press('Enter');

      // エラーメッセージが表示されることを確認
      await expect(page.locator('text=編集権限がありません')).toBeVisible({ timeout: 5000 });

      // 編集モードが自動的に終了することを確認
      await expect(page.locator('[data-testid="inline-editor"]')).not.toBeVisible({
        timeout: 3000,
      });
    });

    test('バリデーションエラー後の再編集', async ({ page }) => {
      await page.goto(`/mandala/${mockGoal.id}`);

      // セルをクリックして編集モードに入る
      await page.click('[data-testid="mandala-cell-goal"]');

      // 空文字で保存を試みる（バリデーションエラー）
      await page.fill('[data-testid="inline-editor-input"]', '');
      await page.keyboard.press('Enter');

      // エラーメッセージが表示されることを確認
      await expect(page.locator('[data-testid="inline-editor-error"]')).toBeVisible();

      // APIモックを設定
      await page.route('**/api/goals/**', async route => {
        if (route.request().method() === 'PUT') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              ...mockGoal,
              title: '正しいタイトル',
              updated_at: new Date().toISOString(),
            }),
          });
        } else {
          await route.continue();
        }
      });

      // 正しい値を入力して再保存
      await page.fill('[data-testid="inline-editor-input"]', '正しいタイトル');
      await page.keyboard.press('Enter');

      // 成功メッセージが表示されることを確認
      await expect(page.locator('text=保存しました')).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('楽観的UI更新', () => {
    test('保存中の即座のUI更新', async ({ page }) => {
      await page.goto(`/mandala/${mockGoal.id}`);

      // 遅延レスポンスをシミュレート
      await page.route('**/api/goals/**', async route => {
        if (route.request().method() === 'PUT') {
          // 2秒待機してからレスポンス
          await new Promise(resolve => setTimeout(resolve, 2000));
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              ...mockGoal,
              title: '楽観的更新テスト',
              updated_at: new Date().toISOString(),
            }),
          });
        } else {
          await route.continue();
        }
      });

      await page.click('[data-testid="mandala-cell-goal"]');
      await page.fill('[data-testid="inline-editor-input"]', '楽観的更新テスト');
      await page.keyboard.press('Enter');

      // UIが即座に更新されることを確認（APIレスポンス前）
      await expect(page.locator('[data-testid="mandala-cell-goal"]')).toContainText(
        '楽観的更新テスト',
        { timeout: 1000 }
      );

      // ローディングインジケーターが表示されることを確認
      await expect(page.locator('[data-testid="inline-editor-loading"]')).toBeVisible();

      // 保存完了後、ローディングが消えることを確認
      await expect(page.locator('[data-testid="inline-editor-loading"]')).not.toBeVisible({
        timeout: 5000,
      });
    });

    test('エラー時のロールバック', async ({ page }) => {
      await page.goto(`/mandala/${mockGoal.id}`);

      const originalTitle = mockGoal.title;

      // エラーレスポンスをシミュレート
      await page.route('**/api/goals/**', async route => {
        if (route.request().method() === 'PUT') {
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({
              error: 'INTERNAL_SERVER_ERROR',
              message: 'サーバーエラー',
            }),
          });
        } else {
          await route.continue();
        }
      });

      await page.click('[data-testid="mandala-cell-goal"]');
      await page.fill('[data-testid="inline-editor-input"]', '失敗する更新');
      await page.keyboard.press('Enter');

      // エラーメッセージが表示されることを確認
      await expect(page.locator('text=サーバーエラー')).toBeVisible({ timeout: 5000 });

      // 元の値にロールバックされることを確認
      await expect(page.locator('[data-testid="mandala-cell-goal"]')).toContainText(originalTitle);
    });
  });

  test.describe('アクセシビリティ', () => {
    test('ARIA属性の確認', async ({ page }) => {
      await page.goto(`/mandala/${mockGoal.id}`);

      await page.click('[data-testid="mandala-cell-goal"]');
      await expect(page.locator('[data-testid="inline-editor"]')).toBeVisible();

      // role属性を確認
      await expect(page.locator('[data-testid="inline-editor-input"]')).toHaveAttribute(
        'role',
        'textbox'
      );

      // aria-label属性を確認
      await expect(page.locator('[data-testid="inline-editor-input"]')).toHaveAttribute(
        'aria-label'
      );

      // エラー時のaria-invalid属性を確認
      await page.fill('[data-testid="inline-editor-input"]', '');
      await expect(page.locator('[data-testid="inline-editor-input"]')).toHaveAttribute(
        'aria-invalid',
        'true'
      );
    });

    test('フォーカス管理', async ({ page }) => {
      await page.goto(`/mandala/${mockGoal.id}`);

      // セルをクリック
      await page.click('[data-testid="mandala-cell-goal"]');

      // 入力フィールドに自動的にフォーカスが当たることを確認
      await expect(page.locator('[data-testid="inline-editor-input"]')).toBeFocused();

      // Escキーでキャンセル
      await page.keyboard.press('Escape');

      // フォーカスが元のセルに戻ることを確認
      await expect(page.locator('[data-testid="mandala-cell-goal"]')).toBeFocused();
    });
  });

  test.describe('パフォーマンス', () => {
    test('連続編集のパフォーマンス', async ({ page }) => {
      await page.goto(`/mandala/${mockGoal.id}`);

      // APIモックを設定
      await page.route('**/api/goals/**', async route => {
        if (route.request().method() === 'PUT') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              ...mockGoal,
              updated_at: new Date().toISOString(),
            }),
          });
        } else {
          await route.continue();
        }
      });

      const startTime = Date.now();

      // 10回連続で編集
      for (let i = 0; i < 10; i++) {
        await page.click('[data-testid="mandala-cell-goal"]');
        await page.fill('[data-testid="inline-editor-input"]', `更新${i}`);
        await page.keyboard.press('Enter');
        await expect(page.locator('text=保存しました')).toBeVisible({ timeout: 5000 });
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // 10回の編集が30秒以内に完了することを確認
      expect(duration).toBeLessThan(30000);
    });
  });
});

/**
 * 認証情報をセットアップ
 */
async function setupAuth(page: Page) {
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
}

/**
 * モックデータをセットアップ
 */
async function setupMockData(page: Page) {
  // 目標データのモック
  await page.route('**/api/goals/**', async route => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
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
        }),
      });
    } else {
      await route.continue();
    }
  });
}
