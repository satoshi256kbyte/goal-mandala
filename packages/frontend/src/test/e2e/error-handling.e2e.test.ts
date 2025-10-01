import { test, expect, Page } from '@playwright/test';

/**
 * エラーハンドリングのE2Eテスト
 */
test.describe('エラーハンドリング E2E', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();

    // コンソールエラーをキャプチャ
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error('Page error:', msg.text());
      }
    });

    // 目標入力ページに移動
    await page.goto('/mandala/create/goal');
  });

  test.afterEach(async () => {
    await page.close();
  });

  test.describe('ネットワークエラー', () => {
    test('ネットワーク接続エラーの処理', async () => {
      // ネットワークを無効化
      await page.context().setOffline(true);

      // フォームに入力
      await page.fill('[data-testid="goal-title"]', 'テスト目標');
      await page.fill('[data-testid="goal-description"]', 'テスト説明');
      await page.fill('[data-testid="goal-deadline"]', '2024-12-31');
      await page.fill('[data-testid="goal-background"]', 'テスト背景');

      // 送信ボタンをクリック
      await page.click('[data-testid="submit-button"]');

      // オフラインエラーメッセージが表示されることを確認
      await expect(page.locator('[role="alert"]')).toContainText('オフライン');

      // ネットワークを復旧
      await page.context().setOffline(false);

      // 再試行ボタンが表示されることを確認
      await expect(page.locator('button:has-text("再試行")')).toBeVisible();

      // 再試行ボタンをクリック
      await page.click('button:has-text("再試行")');

      // エラーが解消されることを確認
      await expect(page.locator('[role="alert"]')).not.toBeVisible();
    });

    test('タイムアウトエラーの処理', async () => {
      // APIレスポンスを遅延させる
      await page.route('/api/goals', async route => {
        await new Promise(resolve => setTimeout(resolve, 35000)); // 35秒遅延
        await route.fulfill({
          status: 200,
          body: JSON.stringify({ success: true, goalId: '123' }),
        });
      });

      // フォームに入力
      await page.fill('[data-testid="goal-title"]', 'テスト目標');
      await page.fill('[data-testid="goal-description"]', 'テスト説明');
      await page.fill('[data-testid="goal-deadline"]', '2024-12-31');
      await page.fill('[data-testid="goal-background"]', 'テスト背景');

      // 送信ボタンをクリック
      await page.click('[data-testid="submit-button"]');

      // 送信中の表示を確認
      await expect(page.locator('[data-testid="submit-button"]')).toContainText('送信中');

      // 進捗バーが表示されることを確認
      await expect(page.locator('[data-testid="progress-bar"]')).toBeVisible();

      // 警告メッセージが表示されることを確認（20秒後）
      await expect(page.locator('text=送信に時間がかかっています')).toBeVisible({ timeout: 25000 });

      // タイムアウトエラーが表示されることを確認（30秒後）
      await expect(page.locator('text=タイムアウト')).toBeVisible({ timeout: 35000 });

      // 再試行ボタンが表示されることを確認
      await expect(page.locator('button:has-text("再試行")')).toBeVisible();
    });

    test('サーバーエラーの処理', async () => {
      // サーバーエラーレスポンスを設定
      await page.route('/api/goals', async route => {
        await route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Internal Server Error' }),
        });
      });

      // フォームに入力
      await page.fill('[data-testid="goal-title"]', 'テスト目標');
      await page.fill('[data-testid="goal-description"]', 'テスト説明');
      await page.fill('[data-testid="goal-deadline"]', '2024-12-31');
      await page.fill('[data-testid="goal-background"]', 'テスト背景');

      // 送信ボタンをクリック
      await page.click('[data-testid="submit-button"]');

      // サーバーエラーメッセージが表示されることを確認
      await expect(page.locator('text=サーバーエラー')).toBeVisible();

      // 自動再試行が実行されることを確認
      await expect(page.locator('text=自動的に再試行しています')).toBeVisible();
    });
  });

  test.describe('バリデーションエラー', () => {
    test('必須項目未入力エラーの表示', async () => {
      // 空のフォームで送信
      await page.click('[data-testid="submit-button"]');

      // バリデーションエラーが表示されることを確認
      await expect(page.locator('text=目標タイトルは必須です')).toBeVisible();
      await expect(page.locator('text=目標説明は必須です')).toBeVisible();
      await expect(page.locator('text=達成期限は必須です')).toBeVisible();
      await expect(page.locator('text=背景は必須です')).toBeVisible();

      // エラーサマリーが表示されることを確認
      await expect(page.locator('text=件のエラーがあります')).toBeVisible();
    });

    test('文字数制限エラーの表示', async () => {
      // 文字数制限を超える入力
      const longText = 'a'.repeat(101);
      await page.fill('[data-testid="goal-title"]', longText);

      // フィールドからフォーカスを外す
      await page.click('body');

      // 文字数制限エラーが表示されることを確認
      await expect(page.locator('text=100文字以内で入力してください')).toBeVisible();

      // 文字数カウンターがエラー色になることを確認
      await expect(page.locator('[data-testid="character-counter"]')).toHaveClass(/text-red/);
    });

    test('日付バリデーションエラーの表示', async () => {
      // 過去の日付を入力
      await page.fill('[data-testid="goal-deadline"]', '2020-01-01');

      // フィールドからフォーカスを外す
      await page.click('body');

      // 日付エラーが表示されることを確認
      await expect(page.locator('text=今日から1年以内の日付を選択してください')).toBeVisible();
    });

    test('リアルタイムバリデーションの動作', async () => {
      // 目標タイトルに文字を入力
      await page.fill('[data-testid="goal-title"]', 'テ');

      // 文字数カウンターが更新されることを確認
      await expect(page.locator('[data-testid="character-counter"]')).toContainText('1/100');

      // 文字を追加
      await page.fill('[data-testid="goal-title"]', 'テスト目標');

      // 文字数カウンターが更新されることを確認
      await expect(page.locator('[data-testid="character-counter"]')).toContainText('5/100');
    });
  });

  test.describe('エラー回復機能', () => {
    test('手動再試行の動作', async () => {
      let requestCount = 0;

      // 最初のリクエストは失敗、2回目は成功
      await page.route('/api/goals', async route => {
        requestCount++;
        if (requestCount === 1) {
          await route.fulfill({
            status: 500,
            body: JSON.stringify({ error: 'Server Error' }),
          });
        } else {
          await route.fulfill({
            status: 200,
            body: JSON.stringify({ success: true, goalId: '123' }),
          });
        }
      });

      // フォームに入力
      await page.fill('[data-testid="goal-title"]', 'テスト目標');
      await page.fill('[data-testid="goal-description"]', 'テスト説明');
      await page.fill('[data-testid="goal-deadline"]', '2024-12-31');
      await page.fill('[data-testid="goal-background"]', 'テスト背景');

      // 送信ボタンをクリック
      await page.click('[data-testid="submit-button"]');

      // エラーが表示されることを確認
      await expect(page.locator('text=サーバーエラー')).toBeVisible();

      // 再試行ボタンをクリック
      await page.click('button:has-text("再試行")');

      // 成功メッセージまたは次の画面に遷移することを確認
      await expect(page.locator('text=サーバーエラー')).not.toBeVisible();
    });

    test('エラー回復パネルの操作', async () => {
      // サーバーエラーを発生させる
      await page.route('/api/goals', async route => {
        await route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Server Error' }),
        });
      });

      // フォームに入力して送信
      await page.fill('[data-testid="goal-title"]', 'テスト目標');
      await page.fill('[data-testid="goal-description"]', 'テスト説明');
      await page.fill('[data-testid="goal-deadline"]', '2024-12-31');
      await page.fill('[data-testid="goal-background"]', 'テスト背景');
      await page.click('[data-testid="submit-button"]');

      // エラー回復パネルが表示されることを確認
      await expect(page.locator('[data-testid="error-recovery-panel"]')).toBeVisible();

      // 推奨アクションボタンが表示されることを確認
      await expect(page.locator('button:has-text("再試行")')).toBeVisible();

      // エラーパネルを閉じる
      await page.click('[aria-label="エラーパネルを閉じる"]');

      // エラーパネルが非表示になることを確認
      await expect(page.locator('[data-testid="error-recovery-panel"]')).not.toBeVisible();
    });
  });

  test.describe('下書き保存エラー', () => {
    test('下書き保存失敗時の処理', async () => {
      // 下書き保存APIを失敗させる
      await page.route('/api/goals/draft', async route => {
        await route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Draft save failed' }),
        });
      });

      // フォームに入力
      await page.fill('[data-testid="goal-title"]', 'テスト目標');

      // 下書き保存ボタンをクリック
      await page.click('[data-testid="draft-save-button"]');

      // エラーメッセージが表示されることを確認
      await expect(page.locator('text=下書きの保存に失敗しました')).toBeVisible();

      // 再試行ボタンが表示されることを確認
      await expect(page.locator('button:has-text("再試行")')).toBeVisible();
    });

    test('自動下書き保存のエラー処理', async () => {
      // 自動下書き保存を失敗させる
      await page.route('/api/goals/draft', async route => {
        await route.fulfill({
          status: 408,
          body: JSON.stringify({ error: 'Request Timeout' }),
        });
      });

      // フォームに入力（自動保存をトリガー）
      await page.fill('[data-testid="goal-title"]', 'テスト目標');

      // 30秒待機（自動保存間隔）
      await page.waitForTimeout(30000);

      // エラー通知が表示されることを確認（控えめな表示）
      await expect(page.locator('[data-testid="auto-save-error"]')).toBeVisible();

      // エラーが自動的に非表示になることを確認
      await expect(page.locator('[data-testid="auto-save-error"]')).not.toBeVisible({
        timeout: 10000,
      });
    });
  });

  test.describe('アクセシビリティ', () => {
    test('エラーメッセージのスクリーンリーダー対応', async () => {
      // 空のフォームで送信
      await page.click('[data-testid="submit-button"]');

      // エラーメッセージがaria-live領域に表示されることを確認
      const alertElement = page.locator('[role="alert"]');
      await expect(alertElement).toBeVisible();
      await expect(alertElement).toHaveAttribute('aria-live', 'assertive');
    });

    test('キーボードナビゲーションでのエラー処理', async () => {
      // Tabキーでフォーカス移動
      await page.keyboard.press('Tab'); // 目標タイトル
      await page.keyboard.press('Tab'); // 目標説明
      await page.keyboard.press('Tab'); // 達成期限
      await page.keyboard.press('Tab'); // 背景
      await page.keyboard.press('Tab'); // 送信ボタン

      // Enterキーで送信
      await page.keyboard.press('Enter');

      // エラーメッセージが表示されることを確認
      await expect(page.locator('text=目標タイトルは必須です')).toBeVisible();

      // エラーフィールドにフォーカスが移動することを確認
      await expect(page.locator('[data-testid="goal-title"]')).toBeFocused();
    });
  });

  test.describe('パフォーマンス', () => {
    test('大量のエラーメッセージの表示パフォーマンス', async () => {
      // 複数のバリデーションエラーを発生させる
      await page.fill('[data-testid="goal-title"]', 'a'.repeat(101)); // 文字数超過
      await page.fill('[data-testid="goal-description"]', 'a'.repeat(1001)); // 文字数超過
      await page.fill('[data-testid="goal-deadline"]', '2020-01-01'); // 過去の日付
      await page.fill('[data-testid="goal-background"]', 'a'.repeat(501)); // 文字数超過

      const startTime = Date.now();

      // 送信ボタンをクリック
      await page.click('[data-testid="submit-button"]');

      // エラーメッセージが表示されるまでの時間を測定
      await expect(page.locator('[role="alert"]')).toBeVisible();

      const endTime = Date.now();
      const renderTime = endTime - startTime;

      // レンダリング時間が合理的な範囲内であることを確認
      expect(renderTime).toBeLessThan(1000); // 1秒以内

      // 全てのエラーメッセージが表示されることを確認
      await expect(page.locator('text=100文字以内で入力してください')).toBeVisible();
      await expect(page.locator('text=1000文字以内で入力してください')).toBeVisible();
      await expect(page.locator('text=今日から1年以内の日付を選択してください')).toBeVisible();
      await expect(page.locator('text=500文字以内で入力してください')).toBeVisible();
    });
  });
});
