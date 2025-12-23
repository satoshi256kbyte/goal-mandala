import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../config/environment';

export interface WorkflowExecutionTableConstructProps {
  config: EnvironmentConfig;
}

/**
 * WorkflowExecution DynamoDB Table Construct
 *
 * ワークフロー実行履歴を管理するDynamoDBテーブル
 *
 * Requirements:
 * - 13.1: ワークフロー実行履歴の保存
 * - 13.5: 90日後の自動削除（TTL）
 * - 6.1-6.5: 進捗追跡
 */
export class WorkflowExecutionTableConstruct extends Construct {
  public readonly table: dynamodb.Table;

  constructor(scope: Construct, id: string, props: WorkflowExecutionTableConstructProps) {
    super(scope, id);

    const { config } = props;

    // WorkflowExecution Table
    this.table = new dynamodb.Table(this, 'WorkflowExecutionTable', {
      tableName: `${config.stackPrefix}-workflow-execution`,
      partitionKey: {
        name: 'executionArn',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST, // On-demand pricing
      encryption: dynamodb.TableEncryption.AWS_MANAGED, // AWS managed encryption
      pointInTimeRecovery: config.environment === 'production', // Enable PITR for production
      removalPolicy:
        config.environment === 'production' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      timeToLiveAttribute: 'ttl', // Requirement 13.5: TTL for 90 days
    });

    // GSI: goalId (Requirement 13.3: Filter by goal ID)
    this.table.addGlobalSecondaryIndex({
      indexName: 'goalId-index',
      partitionKey: {
        name: 'goalId',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'startDate',
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // GSI: userId (for user-specific queries)
    this.table.addGlobalSecondaryIndex({
      indexName: 'userId-index',
      partitionKey: {
        name: 'userId',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'startDate',
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // GSI: status (for status-based queries)
    this.table.addGlobalSecondaryIndex({
      indexName: 'status-index',
      partitionKey: {
        name: 'status',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'startDate',
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // Outputs
    new cdk.CfnOutput(this, 'TableName', {
      value: this.table.tableName,
      description: 'WorkflowExecution Table Name',
      exportName: `${config.stackPrefix}-workflow-execution-table-name`,
    });

    new cdk.CfnOutput(this, 'TableArn', {
      value: this.table.tableArn,
      description: 'WorkflowExecution Table ARN',
      exportName: `${config.stackPrefix}-workflow-execution-table-arn`,
    });
  }
}
