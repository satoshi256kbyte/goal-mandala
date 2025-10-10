/**
 * タスク生成API関連のエラークラス定義
 */

import { ErrorDetail } from '../types/task-generation.types';

/**
 * タスク生成エラーコード
 */
export enum TaskGenerationErrorCode {
  // 入力エラー
  INVALID_REQUEST = 'INVALID_REQUEST',
  ACTION_NOT_FOUND = 'ACTION_NOT_FOUND',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_ACTION_ID = 'INVALID_ACTION_ID',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',

  // 認証・認可エラー
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  ACTION_ACCESS_DENIED = 'ACTION_ACCESS_DENIED',

  // AI生成エラー
  AI_GENERATION_FAILED = 'AI_GENERATION_FAILED',
  AI_RESPONSE_INVALID = 'AI_RESPONSE_INVALID',
  AI_TIMEOUT = 'AI_TIMEOUT',
  AI_RATE_LIMIT_EXCEEDED = 'AI_RATE_LIMIT_EXCEEDED',
  AI_SERVICE_UNAVAILABLE = 'AI_SERVICE_UNAVAILABLE',

  // 品質検証エラー
  QUALITY_VALIDATION_FAILED = 'QUALITY_VALIDATION_FAILED',
  DUPLICATE_TASKS = 'DUPLICATE_TASKS',
  INVALID_TASK_FORMAT = 'INVALID_TASK_FORMAT',
  TASK_TITLE_TOO_LONG = 'TASK_TITLE_TOO_LONG',
  TASK_DESCRIPTION_TOO_LONG = 'TASK_DESCRIPTION_TOO_LONG',
  INVALID_PRIORITY = 'INVALID_PRIORITY',
  INVALID_ESTIMATED_TIME = 'INVALID_ESTIMATED_TIME',

  // データベースエラー
  DATABASE_ERROR = 'DATABASE_ERROR',
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',
  CONSTRAINT_VIOLATION = 'CONSTRAINT_VIOLATION',
  OPTIMISTIC_LOCK_ERROR = 'OPTIMISTIC_LOCK_ERROR',
  CONNECTION_ERROR = 'CONNECTION_ERROR',

  // ビジネスロジックエラー
  TOO_MANY_TASKS = 'TOO_MANY_TASKS',
  TOO_FEW_TASKS = 'TOO_FEW_TASKS',
  TASK_LIMIT_EXCEEDED = 'TASK_LIMIT_EXCEEDED',
  DAILY_GENERATION_LIMIT_EXCEEDED = 'DAILY_GENERATION_LIMIT_EXCEEDED',

  // システムエラー
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  TIMEOUT = 'TIMEOUT',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
}

/**
 * タスク生成エラーの基底クラス
 */
export class TaskGenerationError extends Error {
  public readonly code: TaskGenerationErrorCode;
  public readonly details?: ErrorDetail[];
  public readonly retryable: boolean;
  public readonly statusCode: number;

  constructor(
    code: TaskGenerationErrorCode,
    message: string,
    details?: ErrorDetail[],
    retryable: boolean = false,
    statusCode: number = 500
  ) {
    super(message);
    this.name = 'TaskGenerationError';
    this.code = code;
    this.details = details;
    this.retryable = retryable;
    this.statusCode = statusCode;

    // TypeScriptのエラー継承のための設定
    Object.setPrototypeOf(this, TaskGenerationError.prototype);
  }

  /**
   * エラーをJSON形式に変換
   */
  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details,
      retryable: this.retryable,
      statusCode: this.statusCode,
    };
  }
}

/**
 * 入力検証エラー
 */
export class TaskValidationError extends TaskGenerationError {
  constructor(message: string, details?: ErrorDetail[]) {
    super(TaskGenerationErrorCode.VALIDATION_ERROR, message, details, false, 400);
    this.name = 'TaskValidationError';
  }
}

/**
 * アクション未検出エラー
 */
export class ActionNotFoundError extends TaskGenerationError {
  constructor(actionId: string) {
    super(
      TaskGenerationErrorCode.ACTION_NOT_FOUND,
      `アクションが見つかりません: ${actionId}`,
      [{ field: 'actionId', message: `存在しないID: ${actionId}` }],
      false,
      404
    );
    this.name = 'ActionNotFoundError';
  }
}

/**
 * AI生成エラー
 */
export class AIGenerationError extends TaskGenerationError {
  constructor(message: string, details?: ErrorDetail[], retryable: boolean = true) {
    super(TaskGenerationErrorCode.AI_GENERATION_FAILED, message, details, retryable, 500);
    this.name = 'AIGenerationError';
  }
}

/**
 * AI応答無効エラー
 */
export class AIResponseInvalidError extends TaskGenerationError {
  constructor(message: string, details?: ErrorDetail[]) {
    super(TaskGenerationErrorCode.AI_RESPONSE_INVALID, message, details, true, 500);
    this.name = 'AIResponseInvalidError';
  }
}

/**
 * AIタイムアウトエラー
 */
export class AITimeoutError extends TaskGenerationError {
  constructor(timeoutSeconds: number) {
    super(
      TaskGenerationErrorCode.AI_TIMEOUT,
      `AI生成がタイムアウトしました（${timeoutSeconds}秒）`,
      undefined,
      true,
      504
    );
    this.name = 'AITimeoutError';
  }
}

/**
 * 品質検証エラー
 */
export class QualityValidationError extends TaskGenerationError {
  constructor(message: string, details?: ErrorDetail[]) {
    super(TaskGenerationErrorCode.QUALITY_VALIDATION_FAILED, message, details, false, 400);
    this.name = 'QualityValidationError';
    Object.setPrototypeOf(this, QualityValidationError.prototype);
  }
}

/**
 * タスク重複エラー
 */
export class DuplicateTasksError extends TaskGenerationError {
  constructor(duplicateCount: number) {
    super(
      TaskGenerationErrorCode.DUPLICATE_TASKS,
      `重複するタスクが検出されました（${duplicateCount}件）`,
      undefined,
      false,
      400
    );
    this.name = 'DuplicateTasksError';
  }
}

/**
 * データベースエラー
 */
export class DatabaseError extends TaskGenerationError {
  constructor(message: string, details?: ErrorDetail[], retryable: boolean = true) {
    super(TaskGenerationErrorCode.DATABASE_ERROR, message, details, retryable, 500);
    this.name = 'DatabaseError';
  }
}

/**
 * トランザクションエラー
 */
export class TransactionError extends TaskGenerationError {
  constructor(message: string, details?: ErrorDetail[]) {
    super(TaskGenerationErrorCode.TRANSACTION_FAILED, message, details, true, 500);
    this.name = 'TransactionError';
  }
}

/**
 * 楽観的ロックエラー
 */
export class OptimisticLockError extends TaskGenerationError {
  constructor(resourceId: string) {
    super(
      TaskGenerationErrorCode.OPTIMISTIC_LOCK_ERROR,
      `リソースが他のプロセスによって更新されました: ${resourceId}`,
      [{ field: 'resourceId', message: `競合: ${resourceId}` }],
      true,
      409
    );
    this.name = 'OptimisticLockError';
  }
}

/**
 * レート制限エラー
 */
export class RateLimitError extends TaskGenerationError {
  constructor(limit: number, period: string) {
    super(
      TaskGenerationErrorCode.RATE_LIMIT_EXCEEDED,
      `レート制限を超過しました（${limit}回/${period}）`,
      undefined,
      false,
      429
    );
    this.name = 'RateLimitError';
  }
}

/**
 * 日次生成制限エラー
 */
export class DailyGenerationLimitError extends TaskGenerationError {
  constructor(limit: number) {
    super(
      TaskGenerationErrorCode.DAILY_GENERATION_LIMIT_EXCEEDED,
      `1日の生成制限を超過しました（${limit}回）`,
      undefined,
      false,
      429
    );
    this.name = 'DailyGenerationLimitError';
  }
}

/**
 * 認証エラー
 */
export class UnauthorizedError extends TaskGenerationError {
  constructor(message: string = '認証が必要です') {
    super(TaskGenerationErrorCode.UNAUTHORIZED, message, undefined, false, 401);
    this.name = 'UnauthorizedError';
  }
}

/**
 * 認可エラー
 */
export class ForbiddenError extends TaskGenerationError {
  constructor(message: string = 'アクセスが拒否されました') {
    super(TaskGenerationErrorCode.FORBIDDEN, message, undefined, false, 403);
    this.name = 'ForbiddenError';
  }
}

/**
 * タイムアウトエラー
 */
export class TimeoutError extends TaskGenerationError {
  constructor(timeoutSeconds: number) {
    super(
      TaskGenerationErrorCode.TIMEOUT,
      `処理がタイムアウトしました（${timeoutSeconds}秒）`,
      undefined,
      true,
      504
    );
    this.name = 'TimeoutError';
  }
}

/**
 * エラーファクトリー関数
 */
export class TaskGenerationErrorFactory {
  /**
   * エラーコードからエラーインスタンスを生成
   */
  static createError(
    code: TaskGenerationErrorCode,
    message: string,
    details?: ErrorDetail[]
  ): TaskGenerationError {
    switch (code) {
      case TaskGenerationErrorCode.ACTION_NOT_FOUND:
        return new ActionNotFoundError('unknown');

      case TaskGenerationErrorCode.VALIDATION_ERROR:
        return new TaskValidationError(message, details);

      case TaskGenerationErrorCode.AI_GENERATION_FAILED:
        return new AIGenerationError(message, details);

      case TaskGenerationErrorCode.AI_RESPONSE_INVALID:
        return new AIResponseInvalidError(message, details);

      case TaskGenerationErrorCode.AI_TIMEOUT:
        return new AITimeoutError(30);

      case TaskGenerationErrorCode.QUALITY_VALIDATION_FAILED:
        return new QualityValidationError(message, details);

      case TaskGenerationErrorCode.DUPLICATE_TASKS:
        return new DuplicateTasksError(details?.length || 0);

      case TaskGenerationErrorCode.DATABASE_ERROR:
        return new DatabaseError(message, details);

      case TaskGenerationErrorCode.TRANSACTION_FAILED:
        return new TransactionError(message, details);

      case TaskGenerationErrorCode.OPTIMISTIC_LOCK_ERROR:
        return new OptimisticLockError('unknown');

      case TaskGenerationErrorCode.RATE_LIMIT_EXCEEDED:
        return new RateLimitError(10, '1日');

      case TaskGenerationErrorCode.DAILY_GENERATION_LIMIT_EXCEEDED:
        return new DailyGenerationLimitError(10);

      case TaskGenerationErrorCode.UNAUTHORIZED:
        return new UnauthorizedError(message);

      case TaskGenerationErrorCode.FORBIDDEN:
        return new ForbiddenError(message);

      case TaskGenerationErrorCode.TIMEOUT:
        return new TimeoutError(30);

      default:
        return new TaskGenerationError(code, message, details);
    }
  }

  /**
   * 標準エラーからTaskGenerationErrorに変換
   */
  static fromError(error: Error): TaskGenerationError {
    if (error instanceof TaskGenerationError) {
      return error;
    }

    return new TaskGenerationError(
      TaskGenerationErrorCode.INTERNAL_ERROR,
      error.message,
      undefined,
      false,
      500
    );
  }
}
