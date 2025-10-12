/**
 * middleware/typesのテスト
 */

import {
  AuthContext,
  JWTPayload,
  CognitoUser,
  AuthConfig,
  AuthError,
  ValidationResult,
  KeyCache,
  AuthMetadata,
} from '../types';

describe('Middleware Types Tests', () => {
  it('AuthContext - 認証コンテキスト型', () => {
    const context: AuthContext = {
      userId: 'user-123',
      email: 'test@example.com',
      isAuthenticated: true,
      roles: ['user'],
      permissions: ['read', 'write'],
    };

    expect(context.userId).toBe('user-123');
    expect(context.email).toBe('test@example.com');
    expect(context.isAuthenticated).toBe(true);
    expect(context.roles).toContain('user');
    expect(context.permissions).toContain('read');
  });

  it('JWTPayload - JWTペイロード型', () => {
    const payload: JWTPayload = {
      sub: 'user-123',
      email: 'test@example.com',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
      aud: 'client-id',
      iss: 'https://cognito-idp.region.amazonaws.com/pool-id',
    };

    expect(payload.sub).toBe('user-123');
    expect(payload.email).toBe('test@example.com');
    expect(payload.iat).toBeDefined();
    expect(payload.exp).toBeGreaterThan(payload.iat);
  });

  it('CognitoUser - Cognitoユーザー型', () => {
    const user: CognitoUser = {
      sub: 'cognito-user-123',
      email: 'user@example.com',
      email_verified: true,
      name: 'Test User',
      given_name: 'Test',
      family_name: 'User',
      phone_number: '+1234567890',
      phone_number_verified: false,
    };

    expect(user.sub).toBe('cognito-user-123');
    expect(user.email).toBe('user@example.com');
    expect(user.email_verified).toBe(true);
    expect(user.name).toBe('Test User');
  });

  it('AuthConfig - 認証設定型', () => {
    const config: AuthConfig = {
      userPoolId: 'ap-northeast-1_test123',
      clientId: 'test-client-id',
      region: 'ap-northeast-1',
      jwksUrl:
        'https://cognito-idp.ap-northeast-1.amazonaws.com/ap-northeast-1_test123/.well-known/jwks.json',
      tokenUse: 'id',
      clockTolerance: 300,
    };

    expect(config.userPoolId).toBe('ap-northeast-1_test123');
    expect(config.clientId).toBe('test-client-id');
    expect(config.region).toBe('ap-northeast-1');
    expect(config.jwksUrl).toContain('jwks.json');
  });

  it('AuthError - 認証エラー型', () => {
    const error: AuthError = {
      code: 'INVALID_TOKEN',
      message: 'Token is invalid or expired',
      statusCode: 401,
      timestamp: new Date(),
      details: { reason: 'Token expired' },
    };

    expect(error.code).toBe('INVALID_TOKEN');
    expect(error.message).toBe('Token is invalid or expired');
    expect(error.statusCode).toBe(401);
    expect(error.timestamp).toBeInstanceOf(Date);
  });

  it('ValidationResult - バリデーション結果型（成功）', () => {
    const result: ValidationResult = {
      isValid: true,
      payload: {
        sub: 'user-123',
        email: 'test@example.com',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      },
    };

    expect(result.isValid).toBe(true);
    expect(result.payload).toBeDefined();
    expect(result.payload?.sub).toBe('user-123');
    expect(result.error).toBeUndefined();
  });

  it('ValidationResult - バリデーション結果型（失敗）', () => {
    const result: ValidationResult = {
      isValid: false,
      error: 'Token validation failed',
      errorCode: 'VALIDATION_ERROR',
    };

    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Token validation failed');
    expect(result.errorCode).toBe('VALIDATION_ERROR');
    expect(result.payload).toBeUndefined();
  });

  it('KeyCache - キーキャッシュ型', () => {
    const cache: KeyCache = {
      kid: 'test-key-id',
      publicKey: 'test-public-key-data',
      algorithm: 'RS256',
      cachedAt: new Date(),
      expiresAt: new Date(Date.now() + 3600000),
      hitCount: 5,
    };

    expect(cache.kid).toBe('test-key-id');
    expect(cache.publicKey).toBe('test-public-key-data');
    expect(cache.algorithm).toBe('RS256');
    expect(cache.cachedAt).toBeInstanceOf(Date);
    expect(cache.expiresAt).toBeInstanceOf(Date);
    expect(cache.hitCount).toBe(5);
  });

  it('AuthMetadata - 認証メタデータ型', () => {
    const metadata: AuthMetadata = {
      requestId: 'req-123',
      userAgent: 'Mozilla/5.0 (Test Browser)',
      ipAddress: '192.168.1.1',
      timestamp: new Date(),
      sessionId: 'session-456',
      deviceId: 'device-789',
      source: 'web',
    };

    expect(metadata.requestId).toBe('req-123');
    expect(metadata.userAgent).toBe('Mozilla/5.0 (Test Browser)');
    expect(metadata.ipAddress).toBe('192.168.1.1');
    expect(metadata.timestamp).toBeInstanceOf(Date);
    expect(metadata.sessionId).toBe('session-456');
  });

  it('型の組み合わせ - 複合型の使用', () => {
    const authResult: ValidationResult & { metadata?: AuthMetadata } = {
      isValid: true,
      payload: {
        sub: 'user-123',
        email: 'test@example.com',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      },
      metadata: {
        requestId: 'req-123',
        userAgent: 'Test Agent',
        ipAddress: '127.0.0.1',
        timestamp: new Date(),
      },
    };

    expect(authResult.isValid).toBe(true);
    expect(authResult.payload?.sub).toBe('user-123');
    expect(authResult.metadata?.requestId).toBe('req-123');
  });

  it('オプショナルフィールド - 部分的な型定義', () => {
    const minimalConfig: Partial<AuthConfig> = {
      userPoolId: 'ap-northeast-1_test123',
      region: 'ap-northeast-1',
    };

    expect(minimalConfig.userPoolId).toBe('ap-northeast-1_test123');
    expect(minimalConfig.region).toBe('ap-northeast-1');
    expect(minimalConfig.clientId).toBeUndefined();
  });
});
