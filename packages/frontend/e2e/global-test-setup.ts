import { Page } from '@playwright/test';

export async function setupMockAuth(page: Page) {
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
}

export async function setupMockAPI(page: Page) {
  await page.route('**/api/**', route => {
    const url = route.request().url();
    const method = route.request().method();

    // Mock successful responses for all API calls
    if (method === 'POST' || method === 'PUT') {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: '成功しました' }),
      });
    } else {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [], success: true }),
      });
    }
  });
}
