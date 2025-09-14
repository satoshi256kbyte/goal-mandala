/**
 * モック認証機能の統合テスト
 * 要件6.1, 6.2, 6.3の統合テスト
 */

import { describe, it, expect } from '@jest/globals';
import { Hono } from 'hono';
import { jwtAuthMiddleware, optionalAuthMiddleware, getCurrentUser } from './auth';

describe('モック認証機能 - 統合テスト', () => {
  describe('要件6.1: 環境変数による認証方式切り替え機能', () => {
    it('開発環境では自動的にモック認証が有効になる', async () => {
      const app = new Hono();

      // 開発環境設定でミドルウェアを作成
      app.use(
        '/api/*',
        jwtAuthMiddleware({
          enableMockAuth: true, // 開発環境相当
        })
      );

      app.get('/api/profile', c => {
        const user = getCurrentUser(c);
        return c.json({
          authenticated: true,
          user: {
            id: user.id,
            email: user.email,
          },
        });
      });

      const res = await app.request('/api/profile');
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.authenticated).toBe(true);
      expect(body.user.id).toBeDefined();
      expect(body.user.email).toContain('@');
    });

    it('本番環境では実Cognito認証が必要になる', async () => {
      const app = new Hono();

      // 本番環境設定でミドルウェアを作成
      app.use(
        '/api/*',
        jwtAuthMiddleware({
          enableMockAuth: false, // 本番環境相当
          userPoolId: 'ap-northeast-1_XXXXXXXXX',
          clientId: 'XXXXXXXXXXXXXXXXXXXXXXXXXX',
          region: 'ap-northeast-1',
        })
      );

      app.get('/api/profile', c => {
        const user = getCurrentUser(c);
        return c.json({ user });
      });

      const res = await app.request('/api/profile');
      expect(res.status).toBe(401);
    });
  });

  describe('要件6.2: 開発環境用固定ユーザー情報の設定', () => {
    it('カスタムモックユーザー設定が正しく動作する', async () => {
      const customMockUser = {
        id: 'dev-user-001',
        email: 'developer@company.com',
        name: 'Development User',
        cognitoSub: 'dev-cognito-sub-001',
        customAttributes: {
          department: 'Engineering',
          role: 'Senior Developer',
        },
      };

      const app = new Hono();
      app.use(
        '/api/*',
        jwtAuthMiddleware({
          enableMockAuth: true,
          mockUser: customMockUser,
        })
      );

      app.get('/api/profile', c => {
        const user = getCurrentUser(c);
        return c.json({
          user,
          context: c.get('isAuthenticated'),
        });
      });

      const res = await app.request('/api/profile');
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.context).toBe(true);
      expect(body.user.id).toBe('dev-user-001');
      expect(body.user.email).toBe('developer@company.com');
      expect(body.user.name).toBe('Development User');
      expect(body.user.cognitoSub).toBe('dev-cognito-sub-001');
    });

    it('複数の異なるモックユーザー設定が独立して動作する', async () => {
      const app = new Hono();

      // 管理者用エンドポイント
      app.use(
        '/api/admin/*',
        jwtAuthMiddleware({
          enableMockAuth: true,
          mockUser: {
            id: 'admin-001',
            email: 'admin@company.com',
            name: 'Admin User',
            cognitoSub: 'admin-cognito-sub',
          },
        })
      );

      // 一般ユーザー用エンドポイント
      app.use(
        '/api/user/*',
        jwtAuthMiddleware({
          enableMockAuth: true,
          mockUser: {
            id: 'user-001',
            email: 'user@company.com',
            name: 'Regular User',
            cognitoSub: 'user-cognito-sub',
          },
        })
      );

      app.get('/api/admin/dashboard', c => {
        const user = getCurrentUser(c);
        return c.json({ role: 'admin', user });
      });

      app.get('/api/user/profile', c => {
        const user = getCurrentUser(c);
        return c.json({ role: 'user', user });
      });

      // 管理者エンドポイントのテスト
      const adminRes = await app.request('/api/admin/dashboard');
      expect(adminRes.status).toBe(200);
      const adminBody = await adminRes.json();
      expect(adminBody.user.id).toBe('admin-001');
      expect(adminBody.user.email).toBe('admin@company.com');

      // 一般ユーザーエンドポイントのテスト
      const userRes = await app.request('/api/user/profile');
      expect(userRes.status).toBe(200);
      const userBody = await userRes.json();
      expect(userBody.user.id).toBe('user-001');
      expect(userBody.user.email).toBe('user@company.com');
    });
  });

  describe('要件6.3: 本番環境での実Cognito検証の確保', () => {
    it('オプショナル認証でもモック機能が正しく動作する', async () => {
      const app = new Hono();

      app.use(
        '/api/public/*',
        optionalAuthMiddleware({
          enableMockAuth: true,
          mockUser: {
            id: 'optional-user',
            email: 'optional@test.com',
            name: 'Optional User',
            cognitoSub: 'optional-cognito-sub',
          },
        })
      );

      app.get('/api/public/content', c => {
        const user = c.get('user');
        const isAuthenticated = c.get('isAuthenticated');

        return c.json({
          public: true,
          authenticated: isAuthenticated,
          user: user || null,
        });
      });

      const res = await app.request('/api/public/content');
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.public).toBe(true);
      expect(body.authenticated).toBe(true);
      expect(body.user).toBeDefined();
      expect(body.user.id).toBe('optional-user');
    });

    it('認証とオプショナル認証の組み合わせが正しく動作する', async () => {
      const app = new Hono();

      // 必須認証エンドポイント
      app.use(
        '/api/protected/*',
        jwtAuthMiddleware({
          enableMockAuth: true,
          mockUser: {
            id: 'protected-user',
            email: 'protected@test.com',
            name: 'Protected User',
            cognitoSub: 'protected-cognito-sub',
          },
        })
      );

      // オプショナル認証エンドポイント
      app.use(
        '/api/optional/*',
        optionalAuthMiddleware({
          enableMockAuth: false, // モック認証無効
        })
      );

      app.get('/api/protected/data', c => {
        const user = getCurrentUser(c);
        return c.json({ protected: true, user });
      });

      app.get('/api/optional/data', c => {
        const user = c.get('user');
        const isAuthenticated = c.get('isAuthenticated');
        return c.json({
          optional: true,
          authenticated: isAuthenticated,
          user: user || null,
        });
      });

      // 必須認証エンドポイントのテスト（成功）
      const protectedRes = await app.request('/api/protected/data');
      expect(protectedRes.status).toBe(200);
      const protectedBody = await protectedRes.json();
      expect(protectedBody.user.id).toBe('protected-user');

      // オプショナル認証エンドポイントのテスト（認証なしで成功）
      const optionalRes = await app.request('/api/optional/data');
      expect(optionalRes.status).toBe(200);
      const optionalBody = await optionalRes.json();
      expect(optionalBody.authenticated).toBe(false);
      expect(optionalBody.user).toBeNull();
    });
  });

  describe('エラーハンドリングと境界値テスト', () => {
    it('無効な設定でも適切にエラーハンドリングされる', async () => {
      const app = new Hono();

      // 空のモックユーザー設定
      app.use(
        '/test',
        jwtAuthMiddleware({
          enableMockAuth: true,
          mockUser: {
            id: '',
            email: '',
            name: '',
            cognitoSub: '',
          },
        })
      );

      app.get('/test', c => {
        const user = getCurrentUser(c);
        return c.json({ user });
      });

      const res = await app.request('/test');
      expect(res.status).toBe(200); // モック認証は成功するが、空の値が設定される

      const body = await res.json();
      expect(body.user.id).toBe('');
      expect(body.user.email).toBe('');
    });

    it('認証が必要なエンドポイントで適切なエラーレスポンスが返される', async () => {
      const app = new Hono();

      app.use(
        '/api/secure/*',
        jwtAuthMiddleware({
          enableMockAuth: false,
          userPoolId: 'test-pool',
          clientId: 'test-client',
          region: 'ap-northeast-1',
        })
      );

      app.get('/api/secure/data', c => {
        const user = getCurrentUser(c);
        return c.json({ user });
      });

      const res = await app.request('/api/secure/data');
      expect(res.status).toBe(401);

      const body = await res.json();
      expect(body.error).toBeDefined();
      expect(body.message).toBeDefined();
    });
  });
});
