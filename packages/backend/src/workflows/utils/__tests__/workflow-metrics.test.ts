/**
 * Workflow Metrics Tests
 * Tests for CloudWatch metrics functionality
 *
 * Note: These tests verify the metric recording logic.
 * Actual CloudWatch integration is tested in integration tests.
 */

describe('Workflow Metrics', () => {
  // Mock console.error to suppress error logs during tests
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('should export metric recording functions', () => {
    const workflowMetrics = require('../workflow-metrics');

    expect(typeof workflowMetrics.recordWorkflowExecution).toBe('function');
    expect(typeof workflowMetrics.recordWorkflowSuccess).toBe('function');
    expect(typeof workflowMetrics.recordWorkflowFailure).toBe('function');
    expect(typeof workflowMetrics.recordWorkflowDuration).toBe('function');
    expect(typeof workflowMetrics.recordActionProcessingTime).toBe('function');
    expect(typeof workflowMetrics.recordTaskGeneration).toBe('function');
    expect(typeof workflowMetrics.putMetricsBatch).toBe('function');
    expect(typeof workflowMetrics.recordWorkflowCompletionMetrics).toBe('function');
  });

  it('should handle errors gracefully without throwing', async () => {
    const workflowMetrics = require('../workflow-metrics');

    // These should not throw even if CloudWatch is not configured
    await expect(workflowMetrics.recordWorkflowExecution()).resolves.not.toThrow();
    await expect(workflowMetrics.recordWorkflowSuccess()).resolves.not.toThrow();
    await expect(workflowMetrics.recordWorkflowFailure()).resolves.not.toThrow();
  });
});
