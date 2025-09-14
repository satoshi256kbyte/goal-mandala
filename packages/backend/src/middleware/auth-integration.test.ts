/**
 * JWT認証ミドルウェアの統合テスト
 * 要件の包括的なテストカバレッジを提供
 */

import { Hono } from 'hono';
import { jwtAuthMiddleware, optionalAuthMiddleware, getCurrentUser } from './auth';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// 環境変数のモック
jest.mock('../config/environment', () => ({
  config: {
    NODE_ENV: 'test',
    JWT_SECRET: 'test-secret',
    COGNITO_USER_POOL_ID: 'ap-northeast-1_test123',
    COGNITO_CLIENT_ID: 'test-client-id',
    AWS_REGION: 'ap-northeast-1',
    ENABLE_MOCK_AUTH: false, // 実JWT検証をテスト
    JWT_CACHE_TTL: 3600,
    LOG_LEVEL: 'INFO',
    ENABLE_SECURITY_AUDIT: true,
    MOCK_USER_ID: 'mock-user-id',
    MOCK_USER_EMAIL: 'mock@example.com',
    MOCK_USER_NAME: 'Mock User',
  },
  getConfig: jest.fn(() => ({
    NODE_ENV: 'test',
    JWT_SECRET: 'test-secret',
    COGNITO_USER_POOL_ID: 'ap-northeast-1_test123',
    COGNITO_CLIENT_ID: 'test-client-id',
    AWS_REGION: 'ap-northeast-1',
    ENABLE_MOCK_AUTH: false,
    JWT_CACHE_TTL: 3600,
    LOG_LEVEL: 'INFO',
    ENABLE_SECURITY_AUDIT: true,
    MOCK_USER_ID: 'mock-user-id',
    MOCK_USER_EMAIL: 'mock@example.com',
    MOCK_USER_NAME: 'Mock User',
  })),
}));

jest.mock('../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
  },
}));

// fetch のモック
global.fetch = jest.fn();

describe('JWT認証ミドルウェア統合テスト', () => {
  let app: Hono;
  let publicKey: string;
  let privateKey: string;

  const userPoolId = 'ap-northeast-1_test123';
  const clientId = 'test-client-id';
  const region = 'ap-northeast-1';
  const expectedIssuer = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`;

  beforeAll(() => {
    // RSA キーペアを生成
    const keyPair = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem',
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem',
      },
    });

    publicKey = keyPair.publicKey;
    privateKey = keyPair.privateKey;
  });

  beforeEach(() => {
    app = new Hono();
    jest.clearAllMocks();

    // JWKSレスポンスのモック
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        keys: [
          {
            alg: 'RS256',
            e: 'AQAB',
            kid: 'test-kid',
            kty: 'RSA',
            n: 'test-n-value',
            use: 'sig',
          },
        ],
      }),
    });
  });

  describe('要件1: JWT認証機能の基本動作', () => {
    it('要件1.1: 有効なJWTトークンで認証が成功する', async () => {
      const payload = {
        sub: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
        iss: expectedIssuer,
        aud: clientId,
        token_use: 'access',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      const token = jwt.sign(payload, privateKey, {
        algorithm: 'RS256',
        header: { kid: 'test-kid', typ: 'JWT' },
      });

      app.use('/protected', jwtAuthMiddleware());
      app.get('/protected', c => {
        const user = getCurrentUser(c);
        return c.json({ user });
      });

      const res = await app.request('/protected', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.user.id).toBe('test-user-id');
      expect(body.user.email).toBe('test@example.com');
    });

    it('要件1.2: 無効なJWTトークンで401エラーを返す', async () => {
      app.use('/protected', jwtAuthMiddleware());
      app.get('/protected', c => c.json({ message: 'success' }));

      const res = await app.request('/protected', {
        headers: {
          Authorization: 'Bearer invalid-token',
        },
      });

      expect(res.status).toBe(400); // TOKEN_INVALID
    });

    it('要件1.3: Authorizationヘッダーがない場合401エラーを返す', async () => {
      app.use('/protected', jwtAuthMiddleware());
      app.get('/protected', c => c.json({ message: 'success' }));

      const res = await app.request('/protected');

      expect(res.status).toBe(401); // TOKEN_MISSING
    });

    it('要件1.4: 期限切れトークンで401エラーを返す', async () => {
      const payload = {
        sub: 'test-user-id',
        email: 'test@example.com',
        iss: expectedIssuer,
        aud: clientId,
        token_use: 'access',
        iat: Math.floor(Date.now() / 1000) - 7200, // 2時間前
        exp: Math.floor(Date.now() / 1000) - 3600, // 1時間前（期限切れ）
      };

      const token = jwt.sign(payload, privateKey, {
        algorithm: 'RS256',
        header: { kid: 'test-kid', typ: 'JWT' },
      });

      app.use('/protected', jwtAuthMiddleware());
      app.get('/protected', c => c.json({ message: 'success' }));

      const res = await app.request('/protected', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(res.status).toBe(401); // TOKEN_EXPIRED
    });

    it('要件1.5: 認証成功時にユーザー情報をコンテキストに設定する', async () => {
      const payload = {
        sub: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
        iss: expectedIssuer,
        aud: clientId,
        token_use: 'access',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
        'cognito:username': 'testuser',
      };

      const token = jwt.sign(payload, privateKey, {
        algorithm: 'RS256',
        header: { kid: 'test-kid', typ: 'JWT' },
      });

      app.use('/protected', jwtAuthMiddleware());
      app.get('/protected', c => {
        const user = c.get('user');
        const isAuthenticated = c.get('isAuthenticated');
        const authMetadata = c.get('authMetadata');
        return c.json({ user, isAuthenticated, authMetadata });
      });

      const res = await app.request('/protected', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.isAuthenticated).toBe(true);
      expect(body.user.id).toBe('test-user-id');
      expect(body.user.cognitoSub).toBe('test-user-id');
      expect(body.authMetadata.authMethod).toBe('jwt');
    });
  });

  describe('要件2: Cognito固有の検証', () => {
    it('要件2.2: 無効なissuerでCLAIMS_INVALIDエラーを返す', async () => {
      const payload = {
        sub: 'test-user-id',
        email: 'test@example.com',
        iss: 'https://invalid-issuer.com',
        aud: clientId,
        token_use: 'access',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      const token = jwt.sign(payload, privateKey, {
        algorithm: 'RS256',
        header: { kid: 'test-kid', typ: 'JWT' },
      });

      app.use('/protected', jwtAuthMiddleware());
      app.get('/protected', c => c.json({ message: 'success' }));

      const res = await app.request('/protected', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(res.status).toBe(401); // CLAIMS_INVALID
    });

    it('要件2.3: 無効なaudienceでCLAIMS_INVALIDエラーを返す', async () => {
      const payload = {
        sub: 'test-user-id',
        email: 'test@example.com',
        iss: expectedIssuer,
        aud: 'invalid-client-id',
        token_use: 'access',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      const token = jwt.sign(payload, privateKey, {
        algorithm: 'RS256',
        header: { kid: 'test-kid', typ: 'JWT' },
      });

      app.use('/protected', jwtAuthMiddleware());
      app.get('/protected', c => c.json({ message: 'success' }));

      const res = await app.request('/protected', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(res.status).toBe(401); // CLAIMS_INVALID
    });

    it('要件2.4: 無効なtoken_useでCLAIMS_INVALIDエラーを返す', async () => {
      const payload = {
        sub: 'test-user-id',
        email: 'test@example.com',
        iss: expectedIssuer,
        aud: clientId,
        token_use: 'invalid',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      const token = jwt.sign(payload, privateKey, {
        algorithm: 'RS256',
        header: { kid: 'test-kid', typ: 'JWT' },
      });

      app.use('/protected', jwtAuthMiddleware());
      app.get('/protected', c => c.json({ message: 'success' }));

      const res = await app.request('/protected', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(res.status).toBe(401); // CLAIMS_INVALID
    });
  });

  describe('要件3: エラーハンドリング', () => {
    it('要件3.1: 統一されたエラーレスポンス形式を返す', async () => {
      app.use('/protected', jwtAuthMiddleware());
      app.get('/protected', c => c.json({ message: 'success' }));

      const res = await app.request('/protected');

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body).toHaveProperty('error');
      expect(body).toHaveProperty('message');
      expect(body).toHaveProperty('statusCode');
      expect(body).toHaveProperty('timestamp');
    });

    it('要件3.2: トークン形式不正で400 Bad Requestを返す', async () => {
      app.use('/protected', jwtAuthMiddleware());
      app.get('/protected', c => c.json({ message: 'success' }));

      const res = await app.request('/protected', {
        headers: {
          Authorization: 'Bearer invalid.token.format',
        },
      });

      expect(res.status).toBe(400);
    });
  });

  describe('要件4: ユーザー情報アクセス', () => {
    it('要件4.1: 認証成功時にユーザーIDとメールアドレスが設定される', async () => {
      const payload = {
        sub: 'test-user-123',
        email: 'user@example.com',
        name: 'Test User',
        iss: expectedIssuer,
        aud: clientId,
        token_use: 'access',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
        'cognito:username': 'testuser123',
        'cognito:groups': ['users', 'managers'],
      };

      const token = jwt.sign(payload, privateKey, {
        algorithm: 'RS256',
        header: { kid: 'test-kid', typ: 'JWT' },
      });

      app.use('/protected', jwtAuthMiddleware());
      app.get('/protected', c => {
        const user = getCurrentUser(c);
        return c.json({
          id: user.id,
          email: user.email,
          name: user.name,
          cognitoUsername: user.cognitoUsername,
          groups: user.groups,
        });
      });

      const res = await app.request('/protected', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.id).toBe('test-user-123');
      expect(body.email).toBe('user@example.com');
      expect(body.name).toBe('Test User');
      expect(body.cognitoUsername).toBe('testuser123');
      expect(body.groups).toEqual(['users', 'managers']);
    });

    it('要件4.2: 型安全な方法でユーザー情報にアクセスできる', async () => {
      const payload = {
        sub: 'test-user-id',
        email: 'test@example.com',
        iss: expectedIssuer,
        aud: clientId,
        token_use: 'access',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      const token = jwt.sign(payload, privateKey, {
        algorithm: 'RS256',
        header: { kid: 'test-kid', typ: 'JWT' },
      });

      app.use('/protected', jwtAuthMiddleware());
      app.get('/protected', c => {
        // 型安全なアクセス
        const user = getCurrentUser(c);

        // TypeScriptの型チェックが効く
        const userId: string = user.id;
        const userEmail: string = user.email;
        const userSub: string = user.cognitoSub;

        return c.json({ userId, userEmail, userSub });
      });

      const res = await app.request('/protected', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(typeof body.userId).toBe('string');
      expect(typeof body.userEmail).toBe('string');
      expect(typeof body.userSub).toBe('string');
    });
  });

  describe('オプショナル認証', () => {
    it('認証ヘッダーがない場合でもエラーを投げない', async () => {
      app.use('/optional', optionalAuthMiddleware());
      app.get('/optional', c => {
        const isAuthenticated = c.get('isAuthenticated');
        return c.json({ isAuthenticated });
      });

      const res = await app.request('/optional');

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.isAuthenticated).toBe(false);
    });

    it('有効なトークンがある場合は認証情報を設定する', async () => {
      const payload = {
        sub: 'test-user-id',
        email: 'test@example.com',
        iss: expectedIssuer,
        aud: clientId,
        token_use: 'access',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      const token = jwt.sign(payload, privateKey, {
        algorithm: 'RS256',
        header: { kid: 'test-kid', typ: 'JWT' },
      });

      app.use('/optional', optionalAuthMiddleware());
      app.get('/optional', c => {
        const isAuthenticated = c.get('isAuthenticated');
        const user = c.get('user');
        return c.json({ isAuthenticated, user });
      });

      const res = await app.request('/optional', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.isAuthenticated).toBe(true);
      expect(body.user.id).toBe('test-user-id');
    });
  });

  describe('エラーケースの包括的テスト', () => {
    it('Bearerトークンの形式が不正な場合', async () => {
      app.use('/protected', jwtAuthMiddleware());
      app.get('/protected', c => c.json({ message: 'success' }));

      const res = await app.request('/protected', {
        headers: {
          Authorization: 'InvalidFormat token',
        },
      });

      expect(res.status).toBe(401); // TOKEN_INVALID
    });

    it('JWTヘッダーにkidが含まれていない場合', async () => {
      const payload = {
        sub: 'test-user-id',
        email: 'test@example.com',
        iss: expectedIssuer,
        aud: clientId,
        token_use: 'access',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      const token = jwt.sign(payload, privateKey, {
        algorithm: 'RS256',
        header: { typ: 'JWT' }, // kidなし
      });

      app.use('/protected', jwtAuthMiddleware());
      app.get('/protected', c => c.json({ message: 'success' }));

      const res = await app.request('/protected', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(res.status).toBe(400); // TOKEN_INVALID
    });

    it('必須クレームが欠けている場合', async () => {
      const payload = {
        // sub が欠けている
        email: 'test@example.com',
        iss: expectedIssuer,
        aud: clientId,
        token_use: 'access',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      const token = jwt.sign(payload, privateKey, {
        algorithm: 'RS256',
        header: { kid: 'test-kid', typ: 'JWT' },
      });

      app.use('/protected', jwtAuthMiddleware());
      app.get('/protected', c => c.json({ message: 'success' }));

      const res = await app.request('/protected', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(res.status).toBe(401); // CLAIMS_INVALID
    });
  });
});
