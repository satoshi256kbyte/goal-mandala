import { test, expect, Page } from '@playwright/test';

/**
 * E2Eテスト: モーダル編集機能
 *
 * このテストはEditModalコンポーネントを使用した詳細編集機能を検証します。
 * 目標、サブ目標、アクションの全フィールドを編集できることを確認します。
 *
 * テスト対象:
 * - EditModalコンポーネント
 * - フォーム入力とバリデーション
 * - 保存・キャンセル処理
 * - エラーハンドリング
 *
 * 実装が必要なコンポーネント:
 * - EditModal (モーダル編集)
 * - フォームバリデーション
 * - エラー表示
 *
 * 実装が必要なAPI:
 * - PUT /api/goals/:goalId
 * - PUT /api/subgoals/:subGoalId
 * - PUT /api/actions/:actionId
 */

test.describe('Edit Modal E2E Tests', () => {
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

  test.describe('目標編集モーダル', () => {
    test('編集ボタンクリックでモーダルが開く', async ({ page }) => {
      await page.goto(`/mandala/${mockGoal.id}`);

      // 編集ボタンをクリック
      await page.click('[data-testid="edit-button-goal"]');

      // モーダルが表示されることを確認
      await expect(page.locator('[data-testid="edit-modal"]')).toBeVisible();
      await expect(page.locator('[data-testid="modal-title"]')).toContainText('目標を編集');

      // 初期値が正しく表示されることを確認
      await expect(page.locator('[data-testid="modal-title-input"]')).toHaveValue(mockGoal.title);
      await expect(page.locator('[data-testid="modal-description-input"]')).toHaveValue(
        mockGoal.description
      );
      await expect(page.locator('[data-testid="modal-deadline-input"]')).toHaveValue(
        mockGoal.deadline
      );
      await expect(page.locator('[data-testid="modal-background-input"]')).toHaveValue(
        mockGoal.background
      );
      await expect(page.locator('[data-testid="modal-constraints-input"]')).toHaveValue(
        mockGoal.constraints
      );
    });

    test('全フィールドを編集して保存', async ({ page }) => {
      await page.goto(`/mandala/${mockGoal.id}`);

      // モーダルを開く
      await page.click('[data-testid="edit-button-goal"]');
      await expect(page.locator('[data-testid="edit-modal"]')).toBeVisible();

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

      // 各フィールドを編集
      await page.fill('[data-testid="modal-title-input"]', '更新された目標タイトル');
      await page.fill('[data-testid="modal-description-input"]', '更新された目標説明');
      await page.fill('[data-testid="modal-deadline-input"]', '2025-06-30');
      await page.fill('[data-testid="modal-background-input"]', '更新された背景情報');
      await page.fill('[data-testid="modal-constraints-input"]', '更新された制約事項');

      // 保存ボタンをクリック
      await page.click('[data-testid="modal-save-button"]');

      // 成功メッセージが表示されることを確認
      await expect(page.locator('text=保存しました')).toBeVisible({ timeout: 5000 });

      // モーダルが閉じることを確認
      await expect(page.locator('[data-testid="edit-modal"]')).not.toBeVisible();

      // 更新された内容が反映されることを確認
      await expect(page.locator('[data-testid="mandala-cell-goal"]')).toContainText(
        '更新された目標タイトル'
      );
    });

    test('キャンセルボタンで変更を破棄', async ({ page }) => {
      await page.goto(`/mandala/${mockGoal.id}`);

      // モーダルを開く
      await page.click('[data-testid="edit-button-goal"]');
      await expect(page.locator('[data-testid="edit-modal"]')).toBeVisible();

      // フィールドを編集
      await page.fill('[data-testid="modal-title-input"]', '変更されたタイトル');
      await page.fill('[data-testid="modal-description-input"]', '変更された説明');

      // キャンセルボタンをクリック
      await page.click('[data-testid="modal-cancel-button"]');

      // モーダルが閉じることを確認
      await expect(page.locator('[data-testid="edit-modal"]')).not.toBeVisible();

      // 元の内容が保持されることを確認
      await expect(page.locator('[data-testid="mandala-cell-goal"]')).toContainText(mockGoal.title);
    });

    test('モーダル外クリックで閉じる', async ({ page }) => {
      await page.goto(`/mandala/${mockGoal.id}`);

      // モーダルを開く
      await page.click('[data-testid="edit-button-goal"]');
      await expect(page.locator('[data-testid="edit-modal"]')).toBeVisible();

      // モーダルの背景（オーバーレイ）をクリック
      await page.click('[data-testid="modal-overlay"]');

      // モーダルが閉じることを確認
      await expect(page.locator('[data-testid="edit-modal"]')).not.toBeVisible();
    });

    test('Escキーでモーダルを閉じる', async ({ page }) => {
      await page.goto(`/mandala/${mockGoal.id}`);

      // モーダルを開く
      await page.click('[data-testid="edit-button-goal"]');
      await expect(page.locator('[data-testid="edit-modal"]')).toBeVisible();

      // Escキーを押す
      await page.keyboard.press('Escape');

      // モーダルが閉じることを確認
      await expect(page.locator('[data-testid="edit-modal"]')).not.toBeVisible();
    });
  });

  test.describe('フォームバリデーション', () => {
    test('必須フィールドが空の場合エラー表示', async ({ page }) => {
      await page.goto(`/mandala/${mockGoal.id}`);

      // モーダルを開く
      await page.click('[data-testid="edit-button-goal"]');
      await expect(page.locator('[data-testid="edit-modal"]')).toBeVisible();

      // タイトルを空にする
      await page.fill('[data-testid="modal-title-input"]', '');

      // 保存ボタンをクリック
      await page.click('[data-testid="modal-save-button"]');

      // エラーメッセージが表示されることを確認
      await expect(page.locator('text=タイトルは必須です')).toBeVisible();

      // モーダルが閉じないことを確認
      await expect(page.locator('[data-testid="edit-modal"]')).toBeVisible();
    });

    test('文字数制限を超えた場合エラー表示', async ({ page }) => {
      await page.goto(`/mandala/${mockGoal.id}`);

      // モーダルを開く
      await page.click('[data-testid="edit-button-goal"]');
      await expect(page.locator('[data-testid="edit-modal"]')).toBeVisible();

      // タイトルに101文字入力（制限は100文字）
      const longTitle = 'あ'.repeat(101);
      await page.fill('[data-testid="modal-title-input"]', longTitle);

      // 保存ボタンをクリック
      await page.click('[data-testid="modal-save-button"]');

      // エラーメッセージが表示されることを確認
      await expect(page.locator('text=タイトルは100文字以内で入力してください')).toBeVisible();
    });

    test('達成期限が過去の日付の場合エラー表示', async ({ page }) => {
      await page.goto(`/mandala/${mockGoal.id}`);

      // モーダルを開く
      await page.click('[data-testid="edit-button-goal"]');
      await expect(page.locator('[data-testid="edit-modal"]')).toBeVisible();

      // 過去の日付を入力
      await page.fill('[data-testid="modal-deadline-input"]', '2020-01-01');

      // 保存ボタンをクリック
      await page.click('[data-testid="modal-save-button"]');

      // エラーメッセージが表示されることを確認
      await expect(page.locator('text=達成期限は未来の日付を指定してください')).toBeVisible();
    });

    test('リアルタイムバリデーション', async ({ page }) => {
      await page.goto(`/mandala/${mockGoal.id}`);

      // モーダルを開く
      await page.click('[data-testid="edit-button-goal"]');
      await expect(page.locator('[data-testid="edit-modal"]')).toBeVisible();

      // タイトルを空にする
      await page.fill('[data-testid="modal-title-input"]', '');

      // フォーカスを外す
      await page.click('[data-testid="modal-description-input"]');

      // エラーメッセージが即座に表示されることを確認
      await expect(page.locator('text=タイトルは必須です')).toBeVisible();

      // タイトルを入力
      await page.fill('[data-testid="modal-title-input"]', '新しいタイトル');

      // エラーメッセージが消えることを確認
      await expect(page.locator('text=タイトルは必須です')).not.toBeVisible();
    });

    test('文字数カウント表示', async ({ page }) => {
      await page.goto(`/mandala/${mockGoal.id}`);

      // モーダルを開く
      await page.click('[data-testid="edit-button-goal"]');
      await expect(page.locator('[data-testid="edit-modal"]')).toBeVisible();

      // タイトルに50文字入力
      const title = 'あ'.repeat(50);
      await page.fill('[data-testid="modal-title-input"]', title);

      // 文字数カウントが表示されることを確認
      await expect(page.locator('[data-testid="title-char-count"]')).toContainText('50/100');
    });
  });

  test.describe('サブ目標編集モーダル', () => {
    test('サブ目標の全フィールドを編集', async ({ page }) => {
      await page.goto(`/mandala/${mockGoal.id}`);

      // サブ目標の編集ボタンをクリック
      await page.click('[data-testid="edit-button-subgoal-0"]');

      // モーダルが表示されることを確認
      await expect(page.locator('[data-testid="edit-modal"]')).toBeVisible();
      await expect(page.locator('[data-testid="modal-title"]')).toContainText('サブ目標を編集');

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

      // 各フィールドを編集
      await page.fill('[data-testid="modal-title-input"]', '更新されたサブ目標');
      await page.fill('[data-testid="modal-description-input"]', '更新されたサブ目標説明');
      await page.fill('[data-testid="modal-background-input"]', '更新されたサブ目標背景');
      await page.fill('[data-testid="modal-constraints-input"]', '更新されたサブ目標制約');

      // 保存ボタンをクリック
      await page.click('[data-testid="modal-save-button"]');

      // 成功メッセージが表示されることを確認
      await expect(page.locator('text=保存しました')).toBeVisible({ timeout: 5000 });

      // モーダルが閉じることを確認
      await expect(page.locator('[data-testid="edit-modal"]')).not.toBeVisible();
    });
  });

  test.describe('アクション編集モーダル', () => {
    test('アクションの全フィールドを編集', async ({ page }) => {
      await page.goto(`/mandala/${mockGoal.id}`);

      // アクションの編集ボタンをクリック
      await page.click('[data-testid="edit-button-action-0"]');

      // モーダルが表示されることを確認
      await expect(page.locator('[data-testid="edit-modal"]')).toBeVisible();
      await expect(page.locator('[data-testid="modal-title"]')).toContainText('アクションを編集');

      // APIモックを設定
      await page.route('**/api/actions/**', async route => {
        if (route.request().method() === 'PUT') {
          const requestBody = route.request().postDataJSON();
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              ...mockAction,
              ...requestBody,
              updated_at: new Date().toISOString(),
            }),
          });
        } else {
          await route.continue();
        }
      });

      // 各フィールドを編集
      await page.fill('[data-testid="modal-title-input"]', '更新されたアクション');
      await page.fill('[data-testid="modal-description-input"]', '更新されたアクション説明');
      await page.fill('[data-testid="modal-background-input"]', '更新されたアクション背景');
      await page.fill('[data-testid="modal-constraints-input"]', '更新されたアクション制約');

      // アクション種別を変更
      await page.selectOption('[data-testid="modal-type-select"]', 'habit');

      // 保存ボタンをクリック
      await page.click('[data-testid="modal-save-button"]');

      // 成功メッセージが表示されることを確認
      await expect(page.locator('text=保存しました')).toBeVisible({ timeout: 5000 });

      // モーダルが閉じることを確認
      await expect(page.locator('[data-testid="edit-modal"]')).not.toBeVisible();
    });

    test('アクション種別の選択', async ({ page }) => {
      await page.goto(`/mandala/${mockGoal.id}`);

      // アクションの編集ボタンをクリック
      await page.click('[data-testid="edit-button-action-0"]');
      await expect(page.locator('[data-testid="edit-modal"]')).toBeVisible();

      // 種別セレクトボックスが表示されることを確認
      await expect(page.locator('[data-testid="modal-type-select"]')).toBeVisible();

      // 初期値が正しいことを確認
      await expect(page.locator('[data-testid="modal-type-select"]')).toHaveValue('execution');

      // 習慣アクションに変更
      await page.selectOption('[data-testid="modal-type-select"]', 'habit');
      await expect(page.locator('[data-testid="modal-type-select"]')).toHaveValue('habit');

      // 実行アクションに戻す
      await page.selectOption('[data-testid="modal-type-select"]', 'execution');
      await expect(page.locator('[data-testid="modal-type-select"]')).toHaveValue('execution');
    });
  });

  test.describe('エラーハンドリング', () => {
    test('ネットワークエラー時のエラー表示', async ({ page }) => {
      await page.goto(`/mandala/${mockGoal.id}`);

      // モーダルを開く
      await page.click('[data-testid="edit-button-goal"]');
      await expect(page.locator('[data-testid="edit-modal"]')).toBeVisible();

      // ネットワークエラーをシミュレート
      await page.route('**/api/goals/**', async route => {
        if (route.request().method() === 'PUT') {
          await route.abort('failed');
        } else {
          await route.continue();
        }
      });

      // フィールドを編集
      await page.fill('[data-testid="modal-title-input"]', '更新されたタイトル');

      // 保存ボタンをクリック
      await page.click('[data-testid="modal-save-button"]');

      // エラーメッセージが表示されることを確認
      await expect(page.locator('text=ネットワークエラーが発生しました')).toBeVisible({
        timeout: 5000,
      });

      // モーダルが開いたままであることを確認
      await expect(page.locator('[data-testid="edit-modal"]')).toBeVisible();
    });

    test('サーバーエラー時のエラー表示', async ({ page }) => {
      await page.goto(`/mandala/${mockGoal.id}`);

      // モーダルを開く
      await page.click('[data-testid="edit-button-goal"]');
      await expect(page.locator('[data-testid="edit-modal"]')).toBeVisible();

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

      // フィールドを編集
      await page.fill('[data-testid="modal-title-input"]', '更新されたタイトル');

      // 保存ボタンをクリック
      await page.click('[data-testid="modal-save-button"]');

      // エラーメッセージが表示されることを確認
      await expect(page.locator('text=サーバーエラーが発生しました')).toBeVisible({
        timeout: 5000,
      });
    });

    test('権限エラー時のエラー表示', async ({ page }) => {
      await page.goto(`/mandala/${mockGoal.id}`);

      // モーダルを開く
      await page.click('[data-testid="edit-button-goal"]');
      await expect(page.locator('[data-testid="edit-modal"]')).toBeVisible();

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

      // フィールドを編集
      await page.fill('[data-testid="modal-title-input"]', '更新されたタイトル');

      // 保存ボタンをクリック
      await page.click('[data-testid="modal-save-button"]');

      // エラーメッセージが表示されることを確認
      await expect(page.locator('text=編集権限がありません')).toBeVisible({ timeout: 5000 });

      // モーダルが自動的に閉じることを確認
      await expect(page.locator('[data-testid="edit-modal"]')).not.toBeVisible({
        timeout: 3000,
      });
    });
  });

  test.describe('保存中の状態表示', () => {
    test('保存中はボタンが無効化される', async ({ page }) => {
      await page.goto(`/mandala/${mockGoal.id}`);

      // モーダルを開く
      await page.click('[data-testid="edit-button-goal"]');
      await expect(page.locator('[data-testid="edit-modal"]')).toBeVisible();

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
              title: '更新されたタイトル',
              updated_at: new Date().toISOString(),
            }),
          });
        } else {
          await route.continue();
        }
      });

      // フィールドを編集
      await page.fill('[data-testid="modal-title-input"]', '更新されたタイトル');

      // 保存ボタンをクリック
      await page.click('[data-testid="modal-save-button"]');

      // 保存中はボタンが無効化されることを確認
      await expect(page.locator('[data-testid="modal-save-button"]')).toBeDisabled();

      // ローディングインジケーターが表示されることを確認
      await expect(page.locator('[data-testid="modal-loading"]')).toBeVisible();

      // 保存完了後、ボタンが有効化されることを確認
      await expect(page.locator('[data-testid="modal-save-button"]')).toBeEnabled({
        timeout: 5000,
      });
    });

    test('保存中はキャンセルボタンも無効化される', async ({ page }) => {
      await page.goto(`/mandala/${mockGoal.id}`);

      // モーダルを開く
      await page.click('[data-testid="edit-button-goal"]');
      await expect(page.locator('[data-testid="edit-modal"]')).toBeVisible();

      // 遅延レスポンスをシミュレート
      await page.route('**/api/goals/**', async route => {
        if (route.request().method() === 'PUT') {
          await new Promise(resolve => setTimeout(resolve, 1000));
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

      // フィールドを編集
      await page.fill('[data-testid="modal-title-input"]', '更新されたタイトル');

      // 保存ボタンをクリック
      await page.click('[data-testid="modal-save-button"]');

      // キャンセルボタンも無効化されることを確認
      await expect(page.locator('[data-testid="modal-cancel-button"]')).toBeDisabled();
    });
  });

  test.describe('複数フィールドの同時編集', () => {
    test('複数フィールドを一度に編集して保存', async ({ page }) => {
      await page.goto(`/mandala/${mockGoal.id}`);

      // モーダルを開く
      await page.click('[data-testid="edit-button-goal"]');
      await expect(page.locator('[data-testid="edit-modal"]')).toBeVisible();

      // APIモックを設定
      let savedData: any = null;
      await page.route('**/api/goals/**', async route => {
        if (route.request().method() === 'PUT') {
          savedData = route.request().postDataJSON();
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              ...mockGoal,
              ...savedData,
              updated_at: new Date().toISOString(),
            }),
          });
        } else {
          await route.continue();
        }
      });

      // 全フィールドを編集
      const newData = {
        title: '完全に更新された目標',
        description: '完全に更新された説明文です',
        deadline: '2025-12-31',
        background: '完全に更新された背景情報です',
        constraints: '完全に更新された制約事項です',
      };

      await page.fill('[data-testid="modal-title-input"]', newData.title);
      await page.fill('[data-testid="modal-description-input"]', newData.description);
      await page.fill('[data-testid="modal-deadline-input"]', newData.deadline);
      await page.fill('[data-testid="modal-background-input"]', newData.background);
      await page.fill('[data-testid="modal-constraints-input"]', newData.constraints);

      // 保存ボタンをクリック
      await page.click('[data-testid="modal-save-button"]');

      // 成功メッセージが表示されることを確認
      await expect(page.locator('text=保存しました')).toBeVisible({ timeout: 5000 });

      // 全てのデータが正しく送信されたことを確認
      expect(savedData).toMatchObject(newData);
    });
  });

  test.describe('アクセシビリティ', () => {
    test('キーボードナビゲーション', async ({ page }) => {
      await page.goto(`/mandala/${mockGoal.id}`);

      // モーダルを開く
      await page.click('[data-testid="edit-button-goal"]');
      await expect(page.locator('[data-testid="edit-modal"]')).toBeVisible();

      // 最初のフィールドにフォーカスがあることを確認
      await expect(page.locator('[data-testid="modal-title-input"]')).toBeFocused();

      // Tabキーでフィールド間を移動
      await page.keyboard.press('Tab');
      await expect(page.locator('[data-testid="modal-description-input"]')).toBeFocused();

      await page.keyboard.press('Tab');
      await expect(page.locator('[data-testid="modal-deadline-input"]')).toBeFocused();

      await page.keyboard.press('Tab');
      await expect(page.locator('[data-testid="modal-background-input"]')).toBeFocused();

      await page.keyboard.press('Tab');
      await expect(page.locator('[data-testid="modal-constraints-input"]')).toBeFocused();
    });

    test('ARIA属性の確認', async ({ page }) => {
      await page.goto(`/mandala/${mockGoal.id}`);

      // モーダルを開く
      await page.click('[data-testid="edit-button-goal"]');
      await expect(page.locator('[data-testid="edit-modal"]')).toBeVisible();

      // モーダルのrole属性を確認
      await expect(page.locator('[data-testid="edit-modal"]')).toHaveAttribute('role', 'dialog');

      // aria-labelledby属性を確認
      await expect(page.locator('[data-testid="edit-modal"]')).toHaveAttribute(
        'aria-labelledby',
        'modal-title'
      );

      // 各入力フィールドのaria-label属性を確認
      await expect(page.locator('[data-testid="modal-title-input"]')).toHaveAttribute(
        'aria-label',
        '目標タイトル'
      );
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

  // サブ目標データのモック
  await page.route('**/api/subgoals/**', async route => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
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
        }),
      });
    } else {
      await route.continue();
    }
  });

  // アクションデータのモック
  await page.route('**/api/actions/**', async route => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'test-action-id',
          sub_goal_id: 'test-subgoal-id',
          title: 'アクションタイトル',
          description: 'アクションの説明文',
          background: 'アクションの背景情報',
          constraints: 'アクションの制約事項',
          type: 'execution',
          position: 0,
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
