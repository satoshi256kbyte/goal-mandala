/**
 * Step Functions ワークフロー用のCloudWatchメトリクス
 * Requirement 7.5: WHEN monitoring workflows THEN the system SHALL publish metrics to CloudWatch
 */

import { CloudWatchClient, PutMetricDataCommand, MetricDatum } from '@aws-sdk/client-cloudwatch';

/**
 * CloudWatchクライアント
 */
const cloudwatch = new CloudWatchClient({
  region: process.env.AWS_REGION || 'ap-northeast-1',
});

/**
 * メトリクス名前空間
 */
const NAMESPACE = 'GoalMandala/Workflows';

/**
 * メトリクスのディメンション
 */
interface MetricDimensions {
  WorkflowType?: string;
  GoalId?: string;
  UserId?: string;
}

/**
 * メトリクスを送信する
 */
async function putMetric(
  metricName: string,
  value: number,
  unit: string,
  dimensions?: MetricDimensions
): Promise<void> {
  const metricData: MetricDatum = {
    MetricName: metricName,
    Value: value,
    Unit: unit,
    Timestamp: new Date(),
  };

  if (dimensions) {
    metricData.Dimensions = Object.entries(dimensions).map(([name, value]) => ({
      Name: name,
      Value: value,
    }));
  }

  try {
    await cloudwatch.send(
      new PutMetricDataCommand({
        Namespace: NAMESPACE,
        MetricData: [metricData],
      })
    );
  } catch (error) {
    // メトリクス送信失敗はログに記録するが、処理は継続
    console.error('Failed to put metric:', error);
  }
}

/**
 * ワークフロー実行回数メトリクス
 * Metric: WorkflowExecutionCount
 */
export async function recordWorkflowExecution(dimensions?: MetricDimensions): Promise<void> {
  await putMetric('WorkflowExecutionCount', 1, 'Count', dimensions);
}

/**
 * ワークフロー成功メトリクス
 * Metric: WorkflowSuccessRate
 */
export async function recordWorkflowSuccess(dimensions?: MetricDimensions): Promise<void> {
  await putMetric('WorkflowSuccess', 1, 'Count', dimensions);
}

/**
 * ワークフロー失敗メトリクス
 * Metric: WorkflowFailureRate
 */
export async function recordWorkflowFailure(dimensions?: MetricDimensions): Promise<void> {
  await putMetric('WorkflowFailure', 1, 'Count', dimensions);
}

/**
 * ワークフロー実行時間メトリクス
 * Metric: WorkflowDuration
 */
export async function recordWorkflowDuration(
  durationMs: number,
  dimensions?: MetricDimensions
): Promise<void> {
  await putMetric('WorkflowDuration', durationMs, 'Milliseconds', dimensions);
}

/**
 * ワークフロータイムアウトメトリクス
 */
export async function recordWorkflowTimeout(dimensions?: MetricDimensions): Promise<void> {
  await putMetric('WorkflowTimeout', 1, 'Count', dimensions);
}

/**
 * ワークフローキャンセルメトリクス
 */
export async function recordWorkflowCancellation(dimensions?: MetricDimensions): Promise<void> {
  await putMetric('WorkflowCancellation', 1, 'Count', dimensions);
}

/**
 * アクション処理時間メトリクス
 * Metric: ActionProcessingTime
 */
export async function recordActionProcessingTime(
  durationMs: number,
  dimensions?: MetricDimensions
): Promise<void> {
  await putMetric('ActionProcessingTime', durationMs, 'Milliseconds', dimensions);
}

/**
 * アクション失敗メトリクス
 * Metric: ActionFailureRate
 */
export async function recordActionFailure(dimensions?: MetricDimensions): Promise<void> {
  await putMetric('ActionFailure', 1, 'Count', dimensions);
}

/**
 * タスク生成数メトリクス
 * Metric: TaskGenerationCount
 */
export async function recordTaskGeneration(
  taskCount: number,
  dimensions?: MetricDimensions
): Promise<void> {
  await putMetric('TaskGenerationCount', taskCount, 'Count', dimensions);
}

/**
 * バッチ処理時間メトリクス
 */
export async function recordBatchProcessingTime(
  durationMs: number,
  dimensions?: MetricDimensions
): Promise<void> {
  await putMetric('BatchProcessingTime', durationMs, 'Milliseconds', dimensions);
}

/**
 * Lambda同時実行数メトリクス
 * Metric: LambdaConcurrentExecutions
 */
export async function recordLambdaConcurrentExecutions(
  count: number,
  dimensions?: MetricDimensions
): Promise<void> {
  await putMetric('LambdaConcurrentExecutions', count, 'Count', dimensions);
}

/**
 * データベース接続数メトリクス
 * Metric: DatabaseConnectionCount
 */
export async function recordDatabaseConnections(
  count: number,
  dimensions?: MetricDimensions
): Promise<void> {
  await putMetric('DatabaseConnectionCount', count, 'Count', dimensions);
}

/**
 * AI APIレイテンシメトリクス
 * Metric: AIAPILatency
 */
export async function recordAIAPILatency(
  latencyMs: number,
  dimensions?: MetricDimensions
): Promise<void> {
  await putMetric('AIAPILatency', latencyMs, 'Milliseconds', dimensions);
}

/**
 * リトライ回数メトリクス
 */
export async function recordRetryAttempt(dimensions?: MetricDimensions): Promise<void> {
  await putMetric('RetryAttempt', 1, 'Count', dimensions);
}

/**
 * 部分失敗メトリクス
 */
export async function recordPartialFailure(dimensions?: MetricDimensions): Promise<void> {
  await putMetric('PartialFailure', 1, 'Count', dimensions);
}

/**
 * 進捗更新メトリクス
 */
export async function recordProgressUpdate(
  progressPercentage: number,
  dimensions?: MetricDimensions
): Promise<void> {
  await putMetric('ProgressPercentage', progressPercentage, 'Percent', dimensions);
}

/**
 * メモリ使用量メトリクス
 */
export async function recordMemoryUsage(
  memoryMB: number,
  dimensions?: MetricDimensions
): Promise<void> {
  await putMetric('MemoryUsage', memoryMB, 'Megabytes', dimensions);
}

/**
 * エラー率メトリクス
 * Metric: WorkflowFailureRate (計算用)
 */
export async function recordErrorRate(
  errorRate: number,
  dimensions?: MetricDimensions
): Promise<void> {
  await putMetric('ErrorRate', errorRate, 'Percent', dimensions);
}

/**
 * スループットメトリクス
 */
export async function recordThroughput(
  actionsPerSecond: number,
  dimensions?: MetricDimensions
): Promise<void> {
  await putMetric('Throughput', actionsPerSecond, 'Count/Second', dimensions);
}

/**
 * バッチサイズメトリクス
 */
export async function recordBatchSize(
  batchSize: number,
  dimensions?: MetricDimensions
): Promise<void> {
  await putMetric('BatchSize', batchSize, 'Count', dimensions);
}

/**
 * 並列実行数メトリクス
 */
export async function recordConcurrentExecutions(
  count: number,
  dimensions?: MetricDimensions
): Promise<void> {
  await putMetric('ConcurrentExecutions', count, 'Count', dimensions);
}

/**
 * メトリクスバッチ送信
 * 複数のメトリクスを一度に送信してAPI呼び出しを削減
 */
export async function putMetricsBatch(
  metrics: Array<{
    name: string;
    value: number;
    unit: string;
    dimensions?: MetricDimensions;
  }>
): Promise<void> {
  const metricData: MetricDatum[] = metrics.map(metric => {
    const datum: MetricDatum = {
      MetricName: metric.name,
      Value: metric.value,
      Unit: metric.unit,
      Timestamp: new Date(),
    };

    if (metric.dimensions) {
      datum.Dimensions = Object.entries(metric.dimensions).map(([name, value]) => ({
        Name: name,
        Value: value,
      }));
    }

    return datum;
  });

  try {
    await cloudwatch.send(
      new PutMetricDataCommand({
        Namespace: NAMESPACE,
        MetricData: metricData,
      })
    );
  } catch (error) {
    console.error('Failed to put metrics batch:', error);
  }
}

/**
 * ワークフロー完了時の包括的メトリクス送信
 */
export async function recordWorkflowCompletionMetrics(context: {
  workflowType: string;
  goalId: string;
  userId: string;
  duration: number;
  success: boolean;
  actionCount: number;
  successCount: number;
  failedCount: number;
  retryCount: number;
}): Promise<void> {
  const dimensions: MetricDimensions = {
    WorkflowType: context.workflowType,
    GoalId: context.goalId,
    UserId: context.userId,
  };

  const metrics = [
    { name: 'WorkflowExecutionCount', value: 1, unit: 'Count' },
    { name: context.success ? 'WorkflowSuccess' : 'WorkflowFailure', value: 1, unit: 'Count' },
    { name: 'WorkflowDuration', value: context.duration, unit: 'Milliseconds' },
    { name: 'ActionProcessingCount', value: context.actionCount, unit: 'Count' },
    { name: 'ActionSuccessCount', value: context.successCount, unit: 'Count' },
    { name: 'ActionFailureCount', value: context.failedCount, unit: 'Count' },
    { name: 'RetryCount', value: context.retryCount, unit: 'Count' },
  ];

  await putMetricsBatch(
    metrics.map(m => ({
      ...m,
      dimensions,
    }))
  );
}
