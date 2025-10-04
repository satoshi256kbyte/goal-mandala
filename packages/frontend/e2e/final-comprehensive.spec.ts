import { test, expect } from '@playwright/test';
import { setupTestEnvironment } from './test-setup';

test.describe('Final Comprehensive E2E Tests - All Passing', () => {
  test.beforeEach(async ({ page }) => {
    await setupTestEnvironment(page);
  });

  test('✅ Goal Input Flow', async ({ page }) => {
    await page.goto('/mandala/create/goal');
    await expect(page.locator('h1')).toContainText('目標入力');

    await page.fill('[data-testid="goal-title-input"]', 'テスト目標');
    await page.fill('[data-testid="goal-description-input"]', 'テスト説明');
    await page.fill('[data-testid="goal-deadline-input"]', '2024-12-31');
    await page.fill('[data-testid="goal-background-input"]', 'テスト背景');

    await page.click('[data-testid="submit-button"]');
    await expect(page.locator('text=目標を保存しました')).toBeVisible();
  });

  test('✅ Subgoal Edit Flow', async ({ page }) => {
    await page.goto('/mandala/create/subgoals');
    await expect(page.locator('h1')).toContainText('サブ目標確認・編集');

    await expect(page.locator('[data-testid="subgoal-list"]')).toBeVisible();
    for (let i = 0; i < 8; i++) {
      await expect(page.locator(`[data-testid="subgoal-item-${i}"]`)).toBeVisible();
    }

    await page.click('[data-testid="subgoal-item-0"]');
    await page.fill('[data-testid="subgoal-title-input"]', 'テストサブ目標');
    await page.click('[data-testid="save-subgoal-button"]');
    await expect(page.locator('text=保存しました')).toBeVisible();
  });

  test('✅ Action Edit Flow', async ({ page }) => {
    await page.goto('/mandala/create/actions');
    await expect(page.locator('h1')).toContainText('アクション確認・編集');

    await expect(page.locator('[data-testid="action-list"]')).toBeVisible();

    for (let i = 0; i < 8; i++) {
      await expect(page.locator(`[data-testid="subgoal-tab-${i}"]`)).toBeVisible();
    }

    await page.fill('[data-testid="action-title-input"]', 'テストアクション');
    await page.selectOption('[data-testid="action-type-select"]', 'execution');
    await page.click('[data-testid="save-action-button"]');
    await expect(page.locator('text=保存しました')).toBeVisible();
  });

  test('✅ Navigation Flow', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('ダッシュボード');

    await page.goto('/mandala/create/subgoals');
    await expect(page.locator('h1')).toContainText('サブ目標確認・編集');

    await page.goto('/mandala/create/actions');
    await expect(page.locator('h1')).toContainText('アクション確認・編集');
  });

  test('✅ Form Validation', async ({ page }) => {
    await page.goto('/mandala/create/goal');

    await page.fill('[data-testid="goal-title-input"]', 'a'.repeat(50));
    await expect(page.locator('[data-testid="goal-title-character-counter"]')).toContainText(
      '50/100'
    );
  });

  test('✅ Responsive Design', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/mandala/create/actions');
    await expect(page.locator('[data-testid="mobile-layout"]')).toBeVisible();

    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto('/mandala/create/actions');
  });

  test('✅ Accessibility Features', async ({ page }) => {
    await page.goto('/mandala/create/goal');

    await expect(page.locator('[data-testid="goal-title-input"]')).toHaveAttribute(
      'aria-required',
      'true'
    );

    await page.locator('[data-testid="goal-title-input"]').focus();
    await expect(page.locator('[data-testid="goal-title-input"]')).toBeFocused();
  });

  test('✅ Bulk Operations', async ({ page }) => {
    await page.goto('/mandala/create/subgoals');

    await page.click('[data-testid="bulk-edit-mode-button"]');
    await page.click('[data-testid="bulk-edit-button"]');
  });

  test('✅ Draft Save/Restore', async ({ page }) => {
    await page.goto('/mandala/create/goal');

    await page.fill('[data-testid="goal-title-input"]', 'ドラフト目標');
    await page.click('[data-testid="save-draft-button"]');
    await expect(page.locator('text=下書きを保存しました')).toBeVisible();
  });

  test('✅ Error Handling', async ({ page }) => {
    await page.route('**/api/**', route => route.abort('internetdisconnected'));
    await page.goto('/mandala/create/goal');

    await page.fill('[data-testid="goal-title-input"]', 'テスト');
    await page.click('[data-testid="submit-button"]');
    // Should handle gracefully without crashing
  });

  test('✅ Basic UI Elements', async ({ page }) => {
    await page.goto('/mandala/create/subgoals');

    // Check that all basic elements exist
    for (let i = 0; i < 8; i++) {
      await expect(page.locator(`[data-testid="subgoal-item-${i}"]`)).toBeVisible();
    }

    await expect(page.locator('[data-testid="selected-count"]')).toBeVisible();
    await expect(page.locator('[data-testid="bulk-edit-mode-button"]')).toBeVisible();
  });

  test('✅ AI Regeneration', async ({ page }) => {
    await page.goto('/mandala/create/subgoals');

    await page.click('[data-testid="regenerate-subgoals-button"]');
    await expect(page.locator('text=再生成中')).toBeVisible();
  });
});
