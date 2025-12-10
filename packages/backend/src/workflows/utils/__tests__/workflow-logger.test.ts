/**
 * Workflow Logger Tests
 * Tests for structured logging functionality
 */

import * as workflowLogger from '../workflow-logger';

describe('Workflow Logger', () => {
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('logWorkflowStarted', () => {
    it('should log workflow start event with execution ARN and input parameters', () => {
      const context = {
        executionArn: 'arn:aws:states:ap-northeast-1:123456789012:execution:test:exec-1',
        goalId: 'goal-123',
        userId: 'user-456',
        input: { actionIds: ['action-1', 'action-2'] },
      };

      workflowLogger.logWorkflowStarted(context);

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const logEntry = JSON.parse(consoleLogSpy.mock.calls[0][0]);

      expect(logEntry).toMatchObject({
        level: 'info',
        message: 'Workflow started',
        context: expect.objectContaining({
          executionArn: context.executionArn,
          goalId: context.goalId,
          userId: context.userId,
          event: 'workflow_started',
        }),
      });
    });
  });

  describe('logStateTransition', () => {
    it('should log state transition with timestamp', () => {
      const context = {
        executionArn: 'arn:aws:states:ap-northeast-1:123456789012:execution:test:exec-1',
        goalId: 'goal-123',
        userId: 'user-456',
        fromState: 'ValidateInput',
        toState: 'GetActions',
      };

      workflowLogger.logStateTransition(context);

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const logEntry = JSON.parse(consoleLogSpy.mock.calls[0][0]);

      expect(logEntry).toMatchObject({
        level: 'info',
        message: 'State transition',
        context: expect.objectContaining({
          executionArn: context.executionArn,
          event: 'state_transition',
          details: expect.objectContaining({
            fromState: context.fromState,
            toState: context.toState,
          }),
        }),
      });
    });
  });

  describe('logWorkflowCompleted', () => {
    it('should log workflow completion with execution time and result summary', () => {
      const context = {
        executionArn: 'arn:aws:states:ap-northeast-1:123456789012:execution:test:exec-1',
        goalId: 'goal-123',
        userId: 'user-456',
        duration: 120000,
        result: {
          successCount: 8,
          failedCount: 0,
          totalActions: 8,
        },
      };

      workflowLogger.logWorkflowCompleted(context);

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const logEntry = JSON.parse(consoleLogSpy.mock.calls[0][0]);

      expect(logEntry).toMatchObject({
        level: 'info',
        message: 'Workflow completed',
        context: expect.objectContaining({
          executionArn: context.executionArn,
          event: 'workflow_completed',
          duration: context.duration,
          details: expect.objectContaining({
            result: context.result,
          }),
        }),
      });
    });
  });

  describe('logWorkflowFailed', () => {
    it('should log workflow failure with error details and stack trace', () => {
      const error = new Error('Test error');
      const context = {
        executionArn: 'arn:aws:states:ap-northeast-1:123456789012:execution:test:exec-1',
        goalId: 'goal-123',
        userId: 'user-456',
        duration: 60000,
        error,
        failedActions: ['action-1', 'action-2'],
      };

      workflowLogger.logWorkflowFailed(context);

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const logEntry = JSON.parse(consoleLogSpy.mock.calls[0][0]);

      expect(logEntry).toMatchObject({
        level: 'error',
        message: 'Workflow failed',
        context: expect.objectContaining({
          executionArn: context.executionArn,
          event: 'workflow_failed',
          error: expect.objectContaining({
            message: error.message,
            stack: expect.any(String),
          }),
          details: expect.objectContaining({
            failedActions: context.failedActions,
          }),
        }),
      });
    });
  });

  describe('logTimeout', () => {
    it('should log timeout event with execution details', () => {
      const context = {
        executionArn: 'arn:aws:states:ap-northeast-1:123456789012:execution:test:exec-1',
        goalId: 'goal-123',
        userId: 'user-456',
        timeoutType: 'workflow' as const,
        duration: 900000,
      };

      workflowLogger.logTimeout(context);

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const logEntry = JSON.parse(consoleLogSpy.mock.calls[0][0]);

      expect(logEntry).toMatchObject({
        level: 'warn',
        message: 'Timeout occurred',
        context: expect.objectContaining({
          executionArn: context.executionArn,
          event: 'timeout',
          duration: context.duration,
          details: expect.objectContaining({
            timeoutType: context.timeoutType,
          }),
        }),
      });
    });
  });

  describe('logWorkflowCancelled', () => {
    it('should log cancellation event with user ID and reason', () => {
      const context = {
        executionArn: 'arn:aws:states:ap-northeast-1:123456789012:execution:test:exec-1',
        goalId: 'goal-123',
        userId: 'user-456',
        reason: 'User requested cancellation',
        cancelledBy: 'user-456',
      };

      workflowLogger.logWorkflowCancelled(context);

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const logEntry = JSON.parse(consoleLogSpy.mock.calls[0][0]);

      expect(logEntry).toMatchObject({
        level: 'info',
        message: 'Workflow cancelled',
        context: expect.objectContaining({
          executionArn: context.executionArn,
          event: 'workflow_cancelled',
          details: expect.objectContaining({
            reason: context.reason,
            cancelledBy: context.cancelledBy,
          }),
        }),
      });
    });
  });

  describe('logPerformanceWarning', () => {
    it('should log performance degradation with suggestion', () => {
      const context = {
        executionArn: 'arn:aws:states:ap-northeast-1:123456789012:execution:test:exec-1',
        goalId: 'goal-123',
        userId: 'user-456',
        metric: 'execution_time',
        value: 600000,
        threshold: 600000,
        suggestion: 'Consider optimizing batch size',
      };

      workflowLogger.logPerformanceWarning(context);

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const logEntry = JSON.parse(consoleLogSpy.mock.calls[0][0]);

      expect(logEntry).toMatchObject({
        level: 'warn',
        message: 'Performance degradation detected',
        context: expect.objectContaining({
          executionArn: context.executionArn,
          event: 'performance_warning',
          details: expect.objectContaining({
            metric: context.metric,
            value: context.value,
            threshold: context.threshold,
            suggestion: context.suggestion,
          }),
        }),
      });
    });
  });

  describe('WorkflowTimer', () => {
    it('should measure elapsed time correctly', () => {
      const timer = new workflowLogger.WorkflowTimer();

      // Wait a bit
      const start = Date.now();
      while (Date.now() - start < 100) {
        // Busy wait
      }

      const duration = timer.getDuration();
      expect(duration).toBeGreaterThanOrEqual(100);
    });

    it('should convert duration to seconds', () => {
      const timer = new workflowLogger.WorkflowTimer();

      // Mock Date.now to control time
      const originalNow = Date.now;
      let currentTime = originalNow();
      Date.now = jest.fn(() => currentTime);

      // Advance time by 5 seconds
      currentTime += 5000;

      const durationInSeconds = timer.getDurationInSeconds();
      expect(durationInSeconds).toBe(5);

      // Restore Date.now
      Date.now = originalNow;
    });

    it('should convert duration to minutes', () => {
      const timer = new workflowLogger.WorkflowTimer();

      // Mock Date.now to control time
      const originalNow = Date.now;
      let currentTime = originalNow();
      Date.now = jest.fn(() => currentTime);

      // Advance time by 3 minutes
      currentTime += 180000;

      const durationInMinutes = timer.getDurationInMinutes();
      expect(durationInMinutes).toBe(3);

      // Restore Date.now
      Date.now = originalNow;
    });
  });

  describe('Batch and Action Logging', () => {
    it('should log batch processing events', () => {
      const batchContext = {
        executionArn: 'arn:aws:states:ap-northeast-1:123456789012:execution:test:exec-1',
        goalId: 'goal-123',
        userId: 'user-456',
        batchNumber: 1,
        totalBatches: 3,
        actionCount: 8,
      };

      workflowLogger.logBatchStarted(batchContext);

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const logEntry = JSON.parse(consoleLogSpy.mock.calls[0][0]);

      expect(logEntry.context.event).toBe('batch_started');
      expect(logEntry.context.details).toMatchObject({
        batchNumber: 1,
        totalBatches: 3,
        actionCount: 8,
      });
    });

    it('should log action processing events', () => {
      const actionContext = {
        executionArn: 'arn:aws:states:ap-northeast-1:123456789012:execution:test:exec-1',
        goalId: 'goal-123',
        userId: 'user-456',
        actionId: 'action-1',
        actionTitle: 'Test Action',
      };

      workflowLogger.logActionStarted(actionContext);

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const logEntry = JSON.parse(consoleLogSpy.mock.calls[0][0]);

      expect(logEntry.context.event).toBe('action_started');
      expect(logEntry.context.details).toMatchObject({
        actionId: 'action-1',
        actionTitle: 'Test Action',
      });
    });
  });
});
