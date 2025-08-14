/**
 * 認証ミドルウェアのテスト
 */

import { Context } from 'hono';
import jwt from 'jsonwebtoken';
import {
  authMiddleware,
  optionalAuthMiddleware,
  getCurrentUser,
  getCurrentUserOptional,
} from './auth';
import { HTTPException } from 'hono/http-exception';

// モック設定
jest.mock('../config/environment', () => ({
  config: {
    JWT_SECRET: 'test-secret',
  },
}));

jest.mock('../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('Auth Middleware', () => {
  let mockContext: Partial<Context>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockContext = {
      req: {
        header: jest.fn(),
      } as any,
      set: jest.fn(),
    };
    mockNext = jest.fn();
  });

  describe('authMiddleware', () => {
    it('正しいJWTトークンで認証が成功する', async () => {
      const payload = {
        sub: 'user123',
        email: 'test@example.com',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      const token = jwt.sign(payload, 'test-secret');
      (mockContext.req!.header as jest.Mock).mockReturnValue(`Bearer ${token}`);

      await authMiddleware(mockContext as Context, mockNext);

      expect(mockContext.set).toHaveBeenCalledWith('user', {
        id: 'user123',
        email: 'test@example.com',
      });
      expect(mockNext).toHaveBeenCalled();
    });

    it('Authorizationヘッダーがない場合401エラーが発生する', async () => {
      (mockContext.req!.header as jest.Mock).mockReturnValue(undefined);

      await expect(authMiddleware(mockContext as Context, mockNext)).rejects.toThrow(HTTPException);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('Bearerトークンがない場合401エラーが発生する', async () => {
      (mockContext.req!.header as jest.Mock).mockReturnValue('Invalid header');

      await expect(authMiddleware(mockContext as Context, mockNext)).rejects.toThrow(HTTPException);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('無効なJWTトークンで401エラーが発生する', async () => {
      (mockContext.req!.header as jest.Mock).mockReturnValue('Bearer invalid-token');

      await expect(authMiddleware(mockContext as Context, mockNext)).rejects.toThrow(HTTPException);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('期限切れのJWTトークンで401エラーが発生する', async () => {
      const payload = {
        sub: 'user123',
        email: 'test@example.com',
        iat: Math.floor(Date.now() / 1000) - 7200,
        exp: Math.floor(Date.now() / 1000) - 3600, // 1時間前に期限切れ
      };

      const token = jwt.sign(payload, 'test-secret');
      (mockContext.req!.header as jest.Mock).mockReturnValue(`Bearer ${token}`);

      await expect(authMiddleware(mockContext as Context, mockNext)).rejects.toThrow(HTTPException);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('optionalAuthMiddleware', () => {
    it('正しいJWTトークンでユーザー情報が設定される', async () => {
      const payload = {
        sub: 'user123',
        email: 'test@example.com',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      const token = jwt.sign(payload, 'test-secret');
      (mockContext.req!.header as jest.Mock).mockReturnValue(`Bearer ${token}`);

      await optionalAuthMiddleware(mockContext as Context, mockNext);

      expect(mockContext.set).toHaveBeenCalledWith('user', {
        id: 'user123',
        email: 'test@example.com',
      });
      expect(mockNext).toHaveBeenCalled();
    });

    it('Authorizationヘッダーがなくてもエラーにならない', async () => {
      (mockContext.req!.header as jest.Mock).mockReturnValue(undefined);

      await optionalAuthMiddleware(mockContext as Context, mockNext);

      expect(mockContext.set).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });

    it('無効なJWTトークンでもエラーにならない', async () => {
      (mockContext.req!.header as jest.Mock).mockReturnValue('Bearer invalid-token');

      await optionalAuthMiddleware(mockContext as Context, mockNext);

      expect(mockContext.set).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('getCurrentUser', () => {
    it('認証済みユーザー情報を取得できる', () => {
      const user = { id: 'user123', email: 'test@example.com' };
      mockContext.get = jest.fn().mockReturnValue(user);

      const result = getCurrentUser(mockContext as Context);

      expect(result).toEqual(user);
    });

    it('未認証の場合401エラーが発生する', () => {
      mockContext.get = jest.fn().mockReturnValue(undefined);

      expect(() => getCurrentUser(mockContext as Context)).toThrow(HTTPException);
    });
  });

  describe('getCurrentUserOptional', () => {
    it('認証済みユーザー情報を取得できる', () => {
      const user = { id: 'user123', email: 'test@example.com' };
      mockContext.get = jest.fn().mockReturnValue(user);

      const result = getCurrentUserOptional(mockContext as Context);

      expect(result).toEqual(user);
    });

    it('未認証の場合nullを返す', () => {
      mockContext.get = jest.fn().mockReturnValue(undefined);

      const result = getCurrentUserOptional(mockContext as Context);

      expect(result).toBeNull();
    });
  });
});
