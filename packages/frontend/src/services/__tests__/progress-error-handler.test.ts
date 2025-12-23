import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProgressErrorHandler } from '../progress-error-handler';
import { ProgressCalculationError } from '../../types/progress-errors';

/**
 * Feature: 4.5-test-coverage-improvement, Task 8.1: 残りのサービスのテスト追加
 *
 * ProgressErrorHandlerのテスト
 */
describe('ProgressErrorHandler', () => {
  let errorHandler: ProgressErrorHandler;

  beforeEach(() => {
    errorHandler = new ProgressErrorHandler();
    vi.clearAllMocks();
  });

  describe('handleError', () => {
    it('エラーを処理できる', async () => {
      const error = new Error('Test error');

      const result = await errorHandler.handleError(error, 'goal-1', 'goal');

      expect(result).toBeDefined();
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toBe('Test error');
      expect(result.isFallback).toBe(true);
    });

    it('エラーメッセージがない場合はデフォルトメッセージを使用', async () => {
      const error = new Error();

      const result = await errorHandler.handleError(error, 'goal-1', 'goal');

      expect(result).toBeDefined();
      expect(result.error?.message).toBeDefined();
    });

    it('エラー統計を更新する', async () => {
      const error = new Error('Test error');

      await errorHandler.handleError(error, 'goal-1', 'goal');
      const stats = errorHandler.getErrorStatistics();

      expect(stats.totalErrors).toBeGreaterThan(0);
    });

    it('フォールバック値を返す', async () => {
      const error = new Error('Test error');

      const result = await errorHandler.handleError(error, 'goal-1', 'goal');

      expect(result.value).toBeDefined();
      expect(typeof result.value).toBe('number');
    });
  });

  describe('getErrorStatistics', () => {
    it('エラー統計を取得できる', () => {
      const stats = errorHandler.getErrorStatistics();

      expect(stats).toBeDefined();
      expect(stats.totalErrors).toBeDefined();
      expect(typeof stats.totalErrors).toBe('number');
    });

    it('初期状態ではエラー数が0', () => {
      const stats = errorHandler.getErrorStatistics();

      expect(stats.totalErrors).toBe(0);
    });
  });

  describe('resetErrorStatistics', () => {
    it('エラー統計をリセットできる', async () => {
      // エラーを発生させる
      const error = new Error('Test error');
      await errorHandler.handleError(error, 'goal-1', 'goal');

      // 統計をリセット
      errorHandler.resetErrorStatistics();

      // 統計が0にリセットされていることを確認
      const stats = errorHandler.getErrorStatistics();
      expect(stats.totalErrors).toBe(0);
    });
  });

  describe('classifyError', () => {
    it('ネットワークエラーを分類できる', () => {
      const error = new Error('Failed to fetch');
      const errorType = errorHandler.classifyError(error);

      expect(errorType).toBe(ProgressCalculationError.NETWORK_ERROR);
    });

    it('タイムアウトエラーを分類できる', () => {
      const error = new Error('timeout occurred');
      const errorType = errorHandler.classifyError(error);

      expect(errorType).toBe(ProgressCalculationError.CALCULATION_TIMEOUT);
    });

    it('認証エラーを分類できる', () => {
      const error = new Error('unauthorized 401');
      const errorType = errorHandler.classifyError(error);

      expect(errorType).toBe(ProgressCalculationError.AUTHENTICATION_ERROR);
    });

    it('認可エラーを分類できる', () => {
      const error = new Error('forbidden 403');
      const errorType = errorHandler.classifyError(error);

      expect(errorType).toBe(ProgressCalculationError.AUTHORIZATION_ERROR);
    });

    it('循環依存エラーを分類できる', () => {
      const error = new Error('circular dependency detected');
      const errorType = errorHandler.classifyError(error);

      expect(errorType).toBe(ProgressCalculationError.CIRCULAR_DEPENDENCY);
    });

    it('不明なエラーを分類できる', () => {
      const error = new Error('Unknown error');
      const errorType = errorHandler.classifyError(error);

      expect(errorType).toBe(ProgressCalculationError.UNKNOWN_ERROR);
    });
  });

  describe('getErrorStrategy', () => {
    it('エラー戦略を取得できる', () => {
      const strategy = errorHandler.getErrorStrategy(ProgressCalculationError.NETWORK_ERROR);

      expect(strategy).toBeDefined();
      expect(strategy.retryCount).toBeDefined();
      expect(strategy.fallbackValue).toBeDefined();
      expect(strategy.notificationRequired).toBeDefined();
      expect(strategy.logLevel).toBeDefined();
      expect(strategy.userMessage).toBeDefined();
    });

    it('ネットワークエラーの戦略はリトライ可能', () => {
      const strategy = errorHandler.getErrorStrategy(ProgressCalculationError.NETWORK_ERROR);

      expect(strategy.retryCount).toBeGreaterThan(0);
      expect(strategy.autoRecover).toBe(true);
    });

    it('無効なエンティティエラーの戦略はリトライ不可', () => {
      const strategy = errorHandler.getErrorStrategy(ProgressCalculationError.INVALID_ENTITY);

      expect(strategy.retryCount).toBe(0);
      expect(strategy.autoRecover).toBe(false);
    });
  });

  describe('getDefaultProgressValue', () => {
    it('デフォルト進捗値を取得できる', () => {
      const value = errorHandler.getDefaultProgressValue('goal');

      expect(value).toBe(0);
    });

    it('エンティティタイプに関わらず0を返す', () => {
      expect(errorHandler.getDefaultProgressValue('task')).toBe(0);
      expect(errorHandler.getDefaultProgressValue('action')).toBe(0);
      expect(errorHandler.getDefaultProgressValue('subgoal')).toBe(0);
      expect(errorHandler.getDefaultProgressValue('goal')).toBe(0);
    });
  });

  describe('createSuccessResult', () => {
    it('成功結果を作成できる', () => {
      const result = errorHandler.createSuccessResult(50);

      expect(result.success).toBe(true);
      expect(result.value).toBe(50);
      expect(result.isFallback).toBe(false);
      expect(result.wasRetried).toBe(false);
      expect(result.wasNotified).toBe(false);
    });
  });

  describe('getFallbackConfig', () => {
    it('フォールバック設定を取得できる', () => {
      const config = errorHandler.getFallbackConfig();

      expect(config).toBeDefined();
      expect(config.defaultProgress).toBeDefined();
      expect(config.calculatingProgress).toBeDefined();
      expect(config.errorProgress).toBeDefined();
      expect(config.noDataProgress).toBeDefined();
    });
  });

  describe('onNotification', () => {
    it('通知コールバックを登録できる', async () => {
      const callback = vi.fn();
      errorHandler.onNotification(callback);

      const error = new Error('Test error');
      await errorHandler.handleError(error, 'goal-1', 'goal');

      // 通知が必要なエラーの場合、コールバックが呼ばれる
      expect(callback).toHaveBeenCalled();
    });
  });

  describe('onLog', () => {
    it('ログコールバックを登録できる', async () => {
      const callback = vi.fn();
      errorHandler.onLog(callback);

      const error = new Error('Test error');
      await errorHandler.handleError(error, 'goal-1', 'goal');

      // ログコールバックが呼ばれる
      expect(callback).toHaveBeenCalled();
    });
  });
});
