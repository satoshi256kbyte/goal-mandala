import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

export interface AIGenerationLambdaConstructProps {
  /**
   * 環境名（local, dev, stg, prd）
   */
  readonly environment: string;

  /**
   * Lambda関数のコードパス
   */
  readonly codePath: string;

  /**
   * Lambda関数のハンドラー
   */
  readonly handler: string;

  /**
   * Bedrockモデルのリージョン
   * @default 'ap-northeast-1'
   */
  readonly bedrockRegion?: string;

  /**
   * Bedrockモデ��ID
   * @default 'amazon.nova-micro-v1:0'
   */
  readonly bedrockModelId?: string;

  /**
   * Lambda関数のメモリサイズ（MB）
   * @default 1024
   */
  readonly memorySize?: number;

  /**
   * Lambda関数のタイムアウト（秒）
   * @default 300 (5分)
   */
  readonly timeout?: number;

  /**
   * 同時実行数の制限
   * @default 10
   */
  readonly reservedConcurrentExecutions?: number;
}

/**
 * AI生成Lambda関数のコンストラクト
 * Amazon Bedrockを使用したAI生成機能を提供するLambda関数を作成
 */
export class AIGenerationLambdaConstruct extends Construct {
  /**
   * Lambda関数
   */
  public readonly function: lambda.Function;

  /**
   * Lambda実行ロール
   */
  public readonly role: iam.Role;

  constructor(scope: Construct, id: string, props: AIGenerationLambdaConstructProps) {
    super(scope, id);

    const bedrockRegion = props.bedrockRegion || 'ap-northeast-1';
    const bedrockModelId = props.bedrockModelId || 'amazon.nova-micro-v1:0';
    const memorySize = props.memorySize || 1024;
    const timeout = props.timeout || 300;
    const reservedConcurrentExecutions = props.reservedConcurrentExecutions || 10;

    // Lambda実行ロールの作成
    this.role = new iam.Role(this, 'AIGenerationLambdaRole', {
      roleName: `goal-mandala-${props.environment}-lambda-ai-generation-role`,
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      description: 'AI生成Lambda関数の実行ロール',
      managedPolicies: [
        // 基本的なLambda実行権限
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
    });

    // Bedrock呼び出し権限の付与（最小権限の原則）
    this.role.addToPolicy(
      new iam.PolicyStatement({
        sid: 'BedrockInvokeModelPermission',
        effect: iam.Effect.ALLOW,
        actions: ['bedrock:InvokeModel'],
        resources: [`arn:aws:bedrock:${bedrockRegion}::foundation-model/${bedrockModelId}`],
      })
    );

    // CloudWatch Logs権限の付与
    this.role.addToPolicy(
      new iam.PolicyStatement({
        sid: 'CloudWatchLogsPermission',
        effect: iam.Effect.ALLOW,
        actions: ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents'],
        resources: [
          `arn:aws:logs:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:log-group:/aws/lambda/goal-mandala-${props.environment}-ai-generation:*`,
        ],
      })
    );

    // Lambda関数の作成
    this.function = new lambda.Function(this, 'AIGenerationFunction', {
      functionName: `goal-mandala-${props.environment}-ai-generation`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: props.handler,
      code: lambda.Code.fromAsset(props.codePath),
      role: this.role,
      memorySize,
      timeout: cdk.Duration.seconds(timeout),
      reservedConcurrentExecutions,
      environment: {
        BEDROCK_MODEL_ID: bedrockModelId,
        BEDROCK_REGION: bedrockRegion,
        LOG_LEVEL: 'INFO',
        NODE_ENV: props.environment,
      },
      description: 'Amazon Bedrockを使用したAI生成機能',
      logRetention: logs.RetentionDays.ONE_MONTH,
    });

    // タグの追加
    cdk.Tags.of(this.function).add('Environment', props.environment);
    cdk.Tags.of(this.function).add('Service', 'AI Generation');
    cdk.Tags.of(this.function).add('ManagedBy', 'CDK');

    // 出力
    new cdk.CfnOutput(this, 'FunctionArn', {
      value: this.function.functionArn,
      description: 'AI生成Lambda関数のARN',
      exportName: `goal-mandala-${props.environment}-ai-generation-function-arn`,
    });

    new cdk.CfnOutput(this, 'FunctionName', {
      value: this.function.functionName,
      description: 'AI生成Lambda関数の名前',
      exportName: `goal-mandala-${props.environment}-ai-generation-function-name`,
    });

    new cdk.CfnOutput(this, 'RoleArn', {
      value: this.role.roleArn,
      description: 'AI生成Lambda実行ロールのARN',
      exportName: `goal-mandala-${props.environment}-ai-generation-role-arn`,
    });
  }

  /**
   * Lambda関数にVPCアクセス権限を付与
   */
  public grantVpcAccess(vpcId: string): void {
    this.role.addToPolicy(
      new iam.PolicyStatement({
        sid: 'VPCAccessPermission',
        effect: iam.Effect.ALLOW,
        actions: [
          'ec2:CreateNetworkInterface',
          'ec2:DescribeNetworkInterfaces',
          'ec2:DeleteNetworkInterface',
          'ec2:AssignPrivateIpAddresses',
          'ec2:UnassignPrivateIpAddresses',
        ],
        resources: ['*'],
        conditions: {
          StringEquals: {
            'ec2:Vpc': vpcId,
          },
        },
      })
    );
  }

  /**
   * Lambda関数にSecrets Managerアクセス権限を付与
   */
  public grantSecretsManagerAccess(secretArn: string): void {
    this.role.addToPolicy(
      new iam.PolicyStatement({
        sid: 'SecretsManagerAccessPermission',
        effect: iam.Effect.ALLOW,
        actions: ['secretsmanager:GetSecretValue'],
        resources: [secretArn],
      })
    );
  }

  /**
   * Lambda関数にDynamoDBアクセス権限を付与
   */
  public grantDynamoDBAccess(tableArn: string): void {
    this.role.addToPolicy(
      new iam.PolicyStatement({
        sid: 'DynamoDBAccessPermission',
        effect: iam.Effect.ALLOW,
        actions: [
          'dynamodb:GetItem',
          'dynamodb:PutItem',
          'dynamodb:UpdateItem',
          'dynamodb:Query',
          'dynamodb:Scan',
        ],
        resources: [tableArn, `${tableArn}/index/*`],
      })
    );
  }
}
