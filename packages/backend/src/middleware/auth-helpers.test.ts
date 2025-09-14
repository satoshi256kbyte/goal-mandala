/**
 * JWT認証ミドルウェアのヘルパー関数テスト
 * 要件4.2, 4.3: ヘルパー関数の包括的テスト
 */

import { Context } from 'hono';
import {
  getCurrentUser,
  getCurrentUserOptional,
  getAuthContext,
  getAuthMetadata,
  isAuthenticated,
  hasPermission,
  hasRole,
  hasGroup,
} from './auth';
import { HTTPException } from 'hono/http-exception';
import { AuthenticatedUser, AuthMetadata } from './types';

describe('JWT認証ミドルウェア ヘルパー関数テスト', () => {
  let mockContext: Partial<Context>;

  beforeEach(() => {
    mockContext = {
      get: jest.fn(),
      set: jest.fn(),
    };
  });

  describe('getCurrentUser', () => {
    it('認証済みユーザー情報を正しく取得する', () => {
      const user: AuthenticatedUser = {
        id: 'user-123',
        email: 'test@example.com',
        cognitoSub: 'cognito-sub-123',
        name: 'Test User',
        groups: ['users'],
      };

      (mockContext.get as jest.Mock)
        .mockReturnValueOnce(user) // 'user'
        .mockReturnValueOnce(true); // 'isAuthenticated'

      const result = getCurrentUser(mockContext as Context);

      expect(result).toEqual(user);
      expect(mockContext.get).toHaveBeenCalledWith('user');
      expect(mockContext.get).toHaveBeenCalledWith('isAuthenticated');
    });

    it('未認証の場合HTTPException(401)を投げる', () => {
      (mockContext.get as jest.Mock)
        .mockReturnValueOnce(undefined) // 'user'
        .mockReturnValueOnce(false); // 'isAuthenticated'

      expect(() => getCurrentUser(mockContext as Context)).toThrow(HTTPException);

      try {
        getCurrentUser(mockContext as Context);
      } catch (error) {
        expect(error).toBeInstanceOf(HTTPException);
        expect((error as HTTPException).status).toBe(401);
        expect((error as HTTPException).message).toBe('User not authenticated');
      }
    });

    it('ユーザー情報はあるが認証フラグがfalseの場合HTTPExceptionを投げる', () => {
      const user: AuthenticatedUser = {
        id: 'user-123',
        email: 'test@example.com',
        cognitoSub: 'cognito-sub-123',
      };

      (mockContext.get as jest.Mock)
        .mockReturnValueOnce(user) // 'user'
        .mockReturnValueOnce(false); // 'isAuthenticated'

      expect(() => getCurrentUser(mockContext as Context)).toThrow(HTTPException);
    });
  });

  describe('getCurrentUserOptional', () => {
    it('認証済みユーザー情報を正しく取得する', () => {
      const user: AuthenticatedUser = {
        id: 'user-123',
        email: 'test@example.com',
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

    it('認証フラグがundefinedの場合nullを返す', () => {
      (mockContext.get as jest.Mock).mockReturnValue(undefined); // 'isAuthenticated'

      const result = getCurrentUserOptional(mockContext as Context);

      expect(result).toBeNull();
    });
  });

  describe('getAuthContext', () => {
    it('完全な認証コンテキストを取得する', () => {
      const user: AuthenticatedUser = {
        id: 'user-123',
        email: 'test@example.com',
        cognitoSub: 'cognito-sub-123',
      };

      const metadata: AuthMetadata = {
        authMethod: 'jwt',
        tokenType: 'access',
        issuedAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000),
      };

      (mockContext.get as jest.Mock)
        .mockReturnValueOnce(user) // getCurrentUser内の'user'
        .mockReturnValueOnce(true) // getCurrentUser内の'isAuthenticated'
        .mockReturnValueOnce(metadata); // 'authMetadata'

      const result = getAuthContext(mockContext as Context);

      expect(result).toEqual({
        user,
        isAuthenticated: true,
        metadata,
      });
    });

    it('メタデータがない場合HTTPException(500)を投げる', () => {
      const user: AuthenticatedUser = {
        id: 'user-123',
        email: 'test@example.com',
        cognitoSub: 'cognito-sub-123',
      };

      (mockContext.get as jest.Mock)
        .mockReturnValueOnce(user) // getCurrentUser内の'user'
        .mockReturnValueOnce(true) // getCurrentUser内の'isAuthenticated'
        .mockReturnValueOnce(undefined); // 'authMetadata'

      expect(() => getAuthContext(mockContext as Context)).toThrow(HTTPException);

      try {
        getAuthContext(mockContext as Context);
      } catch (error) {
        expect(error).toBeInstanceOf(HTTPException);
        expect((error as HTTPException).status).toBe(500);
        expect((error as HTTPException).message).toBe('Authentication metadata not found');
      }
    });
  });

  describe('getAuthMetadata', () => {
    it('認証メタデータを取得する', () => {
      const metadata: AuthMetadata = {
        authMethod: 'jwt',
        tokenType: 'access',
        issuedAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000),
      };

      (mockContext.get as jest.Mock).mockReturnValue(metadata);

      const result = getAuthMetadata(mockContext as Context);

      expect(result).toEqual(metadata);
      expect(mockContext.get).toHaveBeenCalledWith('authMetadata');
    });

    it('メタデータがない場合nullを返す', () => {
      (mockContext.get as jest.Mock).mockReturnValue(undefined);

      const result = getAuthMetadata(mockContext as Context);

      expect(result).toBeNull();
    });
  });

  describe('isAuthenticated', () => {
    it('認証済みの場合trueを返す', () => {
      (mockContext.get as jest.Mock).mockReturnValue(true);

      const result = isAuthenticated(mockContext as Context);

      expect(result).toBe(true);
      expect(mockContext.get).toHaveBeenCalledWith('isAuthenticated');
    });

    it('未認証の場合falseを返す', () => {
      (mockContext.get as jest.Mock).mockReturnValue(false);

      const result = isAuthenticated(mockContext as Context);

      expect(result).toBe(false);
    });

    it('認証フラグがundefinedの場合falseを返す', () => {
      (mockContext.get as jest.Mock).mockReturnValue(undefined);

      const result = isAuthenticated(mockContext as Context);

      expect(result).toBe(false);
    });
  });

  describe('hasPermission', () => {
    it('ユーザーが指定された権限を持つ場合trueを返す', () => {
      const user: AuthenticatedUser = {
        id: 'user-123',
        email: 'test@example.com',
        cognitoSub: 'cognito-sub-123',
        groups: ['read-permission', 'write-permission'],
      };

      (mockContext.get as jest.Mock)
        .mockReturnValueOnce(true) // getCurrentUserOptional内の'isAuthenticated'
        .mockReturnValueOnce(user); // getCurrentUserOptional内の'user'

      const result = hasPermission(mockContext as Context, 'read-permission');

      expect(result).toBe(true);
    });

    it('ユーザーが指定された権限を持たない場合falseを返す', () => {
      const user: AuthenticatedUser = {
        id: 'user-123',
        email: 'test@example.com',
        cognitoSub: 'cognito-sub-123',
        groups: ['read-permission'],
      };

      (mockContext.get as jest.Mock)
        .mockReturnValueOnce(true) // getCurrentUserOptional内の'isAuthenticated'
        .mockReturnValueOnce(user); // getCurrentUserOptional内の'user'

      const result = hasPermission(mockContext as Context, 'admin-permission');

      expect(result).toBe(false);
    });

    it('未認証ユーザーの場合falseを返す', () => {
      (mockContext.get as jest.Mock).mockReturnValue(false); // 'isAuthenticated'

      const result = hasPermission(mockContext as Context, 'any-permission');

      expect(result).toBe(false);
    });

    it('グループ情報がない場合falseを返す', () => {
      const user: AuthenticatedUser = {
        id: 'user-123',
        email: 'test@example.com',
        cognitoSub: 'cognito-sub-123',
        // groups プロパティなし
      };

      (mockContext.get as jest.Mock)
        .mockReturnValueOnce(true) // getCurrentUserOptional内の'isAuthenticated'
        .mockReturnValueOnce(user); // getCurrentUserOptional内の'user'

      const result = hasPermission(mockContext as Context, 'any-permission');

      expect(result).toBe(false);
    });
  });

  describe('hasRole', () => {
    it('ユーザーが指定されたロールを持つ場合trueを返す', () => {
      const user: AuthenticatedUser = {
        id: 'user-123',
        email: 'test@example.com',
        cognitoSub: 'cognito-sub-123',
        groups: ['admin-role', 'user-role'],
      };

      (mockContext.get as jest.Mock)
        .mockReturnValueOnce(true) // getCurrentUserOptional内の'isAuthenticated'
        .mockReturnValueOnce(user); // getCurrentUserOptional内の'user'

      const result = hasRole(mockContext as Context, 'admin-role');

      expect(result).toBe(true);
    });

    it('ユーザーが指定されたロールを持たない場合falseを返す', () => {
      const user: AuthenticatedUser = {
        id: 'user-123',
        email: 'test@example.com',
        cognitoSub: 'cognito-sub-123',
        groups: ['user-role'],
      };

      (mockContext.get as jest.Mock)
        .mockReturnValueOnce(true) // getCurrentUserOptional内の'isAuthenticated'
        .mockReturnValueOnce(user); // getCurrentUserOptional内の'user'

      const result = hasRole(mockContext as Context, 'admin-role');

      expect(result).toBe(false);
    });

    it('未認証ユーザーの場合falseを返す', () => {
      (mockContext.get as jest.Mock).mockReturnValue(false); // 'isAuthenticated'

      const result = hasRole(mockContext as Context, 'any-role');

      expect(result).toBe(false);
    });
  });

  describe('hasGroup', () => {
    it('ユーザーが指定されたグループに属する場合trueを返す', () => {
      const user: AuthenticatedUser = {
        id: 'user-123',
        email: 'test@example.com',
        cognitoSub: 'cognito-sub-123',
        groups: ['developers', 'managers'],
      };

      (mockContext.get as jest.Mock)
        .mockReturnValueOnce(true) // getCurrentUserOptional内の'isAuthenticated'
        .mockReturnValueOnce(user); // getCurrentUserOptional内の'user'

      const result = hasGroup(mockContext as Context, 'developers');

      expect(result).toBe(true);
    });

    it('ユーザーが指定されたグループに属さない場合falseを返す', () => {
      const user: AuthenticatedUser = {
        id: 'user-123',
        email: 'test@example.com',
        cognitoSub: 'cognito-sub-123',
        groups: ['developers'],
      };

      (mockContext.get as jest.Mock)
        .mockReturnValueOnce(true) // getCurrentUserOptional内の'isAuthenticated'
        .mockReturnValueOnce(user); // getCurrentUserOptional内の'user'

      const result = hasGroup(mockContext as Context, 'managers');

      expect(result).toBe(false);
    });

    it('未認証ユーザーの場合falseを返す', () => {
      (mockContext.get as jest.Mock).mockReturnValue(false); // 'isAuthenticated'

      const result = hasGroup(mockContext as Context, 'any-group');

      expect(result).toBe(false);
    });
  });

  describe('複合テスト', () => {
    it('複数のヘルパー関数を組み合わせて使用できる', () => {
      const user: AuthenticatedUser = {
        id: 'user-123',
        email: 'test@example.com',
        cognitoSub: 'cognito-sub-123',
        groups: ['admin', 'developers'],
      };

      const metadata: AuthMetadata = {
        authMethod: 'jwt',
        tokenType: 'access',
        issuedAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000),
      };

      (mockContext.get as jest.Mock)
        .mockReturnValue(true) // isAuthenticated
        .mockReturnValueOnce(user) // getCurrentUser内の'user'
        .mockReturnValueOnce(true) // getCurrentUser内の'isAuthenticated'
        .mockReturnValueOnce(metadata) // getAuthContext内の'authMetadata'
        .mockReturnValueOnce(true) // hasRole内のgetCurrentUserOptional
        .mockReturnValueOnce(user) // hasRole内のgetCurrentUserOptional
        .mockReturnValueOnce(true) // hasGroup内のgetCurrentUserOptional
        .mockReturnValueOnce(user); // hasGroup内のgetCurrentUserOptional

      // 認証状態確認
      expect(isAuthenticated(mockContext as Context)).toBe(true);

      // ユーザー情報取得
      const currentUser = getCurrentUser(mockContext as Context);
      expect(currentUser.id).toBe('user-123');

      // 認証コンテキスト取得
      const authContext = getAuthContext(mockContext as Context);
      expect(authContext.user.id).toBe('user-123');
      expect(authContext.isAuthenticated).toBe(true);

      // 権限チェック
      expect(hasRole(mockContext as Context, 'admin')).toBe(true);
      expect(hasGroup(mockContext as Context, 'developers')).toBe(true);
    });
  });
});
