import { Page } from '@playwright/test';

export async function setupTestEnvironment(page: Page) {
  // Mock authentication
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

  // Enhanced API mocking to prevent hanging
  await page.route('**/api/**', async route => {
    const url = route.request().url();
    const method = route.request().method();

    // Handle specific API endpoints
    if (url.includes('/api/goals/') && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'test-goal-id',
          title: 'テスト目標',
          description: 'テスト説明',
          deadline: '2024-12-31',
          background: 'テスト背景',
          constraints: 'テスト制約',
          status: 'active',
          progress: 0,
          user_id: 'test-user-id',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        }),
      });
    } else if (url.includes('/api/subgoals') && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'subgoal-1',
            goal_id: 'test-goal-id',
            title: 'サブ目標1',
            description: '説明1',
            position: 0,
            progress: 0,
          },
        ]),
      });
    } else if (url.includes('/api/actions') && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'action-1',
            sub_goal_id: 'subgoal-1',
            title: 'アクション1',
            description: '説明1',
            position: 0,
            progress: 0,
          },
        ]),
      });
    } else if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
      // Handle create/update operations
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, id: 'mock-id' }),
      });
    } else {
      // Default fallback
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [] }),
      });
    }
  });

  // Mock network conditions
  await page.route('**/*', route => {
    if (route.request().url().includes('disconnect')) {
      route.abort('internetdisconnected');
    } else {
      route.continue();
    }
  });
}
