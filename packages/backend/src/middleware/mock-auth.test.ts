/**
 * モック認証機能のテスト
 * 要件6.1, 6.2, 6.3のテストケース
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { Hono } from 'hono';
import { jwtAuthMiddleware, optionalAuthMiddleware, getCurrentUser } from './auth';
import { MockUserConfig } from './types';

// 環境変数のモック
const originalEnv = process.env;

describe('モック認証機能', () => {
  let app: Hono;

  beforeEach(() => {
    app = new Hono();
    // 環境変数をリセット
    process.env = {
      ...originalEnv,
      // テスト用のデフォルト値を設定
      NODE_ENV: 'test',
      ENABLE_MOCK_AUTH: 'true',
      COGNITO_USER_POOL_ID: 'test-pool-id',
      COGNITO_CLIENT_ID: 'test-client-id',
      AWS_REGION: 'ap-northeast-1',
      MOCK_USER_ID: 'test-user',
      MOCK_USER_EMAIL: 'test@example.com',
      MOCK_USER_NAME: 'Test User',
    };

    // モジュールキャッシュをクリア
    jest.resetModules();
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.clearAllMocks();
  });

  describe('要件6.1: 環境変数による認証方式切り替え機能', () => {
    it('ENABLE_MOCK_AUTH=trueの場合、モック認証が有効になる', async () => {
      process.env.ENABLE_MOCK_AUTH = 'true';
      process.env.NODE_ENV = 'development';

      app.use('/test', jwtAuthMiddleware());
      app.get('/test', c => {
        const user = getCurrentUser(c);
        return c.json({ user });
      });

      const res = await app.request('/test');
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.user).toBeDefined();
      expect(body.user.email).toContain('@');
    });

    it('ENABLE_MOCK_AUTH=falseの場合、実Cognito認証が必要になる', async () => {
      process.env.ENABLE_MOCK_AUTH = 'false';
      process.env.NODE_ENV = 'development';

      app.use('/test', jwtAuthMiddleware());
      app.get('/test', c => {
        const user = getCurrentUser(c);
        return c.json({ user });
      });

      const res = await app.request('/test');
      expect(res.status).toBe(401);
    });

    it('開発環境では自動的にモック認証が有効になる', async () => {
      process.env.NODE_ENV = 'development';
      delete process.env.ENABLE_MOCK_AUTH;

      app.use('/test', jwtAuthMiddleware());
      app.get('/test', c => {
        const user = getCurrentUser(c);
        return c.json({ user });
      });

      const res = await app.request('/test');
      expect(res.status).toBe(200);
    });

    it('本番環境では自動的にモック認証が無効になる', async () => {
      process.env.NODE_ENV = 'production';
      delete process.env.ENABLE_MOCK_AUTH;

      app.use('/test', jwtAuthMiddleware());
      app.get('/test', c => {
        const user = getCurrentUser(c);
        return c.json({ user });
      });

      const res = await app.request('/test');
      expect(res.status).toBe(401);
    });
  });

  describe('要件6.2: 開発環境用固定ユーザー情報の設定', () => {
    it('環境変数からモックユーザー情報を取得する', async () => {
      process.env.ENABLE_MOCK_AUTH = 'true';
      process.env.MOCK_USER_ID = 'test-user-123';
      process.env.MOCK_USER_EMAIL = 'test@example.com';
      process.env.MOCK_USER_NAME = 'Test User';

      app.use('/test', jwtAuthMiddleware());
      app.get('/test', c => {
        const user = getCurrentUser(c);
        return c.json({ user });
      });

      const res = await app.request('/test');
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.user.id).toBe('test-user-123');
      expect(body.user.email).toBe('test@example.com');
      expect(body.user.name).toBe('Test User');
      expect(body.user.cognitoSub).toBe('mock-cognito-test-user-123');
    });

    it('カスタムモックユーザー設定を使用する', async () => {
      const customMockUser: MockUserConfig = {
        id: 'custom-user-456',
        email: 'custom@example.com',
        name: 'Custom User',
        cognitoSub: 'custom-cognito-sub',
        customAttributes: {
          department: 'Engineering',
        },
      };

      app.use(
        '/test',
        jwtAuthMiddleware({
          enableMockAuth: true,
          mockUser: customMockUser,
        })
      );
      app.get('/test', c => {
        const user = getCurrentUser(c);
        return c.json({ user });
      });

      const res = await app.request('/test');
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.user.id).toBe('custom-user-456');
      expect(body.user.email).toBe('custom@example.com');
      expect(body.user.name).toBe('Custom User');
      expect(body.user.cognitoSub).toBe('custom-cognito-sub');
    });

    it('デフォルトのモックユーザー情報を使用する', async () => {
      app.use(
        '/test',
        jwtAuthMiddleware({
          enableMockAuth: true,
        })
      );
      app.get('/test', c => {
        const user = getCurrentUser(c);
        return c.json({ user });
      });

      const res = await app.request('/test');
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.user.id).toBeDefined();
      expect(body.user.email).toContain('@');
      expect(body.user.name).toBeDefined();
      expect(body.user.cognitoSub).toContain('mock-cognito-');
    });
  });

  describe('要件6.3: 本番環境での実Cognito検証の確保', () => {
    it('本番環境でモック認証が有効な場合、エラーを投げる', async () => {
      process.env.NODE_ENV = 'production';

      app.use(
        '/test',
        jwtAuthMiddleware({
          enableMockAuth: true,
        })
      );
      app.get('/test', c => {
        const user = getCurrentUser(c);
        return c.json({ user });
      });

      const res = await app.request('/test');
      expect(res.status).toBe(500);
    });

    it('本番環境でモック認証が無効な場合、実Cognito認証を要求する', async () => {
      process.env.NODE_ENV = 'production';
      process.env.COGNITO_USER_POOL_ID = 'ap-northeast-1_XXXXXXXXX';
      process.env.COGNITO_CLIENT_ID = 'XXXXXXXXXXXXXXXXXXXXXXXXXX';

      app.use(
        '/test',
        jwtAuthMiddleware({
          enableMockAuth: false,
          userPoolId: 'ap-northeast-1_XXXXXXXXX',
          clientId: 'XXXXXXXXXXXXXXXXXXXXXXXXXX',
          region: 'ap-northeast-1',
        })
      );
      app.get('/test', c => {
        const user = getCurrentUser(c);
        return c.json({ user });
      });

      const res = await app.request('/test');
      expect(res.status).toBe(401);

      const body = await res.json();
      expect(body.error).toBe('TOKEN_MISSING');
    });

    it('ステージング環境では実Cognito認証を使用する', async () => {
      process.env.NODE_ENV = 'staging';
      process.env.ENABLE_MOCK_AUTH = 'false';

      app.use('/test', jwtAuthMiddleware());
      app.get('/test', c => {
        const user = getCurrentUser(c);
        return c.json({ user });
      });

      const res = await app.request('/test');
      expect(res.status).toBe(401);
    });
  });

  describe('オプショナル認証でのモック機能', () => {
    it('オプショナル認証でもモック認証が動作する', async () => {
      process.env.ENABLE_MOCK_AUTH = 'true';

      app.use('/test', optionalAuthMiddleware());
      app.get('/test', c => {
        const user = c.get('user');
        const isAuthenticated = c.get('isAuthenticated');
        return c.json({ user, isAuthenticated });
      });

      const res = await app.request('/test');
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.isAuthenticated).toBe(true);
      expect(body.user).toBeDefined();
    });

    it('オプショナル認証でモック認証が無効な場合、認証なしで通る', async () => {
      process.env.ENABLE_MOCK_AUTH = 'false';

      app.use('/test', optionalAuthMiddleware());
      app.get('/test', c => {
        const user = c.get('user');
        const isAuthenticated = c.get('isAuthenticated');
        return c.json({ user, isAuthenticated });
      });

      const res = await app.request('/test');
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.isAuthenticated).toBe(false);
      expect(body.user).toBeUndefined();
    });
  });

  describe('エラーケース', () => {
    it('無効なモックユーザー設定でエラーハンドリングが動作する', async () => {
      const invalidMockUser = {
        id: '', // 無効なID
        email: 'invalid-email', // 無効なメール
        name: 'Test User',
        cognitoSub: 'test-sub',
      } as MockUserConfig;

      // 環境変数の検証でエラーが発生することを期待
      expect(() => {
        process.env.MOCK_USER_EMAIL = 'invalid-email';
        process.env.MOCK_USER_ID = '';
        // 設定の再読み込みをシミュレート
        require('./auth');
      }).toThrow();
    });
  });
});
