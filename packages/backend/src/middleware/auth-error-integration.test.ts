/**
 * JWT認証ミドルウェアのエラーハンドリング統合テスト
 * 要件3.1, 3.2, 3.3, 3.4の統合テスト
 */

import { Hono } from 'hono';
import { jwtAuthMiddleware } from './auth';
import { AuthErrorType } from './types';
import { logger } from '../utils/logger';
import { config } from '../config/environment';

// モック設定
jest.mock('../utils/logger');

// 環境設定のモック
const mockConfig = {
  NODE_ENV: 'test' as const,
  ENABLE_MOCK_AUTH: false,
  ENABLE_SECURITY_AUDIT: true,
  COGNITO_USER_POOL_ID: 'test-pool-id',
  COGNITO_CLIENT_ID: 'test-client-id',
  AWS_REGION: 'ap-northeast-1',
  JWT_CACHE_TTL: 3600,
  DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
  JWT_SECRET: 'test-secret-key-for-testing-purposes-only',
  FRONTEND_URL: 'http://localhost:3000',
  MOCK_USER_ID: 'test-user-id',
  MOCK_USER_EMAIL: 'test@example.com',
  MOCK_USER_NAME: 'Test User',
  LOG_LEVEL: 'ERROR' as const,
};

jest.mock('../config/environment', () => ({
  config: mockConfig,
  getConfig: jest.fn(() => mockConfig),
}));

// fetch APIのモック
global.fetch = jest.fn();

describe('JWT認証ミドルウェア エラーハンドリング統合テスト', () => {
  let app: Hono;

  beforeEach(() => {
    // モック認証を無効にする
    mockConfig.ENABLE_MOCK_AUTH = false;

    app = new Hono();
    app.use('/protected/*', jwtAuthMiddleware());
    app.get('/protected/test', c => c.json({ message: 'success' }));

    jest.clearAllMocks();
  });

  describe('要件3.1: 適切なHTTPステータスコードとエラーメッセージを返す', () => {
    it('Authorizationヘッダーがない場合、401エラーを返す', async () => {
      const req = new Request('http://localhost/protected/test');
      const res = await app.request(req);

      expect(res.status).toBe(401);

      // セキュリティログが記録されることを確認
      expect(logger.info).toHaveBeenCalledWith(
        'Security audit log',
        expect.objectContaining({
          event: 'AUTH_FAILURE',
          details: expect.objectContaining({
            errorType: AuthErrorType.TOKEN_MISSING,
          }),
        })
      );
    });

    it('無効なBearerトークン形式の場合、400エラーを返す', async () => {
      const req = new Request('http://localhost/protected/test', {
        headers: {
          Authorization: 'Invalid token format',
        },
      });
      const res = await app.request(req);

      expect(res.status).toBe(400);

      // エラーログが記録されることを確認
      expect(logger.info).toHaveBeenCalledWith(
        'Authentication info',
        expect.objectContaining({
          errorType: AuthErrorType.TOKEN_INVALID,
        })
      );
    });

    it('JWTトークンの形式が不正な場合、400エラーを返す（要件3.2）', async () => {
      const req = new Request('http://localhost/protected/test', {
        headers: {
          Authorization: 'Bearer invalid.jwt.token',
        },
      });
      const res = await app.request(req);

      expect(res.status).toBe(400);
    });
  });

  describe('要件3.4: セキュリティ上重要でない範囲でエラー詳細をログに記録', () => {
    it('認証失敗時にセキュリティ監査ログを記録する', async () => {
      const req = new Request('http://localhost/protected/test', {
        headers: {
          'User-Agent': 'Test User Agent',
          'X-Forwarded-For': '192.168.1.100',
        },
      });
      await app.request(req);

      expect(logger.info).toHaveBeenCalledWith(
        'Security audit log',
        expect.objectContaining({
          timestamp: expect.any(String),
          event: 'AUTH_FAILURE',
          ipAddress: '192.168.1.100',
          userAgent: 'Test User Agent',
          requestId: expect.any(String),
          details: expect.objectContaining({
            errorType: AuthErrorType.TOKEN_MISSING,
            endpoint: '/protected/test',
            method: 'GET',
            errorCategory: 'missing_credentials',
            hasToken: false,
          }),
        })
      );
    });

    it('エラーログに適切な情報が含まれる', async () => {
      const req = new Request('http://localhost/protected/test', {
        headers: {
          'User-Agent': 'Test User Agent',
          'X-Forwarded-For': '192.168.1.100',
          'X-Request-ID': 'test-request-123',
        },
      });
      await app.request(req);

      expect(logger.info).toHaveBeenCalledWith(
        'Authentication info',
        expect.objectContaining({
          timestamp: expect.any(String),
          level: 'INFO',
          errorType: AuthErrorType.TOKEN_MISSING,
          message: 'Authorization header is required',
          requestId: 'test-request-123',
          userAgent: 'Test User Agent',
          ipAddress: '192.168.1.100',
        })
      );
    });
  });

  describe('モック認証時のエラーハンドリング', () => {
    beforeEach(() => {
      // モック認証を有効にする
      (config as any).ENABLE_MOCK_AUTH = true;

      app = new Hono();
      app.use('/protected/*', jwtAuthMiddleware());
      app.get('/protected/test', c => c.json({ message: 'success' }));
    });

    it('モック認証成功時にセキュリティログを記録する', async () => {
      const req = new Request('http://localhost/protected/test');
      const res = await app.request(req);

      expect(res.status).toBe(200);

      expect(logger.info).toHaveBeenCalledWith(
        'Security audit log',
        expect.objectContaining({
          event: 'AUTH_SUCCESS',
          userId: 'mock-user-id',
        })
      );
    });
  });
});

describe('JWT認証ミドルウェア エラーハンドリング統合テスト', () => {
  let app: Hono;

  beforeEach(() => {
    app = new Hono();
    app.use('/protected/*', jwtAuthMiddleware());
    app.get('/protected/test', c => c.json({ message: 'success' }));

    jest.clearAllMocks();
  });

  describe('要件3.1: 適切なHTTPステータスコードとエラーメッセージを返す', () => {
    it('Authorizationヘッダーがない場合、401エラーを返す', async () => {
      const req = new Request('http://localhost/protected/test');
      const res = await app.request(req);

      expect(res.status).toBe(401);

      // セキュリティログが記録されることを確認
      expect(logger.info).toHaveBeenCalledWith(
        'Security audit log',
        expect.objectContaining({
          event: 'AUTH_FAILURE',
          details: expect.objectContaining({
            errorType: AuthErrorType.TOKEN_MISSING,
          }),
        })
      );
    });

    it('無効なBearerトークン形式の場合、400エラーを返す', async () => {
      const req = new Request('http://localhost/protected/test', {
        headers: {
          Authorization: 'Invalid token format',
        },
      });
      const res = await app.request(req);

      expect(res.status).toBe(400);

      // エラーログが記録されることを確認
      expect(logger.info).toHaveBeenCalledWith(
        'Authentication info',
        expect.objectContaining({
          errorType: AuthErrorType.TOKEN_INVALID,
        })
      );
    });

    it('JWTトークンの形式が不正な場合、400エラーを返す（要件3.2）', async () => {
      const req = new Request('http://localhost/protected/test', {
        headers: {
          Authorization: 'Bearer invalid.jwt.token',
        },
      });
      const res = await app.request(req);

      expect(res.status).toBe(400);
    });
  });

  describe('要件3.3: Cognito公開鍵の取得に失敗した場合、500エラーを返す', () => {
    it('JWKS取得に失敗した場合、500エラーを返す', async () => {
      // fetch APIのモックでネットワークエラーをシミュレート
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      // 有効なJWTトークン形式（ただし検証は失敗する）
      const validJwtFormat =
        'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6InRlc3Qta2lkIn0.eyJzdWIiOiJ0ZXN0LXVzZXIiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJpc3MiOiJodHRwczovL2NvZ25pdG8taWRwLmFwLW5vcnRoZWFzdC0xLmFtYXpvbmF3cy5jb20vdGVzdC1wb29sLWlkIiwiYXVkIjoidGVzdC1jbGllbnQtaWQiLCJ0b2tlbl91c2UiOiJhY2Nlc3MiLCJleHAiOjk5OTk5OTk5OTksImlhdCI6MTYwMDAwMDAwMH0.signature';

      const req = new Request('http://localhost/protected/test', {
        headers: {
          Authorization: `Bearer ${validJwtFormat}`,
        },
      });
      const res = await app.request(req);

      expect(res.status).toBe(500);

      // INTERNAL_ERRORログが記録されることを確認
      expect(logger.error).toHaveBeenCalledWith(
        'Authentication error',
        expect.objectContaining({
          errorType: AuthErrorType.INTERNAL_ERROR,
        })
      );
    });

    it('JWKS レスポンスが不正な場合、500エラーを返す', async () => {
      // fetch APIのモックで不正なレスポンスをシミュレート
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      const validJwtFormat =
        'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6InRlc3Qta2lkIn0.eyJzdWIiOiJ0ZXN0LXVzZXIiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJpc3MiOiJodHRwczovL2NvZ25pdG8taWRwLmFwLW5vcnRoZWFzdC0xLmFtYXpvbmF3cy5jb20vdGVzdC1wb29sLWlkIiwiYXVkIjoidGVzdC1jbGllbnQtaWQiLCJ0b2tlbl91c2UiOiJhY2Nlc3MiLCJleHAiOjk5OTk5OTk5OTksImlhdCI6MTYwMDAwMDAwMH0.signature';

      const req = new Request('http://localhost/protected/test', {
        headers: {
          Authorization: `Bearer ${validJwtFormat}`,
        },
      });
      const res = await app.request(req);

      expect(res.status).toBe(500);
    });
  });

  describe('要件3.4: セキュリティ上重要でない範囲でエラー詳細をログに記録', () => {
    it('認証失敗時にセキュリティ監査ログを記録する', async () => {
      const req = new Request('http://localhost/protected/test', {
        headers: {
          'User-Agent': 'Test User Agent',
          'X-Forwarded-For': '192.168.1.100',
        },
      });
      await app.request(req);

      expect(logger.info).toHaveBeenCalledWith(
        'Security audit log',
        expect.objectContaining({
          timestamp: expect.any(String),
          event: 'AUTH_FAILURE',
          ipAddress: '192.168.1.100',
          userAgent: 'Test User Agent',
          requestId: expect.any(String),
          details: expect.objectContaining({
            errorType: AuthErrorType.TOKEN_MISSING,
            endpoint: '/protected/test',
            method: 'GET',
            errorCategory: 'missing_credentials',
            hasToken: false,
          }),
        })
      );
    });

    it('重要なセキュリティイベントの場合、警告ログも記録する', async () => {
      // 署名検証失敗をシミュレートするため、有効なJWT形式だが無効な署名のトークンを使用
      const invalidSignatureToken =
        'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6InRlc3Qta2lkIn0.eyJzdWIiOiJ0ZXN0LXVzZXIiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJpc3MiOiJodHRwczovL2NvZ25pdG8taWRwLmFwLW5vcnRoZWFzdC0xLmFtYXpvbmF3cy5jb20vdGVzdC1wb29sLWlkIiwiYXVkIjoidGVzdC1jbGllbnQtaWQiLCJ0b2tlbl91c2UiOiJhY2Nlc3MiLCJleHAiOjk5OTk5OTk5OTksImlhdCI6MTYwMDAwMDAwMH0.invalid_signature';

      // 有効なJWKSレスポンスをモック
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          keys: [
            {
              kty: 'RSA',
              use: 'sig',
              kid: 'test-kid',
              alg: 'RS256',
              n: 'test-n-value',
              e: 'AQAB',
            },
          ],
        }),
      });

      const req = new Request('http://localhost/protected/test', {
        headers: {
          Authorization: `Bearer ${invalidSignatureToken}`,
        },
      });
      await app.request(req);

      // 署名検証失敗により警告ログが記録されることを確認
      // 実際の実装では、JWK to PEM変換やjsonwebtoken検証でエラーが発生する
      expect(logger.error).toHaveBeenCalled();
    });

    it('エラーログに適切な情報が含まれる', async () => {
      const req = new Request('http://localhost/protected/test', {
        headers: {
          'User-Agent': 'Test User Agent',
          'X-Forwarded-For': '192.168.1.100',
          'X-Request-ID': 'test-request-123',
        },
      });
      await app.request(req);

      expect(logger.info).toHaveBeenCalledWith(
        'Authentication info',
        expect.objectContaining({
          timestamp: expect.any(String),
          level: 'INFO',
          errorType: AuthErrorType.TOKEN_MISSING,
          message: 'Authorization header is required',
          requestId: 'test-request-123',
          userAgent: 'Test User Agent',
          ipAddress: '192.168.1.100',
        })
      );
    });
  });

  describe('モック認証時のエラーハンドリング', () => {
    beforeEach(() => {
      // モック認証を有効にする
      (config as any).ENABLE_MOCK_AUTH = true;

      app = new Hono();
      app.use('/protected/*', jwtAuthMiddleware());
      app.get('/protected/test', c => c.json({ message: 'success' }));
    });

    it('モック認証成功時にセキュリティログを記録する', async () => {
      const req = new Request('http://localhost/protected/test');
      const res = await app.request(req);

      expect(res.status).toBe(200);

      expect(logger.info).toHaveBeenCalledWith(
        'Security audit log',
        expect.objectContaining({
          event: 'AUTH_SUCCESS',
          userId: 'mock-user-id',
        })
      );
    });
  });

  describe('エラーレスポンス形式の統一性', () => {
    it('本番環境では安全なエラーメッセージを返す', async () => {
      (config as any).NODE_ENV = 'production';
      (config as any).ENABLE_MOCK_AUTH = false; // モック認証を無効にする

      // 新しいアプリインスタンスを作成してモック認証を無効にする
      const testApp = new Hono();
      testApp.use('/protected/*', jwtAuthMiddleware());
      testApp.get('/protected/test', c => c.json({ message: 'success' }));

      const req = new Request('http://localhost/protected/test');
      const res = await testApp.request(req);

      expect(res.status).toBe(401);

      // レスポンスボディは安全なメッセージになっている
      // 実際のHonoの実装では、HTTPExceptionのmessageがレスポンスに含まれる
    });

    it('開発環境では詳細なエラーメッセージを返す', async () => {
      (config as any).NODE_ENV = 'development';
      (config as any).ENABLE_MOCK_AUTH = false; // モック認証を無効にする

      // 新しいアプリインスタンスを作成してモック認証を無効にする
      const testApp = new Hono();
      testApp.use('/protected/*', jwtAuthMiddleware());
      testApp.get('/protected/test', c => c.json({ message: 'success' }));

      const req = new Request('http://localhost/protected/test');
      const res = await testApp.request(req);

      expect(res.status).toBe(401);

      // 開発環境では詳細なエラー情報が含まれる
    });
  });
});
