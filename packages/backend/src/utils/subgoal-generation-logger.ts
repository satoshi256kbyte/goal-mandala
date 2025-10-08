/**
 * サブ目標生成API用のログユーティリティ
 */

import { logger, createTimer } from './logger.js';

/**
 * サブ目標生成リクエストのログ出力
 */
export function logSubGoalGenerationRequest(
  requestId: string,
  userId: string,
  goalTitle: string
): void {
  logger.info('SubGoal generation request received', {
    requestId,
    userId,
    goalTitle,
    action: 'subgoal_generation_start',
  });
}

/**
 * サブ目標生成成功のログ出力
 */
export function logSubGoalGenerationSuccess(
  requestId: string,
  userId: string,
  goalId: string,
  subGoalCount: number,
  duration: number
): void {
  logger.info('SubGoal generation completed successfully', {
    requestId,
    userId,
    goalId,
    subGoalCount,
    duration,
    action: 'subgoal_generation_success',
  });
}

/**
 * サブ目標生成失敗のログ出力
 */
export function logSubGoalGenerationError(
  requestId: string,
  userId: string | undefined,
  error: Error,
  duration: number
): void {
  logger.error('SubGoal generation failed', {
    requestId,
    userId,
    errorName: error.name,
    errorMessage: error.message,
    duration,
    action: 'subgoal_generation_error',
  });
}

/**
 * AI生成開始のログ出力
 */
export function logAIGenerationStart(requestId: string, goalTitle: string): void {
  logger.info('AI generation started', {
    requestId,
    goalTitle,
    action: 'ai_generation_start',
  });
}

/**
 * AI生成完了のログ出力
 */
export function logAIGenerationComplete(
  requestId: string,
  subGoalCount: number,
  duration: number
): void {
  logger.info('AI generation completed', {
    requestId,
    subGoalCount,
    duration,
    action: 'ai_generation_complete',
  });
}

/**
 * データベース保存開始のログ出力
 */
export function logDatabaseSaveStart(requestId: string, goalId: string): void {
  logger.info('Database save started', {
    requestId,
    goalId,
    action: 'database_save_start',
  });
}

/**
 * データベース保存完了のログ出力
 */
export function logDatabaseSaveComplete(requestId: string, goalId: string, duration: number): void {
  logger.info('Database save completed', {
    requestId,
    goalId,
    duration,
    action: 'database_save_complete',
  });
}

/**
 * 品質検証警告のログ出力
 */
export function logQualityWarning(requestId: string, warning: string): void {
  logger.warn('Quality validation warning', {
    requestId,
    warning,
    action: 'quality_validation_warning',
  });
}

/**
 * 処理時間計測用のタイマーを作成
 */
export { createTimer };
