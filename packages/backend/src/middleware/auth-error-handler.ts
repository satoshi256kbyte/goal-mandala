/**
 * JWT認証エラーハンドリングクラス
 *
 * 要件3.1, 3.2, 3.3, 3.4に対応：
 * - 認証エラー分類・処理機能
 * - 統一されたエラーレスポンス形式
 * - セキュリティログ記録機能
 * - 適切なHTTPステータスコード返却
 */

import { HTTPException } from 'hono/http-exception';
import { logger, toLogContext } from '../utils/logger';
import { config } from '../config/environment';
import { AuthErrorType, AuthErrorResponse, AuthErrorLog, SecurityAuditLog } from './types';

export interface AuthErrorContext {
  requestId: string;
  ipAddress: string;
  userAgent: string;
  userId?: string;
  endpoint?: string;
  method?: string;
}

export class AuthErrorHandler {
  /**
   * 認証エラーを処理してHTTPExceptionを投げる
   * 要件3.1: 適切なHTTPステータスコードとエラーメッセージを返す
   */
  static handleAuthError(error: unknown, context: AuthErrorContext): never {
    const errorType = this.classifyError(error);
    const errorMessage = this.extractErrorMessage(error);
    const statusCode = this.getHttpStatusCode(errorType);

    // セキュリティログ記録（要件3.4）
    this.logSecurityEvent(errorType, errorMessage, context);

    // エラーログ記録（要件3.4）
    this.logAuthError(errorType, errorMessage, context);

    // 統一されたエラーレスポンス作成（要件3.1）
    const response = this.createErrorResponse(errorType, errorMessage, statusCode);

    // セキュリティ上安全なメッセージに変換
    const safeMessage = this.getSafeErrorMessage(errorType, errorMessage);

    throw new HTTPException(statusCode as 400 | 401 | 500, {
      message: safeMessage,
      cause: response,
    });
  }

  /**
   * エラーを分類してAuthErrorTypeを返す
   * 要件3.1: JWT検証でエラーが発生した場合の適切な分類
   */
  static classifyError(error: unknown): AuthErrorType {
    // 既に型付けされたエラーの場合
    if (error && typeof error === 'object' && 'type' in error) {
      const typedError = error as { type: AuthErrorType };
      if (Object.values(AuthErrorType).includes(typedError.type)) {
        return typedError.type;
      }
    }

    if (error instanceof Error) {
      const message = error.message.toLowerCase();

      // トークン関連エラーの詳細分類
      if (message.includes('authorization header') || message.includes('bearer token')) {
        return AuthErrorType.TOKEN_MISSING;
      }

      if (message.includes('expired') || message.includes('exp')) {
        return AuthErrorType.TOKEN_EXPIRED;
      }

      if (message.includes('signature') || message.includes('invalid signature')) {
        return AuthErrorType.SIGNATURE_INVALID;
      }

      if (
        message.includes('claims') ||
        message.includes('invalid') ||
        message.includes('audience') ||
        message.includes('issuer') ||
        message.includes('token_use')
      ) {
        return AuthErrorType.CLAIMS_INVALID;
      }

      if (
        message.includes('format') ||
        message.includes('decode') ||
        message.includes('parse') ||
        message.includes('malformed')
      ) {
        return AuthErrorType.TOKEN_INVALID;
      }

      // Cognito公開鍵取得エラー（要件3.3）
      if (
        message.includes('public key') ||
        message.includes('jwks') ||
        message.includes('network') ||
        message.includes('fetch')
      ) {
        return AuthErrorType.INTERNAL_ERROR;
      }
    }

    // その他のエラーはTOKEN_INVALIDとして扱う
    return AuthErrorType.TOKEN_INVALID;
  }

  /**
   * エラーメッセージを抽出
   */
  static extractErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    if (typeof error === 'string') {
      return error;
    }

    if (error && typeof error === 'object' && 'message' in error) {
      return String((error as { message: unknown }).message);
    }

    return 'Unknown authentication error';
  }

  /**
   * エラータイプからHTTPステータスコードを取得
   * 要件3.2: トークンの形式が不正な場合は400 Bad Request
   * 要件3.3: Cognito公開鍵の取得に失敗した場合は500 Internal Server Error
   */
  static getHttpStatusCode(errorType: AuthErrorType): number {
    switch (errorType) {
      case AuthErrorType.TOKEN_MISSING:
        return 401; // Unauthorized
      case AuthErrorType.TOKEN_INVALID:
        return 400; // Bad Request（要件3.2）
      case AuthErrorType.TOKEN_EXPIRED:
        return 401; // Unauthorized
      case AuthErrorType.SIGNATURE_INVALID:
        return 401; // Unauthorized
      case AuthErrorType.CLAIMS_INVALID:
        return 401; // Unauthorized
      case AuthErrorType.INTERNAL_ERROR:
        return 500; // Internal Server Error（要件3.3）
      default:
        return 401; // Unauthorized（デフォルト）
    }
  }

  /**
   * 統一されたエラーレスポンスを作成
   * 要件3.1: 統一されたエラーレスポンス形式
   */
  static createErrorResponse(
    errorType: AuthErrorType,
    message: string,
    statusCode: number
  ): AuthErrorResponse {
    return {
      error: errorType,
      message,
      statusCode,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * セキュリティ上安全なエラーメッセージを取得
   * 要件3.4: セキュリティ上重要でない範囲でエラー詳細を提供
   */
  static getSafeErrorMessage(errorType: AuthErrorType, originalMessage: string): string {
    // 本番環境では詳細なエラー情報を隠す
    if (config.NODE_ENV === 'production') {
      switch (errorType) {
        case AuthErrorType.TOKEN_MISSING:
          return 'Authentication required';
        case AuthErrorType.TOKEN_INVALID:
          return 'Invalid token format';
        case AuthErrorType.TOKEN_EXPIRED:
          return 'Token has expired';
        case AuthErrorType.SIGNATURE_INVALID:
          return 'Invalid token signature';
        case AuthErrorType.CLAIMS_INVALID:
          return 'Invalid token claims';
        case AuthErrorType.INTERNAL_ERROR:
          return 'Authentication service temporarily unavailable';
        default:
          return 'Authentication failed';
      }
    }

    // 開発環境では詳細なエラー情報を提供
    return originalMessage;
  }

  /**
   * セキュリティイベントをログに記録
   * 要件3.4: セキュリティ上重要でない範囲でエラー詳細をログに記録
   */
  static logSecurityEvent(
    errorType: AuthErrorType,
    errorMessage: string,
    context: AuthErrorContext
  ): void {
    if (!config.ENABLE_SECURITY_AUDIT) {
      return;
    }

    const auditLog: SecurityAuditLog = {
      timestamp: new Date().toISOString(),
      event: 'AUTH_FAILURE',
      userId: context.userId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      requestId: context.requestId,
      details: {
        errorType,
        endpoint: context.endpoint,
        method: context.method,
        // セキュリティ上重要でない範囲でエラー詳細を記録
        errorCategory: this.getErrorCategory(errorType),
        hasToken: errorType !== AuthErrorType.TOKEN_MISSING,
      },
    };

    logger.info('Security audit log', toLogContext(auditLog));

    // 重要なセキュリティイベントの場合は警告レベルでログ
    if (this.isCriticalSecurityEvent(errorType)) {
      logger.warn('Critical security event detected', {
        errorType,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        requestId: context.requestId,
      });
    }
  }

  /**
   * 認証エラーログを記録
   * 要件3.4: エラー詳細をログに記録
   */
  static logAuthError(
    errorType: AuthErrorType,
    errorMessage: string,
    context: AuthErrorContext
  ): void {
    const errorLog: AuthErrorLog = {
      timestamp: new Date().toISOString(),
      level: this.getLogLevel(errorType),
      errorType,
      message: errorMessage,
      userId: context.userId,
      requestId: context.requestId,
      userAgent: context.userAgent,
      ipAddress: context.ipAddress,
    };

    // ログレベルに応じてログ出力
    switch (errorLog.level) {
      case 'ERROR':
        logger.error('Authentication error', toLogContext(errorLog));
        break;
      case 'WARN':
        logger.warn('Authentication warning', toLogContext(errorLog));
        break;
      case 'INFO':
        logger.info('Authentication info', toLogContext(errorLog));
        break;
    }
  }

  /**
   * エラーカテゴリを取得（セキュリティログ用）
   */
  private static getErrorCategory(errorType: AuthErrorType): string {
    switch (errorType) {
      case AuthErrorType.TOKEN_MISSING:
        return 'missing_credentials';
      case AuthErrorType.TOKEN_INVALID:
        return 'malformed_token';
      case AuthErrorType.TOKEN_EXPIRED:
        return 'expired_credentials';
      case AuthErrorType.SIGNATURE_INVALID:
        return 'invalid_signature';
      case AuthErrorType.CLAIMS_INVALID:
        return 'invalid_claims';
      case AuthErrorType.INTERNAL_ERROR:
        return 'service_error';
      default:
        return 'unknown_error';
    }
  }

  /**
   * 重要なセキュリティイベントかどうかを判定
   */
  private static isCriticalSecurityEvent(errorType: AuthErrorType): boolean {
    return [AuthErrorType.SIGNATURE_INVALID, AuthErrorType.CLAIMS_INVALID].includes(errorType);
  }

  /**
   * エラータイプに応じたログレベルを取得
   */
  private static getLogLevel(errorType: AuthErrorType): 'ERROR' | 'WARN' | 'INFO' {
    switch (errorType) {
      case AuthErrorType.INTERNAL_ERROR:
        return 'ERROR';
      case AuthErrorType.SIGNATURE_INVALID:
      case AuthErrorType.CLAIMS_INVALID:
        return 'WARN';
      case AuthErrorType.TOKEN_MISSING:
      case AuthErrorType.TOKEN_INVALID:
      case AuthErrorType.TOKEN_EXPIRED:
      default:
        return 'INFO';
    }
  }

  /**
   * 認証成功イベントをログに記録
   */
  static logAuthSuccess(context: AuthErrorContext & { userId: string }): void {
    if (!config.ENABLE_SECURITY_AUDIT) {
      return;
    }

    const auditLog: SecurityAuditLog = {
      timestamp: new Date().toISOString(),
      event: 'AUTH_SUCCESS',
      userId: context.userId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      requestId: context.requestId,
      details: {
        endpoint: context.endpoint,
        method: context.method,
      },
    };

    logger.info('Security audit log', toLogContext(auditLog));
  }
}
