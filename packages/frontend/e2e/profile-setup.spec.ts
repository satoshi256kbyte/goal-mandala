import { test, expect } from '@playwright/test';

test.describe('Profile Setup E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication state
    await page.addInitScript(() => {
      window.localStorage.setItem('auth_token', 'mock_token');
      window.localStorage.setItem(
        'user',
        JSON.stringify({
          id: '1',
          email: 'test@example.com',
          profileSetup: false,
        })
      );
    });
  });

  test.describe('正常系E2Eテスト', () => {
    test('ログイン→プロフィール入力→TOP画面遷移の完全フロー', async ({ page }) => {
      // Navigate to profile setup page (simulating redirect after login)
      await page.goto('/profile/setup');

      // 要件1: プロフィール入力フォーム表示
      await expect(page).toHaveTitle(/プロフィール設定/);
      await expect(page.getByRole('heading', { name: 'プロフィール設定' })).toBeVisible();

      // Check sections are visible
      await expect(page.getByText('所属組織の情報')).toBeVisible();
      await expect(page.getByText('本人の情報')).toBeVisible();

      // 要件2: 業種選択機能
      const industrySelect = page.getByLabel('業種');
      await expect(industrySelect).toBeVisible();

      // Check placeholder
      await expect(industrySelect).toHaveValue('');

      // Select industry
      await industrySelect.selectOption('it-communication');
      await expect(industrySelect).toHaveValue('it-communication');

      // 要件3: 組織規模選択機能
      const companySizeSelect = page.getByLabel('組織規模');
      await expect(companySizeSelect).toBeVisible();

      // Select company size
      await companySizeSelect.selectOption('51-200');
      await expect(companySizeSelect).toHaveValue('51-200');

      // 要件4: 職種入力機能
      const jobTitleInput = page.getByLabel('職種');
      await expect(jobTitleInput).toBeVisible();

      // Check placeholder
      await expect(jobTitleInput).toHaveAttribute('placeholder', /ソフトウェアエンジニア/);

      // Fill in job title
      await jobTitleInput.fill('ソフトウェアエンジニア');
      await expect(jobTitleInput).toHaveValue('ソフトウェアエンジニア');

      // 要件5: 役職入力機能（任意）
      const positionInput = page.getByLabel('役職');
      await expect(positionInput).toBeVisible();

      // Check placeholder indicates optional
      await expect(positionInput).toHaveAttribute('placeholder', /任意/);

      // Fill in position
      await positionInput.fill('シニアエンジニア');
      await expect(positionInput).toHaveValue('シニアエンジニア');

      // 要件7: プロフィール保存機能
      const submitButton = page.getByRole('button', { name: /次へ|保存/ });
      await expect(submitButton).toBeEnabled();

      // Mock API response
      await page.route('**/api/profile', async route => {
        const request = route.request();
        const method = request.method();

        if (method === 'PUT') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              data: {
                id: '1',
                email: 'test@example.com',
                industry: 'it-communication',
                company_size: '51-200',
                job_title: 'ソフトウェアエンジニア',
                position: 'シニアエンジニア',
              },
            }),
          });
        }
      });

      // Submit form
      await submitButton.click();

      // Check loading state (要件7.4, 7.5)
      await expect(page.getByRole('button', { name: /保存中/ })).toBeVisible();
      await expect(page.getByRole('button', { name: /保存中/ })).toBeDisabled();

      // Wait for success and redirect (要件7.3)
      await page.waitForURL('/', { timeout: 5000 });
      await expect(page).toHaveURL('/');
    });

    test('各フィールドの入力確認 - 全業種・組織規模オプション', async ({ page }) => {
      await page.goto('/profile/setup');

      // Test all industry options (要件2.2)
      const industryOptions = [
        'it-communication',
        'manufacturing',
        'finance-insurance',
        'retail-wholesale',
        'service',
        'medical-welfare',
        'education',
        'construction-real-estate',
        'transportation-logistics',
        'other',
      ];

      for (const option of industryOptions) {
        await page.getByLabel('業種').selectOption(option);
        await expect(page.getByLabel('業種')).toHaveValue(option);
      }

      // Test all company size options (要件3.2)
      const companySizeOptions = [
        '1-10',
        '11-50',
        '51-200',
        '201-500',
        '501-1000',
        '1001+',
        'individual',
      ];

      for (const option of companySizeOptions) {
        await page.getByLabel('組織規模').selectOption(option);
        await expect(page.getByLabel('組織規模')).toHaveValue(option);
      }
    });

    test('送信成功の確認 - 必須項目のみ', async ({ page }) => {
      await page.goto('/profile/setup');

      // Fill only required fields
      await page.getByLabel('業種').selectOption('medical-welfare');
      await page.getByLabel('組織規模').selectOption('11-50');
      await page.getByLabel('職種').fill('医師');

      // Mock API response
      await page.route('**/api/profile', async route => {
        if (route.request().method() === 'PUT') {
          const postData = await route.request().postDataJSON();

          // Verify only required fields are sent
          expect(postData).toMatchObject({
            industry: 'medical-welfare',
            companySize: '11-50',
            jobTitle: '医師',
          });

          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true }),
          });
        }
      });

      await page.getByRole('button', { name: /次へ|保存/ }).click();
      await page.waitForURL('/', { timeout: 5000 });
    });

    test('リアルタイム入力表示の確認', async ({ page }) => {
      await page.goto('/profile/setup');

      // 要件4.3: 職種を入力する THEN 入力した文字がリアルタイムで表示される
      const jobTitleInput = page.getByLabel('職種');
      await jobTitleInput.fill('プ');
      await expect(jobTitleInput).toHaveValue('プ');

      await jobTitleInput.fill('プロジェクト');
      await expect(jobTitleInput).toHaveValue('プロジェクト');

      await jobTitleInput.fill('プロジェクトマネージャー');
      await expect(jobTitleInput).toHaveValue('プロジェクトマネージャー');

      // 要件5.3: 役職を入力する THEN 入力した文字がリアルタイムで表示される
      const positionInput = page.getByLabel('役職');
      await positionInput.fill('シ');
      await expect(positionInput).toHaveValue('シ');

      await positionInput.fill('シニア');
      await expect(positionInput).toHaveValue('シニア');
    });
  });

  test.describe('異常系E2Eテスト', () => {
    test('バリデーションエラーの表示確認 - 空フォーム送信', async ({ page }) => {
      await page.goto('/profile/setup');

      // 要件6.1, 6.2, 6.3: 未入力でボタンクリック時のエラー表示
      const submitButton = page.getByRole('button', { name: /次へ|保存/ });

      // Try to submit empty form
      await submitButton.click();

      // Check validation errors appear (要件6.6, 6.7)
      await expect(page.getByText('業種を選択してください')).toBeVisible();
      await expect(page.getByText('組織規模を選択してください')).toBeVisible();
      await expect(page.getByText('職種を入力してください')).toBeVisible();

      // Check fields are highlighted with error (要件6.7)
      const industrySelect = page.getByLabel('業種');
      const companySizeSelect = page.getByLabel('組織規模');
      const jobTitleInput = page.getByLabel('職種');

      await expect(industrySelect).toHaveAttribute('aria-invalid', 'true');
      await expect(companySizeSelect).toHaveAttribute('aria-invalid', 'true');
      await expect(jobTitleInput).toHaveAttribute('aria-invalid', 'true');
    });

    test('バリデーションエラーの表示確認 - 文字数制限', async ({ page }) => {
      await page.goto('/profile/setup');

      // 要件4.4, 6.4: 職種が100文字を超える
      const longJobTitle = 'あ'.repeat(101);
      const jobTitleInput = page.getByLabel('職種');
      await jobTitleInput.fill(longJobTitle);
      await jobTitleInput.blur();

      await expect(page.getByText('職種は100文字以内で入力してください')).toBeVisible();
      await expect(jobTitleInput).toHaveAttribute('aria-invalid', 'true');

      // 要件5.4, 6.5: 役職が100文字を超える
      const longPosition = 'い'.repeat(101);
      const positionInput = page.getByLabel('役職');
      await positionInput.fill(longPosition);
      await positionInput.blur();

      await expect(page.getByText('役職は100文字以内で入力してください')).toBeVisible();
      await expect(positionInput).toHaveAttribute('aria-invalid', 'true');
    });

    test('エラーメッセージの即座クリア確認', async ({ page }) => {
      await page.goto('/profile/setup');

      // Trigger validation errors
      const submitButton = page.getByRole('button', { name: /次へ|保存/ });
      await submitButton.click();

      // Verify errors are shown
      await expect(page.getByText('業種を選択してください')).toBeVisible();
      await expect(page.getByText('組織規模を選択してください')).toBeVisible();
      await expect(page.getByText('職種を入力してください')).toBeVisible();

      // 要件2.6, 6.8: 業種を選択する THEN バリデーションエラーがクリアされる
      await page.getByLabel('業種').selectOption('it-communication');
      await expect(page.getByText('業種を選択してください')).not.toBeVisible();

      // 要件3.6, 6.8: 組織規模を選択する THEN バリデーションエラーがクリアされる
      await page.getByLabel('組織規模').selectOption('51-200');
      await expect(page.getByText('組織規模を選択してください')).not.toBeVisible();

      // 要件4.6, 6.8: 職種を入力する THEN バリデーションエラーがクリアされる
      await page.getByLabel('職種').fill('エンジニア');
      await expect(page.getByText('職種を入力してください')).not.toBeVisible();
    });

    test('APIエラーの表示確認', async ({ page }) => {
      await page.goto('/profile/setup');

      // Fill in valid form data
      await page.getByLabel('業種').selectOption('it-communication');
      await page.getByLabel('組織規模').selectOption('51-200');
      await page.getByLabel('職種').fill('エンジニア');

      // 要件7.6, 12.1: Mock API error response
      await page.route('**/api/profile', async route => {
        if (route.request().method() === 'PUT') {
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({
              success: false,
              error: { message: 'Internal Server Error' },
            }),
          });
        }
      });

      // Submit form
      await page.getByRole('button', { name: /次へ|保存/ }).click();

      // 要件12.1, 12.2: Check error message appears at top of page
      await expect(page.getByText(/プロフィールの保存に失敗しました/)).toBeVisible();

      // User should remain on the same page
      await expect(page).toHaveURL('/profile/setup');

      // Form data should be preserved
      await expect(page.getByLabel('業種')).toHaveValue('it-communication');
      await expect(page.getByLabel('組織規模')).toHaveValue('51-200');
      await expect(page.getByLabel('職種')).toHaveValue('エンジニア');
    });

    test('ネットワークエラーの表示確認', async ({ page }) => {
      await page.goto('/profile/setup');

      // Fill in valid form data
      await page.getByLabel('業種').selectOption('service');
      await page.getByLabel('組織規模').selectOption('11-50');
      await page.getByLabel('職種').fill('コンサルタント');

      // 要件7.7, 12.3: Mock network error
      await page.route('**/api/profile', async route => {
        if (route.request().method() === 'PUT') {
          await route.abort('failed');
        }
      });

      // Submit form
      await page.getByRole('button', { name: /次へ|保存/ }).click();

      // 要件12.3: Check network error message
      await expect(page.getByText(/ネットワークエラー|接続を確認/)).toBeVisible();

      // User should remain on the same page
      await expect(page).toHaveURL('/profile/setup');
    });

    test('エラーメッセージの自動非表示確認', async ({ page }) => {
      await page.goto('/profile/setup');

      // Fill in form
      await page.getByLabel('業種').selectOption('it-communication');
      await page.getByLabel('組織規模').selectOption('51-200');
      await page.getByLabel('職種').fill('エンジニア');

      // Mock API error
      await page.route('**/api/profile', async route => {
        if (route.request().method() === 'PUT') {
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ success: false, error: { message: 'Error' } }),
          });
        }
      });

      // Submit form
      await page.getByRole('button', { name: /次へ|保存/ }).click();

      // Error message should appear
      const errorMessage = page.getByText(/プロフィールの保存に失敗しました/);
      await expect(errorMessage).toBeVisible();

      // 要件12.5: エラーメッセージが5秒後に自動的に非表示になる
      await page.waitForTimeout(5500);
      await expect(errorMessage).not.toBeVisible();
    });

    test('役職フィールドは任意項目のためエラーなし', async ({ page }) => {
      await page.goto('/profile/setup');

      // Fill only required fields, leave position empty
      await page.getByLabel('業種').selectOption('education');
      await page.getByLabel('組織規模').selectOption('201-500');
      await page.getByLabel('職種').fill('教師');

      // Position field is left empty
      const positionInput = page.getByLabel('役職');
      await expect(positionInput).toHaveValue('');

      // Mock successful API response
      await page.route('**/api/profile', async route => {
        if (route.request().method() === 'PUT') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true }),
          });
        }
      });

      // Submit should succeed (要件5.5)
      const submitButton = page.getByRole('button', { name: /次へ|保存/ });
      await expect(submitButton).toBeEnabled();
      await submitButton.click();

      // Should redirect successfully
      await page.waitForURL('/', { timeout: 5000 });
    });
  });

  test.describe('アクセシビリティテスト', () => {
    test('should support keyboard navigation', async ({ page }) => {
      await page.goto('/profile/setup');

      // Tab through form elements
      await page.keyboard.press('Tab');
      await expect(page.getByLabel('業種')).toBeFocused();

      await page.keyboard.press('Tab');
      await expect(page.getByLabel('組織規模')).toBeFocused();

      await page.keyboard.press('Tab');
      await expect(page.getByLabel('職種')).toBeFocused();

      await page.keyboard.press('Tab');
      await expect(page.getByLabel('役職')).toBeFocused();

      await page.keyboard.press('Tab');
      await expect(page.getByRole('button', { name: '保存して次へ' })).toBeFocused();
    });

    test('should have proper ARIA attributes', async ({ page }) => {
      await page.goto('/profile/setup');

      // Check required fields have aria-required
      await expect(page.getByLabel('業種')).toHaveAttribute('aria-required', 'true');
      await expect(page.getByLabel('組織規模')).toHaveAttribute('aria-required', 'true');
      await expect(page.getByLabel('職種')).toHaveAttribute('aria-required', 'true');

      // Check optional field doesn't have aria-required
      await expect(page.getByLabel('役職')).toHaveAttribute('aria-required', 'false');

      // Trigger validation error and check aria-invalid
      await page.getByLabel('職種').focus();
      await page.keyboard.press('Tab');

      await expect(page.getByLabel('職種')).toHaveAttribute('aria-invalid', 'true');
    });

    test('should announce loading state to screen readers', async ({ page }) => {
      await page.goto('/profile/setup');

      // Fill in form
      await page.getByLabel('業種').selectOption('technology');
      await page.getByLabel('組織規模').selectOption('medium');
      await page.getByLabel('職種').fill('Engineer');

      // Mock slow API response
      await page.route('/api/profile', async route => {
        await new Promise(resolve => setTimeout(resolve, 1000));
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, message: 'Success' }),
        });
      });

      // Submit form
      await page.getByRole('button', { name: '保存して次へ' }).click();

      // Check loading announcement for screen readers
      await expect(page.getByText('プロフィール情報を保存しています')).toBeVisible();
      await expect(page.getByRole('button', { name: '保存中...' })).toHaveAttribute(
        'aria-busy',
        'true'
      );
    });
  });

  test.describe('レスポンシブデザインテスト', () => {
    test('should work on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/profile/setup');

      // Check form is visible and usable on mobile
      await expect(page.getByRole('heading', { name: 'プロフィール設定' })).toBeVisible();
      await expect(page.getByLabel('業種')).toBeVisible();
      await expect(page.getByLabel('組織規模')).toBeVisible();
      await expect(page.getByLabel('職種')).toBeVisible();
      await expect(page.getByLabel('役職')).toBeVisible();

      // Test form submission on mobile
      await page.getByLabel('業種').selectOption('technology');
      await page.getByLabel('組織規模').selectOption('medium');
      await page.getByLabel('職種').fill('Engineer');

      const submitButton = page.getByRole('button', { name: '保存して次へ' });
      await expect(submitButton).toBeEnabled();
      await expect(submitButton).toBeVisible();
    });

    test('should work on tablet viewport', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('/profile/setup');

      // Check layout on tablet
      await expect(page.getByRole('heading', { name: 'プロフィール設定' })).toBeVisible();

      // Form should be properly laid out
      const form = page.locator('form');
      await expect(form).toBeVisible();
    });
  });
});
