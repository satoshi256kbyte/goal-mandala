/**
 * Step Functions ワークフロー用の構造化ロガー
 * Requirements: 7.1, 7.2, 7.3, 7.4
 */

import { logger, toLogContext, LogContext } from '../../utils/logger';

/**
 * ワークフローログのコンテキスト
 */
export interface WorkflowLogContext extends LogContext {
  executionArn: string;
  goalId: string;
  userId: string;
  event: string;
  details?: unknown;
  duration?: number;
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };
}

/**
 * ワークフロー開始ログ
 * Requirement 7.1: WHEN a workflow starts THEN the system SHALL log the start event with execution ARN and input parameters
 */
export function logWorkflowStarted(context: {
  executionArn: string;
  goalId: string;
  userId: string;
  input: unknown;
}): void {
  logger.info(
    'Workflow started',
    toLogContext({
      timestamp: new Date().toISOString(),
      executionArn: context.executionArn,
      goalId: context.goalId,
      userId: context.userId,
      event: 'workflow_started',
      details: {
        input: context.input,
      },
    })
  );
}

/**
 * ワークフロー状態遷移ログ
 * Requirement 7.2: WHEN a workflow transitions between states THEN the system SHALL log the state transition with timestamp
 */
export function logStateTransition(context: {
  executionArn: string;
  goalId: string;
  userId: string;
  fromState: string;
  toState: string;
  input?: unknown;
  output?: unknown;
}): void {
  logger.info(
    'State transition',
    toLogContext({
      timestamp: new Date().toISOString(),
      executionArn: context.executionArn,
      goalId: context.goalId,
      userId: context.userId,
      event: 'state_transition',
      details: {
        fromState: context.fromState,
        toState: context.toState,
        input: context.input,
        output: context.output,
      },
    })
  );
}

/**
 * ワークフロー完了ログ
 * Requirement 7.3: WHEN a workflow completes THEN the system SHALL log the completion event with execution time and result summary
 */
export function logWorkflowCompleted(context: {
  executionArn: string;
  goalId: string;
  userId: string;
  duration: number;
  result: {
    successCount: number;
    failedCount: number;
    totalActions: number;
  };
}): void {
  logger.info(
    'Workflow completed',
    toLogContext({
      timestamp: new Date().toISOString(),
      executionArn: context.executionArn,
      goalId: context.goalId,
      userId: context.userId,
      event: 'workflow_completed',
      duration: context.duration,
      details: {
        result: context.result,
      },
    })
  );
}

/**
 * ワークフロー失敗ログ
 * Requirement 7.4: WHEN a workflow fails THEN the system SHALL log the failure event with error details and stack trace
 */
export function logWorkflowFailed(context: {
  executionArn: string;
  goalId: string;
  userId: string;
  duration?: number;
  error: Error;
  failedActions?: string[];
}): void {
  logger.error(
    'Workflow failed',
    toLogContext({
      timestamp: new Date().toISOString(),
      executionArn: context.executionArn,
      goalId: context.goalId,
      userId: context.userId,
      event: 'workflow_failed',
      duration: context.duration,
      error: {
        message: context.error.message,
        stack: context.error.stack,
        code: (context.error as Error & { code?: string }).code,
      },
      details: {
        failedActions: context.failedActions,
      },
    })
  );
}

/**
 * バッチ処理開始ログ
 */
export function logBatchStarted(context: {
  executionArn: string;
  goalId: string;
  userId: string;
  batchNumber: number;
  totalBatches: number;
  actionCount: number;
}): void {
  logger.info(
    'Batch processing started',
    toLogContext({
      timestamp: new Date().toISOString(),
      executionArn: context.executionArn,
      goalId: context.goalId,
      userId: context.userId,
      event: 'batch_started',
      details: {
        batchNumber: context.batchNumber,
        totalBatches: context.totalBatches,
        actionCount: context.actionCount,
      },
    })
  );
}

/**
 * バッチ処理完了ログ
 */
export function logBatchCompleted(context: {
  executionArn: string;
  goalId: string;
  userId: string;
  batchNumber: number;
  duration: number;
  successCount: number;
  failedCount: number;
}): void {
  logger.info(
    'Batch processing completed',
    toLogContext({
      timestamp: new Date().toISOString(),
      executionArn: context.executionArn,
      goalId: context.goalId,
      userId: context.userId,
      event: 'batch_completed',
      duration: context.duration,
      details: {
        batchNumber: context.batchNumber,
        successCount: context.successCount,
        failedCount: context.failedCount,
      },
    })
  );
}

/**
 * アクション処理開始ログ
 */
export function logActionStarted(context: {
  executionArn: string;
  goalId: string;
  userId: string;
  actionId: string;
  actionTitle: string;
}): void {
  logger.info(
    'Action processing started',
    toLogContext({
      timestamp: new Date().toISOString(),
      executionArn: context.executionArn,
      goalId: context.goalId,
      userId: context.userId,
      event: 'action_started',
      details: {
        actionId: context.actionId,
        actionTitle: context.actionTitle,
      },
    })
  );
}

/**
 * アクション処理完了ログ
 */
export function logActionCompleted(context: {
  executionArn: string;
  goalId: string;
  userId: string;
  actionId: string;
  duration: number;
  taskCount: number;
}): void {
  logger.info(
    'Action processing completed',
    toLogContext({
      timestamp: new Date().toISOString(),
      executionArn: context.executionArn,
      goalId: context.goalId,
      userId: context.userId,
      event: 'action_completed',
      duration: context.duration,
      details: {
        actionId: context.actionId,
        taskCount: context.taskCount,
      },
    })
  );
}

/**
 * アクション処理失敗ログ
 */
export function logActionFailed(context: {
  executionArn: string;
  goalId: string;
  userId: string;
  actionId: string;
  duration?: number;
  error: Error;
  retryCount?: number;
}): void {
  logger.error(
    'Action processing failed',
    toLogContext({
      timestamp: new Date().toISOString(),
      executionArn: context.executionArn,
      goalId: context.goalId,
      userId: context.userId,
      event: 'action_failed',
      duration: context.duration,
      error: {
        message: context.error.message,
        stack: context.error.stack,
        code: (context.error as Error & { code?: string }).code,
      },
      details: {
        actionId: context.actionId,
        retryCount: context.retryCount,
      },
    })
  );
}

/**
 * タイムアウトログ
 * Requirement 4.5: WHEN a timeout occurs THEN the system SHALL log the timeout event with execution details
 */
export function logTimeout(context: {
  executionArn: string;
  goalId: string;
  userId: string;
  timeoutType: 'workflow' | 'batch' | 'action';
  duration: number;
  details?: unknown;
}): void {
  logger.warn(
    'Timeout occurred',
    toLogContext({
      timestamp: new Date().toISOString(),
      executionArn: context.executionArn,
      goalId: context.goalId,
      userId: context.userId,
      event: 'timeout',
      duration: context.duration,
      details: {
        timeoutType: context.timeoutType,
        ...context.details,
      },
    })
  );
}

/**
 * リトライログ
 */
export function logRetry(context: {
  executionArn: string;
  goalId: string;
  userId: string;
  actionId: string;
  retryCount: number;
  maxRetries: number;
  backoffSeconds: number;
  error: Error;
}): void {
  logger.warn(
    'Retry attempt',
    toLogContext({
      timestamp: new Date().toISOString(),
      executionArn: context.executionArn,
      goalId: context.goalId,
      userId: context.userId,
      event: 'retry',
      details: {
        actionId: context.actionId,
        retryCount: context.retryCount,
        maxRetries: context.maxRetries,
        backoffSeconds: context.backoffSeconds,
        error: {
          message: context.error.message,
          code: (context.error as Error & { code?: string }).code,
        },
      },
    })
  );
}

/**
 * 進捗更新ログ
 */
export function logProgressUpdate(context: {
  executionArn: string;
  goalId: string;
  userId: string;
  processedActions: number;
  totalActions: number;
  progressPercentage: number;
  estimatedTimeRemaining?: number;
}): void {
  logger.info(
    'Progress updated',
    toLogContext({
      timestamp: new Date().toISOString(),
      executionArn: context.executionArn,
      goalId: context.goalId,
      userId: context.userId,
      event: 'progress_update',
      details: {
        processedActions: context.processedActions,
        totalActions: context.totalActions,
        progressPercentage: context.progressPercentage,
        estimatedTimeRemaining: context.estimatedTimeRemaining,
      },
    })
  );
}

/**
 * ワークフローキャンセルログ
 * Requirement 9.5: WHEN an execution is aborted THEN the system SHALL log the cancellation event with user ID and reason
 */
export function logWorkflowCancelled(context: {
  executionArn: string;
  goalId: string;
  userId: string;
  reason: string;
  cancelledBy: string;
}): void {
  logger.info(
    'Workflow cancelled',
    toLogContext({
      timestamp: new Date().toISOString(),
      executionArn: context.executionArn,
      goalId: context.goalId,
      userId: context.userId,
      event: 'workflow_cancelled',
      details: {
        reason: context.reason,
        cancelledBy: context.cancelledBy,
      },
    })
  );
}

/**
 * 部分失敗ログ
 */
export function logPartialFailure(context: {
  executionArn: string;
  goalId: string;
  userId: string;
  successCount: number;
  failedCount: number;
  failedActions: string[];
}): void {
  logger.warn(
    'Partial failure occurred',
    toLogContext({
      timestamp: new Date().toISOString(),
      executionArn: context.executionArn,
      goalId: context.goalId,
      userId: context.userId,
      event: 'partial_failure',
      details: {
        successCount: context.successCount,
        failedCount: context.failedCount,
        failedActions: context.failedActions,
      },
    })
  );
}

/**
 * パフォーマンス警告ログ
 * Requirement 12.5: WHEN performance degrades THEN the system SHALL log a warning and suggest optimization opportunities
 */
export function logPerformanceWarning(context: {
  executionArn: string;
  goalId: string;
  userId: string;
  metric: string;
  value: number;
  threshold: number;
  suggestion?: string;
}): void {
  logger.warn(
    'Performance degradation detected',
    toLogContext({
      timestamp: new Date().toISOString(),
      executionArn: context.executionArn,
      goalId: context.goalId,
      userId: context.userId,
      event: 'performance_warning',
      details: {
        metric: context.metric,
        value: context.value,
        threshold: context.threshold,
        suggestion: context.suggestion,
      },
    })
  );
}

/**
 * ワークフロー実行時間測定用のタイマー
 */
export class WorkflowTimer {
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
   * 経過時間を秒単位で取得
   */
  getDurationInSeconds(): number {
    return Math.floor(this.getDuration() / 1000);
  }

  /**
   * 経過時間を分単位で取得
   */
  getDurationInMinutes(): number {
    return Math.floor(this.getDuration() / 60000);
  }
}
