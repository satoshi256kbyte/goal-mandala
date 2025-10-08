/**
 * サブ目標生成APIのカスタムエラークラス
 */

import { ValidationErrorDetail } from '../types/subgoal-generation.types';

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
 * 品質エラー
 */
export class QualityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'QualityError';
    Object.setPrototypeOf(this, QualityError.prototype);
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
 * Bedrockエラー
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

/**
 * Not Foundエラー
 */
export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/**
 * レート制限エラー
 */
export class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RateLimitError';
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}
