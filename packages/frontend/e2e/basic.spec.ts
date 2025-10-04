import { test, expect } from '@playwright/test';

test.describe('Basic E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Set up mock authentication
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
  });

  test('should load the application', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Goal Mandala|目標管理曼荼羅/);
  });

  test('should navigate to subgoal edit page', async ({ page }) => {
    await page.goto('/mandala/create/subgoals?goalId=test-goal-id');
    await expect(page.locator('h1')).toContainText('サブ目標確認・編集');
  });

  test('should display subgoal list', async ({ page }) => {
    await page.goto('/mandala/create/subgoals?goalId=test-goal-id');
    await expect(page.locator('[data-testid="subgoal-list"]')).toBeVisible();
  });
});
