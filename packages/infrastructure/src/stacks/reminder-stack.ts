import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import { Construct } from 'constructs';
import { getEnvironmentConfig } from '../config/environment';

export interface ReminderStackProps extends cdk.StackProps {
  env: {
    region: string;
    account?: string;
  };
  databaseSecretArn: string;
  jwtSecretArn: string;
  alertEmail: string;
  fromEmail: string;
}

export class ReminderStack extends cdk.Stack {
  public readonly reminderFunction: lambda.Function;
  public readonly reminderRule: events.Rule;
  public readonly alertTopic: sns.Topic;

  constructor(scope: Construct, id: string, props: ReminderStackProps) {
    super(scope, id, props);

    // 環境名をスタック名から抽出（例: goal-mandala-dev-reminder → dev）
    const stackPrefix = id.split('-reminder')[0];
    const environmentMatch = stackPrefix.match(/-([^-]+)$/);
    const environment = environmentMatch ? environmentMatch[1] : 'dev';

    const config = getEnvironmentConfig(environment);

    // SNS Topic for alerts
    this.alertTopic = new sns.Topic(this, 'ReminderAlertTopic', {
      displayName: 'Reminder System Alerts',
      topicName: `${config.stackPrefix}-${environment}-reminder-alerts`,
    });

    this.alertTopic.addSubscription(new subscriptions.EmailSubscription(props.alertEmail));

    // CloudWatch Log Group
    const logGroup = new logs.LogGroup(this, 'ReminderLogGroup', {
      logGroupName: `/aws/lambda/${config.stackPrefix}-${environment}-reminder`,
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Reminder Lambda Function
    this.reminderFunction = new lambda.Function(this, 'ReminderFunction', {
      functionName: `${config.stackPrefix}-${environment}-reminder`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'reminder.handler',
      code: lambda.Code.fromAsset('../../packages/backend/dist'),
      timeout: cdk.Duration.minutes(5),
      memorySize: 512,
      environment: {
        NODE_ENV: environment,
        DATABASE_SECRET_ARN: props.databaseSecretArn,
        JWT_SECRET_ARN: props.jwtSecretArn,
        SES_REGION: config.region,
        FROM_EMAIL: props.fromEmail,
        ALERT_TOPIC_ARN: this.alertTopic.topicArn,
      },
      logGroup,
    });

    // Grant permissions to access Secrets Manager
    this.reminderFunction.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['secretsmanager:GetSecretValue'],
        resources: [props.databaseSecretArn, props.jwtSecretArn],
      })
    );

    // Grant permissions to send emails via SES
    this.reminderFunction.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['ses:SendEmail', 'ses:SendRawEmail'],
        resources: ['*'],
      })
    );

    // Grant permissions to publish to SNS
    this.alertTopic.grantPublish(this.reminderFunction);

    // EventBridge Rule for weekday 10:00 AM JST (01:00 UTC)
    this.reminderRule = new events.Rule(this, 'ReminderRule', {
      ruleName: `${config.stackPrefix}-${environment}-reminder-schedule`,
      description: 'Trigger reminder Lambda at 10:00 AM JST on weekdays',
      schedule: events.Schedule.cron({
        minute: '0',
        hour: '1', // 10:00 AM JST = 01:00 UTC
        weekDay: 'MON-FRI',
      }),
      enabled: environment === 'production', // Only enable in production
    });

    this.reminderRule.addTarget(
      new targets.LambdaFunction(this.reminderFunction, {
        retryAttempts: 2,
      })
    );

    // CloudWatch Alarms
    const errorAlarm = new cloudwatch.Alarm(this, 'ReminderErrorAlarm', {
      alarmName: `${config.stackPrefix}-${environment}-reminder-errors`,
      alarmDescription: 'Alert when reminder Lambda has high error rate',
      metric: this.reminderFunction.metricErrors({
        period: cdk.Duration.minutes(5),
        statistic: 'Sum',
      }),
      threshold: 5,
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
    });

    errorAlarm.addAlarmAction({
      bind: () => ({
        alarmActionArn: this.alertTopic.topicArn,
      }),
    });

    const durationAlarm = new cloudwatch.Alarm(this, 'ReminderDurationAlarm', {
      alarmName: `${config.stackPrefix}-${environment}-reminder-duration`,
      alarmDescription: 'Alert when reminder Lambda execution time is too long',
      metric: this.reminderFunction.metricDuration({
        period: cdk.Duration.minutes(5),
        statistic: 'Average',
      }),
      threshold: 240000, // 4 minutes (80% of 5 minute timeout)
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
    });

    durationAlarm.addAlarmAction({
      bind: () => ({
        alarmActionArn: this.alertTopic.topicArn,
      }),
    });

    // Custom Metrics for email delivery
    const emailSentMetric = new cloudwatch.Metric({
      namespace: `${config.stackPrefix}/Reminder`,
      metricName: 'EmailsSent',
      statistic: 'Sum',
      period: cdk.Duration.minutes(5),
    });

    const emailFailedMetric = new cloudwatch.Metric({
      namespace: `${config.stackPrefix}/Reminder`,
      metricName: 'EmailsFailed',
      statistic: 'Sum',
      period: cdk.Duration.minutes(5),
    });

    // Alarm for high email failure rate
    const emailFailureRateAlarm = new cloudwatch.Alarm(this, 'EmailFailureRateAlarm', {
      alarmName: `${config.stackPrefix}-${environment}-email-failure-rate`,
      alarmDescription: 'Alert when email failure rate exceeds 5%',
      metric: new cloudwatch.MathExpression({
        expression: '(failed / (sent + failed)) * 100',
        usingMetrics: {
          sent: emailSentMetric,
          failed: emailFailedMetric,
        },
        period: cdk.Duration.minutes(5),
      }),
      threshold: 5,
      evaluationPeriods: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
    });

    emailFailureRateAlarm.addAlarmAction({
      bind: () => ({
        alarmActionArn: this.alertTopic.topicArn,
      }),
    });

    // Outputs
    new cdk.CfnOutput(this, 'ReminderFunctionArn', {
      value: this.reminderFunction.functionArn,
      description: 'ARN of the Reminder Lambda Function',
      exportName: `${config.stackPrefix}-${environment}-reminder-function-arn`,
    });

    new cdk.CfnOutput(this, 'ReminderRuleArn', {
      value: this.reminderRule.ruleArn,
      description: 'ARN of the EventBridge Rule',
      exportName: `${config.stackPrefix}-${environment}-reminder-rule-arn`,
    });

    new cdk.CfnOutput(this, 'AlertTopicArn', {
      value: this.alertTopic.topicArn,
      description: 'ARN of the SNS Alert Topic',
      exportName: `${config.stackPrefix}-${environment}-alert-topic-arn`,
    });
  }
}
