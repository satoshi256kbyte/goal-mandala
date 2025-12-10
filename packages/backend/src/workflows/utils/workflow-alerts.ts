/**
 * Step Functions ワークフロー用のアラート設定
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
 */

import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { logger } from '../../utils/logger';

/**
 * SNSクライアント
 */
const sns = new SNSClient({
  region: process.env.AWS_REGION || 'ap-northeast-1',
});

/**
 * SNSトピックARN（環境変数から取得）
 */
const WORKFLOW_NOTIFICATIONS_TOPIC_ARN = process.env.WORKFLOW_NOTIFICATIONS_TOPIC_ARN || '';

/**
 * アラート優先度
 */
export enum AlertPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

/**
 * アラートコンテキスト
 */
export interface AlertContext {
  executionArn: string;
  goalId: string;
  userId?: string;
  errorMessage?: string;
  errorCode?: string;
  failedActions?: string[];
  duration?: number;
  additionalInfo?: Record<string, unknown>;
}

/**
 * SNS通知を送信する
 */
async function sendSNSNotification(
  subject: string,
  message: string,
  priority: AlertPriority
): Promise<void> {
  if (!WORKFLOW_NOTIFICATIONS_TOPIC_ARN) {
    logger.warn('SNS topic ARN not configured, skipping notification');
    return;
  }

  try {
    await sns.send(
      new PublishCommand({
        TopicArn: WORKFLOW_NOTIFICATIONS_TOPIC_ARN,
        Subject: `[${priority}] ${subject}`,
        Message: message,
        MessageAttributes: {
          priority: {
            DataType: 'String',
            StringValue: priority,
          },
          timestamp: {
            DataType: 'String',
            StringValue: new Date().toISOString(),
          },
        },
      })
    );

    logger.info('SNS notification sent', {
      subject,
      priority,
    });
  } catch (error) {
    logger.error('Failed to send SNS notification', {
      error: error instanceof Error ? error.message : String(error),
      subject,
    });
  }
}

/**
 * アラートメッセージをフォーマットする
 */
function formatAlertMessage(context: AlertContext): string {
  const lines: string[] = [`Execution ARN: ${context.executionArn}`, `Goal ID: ${context.goalId}`];

  if (context.userId) {
    lines.push(`User ID: ${context.userId}`);
  }

  if (context.errorMessage) {
    lines.push(`Error: ${context.errorMessage}`);
  }

  if (context.errorCode) {
    lines.push(`Error Code: ${context.errorCode}`);
  }

  if (context.failedActions && context.failedActions.length > 0) {
    lines.push(`Failed Actions: ${context.failedActions.join(', ')}`);
  }

  if (context.duration !== undefined) {
    lines.push(`Duration: ${context.duration}ms`);
  }

  if (context.additionalInfo) {
    lines.push(`Additional Info: ${JSON.stringify(context.additionalInfo, null, 2)}`);
  }

  lines.push(`Timestamp: ${new Date().toISOString()}`);

  return lines.join('\n');
}

/**
 * ワークフロー失敗アラート
 * Requirement 8.1: WHEN a workflow fails THEN the system SHALL publish an SNS notification with failure details
 */
export async function sendWorkflowFailureAlert(context: AlertContext): Promise<void> {
  const subject = 'Workflow Execution Failed';
  const message = formatAlertMessage(context);

  await sendSNSNotification(subject, message, AlertPriority.HIGH);
}

/**
 * ワークフロータイムアウトアラート
 * Requirement 8.3: WHEN a workflow times out THEN the system SHALL send a high-priority alert
 */
export async function sendWorkflowTimeoutAlert(context: AlertContext): Promise<void> {
  const subject = 'Workflow Execution Timeout';
  const message = formatAlertMessage(context);

  await sendSNSNotification(subject, message, AlertPriority.HIGH);
}

/**
 * 複数アクション失敗エスカレーションアラート
 * Requirement 8.4: WHEN all retries fail for multiple actions THEN the system SHALL escalate the alert to the operations team
 */
export async function sendMultipleActionsFailureAlert(context: AlertContext): Promise<void> {
  const subject = 'Multiple Actions Failed - Escalation Required';
  const message = formatAlertMessage({
    ...context,
    additionalInfo: {
      ...context.additionalInfo,
      escalationReason: 'Multiple actions failed after all retries',
      actionRequired: 'Operations team intervention required',
    },
  });

  await sendSNSNotification(subject, message, AlertPriority.CRITICAL);
}

/**
 * 部分失敗アラート
 */
export async function sendPartialFailureAlert(context: AlertContext): Promise<void> {
  const subject = 'Workflow Partially Succeeded';
  const message = formatAlertMessage(context);

  await sendSNSNotification(subject, message, AlertPriority.MEDIUM);
}

/**
 * データベース接続エラーアラート
 */
export async function sendDatabaseConnectionErrorAlert(context: AlertContext): Promise<void> {
  const subject = 'Database Connection Error';
  const message = formatAlertMessage(context);

  await sendSNSNotification(subject, message, AlertPriority.HIGH);
}

/**
 * AI APIレイテンシ警告アラート
 */
export async function sendAIAPILatencyWarningAlert(context: AlertContext): Promise<void> {
  const subject = 'AI API Latency Warning';
  const message = formatAlertMessage({
    ...context,
    additionalInfo: {
      ...context.additionalInfo,
      threshold: '5 seconds',
      recommendation: 'Check AI service status and consider optimization',
    },
  });

  await sendSNSNotification(subject, message, AlertPriority.MEDIUM);
}

/**
 * Lambda同時実行数警告アラート
 */
export async function sendLambdaConcurrencyWarningAlert(context: AlertContext): Promise<void> {
  const subject = 'Lambda Concurrency Warning';
  const message = formatAlertMessage({
    ...context,
    additionalInfo: {
      ...context.additionalInfo,
      threshold: '80% of limit',
      recommendation: 'Consider increasing Lambda concurrency limit',
    },
  });

  await sendSNSNotification(subject, message, AlertPriority.MEDIUM);
}

/**
 * 実行時間警告アラート
 */
export async function sendExecutionTimeWarningAlert(context: AlertContext): Promise<void> {
  const subject = 'Workflow Execution Time Warning';
  const message = formatAlertMessage({
    ...context,
    additionalInfo: {
      ...context.additionalInfo,
      threshold: '10 minutes',
      recommendation: 'Monitor for potential timeout',
    },
  });

  await sendSNSNotification(subject, message, AlertPriority.LOW);
}

/**
 * 失敗率アラート
 * Requirement 8.2: WHEN the workflow failure rate exceeds 10% in a 5-minute window THEN the system SHALL trigger a CloudWatch alarm
 * Note: CloudWatch Alarmは CDK で設定されるため、ここではSNS通知のみ実装
 */
export async function sendFailureRateAlert(context: {
  failureRate: number;
  timeWindow: string;
  failedCount: number;
  totalCount: number;
}): Promise<void> {
  const subject = 'Workflow Failure Rate Exceeded Threshold';
  const message = [
    `Failure Rate: ${context.failureRate.toFixed(2)}%`,
    `Time Window: ${context.timeWindow}`,
    `Failed Executions: ${context.failedCount}`,
    `Total Executions: ${context.totalCount}`,
    `Threshold: 10%`,
    `Action Required: Investigate recent failures and check system health`,
    `Timestamp: ${new Date().toISOString()}`,
  ].join('\n');

  await sendSNSNotification(subject, message, AlertPriority.CRITICAL);
}

/**
 * システムヘルスチェック失敗アラート
 */
export async function sendSystemHealthCheckFailureAlert(context: {
  component: string;
  errorMessage: string;
  additionalInfo?: Record<string, unknown>;
}): Promise<void> {
  const subject = `System Health Check Failed: ${context.component}`;
  const message = [
    `Component: ${context.component}`,
    `Error: ${context.errorMessage}`,
    ...(context.additionalInfo
      ? [`Additional Info: ${JSON.stringify(context.additionalInfo, null, 2)}`]
      : []),
    `Timestamp: ${new Date().toISOString()}`,
  ].join('\n');

  await sendSNSNotification(subject, message, AlertPriority.CRITICAL);
}

/**
 * アラート送信のテスト用関数
 */
export async function sendTestAlert(): Promise<void> {
  const subject = 'Test Alert';
  const message = [
    'This is a test alert to verify SNS notification configuration.',
    `Timestamp: ${new Date().toISOString()}`,
  ].join('\n');

  await sendSNSNotification(subject, message, AlertPriority.LOW);
}

/**
 * アラート設定の検証
 */
export function validateAlertConfiguration(): {
  isConfigured: boolean;
  missingConfig: string[];
} {
  const missingConfig: string[] = [];

  if (!WORKFLOW_NOTIFICATIONS_TOPIC_ARN) {
    missingConfig.push('WORKFLOW_NOTIFICATIONS_TOPIC_ARN');
  }

  return {
    isConfigured: missingConfig.length === 0,
    missingConfig,
  };
}
