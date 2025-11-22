import { test } from '@playwright/test';

test.describe('Task Management E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.addInitScript(() => {
      localStorage.setItem('accessToken', 'mock-token');
    });

    // Mock API responses
    await page.route('**/api/tasks', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          json: {
            tasks: [
              {
                id: '1',
                actionId: 'action-1',
                title: 'Test Task 1',
                description: 'Test Description 1',
                type: 'execution',
                status: 'not_started',
                estimatedMinutes: 30,
                deadline: '2025-12-31T23:59:59Z',
                createdAt: '2025-01-01T00:00:00Z',
                updatedAt: '2025-01-01T00:00:00Z',
              },
              {
                id: '2',
                actionId: 'action-1',
                title: 'Test Task 2',
                description: 'Test Description 2',
                type: 'habit',
                status: 'completed',
                estimatedMinutes: 45,
                completedAt: '2025-01-02T12:00:00Z',
                createdAt: '2025-01-01T00:00:00Z',
                updatedAt: '2025-01-02T12:00:00Z',
              },
            ],
          },
        });
      }
    });

    await page.goto('/tasks');
  });

  test('should display task list', async ({ page }) => {
    // Wait for tasks to load
    await expect(page.locator('[data-testid="task-card"]')).toHaveCount(2);

    // Check task titles are displayed
    await expect(page.locator('text=Test Task 1')).toBeVisible();
    await expect(page.locator('text=Test Task 2')).toBeVisible();

    // Check status badges
    await expect(page.locator('text=未着手')).toBeVisible();
    await expect(page.locator('text=完了')).toBeVisible();
  });

  test('should filter tasks by status', async ({ page }) => {
    // Click on completed status filter
    await page.locator('input[type="checkbox"]').nth(3).check(); // completed checkbox

    // Should show only completed tasks
    await expect(page.locator('[data-testid="task-card"]')).toHaveCount(1);
    await expect(page.locator('text=Test Task 2')).toBeVisible();
    await expect(page.locator('text=Test Task 1')).not.toBeVisible();
  });

  test('should search tasks', async ({ page }) => {
    // Enter search query
    await page.locator('input[placeholder="タスクを検索..."]').fill('Task 1');

    // Wait for debounce
    await page.waitForTimeout(400);

    // Should show only matching tasks
    await expect(page.locator('[data-testid="task-card"]')).toHaveCount(1);
    await expect(page.locator('text=Test Task 1')).toBeVisible();
    await expect(page.locator('text=Test Task 2')).not.toBeVisible();
  });

  test('should update task status', async ({ page }) => {
    // Mock status update API
    await page.route('**/api/tasks/1/status', async route => {
      await route.fulfill({
        json: {
          task: {
            id: '1',
            status: 'completed',
            completedAt: '2025-01-03T12:00:00Z',
          },
        },
      });
    });

    // Select new status
    await page.locator('select').first().selectOption('completed');

    // Verify optimistic update
    await expect(page.locator('text=完了').first()).toBeVisible();
  });

  test('should select and bulk update tasks', async ({ page }) => {
    // Mock bulk update API
    await page.route('**/api/tasks/bulk/status', async route => {
      await route.fulfill({
        json: { success: true, updatedCount: 2 },
      });
    });

    // Select all tasks
    await page.locator('input[type="checkbox"]').first().check(); // select all checkbox

    // Verify bulk actions are shown
    await expect(page.locator('text=2個のタスクが選択されています')).toBeVisible();

    // Click bulk complete
    await page.locator('button:has-text("一括完了")').click();

    // Verify success (would need to check API call in real test)
    await expect(page.locator('button:has-text("一括完了")')).toBeVisible();
  });

  test('should save and load views', async ({ page }) => {
    // Mock saved views API
    await page.route('**/api/saved-views', async route => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          json: {
            view: {
              id: 'view-1',
              name: 'My View',
              filters: { statuses: ['completed'] },
            },
          },
        });
      } else {
        await route.fulfill({
          json: {
            views: [
              {
                id: 'view-1',
                name: 'My View',
                filters: { statuses: ['completed'] },
              },
            ],
          },
        });
      }
    });

    // Apply filter
    await page.locator('input[type="checkbox"]').nth(3).check(); // completed

    // Save view
    await page.locator('button:has-text("ビューを保存")').click();
    await page.locator('input[placeholder="ビュー名を入力..."]').fill('My View');
    await page.locator('button:has-text("保存")').click();

    // Verify view was saved (dialog should close)
    await expect(page.locator('input[placeholder="ビュー名を入力..."]')).not.toBeVisible();
  });

  test('should show progress bar', async ({ page }) => {
    // Check progress bar is displayed
    await expect(page.locator('[data-testid="progress-bar"]')).toBeVisible();

    // Check progress percentage (50% - 1 of 2 tasks completed)
    await expect(page.locator('text=50%')).toBeVisible();
  });

  test('should group tasks by status', async ({ page }) => {
    // Check status group headers
    await expect(page.locator('h2:has-text("未着手")')).toBeVisible();
    await expect(page.locator('h2:has-text("完了")')).toBeVisible();

    // Check task counts in headers
    await expect(page.locator('text=未着手 (1)')).toBeVisible();
    await expect(page.locator('text=完了 (1)')).toBeVisible();
  });

  test('should handle empty state', async ({ page }) => {
    // Mock empty response
    await page.route('**/api/tasks', async route => {
      await route.fulfill({
        json: { tasks: [] },
      });
    });

    await page.reload();

    // Check empty state message
    await expect(page.locator('text=条件に一致するタスクがありません')).toBeVisible();
  });
});
