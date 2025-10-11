/**
 * 非同期処理状態管理用のCloudWatchメトリクス送信
 * 要件14.3, 14.4に対応
 */

import { CloudWatchClient, PutMetricDataCommand, MetricDatum } from '@aws-sdk/client-cloudwatch';

/**
 * CloudWatchクライアント（シングルトン）
 */
let cloudWatchClient: CloudWatchClient | null = null;

function getCloudWatchClient(): CloudWatchClient {
  if (!cloudWatchClient) {
    cloudWatchClient = new CloudWatchClient({
      region: process.env.AWS_REGION || 'ap-northeast-1',
    });
  }
  return cloudWatchClient;
}

/**
 * メトリクス名の定義
 */
export enum MetricName {
  ASYNC_PROCESSING_STARTED = 'AsyncProcessingStarted',
  ASYNC_PROCESSING_COMPLETED = 'AsyncProcessingCompleted',
  ASYNC_PROCESSING_FAILED = 'AsyncProcessingFailed',
  ASYNC_PROCESSING_TIMEOUT = 'AsyncProcessingTimeout',
  PROCESSING_DURATION = 'ProcessingDuration',
  QUEUE_DEPTH = 'QueueDepth',
}

/**
 * メトリクスのディメンション
 */
export interface MetricDimensions {
  ProcessingType?: string;
  Status?: string;
  ErrorType?: string;
  [key: string]: string | undefined;
}

/**
 * メトリクス送信のコンテキスト
 */
export interface MetricContext {
  metricName: MetricName;
  value: number;
  unit?: 'Count' | 'Milliseconds' | 'Seconds' | 'None';
  dimensions?: MetricDimensions;
  timestamp?: Date;
}

/**
 * CloudWatchにカスタムメトリクスを送信
 */
export async function sendMetric(context: MetricContext): Promise<void> {
  try {
    const client = getCloudWatchClient();
    const namespace = process.env.CLOUDWATCH_NAMESPACE || 'GoalMandala/AsyncProcessing';

    // ディメンションの構築
    const dimensions: { Name: string; Value: string }[] = [];
    if (context.dimensions) {
      for (const [key, value] of Object.entries(context.dimensions)) {
        if (value !== undefined) {
          dimensions.push({ Name: key, Value: value });
        }
      }
    }

    const metricData: MetricDatum = {
      MetricName: context.metricName,
      Value: context.value,
      Unit: context.unit || 'Count',
      Timestamp: context.timestamp || new Date(),
      Dimensions: dimensions.length > 0 ? dimensions : undefined,
    };

    const command = new PutMetricDataCommand({
      Namespace: namespace,
      MetricData: [metricData],
    });

    await client.send(command);
  } catch (error) {
    // メトリクス送信失敗はログに記録するが、処理は継続
    console.error('CloudWatchメトリクス送信失敗:', error);
  }
}

/**
 * 非同期処理開始メトリクス
 */
export async function sendProcessingStartedMetric(processingType: string): Promise<void> {
  await sendMetric({
    metricName: MetricName.ASYNC_PROCESSING_STARTED,
    value: 1,
    unit: 'Count',
    dimensions: {
      ProcessingType: processingType,
    },
  });
}

/**
 * 非同期処理完了メトリクス
 */
export async function sendProcessingCompletedMetric(
  processingType: string,
  duration: number
): Promise<void> {
  // 完了カウント
  await sendMetric({
    metricName: MetricName.ASYNC_PROCESSING_COMPLETED,
    value: 1,
    unit: 'Count',
    dimensions: {
      ProcessingType: processingType,
      Status: 'COMPLETED',
    },
  });

  // 処理時間
  await sendMetric({
    metricName: MetricName.PROCESSING_DURATION,
    value: duration,
    unit: 'Milliseconds',
    dimensions: {
      ProcessingType: processingType,
    },
  });
}

/**
 * 非同期処理失敗メトリクス
 */
export async function sendProcessingFailedMetric(
  processingType: string,
  errorType: string,
  duration?: number
): Promise<void> {
  // 失敗カウント
  await sendMetric({
    metricName: MetricName.ASYNC_PROCESSING_FAILED,
    value: 1,
    unit: 'Count',
    dimensions: {
      ProcessingType: processingType,
      Status: 'FAILED',
      ErrorType: errorType,
    },
  });

  // 処理時間（失敗時も記録）
  if (duration !== undefined) {
    await sendMetric({
      metricName: MetricName.PROCESSING_DURATION,
      value: duration,
      unit: 'Milliseconds',
      dimensions: {
        ProcessingType: processingType,
        Status: 'FAILED',
      },
    });
  }
}

/**
 * 非同期処理タイムアウトメトリクス
 */
export async function sendProcessingTimeoutMetric(
  processingType: string,
  duration: number
): Promise<void> {
  // タイムアウトカウント
  await sendMetric({
    metricName: MetricName.ASYNC_PROCESSING_TIMEOUT,
    value: 1,
    unit: 'Count',
    dimensions: {
      ProcessingType: processingType,
      Status: 'TIMEOUT',
    },
  });

  // 処理時間
  await sendMetric({
    metricName: MetricName.PROCESSING_DURATION,
    value: duration,
    unit: 'Milliseconds',
    dimensions: {
      ProcessingType: processingType,
      Status: 'TIMEOUT',
    },
  });
}

/**
 * キュー深度メトリクス
 */
export async function sendQueueDepthMetric(queueDepth: number): Promise<void> {
  await sendMetric({
    metricName: MetricName.QUEUE_DEPTH,
    value: queueDepth,
    unit: 'Count',
  });
}

/**
 * バッチでメトリクスを送信
 */
export async function sendMetricsBatch(contexts: MetricContext[]): Promise<void> {
  try {
    const client = getCloudWatchClient();
    const namespace = process.env.CLOUDWATCH_NAMESPACE || 'GoalMandala/AsyncProcessing';

    const metricData: MetricDatum[] = contexts.map(context => {
      const dimensions: { Name: string; Value: string }[] = [];
      if (context.dimensions) {
        for (const [key, value] of Object.entries(context.dimensions)) {
          if (value !== undefined) {
            dimensions.push({ Name: key, Value: value });
          }
        }
      }

      return {
        MetricName: context.metricName,
        Value: context.value,
        Unit: context.unit || 'Count',
        Timestamp: context.timestamp || new Date(),
        Dimensions: dimensions.length > 0 ? dimensions : undefined,
      };
    });

    const command = new PutMetricDataCommand({
      Namespace: namespace,
      MetricData: metricData,
    });

    await client.send(command);
  } catch (error) {
    console.error('CloudWatchメトリクスバッチ送信失敗:', error);
  }
}
