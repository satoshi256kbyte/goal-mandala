import { test, expect, Page } from '@playwright/test';

/**
 * E2Eテスト: 変更履歴機能
 *
 * このテストは変更履歴の表示、差分確認、ロールバック機能を検証します。
 *
 * 注意: これらのテストは編集機能と履歴機能の実装が完了するまでスキップされます。
 * 実装完了後、test.skip を test に変更してテストを有効化してください。
 *
 * 実装が必要なコンポーネント:
 * - HistoryPanel (変更履歴パネル)
 * - HistoryEntry (履歴エントリ表示)
 * - DiffViewer (差分表示)
 *
 * 実装が必要なAPI:
 * - GET /api/goals/:goalId/history (目標の変更履歴取得)
 * - GET /api/subgoals/:subGoalId/history (サブ目標の変更履歴取得)
 * - GET /api/actions/:actionId/history (アクションの変更履歴取得)
 * - POST /api/goals/:goalId/rollback (目標のロールバック - 管理者のみ)
 */

test.describe.skip('Edit History E2E Tests', () => {
  // テスト用のモックデータ
  const mockGoal = {
    id: 'test-goal-id',
    title: '現在のタイトル',
    description: '現在の説明',
    deadline: '2024-12-31',
    background: '現在の背景',
    constraints: '現在の制約',
    updated_at: '2024-01-15T12:00:00Z',
    user_id: 'test-user-id',
  };

  const mockHistory = [
    {
      id: 'history-1',
      entityType: 'goal',
      entityId: 'test-goal-id',
      userId: 'test-user-id',
      userName: '山田太郎',
      changedAt: '2024-01-15T12:00:00Z',
      changes: [
        {
          field: 'title',
          oldValue: '以前のタイトル',
          newValue: '現在のタイトル',
        },
        {
          field: 'description',
          oldValue: '以前の説明',
          newValue: '現在の説明',
        },
      ],
    },
    {
      id: 'history-2',
      entityType: 'goal',
      entityId: 'test-goal-id',
      userId: 'test-user-id',
      userName: '山田太郎',
      changedAt: '2024-01-15T10:00:00Z',
      changes: [
        {
          field: 'title',
          oldValue: '最初のタイトル',
          newValue: '以前のタイトル',
        },
      ],
    },
    {
      id: 'history-3',
      entityType: 'goal',
      entityId: 'test-goal-id',
      userId: 'test-user-id',
      userName: '山田太郎',
      changedAt: '2024-01-15T08:00:00Z',
      changes: [
        {
          field: 'background',
          oldValue: '最初の背景',
          newValue: '現在の背景',
        },
      ],
    },
  ];

  test.beforeEach(async ({ page }) => {
    // 認証をセットアップ
    await setupAuthForPage(page, false); // 通常ユーザー

    // 目標データをモック
    await page.route('**/api/goals/**', async route => {
      const url = route.request().url();
      if (url.includes('/history')) {
        // 履歴取得API
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            history: mockHistory,
            total: mockHistory.length,
            limit: 20,
            offset: 0,
          }),
        });
      } else if (route.request().method() === 'GET') {
        // 目標取得API
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

  test('履歴ボタンをクリックして履歴パネルを表示', async ({ page }) => {
    await page.goto(`/mandala/${mockGoal.id}`);

    // マンダラチャートが表示されることを確認
    await expect(page.locator('[data-testid="mandala-cell-goal"]')).toBeVisible();

    // 履歴ボタンをクリック
    await page.click('[data-testid="history-button-goal"]');

    // 履歴パネルが表示されることを確認
    await expect(page.locator('[data-testid="history-panel"]')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=変更履歴')).toBeVisible();
  });

  test('変更履歴一覧が正しく表示される', async ({ page }) => {
    await page.goto(`/mandala/${mockGoal.id}`);

    // 履歴パネルを開く
    await page.click('[data-testid="history-button-goal"]');
    await expect(page.locator('[data-testid="history-panel"]')).toBeVisible();

    // 履歴エントリが表示されることを確認
    for (const history of mockHistory) {
      await expect(page.locator(`[data-testid="history-entry-${history.id}"]`)).toBeVisible();
    }

    // 最新の履歴が一番上に表示されることを確認
    const firstEntry = page.locator('[data-testid^="history-entry-"]').first();
    await expect(firstEntry).toContainText('山田太郎');
    await expect(firstEntry).toContainText('2024-01-15');
  });

  test('履歴エントリをクリックして詳細を表示', async ({ page }) => {
    await page.goto(`/mandala/${mockGoal.id}`);

    // 履歴パネルを開く
    await page.click('[data-testid="history-button-goal"]');
    await expect(page.locator('[data-testid="history-panel"]')).toBeVisible();

    // 最初の履歴エントリをクリック
    await page.click('[data-testid="history-entry-history-1"]');

    // 詳細モーダルが表示されることを確認
    await expect(page.locator('[data-testid="history-detail-modal"]')).toBeVisible({
      timeout: 5000,
    });
    await expect(page.locator('text=変更詳細')).toBeVisible();
  });

  test('差分表示が正しく動作する', async ({ page }) => {
    await page.goto(`/mandala/${mockGoal.id}`);

    // 履歴パネルを開く
    await page.click('[data-testid="history-button-goal"]');
    await expect(page.locator('[data-testid="history-panel"]')).toBeVisible();

    // 最初の履歴エントリをクリック
    await page.click('[data-testid="history-entry-history-1"]');
    await expect(page.locator('[data-testid="history-detail-modal"]')).toBeVisible();

    // 差分表示を確認
    await expect(page.locator('[data-testid="diff-viewer"]')).toBeVisible();

    // タイトルの変更が表示されることを確認
    await expect(page.locator('text=title')).toBeVisible();
    await expect(page.locator('[data-testid="diff-old-value"]')).toContainText('以前のタイトル');
    await expect(page.locator('[data-testid="diff-new-value"]')).toContainText('現在のタイトル');

    // 説明の変更が表示されることを確認
    await expect(page.locator('text=description')).toBeVisible();
    await expect(page.locator('[data-testid="diff-old-value"]').nth(1)).toContainText('以前の説明');
    await expect(page.locator('[data-testid="diff-new-value"]').nth(1)).toContainText('現在の説明');
  });

  test('複数フィールドの変更が正しく表示される', async ({ page }) => {
    await page.goto(`/mandala/${mockGoal.id}`);

    // 履歴パネルを開く
    await page.click('[data-testid="history-button-goal"]');
    await expect(page.locator('[data-testid="history-panel"]')).toBeVisible();

    // 複数フィールドが変更された履歴エントリをクリック
    await page.click('[data-testid="history-entry-history-1"]');
    await expect(page.locator('[data-testid="history-detail-modal"]')).toBeVisible();

    // 変更されたフィールド数が表示されることを確認
    await expect(page.locator('text=2件の変更')).toBeVisible();

    // 各フィールドの変更が表示されることを確認
    const diffItems = page.locator('[data-testid="diff-item"]');
    await expect(diffItems).toHaveCount(2);
  });

  test('ページネーションが正しく動作する', async ({ page }) => {
    // 大量の履歴データを作成
    const largeHistory = Array.from({ length: 25 }, (_, i) => ({
      id: `history-${i + 1}`,
      entityType: 'goal',
      entityId: 'test-goal-id',
      userId: 'test-user-id',
      userName: '山田太郎',
      changedAt: new Date(Date.now() - i * 3600000).toISOString(),
      changes: [
        {
          field: 'title',
          oldValue: `タイトル${i}`,
          newValue: `タイトル${i + 1}`,
        },
      ],
    }));

    await page.route('**/api/goals/**/history*', async route => {
      const url = new URL(route.request().url());
      const offset = parseInt(url.searchParams.get('offset') || '0');
      const limit = parseInt(url.searchParams.get('limit') || '20');

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          history: largeHistory.slice(offset, offset + limit),
          total: largeHistory.length,
          limit,
          offset,
        }),
      });
    });

    await page.goto(`/mandala/${mockGoal.id}`);

    // 履歴パネルを開く
    await page.click('[data-testid="history-button-goal"]');
    await expect(page.locator('[data-testid="history-panel"]')).toBeVisible();

    // 最初のページに20件表示されることを確認
    const entries = page.locator('[data-testid^="history-entry-"]');
    await expect(entries).toHaveCount(20);

    // 次のページボタンが表示されることを確認
    await expect(page.locator('[data-testid="pagination-next"]')).toBeVisible();

    // 次のページに移動
    await page.click('[data-testid="pagination-next"]');

    // 2ページ目のデータが表示されることを確認
    await expect(entries).toHaveCount(5); // 残り5件
  });

  test('履歴がない場合のメッセージ表示', async ({ page }) => {
    // 空の履歴データをモック
    await page.route('**/api/goals/**/history*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          history: [],
          total: 0,
          limit: 20,
          offset: 0,
        }),
      });
    });

    await page.goto(`/mandala/${mockGoal.id}`);

    // 履歴パネルを開く
    await page.click('[data-testid="history-button-goal"]');
    await expect(page.locator('[data-testid="history-panel"]')).toBeVisible();

    // 履歴がないメッセージが表示されることを確認
    await expect(page.locator('text=変更履歴がありません')).toBeVisible();
  });

  test('サブ目標の変更履歴を表示', async ({ page }) => {
    const mockSubGoalHistory = [
      {
        id: 'subgoal-history-1',
        entityType: 'subgoal',
        entityId: 'test-subgoal-id',
        userId: 'test-user-id',
        userName: '佐藤花子',
        changedAt: '2024-01-15T11:00:00Z',
        changes: [
          {
            field: 'title',
            oldValue: '旧サブ目標',
            newValue: '新サブ目標',
          },
        ],
      },
    ];

    await page.route('**/api/subgoals/**/history*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          history: mockSubGoalHistory,
          total: mockSubGoalHistory.length,
          limit: 20,
          offset: 0,
        }),
      });
    });

    await page.goto(`/mandala/${mockGoal.id}`);

    // サブ目標の履歴ボタンをクリック
    await page.click('[data-testid="history-button-subgoal-0"]');
    await expect(page.locator('[data-testid="history-panel"]')).toBeVisible();

    // サブ目標の履歴が表示されることを確認
    await expect(page.locator('[data-testid="history-entry-subgoal-history-1"]')).toBeVisible();
    await expect(page.locator('text=佐藤花子')).toBeVisible();
  });

  test('アクションの変更履歴を表示', async ({ page }) => {
    const mockActionHistory = [
      {
        id: 'action-history-1',
        entityType: 'action',
        entityId: 'test-action-id',
        userId: 'test-user-id',
        userName: '鈴木一郎',
        changedAt: '2024-01-15T09:00:00Z',
        changes: [
          {
            field: 'title',
            oldValue: '旧アクション',
            newValue: '新アクション',
          },
          {
            field: 'type',
            oldValue: 'execution',
            newValue: 'habit',
          },
        ],
      },
    ];

    await page.route('**/api/actions/**/history*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          history: mockActionHistory,
          total: mockActionHistory.length,
          limit: 20,
          offset: 0,
        }),
      });
    });

    await page.goto(`/mandala/${mockGoal.id}`);

    // アクションの履歴ボタンをクリック
    await page.click('[data-testid="history-button-action-0"]');
    await expect(page.locator('[data-testid="history-panel"]')).toBeVisible();

    // アクションの履歴が表示されることを確認
    await expect(page.locator('[data-testid="history-entry-action-history-1"]')).toBeVisible();
    await expect(page.locator('text=鈴木一郎')).toBeVisible();

    // アクション種別の変更が表示されることを確認
    await page.click('[data-testid="history-entry-action-history-1"]');
    await expect(page.locator('text=type')).toBeVisible();
  });

  test('管理者のみロールバックボタンが表示される', async ({ page }) => {
    // 管理者としてセットアップ
    await setupAuthForPage(page, true);

    await page.goto(`/mandala/${mockGoal.id}`);

    // 履歴パネルを開く
    await page.click('[data-testid="history-button-goal"]');
    await expect(page.locator('[data-testid="history-panel"]')).toBeVisible();

    // 履歴エントリをクリック
    await page.click('[data-testid="history-entry-history-1"]');
    await expect(page.locator('[data-testid="history-detail-modal"]')).toBeVisible();

    // ロールバックボタンが表示されることを確認
    await expect(page.locator('[data-testid="rollback-button"]')).toBeVisible();
  });

  test('通常ユーザーにはロールバックボタンが表示されない', async ({ page }) => {
    await page.goto(`/mandala/${mockGoal.id}`);

    // 履歴パネルを開く
    await page.click('[data-testid="history-button-goal"]');
    await expect(page.locator('[data-testid="history-panel"]')).toBeVisible();

    // 履歴エントリをクリック
    await page.click('[data-testid="history-entry-history-1"]');
    await expect(page.locator('[data-testid="history-detail-modal"]')).toBeVisible();

    // ロールバックボタンが表示されないことを確認
    await expect(page.locator('[data-testid="rollback-button"]')).not.toBeVisible();
  });

  test('ロールバック機能が正しく動作する（管理者のみ）', async ({ page }) => {
    // 管理者としてセットアップ
    await setupAuthForPage(page, true);

    // ロールバックAPIをモック
    await page.route('**/api/goals/**/rollback', async route => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ...mockGoal,
            title: '以前のタイトル',
            description: '以前の説明',
            updated_at: '2024-01-15T12:05:00Z',
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto(`/mandala/${mockGoal.id}`);

    // 履歴パネルを開く
    await page.click('[data-testid="history-button-goal"]');
    await expect(page.locator('[data-testid="history-panel"]')).toBeVisible();

    // 履歴エントリをクリック
    await page.click('[data-testid="history-entry-history-1"]');
    await expect(page.locator('[data-testid="history-detail-modal"]')).toBeVisible();

    // ロールバックボタンをクリック
    await page.click('[data-testid="rollback-button"]');

    // 確認ダイアログが表示されることを確認
    await expect(page.locator('[data-testid="rollback-confirm-dialog"]')).toBeVisible();
    await expect(page.locator('text=この変更をロールバックしますか？')).toBeVisible();

    // 確認ボタンをクリック
    await page.click('[data-testid="rollback-confirm-button"]');

    // 成功メッセージが表示されることを確認
    await expect(page.locator('text=ロールバックしました')).toBeVisible({ timeout: 5000 });

    // モーダルが閉じることを確認
    await expect(page.locator('[data-testid="history-detail-modal"]')).not.toBeVisible();

    // マンダラチャートが更新されることを確認
    await expect(page.locator('[data-testid="mandala-cell-goal"]')).toContainText('以前のタイトル');
  });

  test('ロールバック確認ダイアログでキャンセル', async ({ page }) => {
    // 管理者としてセットアップ
    await setupAuthForPage(page, true);

    await page.goto(`/mandala/${mockGoal.id}`);

    // 履歴パネルを開く
    await page.click('[data-testid="history-button-goal"]');
    await expect(page.locator('[data-testid="history-panel"]')).toBeVisible();

    // 履歴エントリをクリック
    await page.click('[data-testid="history-entry-history-1"]');
    await expect(page.locator('[data-testid="history-detail-modal"]')).toBeVisible();

    // ロールバックボタンをクリック
    await page.click('[data-testid="rollback-button"]');

    // 確認ダイアログが表示されることを確認
    await expect(page.locator('[data-testid="rollback-confirm-dialog"]')).toBeVisible();

    // キャンセルボタンをクリック
    await page.click('[data-testid="rollback-cancel-button"]');

    // 確認ダイアログが閉じることを確認
    await expect(page.locator('[data-testid="rollback-confirm-dialog"]')).not.toBeVisible();

    // 詳細モーダルは開いたままであることを確認
    await expect(page.locator('[data-testid="history-detail-modal"]')).toBeVisible();
  });

  test('ロールバックエラー時のエラーメッセージ表示', async ({ page }) => {
    // 管理者としてセットアップ
    await setupAuthForPage(page, true);

    // ロールバックAPIでエラーを返す
    await page.route('**/api/goals/**/rollback', async route => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'ROLLBACK_FAILED',
            message: 'ロールバックに失敗しました',
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto(`/mandala/${mockGoal.id}`);

    // 履歴パネルを開く
    await page.click('[data-testid="history-button-goal"]');
    await expect(page.locator('[data-testid="history-panel"]')).toBeVisible();

    // 履歴エントリをクリック
    await page.click('[data-testid="history-entry-history-1"]');
    await expect(page.locator('[data-testid="history-detail-modal"]')).toBeVisible();

    // ロールバックボタンをクリック
    await page.click('[data-testid="rollback-button"]');

    // 確認ダイアログで確認
    await expect(page.locator('[data-testid="rollback-confirm-dialog"]')).toBeVisible();
    await page.click('[data-testid="rollback-confirm-button"]');

    // エラーメッセージが表示されることを確認
    await expect(page.locator('text=ロールバックに失敗しました')).toBeVisible({
      timeout: 5000,
    });
  });

  test('履歴パネルを閉じる', async ({ page }) => {
    await page.goto(`/mandala/${mockGoal.id}`);

    // 履歴パネルを開く
    await page.click('[data-testid="history-button-goal"]');
    await expect(page.locator('[data-testid="history-panel"]')).toBeVisible();

    // 閉じるボタンをクリック
    await page.click('[data-testid="history-panel-close"]');

    // 履歴パネルが閉じることを確認
    await expect(page.locator('[data-testid="history-panel"]')).not.toBeVisible();
  });

  test('履歴詳細モーダルを閉じる', async ({ page }) => {
    await page.goto(`/mandala/${mockGoal.id}`);

    // 履歴パネルを開く
    await page.click('[data-testid="history-button-goal"]');
    await expect(page.locator('[data-testid="history-panel"]')).toBeVisible();

    // 履歴エントリをクリック
    await page.click('[data-testid="history-entry-history-1"]');
    await expect(page.locator('[data-testid="history-detail-modal"]')).toBeVisible();

    // 閉じるボタンをクリック
    await page.click('[data-testid="history-detail-modal-close"]');

    // 詳細モーダルが閉じることを確認
    await expect(page.locator('[data-testid="history-detail-modal"]')).not.toBeVisible();

    // 履歴パネルは開いたままであることを確認
    await expect(page.locator('[data-testid="history-panel"]')).toBeVisible();
  });

  test('履歴の時系列表示が正しい', async ({ page }) => {
    await page.goto(`/mandala/${mockGoal.id}`);

    // 履歴パネルを開く
    await page.click('[data-testid="history-button-goal"]');
    await expect(page.locator('[data-testid="history-panel"]')).toBeVisible();

    // 履歴エントリを取得
    const entries = page.locator('[data-testid^="history-entry-"]');
    const count = await entries.count();

    // 最新の履歴が一番上にあることを確認
    const firstEntry = entries.first();
    await expect(firstEntry).toHaveAttribute('data-testid', 'history-entry-history-1');

    // 最も古い履歴が一番下にあることを確認
    const lastEntry = entries.nth(count - 1);
    await expect(lastEntry).toHaveAttribute('data-testid', 'history-entry-history-3');
  });

  test('変更者名が正しく表示される', async ({ page }) => {
    await page.goto(`/mandala/${mockGoal.id}`);

    // 履歴パネルを開く
    await page.click('[data-testid="history-button-goal"]');
    await expect(page.locator('[data-testid="history-panel"]')).toBeVisible();

    // 各履歴エントリに変更者名が表示されることを確認
    for (const history of mockHistory) {
      const entry = page.locator(`[data-testid="history-entry-${history.id}"]`);
      await expect(entry).toContainText(history.userName);
    }
  });

  test('変更日時が正しく表示される', async ({ page }) => {
    await page.goto(`/mandala/${mockGoal.id}`);

    // 履歴パネルを開く
    await page.click('[data-testid="history-button-goal"]');
    await expect(page.locator('[data-testid="history-panel"]')).toBeVisible();

    // 各履歴エントリに変更日時が表示されることを確認
    for (const history of mockHistory) {
      const entry = page.locator(`[data-testid="history-entry-${history.id}"]`);
      // 日付部分が含まれることを確認（フォーマットは実装依存）
      await expect(entry).toContainText('2024-01-15');
    }
  });
});

/**
 * ページに認証情報をセットアップ
 * @param page Playwrightのページオブジェクト
 * @param isAdmin 管理者フラグ
 */
async function setupAuthForPage(page: Page, isAdmin: boolean) {
  await page.addInitScript(
    ({ isAdmin }) => {
      localStorage.setItem('mock_auth_enabled', 'true');
      localStorage.setItem(
        'mock_user',
        JSON.stringify({
          id: 'test-user-id',
          email: 'test@example.com',
          name: 'Test User',
          profileComplete: true,
          isAdmin: isAdmin,
        })
      );
      localStorage.setItem('mock_token', 'mock-jwt-token');
    },
    { isAdmin }
  );
}
