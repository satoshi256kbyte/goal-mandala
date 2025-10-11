/**
 * 非同期処理メトリクスのテスト
 */

import { CloudWatchClient, PutMetricDataCommand } from '@aws-sdk/client-cloudwatch';
import {
  MetricName,
  sendMetric,
  sendProcessingStartedMetric,
  sendProcessingCompletedMetric,
  sendProcessingFailedMetric,
  sendProcessingTimeoutMetric,
  sendQueueDepthMetric,
  sendMetricsBatch,
} from '../async-processing-metrics';

// CloudWatchClientのモック
jest.mock('@aws-sdk/client-cloudwatch', () => {
  const mockSend = jest.fn();
  return {
    CloudWatchClient: jest.fn(() => ({
      send: mockSend,
    })),
    PutMetricDataCommand: jest.fn(input => input),
    mockSend,
  };
});

const { mockSend } = jest.requireMock('@aws-sdk/client-cloudwatch');

describe('async-processing-metrics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSend.mockResolvedValue({});
    process.env.CLOUDWATCH_NAMESPACE = 'TestNamespace';
    process.env.AWS_REGION = 'ap-northeast-1';
  });

  afterEach(() => {
    delete process.env.CLOUDWATCH_NAMESPACE;
    delete process.env.AWS_REGION;
  });

  describe('sendMetric', () => {
    it('CloudWatchにメトリクスを送信する', async () => {
      await sendMetric({
        metricName: MetricName.ASYNC_PROCESSING_STARTED,
        value: 1,
        unit: 'Count',
        dimensions: {
          ProcessingType: 'SUBGOAL_GENERATION',
        },
      });

      expect(mockSend).toHaveBeenCalledTimes(1);
      const commandInput = mockSend.mock.calls[0][0];
      expect(commandInput).toMatchObject({
        Namespace: 'TestNamespace',
        MetricData: [
          {
            MetricName: 'AsyncProcessingStarted',
            Value: 1,
            Unit: 'Count',
            Dimensions: [
              {
                Name: 'ProcessingType',
                Value: 'SUBGOAL_GENERATION',
              },
            ],
          },
        ],
      });
    });

    it('ディメンションなしでメトリクスを送信する', async () => {
      await sendMetric({
        metricName: MetricName.QUEUE_DEPTH,
        value: 10,
        unit: 'Count',
      });

      expect(mockSend).toHaveBeenCalledTimes(1);
      const commandInput = mockSend.mock.calls[0][0];
      expect(commandInput.MetricData[0].Dimensions).toBeUndefined();
    });

    it('メトリクス送信失敗時にエラーをログに記録する', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockSend.mockRejectedValueOnce(new Error('CloudWatch error'));

      await sendMetric({
        metricName: MetricName.ASYNC_PROCESSING_STARTED,
        value: 1,
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'CloudWatchメトリクス送信失敗:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('sendProcessingStartedMetric', () => {
    it('処理開始メトリクスを送信する', async () => {
      await sendProcessingStartedMetric('SUBGOAL_GENERATION');

      expect(mockSend).toHaveBeenCalledTimes(1);
      const commandInput = mockSend.mock.calls[0][0];
      expect(commandInput.MetricData[0]).toMatchObject({
        MetricName: 'AsyncProcessingStarted',
        Value: 1,
        Unit: 'Count',
        Dimensions: [
          {
            Name: 'ProcessingType',
            Value: 'SUBGOAL_GENERATION',
          },
        ],
      });
    });
  });

  describe('sendProcessingCompletedMetric', () => {
    it('処理完了メトリクスと処理時間を送信する', async () => {
      await sendProcessingCompletedMetric('ACTION_GENERATION', 5000);

      expect(mockSend).toHaveBeenCalledTimes(2);

      // 完了カウント
      const completedCall = mockSend.mock.calls[0][0];
      expect(completedCall.MetricData[0]).toMatchObject({
        MetricName: 'AsyncProcessingCompleted',
        Value: 1,
        Unit: 'Count',
      });
      expect(completedCall.MetricData[0].Dimensions).toEqual(
        expect.arrayContaining([
          { Name: 'ProcessingType', Value: 'ACTION_GENERATION' },
          { Name: 'Status', Value: 'COMPLETED' },
        ])
      );

      // 処理時間
      const durationCall = mockSend.mock.calls[1][0];
      expect(durationCall.MetricData[0]).toMatchObject({
        MetricName: 'ProcessingDuration',
        Value: 5000,
        Unit: 'Milliseconds',
        Dimensions: [
          {
            Name: 'ProcessingType',
            Value: 'ACTION_GENERATION',
          },
        ],
      });
    });
  });

  describe('sendProcessingFailedMetric', () => {
    it('処理失敗メトリクスを送信する', async () => {
      await sendProcessingFailedMetric('TASK_GENERATION', 'AI_ERROR', 3000);

      expect(mockSend).toHaveBeenCalledTimes(2);

      // 失敗カウント
      const failedCall = mockSend.mock.calls[0][0];
      expect(failedCall.MetricData[0]).toMatchObject({
        MetricName: 'AsyncProcessingFailed',
        Value: 1,
        Unit: 'Count',
      });
      expect(failedCall.MetricData[0].Dimensions).toEqual(
        expect.arrayContaining([
          { Name: 'ProcessingType', Value: 'TASK_GENERATION' },
          { Name: 'Status', Value: 'FAILED' },
          { Name: 'ErrorType', Value: 'AI_ERROR' },
        ])
      );

      // 処理時間
      const durationCall = mockSend.mock.calls[1][0];
      expect(durationCall.MetricData[0]).toMatchObject({
        MetricName: 'ProcessingDuration',
        Value: 3000,
        Unit: 'Milliseconds',
      });
    });

    it('処理時間なしで失敗メトリクスを送信する', async () => {
      await sendProcessingFailedMetric('SUBGOAL_GENERATION', 'DATABASE_ERROR');

      expect(mockSend).toHaveBeenCalledTimes(1);
    });
  });

  describe('sendProcessingTimeoutMetric', () => {
    it('タイムアウトメトリクスを送信する', async () => {
      await sendProcessingTimeoutMetric('ACTION_GENERATION', 300000);

      expect(mockSend).toHaveBeenCalledTimes(2);

      // タイムアウトカウント
      const timeoutCall = mockSend.mock.calls[0][0];
      expect(timeoutCall.MetricData[0]).toMatchObject({
        MetricName: 'AsyncProcessingTimeout',
        Value: 1,
        Unit: 'Count',
      });
      expect(timeoutCall.MetricData[0].Dimensions).toEqual(
        expect.arrayContaining([
          { Name: 'ProcessingType', Value: 'ACTION_GENERATION' },
          { Name: 'Status', Value: 'TIMEOUT' },
        ])
      );

      // 処理時間
      const durationCall = mockSend.mock.calls[1][0];
      expect(durationCall.MetricData[0]).toMatchObject({
        MetricName: 'ProcessingDuration',
        Value: 300000,
        Unit: 'Milliseconds',
      });
    });
  });

  describe('sendQueueDepthMetric', () => {
    it('キュー深度メトリクスを送信する', async () => {
      await sendQueueDepthMetric(15);

      expect(mockSend).toHaveBeenCalledTimes(1);
      const commandInput = mockSend.mock.calls[0][0];
      expect(commandInput.MetricData[0]).toMatchObject({
        MetricName: 'QueueDepth',
        Value: 15,
        Unit: 'Count',
      });
    });
  });

  describe('sendMetricsBatch', () => {
    it('複数のメトリクスをバッチで送信する', async () => {
      await sendMetricsBatch([
        {
          metricName: MetricName.ASYNC_PROCESSING_STARTED,
          value: 1,
          unit: 'Count',
          dimensions: { ProcessingType: 'SUBGOAL_GENERATION' },
        },
        {
          metricName: MetricName.PROCESSING_DURATION,
          value: 5000,
          unit: 'Milliseconds',
          dimensions: { ProcessingType: 'SUBGOAL_GENERATION' },
        },
      ]);

      expect(mockSend).toHaveBeenCalledTimes(1);
      const commandInput = mockSend.mock.calls[0][0];
      expect(commandInput.MetricData).toHaveLength(2);
    });

    it('バッチ送信失敗時にエラーをログに記録する', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockSend.mockRejectedValueOnce(new Error('CloudWatch error'));

      await sendMetricsBatch([
        {
          metricName: MetricName.ASYNC_PROCESSING_STARTED,
          value: 1,
        },
      ]);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'CloudWatchメトリクスバッチ送信失敗:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });
  });
});
