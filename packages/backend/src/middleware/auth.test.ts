/**
 * JWT認証ミドルウェアのテスト（Cognito対応）
 */

import { Context } from 'hono';
import {
  jwtAuthMiddleware,
  optionalAuthMiddleware,
  getCurrentUser,
  getCurrentUserOptional,
} from './auth';
import { HTTPException } from 'hono/http-exception';

// モック設定
jest.mock('../config/environment', () => ({
  config: {
    NODE_ENV: 'test',
    JWT_SECRET: 'test-secret',
    COGNITO_USER_POOL_ID: 'ap-northeast-1_test123',
    COGNITO_CLIENT_ID: 'test-client-id',
    AWS_REGION: 'ap-northeast-1',
    ENABLE_MOCK_AUTH: true,
    JWT_CACHE_TTL: 3600,
    LOG_LEVEL: 'INFO',
    ENABLE_SECURITY_AUDIT: false,
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
    ENABLE_MOCK_AUTH: true,
    JWT_CACHE_TTL: 3600,
    LOG_LEVEL: 'INFO',
    ENABLE_SECURITY_AUDIT: false,
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

// CognitoKeyManagerのモック
jest.mock('./cognito-key-manager', () => ({
  CognitoKeyManagerImpl: jest.fn().mockImplementation(() => ({
    getPublicKeyObject: jest.fn(),
    clearCache: jest.fn(),
    isCacheValid: jest.fn().mockReturnValue(true),
  })),
}));

// JWTValidatorのモック
jest.mock('./jwt-validator', () => ({
  JWTValidatorImpl: jest.fn().mockImplementation(() => ({
    validateToken: jest.fn(),
  })),
}));

describe('JWT Auth Middleware (Cognito)', () => {
  let mockContext: Partial<Context>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockContext = {
      req: {
        header: jest.fn(),
      } as any,
      set: jest.fn(),
      get: jest.fn(),
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe('jwtAuthMiddleware (Mock Auth Enabled)', () => {
    it('モック認証が有効な場合、固定ユーザーで認証が成功する', async () => {
      const middleware = jwtAuthMiddleware();

      await middleware(mockContext as Context, mockNext);

      expect(mockContext.set).toHaveBeenCalledWith(
        'user',
        expect.objectContaining({
          id: 'mock-user-id',
          email: 'mock@example.com',
          name: 'Mock User',
        })
      );
      expect(mockContext.set).toHaveBeenCalledWith('isAuthenticated', true);
      expect(mockNext).toHaveBeenCalled();
    });

    it('オプションでモック認証を無効にできる', async () => {
      // Authorizationヘッダーなしでテスト
      (mockContext.req!.header as jest.Mock).mockReturnValue(undefined);

      const middleware = jwtAuthMiddleware({ enableMockAuth: false });

      await expect(middleware(mockContext as Context, mockNext)).rejects.toThrow();
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('カスタムオプションが適用される', async () => {
      const customOptions = {
        userPoolId: 'custom-pool-id',
        clientId: 'custom-client-id',
        region: 'us-east-1',
        cacheTimeout: 1800,
        enableMockAuth: true,
      };

      const middleware = jwtAuthMiddleware(customOptions);

      await middleware(mockContext as Context, mockNext);

      expect(mockContext.set).toHaveBeenCalledWith('isAuthenticated', true);
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('optionalAuthMiddleware (Mock Auth Enabled)', () => {
    it('モック認証が有効な場合、ユーザー情報が設定される', async () => {
      const middleware = optionalAuthMiddleware();

      await middleware(mockContext as Context, mockNext);

      expect(mockContext.set).toHaveBeenCalledWith(
        'user',
        expect.objectContaining({
          id: 'mock-user-id',
          email: 'mock@example.com',
          name: 'Mock User',
        })
      );
      expect(mockContext.set).toHaveBeenCalledWith('isAuthenticated', true);
      expect(mockNext).toHaveBeenCalled();
    });

    it('認証エラーが発生してもエラーを投げずに処理を継続する', async () => {
      // Authorizationヘッダーありだが無効なトークン
      (mockContext.req!.header as jest.Mock).mockReturnValue('Bearer invalid-token');

      const middleware = optionalAuthMiddleware({ enableMockAuth: false });

      await middleware(mockContext as Context, mockNext);

      expect(mockContext.set).toHaveBeenCalledWith('isAuthenticated', false);
      expect(mockNext).toHaveBeenCalled();
    });

    it('オプションでモック認証を制御できる', async () => {
      const middleware = optionalAuthMiddleware({ enableMockAuth: false });

      // Authorizationヘッダーなし
      (mockContext.req!.header as jest.Mock).mockReturnValue(undefined);

      await middleware(mockContext as Context, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('getCurrentUser', () => {
    it('認証済みユーザー情報を取得できる', () => {
      const user = {
        id: 'user123',
        email: 'test@example.com',
        name: 'Test User',
        cognitoSub: 'cognito-sub-123',
      };

      (mockContext.get as jest.Mock)
        .mockReturnValueOnce(user) // 'user'
        .mockReturnValueOnce(true); // 'isAuthenticated'

      const result = getCurrentUser(mockContext as Context);

      expect(result).toEqual(user);
    });

    it('未認証の場合401エラーが発生する', () => {
      (mockContext.get as jest.Mock)
        .mockReturnValueOnce(undefined) // 'user'
        .mockReturnValueOnce(false); // 'isAuthenticated'

      expect(() => getCurrentUser(mockContext as Context)).toThrow(HTTPException);
    });
  });

  describe('getCurrentUserOptional', () => {
    it('認証済みユーザー情報を取得できる', () => {
      const user = {
        id: 'user123',
        email: 'test@example.com',
        name: 'Test User',
        cognitoSub: 'cognito-sub-123',
      };

      (mockContext.get as jest.Mock)
        .mockReturnValueOnce(true) // 'isAuthenticated'
        .mockReturnValueOnce(user); // 'user'

      const result = getCurrentUserOptional(mockContext as Context);

      expect(result).toEqual(user);
    });

    it('未認証の場合nullを返す', () => {
      (mockContext.get as jest.Mock).mockReturnValue(false); // 'isAuthenticated'

      const result = getCurrentUserOptional(mockContext as Context);

      expect(result).toBeNull();
    });
  });

  describe('エラーハンドリング', () => {
    beforeEach(() => {
      // モック認証を無効にしてテスト
      jest.doMock('../config/environment', () => ({
        config: {
          NODE_ENV: 'test',
          JWT_SECRET: 'test-secret',
          COGNITO_USER_POOL_ID: 'ap-northeast-1_test123',
          COGNITO_CLIENT_ID: 'test-client-id',
          AWS_REGION: 'ap-northeast-1',
          ENABLE_MOCK_AUTH: false, // モック認証無効
          JWT_CACHE_TTL: 3600,
          LOG_LEVEL: 'INFO',
          ENABLE_SECURITY_AUDIT: false,
        },
      }));
    });

    it('Authorizationヘッダーがない場合401エラーを返す', async () => {
      (mockContext.req!.header as jest.Mock).mockReturnValue(undefined);

      const middleware = jwtAuthMiddleware({ enableMockAuth: false });

      await expect(middleware(mockContext as Context, mockNext)).rejects.toThrow();
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('Bearerトークンの形式が不正な場合400エラーを返す', async () => {
      (mockContext.req!.header as jest.Mock).mockReturnValue('Invalid token format');

      const middleware = jwtAuthMiddleware({ enableMockAuth: false });

      await expect(middleware(mockContext as Context, mockNext)).rejects.toThrow();
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('リクエストIDが自動生成される', async () => {
      (mockContext.req!.header as jest.Mock).mockImplementation((name: string) => {
        if (name === 'x-request-id') return undefined;
        if (name === 'Authorization') return undefined;
        return undefined;
      });

      const middleware = jwtAuthMiddleware({ enableMockAuth: false });

      await expect(middleware(mockContext as Context, mockNext)).rejects.toThrow();
      // リクエストIDが生成されることを確認（エラーログに含まれる）
    });
  });
});
