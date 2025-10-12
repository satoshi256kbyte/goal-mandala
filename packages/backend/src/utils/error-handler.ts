/**
 * エラーハンドリングユーティリティ
 *
 * Bedrock API呼び出し時のエラーを分類し、適切に処理します。
 * 要件5: エラーハンドリング
 */

import { BedrockError } from '../types/bedrock.types.js';

/**
 * エラータイプの列挙
 */
export enum ErrorType {
  /** スロットリングエラー（リトライ可能） */
  THROTTLING = 'THROTTLING',
  /** サービス利用不可エラー（リトライ可能） */
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  /** 内部サーバーエラー（リトライ可能） */
  INTERNAL_SERVER = 'INTERNAL_SERVER',
  /** タイムアウトエラー（リトライ可能） */
  TIMEOUT = 'TIMEOUT',
  /** 検証エラー（リトライ不可） */
  VALIDATION = 'VALIDATION',
  /** 認証エラー（リトライ不可） */
  ACCESS_DENIED = 'ACCESS_DENIED',
  /** 解析エラー（リトライ不可） */
  PARSE = 'PARSE',
  /** 未知のエラー（リトライ可能） */
  UNKNOWN = 'UNKNOWN',
}

/**
 * エラーレスポンスインターフェース
 */
export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    retryable: boolean;
    details?: Record<string, unknown>;
  };
}

/**
 * リトライ可能なエラー名のリスト
 */
const RETRYABLE_ERROR_NAMES = [
  'ThrottlingException',
  'ServiceUnavailableException',
  'InternalServerException',
  'TimeoutError',
  'UnknownError',
];

/**
 * エラー名からエラータイプへのマッピング
 */
const ERROR_TYPE_MAP: Record<string, ErrorType> = {
  ThrottlingException: ErrorType.THROTTLING,
  ServiceUnavailableException: ErrorType.SERVICE_UNAVAILABLE,
  InternalServerException: ErrorType.INTERNAL_SERVER,
  TimeoutError: ErrorType.TIMEOUT,
  ValidationException: ErrorType.VALIDATION,
  AccessDeniedException: ErrorType.ACCESS_DENIED,
  ParseError: ErrorType.PARSE,
};

/**
 * エラータイプに対応するユーザーフレンドリーなメッセージ
 */
const USER_FRIENDLY_MESSAGES: Record<ErrorType, string> = {
  [ErrorType.THROTTLING]: 'リクエストが多すぎます。しばらく待ってから再度お試しください。',
  [ErrorType.SERVICE_UNAVAILABLE]:
    'サービスが一時的に利用できません。しばらく待ってから再度お試しください。',
  [ErrorType.INTERNAL_SERVER]:
    'サーバーで問題が発生しました。しばらく待ってから再度お試しください。',
  [ErrorType.TIMEOUT]: '処理がタイムアウトしました。しばらく待ってから再度お試しください。',
  [ErrorType.VALIDATION]: '入力内容が正しくありません。入力内容を確認してください。',
  [ErrorType.ACCESS_DENIED]: 'アクセスが拒否されました。権限を確認してください。',
  [ErrorType.PARSE]: 'レスポンスの解析に失敗しました。しばらく待ってから再度お試しください。',
  [ErrorType.UNKNOWN]: '予期しないエラーが発生しました。しばらく待ってから再度お試しください。',
};

/**
 * エラーを分類する
 *
 * @param error - 分類するエラー
 * @returns 分類されたBedrockError
 */
export function classifyError(error: Error): BedrockError {
  const errorName = error.name || 'UnknownError';
  const errorType = ERROR_TYPE_MAP[errorName] || ErrorType.UNKNOWN;
  const retryable = RETRYABLE_ERROR_NAMES.includes(errorName);

  // Error型を継承したBedrockErrorオブジェクトを作成
  const bedrockError = Object.create(Error.prototype) as BedrockError;
  bedrockError.name = errorName;
  bedrockError.message = error.message || USER_FRIENDLY_MESSAGES[errorType as ErrorType];
  bedrockError.retryable = retryable;
  bedrockError.code = errorName;
  bedrockError.type = errorType;
  bedrockError.originalError = error;
  bedrockError.stack = error.stack;

  return bedrockError;
}

/**
 * エラーがリトライ可能かどうかを判定する（BedrockError用）
 *
 * @param error - 判定するエラー
 * @returns リトライ可能な場合はtrue
 */
export function isRetryableBedrockError(error: BedrockError): boolean {
  return error.retryable;
}

/**
 * エラーレスポンスを生成する
 *
 * @param error - BedrockError
 * @returns エラーレスポンス
 */
export function createErrorResponse(error: BedrockError): ErrorResponse {
  // 機密情報をマスキング
  const sanitizedMessage = sanitizeErrorMessage(error.message);
  const errorType = error.type || ErrorType.UNKNOWN;

  return {
    success: false,
    error: {
      code: errorType,
      message: USER_FRIENDLY_MESSAGES[errorType as ErrorType] || sanitizedMessage,
      retryable: error.retryable,
      // 詳細情報は本番環境では含めない
    },
  };
}

/**
 * エラーメッセージから機密情報をマスキングする
 *
 * @param message - エラーメッセージ
 * @returns マスキングされたメッセージ
 */
function sanitizeErrorMessage(message: string): string {
  if (!message || typeof message !== 'string') {
    return '';
  }

  // APIキーのパターンをマスキング
  let sanitized = message.replace(/sk-[a-zA-Z0-9]+/g, 'sk-***');

  // トークンのパターンをマスキング
  sanitized = sanitized.replace(/Bearer\s+[a-zA-Z0-9._-]+/gi, 'Bearer ***');

  // JWTトークンのパターンをマスキング
  sanitized = sanitized.replace(/eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g, 'jwt.***');

  // パスワードのパターンをマスキング
  sanitized = sanitized.replace(/password[:\s=]+[^\s,}]+/gi, 'password: ***');

  // メールアドレスの部分マスキング
  sanitized = sanitized.replace(/([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, '***@$2');

  // AWS Access Keyのマスキング
  sanitized = sanitized.replace(/AKIA[0-9A-Z]{16}/g, 'AKIA***');

  // データベース接続文字列のマスキング
  sanitized = sanitized.replace(
    /(postgresql|mysql|mongodb):\/\/([^:]+):([^@]+)@/gi,
    '$1://$2:***@'
  );

  // URLパラメータのトークンをマスキング
  sanitized = sanitized.replace(/([?&])(token|key|secret)=([^&\s]+)/gi, '$1$2=***');

  return sanitized;
}

/**
 * 一般的なエラーハンドリング関数
 */
export function handleError(error: unknown): {
  success: false;
  error: { message: string; code: string };
} {
  if (!error) {
    return {
      success: false,
      error: {
        message: 'Unknown error occurred',
        code: 'UNKNOWN_ERROR',
      },
    };
  }

  if (typeof error === 'string') {
    return {
      success: false,
      error: {
        message: error,
        code: 'UNKNOWN_ERROR',
      },
    };
  }

  if (error instanceof Error) {
    return {
      success: false,
      error: {
        message: error.message,
        code: getErrorCode(error),
      },
    };
  }

  if (typeof error === 'object' && error !== null && 'message' in error) {
    return {
      success: false,
      error: {
        message: String((error as Error).message || 'Unknown error'),
        code: 'UNKNOWN_ERROR',
      },
    };
  }

  return {
    success: false,
    error: {
      message: 'Unknown error occurred',
      code: 'UNKNOWN_ERROR',
    },
  };
}

/**
 * エラーログ出力関数
 */
export function logError(error: Error, context?: Record<string, unknown>): void {
  console.error('Error occurred:', {
    message: error.message,
    name: error.name,
    stack: error.stack,
    context,
  });
}

/**
 * エラーコード取得関数
 */
export function getErrorCode(error: Error): string {
  const errorName = error.name || 'Error';

  switch (errorName) {
    case 'ValidationError':
      return 'VALIDATION_ERROR';
    case 'NotFoundError':
      return 'NOT_FOUND_ERROR';
    case 'AuthenticationError':
      return 'AUTHENTICATION_ERROR';
    case 'ForbiddenError':
      return 'FORBIDDEN_ERROR';
    case 'DatabaseError':
      return 'DATABASE_ERROR';
    default:
      return 'UNKNOWN_ERROR';
  }
}

/**
 * エラー情報サニタイズ関数
 */
export function sanitizeError(error: Error): { message: string; name: string; stack?: string } {
  return {
    message: sanitizeErrorMessage(error.message),
    name: error.name,
    stack: error.stack,
  };
}

/**
 * ユーザー向けエラーフォーマット関数
 */
export function formatErrorForUser(error: Error): string {
  const message = error.message.toLowerCase();

  if (message.includes('database') || message.includes('connection')) {
    return 'システムエラーが発生しました。しばらく時間をおいてから再度お試しください。';
  }

  if (message.includes('validation') || message.includes('invalid')) {
    return '入力内容に問題があります。内容を確認してください。';
  }

  if (message.includes('not found')) {
    return '指定されたリソースが見つかりません。';
  }

  if (message.includes('unauthorized') || message.includes('authentication')) {
    return '認証が必要です。ログインしてください。';
  }

  if (message.includes('forbidden') || message.includes('permission')) {
    return 'この操作を実行する権限がありません。';
  }

  return 'システムエラーが発生しました。';
}

/**
 * リトライ可能エラー判定関数（オーバーロード）
 */
export function isRetryableError(error: Error): boolean {
  const retryableErrors = [
    'ThrottlingException',
    'ServiceUnavailableException',
    'InternalServerError',
    'TimeoutError',
    'NetworkError',
    'DatabaseConnectionError',
  ];

  return retryableErrors.includes(error.name);
}

/**
 * エラーの詳細情報から機密情報を除外する
 *
 * @param details - エラーの詳細情報
 * @returns 機密情報が除外された詳細情報
 */
function sanitizeErrorDetails(
  details?: Record<string, unknown>
): Record<string, unknown> | undefined {
  if (!details) {
    return undefined;
  }

  const sanitized: Record<string, unknown> = {};
  const sensitiveKeys = [
    'password',
    'token',
    'secret',
    'apiKey',
    'accessKey',
    'secretKey',
    'authorization',
    'credentials',
  ];

  for (const [key, value] of Object.entries(details)) {
    // 機密情報を含む可能性のあるキー名
    if (sensitiveKeys.some(k => key.toLowerCase().includes(k.toLowerCase()))) {
      sanitized[key] = '***';
    } else if (typeof value === 'string') {
      sanitized[key] = sanitizeErrorMessage(value);
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeErrorDetails(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * ErrorHandlerクラス
 *
 * エラーの分類、ログ記録、レスポンス生成を行います。
 */
export class ErrorHandler {
  /**
   * エラーを処理する
   *
   * @param error - 処理するエラー
   * @returns 分類されたBedrockError
   */
  handleError(error: unknown): BedrockError {
    // エラーオブジェクトでない場合の処理
    if (!error || typeof error !== 'object') {
      const unknownError = new Error('Unknown error occurred');
      unknownError.name = 'UnknownError';
      return this.processError(unknownError);
    }

    // Errorオブジェクトの場合
    if (error instanceof Error) {
      return this.processError(error);
    }

    // その他のオブジェクトの場合
    const genericError = new Error(String(error));
    genericError.name = 'UnknownError';
    return this.processError(genericError);
  }

  /**
   * エラーを処理して分類する
   *
   * @param error - Errorオブジェクト
   * @returns 分類されたBedrockError
   */
  private processError(error: Error): BedrockError {
    const classified = classifyError(error);

    // エラーをログに記録
    this.logError(classified);

    return classified;
  }

  /**
   * エラーをログに記録する
   *
   * @param error - BedrockError
   */
  private logError(error: BedrockError): void {
    // メッセージとスタックトレースから機密情報を除外
    const sanitizedMessage = sanitizeErrorMessage(error.message);
    const sanitizedStack = error.originalError?.stack
      ? sanitizeErrorMessage(error.originalError.stack)
      : undefined;
    const sanitizedDetails = error.details ? sanitizeErrorDetails(error.details) : undefined;

    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      errorType: error.type,
      message: sanitizedMessage,
      retryable: error.retryable,
      stack: sanitizedStack,
      ...(sanitizedDetails && { details: sanitizedDetails }),
    };

    // 構造化ログとして出力
    console.error(JSON.stringify(logEntry));
  }

  /**
   * エラーがリトライ可能かどうかを判定する
   *
   * @param error - 判定するエラー
   * @returns リトライ可能な場合はtrue
   */
  isRetryable(error: Error): boolean {
    const classified = classifyError(error);
    return isRetryableBedrockError(classified);
  }

  /**
   * エラーレスポンスを生成する
   *
   * @param error - BedrockError
   * @returns エラーレスポンス
   */
  createResponse(error: BedrockError): ErrorResponse {
    const response = createErrorResponse(error);

    // 詳細情報から機密情報を除外
    if (response.error.details) {
      response.error.details = sanitizeErrorDetails(response.error.details);
    }

    return response;
  }
}
