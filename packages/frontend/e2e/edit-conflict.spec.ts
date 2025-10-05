import { test, expect, Browser, BrowserContext, Page } from '@playwright/test';

/**
 * E2Eテスト: 編集競合シナリオ
 *
 * このテストは複数のブラウザコンテキスト（タブ）を使用して、
 * 同時編集による競合検出と解決フローを検証します。
 *
 * 注意: これらのテストは編集機能の実装が完了するまでスキップされます。
 * 実装完了後、test.skip を test に変更してテストを有効化してください。
 *
 * 実装が必要なコンポーネント:
 * - InlineEditor (インライン編集)
 * - EditModal (モーダル編集)
 * - ConflictDialog (競合解決ダイアログ)
 * - MandalaCellコンポーネントの編集機能統合
 *
 * 実装が必要なAPI:
 * - PUT /api/goals/:goalId (楽観的ロック対応)
 * - PUT /api/subgoals/:subGoalId (楽観的ロック対応)
 * - PUT /api/actions/:actionId (楽観的ロック対応)
 */

test.describe.skip('Edit Conflict E2E Tests', () => {
  let browser: Browser;
  let context1: BrowserContext;
  let context2: BrowserContext;
  let page1: Page;
  let page2: Page;

  // テスト用のモックデータ
  const mockGoal = {
    id: 'test-goal-id',
    title: '初期タイトル',
    description: '初期説明',
    deadline: '2024-12-31',
    background: '初期背景',
    constraints: '初期制約',
    updated_at: '2024-01-15T10:00:00Z',
    user_id: 'test-user-id',
  };

  test.beforeEach(async ({ browser: testBrowser }) => {
    browser = testBrowser;

    // 2つの独立したブラウザコンテキストを作成（異なるタブをシミュレート）
    context1 = await browser.newContext();
    context2 = await browser.newContext();

    page1 = await context1.newPage();
    page2 = await context2.newPage();

    // 両方のページで認証をセットアップ
    await setupAuthForPage(page1);
    await setupAuthForPage(page2);

    // 初期データをモック
    await setupMockDataForPage(page1, mockGoal);
    await setupMockDataForPage(page2, mockGoal);
  });

  test.afterEach(async () => {
    await page1.close();
    await page2.close();
    await context1.close();
    await context2.close();
  });

  test('同時編集による競合検出 - インライン編集', async () => {
    // 両方のページでマンダラチャート画面を開く
    await page1.goto(`/mandala/${mockGoal.id}`);
    await page2.goto(`/mandala/${mockGoal.id}`);

    // 両方のページでセルが表示されることを確認
    await expect(page1.locator('[data-testid="mandala-cell-goal"]')).toBeVisible();
    await expect(page2.locator('[data-testid="mandala-cell-goal"]')).toBeVisible();

    // Page1: セルをクリックして編集モードに入る
    await page1.click('[data-testid="mandala-cell-goal"]');
    await expect(page1.locator('[data-testid="inline-editor"]')).toBeVisible();

    // Page2: 同じセルをクリックして編集モードに入る
    await page2.click('[data-testid="mandala-cell-goal"]');
    await expect(page2.locator('[data-testid="inline-editor"]')).toBeVisible();

    // Page1: タイトルを変更して保存（成功）
    let updateCount = 0;
    await page1.route('**/api/goals/**', async route => {
      if (route.request().method() === 'PUT') {
        updateCount++;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ...mockGoal,
            title: 'ユーザー1が更新したタイトル',
            updated_at: '2024-01-15T10:05:00Z',
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page1.fill('[data-testid="inline-editor-input"]', 'ユーザー1が更新したタイトル');
    await page1.keyboard.press('Enter');

    // 保存成功を確認
    await expect(page1.locator('text=保存しました')).toBeVisible({ timeout: 5000 });

    // Page2: タイトルを変更して保存を試みる（競合エラー）
    await page2.route('**/api/goals/**', async route => {
      if (route.request().method() === 'PUT') {
        // 競合エラーを返す
        await route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'EDIT_CONFLICT',
            message: 'データが他のユーザーによって更新されています',
            latestData: {
              ...mockGoal,
              title: 'ユーザー1が更新したタイトル',
              updated_at: '2024-01-15T10:05:00Z',
            },
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page2.fill('[data-testid="inline-editor-input"]', 'ユーザー2が更新したタイトル');
    await page2.keyboard.press('Enter');

    // 競合ダイアログが表示されることを確認
    await expect(page2.locator('[data-testid="conflict-dialog"]')).toBeVisible({ timeout: 5000 });
    await expect(page2.locator('text=編集競合が発生しました')).toBeVisible();
    await expect(page2.locator('text=ユーザー1が更新したタイトル')).toBeVisible();
  });

  test('競合解決 - 最新データを取得して再編集', async () => {
    await page1.goto(`/mandala/${mockGoal.id}`);
    await page2.goto(`/mandala/${mockGoal.id}`);

    // Page1で先に更新
    await page1.click('[data-testid="mandala-cell-goal"]');
    await page1.route('**/api/goals/**', async route => {
      if (route.request().method() === 'PUT') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ...mockGoal,
            title: '最新のタイトル',
            updated_at: '2024-01-15T10:10:00Z',
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page1.fill('[data-testid="inline-editor-input"]', '最新のタイトル');
    await page1.keyboard.press('Enter');
    await expect(page1.locator('text=保存しました')).toBeVisible();

    // Page2で競合を発生させる
    await page2.click('[data-testid="mandala-cell-goal"]');
    await page2.route('**/api/goals/**', async route => {
      if (route.request().method() === 'PUT') {
        await route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'EDIT_CONFLICT',
            message: 'データが他のユーザーによって更新されています',
            latestData: {
              ...mockGoal,
              title: '最新のタイトル',
              updated_at: '2024-01-15T10:10:00Z',
            },
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page2.fill('[data-testid="inline-editor-input"]', '古いタイトル');
    await page2.keyboard.press('Enter');

    // 競合ダイアログで「最新データを取得」を選択
    await expect(page2.locator('[data-testid="conflict-dialog"]')).toBeVisible();
    await page2.click('[data-testid="conflict-reload-button"]');

    // 最新データが反映されることを確認
    await expect(page2.locator('[data-testid="mandala-cell-goal"]')).toContainText(
      '最新のタイトル'
    );
    await expect(page2.locator('[data-testid="conflict-dialog"]')).not.toBeVisible();
  });

  test('競合解決 - 変更を破棄', async () => {
    await page1.goto(`/mandala/${mockGoal.id}`);
    await page2.goto(`/mandala/${mockGoal.id}`);

    // Page1で先に更新
    await page1.click('[data-testid="mandala-cell-goal"]');
    await page1.route('**/api/goals/**', async route => {
      if (route.request().method() === 'PUT') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ...mockGoal,
            title: 'Page1の更新',
            updated_at: '2024-01-15T10:15:00Z',
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page1.fill('[data-testid="inline-editor-input"]', 'Page1の更新');
    await page1.keyboard.press('Enter');
    await expect(page1.locator('text=保存しました')).toBeVisible();

    // Page2で競合を発生させる
    await page2.click('[data-testid="mandala-cell-goal"]');
    await page2.route('**/api/goals/**', async route => {
      if (route.request().method() === 'PUT') {
        await route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'EDIT_CONFLICT',
            message: 'データが他のユーザーによって更新されています',
            latestData: {
              ...mockGoal,
              title: 'Page1の更新',
              updated_at: '2024-01-15T10:15:00Z',
            },
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page2.fill('[data-testid="inline-editor-input"]', 'Page2の更新');
    await page2.keyboard.press('Enter');

    // 競合ダイアログで「変更を破棄」を選択
    await expect(page2.locator('[data-testid="conflict-dialog"]')).toBeVisible();
    await page2.click('[data-testid="conflict-discard-button"]');

    // ダイアログが閉じて、編集モードが終了することを確認
    await expect(page2.locator('[data-testid="conflict-dialog"]')).not.toBeVisible();
    await expect(page2.locator('[data-testid="inline-editor"]')).not.toBeVisible();
  });

  test('モーダル編集での競合検出', async () => {
    await page1.goto(`/mandala/${mockGoal.id}`);
    await page2.goto(`/mandala/${mockGoal.id}`);

    // 両方のページで編集ボタンをクリックしてモーダルを開く
    await page1.click('[data-testid="edit-button-goal"]');
    await expect(page1.locator('[data-testid="edit-modal"]')).toBeVisible();

    await page2.click('[data-testid="edit-button-goal"]');
    await expect(page2.locator('[data-testid="edit-modal"]')).toBeVisible();

    // Page1: モーダルで編集して保存（成功）
    await page1.route('**/api/goals/**', async route => {
      if (route.request().method() === 'PUT') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ...mockGoal,
            title: 'モーダルで更新1',
            description: '更新された説明1',
            updated_at: '2024-01-15T10:20:00Z',
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page1.fill('[data-testid="modal-title-input"]', 'モーダルで更新1');
    await page1.fill('[data-testid="modal-description-input"]', '更新された説明1');
    await page1.click('[data-testid="modal-save-button"]');

    await expect(page1.locator('text=保存しました')).toBeVisible();
    await expect(page1.locator('[data-testid="edit-modal"]')).not.toBeVisible();

    // Page2: モーダルで編集して保存を試みる（競合エラー）
    await page2.route('**/api/goals/**', async route => {
      if (route.request().method() === 'PUT') {
        await route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'EDIT_CONFLICT',
            message: 'データが他のユーザーによって更新されています',
            latestData: {
              ...mockGoal,
              title: 'モーダルで更新1',
              description: '更新された説明1',
              updated_at: '2024-01-15T10:20:00Z',
            },
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page2.fill('[data-testid="modal-title-input"]', 'モーダルで更新2');
    await page2.fill('[data-testid="modal-description-input"]', '更新された説明2');
    await page2.click('[data-testid="modal-save-button"]');

    // 競合ダイアログが表示されることを確認
    await expect(page2.locator('[data-testid="conflict-dialog"]')).toBeVisible();
    await expect(page2.locator('text=編集競合が発生しました')).toBeVisible();
  });

  test('連続した競合検出', async () => {
    await page1.goto(`/mandala/${mockGoal.id}`);
    await page2.goto(`/mandala/${mockGoal.id}`);

    // 3回連続で競合を発生させる
    for (let i = 1; i <= 3; i++) {
      // Page1で更新
      await page1.click('[data-testid="mandala-cell-goal"]');
      await page1.route('**/api/goals/**', async route => {
        if (route.request().method() === 'PUT') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              ...mockGoal,
              title: `更新${i}`,
              updated_at: new Date(Date.now() + i * 1000).toISOString(),
            }),
          });
        } else {
          await route.continue();
        }
      });

      await page1.fill('[data-testid="inline-editor-input"]', `更新${i}`);
      await page1.keyboard.press('Enter');
      await expect(page1.locator('text=保存しました')).toBeVisible();

      // Page2で競合を発生させる
      await page2.click('[data-testid="mandala-cell-goal"]');
      await page2.route('**/api/goals/**', async route => {
        if (route.request().method() === 'PUT') {
          await route.fulfill({
            status: 409,
            contentType: 'application/json',
            body: JSON.stringify({
              error: 'EDIT_CONFLICT',
              message: 'データが他のユーザーによって更新されています',
              latestData: {
                ...mockGoal,
                title: `更新${i}`,
                updated_at: new Date(Date.now() + i * 1000).toISOString(),
              },
            }),
          });
        } else {
          await route.continue();
        }
      });

      await page2.fill('[data-testid="inline-editor-input"]', `競合${i}`);
      await page2.keyboard.press('Enter');

      // 競合ダイアログが表示されることを確認
      await expect(page2.locator('[data-testid="conflict-dialog"]')).toBeVisible();

      // 最新データを取得
      await page2.click('[data-testid="conflict-reload-button"]');
      await expect(page2.locator('[data-testid="conflict-dialog"]')).not.toBeVisible();
    }
  });

  test('サブ目標の同時編集競合', async () => {
    const mockSubGoal = {
      id: 'test-subgoal-id',
      goal_id: mockGoal.id,
      title: 'サブ目標タイトル',
      description: 'サブ目標説明',
      background: 'サブ目標背景',
      constraints: 'サブ目標制約',
      position: 0,
      progress: 0,
      updated_at: '2024-01-15T10:00:00Z',
    };

    await page1.goto(`/mandala/${mockGoal.id}`);
    await page2.goto(`/mandala/${mockGoal.id}`);

    // Page1でサブ目標を更新
    await page1.click('[data-testid="mandala-cell-subgoal-0"]');
    await page1.route('**/api/subgoals/**', async route => {
      if (route.request().method() === 'PUT') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ...mockSubGoal,
            title: 'サブ目標更新1',
            updated_at: '2024-01-15T10:25:00Z',
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page1.fill('[data-testid="inline-editor-input"]', 'サブ目標更新1');
    await page1.keyboard.press('Enter');
    await expect(page1.locator('text=保存しました')).toBeVisible();

    // Page2で競合を発生させる
    await page2.click('[data-testid="mandala-cell-subgoal-0"]');
    await page2.route('**/api/subgoals/**', async route => {
      if (route.request().method() === 'PUT') {
        await route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'EDIT_CONFLICT',
            message: 'データが他のユーザーによって更新されています',
            latestData: {
              ...mockSubGoal,
              title: 'サブ目標更新1',
              updated_at: '2024-01-15T10:25:00Z',
            },
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page2.fill('[data-testid="inline-editor-input"]', 'サブ目標更新2');
    await page2.keyboard.press('Enter');

    // 競合ダイアログが表示されることを確認
    await expect(page2.locator('[data-testid="conflict-dialog"]')).toBeVisible();
  });

  test('アクションの同時編集競合', async () => {
    const mockAction = {
      id: 'test-action-id',
      sub_goal_id: 'test-subgoal-id',
      title: 'アクションタイトル',
      description: 'アクション説明',
      background: 'アクション背景',
      constraints: 'アクション制約',
      type: 'execution',
      position: 0,
      progress: 0,
      updated_at: '2024-01-15T10:00:00Z',
    };

    await page1.goto(`/mandala/${mockGoal.id}`);
    await page2.goto(`/mandala/${mockGoal.id}`);

    // Page1でアクションを更新
    await page1.click('[data-testid="mandala-cell-action-0"]');
    await page1.route('**/api/actions/**', async route => {
      if (route.request().method() === 'PUT') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ...mockAction,
            title: 'アクション更新1',
            updated_at: '2024-01-15T10:30:00Z',
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page1.fill('[data-testid="inline-editor-input"]', 'アクション更新1');
    await page1.keyboard.press('Enter');
    await expect(page1.locator('text=保存しました')).toBeVisible();

    // Page2で競合を発生させる
    await page2.click('[data-testid="mandala-cell-action-0"]');
    await page2.route('**/api/actions/**', async route => {
      if (route.request().method() === 'PUT') {
        await route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'EDIT_CONFLICT',
            message: 'データが他のユーザーによって更新されています',
            latestData: {
              ...mockAction,
              title: 'アクション更新1',
              updated_at: '2024-01-15T10:30:00Z',
            },
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page2.fill('[data-testid="inline-editor-input"]', 'アクション更新2');
    await page2.keyboard.press('Enter');

    // 競合ダイアログが表示されることを確認
    await expect(page2.locator('[data-testid="conflict-dialog"]')).toBeVisible();
  });
});

/**
 * ページに認証情報をセットアップ
 */
async function setupAuthForPage(page: Page) {
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
 * ページにモックデータをセットアップ
 */
async function setupMockDataForPage(page: Page, goal: any) {
  await page.route('**/api/goals/**', async route => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(goal),
      });
    } else {
      await route.continue();
    }
  });
}
