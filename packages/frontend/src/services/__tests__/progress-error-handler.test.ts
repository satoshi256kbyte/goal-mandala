/**
 * 進捗エラーハンドラーのテスト
 * 要件: 全要件 - エラーハンドリング
 */

import { ProgressErrorHandler } from '../progress-error-handler';
import { ProgressCalculationError } from '../../types/progress-errors';

describe('ProgressErrorHandler', () => {
  let errorHandler: ProgressErrorHandler;

  beforeEach(() => {
    errorHandler = new ProgressErrorHandler();
    // エラー統計をリセット
    errorHandler.resetErrorStatistics();
  });

  describe('エラー分類', () => {
    it('タイムアウトエラーを正しく分類する', () => {
      const error = new Error('Request timeout');
      const errorType = errorHandler.classifyError(error);
      expect(errorType).toBe(ProgressCalculationError.CALCULATION_TIMEOUT);
    });

    it('ネットワークエラーを正しく分類する', () => {
      const error = new Error('Network error occurred');
      const errorType = errorHandler.classifyError(error);
      expect(errorType).toBe(ProgressCalculationError.NETWORK_ERROR);
    });

    it('認証エラーを正しく分類する', () => {
      const error = new Error('Unauthorized access');
      const errorType = errorHandler.classifyError(error);
      expect(errorType).toBe(ProgressCalculationError.AUTHENTICATION_ERROR);
    });

    it('権限エラーを正しく分類する', () => {
      const error = new Error('Forbidden resource');
      const errorType = errorHandler.classifyError(error);
      expect(errorType).toBe(ProgressCalculationError.AUTHORIZATION_ERROR);
    });

    it('無効なエンティティエラーを正しく分類する', () => {
      const error = new Error('Entity not found');
      const errorType = errorHandler.classifyError(error);
      expect(errorType).toBe(ProgressCalculationError.INVALID_ENTITY);
    });

    it('循環依存エラーを正しく分類する', () => {
      const error = new Error('Circular dependency detected');
      const errorType = errorHandler.classifyError(error);
      expect(errorType).toBe(ProgressCalculationError.CIRCULAR_DEPENDENCY);
    });

    it('データ不整合エラーを正しく分類する', () => {
      const error = new Error('Data inconsistent');
      const errorType = errorHandler.classifyError(error);
      expect(errorType).toBe(ProgressCalculationError.DATA_INCONSISTENCY);
    });

    it('キャッシュエラーを正しく分類する', () => {
      const error = new Error('Cache error');
      const errorType = errorHandler.classifyError(error);
      expect(errorType).toBe(ProgressCalculationError.CACHE_ERROR);
    });

    it('不明なエラーを正しく分類する', () => {
      const error = new Error('Some unknown error');
      const errorType = errorHandler.classifyError(error);
      expect(errorType).toBe(ProgressCalculationError.UNKNOWN_ERROR);
    });
  });

  describe('エラー処理', () => {
    it('無効なエンティティエラーを適切に処理する', async () => {
      const error = new Error('Entity not found');
      const result = await errorHandler.handleError(error, 'test-id', 'task');

      expect(result.success).toBe(false);
      expect(result.value).toBe(0); // フォールバック値
      expect(result.isFallback).toBe(true);
      expect(result.wasNotified).toBe(true);
      expect(result.error?.type).toBe(ProgressCalculationError.INVALID_ENTITY);
    });

    it('タイムアウトエラーを適切に処理する', async () => {
      const error = new Error('Calculation timeout');
      const result = await errorHandler.handleError(error, 'test-id', 'action');

      expect(result.success).toBe(false);
      expect(result.value).toBe(-1); // 計算中を示すフォールバック値
      expect(result.isFallback).toBe(true);
      expect(result.wasNotified).toBe(false); // タイムアウトは通知しない
      expect(result.error?.type).toBe(ProgressCalculationError.CALCULATION_TIMEOUT);
    });

    it('ネットワークエラーを適切に処理する', async () => {
      const error = new Error('Network fetch failed');
      const result = await errorHandler.handleError(error, 'test-id', 'subgoal');

      expect(result.success).toBe(false);
      expect(result.value).toBe(-1);
      expect(result.isFallback).toBe(true);
      expect(result.wasNotified).toBe(true);
      expect(result.error?.type).toBe(ProgressCalculationError.NETWORK_ERROR);
    });

    it('認証エラーを適切に処理する', async () => {
      const error = new Error('401 Unauthorized');
      const result = await errorHandler.handleError(error, 'test-id', 'goal');

      expect(result.success).toBe(false);
      expect(result.value).toBe(0);
      expect(result.isFallback).toBe(true);
      expect(result.wasNotified).toBe(true);
      expect(result.error?.type).toBe(ProgressCalculationError.AUTHENTICATION_ERROR);
    });
  });

  describe('成功結果の作成', () => {
    it('成功結果を正しく作成する', () => {
      const result = errorHandler.createSuccessResult(75);

      expect(result.success).toBe(true);
      expect(result.value).toBe(75);
      expect(result.isFallback).toBe(false);
      expect(result.wasRetried).toBe(false);
      expect(result.wasNotified).toBe(false);
      expect(result.error).toBeUndefined();
    });
  });

  describe('エラー統計', () => {
    it('エラー統計を正しく更新する', async () => {
      const error1 = new Error('Network error');
      const error2 = new Error('Timeout error');
      const error3 = new Error('Network error again');

      await errorHandler.handleError(error1);
      await errorHandler.handleError(error2);
      await errorHandler.handleError(error3);

      const stats = errorHandler.getErrorStatistics();

      expect(stats.totalErrors).toBe(3);
      expect(stats.errorsByType[ProgressCalculationError.NETWORK_ERROR]).toBe(2);
      expect(stats.errorsByType[ProgressCalculationError.CALCULATION_TIMEOUT]).toBe(1);
      expect(stats.mostFrequentError).toBe(ProgressCalculationError.NETWORK_ERROR);
      expect(stats.lastErrorTime).toBeInstanceOf(Date);
    });

    it('エラー統計をリセットできる', async () => {
      const error = new Error('Test error');
      await errorHandler.handleError(error);

      let stats = errorHandler.getErrorStatistics();
      expect(stats.totalErrors).toBe(1);

      errorHandler.resetErrorStatistics();
      stats = errorHandler.getErrorStatistics();
      expect(stats.totalErrors).toBe(0);
      expect(Object.keys(stats.errorsByType)).toHaveLength(0);
    });
  });

  describe('コールバック機能', () => {
    it('通知コールバックが呼び出される', async () => {
      const notificationCallback = jest.fn();
      errorHandler.onNotification(notificationCallback);

      const error = new Error('Entity not found');
      await errorHandler.handleError(error);

      expect(notificationCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'modal',
          severity: 'error',
          message: expect.stringContaining('無効なデータが検出されました'),
        })
      );
    });

    it('ログコールバックが呼び出される', async () => {
      const logCallback = jest.fn();
      errorHandler.onLog(logCallback);

      const error = new Error('Test error');
      await errorHandler.handleError(error);

      expect(logCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'error',
          message: expect.stringContaining('Progress calculation error'),
          metadata: expect.objectContaining({
            errorType: ProgressCalculationError.UNKNOWN_ERROR,
          }),
        })
      );
    });

    it('複数のコールバックが登録できる', async () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      errorHandler.onNotification(callback1);
      errorHandler.onNotification(callback2);

      const error = new Error('Entity not found');
      await errorHandler.handleError(error);

      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });
  });

  describe('エラー戦略の取得', () => {
    it('特定のエラータイプの戦略を取得できる', () => {
      const strategy = errorHandler.getErrorStrategy(ProgressCalculationError.INVALID_ENTITY);

      expect(strategy.retryCount).toBe(0);
      expect(strategy.fallbackValue).toBe(0);
      expect(strategy.notificationRequired).toBe(true);
      expect(strategy.logLevel).toBe('error');
      expect(strategy.autoRecover).toBe(false);
    });

    it('タイムアウトエラーの戦略を取得できる', () => {
      const strategy = errorHandler.getErrorStrategy(ProgressCalculationError.CALCULATION_TIMEOUT);

      expect(strategy.retryCount).toBe(2);
      expect(strategy.fallbackValue).toBe(-1);
      expect(strategy.notificationRequired).toBe(false);
      expect(strategy.logLevel).toBe('warn');
      expect(strategy.autoRecover).toBe(true);
    });
  });

  describe('フォールバック設定', () => {
    it('フォールバック設定を取得できる', () => {
      const config = errorHandler.getFallbackConfig();

      expect(config.defaultProgress).toBe(0);
      expect(config.calculatingProgress).toBe(-1);
      expect(config.errorProgress).toBe(-2);
      expect(config.noDataProgress).toBe(0);
    });
  });
});
