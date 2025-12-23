import * as cdk from 'aws-cdk-lib';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../config/environment';

export interface WorkflowNotificationConstructProps {
  config: EnvironmentConfig;
  notificationEmail?: string;
}

/**
 * Workflow Notification Construct
 *
 * SNSトピックとサブスクリプションの設定
 *
 * Requirements:
 * - 8.1: ワークフロー失敗時のSNS通知
 * - 8.3: タイムアウト時の高優先度アラート
 * - 8.4: 複数アクション失敗時のエスカレーション
 */
export class WorkflowNotificationConstruct extends Construct {
  public readonly topic: sns.Topic;

  constructor(scope: Construct, id: string, props: WorkflowNotificationConstructProps) {
    super(scope, id);

    const { config, notificationEmail } = props;

    // SNS Topic for workflow notifications
    this.topic = new sns.Topic(this, 'WorkflowNotificationTopic', {
      topicName: `${config.stackPrefix}-workflow-notifications`,
      displayName: 'Task Generation Workflow Notifications',
      fifo: false,
    });

    // Add email subscription if provided
    if (notificationEmail) {
      this.topic.addSubscription(new subscriptions.EmailSubscription(notificationEmail));
    }

    // Outputs
    new cdk.CfnOutput(this, 'TopicArn', {
      value: this.topic.topicArn,
      description: 'Workflow Notification Topic ARN',
      exportName: `${config.stackPrefix}-workflow-notification-topic-arn`,
    });

    new cdk.CfnOutput(this, 'TopicName', {
      value: this.topic.topicName,
      description: 'Workflow Notification Topic Name',
      exportName: `${config.stackPrefix}-workflow-notification-topic-name`,
    });
  }
}
