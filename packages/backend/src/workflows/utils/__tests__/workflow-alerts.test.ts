/**
 * Workflow Alerts Tests
 * Tests for SNS notification and alert functionality
 *
 * Note: These tests verify the alert logic.
 * Actual SNS integration is tested in integration tests.
 */

import * as workflowAlerts from '../workflow-alerts';

describe('Workflow Alerts', () => {
  let consoleErrorSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleInfoSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleInfoSpy.mockRestore();
  });

  describe('Alert Functions', () => {
    it('should export all alert functions', () => {
      expect(typeof workflowAlerts.sendWorkflowFailureAlert).toBe('function');
      expect(typeof workflowAlerts.sendWorkflowTimeoutAlert).toBe('function');
      expect(typeof workflowAlerts.sendMultipleActionsFailureAlert).toBe('function');
      expect(typeof workflowAlerts.sendPartialFailureAlert).toBe('function');
      expect(typeof workflowAlerts.sendFailureRateAlert).toBe('function');
      expect(typeof workflowAlerts.sendTestAlert).toBe('function');
    });

    it('should handle workflow failure alerts without throwing', async () => {
      const context = {
        executionArn: 'arn:aws:states:ap-northeast-1:123456789012:execution:test:exec-1',
        goalId: 'goal-123',
        userId: 'user-456',
        errorMessage: 'Test error',
      };

      await expect(workflowAlerts.sendWorkflowFailureAlert(context)).resolves.not.toThrow();
    });

    it('should handle workflow timeout alerts without throwing', async () => {
      const context = {
        executionArn: 'arn:aws:states:ap-northeast-1:123456789012:execution:test:exec-1',
        goalId: 'goal-123',
        userId: 'user-456',
        duration: 900000,
      };

      await expect(workflowAlerts.sendWorkflowTimeoutAlert(context)).resolves.not.toThrow();
    });

    it('should handle multiple actions failure alerts without throwing', async () => {
      const context = {
        executionArn: 'arn:aws:states:ap-northeast-1:123456789012:execution:test:exec-1',
        goalId: 'goal-123',
        userId: 'user-456',
        failedActions: ['action-1', 'action-2', 'action-3'],
      };

      await expect(workflowAlerts.sendMultipleActionsFailureAlert(context)).resolves.not.toThrow();
    });

    it('should handle partial failure alerts without throwing', async () => {
      const context = {
        executionArn: 'arn:aws:states:ap-northeast-1:123456789012:execution:test:exec-1',
        goalId: 'goal-123',
        userId: 'user-456',
        failedActions: ['action-1'],
      };

      await expect(workflowAlerts.sendPartialFailureAlert(context)).resolves.not.toThrow();
    });

    it('should handle failure rate alerts without throwing', async () => {
      const context = {
        failureRate: 15.5,
        timeWindow: '5 minutes',
        failedCount: 3,
        totalCount: 20,
      };

      await expect(workflowAlerts.sendFailureRateAlert(context)).resolves.not.toThrow();
    });

    it('should handle test alerts without throwing', async () => {
      await expect(workflowAlerts.sendTestAlert()).resolves.not.toThrow();
    });
  });

  describe('Alert Priority', () => {
    it('should export AlertPriority enum', () => {
      expect(workflowAlerts.AlertPriority.LOW).toBe('LOW');
      expect(workflowAlerts.AlertPriority.MEDIUM).toBe('MEDIUM');
      expect(workflowAlerts.AlertPriority.HIGH).toBe('HIGH');
      expect(workflowAlerts.AlertPriority.CRITICAL).toBe('CRITICAL');
    });
  });

  describe('Configuration Validation', () => {
    it('should validate alert configuration', () => {
      const validation = workflowAlerts.validateAlertConfiguration();

      expect(validation).toHaveProperty('isConfigured');
      expect(validation).toHaveProperty('missingConfig');
      expect(Array.isArray(validation.missingConfig)).toBe(true);
    });

    it('should identify missing configuration', () => {
      const validation = workflowAlerts.validateAlertConfiguration();

      // In test environment, SNS topic ARN is not configured
      expect(validation.isConfigured).toBe(false);
      expect(validation.missingConfig).toContain('WORKFLOW_NOTIFICATIONS_TOPIC_ARN');
    });
  });

  describe('Error Handling', () => {
    it('should handle SNS errors gracefully', async () => {
      const context = {
        executionArn: 'arn:aws:states:ap-northeast-1:123456789012:execution:test:exec-1',
        goalId: 'goal-123',
      };

      // Should not throw even if SNS is not configured
      await expect(workflowAlerts.sendWorkflowFailureAlert(context)).resolves.not.toThrow();
      await expect(workflowAlerts.sendWorkflowTimeoutAlert(context)).resolves.not.toThrow();
      await expect(workflowAlerts.sendMultipleActionsFailureAlert(context)).resolves.not.toThrow();
    });
  });

  describe('Alert Context', () => {
    it('should handle alerts with minimal context', async () => {
      const minimalContext = {
        executionArn: 'arn:aws:states:ap-northeast-1:123456789012:execution:test:exec-1',
        goalId: 'goal-123',
      };

      await expect(workflowAlerts.sendWorkflowFailureAlert(minimalContext)).resolves.not.toThrow();
    });

    it('should handle alerts with full context', async () => {
      const fullContext = {
        executionArn: 'arn:aws:states:ap-northeast-1:123456789012:execution:test:exec-1',
        goalId: 'goal-123',
        userId: 'user-456',
        errorMessage: 'Test error',
        errorCode: 'TEST_ERROR',
        failedActions: ['action-1', 'action-2'],
        duration: 120000,
        additionalInfo: {
          batchNumber: 1,
          retryCount: 3,
        },
      };

      await expect(workflowAlerts.sendWorkflowFailureAlert(fullContext)).resolves.not.toThrow();
    });
  });

  describe('System Health Alerts', () => {
    it('should handle system health check failure alerts', async () => {
      const context = {
        component: 'Database',
        errorMessage: 'Connection timeout',
        additionalInfo: {
          host: 'db.example.com',
          port: 5432,
        },
      };

      await expect(
        workflowAlerts.sendSystemHealthCheckFailureAlert(context)
      ).resolves.not.toThrow();
    });
  });

  describe('Performance Alerts', () => {
    it('should handle AI API latency warning alerts', async () => {
      const context = {
        executionArn: 'arn:aws:states:ap-northeast-1:123456789012:execution:test:exec-1',
        goalId: 'goal-123',
        duration: 6000,
      };

      await expect(workflowAlerts.sendAIAPILatencyWarningAlert(context)).resolves.not.toThrow();
    });

    it('should handle Lambda concurrency warning alerts', async () => {
      const context = {
        executionArn: 'arn:aws:states:ap-northeast-1:123456789012:execution:test:exec-1',
        goalId: 'goal-123',
      };

      await expect(
        workflowAlerts.sendLambdaConcurrencyWarningAlert(context)
      ).resolves.not.toThrow();
    });

    it('should handle execution time warning alerts', async () => {
      const context = {
        executionArn: 'arn:aws:states:ap-northeast-1:123456789012:execution:test:exec-1',
        goalId: 'goal-123',
        duration: 600000,
      };

      await expect(workflowAlerts.sendExecutionTimeWarningAlert(context)).resolves.not.toThrow();
    });
  });
});
