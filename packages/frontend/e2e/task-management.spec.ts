import { test, expect } from '@playwright/test';
import { setupTestUser, cleanupTestData } from './helpers/test-data';
import { mockApiResponses } from './helpers/api-mocks';

test.describe('Task Management E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Setup test user and mock API responses
    await setupTestUser(page);
    await mockApiResponses(page);

    // Navigate to task list page
    await page.goto('/tasks');
  });

  test.afterEach(async ({ page }) => {
    await cleanupTestData(page);
  });

  test('should display task list', async ({ page }) => {
    // Wait for task list to load
    await page.waitForSelector('[data-testid="task-list"]');

    // Verify task cards are displayed
    const taskCards = page.locator('[data-testid="task-card"]');
    await expect(taskCards).toHaveCount(3);

    // Verify task information is displayed
    const firstTask = taskCards.first();
    await expect(firstTask.locator('[data-testid="task-title"]')).toBeVisible();
    await expect(firstTask.locator('[data-testid="task-status"]')).toBeVisible();
    await expect(firstTask.locator('[data-testid="task-deadline"]')).toBeVisible();
  });

  test('should update task status', async ({ page }) => {
    // Wait for task list to load
    await page.waitForSelector('[data-testid="task-list"]');

    // Click on first task to open detail page
    const firstTask = page.locator('[data-testid="task-card"]').first();
    await firstTask.click();

    // Wait for task detail page to load
    await page.waitForSelector('[data-testid="task-detail"]');

    // Update task status to in_progress
    const statusSelect = page.locator('[data-testid="task-status-select"]');
    await statusSelect.selectOption('in_progress');

    // Verify status was updated
    await expect(statusSelect).toHaveValue('in_progress');

    // Verify completion time is not shown for in_progress status
    await expect(page.locator('[data-testid="completion-time"]')).not.toBeVisible();

    // Update task status to completed
    await statusSelect.selectOption('completed');

    // Verify completion time is shown for completed status
    await expect(page.locator('[data-testid="completion-time"]')).toBeVisible();
  });

  test('should filter tasks by status', async ({ page }) => {
    // Wait for task list to load
    await page.waitForSelector('[data-testid="task-list"]');

    // Open status filter
    const statusFilter = page.locator('[data-testid="status-filter"]');
    await statusFilter.click();

    // Select only completed tasks
    await page.locator('[data-testid="status-completed"]').check();
    await page.locator('[data-testid="status-not-started"]').uncheck();
    await page.locator('[data-testid="status-in-progress"]').uncheck();

    // Apply filter
    await page.locator('[data-testid="apply-filter"]').click();

    // Verify only completed tasks are shown
    const taskCards = page.locator('[data-testid="task-card"]');
    await expect(taskCards).toHaveCount(1);

    const taskStatus = taskCards.first().locator('[data-testid="task-status"]');
    await expect(taskStatus).toHaveText('完了');
  });

  test('should search tasks by keyword', async ({ page }) => {
    // Wait for task list to load
    await page.waitForSelector('[data-testid="task-list"]');

    // Enter search keyword
    const searchInput = page.locator('[data-testid="search-input"]');
    await searchInput.fill('重要');

    // Wait for search results
    await page.waitForTimeout(500); // Wait for debounce

    // Verify search results
    const taskCards = page.locator('[data-testid="task-card"]');
    await expect(taskCards).toHaveCount(1);

    const taskTitle = taskCards.first().locator('[data-testid="task-title"]');
    await expect(taskTitle).toContainText('重要');
  });

  test('should add and edit task notes', async ({ page }) => {
    // Wait for task list to load
    await page.waitForSelector('[data-testid="task-list"]');

    // Click on first task to open detail page
    const firstTask = page.locator('[data-testid="task-card"]').first();
    await firstTask.click();

    // Wait for task detail page to load
    await page.waitForSelector('[data-testid="task-detail"]');

    // Add a note
    const noteInput = page.locator('[data-testid="note-input"]');
    await noteInput.fill('これは重要なタスクです');

    const addNoteButton = page.locator('[data-testid="add-note-button"]');
    await addNoteButton.click();

    // Verify note was added
    const notesList = page.locator('[data-testid="notes-list"]');
    await expect(notesList.locator('[data-testid="note-item"]')).toHaveCount(1);
    await expect(notesList.locator('[data-testid="note-content"]').first()).toHaveText(
      'これは重要なタスクです'
    );

    // Edit the note
    const editButton = page.locator('[data-testid="edit-note-button"]').first();
    await editButton.click();

    const editInput = page.locator('[data-testid="edit-note-input"]');
    await editInput.fill('更新されたノート内容');

    const saveButton = page.locator('[data-testid="save-note-button"]');
    await saveButton.click();

    // Verify note was updated
    await expect(notesList.locator('[data-testid="note-content"]').first()).toHaveText(
      '更新されたノート内容'
    );
  });

  test('should perform bulk operations', async ({ page }) => {
    // Wait for task list to load
    await page.waitForSelector('[data-testid="task-list"]');

    // Select multiple tasks
    const taskCheckboxes = page.locator('[data-testid="task-checkbox"]');
    await taskCheckboxes.first().check();
    await taskCheckboxes.nth(1).check();

    // Verify bulk actions are shown
    const bulkActions = page.locator('[data-testid="bulk-actions"]');
    await expect(bulkActions).toBeVisible();

    // Perform bulk status update
    const bulkStatusButton = page.locator('[data-testid="bulk-status-button"]');
    await bulkStatusButton.click();

    const statusSelect = page.locator('[data-testid="bulk-status-select"]');
    await statusSelect.selectOption('completed');

    const confirmButton = page.locator('[data-testid="confirm-bulk-action"]');
    await confirmButton.click();

    // Verify tasks were updated
    const selectedTasks = page.locator(
      '[data-testid="task-card"]:has([data-testid="task-checkbox"]:checked)'
    );
    const statusBadges = selectedTasks.locator('[data-testid="task-status"]');

    for (let i = 0; i < (await statusBadges.count()); i++) {
      await expect(statusBadges.nth(i)).toHaveText('完了');
    }
  });

  test('should save and load search views', async ({ page }) => {
    // Wait for task list to load
    await page.waitForSelector('[data-testid="task-list"]');

    // Apply filters and search
    const statusFilter = page.locator('[data-testid="status-filter"]');
    await statusFilter.click();
    await page.locator('[data-testid="status-completed"]').check();
    await page.locator('[data-testid="apply-filter"]').click();

    const searchInput = page.locator('[data-testid="search-input"]');
    await searchInput.fill('重要');
    await page.waitForTimeout(500);

    // Save view
    const saveViewButton = page.locator('[data-testid="save-view-button"]');
    await saveViewButton.click();

    const viewNameInput = page.locator('[data-testid="view-name-input"]');
    await viewNameInput.fill('完了した重要タスク');

    const confirmSaveButton = page.locator('[data-testid="confirm-save-view"]');
    await confirmSaveButton.click();

    // Clear filters and search
    await page.locator('[data-testid="clear-filters"]').click();
    await searchInput.clear();

    // Load saved view
    const savedViewsDropdown = page.locator('[data-testid="saved-views-dropdown"]');
    await savedViewsDropdown.click();

    const savedView = page
      .locator('[data-testid="saved-view-item"]')
      .filter({ hasText: '完了した重要タスク' });
    await savedView.click();

    // Verify filters and search were restored
    await expect(searchInput).toHaveValue('重要');
    await expect(page.locator('[data-testid="status-completed"]')).toBeChecked();
  });
});
