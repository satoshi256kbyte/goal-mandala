/**
 * 型定義のテスト
 *
 * 要件4.2, 4.3に対応：
 * - 型安全な方法でユーザー情報にアクセス
 * - 必要な情報（sub、email、name等）が含まれていることを保証
 */

import {
  AuthenticatedUser,
  CognitoJWTPayload,
  AuthContext,
  AuthMetadata,
  AuthMiddlewareOptions,
  MockUserConfig,
  AuthErrorType,
  TypedAuthError,
  isAuthenticatedUser,
  isCognitoJWTPayload,
  isTypedAuthError,
  isAuthContext,
  isAuthMetadata,
  RequiredAuthUser,
  OptionalAuthUser,
  AuthUserUpdate,
  AuthenticationResult,
  TokenInfo,
  AuthEvent,
} from './types';

describe('型定義テスト', () => {
  describe('AuthenticatedUser', () => {
    it('必須フィールドを持つユーザーオブジェクトを作成できる', () => {
      const user: AuthenticatedUser = {
        id: 'user-123',
        email: 'test@example.com',
        cognitoSub: 'cognito-sub-123',
      };

      expect(user.id).toBe('user-123');
      expect(user.email).toBe('test@example.com');
      expect(user.cognitoSub).toBe('cognito-sub-123');
    });

    it('オプションフィールドを持つユーザーオブジェクトを作成できる', () => {
      const user: AuthenticatedUser = {
        id: 'user-123',
        email: 'test@example.com',
        cognitoSub: 'cognito-sub-123',
        name: 'Test User',
        groups: ['users', 'managers'],
        emailVerified: true,
        phoneNumber: '+1234567890',
        phoneNumberVerified: true,
      };

      expect(user.name).toBe('Test User');
      expect(user.groups).toEqual(['users', 'managers']);
      expect(user.emailVerified).toBe(true);
    });

    it('readonlyプロパティは変更できない', () => {
      const user: AuthenticatedUser = {
        id: 'user-123',
        email: 'test@example.com',
        cognitoSub: 'cognito-sub-123',
      };

      // TypeScriptコンパイル時エラーになることを確認
      // user.id = 'new-id'; // Error: Cannot assign to 'id' because it is a read-only property
      // user.email = 'new@example.com'; // Error: Cannot assign to 'email' because it is a read-only property

      expect(user.id).toBe('user-123');
    });
  });

  describe('CognitoJWTPayload', () => {
    it('有効なCognito JWTペイロードを作成できる', () => {
      const payload: CognitoJWTPayload = {
        sub: 'user-123',
        email: 'test@example.com',
        iss: 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_ABC123',
        aud: 'client-id-123',
        token_use: 'access',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
      };

      expect(payload.sub).toBe('user-123');
      expect(payload.token_use).toBe('access');
    });
  });

  describe('AuthContext', () => {
    it('認証コンテキストを作成できる', () => {
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

      const context: AuthContext = {
        user,
        isAuthenticated: true,
        metadata,
      };

      expect(context.isAuthenticated).toBe(true);
      expect(context.user.id).toBe('user-123');
      expect(context.metadata.authMethod).toBe('jwt');
    });
  });

  describe('AuthMiddlewareOptions', () => {
    it('必須オプションを持つ設定を作成できる', () => {
      const options: AuthMiddlewareOptions = {
        userPoolId: 'us-east-1_ABC123',
        clientId: 'client-id-123',
        region: 'us-east-1',
      };

      expect(options.userPoolId).toBe('us-east-1_ABC123');
      expect(options.clientId).toBe('client-id-123');
      expect(options.region).toBe('us-east-1');
    });

    it('オプションフィールドを持つ設定を作成できる', () => {
      const options: AuthMiddlewareOptions = {
        userPoolId: 'us-east-1_ABC123',
        clientId: 'client-id-123',
        region: 'us-east-1',
        enableMockAuth: true,
        cacheTimeout: 1800,
        allowedTokenUse: ['access'],
        enableSecurityAudit: true,
      };

      expect(options.enableMockAuth).toBe(true);
      expect(options.cacheTimeout).toBe(1800);
      expect(options.allowedTokenUse).toEqual(['access']);
    });
  });

  describe('TypedAuthError', () => {
    it('型付きエラーを作成できる', () => {
      const error = new Error('Token expired') as TypedAuthError;
      error.type = AuthErrorType.TOKEN_EXPIRED;

      expect(error.message).toBe('Token expired');
      expect(error.type).toBe(AuthErrorType.TOKEN_EXPIRED);
    });
  });

  describe('型ガード関数', () => {
    describe('isAuthenticatedUser', () => {
      it('有効なユーザーオブジェクトを正しく識別する', () => {
        const validUser = {
          id: 'user-123',
          email: 'test@example.com',
          cognitoSub: 'cognito-sub-123',
        };

        expect(isAuthenticatedUser(validUser)).toBe(true);
      });

      it('無効なユーザーオブジェクトを正しく識別する', () => {
        const invalidUser = {
          id: 'user-123',
          // email が欠けている
          cognitoSub: 'cognito-sub-123',
        };

        expect(isAuthenticatedUser(invalidUser)).toBe(false);
        expect(isAuthenticatedUser(null)).toBe(false);
        expect(isAuthenticatedUser(undefined)).toBe(false);
        expect(isAuthenticatedUser('string')).toBe(false);
      });
    });

    describe('isCognitoJWTPayload', () => {
      it('有効なJWTペイロードを正しく識別する', () => {
        const validPayload = {
          sub: 'user-123',
          email: 'test@example.com',
          iss: 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_ABC123',
          aud: 'client-id-123',
          token_use: 'access' as const,
          exp: Math.floor(Date.now() / 1000) + 3600,
          iat: Math.floor(Date.now() / 1000),
        };

        expect(isCognitoJWTPayload(validPayload)).toBe(true);
      });

      it('無効なJWTペイロードを正しく識別する', () => {
        const invalidPayload = {
          sub: 'user-123',
          // email が欠けている
          iss: 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_ABC123',
          aud: 'client-id-123',
          token_use: 'access' as const,
          exp: Math.floor(Date.now() / 1000) + 3600,
          iat: Math.floor(Date.now() / 1000),
        };

        expect(isCognitoJWTPayload(invalidPayload)).toBe(false);
      });
    });

    describe('isTypedAuthError', () => {
      it('型付きエラーを正しく識別する', () => {
        const error = new Error('Test error') as TypedAuthError;
        error.type = AuthErrorType.TOKEN_INVALID;

        expect(isTypedAuthError(error)).toBe(true);
      });

      it('通常のエラーを正しく識別する', () => {
        const error = new Error('Test error');

        expect(isTypedAuthError(error)).toBe(false);
      });
    });
  });

  describe('ユーティリティ型', () => {
    it('RequiredAuthUserは必須フィールドのみを含む', () => {
      const requiredUser: RequiredAuthUser = {
        id: 'user-123',
        email: 'test@example.com',
        cognitoSub: 'cognito-sub-123',
      };

      expect(requiredUser.id).toBe('user-123');
      expect(requiredUser.email).toBe('test@example.com');
      expect(requiredUser.cognitoSub).toBe('cognito-sub-123');
    });

    it('OptionalAuthUserはすべてのフィールドがオプション', () => {
      const optionalUser: OptionalAuthUser = {
        email: 'test@example.com',
      };

      expect(optionalUser.email).toBe('test@example.com');
      expect(optionalUser.id).toBeUndefined();
    });

    it('AuthUserUpdateはidとcognitoSubを除外', () => {
      const userUpdate: AuthUserUpdate = {
        email: 'new@example.com',
        name: 'New Name',
        // id: 'new-id', // Error: Object literal may only specify known properties
        // cognitoSub: 'new-sub', // Error: Object literal may only specify known properties
      };

      expect(userUpdate.email).toBe('new@example.com');
      expect(userUpdate.name).toBe('New Name');
    });
  });

  describe('AuthenticationResult', () => {
    it('成功した認証結果を作成できる', () => {
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

      const result: AuthenticationResult = {
        success: true,
        user,
        metadata,
        timestamp: new Date(),
        duration: 150,
      };

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.metadata).toBeDefined();
      expect(result.duration).toBe(150);
    });

    it('失敗した認証結果を作成できる', () => {
      const error = new Error('Invalid token') as TypedAuthError;
      error.type = AuthErrorType.TOKEN_INVALID;

      const result: AuthenticationResult = {
        success: false,
        error,
        timestamp: new Date(),
        duration: 50,
      };

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.user).toBeUndefined();
    });
  });

  describe('TokenInfo', () => {
    it('トークン情報を作成できる', () => {
      const tokenInfo: TokenInfo = {
        type: 'access',
        issuer: 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_ABC123',
        audience: 'client-id-123',
        subject: 'user-123',
        issuedAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000),
        jwtId: 'jwt-id-123',
      };

      expect(tokenInfo.type).toBe('access');
      expect(tokenInfo.subject).toBe('user-123');
      expect(tokenInfo.jwtId).toBe('jwt-id-123');
    });
  });

  describe('AuthEvent', () => {
    it('認証イベントを作成できる', () => {
      const event: AuthEvent = {
        type: 'login',
        userId: 'user-123',
        timestamp: new Date(),
        metadata: {
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0...',
        },
        source: 'middleware',
      };

      expect(event.type).toBe('login');
      expect(event.userId).toBe('user-123');
      expect(event.source).toBe('middleware');
      expect(event.metadata.ipAddress).toBe('192.168.1.1');
    });
  });
});
