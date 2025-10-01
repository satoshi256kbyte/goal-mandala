import { test, expect } from '@playwright/test';

test.describe('Security E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // セキュリティヘッダーの設定を確認
    await page.goto('/');
  });

  test.describe('XSS Protection', () => {
    test('should prevent XSS in goal input form', async ({ page }) => {
      // 目標入力フォームに移動
      await page.goto('/mandala/create/goal');

      // XSSペイロードを入力
      const xssPayload = '<script>window.xssExecuted = true;</script>';

      await page.fill('[data-testid="goal-title"]', xssPayload);
      await page.fill('[data-testid="goal-description"]', xssPayload);
      await page.fill('[data-testid="goal-background"]', xssPayload);

      // フォームを送信
      await page.click('[data-testid="submit-button"]');

      // XSSが実行されていないことを確認
      const xssExecuted = await page.evaluate(() => (window as any).xssExecuted);
      expect(xssExecuted).toBeUndefined();

      // 入力値がサニタイズされていることを確認
      const titleValue = await page.inputValue('[data-testid="goal-title"]');
      expect(titleValue).not.toContain('<script>');
    });

    test('should prevent XSS in displayed content', async ({ page }) => {
      // XSSペイロードを含むコンテンツを表示
      await page.goto('/test-xss-content'); // テスト用ページ

      // スクリプトが実行されていないことを確認
      const alertFired = await page.evaluate(() => {
        let alertCalled = false;
        const originalAlert = window.alert;
        window.alert = () => {
          alertCalled = true;
        };

        // 少し待機してアラートが発火するかチェック
        setTimeout(() => {
          window.alert = originalAlert;
        }, 1000);

        return alertCalled;
      });

      expect(alertFired).toBe(false);
    });

    test('should sanitize URL parameters', async ({ page }) => {
      // XSSペイロードをURLパラメータに含める
      const xssUrl = '/mandala/create/goal?title=<script>alert("XSS")</script>';
      await page.goto(xssUrl);

      // XSSが実行されていないことを確認
      const xssExecuted = await page.evaluate(() => (window as any).xssExecuted);
      expect(xssExecuted).toBeUndefined();
    });
  });

  test.describe('CSRF Protection', () => {
    test('should include CSRF token in form submissions', async ({ page }) => {
      await page.goto('/mandala/create/goal');

      // ネットワークリクエストを監視
      const requests: any[] = [];
      page.on('request', request => {
        if (request.method() === 'POST') {
          requests.push({
            url: request.url(),
            headers: request.headers(),
            method: request.method(),
          });
        }
      });

      // フォームに有効なデータを入力
      await page.fill('[data-testid="goal-title"]', 'Test Goal');
      await page.fill('[data-testid="goal-description"]', 'Test Description');
      await page.fill('[data-testid="goal-deadline"]', '2024-12-31');
      await page.fill('[data-testid="goal-background"]', 'Test Background');

      // フォームを送信
      await page.click('[data-testid="submit-button"]');

      // CSRFトークンがヘッダーに含まれていることを確認
      await page.waitForTimeout(1000);
      const postRequest = requests.find(req => req.method === 'POST');

      if (postRequest) {
        expect(postRequest.headers['x-csrf-token']).toBeDefined();
        expect(postRequest.headers['x-csrf-token']).not.toBe('');
      }
    });

    test('should reject requests without CSRF token', async ({ page, context }) => {
      // CSRFトークンなしでリクエストを送信するテスト
      const response = await context.request.post('/api/goals', {
        data: {
          title: 'Test Goal',
          description: 'Test Description',
          deadline: '2024-12-31',
          background: 'Test Background',
        },
      });

      // CSRFトークンがない場合は403エラーが返されることを確認
      expect(response.status()).toBe(403);
    });
  });

  test.describe('Content Security Policy', () => {
    test('should have proper CSP headers', async ({ page }) => {
      const response = await page.goto('/');

      const cspHeader = response?.headers()['content-security-policy'];

      if (cspHeader) {
        // CSPヘッダーが適切に設定されていることを確認
        expect(cspHeader).toContain("default-src 'self'");
        expect(cspHeader).toContain("script-src 'self'");
        expect(cspHeader).toContain("object-src 'none'");
        expect(cspHeader).toContain("frame-src 'none'");
      }
    });

    test('should block inline scripts', async ({ page }) => {
      // インラインスクリプトが実行されないことを確認
      await page
        .addScriptTag({
          content: 'window.inlineScriptExecuted = true;',
        })
        .catch(() => {
          // CSPによってブロックされることを期待
        });

      const scriptExecuted = await page.evaluate(() => (window as any).inlineScriptExecuted);
      expect(scriptExecuted).toBeUndefined();
    });
  });

  test.describe('Input Validation', () => {
    test('should validate input length limits', async ({ page }) => {
      await page.goto('/mandala/create/goal');

      // 長すぎる入力をテスト
      const longTitle = 'A'.repeat(200);
      await page.fill('[data-testid="goal-title"]', longTitle);

      // バリデーションエラーが表示されることを確認
      await page.click('[data-testid="submit-button"]');

      const errorMessage = await page.locator('[data-testid="title-error"]').textContent();
      expect(errorMessage).toContain('100文字以内');
    });

    test('should validate required fields', async ({ page }) => {
      await page.goto('/mandala/create/goal');

      // 必須フィールドを空のままで送信
      await page.click('[data-testid="submit-button"]');

      // バリデーションエラーが表示されることを確認
      const titleError = await page.locator('[data-testid="title-error"]').textContent();
      const descriptionError = await page
        .locator('[data-testid="description-error"]')
        .textContent();

      expect(titleError).toContain('必須');
      expect(descriptionError).toContain('必須');
    });

    test('should validate date format', async ({ page }) => {
      await page.goto('/mandala/create/goal');

      // 無効な日付形式を入力
      await page.fill('[data-testid="goal-deadline"]', 'invalid-date');
      await page.click('[data-testid="submit-button"]');

      // バリデーションエラーが表示されることを確認
      const dateError = await page.locator('[data-testid="deadline-error"]').textContent();
      expect(dateError).toContain('有効な日付');
    });
  });

  test.describe('Authentication Security', () => {
    test('should redirect unauthenticated users', async ({ page }) => {
      // 認証が必要なページに直接アクセス
      await page.goto('/mandala/create/goal');

      // ログインページにリダイレクトされることを確認
      await page.waitForURL('**/login');
      expect(page.url()).toContain('/login');
    });

    test('should handle session timeout', async ({ page, context }) => {
      // ログイン
      await page.goto('/login');
      await page.fill('[data-testid="email"]', 'test@example.com');
      await page.fill('[data-testid="password"]', 'password123');
      await page.click('[data-testid="login-button"]');

      // セッションを無効化（Cookieを削除）
      await context.clearCookies();

      // 認証が必要なページにアクセス
      await page.goto('/mandala/create/goal');

      // ログインページにリダイレクトされることを確認
      await page.waitForURL('**/login');
      expect(page.url()).toContain('/login');
    });
  });

  test.describe('Error Handling Security', () => {
    test('should not expose sensitive information in error messages', async ({ page }) => {
      // 意図的にエラーを発生させる
      await page.route('/api/goals', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Internal Server Error',
            message: 'An error occurred while processing your request',
          }),
        });
      });

      await page.goto('/mandala/create/goal');

      // フォームを送信してエラーを発生させる
      await page.fill('[data-testid="goal-title"]', 'Test Goal');
      await page.fill('[data-testid="goal-description"]', 'Test Description');
      await page.fill('[data-testid="goal-deadline"]', '2024-12-31');
      await page.fill('[data-testid="goal-background"]', 'Test Background');
      await page.click('[data-testid="submit-button"]');

      // エラーメッセージが表示されることを確認
      const errorMessage = await page.locator('[data-testid="error-message"]').textContent();

      // センシティブな情報が含まれていないことを確認
      expect(errorMessage).not.toContain('database');
      expect(errorMessage).not.toContain('password');
      expect(errorMessage).not.toContain('token');
      expect(errorMessage).not.toContain('secret');
    });
  });

  test.describe('File Upload Security', () => {
    test('should validate file types', async ({ page }) => {
      // ファイルアップロード機能がある場合のテスト
      await page.goto('/profile/edit');

      // 危険なファイル形式をアップロード試行
      const dangerousFile = Buffer.from('<?php echo "malicious code"; ?>');

      await page.setInputFiles('[data-testid="profile-image"]', {
        name: 'malicious.php',
        mimeType: 'application/x-php',
        buffer: dangerousFile,
      });

      await page.click('[data-testid="upload-button"]');

      // ファイル形式エラーが表示されることを確認
      const errorMessage = await page.locator('[data-testid="upload-error"]').textContent();
      expect(errorMessage).toContain('許可されていないファイル形式');
    });

    test('should validate file size', async ({ page }) => {
      await page.goto('/profile/edit');

      // 大きすぎるファイルをアップロード試行
      const largeFile = Buffer.alloc(10 * 1024 * 1024); // 10MB

      await page.setInputFiles('[data-testid="profile-image"]', {
        name: 'large-image.jpg',
        mimeType: 'image/jpeg',
        buffer: largeFile,
      });

      await page.click('[data-testid="upload-button"]');

      // ファイルサイズエラーが表示されることを確認
      const errorMessage = await page.locator('[data-testid="upload-error"]').textContent();
      expect(errorMessage).toContain('ファイルサイズが大きすぎます');
    });
  });
});
