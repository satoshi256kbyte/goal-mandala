/**
 * 非同期処理状態管理用の構造化ロガー
 * 要件14.1, 14.2に対応
 */

import { logger, toLogContext } from './logger';

export interface AsyncProcessingLogContext {
  processId: string;
  userId: string;
  type: string;
  status?: string;
  duration?: number;
  error?: string;
  errorType?: string;
  progress?: number;
  retryCount?: number;
  [key: string]: unknown;
}

/**
 * 非同期処理開始ログ
 */
export function logProcessingStarted(context: AsyncProcessingLogContext): void {
  logger.info(
    '非同期処理開始',
    toLogContext({
      processId: context.processId,
      userId: context.userId,
      type: context.type,
      status: 'PENDING',
      timestamp: new Date().toISOString(),
    })
  );
}

/**
 * 非同期処理状態更新ログ
 */
export function logProcessingStatusUpdate(context: AsyncProcessingLogContext): void {
  logger.info(
    '非同期処理状態更新',
    toLogContext({
      processId: context.processId,
      userId: context.userId,
      type: context.type,
      status: context.status,
      progress: context.progress,
      timestamp: new Date().toISOString(),
    })
  );
}

/**
 * 非同期処理完了ログ
 */
export function logProcessingCompleted(context: AsyncProcessingLogContext): void {
  logger.info(
    '非同期処理完了',
    toLogContext({
      processId: context.processId,
      userId: context.userId,
      type: context.type,
      status: 'COMPLETED',
      duration: context.duration,
      timestamp: new Date().toISOString(),
    })
  );
}

/**
 * 非同期処理失敗ログ
 */
export function logProcessingFailed(context: AsyncProcessingLogContext): void {
  logger.error(
    '非同期処理失敗',
    toLogContext({
      processId: context.processId,
      userId: context.userId,
      type: context.type,
      status: 'FAILED',
      error: context.error,
      errorType: context.errorType,
      duration: context.duration,
      retryCount: context.retryCount,
      timestamp: new Date().toISOString(),
    })
  );
}

/**
 * 非同期処理タイムアウトログ
 */
export function logProcessingTimeout(context: AsyncProcessingLogContext): void {
  logger.warn(
    '非同期処理タイムアウト',
    toLogContext({
      processId: context.processId,
      userId: context.userId,
      type: context.type,
      status: 'TIMEOUT',
      duration: context.duration,
      timestamp: new Date().toISOString(),
    })
  );
}

/**
 * 非同期処理キャンセルログ
 */
export function logProcessingCancelled(context: AsyncProcessingLogContext): void {
  logger.info(
    '非同期処理キャンセル',
    toLogContext({
      processId: context.processId,
      userId: context.userId,
      type: context.type,
      status: 'CANCELLED',
      timestamp: new Date().toISOString(),
    })
  );
}

/**
 * 非同期処理リトライログ
 */
export function logProcessingRetry(context: AsyncProcessingLogContext): void {
  logger.info(
    '非同期処理リトライ',
    toLogContext({
      processId: context.processId,
      userId: context.userId,
      type: context.type,
      retryCount: context.retryCount,
      timestamp: new Date().toISOString(),
    })
  );
}

/**
 * Step Functions実行開始ログ
 */
export function logStepFunctionsStarted(context: {
  processId: string;
  executionArn: string;
  stateMachineArn: string;
}): void {
  logger.info(
    'Step Functions実行開始',
    toLogContext({
      processId: context.processId,
      executionArn: context.executionArn,
      stateMachineArn: context.stateMachineArn,
      timestamp: new Date().toISOString(),
    })
  );
}

/**
 * Step Functions実行停止ログ
 */
export function logStepFunctionsStopped(context: {
  processId: string;
  executionArn: string;
  reason: string;
}): void {
  logger.info(
    'Step Functions実行停止',
    toLogContext({
      processId: context.processId,
      executionArn: context.executionArn,
      reason: context.reason,
      timestamp: new Date().toISOString(),
    })
  );
}

/**
 * 処理時間測定用のタイマー
 */
export class ProcessingTimer {
  private startTime: number;

  constructor() {
    this.startTime = Date.now();
  }

  /**
   * 経過時間を取得（ミリ秒）
   */
  getDuration(): number {
    return Date.now() - this.startTime;
  }

  /**
   * 経過時間をログに記録
   */
  logDuration(processId: string, type: string): void {
    const duration = this.getDuration();
    logger.info(
      '処理時間記録',
      toLogContext({
        processId,
        type,
        duration,
        timestamp: new Date().toISOString(),
      })
    );
  }
}
