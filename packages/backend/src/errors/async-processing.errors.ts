/**
 * 非同期処理APIのカスタムエラークラス
 */

/**
 * 処理が見つからないエラー
 */
export class ProcessingNotFoundError extends Error {
  public readonly processId: string;

  constructor(processId: string) {
    super(`処理が見つかりません: ${processId}`);
    this.name = 'ProcessingNotFoundError';
    this.processId = processId;
    Object.setPrototypeOf(this, ProcessingNotFoundError.prototype);
  }
}

/**
 * 処理がキャンセルされたエラー
 */
export class ProcessingCancelledError extends Error {
  public readonly processId: string;

  constructor(processId: string) {
    super(`処理はキャンセルされました: ${processId}`);
    this.name = 'ProcessingCancelledError';
    this.processId = processId;
    Object.setPrototypeOf(this, ProcessingCancelledError.prototype);
  }
}

/**
 * 処理が既に完了しているエラー
 */
export class ProcessingAlreadyCompletedError extends Error {
  public readonly processId: string;

  constructor(processId: string) {
    super(`処理は既に完了しています: ${processId}`);
    this.name = 'ProcessingAlreadyCompletedError';
    this.processId = processId;
    Object.setPrototypeOf(this, ProcessingAlreadyCompletedError.prototype);
  }
}

/**
 * リトライ上限超過エラー
 */
export class RetryLimitExceededError extends Error {
  public readonly processId: string;
  public readonly retryCount: number;
  public readonly maxRetryCount: number;

  constructor(processId: string, retryCount: number, maxRetryCount: number) {
    super(`リトライ上限を超えました: ${processId} (${retryCount}/${maxRetryCount})`);
    this.name = 'RetryLimitExceededError';
    this.processId = processId;
    this.retryCount = retryCount;
    this.maxRetryCount = maxRetryCount;
    Object.setPrototypeOf(this, RetryLimitExceededError.prototype);
  }
}

/**
 * キャンセル不可エラー
 */
export class CannotCancelError extends Error {
  public readonly processId: string;
  public readonly currentStatus: string;

  constructor(processId: string, currentStatus: string) {
    super(`この状態の処理はキャンセルできません: ${processId} (status: ${currentStatus})`);
    this.name = 'CannotCancelError';
    this.processId = processId;
    this.currentStatus = currentStatus;
    Object.setPrototypeOf(this, CannotCancelError.prototype);
  }
}

/**
 * リトライ不可エラー
 */
export class CannotRetryError extends Error {
  public readonly processId: string;
  public readonly currentStatus: string;

  constructor(processId: string, currentStatus: string) {
    super(`この状態の処理はリトライできません: ${processId} (status: ${currentStatus})`);
    this.name = 'CannotRetryError';
    this.processId = processId;
    this.currentStatus = currentStatus;
    Object.setPrototypeOf(this, CannotRetryError.prototype);
  }
}

/**
 * タイムアウトエラー
 */
export class TimeoutError extends Error {
  public readonly processId: string;
  public readonly timeoutSeconds: number;

  constructor(processId: string, timeoutSeconds: number) {
    super(`処理がタイムアウトしました: ${processId} (${timeoutSeconds}秒)`);
    this.name = 'TimeoutError';
    this.processId = processId;
    this.timeoutSeconds = timeoutSeconds;
    Object.setPrototypeOf(this, TimeoutError.prototype);
  }
}

/**
 * Step Functionsエラー
 */
export class StepFunctionsError extends Error {
  public readonly processId: string;
  public readonly executionArn?: string;
  public readonly originalError?: Error;

  constructor(processId: string, message: string, executionArn?: string, originalError?: Error) {
    super(message);
    this.name = 'StepFunctionsError';
    this.processId = processId;
    this.executionArn = executionArn;
    this.originalError = originalError;
    Object.setPrototypeOf(this, StepFunctionsError.prototype);
  }
}

/**
 * バリデーションエラー
 */
export class ValidationError extends Error {
  public readonly details?: unknown;

  constructor(message: string, details?: unknown) {
    super(message);
    this.name = 'ValidationError';
    this.details = details;
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * データベースエラー
 */
export class DatabaseError extends Error {
  public readonly originalError?: Error;

  constructor(message: string, originalError?: Error) {
    super(message);
    this.name = 'DatabaseError';
    this.originalError = originalError;
    Object.setPrototypeOf(this, DatabaseError.prototype);
  }
}

/**
 * AI生成エラー
 */
export class AIGenerationError extends Error {
  public readonly retryable: boolean;
  public readonly originalError?: Error;

  constructor(message: string, retryable: boolean = true, originalError?: Error) {
    super(message);
    this.name = 'AIGenerationError';
    this.retryable = retryable;
    this.originalError = originalError;
    Object.setPrototypeOf(this, AIGenerationError.prototype);
  }
}

/**
 * 認証エラー
 */
export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

/**
 * 認可エラー
 */
export class ForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ForbiddenError';
    Object.setPrototypeOf(this, ForbiddenError.prototype);
  }
}
