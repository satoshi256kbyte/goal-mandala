/**
 * JWT認証エラーハンドリングクラスのテスト
 */

import { HTTPException } from 'hono/http-exception';
import { AuthErrorHandler, AuthErrorContext } from './auth-error-handler';
import { AuthErrorType } from './types';
import { logger } from '../utils/logger';
import { config } from '../config/environment';

// モック設定
jest.mock('../utils/logger');
jest.mock('../config/environment', () => ({
  config: {
    NODE_ENV: 'test',
    ENABLE_SECURITY_AUDIT: true,
  },
}));

describe('AuthErrorHandler', () => {
  const mockContext: AuthErrorContext = {
    requestId: 'test-request-id',
    ipAddress: '192.168.1.1',
    userAgent: 'Test User Agent',
    endpoint: '/api/test',
    method: 'GET',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('classifyError', () => {
    it('既に型付けされたエラーの場合、その型を返す', () => {
      const error = new Error('Test error') as Error & { type: AuthErrorType };
      error.type = AuthErrorType.TOKEN_EXPIRED;

      const result = AuthErrorHandler.classifyError(error);
      expect(result).toBe(AuthErrorType.TOKEN_EXPIRED);
    });

    it('トークン不足エラーを正しく分類する', () => {
      const error = new Error('Authorization header is required');
      const result = AuthErrorHandler.classifyError(error);
      expect(result).toBe(AuthErrorType.TOKEN_MISSING);
    });

    it('トークン期限切れエラーを正しく分類する', () => {
      const error = new Error('Token expired');
      const result = AuthErrorHandler.classifyError(error);
      expect(result).toBe(AuthErrorType.TOKEN_EXPIRED);
    });

    it('署名無効エラーを正しく分類する', () => {
      const error = new Error('Invalid signature');
      const result = AuthErrorHandler.classifyError(error);
      expect(result).toBe(AuthErrorType.SIGNATURE_INVALID);
    });

    it('クレーム無効エラーを正しく分類する', () => {
      const error = new Error('Invalid claims');
      const result = AuthErrorHandler.classifyError(error);
      expect(result).toBe(AuthErrorType.CLAIMS_INVALID);
    });

    it('トークン形式エラーを正しく分類する', () => {
      const error = new Error('Malformed token format');
      const result = AuthErrorHandler.classifyError(error);
      expect(result).toBe(AuthErrorType.TOKEN_INVALID);
    });

    it('公開鍵取得エラーを正しく分類する', () => {
      const error = new Error('Failed to fetch public key');
      const result = AuthErrorHandler.classifyError(error);
      expect(result).toBe(AuthErrorType.INTERNAL_ERROR);
    });

    it('不明なエラーはTOKEN_INVALIDとして分類する', () => {
      const error = new Error('Unknown error');
      const result = AuthErrorHandler.classifyError(error);
      expect(result).toBe(AuthErrorType.TOKEN_INVALID);
    });
  });

  describe('getHttpStatusCode', () => {
    it('TOKEN_MISSINGは401を返す', () => {
      const result = AuthErrorHandler.getHttpStatusCode(AuthErrorType.TOKEN_MISSING);
      expect(result).toBe(401);
    });

    it('TOKEN_INVALIDは400を返す（要件3.2）', () => {
      const result = AuthErrorHandler.getHttpStatusCode(AuthErrorType.TOKEN_INVALID);
      expect(result).toBe(400);
    });

    it('TOKEN_EXPIREDは401を返す', () => {
      const result = AuthErrorHandler.getHttpStatusCode(AuthErrorType.TOKEN_EXPIRED);
      expect(result).toBe(401);
    });

    it('SIGNATURE_INVALIDは401を返す', () => {
      const result = AuthErrorHandler.getHttpStatusCode(AuthErrorType.SIGNATURE_INVALID);
      expect(result).toBe(401);
    });

    it('CLAIMS_INVALIDは401を返す', () => {
      const result = AuthErrorHandler.getHttpStatusCode(AuthErrorType.CLAIMS_INVALID);
      expect(result).toBe(401);
    });

    it('INTERNAL_ERRORは500を返す（要件3.3）', () => {
      const result = AuthErrorHandler.getHttpStatusCode(AuthErrorType.INTERNAL_ERROR);
      expect(result).toBe(500);
    });
  });

  describe('createErrorResponse', () => {
    it('統一されたエラーレスポンス形式を作成する（要件3.1）', () => {
      const errorType = AuthErrorType.TOKEN_INVALID;
      const message = 'Test error message';
      const statusCode = 400;

      const result = AuthErrorHandler.createErrorResponse(errorType, message, statusCode);

      expect(result).toEqual({
        error: errorType,
        message,
        statusCode,
        timestamp: expect.any(String),
      });

      // タイムスタンプがISO形式であることを確認
      expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
    });
  });

  describe('getSafeErrorMessage', () => {
    beforeEach(() => {
      // 各テストでNODE_ENVをリセット
      (config as any).NODE_ENV = 'test';
    });

    it('本番環境では安全なメッセージを返す', () => {
      (config as any).NODE_ENV = 'production';

      const result = AuthErrorHandler.getSafeErrorMessage(
        AuthErrorType.TOKEN_INVALID,
        'Detailed error message'
      );

      expect(result).toBe('Invalid token format');
    });

    it('開発環境では詳細なメッセージを返す', () => {
      (config as any).NODE_ENV = 'development';

      const originalMessage = 'Detailed error message';
      const result = AuthErrorHandler.getSafeErrorMessage(
        AuthErrorType.TOKEN_INVALID,
        originalMessage
      );

      expect(result).toBe(originalMessage);
    });

    it('各エラータイプに対して適切な安全メッセージを返す', () => {
      (config as any).NODE_ENV = 'production';

      const testCases = [
        { type: AuthErrorType.TOKEN_MISSING, expected: 'Authentication required' },
        { type: AuthErrorType.TOKEN_INVALID, expected: 'Invalid token format' },
        { type: AuthErrorType.TOKEN_EXPIRED, expected: 'Token has expired' },
        { type: AuthErrorType.SIGNATURE_INVALID, expected: 'Invalid token signature' },
        { type: AuthErrorType.CLAIMS_INVALID, expected: 'Invalid token claims' },
        {
          type: AuthErrorType.INTERNAL_ERROR,
          expected: 'Authentication service temporarily unavailable',
        },
      ];

      testCases.forEach(({ type, expected }) => {
        const result = AuthErrorHandler.getSafeErrorMessage(type, 'Original message');
        expect(result).toBe(expected);
      });
    });
  });

  describe('handleAuthError', () => {
    it('HTTPExceptionを投げる', () => {
      const error = new Error('Test error');

      expect(() => {
        AuthErrorHandler.handleAuthError(error, mockContext);
      }).toThrow(HTTPException);
    });

    it('適切なステータスコードでHTTPExceptionを投げる', () => {
      const error = new Error('Invalid token format') as Error & { type: AuthErrorType };
      error.type = AuthErrorType.TOKEN_INVALID;

      try {
        AuthErrorHandler.handleAuthError(error, mockContext);
      } catch (httpError) {
        expect(httpError).toBeInstanceOf(HTTPException);
        expect((httpError as HTTPException).status).toBe(400);
      }
    });

    it('セキュリティログを記録する（要件3.4）', () => {
      const error = new Error('Test error');

      try {
        AuthErrorHandler.handleAuthError(error, mockContext);
      } catch {
        // HTTPExceptionが投げられることを期待
      }

      expect(logger.info).toHaveBeenCalledWith(
        'Security audit log',
        expect.objectContaining({
          event: 'AUTH_FAILURE',
          requestId: mockContext.requestId,
          ipAddress: mockContext.ipAddress,
          userAgent: mockContext.userAgent,
        })
      );
    });

    it('エラーログを記録する（要件3.4）', () => {
      const error = new Error('Test error');

      try {
        AuthErrorHandler.handleAuthError(error, mockContext);
      } catch {
        // HTTPExceptionが投げられることを期待
      }

      expect(logger.info).toHaveBeenCalledWith(
        'Authentication info',
        expect.objectContaining({
          errorType: AuthErrorType.TOKEN_INVALID,
          message: 'Test error',
          requestId: mockContext.requestId,
        })
      );
    });
  });

  describe('logAuthSuccess', () => {
    it('認証成功ログを記録する', () => {
      const successContext = {
        ...mockContext,
        userId: 'test-user-id',
      };

      AuthErrorHandler.logAuthSuccess(successContext);

      expect(logger.info).toHaveBeenCalledWith(
        'Security audit log',
        expect.objectContaining({
          event: 'AUTH_SUCCESS',
          userId: 'test-user-id',
          requestId: mockContext.requestId,
          ipAddress: mockContext.ipAddress,
          userAgent: mockContext.userAgent,
        })
      );
    });

    it('セキュリティ監査が無効な場合はログを記録しない', () => {
      (config as any).ENABLE_SECURITY_AUDIT = false;

      const successContext = {
        ...mockContext,
        userId: 'test-user-id',
      };

      AuthErrorHandler.logAuthSuccess(successContext);

      expect(logger.info).not.toHaveBeenCalled();
    });
  });

  describe('logSecurityEvent', () => {
    it('重要なセキュリティイベントの場合は警告ログも記録する', () => {
      // セキュリティ監査を有効にする
      (config as any).ENABLE_SECURITY_AUDIT = true;

      AuthErrorHandler.logSecurityEvent(
        AuthErrorType.SIGNATURE_INVALID,
        'Invalid signature',
        mockContext
      );

      expect(logger.warn).toHaveBeenCalledWith(
        'Critical security event detected',
        expect.objectContaining({
          errorType: AuthErrorType.SIGNATURE_INVALID,
          ipAddress: mockContext.ipAddress,
          requestId: mockContext.requestId,
        })
      );
    });

    it('通常のセキュリティイベントの場合は警告ログを記録しない', () => {
      // セキュリティ監査を有効にする
      (config as any).ENABLE_SECURITY_AUDIT = true;

      AuthErrorHandler.logSecurityEvent(AuthErrorType.TOKEN_MISSING, 'Token missing', mockContext);

      expect(logger.warn).not.toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith('Security audit log', expect.any(Object));
    });
  });
});
