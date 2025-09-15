/**
 * エラーハンドリングシステムの型定義
 */

export * from '../services/error-handler';

/**
 * エラー通知イベントの型定義
 */
export interface ErrorNotificationEvent {
  message: string;
  severity: string;
  category: string;
  timestamp?: Date;
  code?: string;
}

/**
 * エラーハンドリングコンテキストの型定義
 */
export interface ErrorHandlingContext {
  component?: string;
  action?: string;
  userId?: string;
  sessionId?: string;
  url?: string;
  userAgent?: string;
  timestamp?: Date;
}

/**
 * エラーレポートの型定義
 */
export interface ErrorReport {
  id: string;
  error: import('../services/error-handler').AuthError;
  context: ErrorHandlingContext;
  stackTrace?: string;
  breadcrumbs?: string[];
  metadata?: Record<string, unknown>;
}

/**
 * エラーメトリクスの型定義
 */
export interface ErrorMetrics {
  totalErrors: number;
  errorsByCategory: Record<string, number>;
  errorsBySeverity: Record<string, number>;
  retryAttempts: number;
  successfulRetries: number;
  failedRetries: number;
}
