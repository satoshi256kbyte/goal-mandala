/**
 * リトライユーティリティ
 *
 * 指数バックオフを使用したリトライ機能を提供します。
 * 要件5.2, 5.3: リトライ機能
 */

import { classifyError, isRetryableBedrockError } from './error-handler';

/**
 * リトライ設定
 */
export interface RetryConfig {
  /** 最大リトライ回数 */
  maxRetries: number;
  /** 基本遅延時間（ミリ秒） */
  baseDelay: number;
  /** 最大遅延時間（ミリ秒） */
  maxDelay: number;
  /** バックオフ乗数 */
  backoffMultiplier: number;
}

/**
 * リトライ可能な関数の型
 */
export type RetryableFunction<T> = () => Promise<T>;

/**
 * デフォルトのリトライ設定
 */
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000, // 1秒
  maxDelay: 10000, // 10秒
  backoffMultiplier: 2, // 指数バックオフ
};

/**
 * 指数バックオフでリトライする
 *
 * @param fn - リトライする関数
 * @param config - リトライ設定
 * @returns 関数の実行結果
 */
export async function retryWithBackoff<T>(
  fn: RetryableFunction<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const retryConfig: RetryConfig = {
    ...DEFAULT_RETRY_CONFIG,
    ...config,
  };

  let lastError: Error | null = null;
  let attempt = 0;

  while (attempt <= retryConfig.maxRetries) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // エラーを分類
      const classifiedError = classifyError(lastError);

      // リトライ不可能なエラーの場合は即座に失敗
      if (!isRetryableBedrockError(classifiedError)) {
        throw lastError;
      }

      // 最大リトライ回数に達した場合は失敗
      if (attempt >= retryConfig.maxRetries) {
        throw lastError;
      }

      // 待機時間を計算（指数バックオフ）
      const delay = calculateDelay(attempt, retryConfig);

      // 待機
      await sleep(delay);

      attempt++;
    }
  }

  // ここには到達しないはずだが、TypeScriptの型チェックのため
  throw lastError || new Error('Retry failed');
}

/**
 * 遅延時間を計算する
 *
 * @param attempt - 試行回数
 * @param config - リトライ設定
 * @returns 遅延時間（ミリ秒）
 */
function calculateDelay(attempt: number, config: RetryConfig): number {
  const exponentialDelay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt);
  return Math.min(exponentialDelay, config.maxDelay);
}

/**
 * 指定時間待機する
 *
 * @param ms - 待機時間（ミリ秒）
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
