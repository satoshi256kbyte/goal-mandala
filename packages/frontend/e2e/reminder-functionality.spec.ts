import { test, expect } from '@playwright/test';
import { setupTestUser, cleanupTestData } from './helpers/test-data';
import { mockApiResponses } from './helpers/api-mocks';

/**
 * リマインド機能のE2Eテスト
 *
 * このテストは以下のフローを検証します：
 * 1. Deep Linkクリックのテスト
 * 2. タスク詳細ページへのナビゲーションのテスト
 * 3. 配信停止フローのテスト
 * 4. 再有効化フローのテスト
 *
 * Requirements: 3.2, 3.4, 3.5, 9.2, 9.4, 9.5
 */
test.describe('Reminder Functionality E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Setup test user and mock API responses
    await setupTestUser(page);
    await mockApiResponses(page);
  });

  test.afterEach(async ({ page }) => {
    await cleanupTestData(page);
  });

  test.describe('Deep Link Navigation', () => {
    test('should navigate to task detail page from deep link', async ({ page }) => {
      // Mock deep link token validation
      await page.route('**/api/reminders/validate-token', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            valid: true,
            userId: 'test-user-1',
            taskId: 'test-task-1',
          }),
        });
      });

      // Navigate to deep link URL
      const deepLinkToken = 'test-deep-link-token';
      await page.goto(`/deep-link?token=${deepLinkToken}`);

      // Wait for redirect to task detail page
      await page.waitForURL('**/tasks/test-task-1');

      // Verify task detail page is displayed
      await expect(page.locator('[data-testid="task-detail"]')).toBeVisible();
      await expect(page.locator('[data-testid="task-title"]')).toBeVisible();
    });

    test('should redirect to login page for expired deep link', async ({ page }) => {
      // Mock expired deep link token validation
      await page.route('**/api/reminders/validate-token', async route => {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({
            valid: false,
            error: 'Token expired',
          }),
        });
      });

      // Navigate to deep link URL with expired token
      const expiredToken = 'expired-deep-link-token';
      await page.goto(`/deep-link?token=${expiredToken}`);

      // Wait for redirect to login page
      await page.waitForURL('**/login');

      // Verify error message is displayed
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="error-message"]')).toContainText(
        'リンクの有効期限が切れています'
      );
    });

    test('should redirect to login page for invalid deep link', async ({ page }) => {
      // Mock invalid deep link token validation
      await page.route('**/api/reminders/validate-token', async route => {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            valid: false,
            error: 'Invalid token',
          }),
        });
      });

      // Navigate to deep link URL with invalid token
      const invalidToken = 'invalid-deep-link-token';
      await page.goto(`/deep-link?token=${invalidToken}`);

      // Wait for redirect to login page
      await page.waitForURL('**/login');

      // Verify error message is displayed
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="error-message"]')).toContainText('無効なリンクです');
    });
  });

  test.describe('Unsubscribe Flow', () => {
    test('should unsubscribe from reminders', async ({ page }) => {
      // Mock unsubscribe API
      await page.route('**/api/reminders/unsubscribe/*', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            message: 'リマインドメールの配信を停止しました',
          }),
        });
      });

      // Navigate to unsubscribe URL
      const unsubscribeToken = 'test-unsubscribe-token';
      await page.goto(`/reminders/unsubscribe/${unsubscribeToken}`);

      // Wait for unsubscribe confirmation page
      await page.waitForSelector('[data-testid="unsubscribe-confirmation"]');

      // Verify confirmation message is displayed
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="success-message"]')).toContainText(
        'リマインドメールの配信を停止しました'
      );

      // Verify re-enable link is displayed
      await expect(page.locator('[data-testid="re-enable-link"]')).toBeVisible();
    });

    test('should handle invalid unsubscribe token', async ({ page }) => {
      // Mock invalid unsubscribe token
      await page.route('**/api/reminders/unsubscribe/*', async route => {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'Invalid token',
          }),
        });
      });

      // Navigate to unsubscribe URL with invalid token
      const invalidToken = 'invalid-unsubscribe-token';
      await page.goto(`/reminders/unsubscribe/${invalidToken}`);

      // Wait for error page
      await page.waitForSelector('[data-testid="error-message"]');

      // Verify error message is displayed
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="error-message"]')).toContainText('無効なリンクです');
    });
  });

  test.describe('Re-enable Flow', () => {
    test('should re-enable reminders from settings page', async ({ page }) => {
      // Navigate to settings page
      await page.goto('/settings');

      // Wait for settings page to load
      await page.waitForSelector('[data-testid="settings-page"]');

      // Find reminder settings section
      const reminderSection = page.locator('[data-testid="reminder-settings"]');
      await expect(reminderSection).toBeVisible();

      // Verify reminder toggle is off (unsubscribed)
      const reminderToggle = reminderSection.locator('[data-testid="reminder-toggle"]');
      await expect(reminderToggle).not.toBeChecked();

      // Mock re-enable API
      await page.route('**/api/reminders/enable', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            message: 'リマインドメールの配信を再開しました',
          }),
        });
      });

      // Enable reminders
      await reminderToggle.check();

      // Wait for success message
      await page.waitForSelector('[data-testid="success-toast"]');

      // Verify success message is displayed
      await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
      await expect(page.locator('[data-testid="success-toast"]')).toContainText(
        'リマインドメールの配信を再開しました'
      );

      // Verify toggle is now on
      await expect(reminderToggle).toBeChecked();
    });

    test('should re-enable reminders from unsubscribe confirmation page', async ({ page }) => {
      // Mock unsubscribe API
      await page.route('**/api/reminders/unsubscribe/*', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            message: 'リマインドメールの配信を停止しました',
          }),
        });
      });

      // Navigate to unsubscribe URL
      const unsubscribeToken = 'test-unsubscribe-token';
      await page.goto(`/reminders/unsubscribe/${unsubscribeToken}`);

      // Wait for unsubscribe confirmation page
      await page.waitForSelector('[data-testid="unsubscribe-confirmation"]');

      // Mock re-enable API
      await page.route('**/api/reminders/enable', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            message: 'リマインドメールの配信を再開しました',
          }),
        });
      });

      // Click re-enable link
      const reEnableLink = page.locator('[data-testid="re-enable-link"]');
      await reEnableLink.click();

      // Wait for success message
      await page.waitForSelector('[data-testid="success-message"]');

      // Verify success message is displayed
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="success-message"]')).toContainText(
        'リマインドメールの配信を再開しました'
      );
    });
  });

  test.describe('Mood Selection', () => {
    test('should save mood preference', async ({ page }) => {
      // Navigate to mood selection page
      await page.goto('/tasks/mood');

      // Wait for mood selection page to load
      await page.waitForSelector('[data-testid="mood-selection-page"]');

      // Mock mood preference API
      await page.route('**/api/reminders/mood-preference', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            moodPreference: 'stay_on_track',
          }),
        });
      });

      // Select "このまま行く" mood
      const stayOnTrackButton = page.locator('[data-testid="mood-stay-on-track"]');
      await stayOnTrackButton.click();

      // Wait for success message
      await page.waitForSelector('[data-testid="success-toast"]');

      // Verify success message is displayed
      await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
      await expect(page.locator('[data-testid="success-toast"]')).toContainText(
        '気分選択を保存しました'
      );
    });

    test('should change mood preference', async ({ page }) => {
      // Navigate to mood selection page
      await page.goto('/tasks/mood');

      // Wait for mood selection page to load
      await page.waitForSelector('[data-testid="mood-selection-page"]');

      // Mock mood preference API
      await page.route('**/api/reminders/mood-preference', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            moodPreference: 'change_pace',
          }),
        });
      });

      // Select "気分を変える" mood
      const changePaceButton = page.locator('[data-testid="mood-change-pace"]');
      await changePaceButton.click();

      // Wait for success message
      await page.waitForSelector('[data-testid="success-toast"]');

      // Verify success message is displayed
      await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
      await expect(page.locator('[data-testid="success-toast"]')).toContainText(
        '気分選択を保存しました'
      );
    });
  });
});
