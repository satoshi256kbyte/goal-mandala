/**
 * JWT認証ミドルウェアのエッジケーステスト
 * 境界値や特殊なケースのテスト
 */

import { Hono } from 'hono';
import { jwtAuthMiddleware, optionalAuthMiddleware, getCurrentUser } from './auth';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// 環境変数のモック
jest.mock('../config/environment', () => ({
  config: {
    NODE_ENV: 'test',
    COGNITO_USER_POOL_ID: 'ap-northeast-1_test123',
    COGNITO_CLIENT_ID: 'test-client-id',
    AWS_REGION: 'ap-northeast-1',
    ENABLE_MOCK_AUTH: false,
    JWT_CACHE_TTL: 3600,
    LOG_LEVEL: 'INFO',
    ENABLE_SECURITY_AUDIT: false,
  },
  getConfig: jest.fn(() => ({
    NODE_ENV: 'test',
    COGNITO_USER_POOL_ID: 'ap-northeast-1_test123',
    COGNITO_CLIENT_ID: 'test-client-id',
    AWS_REGION: 'ap-northeast-1',
    ENABLE_MOCK_AUTH: false,
    JWT_CACHE_TTL: 3600,
    LOG_LEVEL: 'INFO',
    ENABLE_SECURITY_AUDIT: false,
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

describe('JWT認証ミドルウェア エッジケーステスト', () => {
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

  describe('境界値テスト', () => {
    it('有効期限ギリギリのトークンを受け入れる', async () => {
      const now = Math.floor(Date.now() / 1000);
      const payload = {
        sub: 'test-user-id',
        email: 'test@example.com',
        iss: expectedIssuer,
        aud: clientId,
        token_use: 'access',
        iat: now - 1,
        exp: now + 1, // 1秒後に期限切れ
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

      expect(res.status).toBe(200);
    });

    it('最小限の必須クレームのみのトークンを受け入れる', async () => {
      const payload = {
        sub: 'u', // 最小長
        email: 'a@b.c', // 最小有効メール
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
      expect(body.user.id).toBe('u');
      expect(body.user.email).toBe('a@b.c');
    });

    it('非常に長いクレーム値を持つトークンを処理する', async () => {
      const longString = 'a'.repeat(10000);
      const payload = {
        sub: 'test-user-id',
        email: 'test@example.com',
        name: longString,
        iss: expectedIssuer,
        aud: clientId,
        token_use: 'access',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
        customClaim: longString,
      };

      const token = jwt.sign(payload, privateKey, {
        algorithm: 'RS256',
        header: { kid: 'test-kid', typ: 'JWT' },
      });

      app.use('/protected', jwtAuthMiddleware());
      app.get('/protected', c => {
        const user = getCurrentUser(c);
        return c.json({ nameLength: user.name?.length });
      });

      const res = await app.request('/protected', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.nameLength).toBe(10000);
    });
  });

  describe('特殊文字・エンコーディングテスト', () => {
    it('Unicode文字を含むクレームを正しく処理する', async () => {
      const payload = {
        sub: 'test-user-id',
        email: 'test@example.com',
        name: '山田太郎 🎌 Тест Ñoël',
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
        return c.json({ name: user.name });
      });

      const res = await app.request('/protected', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.name).toBe('山田太郎 🎌 Тест Ñoël');
    });

    it('特殊文字を含むメールアドレスを処理する', async () => {
      const payload = {
        sub: 'test-user-id',
        email: 'test+tag@sub-domain.example-site.co.jp',
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
        return c.json({ email: user.email });
      });

      const res = await app.request('/protected', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.email).toBe('test+tag@sub-domain.example-site.co.jp');
    });
  });

  describe('ネットワークエラーハンドリング', () => {
    it('JWKS取得でネットワークエラーが発生した場合の処理', async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

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
      app.get('/protected', c => c.json({ message: 'success' }));

      const res = await app.request('/protected', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(res.status).toBe(500); // INTERNAL_ERROR
    });

    it('JWKS取得でHTTPエラーが発生した場合の処理', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
      });

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
      app.get('/protected', c => c.json({ message: 'success' }));

      const res = await app.request('/protected', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(res.status).toBe(500); // INTERNAL_ERROR
    });

    it('不正なJWKSレスポンスの処理', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ invalid: 'response' }), // keysプロパティなし
      });

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
      app.get('/protected', c => c.json({ message: 'success' }));

      const res = await app.request('/protected', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(res.status).toBe(500); // INTERNAL_ERROR
    });
  });

  describe('同時実行・競合状態テスト', () => {
    it('キャッシュ作成中の同時リクエストを正しく処理する', async () => {
      let fetchCallCount = 0;
      (fetch as jest.Mock).mockImplementation(async () => {
        fetchCallCount++;
        // 少し遅延を追加してレースコンディションをシミュレート
        await new Promise(resolve => setTimeout(resolve, 100));
        return {
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
        };
      });

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
      app.get('/protected', c => c.json({ message: 'success' }));

      // 5つの同時リクエスト
      const promises = Array.from({ length: 5 }, () =>
        app.request('/protected', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
      );

      const results = await Promise.all(promises);

      // すべてのリクエストが成功
      results.forEach(res => {
        expect(res.status).toBe(200);
      });

      // fetchは1回のみ呼ばれる（重複リクエストなし）
      expect(fetchCallCount).toBe(1);
    });
  });

  describe('メモリ・リソース管理', () => {
    it('大量のユニークなkidでもメモリリークしない', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // 100個の異なるkidでリクエスト
      for (let i = 0; i < 100; i++) {
        (fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            keys: [
              {
                alg: 'RS256',
                e: 'AQAB',
                kid: `test-kid-${i}`,
                kty: 'RSA',
                n: 'test-n-value',
                use: 'sig',
              },
            ],
          }),
        });

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
          header: { kid: `test-kid-${i}`, typ: 'JWT' },
        });

        const testApp = new Hono();
        testApp.use('/protected', jwtAuthMiddleware());
        testApp.get('/protected', c => c.json({ message: 'success' }));

        await testApp.request('/protected', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      }

      // ガベージコレクションを強制実行
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // メモリ増加が50MB以下であることを確認
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });
  });

  describe('設定の動的変更', () => {
    it('実行時の設定変更に対応する', async () => {
      const { getConfig } = require('../config/environment');

      // 初期設定
      getConfig.mockReturnValueOnce({
        NODE_ENV: 'test',
        COGNITO_USER_POOL_ID: 'ap-northeast-1_test123',
        COGNITO_CLIENT_ID: 'test-client-id',
        AWS_REGION: 'ap-northeast-1',
        ENABLE_MOCK_AUTH: true, // モック認証有効
        JWT_CACHE_TTL: 3600,
        LOG_LEVEL: 'INFO',
        ENABLE_SECURITY_AUDIT: false,
        MOCK_USER_ID: 'mock-user',
        MOCK_USER_EMAIL: 'mock@example.com',
        MOCK_USER_NAME: 'Mock User',
      });

      app.use('/protected', jwtAuthMiddleware());
      app.get('/protected', c => {
        const user = getCurrentUser(c);
        return c.json({ user });
      });

      // モック認証でのリクエスト
      const res1 = await app.request('/protected');
      expect(res1.status).toBe(200);

      // 設定を変更（モック認証無効）
      getConfig.mockReturnValue({
        NODE_ENV: 'test',
        COGNITO_USER_POOL_ID: 'ap-northeast-1_test123',
        COGNITO_CLIENT_ID: 'test-client-id',
        AWS_REGION: 'ap-northeast-1',
        ENABLE_MOCK_AUTH: false, // モック認証無効
        JWT_CACHE_TTL: 3600,
        LOG_LEVEL: 'INFO',
        ENABLE_SECURITY_AUDIT: false,
      });

      // 実JWT認証が必要になる
      const res2 = await app.request('/protected');
      expect(res2.status).toBe(401);
    });
  });
});
