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

  // Mock all API calls
  await page.route('**/api/**', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: [] }),
    });
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
