/**
 * JWT認証ミドルウェア（Cognito対応）
 */

import { Context, Next, MiddlewareHandler } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { config, getConfig } from '../config/environment';
import { logger } from '../utils/logger';
import {
  CognitoJWTPayload,
  AuthenticatedUser,
  AuthMiddlewareOptions,
  AuthErrorType,
  MockUserConfig,
  TypedAuthError,
  AuthContext,
  AuthMetadata,
} from './types';
import { CognitoKeyManagerImpl } from './cognito-key-manager';
import { JWTValidatorImpl } from './jwt-validator';
import { AuthErrorHandler, AuthErrorContext } from './auth-error-handler';

// グローバルインスタンス（シングルトン）
let keyManager: CognitoKeyManagerImpl | null = null;
let jwtValidator: JWTValidatorImpl | null = null;

/**
 * キーマネージャーとバリデーターを初期化
 */
function initializeAuthComponents(options?: Partial<AuthMiddlewareOptions>): {
  keyManager: CognitoKeyManagerImpl;
  jwtValidator: JWTValidatorImpl;
} {
  // オプションから設定を取得（環境変数より優先）
  const userPoolId = options?.userPoolId ?? config.COGNITO_USER_POOL_ID;
  const clientId = options?.clientId ?? config.COGNITO_CLIENT_ID;
  const region = options?.region ?? config.AWS_REGION;
  const cacheTimeout = options?.cacheTimeout ?? config.JWT_CACHE_TTL;

  if (!keyManager || !jwtValidator) {
    keyManager = new CognitoKeyManagerImpl(userPoolId, region, cacheTimeout);

    jwtValidator = new JWTValidatorImpl(keyManager, userPoolId, clientId, region);
  }

  return { keyManager, jwtValidator };
}

/**
 * JWT認証ミドルウェア（Cognito対応）
 */
export const jwtAuthMiddleware = (options?: Partial<AuthMiddlewareOptions>): MiddlewareHandler => {
  return async (c: Context, next: Next) => {
    // 現在の設定を取得（テスト時の動的変更に対応）
    const currentConfig = getConfig();

    // 本番環境でのモック認証チェック（要件6.3）
    const enableMockAuth = options?.enableMockAuth ?? currentConfig.ENABLE_MOCK_AUTH;
    if (currentConfig.NODE_ENV === 'production' && enableMockAuth) {
      logger.error('Mock authentication is not allowed in production environment', {
        environment: currentConfig.NODE_ENV,
        enableMockAuth,
      });
      throw new HTTPException(500, {
        message: 'Authentication configuration error',
      });
    }
    const requestId =
      c.req.header('x-request-id') ||
      `req-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    const userAgent = c.req.header('user-agent') || 'Unknown';
    const ipAddress = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'Unknown';
    const endpoint = c.req.path;
    const method = c.req.method;

    // エラーコンテキストを作成
    const errorContext: AuthErrorContext = {
      requestId,
      ipAddress,
      userAgent,
      endpoint,
      method,
    };

    try {
      // オプションからモック認証設定を取得（環境変数より優先）
      const enableMockAuth = options?.enableMockAuth ?? config.ENABLE_MOCK_AUTH;

      // モック認証が有効な場合（要件6.1, 6.2, 6.3）
      if (enableMockAuth) {
        const mockUser = createMockUser(options?.mockUser, currentConfig);
        const metadata = createMockAuthMetadata();

        c.set('user', mockUser);
        c.set('isAuthenticated', true);
        c.set('authMetadata', metadata);

        // モック認証成功ログ
        AuthErrorHandler.logAuthSuccess({
          ...errorContext,
          userId: mockUser.id,
        });

        logger.info('Mock authentication successful', {
          userId: mockUser.id,
          email: mockUser.email,
          name: mockUser.name,
          authMode: 'mock',
          environment: currentConfig.NODE_ENV,
          requestId,
        });

        await next();
        return;
      }

      // Authorizationヘッダーの確認
      const authHeader = c.req.header('Authorization');
      if (!authHeader) {
        throw createAuthError(AuthErrorType.TOKEN_MISSING, 'Authorization header is required');
      }

      // Bearerトークンの抽出
      const token = extractBearerToken(authHeader);
      if (!token) {
        throw createAuthError(AuthErrorType.TOKEN_INVALID, 'Bearer token is required');
      }

      // JWT検証（オプションでカスタム設定を使用）
      const { jwtValidator } = initializeAuthComponents(options);
      const payload = await jwtValidator.validateToken(token);

      // ユーザー情報をコンテキストに設定
      const user = createAuthenticatedUser(payload);
      const metadata = createAuthMetadata(payload, 'jwt');

      c.set('user', user);
      c.set('isAuthenticated', true);
      c.set('authMetadata', metadata);

      // 認証成功ログ
      AuthErrorHandler.logAuthSuccess({
        ...errorContext,
        userId: user.id,
      });

      logger.info('User authenticated successfully', {
        userId: user.id,
        email: user.email,
        tokenUse: payload.token_use,
        requestId,
      });

      await next();
    } catch (error) {
      // 統一されたエラーハンドリング（要件3.1, 3.2, 3.3, 3.4）
      AuthErrorHandler.handleAuthError(error, errorContext);
    }
  };
};

/**
 * オプショナル認証ミドルウェア（認証されていなくてもエラーにしない）
 */
export const optionalAuthMiddleware = (
  options?: Partial<AuthMiddlewareOptions>
): MiddlewareHandler => {
  return async (c: Context, next: Next) => {
    const requestId =
      c.req.header('x-request-id') ||
      `req-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    const userAgent = c.req.header('user-agent') || 'Unknown';
    const ipAddress = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'Unknown';
    const endpoint = c.req.path;
    const method = c.req.method;

    try {
      // 現在の設定を取得（テスト時の動的変更に対応）
      const currentConfig = getConfig();

      // オプションからモック認証設定を取得（環境変数より優先）
      const enableMockAuth = options?.enableMockAuth ?? currentConfig.ENABLE_MOCK_AUTH;

      // モック認証が有効な場合（要件6.1, 6.2, 6.3）
      if (enableMockAuth) {
        const mockUser = createMockUser(options?.mockUser, currentConfig);
        const metadata = createMockAuthMetadata();

        c.set('user', mockUser);
        c.set('isAuthenticated', true);
        c.set('authMetadata', metadata);

        // モック認証成功ログ
        AuthErrorHandler.logAuthSuccess({
          requestId,
          ipAddress,
          userAgent,
          endpoint,
          method,
          userId: mockUser.id,
        });

        logger.debug('Optional mock authentication successful', {
          userId: mockUser.id,
          email: mockUser.email,
          name: mockUser.name,
          authMode: 'mock',
          environment: currentConfig.NODE_ENV,
          requestId,
        });

        await next();
        return;
      }

      const authHeader = c.req.header('Authorization');
      if (authHeader) {
        const token = extractBearerToken(authHeader);
        if (token) {
          const { jwtValidator } = initializeAuthComponents(options);
          const payload = await jwtValidator.validateToken(token);
          const user = createAuthenticatedUser(payload);
          const metadata = createAuthMetadata(payload, 'jwt');

          c.set('user', user);
          c.set('isAuthenticated', true);
          c.set('authMetadata', metadata);

          // 認証成功ログ
          AuthErrorHandler.logAuthSuccess({
            requestId,
            ipAddress,
            userAgent,
            endpoint,
            method,
            userId: user.id,
          });
        }
      }
    } catch (error) {
      // オプショナル認証なのでエラーは無視（ただしログは記録）
      logger.debug('Optional auth failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        requestId,
      });
    }

    // 認証状態が設定されていない場合はfalseに設定
    if (c.get('isAuthenticated') === undefined) {
      c.set('isAuthenticated', false);
    }

    await next();
  };
};

/**
 * ユーザー情報を取得するヘルパー関数（要件4.2, 4.3）
 */
export const getCurrentUser = (c: Context): AuthenticatedUser => {
  const user = c.get('user') as AuthenticatedUser;
  const isAuthenticated = c.get('isAuthenticated') as boolean;

  if (!user || !isAuthenticated) {
    throw new HTTPException(401, { message: 'User not authenticated' });
  }

  return user;
};

/**
 * オプショナルユーザー情報を取得するヘルパー関数（要件4.2, 4.3）
 */
export const getCurrentUserOptional = (c: Context): AuthenticatedUser | null => {
  const isAuthenticated = c.get('isAuthenticated') as boolean;
  return isAuthenticated ? (c.get('user') as AuthenticatedUser) : null;
};

/**
 * 認証コンテキストを取得するヘルパー関数（要件4.2, 4.3）
 */
export const getAuthContext = (c: Context): AuthContext => {
  const user = getCurrentUser(c);
  const metadata = c.get('authMetadata') as AuthMetadata;

  if (!metadata) {
    throw new HTTPException(500, { message: 'Authentication metadata not found' });
  }

  return {
    user,
    isAuthenticated: true,
    metadata,
  };
};

/**
 * 認証メタデータを取得するヘルパー関数（要件4.2, 4.3）
 */
export const getAuthMetadata = (c: Context): AuthMetadata | null => {
  return (c.get('authMetadata') as AuthMetadata) || null;
};

/**
 * 認証状態を確認するヘルパー関数（要件4.2, 4.3）
 */
export const isAuthenticated = (c: Context): boolean => {
  return (c.get('isAuthenticated') as boolean) || false;
};

/**
 * 権限チェックヘルパー関数（要件4.2, 4.3）
 */
export const hasPermission = (c: Context, permission: string): boolean => {
  const user = getCurrentUserOptional(c);
  if (!user) return false;

  // 実装は将来的に権限システムと連携
  return user.groups?.includes(permission) || false;
};

/**
 * ロールチェックヘルパー関数（要件4.2, 4.3）
 */
export const hasRole = (c: Context, role: string): boolean => {
  const user = getCurrentUserOptional(c);
  if (!user) return false;

  // 実装は将来的にロールシステムと連携
  return user.groups?.includes(role) || false;
};

/**
 * グループチェックヘルパー関数（要件4.2, 4.3）
 */
export const hasGroup = (c: Context, group: string): boolean => {
  const user = getCurrentUserOptional(c);
  if (!user) return false;

  return user.groups?.includes(group) || false;
};

// ===== ヘルパー関数 =====

/**
 * Bearerトークンを抽出
 */
function extractBearerToken(authHeader: string): string | null {
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
}

/**
 * モックユーザーを作成（要件6.1, 6.2, 6.3）
 */
function createMockUser(
  mockUserConfig?: MockUserConfig,
  currentConfig = config
): AuthenticatedUser {
  // カスタム設定がある場合はそれを使用、なければ環境変数から取得
  if (mockUserConfig) {
    return {
      id: mockUserConfig.id,
      email: mockUserConfig.email,
      name: mockUserConfig.name,
      cognitoSub: mockUserConfig.cognitoSub,
      cognitoUsername: mockUserConfig.cognitoUsername,
      groups: mockUserConfig.groups,
      emailVerified: mockUserConfig.emailVerified,
      phoneNumber: mockUserConfig.phoneNumber,
      phoneNumberVerified: mockUserConfig.phoneNumberVerified,
    };
  }

  // 環境変数から取得
  return {
    id: currentConfig.MOCK_USER_ID,
    email: currentConfig.MOCK_USER_EMAIL,
    name: currentConfig.MOCK_USER_NAME,
    cognitoSub: `mock-cognito-${currentConfig.MOCK_USER_ID}`,
    cognitoUsername: `mock-${currentConfig.MOCK_USER_ID}`,
    groups: ['mock-users'],
    emailVerified: true,
    phoneNumber: undefined,
    phoneNumberVerified: false,
  };
}

/**
 * 認証されたユーザー情報を作成（要件4.2, 4.3）
 */
function createAuthenticatedUser(payload: CognitoJWTPayload): AuthenticatedUser {
  return {
    id: payload.sub,
    email: payload.email,
    name: payload.name,
    cognitoSub: payload.sub,
    cognitoUsername: payload['cognito:username'],
    groups: payload['cognito:groups'],
    emailVerified: payload.email_verified,
    phoneNumber: payload.phone_number,
    phoneNumberVerified: payload.phone_number_verified,
  };
}

/**
 * 認証メタデータを作成（要件4.2, 4.3）
 */
function createAuthMetadata(payload: CognitoJWTPayload, authMethod: 'jwt'): AuthMetadata {
  return {
    authMethod,
    tokenType: payload.token_use,
    issuedAt: new Date(payload.iat * 1000),
    expiresAt: new Date(payload.exp * 1000),
    authTime: payload.auth_time ? new Date(payload.auth_time * 1000) : undefined,
    sessionId: `session-${payload.sub}-${payload.iat}`,
  };
}

/**
 * モック認証メタデータを作成（要件6.1, 6.2, 6.3）
 */
function createMockAuthMetadata(): AuthMetadata {
  const now = new Date();
  return {
    authMethod: 'mock',
    issuedAt: now,
    expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000), // 24時間後
    sessionId: `mock-session-${Date.now()}`,
  };
}

/**
 * 認証エラーを作成（要件3.1）
 */
function createAuthError(type: AuthErrorType, message: string): TypedAuthError {
  const error = new Error(message) as TypedAuthError;
  error.type = type;
  return error;
}

// 後方互換性のためのエイリアス
export const authMiddleware = jwtAuthMiddleware();
