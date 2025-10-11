/**
 * 非同期処理ロガーのテスト
 */

import { logger } from '../logger';
import {
  logProcessingStarted,
  logProcessingStatusUpdate,
  logProcessingCompleted,
  logProcessingFailed,
  logProcessingTimeout,
  logProcessingCancelled,
  logProcessingRetry,
  logStepFunctionsStarted,
  logStepFunctionsStopped,
  ProcessingTimer,
} from '../async-processing-logger';

// loggerのモック
jest.mock('../logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
  toLogContext: (obj: unknown) => obj,
}));

describe('async-processing-logger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('logProcessingStarted', () => {
    it('処理開始ログを出力する', () => {
      const context = {
        processId: 'test-process-id',
        userId: 'test-user-id',
        type: 'SUBGOAL_GENERATION',
      };

      logProcessingStarted(context);

      expect(logger.info).toHaveBeenCalledWith(
        '非同期処理開始',
        expect.objectContaining({
          processId: 'test-process-id',
          userId: 'test-user-id',
          type: 'SUBGOAL_GENERATION',
          status: 'PENDING',
        })
      );
    });
  });

  describe('logProcessingStatusUpdate', () => {
    it('状態更新ログを出力する', () => {
      const context = {
        processId: 'test-process-id',
        userId: 'test-user-id',
        type: 'ACTION_GENERATION',
        status: 'PROCESSING',
        progress: 50,
      };

      logProcessingStatusUpdate(context);

      expect(logger.info).toHaveBeenCalledWith(
        '非同期処理状態更新',
        expect.objectContaining({
          processId: 'test-process-id',
          userId: 'test-user-id',
          type: 'ACTION_GENERATION',
          status: 'PROCESSING',
          progress: 50,
        })
      );
    });
  });

  describe('logProcessingCompleted', () => {
    it('処理完了ログを出力する', () => {
      const context = {
        processId: 'test-process-id',
        userId: 'test-user-id',
        type: 'TASK_GENERATION',
        duration: 5000,
      };

      logProcessingCompleted(context);

      expect(logger.info).toHaveBeenCalledWith(
        '非同期処理完了',
        expect.objectContaining({
          processId: 'test-process-id',
          userId: 'test-user-id',
          type: 'TASK_GENERATION',
          status: 'COMPLETED',
          duration: 5000,
        })
      );
    });
  });

  describe('logProcessingFailed', () => {
    it('処理失敗ログを出力する', () => {
      const context = {
        processId: 'test-process-id',
        userId: 'test-user-id',
        type: 'SUBGOAL_GENERATION',
        error: 'AI generation failed',
        errorType: 'AI_ERROR',
        duration: 3000,
        retryCount: 1,
      };

      logProcessingFailed(context);

      expect(logger.error).toHaveBeenCalledWith(
        '非同期処理失敗',
        expect.objectContaining({
          processId: 'test-process-id',
          userId: 'test-user-id',
          type: 'SUBGOAL_GENERATION',
          status: 'FAILED',
          error: 'AI generation failed',
          errorType: 'AI_ERROR',
          duration: 3000,
          retryCount: 1,
        })
      );
    });
  });

  describe('logProcessingTimeout', () => {
    it('タイムアウトログを出力する', () => {
      const context = {
        processId: 'test-process-id',
        userId: 'test-user-id',
        type: 'ACTION_GENERATION',
        duration: 300000,
      };

      logProcessingTimeout(context);

      expect(logger.warn).toHaveBeenCalledWith(
        '非同期処理タイムアウト',
        expect.objectContaining({
          processId: 'test-process-id',
          userId: 'test-user-id',
          type: 'ACTION_GENERATION',
          status: 'TIMEOUT',
          duration: 300000,
        })
      );
    });
  });

  describe('logProcessingCancelled', () => {
    it('キャンセルログを出力する', () => {
      const context = {
        processId: 'test-process-id',
        userId: 'test-user-id',
        type: 'TASK_GENERATION',
      };

      logProcessingCancelled(context);

      expect(logger.info).toHaveBeenCalledWith(
        '非同期処理キャンセル',
        expect.objectContaining({
          processId: 'test-process-id',
          userId: 'test-user-id',
          type: 'TASK_GENERATION',
          status: 'CANCELLED',
        })
      );
    });
  });

  describe('logProcessingRetry', () => {
    it('リトライログを出力する', () => {
      const context = {
        processId: 'test-process-id',
        userId: 'test-user-id',
        type: 'SUBGOAL_GENERATION',
        retryCount: 2,
      };

      logProcessingRetry(context);

      expect(logger.info).toHaveBeenCalledWith(
        '非同期処理リトライ',
        expect.objectContaining({
          processId: 'test-process-id',
          userId: 'test-user-id',
          type: 'SUBGOAL_GENERATION',
          retryCount: 2,
        })
      );
    });
  });

  describe('logStepFunctionsStarted', () => {
    it('Step Functions開始ログを出力する', () => {
      const context = {
        processId: 'test-process-id',
        executionArn: 'arn:aws:states:ap-northeast-1:123456789012:execution:test',
        stateMachineArn: 'arn:aws:states:ap-northeast-1:123456789012:stateMachine:test',
      };

      logStepFunctionsStarted(context);

      expect(logger.info).toHaveBeenCalledWith(
        'Step Functions実行開始',
        expect.objectContaining({
          processId: 'test-process-id',
          executionArn: context.executionArn,
          stateMachineArn: context.stateMachineArn,
        })
      );
    });
  });

  describe('logStepFunctionsStopped', () => {
    it('Step Functions停止ログを出力する', () => {
      const context = {
        processId: 'test-process-id',
        executionArn: 'arn:aws:states:ap-northeast-1:123456789012:execution:test',
        reason: 'User cancelled',
      };

      logStepFunctionsStopped(context);

      expect(logger.info).toHaveBeenCalledWith(
        'Step Functions実行停止',
        expect.objectContaining({
          processId: 'test-process-id',
          executionArn: context.executionArn,
          reason: 'User cancelled',
        })
      );
    });
  });

  describe('ProcessingTimer', () => {
    it('経過時間を正しく計測する', async () => {
      const timer = new ProcessingTimer();

      // 100ms待機
      await new Promise(resolve => setTimeout(resolve, 100));

      const duration = timer.getDuration();
      expect(duration).toBeGreaterThanOrEqual(100);
      expect(duration).toBeLessThan(200);
    });

    it('経過時間をログに記録する', () => {
      const timer = new ProcessingTimer();

      timer.logDuration('test-process-id', 'SUBGOAL_GENERATION');

      expect(logger.info).toHaveBeenCalledWith(
        '処理時間記録',
        expect.objectContaining({
          processId: 'test-process-id',
          type: 'SUBGOAL_GENERATION',
          duration: expect.any(Number),
        })
      );
    });
  });
});
