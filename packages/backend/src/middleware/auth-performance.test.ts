/**
 * JWT認証ミドルウェアのパフォーマンステスト
 * 要件5: キャッシュ機能のパフォーマンス検証
 */

import { Hono } from 'hono';
import { jwtAuthMiddleware } from './auth';
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
    JWT_CACHE_TTL: 300, // 5分
    LOG_LEVEL: 'INFO',
    ENABLE_SECURITY_AUDIT: false,
  },
  getConfig: jest.fn(() => ({
    NODE_ENV: 'test',
    COGNITO_USER_POOL_ID: 'ap-northeast-1_test123',
    COGNITO_CLIENT_ID: 'test-client-id',
    AWS_REGION: 'ap-northeast-1',
    ENABLE_MOCK_AUTH: false,
    JWT_CACHE_TTL: 300,
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

describe('JWT認証ミドルウェア パフォーマンステスト', () => {
  let app: Hono;
  let publicKey: string;
  let privateKey: string;
  let validToken: string;

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

    // 有効なトークンを作成
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

    validToken = jwt.sign(payload, privateKey, {
      algorithm: 'RS256',
      header: { kid: 'test-kid', typ: 'JWT' },
    });
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

  describe('要件5.1, 5.2: キャッシュ機能のパフォーマンス', () => {
    it('初回リクエストでJWKSを取得し、2回目以降はキャッシュを使用する', async () => {
      app.use('/protected', jwtAuthMiddleware());
      app.get('/protected', c => c.json({ message: 'success' }));

      // 初回リクエスト
      const start1 = Date.now();
      const res1 = await app.request('/protected', {
        headers: { Authorization: `Bearer ${validToken}` },
      });
      const duration1 = Date.now() - start1;

      expect(res1.status).toBe(200);
      expect(fetch).toHaveBeenCalledTimes(1);

      // 2回目リクエスト（キャッシュ使用）
      const start2 = Date.now();
      const res2 = await app.request('/protected', {
        headers: { Authorization: `Bearer ${validToken}` },
      });
      const duration2 = Date.now() - start2;

      expect(res2.status).toBe(200);
      expect(fetch).toHaveBeenCalledTimes(1); // fetchは1回のみ

      // 2回目の方が高速であることを確認
      expect(duration2).toBeLessThan(duration1);
    });

    it('複数の同時リクエストでもJWKSは1回のみ取得される', async () => {
      app.use('/protected', jwtAuthMiddleware());
      app.get('/protected', c => c.json({ message: 'success' }));

      // 10個の同時リクエスト
      const promises = Array.from({ length: 10 }, () =>
        app.request('/protected', {
          headers: { Authorization: `Bearer ${validToken}` },
        })
      );

      const results = await Promise.all(promises);

      // すべてのリクエストが成功
      results.forEach(res => {
        expect(res.status).toBe(200);
      });

      // fetchは1回のみ呼ばれる
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('大量のリクエストでもパフォーマンスが維持される', async () => {
      app.use('/protected', jwtAuthMiddleware());
      app.get('/protected', c => c.json({ message: 'success' }));

      // 初回リクエストでキャッシュを作成
      await app.request('/protected', {
        headers: { Authorization: `Bearer ${validToken}` },
      });

      // 100個のリクエストを処理
      const start = Date.now();
      const promises = Array.from({ length: 100 }, () =>
        app.request('/protected', {
          headers: { Authorization: `Bearer ${validToken}` },
        })
      );

      const results = await Promise.all(promises);
      const totalDuration = Date.now() - start;

      // すべてのリクエストが成功
      results.forEach(res => {
        expect(res.status).toBe(200);
      });

      // 平均レスポンス時間が100ms以下であることを確認
      const averageResponseTime = totalDuration / 100;
      expect(averageResponseTime).toBeLessThan(100);

      // fetchは初回の1回のみ
      expect(fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('要件5.3: キャッシュ有効期限', () => {
    it('キャッシュ有効期限後は新しいJWKSを取得する', async () => {
      // 短いTTLでテスト
      app.use('/protected', jwtAuthMiddleware({ cacheTimeout: 0.1 })); // 0.1秒
      app.get('/protected', c => c.json({ message: 'success' }));

      // 初回リクエスト
      const res1 = await app.request('/protected', {
        headers: { Authorization: `Bearer ${validToken}` },
      });
      expect(res1.status).toBe(200);
      expect(fetch).toHaveBeenCalledTimes(1);

      // キャッシュ有効期限まで待機
      await new Promise(resolve => setTimeout(resolve, 150));

      // 2回目リクエスト（キャッシュ期限切れ）
      const res2 = await app.request('/protected', {
        headers: { Authorization: `Bearer ${validToken}` },
      });
      expect(res2.status).toBe(200);
      expect(fetch).toHaveBeenCalledTimes(2); // 新しいJWKSを取得
    });
  });

  describe('メモリ使用量テスト', () => {
    it('大量のリクエスト処理後もメモリリークが発生しない', async () => {
      app.use('/protected', jwtAuthMiddleware());
      app.get('/protected', c => c.json({ message: 'success' }));

      const initialMemory = process.memoryUsage().heapUsed;

      // 1000回のリクエストを処理
      for (let i = 0; i < 1000; i++) {
        await app.request('/protected', {
          headers: { Authorization: `Bearer ${validToken}` },
        });
      }

      // ガベージコレクションを強制実行
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // メモリ増加が10MB以下であることを確認
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });
  });

  describe('エラー処理のパフォーマンス', () => {
    it('無効なトークンでも高速にエラーレスポンスを返す', async () => {
      app.use('/protected', jwtAuthMiddleware());
      app.get('/protected', c => c.json({ message: 'success' }));

      const start = Date.now();

      // 100個の無効なリクエスト
      const promises = Array.from({ length: 100 }, () =>
        app.request('/protected', {
          headers: { Authorization: 'Bearer invalid-token' },
        })
      );

      const results = await Promise.all(promises);
      const totalDuration = Date.now() - start;

      // すべてのリクエストがエラーレスポンス
      results.forEach(res => {
        expect(res.status).toBeGreaterThanOrEqual(400);
      });

      // 平均レスポンス時間が50ms以下であることを確認
      const averageResponseTime = totalDuration / 100;
      expect(averageResponseTime).toBeLessThan(50);
    });
  });

  describe('同時接続数テスト', () => {
    it('高い同時接続数でも安定して動作する', async () => {
      app.use('/protected', jwtAuthMiddleware());
      app.get('/protected', c => c.json({ message: 'success' }));

      // 500個の同時リクエスト
      const promises = Array.from({ length: 500 }, (_, i) =>
        app.request('/protected', {
          headers: { Authorization: `Bearer ${validToken}` },
        })
      );

      const start = Date.now();
      const results = await Promise.all(promises);
      const totalDuration = Date.now() - start;

      // すべてのリクエストが成功
      results.forEach(res => {
        expect(res.status).toBe(200);
      });

      // 全体の処理時間が5秒以下であることを確認
      expect(totalDuration).toBeLessThan(5000);

      // 平均レスポンス時間が200ms以下であることを確認
      const averageResponseTime = totalDuration / 500;
      expect(averageResponseTime).toBeLessThan(200);
    });
  });
});
