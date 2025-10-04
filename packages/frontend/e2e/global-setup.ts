import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  // E2Eテスト用の環境変数を設定
  process.env.VITE_MOCK_AUTH_ENABLED = 'true';
  process.env.VITE_API_BASE_URL = 'http://localhost:3001';

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  // モック認証データを設定
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

  // アプリケーションが起動するまで待機
  try {
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    console.log('✅ Frontend server is ready');
  } catch (error) {
    console.error('❌ Frontend server is not ready:', error);
    throw error;
  }

  await browser.close();
}

export default globalSetup;
