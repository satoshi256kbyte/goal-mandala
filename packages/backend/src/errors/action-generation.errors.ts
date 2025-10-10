/**
 * アクション生成APIのカスタムエラークラス
 */

/**
 * バリデーションエラー詳細
 */
export interface ValidationErrorDetail {
  field: string;
  message: string;
}

/**
 * バリデーションエラー
 */
export class ValidationError extends Error {
  public readonly details?: ValidationErrorDetail[];

  constructor(message: string, details?: ValidationErrorDetail[]) {
    super(message);
    this.name = 'ValidationError';
    this.details = details;
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * 品質エラー（AI生成結果の品質が基準を満たさない）
 */
export class QualityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'QualityError';
    Object.setPrototypeOf(this, QualityError.prototype);
  }
}

/**
 * リソースが見つからないエラー
 */
export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/**
 * アクセス権限エラー
 */
export class ForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ForbiddenError';
    Object.setPrototypeOf(this, ForbiddenError.prototype);
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
 * Bedrockサービスエラー
 */
export class BedrockError extends Error {
  public readonly retryable: boolean;

  constructor(message: string, retryable: boolean = true) {
    super(message);
    this.name = 'BedrockError';
    this.retryable = retryable;
    Object.setPrototypeOf(this, BedrockError.prototype);
  }
}
