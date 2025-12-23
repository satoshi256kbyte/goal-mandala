import * as cdk from 'aws-cdk-lib';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as cloudwatch_actions from 'aws-cdk-lib/aws-cloudwatch-actions';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../config/environment';

export interface WorkflowMonitoringConstructProps {
  config: EnvironmentConfig;
  stateMachine: sfn.StateMachine;
  notificationTopic: sns.Topic;
}

/**
 * Workflow Monitoring Construct
 *
 * CloudWatchメトリクスとアラームの設定
 *
 * Requirements:
 * - 7.1-7.5: ログとメトリクスの記録
 * - 8.2: 失敗率アラーム（10%超過）
 */
export class WorkflowMonitoringConstruct extends Construct {
  public readonly executionCountMetric: cloudwatch.Metric;
  public readonly successRateMetric: cloudwatch.Metric;
  public readonly durationMetric: cloudwatch.Metric;
  public readonly failureRateMetric: cloudwatch.Metric;
  public readonly failureRateAlarm: cloudwatch.Alarm;
  public readonly timeoutAlarm: cloudwatch.Alarm;

  constructor(scope: Construct, id: string, props: WorkflowMonitoringConstructProps) {
    super(scope, id);

    const { config, stateMachine, notificationTopic } = props;

    // Metric: Workflow Execution Count (Requirement 7.5)
    this.executionCountMetric = new cloudwatch.Metric({
      namespace: `${config.stackPrefix}/Workflow`,
      metricName: 'ExecutionCount',
      statistic: 'Sum',
      period: cdk.Duration.minutes(5),
      label: 'Workflow Execution Count',
    });

    // Metric: Workflow Success Rate (Requirement 7.5)
    this.successRateMetric = new cloudwatch.Metric({
      namespace: `${config.stackPrefix}/Workflow`,
      metricName: 'SuccessRate',
      statistic: 'Average',
      period: cdk.Duration.minutes(5),
      label: 'Workflow Success Rate',
      unit: cloudwatch.Unit.PERCENT,
    });

    // Metric: Workflow Duration (Requirement 7.5)
    this.durationMetric = new cloudwatch.Metric({
      namespace: `${config.stackPrefix}/Workflow`,
      metricName: 'Duration',
      statistic: 'Average',
      period: cdk.Duration.minutes(5),
      label: 'Workflow Duration',
      unit: cloudwatch.Unit.SECONDS,
    });

    // Metric: Workflow Failure Rate (Requirement 7.5)
    this.failureRateMetric = new cloudwatch.Metric({
      namespace: `${config.stackPrefix}/Workflow`,
      metricName: 'FailureRate',
      statistic: 'Average',
      period: cdk.Duration.minutes(5),
      label: 'Workflow Failure Rate',
      unit: cloudwatch.Unit.PERCENT,
    });

    // Alarm: High Failure Rate (Requirement 8.2)
    // Trigger when failure rate exceeds 10% in a 5-minute window
    this.failureRateAlarm = new cloudwatch.Alarm(this, 'HighFailureRateAlarm', {
      alarmName: `${config.stackPrefix}-workflow-high-failure-rate`,
      alarmDescription: 'Workflow failure rate exceeds 10% in a 5-minute window',
      metric: this.failureRateMetric,
      threshold: 10, // 10%
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    // Add SNS action to alarm
    this.failureRateAlarm.addAlarmAction(new cloudwatch_actions.SnsAction(notificationTopic));

    // Alarm: Workflow Timeout (Requirement 8.3)
    // Use Step Functions built-in metrics
    const executionTimeMetric = stateMachine.metricTime({
      statistic: 'Maximum',
      period: cdk.Duration.minutes(5),
    });

    this.timeoutAlarm = new cloudwatch.Alarm(this, 'WorkflowTimeoutAlarm', {
      alarmName: `${config.stackPrefix}-workflow-timeout`,
      alarmDescription: 'Workflow execution time exceeds 10 minutes',
      metric: executionTimeMetric,
      threshold: 600000, // 10 minutes in milliseconds
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    // Add SNS action to timeout alarm (high priority)
    this.timeoutAlarm.addAlarmAction(new cloudwatch_actions.SnsAction(notificationTopic));

    // Alarm: Execution Failed
    const executionFailedMetric = stateMachine.metricFailed({
      statistic: 'Sum',
      period: cdk.Duration.minutes(5),
    });

    const executionFailedAlarm = new cloudwatch.Alarm(this, 'ExecutionFailedAlarm', {
      alarmName: `${config.stackPrefix}-workflow-execution-failed`,
      alarmDescription: 'Workflow execution failed',
      metric: executionFailedMetric,
      threshold: 1,
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    executionFailedAlarm.addAlarmAction(new cloudwatch_actions.SnsAction(notificationTopic));

    // Alarm: Execution Timed Out
    const executionTimedOutMetric = stateMachine.metricTimedOut({
      statistic: 'Sum',
      period: cdk.Duration.minutes(5),
    });

    const executionTimedOutAlarm = new cloudwatch.Alarm(this, 'ExecutionTimedOutAlarm', {
      alarmName: `${config.stackPrefix}-workflow-execution-timed-out`,
      alarmDescription: 'Workflow execution timed out',
      metric: executionTimedOutMetric,
      threshold: 1,
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    executionTimedOutAlarm.addAlarmAction(new cloudwatch_actions.SnsAction(notificationTopic));

    // Dashboard
    const dashboard = new cloudwatch.Dashboard(this, 'WorkflowDashboard', {
      dashboardName: `${config.stackPrefix}-workflow-monitoring`,
    });

    // Add widgets to dashboard
    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'Workflow Execution Count',
        left: [this.executionCountMetric],
        width: 12,
      }),
      new cloudwatch.GraphWidget({
        title: 'Workflow Success Rate',
        left: [this.successRateMetric],
        width: 12,
      })
    );

    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'Workflow Duration',
        left: [this.durationMetric],
        width: 12,
      }),
      new cloudwatch.GraphWidget({
        title: 'Workflow Failure Rate',
        left: [this.failureRateMetric],
        width: 12,
      })
    );

    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'Step Functions Metrics',
        left: [
          stateMachine.metricStarted(),
          stateMachine.metricSucceeded(),
          stateMachine.metricFailed(),
          stateMachine.metricTimedOut(),
          stateMachine.metricAborted(),
        ],
        width: 24,
      })
    );

    // Outputs
    new cdk.CfnOutput(this, 'DashboardUrl', {
      value: `https://console.aws.amazon.com/cloudwatch/home?region=${config.region}#dashboards:name=${dashboard.dashboardName}`,
      description: 'CloudWatch Dashboard URL',
    });
  }
}
