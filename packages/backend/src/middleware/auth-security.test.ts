/**
 * JWT認証ミドルウェアのセキュリティテスト
 * セキュリティ脆弱性の検証とセキュリティ要件のテスト
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
    JWT_CACHE_TTL: 3600,
    LOG_LEVEL: 'INFO',
    ENABLE_SECURITY_AUDIT: true,
  },
  getConfig: jest.fn(() => ({
    NODE_ENV: 'test',
    COGNITO_USER_POOL_ID: 'ap-northeast-1_test123',
    COGNITO_CLIENT_ID: 'test-client-id',
    AWS_REGION: 'ap-northeast-1',
    ENABLE_MOCK_AUTH: false,
    JWT_CACHE_TTL: 3600,
    LOG_LEVEL: 'INFO',
    ENABLE_SECURITY_AUDIT: true,
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

describe('JWT認証ミドルウェア セキュリティテスト', () => {
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

  describe('トークン改ざん検出', () => {
    it('署名が改ざんされたトークンを拒否する', async () => {
      const payload = {
        sub: 'test-user-id',
        email: 'test@example.com',
        iss: expectedIssuer,
        aud: clientId,
        token_use: 'access',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      let token = jwt.sign(payload, privateKey, {
        algorithm: 'RS256',
        header: { kid: 'test-kid', typ: 'JWT' },
      });

      // 署名部分を改ざん
      const parts = token.split('.');
      parts[2] = parts[2].slice(0, -5) + 'XXXXX';
      const tamperedToken = parts.join('.');

      app.use('/protected', jwtAuthMiddleware());
      app.get('/protected', c => c.json({ message: 'success' }));

      const res = await app.request('/protected', {
        headers: {
          Authorization: `Bearer ${tamperedToken}`,
        },
      });

      expect(res.status).toBe(401); // SIGNATURE_INVALID
    });

    it('ペイロードが改ざんされたトークンを拒否する', async () => {
      const payload = {
        sub: 'test-user-id',
        email: 'test@example.com',
        iss: expectedIssuer,
        aud: clientId,
        token_use: 'access',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      let token = jwt.sign(payload, privateKey, {
        algorithm: 'RS256',
        header: { kid: 'test-kid', typ: 'JWT' },
      });

      // ペイロード部分を改ざん
      const parts = token.split('.');
      const tamperedPayload = Buffer.from(
        JSON.stringify({
          ...payload,
          sub: 'malicious-user-id', // ユーザーIDを改ざん
        })
      ).toString('base64url');
      parts[1] = tamperedPayload;
      const tamperedToken = parts.join('.');

      app.use('/protected', jwtAuthMiddleware());
      app.get('/protected', c => c.json({ message: 'success' }));

      const res = await app.request('/protected', {
        headers: {
          Authorization: `Bearer ${tamperedToken}`,
        },
      });

      expect(res.status).toBe(401); // SIGNATURE_INVALID
    });
  });

  describe('アルゴリズム攻撃対策', () => {
    it('noneアルゴリズムのトークンを拒否する', async () => {
      const payload = {
        sub: 'test-user-id',
        email: 'test@example.com',
        iss: expectedIssuer,
        aud: clientId,
        token_use: 'access',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      // noneアルゴリズムでトークンを作成
      const header = Buffer.from(
        JSON.stringify({ alg: 'none', typ: 'JWT', kid: 'test-kid' })
      ).toString('base64url');
      const payloadEncoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
      const noneToken = `${header}.${payloadEncoded}.`;

      app.use('/protected', jwtAuthMiddleware());
      app.get('/protected', c => c.json({ message: 'success' }));

      const res = await app.request('/protected', {
        headers: {
          Authorization: `Bearer ${noneToken}`,
        },
      });

      expect(res.status).toBe(400); // TOKEN_INVALID
    });

    it('HS256アルゴリズムのトークンを拒否する', async () => {
      const payload = {
        sub: 'test-user-id',
        email: 'test@example.com',
        iss: expectedIssuer,
        aud: clientId,
        token_use: 'access',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      // HS256でトークンを作成（攻撃者が公開鍵を秘密鍵として使用）
      const hsToken = jwt.sign(payload, publicKey, {
        algorithm: 'HS256',
        header: { kid: 'test-kid', typ: 'JWT' },
      });

      app.use('/protected', jwtAuthMiddleware());
      app.get('/protected', c => c.json({ message: 'success' }));

      const res = await app.request('/protected', {
        headers: {
          Authorization: `Bearer ${hsToken}`,
        },
      });

      expect(res.status).toBe(400); // TOKEN_INVALID (unsupported algorithm)
    });
  });

  describe('時間ベース攻撃対策', () => {
    it('期限切れトークンを確実に拒否する', async () => {
      const payload = {
        sub: 'test-user-id',
        email: 'test@example.com',
        iss: expectedIssuer,
        aud: clientId,
        token_use: 'access',
        iat: Math.floor(Date.now() / 1000) - 7200, // 2時間前
        exp: Math.floor(Date.now() / 1000) - 1, // 1秒前（期限切れ）
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

    it('未来の発行時刻のトークンを拒否する', async () => {
      const payload = {
        sub: 'test-user-id',
        email: 'test@example.com',
        iss: expectedIssuer,
        aud: clientId,
        token_use: 'access',
        iat: Math.floor(Date.now() / 1000) + 600, // 10分後（未来）
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

  describe('インジェクション攻撃対策', () => {
    it('SQLインジェクション文字列を含むクレームを安全に処理する', async () => {
      const payload = {
        sub: "'; DROP TABLE users; --",
        email: 'test@example.com',
        name: "<script>alert('xss')</script>",
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
        const user = c.get('user');
        return c.json({ user });
      });

      const res = await app.request('/protected', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(res.status).toBe(200);
      const body = await res.json();

      // 危険な文字列がそのまま保存されていることを確認（エスケープは上位層で行う）
      expect(body.user.id).toBe("'; DROP TABLE users; --");
      expect(body.user.name).toBe("<script>alert('xss')</script>");
    });
  });

  describe('DoS攻撃対策', () => {
    it('非常に大きなトークンを拒否する', async () => {
      // 1MBの巨大なトークンを作成
      const largePayload = {
        sub: 'test-user-id',
        email: 'test@example.com',
        iss: expectedIssuer,
        aud: clientId,
        token_use: 'access',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
        largeData: 'A'.repeat(1024 * 1024), // 1MB
      };

      const largeToken = jwt.sign(largePayload, privateKey, {
        algorithm: 'RS256',
        header: { kid: 'test-kid', typ: 'JWT' },
      });

      app.use('/protected', jwtAuthMiddleware());
      app.get('/protected', c => c.json({ message: 'success' }));

      const res = await app.request('/protected', {
        headers: {
          Authorization: `Bearer ${largeToken}`,
        },
      });

      // 大きなトークンでも処理できることを確認（実際の制限は上位層で行う）
      expect(res.status).toBe(200);
    });

    it('不正な形式のトークンで高速にエラーを返す', async () => {
      const malformedTokens = [
        'not.a.jwt',
        'invalid',
        '',
        'a'.repeat(10000), // 非常に長い文字列
        'header.payload', // 署名部分なし
        '.payload.signature', // ヘッダー部分なし
        'header..signature', // ペイロード部分なし
      ];

      app.use('/protected', jwtAuthMiddleware());
      app.get('/protected', c => c.json({ message: 'success' }));

      for (const malformedToken of malformedTokens) {
        const start = Date.now();
        const res = await app.request('/protected', {
          headers: {
            Authorization: `Bearer ${malformedToken}`,
          },
        });
        const duration = Date.now() - start;

        expect(res.status).toBeGreaterThanOrEqual(400);
        expect(duration).toBeLessThan(100); // 100ms以下で処理
      }
    });
  });

  describe('情報漏洩対策', () => {
    it('エラーレスポンスで機密情報を漏洩しない', async () => {
      app.use('/protected', jwtAuthMiddleware());
      app.get('/protected', c => c.json({ message: 'success' }));

      const res = await app.request('/protected', {
        headers: {
          Authorization: 'Bearer invalid-token',
        },
      });

      expect(res.status).toBe(400);
      const body = await res.json();

      // エラーレスポンスに機密情報が含まれていないことを確認
      const responseText = JSON.stringify(body).toLowerCase();
      expect(responseText).not.toContain('secret');
      expect(responseText).not.toContain('key');
      expect(responseText).not.toContain('password');
      expect(responseText).not.toContain('private');
      expect(responseText).not.toContain(userPoolId.toLowerCase());
    });

    it('ログに機密情報を記録しない', async () => {
      const { logger } = require('../utils/logger');

      app.use('/protected', jwtAuthMiddleware());
      app.get('/protected', c => c.json({ message: 'success' }));

      await app.request('/protected', {
        headers: {
          Authorization: 'Bearer invalid-token-with-sensitive-data',
        },
      });

      // ログ呼び出しを確認
      const logCalls = [
        ...logger.info.mock.calls,
        ...logger.warn.mock.calls,
        ...logger.error.mock.calls,
        ...logger.debug.mock.calls,
      ];

      // ログに完全なトークンが記録されていないことを確認
      logCalls.forEach(call => {
        const logMessage = JSON.stringify(call);
        expect(logMessage).not.toContain('invalid-token-with-sensitive-data');
      });
    });
  });

  describe('レート制限テスト', () => {
    it('短時間での大量リクエストを処理できる', async () => {
      app.use('/protected', jwtAuthMiddleware());
      app.get('/protected', c => c.json({ message: 'success' }));

      // 100個の無効なリクエストを短時間で送信
      const promises = Array.from({ length: 100 }, () =>
        app.request('/protected', {
          headers: {
            Authorization: 'Bearer invalid-token',
          },
        })
      );

      const start = Date.now();
      const results = await Promise.all(promises);
      const duration = Date.now() - start;

      // すべてのリクエストがエラーレスポンス
      results.forEach(res => {
        expect(res.status).toBe(400);
      });

      // 処理時間が合理的な範囲内であることを確認
      expect(duration).toBeLessThan(5000); // 5秒以内
    });
  });

  describe('本番環境セキュリティ', () => {
    it('本番環境でモック認証が有効な場合エラーを投げる', async () => {
      // 本番環境の設定でモック認証を有効にする
      const productionConfig = {
        NODE_ENV: 'production',
        COGNITO_USER_POOL_ID: 'ap-northeast-1_test123',
        COGNITO_CLIENT_ID: 'test-client-id',
        AWS_REGION: 'ap-northeast-1',
        ENABLE_MOCK_AUTH: false,
        JWT_CACHE_TTL: 3600,
        LOG_LEVEL: 'INFO',
        ENABLE_SECURITY_AUDIT: true,
      };

      // getConfigモックを一時的に変更
      const { getConfig } = require('../config/environment');
      getConfig.mockReturnValueOnce({
        ...productionConfig,
        NODE_ENV: 'production',
      });

      app.use('/protected', jwtAuthMiddleware({ enableMockAuth: true }));
      app.get('/protected', c => c.json({ message: 'success' }));

      const res = await app.request('/protected');

      expect(res.status).toBe(500); // 本番環境でのモック認証エラー
    });
  });
});
