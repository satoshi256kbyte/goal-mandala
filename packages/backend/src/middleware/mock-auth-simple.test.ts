/**
 * モック認証機能の簡単なテスト
 */

import { describe, it, expect } from '@jest/globals';
import { Hono } from 'hono';
import { jwtAuthMiddleware, getCurrentUser } from './auth';

describe('モック認証機能 - 基本テスト', () => {
  it('モック認証が有効な場合、認証が成功する', async () => {
    const app = new Hono();

    // モック認証を明示的に有効にする
    app.use(
      '/test',
      jwtAuthMiddleware({
        enableMockAuth: true,
        mockUser: {
          id: 'test-user-123',
          email: 'test@example.com',
          name: 'Test User',
          cognitoSub: 'test-cognito-sub',
        },
      })
    );

    app.get('/test', c => {
      const user = getCurrentUser(c);
      return c.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      });
    });

    const res = await app.request('/test');
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.user.id).toBe('test-user-123');
    expect(body.user.email).toBe('test@example.com');
    expect(body.user.name).toBe('Test User');
  });

  it('モック認証が無効な場合、認証が失敗する', async () => {
    const app = new Hono();

    // モック認証を明示的に無効にする
    app.use(
      '/test',
      jwtAuthMiddleware({
        enableMockAuth: false,
        userPoolId: 'test-pool-id',
        clientId: 'test-client-id',
        region: 'ap-northeast-1',
      })
    );

    app.get('/test', c => {
      const user = getCurrentUser(c);
      return c.json({ user });
    });

    const res = await app.request('/test');
    expect(res.status).toBe(401);
  });

  it('カスタムモックユーザーが正しく設定される', async () => {
    const customUser = {
      id: 'custom-123',
      email: 'custom@test.com',
      name: 'Custom User',
      cognitoSub: 'custom-cognito-sub',
    };

    const app = new Hono();
    app.use(
      '/test',
      jwtAuthMiddleware({
        enableMockAuth: true,
        mockUser: customUser,
      })
    );

    app.get('/test', c => {
      const user = getCurrentUser(c);
      return c.json({ user });
    });

    const res = await app.request('/test');
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.user.id).toBe('custom-123');
    expect(body.user.email).toBe('custom@test.com');
    expect(body.user.name).toBe('Custom User');
    expect(body.user.cognitoSub).toBe('custom-cognito-sub');
  });
});
