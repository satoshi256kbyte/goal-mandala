import { Page } from '@playwright/test';

export async function setupTestUser(page: Page) {
  // Mock authentication
  await page.addInitScript(() => {
    localStorage.setItem('accessToken', 'mock-access-token');
    localStorage.setItem('refreshToken', 'mock-refresh-token');
    localStorage.setItem(
      'user',
      JSON.stringify({
        id: 'test-user-1',
        email: 'test@example.com',
        name: 'Test User',
      })
    );
  });

  // Mock user profile API
  await page.route('**/api/profile', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'test-user-1',
        email: 'test@example.com',
        name: 'Test User',
        industry: 'IT',
        companySize: '50-100',
        jobTitle: 'エンジニア',
        position: 'シニア',
      }),
    });
  });
}

export async function cleanupTestData(page: Page) {
  // Clear localStorage
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  // Clear any remaining API mocks
  await page.unrouteAll();
}

export async function createTestTask(
  page: Page,
  taskData: {
    id: string;
    title: string;
    status: string;
    description?: string;
  }
) {
  // Mock task creation API
  await page.route('**/api/tasks', async route => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          task: {
            id: taskData.id,
            title: taskData.title,
            description: taskData.description || '',
            status: taskData.status,
            type: 'execution',
            estimatedMinutes: 30,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        }),
      });
    }
  });
}

export async function createTestGoalHierarchy(page: Page) {
  const testData = {
    goal: {
      id: 'test-goal-1',
      title: 'テスト目標',
      description: 'テスト用の目標です',
      deadline: '2025-12-31',
      status: 'ACTIVE',
      progress: 25,
    },
    subGoals: [
      {
        id: 'test-subgoal-1',
        goalId: 'test-goal-1',
        title: 'テストサブ目標1',
        description: 'テスト用のサブ目標1です',
        position: 0,
        progress: 50,
      },
      {
        id: 'test-subgoal-2',
        goalId: 'test-goal-1',
        title: 'テストサブ目標2',
        description: 'テスト用のサブ目標2です',
        position: 1,
        progress: 0,
      },
    ],
    actions: [
      {
        id: 'test-action-1',
        subGoalId: 'test-subgoal-1',
        title: 'テストアクション1',
        description: 'テスト用のアクション1です',
        type: 'EXECUTION',
        position: 0,
        progress: 100,
      },
      {
        id: 'test-action-2',
        subGoalId: 'test-subgoal-1',
        title: 'テストアクション2',
        description: 'テスト用のアクション2です',
        type: 'HABIT',
        position: 1,
        progress: 0,
      },
    ],
  };

  // Mock goal hierarchy APIs
  await page.route('**/api/goals/*', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(testData.goal),
    });
  });

  await page.route('**/api/subgoals', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(testData.subGoals),
    });
  });

  await page.route('**/api/actions', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(testData.actions),
    });
  });

  return testData;
}

export async function waitForTaskListLoad(page: Page) {
  // Wait for task list to be visible
  await page.waitForSelector('[data-testid="task-list"]', { timeout: 10000 });

  // Wait for loading spinner to disappear
  await page
    .waitForSelector('[data-testid="loading-spinner"]', {
      state: 'hidden',
      timeout: 5000,
    })
    .catch(() => {
      // Loading spinner might not exist, which is fine
    });

  // Wait for at least one task card to be visible
  await page.waitForSelector('[data-testid="task-card"]', { timeout: 5000 });
}

export async function waitForTaskDetailLoad(page: Page) {
  // Wait for task detail to be visible
  await page.waitForSelector('[data-testid="task-detail"]', { timeout: 10000 });

  // Wait for loading spinner to disappear
  await page
    .waitForSelector('[data-testid="loading-spinner"]', {
      state: 'hidden',
      timeout: 5000,
    })
    .catch(() => {
      // Loading spinner might not exist, which is fine
    });
}
