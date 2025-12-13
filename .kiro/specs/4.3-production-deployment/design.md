# 本番環境デプロイ 設計書

## アーキテクチャ概要

本番環境は、AWS上にサーバーレスアーキテクチャで構築します。高可用性、セキュリティ、コスト最適化を重視した設計とします。

```mermaid
graph TB
    subgraph "ユーザー"
        User[エンドユーザー]
    end

    subgraph "AWS Cloud - Production"
        subgraph "CloudFront"
            CF[CloudFront Distribution]
        end

        subgraph "S3"
            S3[S3 Bucket<br/>フロントエンド]
        end

        subgraph "API Gateway"
            APIGW[API Gateway<br/>REST API]
        end

        subgraph "Lambda Functions"
            Lambda1[認証API]
            Lambda2[目標管理API]
            Lambda3[タスク管理API]
            Lambda4[振り返りAPI]
            Lambda5[AI統合API]
        end

        subgraph "Step Functions"
            SF[Task Generation<br/>Workflow]
        end

        subgraph "VPC"
            subgraph "Private Subnet"
                Aurora[Aurora Serverless V2<br/>Multi-AZ]
            end
        end

        subgraph "Secrets Manager"
            SM[Secrets Manager<br/>機密情報]
        end

        subgraph "CloudWatch"
            CW[CloudWatch<br/>Logs & Metrics]
            CWD[CloudWatch<br/>Dashboards]
            CWA[CloudWatch<br/>Alarms]
        end

        subgraph "SNS"
            SNS[SNS Topic<br/>アラート通知]
        end

        subgraph "X-Ray"
            XRay[X-Ray<br/>トレーシング]
        end

        subgraph "CloudTrail"
            CT[CloudTrail<br/>監査ログ]
        end
    end

    subgraph "External Services"
        Slack[Slack<br/>通知]
        Bedrock[Amazon Bedrock<br/>AI API]
    end

    User -->|HTTPS| CF
    CF -->|Cache| S3
    CF -->|API Request| APIGW
    APIGW --> Lambda1
    APIGW --> Lambda2
    APIGW --> Lambda3
    APIGW --> Lambda4
    APIGW --> Lambda5
    Lambda1 --> Aurora
    Lambda2 --> Aurora
    Lambda3 --> Aurora
    Lambda4 --> Aurora
    Lambda5 --> SF
    SF --> Bedrock
    SF --> Aurora
    Lambda1 --> SM
    Lambda2 --> SM
    Lambda3 --> SM
    Lambda4 --> SM
    Lambda5 --> SM
    Lambda1 --> CW
    Lambda2 --> CW
    Lambda3 --> C
Wambda4 --> CW
    Lambda5 --> CW
    SF --> CW
    CW --> CWD
    CW --> CWA
    CWA --> SNS
    SNS --> Slack
    Lambda1 --> XRay
    Lambda2 --> XRay
    Lambda3 --> XRay
    Lambda4 --> XRay
    Lambda5 --> XRay
    APIGW --> XRay
    APIGW --> CT
    Lambda1 --> CT
    Lambda2 --> CT
    Lambda3 --> CT
    Lambda4 --> CT
    Lambda5 --> CT
```

## CDKスタック設計

### スタック構成

本番環境は以下のCDKスタックで構成します：

```typescript
// cdk/bin/app.ts
const app = new cdk.App();

// 本番環境スタック
const productionStack = new ProductionStack(app, 'GoalMandalaProductionStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: 'ap-northeast-1',
  },
  stage: 'production',
});
```

### ProductionStack構成

```typescript
export class ProductionStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ProductionStackProps) {
    super(scope, id, props);

    // 1. VPC
    const vpc = this.createVpc();

    // 2. Aurora Serverless V2
    const database = this.createDatabase(vpc);

    // 3. Secrets Manager
    const secrets = this.createSecrets();

    // 4. Lambda Functions
    const lambdaFunctions = this.createLambdaFunctions(vpc, database, secrets);

    // 5. API Gateway
    const api = this.createApiGateway(lambdaFunctions);

    // 6. Step Functions
    const stateMachine = this.createStepFunctions(lambdaFunctions);

    // 7. S3 + CloudFront
    const distribution = this.createCloudFront();

    // 8. CloudWatch Monitoring
    this.createMonitoring(lambdaFunctions, api, database, stateMachine);

    // 9. CloudTrail
    this.createCloudTrail();

    // 10. Outputs
    this.createOutputs(api, distribution);
  }
}
```

## ネットワーク設計

### VPC構成

```typescript
private createVpc(): ec2.Vpc {
  return new ec2.Vpc(this, 'ProductionVpc', {
    vpcName: 'goal-mandala-production-vpc',
    cidr: '10.0.0.0/16',
    maxAzs: 2,
    natGateways: 1, // コスト最適化
    subnetConfiguration: [
      {
        name: 'Public',
        subnetType: ec2.SubnetType.PUBLIC,
        cidrMask: 24,
      },
      {
        name: 'Private',
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        cidrMask: 24,
      },
    ],
  });
}
```

### セキュリティグループ

```typescript
// Lambda用セキュリティグループ
const lambdaSg = new ec2.SecurityGroup(this, 'LambdaSecurityGroup', {
  vpc,
  securityGroupName: 'goal-mandala-production-lambda-sg',
  description: 'Security group for Lambda functions',
  allowAllOutbound: true,
});

// データベース用セキュリティグループ
const dbSg = new ec2.SecurityGroup(this, 'DatabaseSecurityGroup', {
  vpc,
  securityGroupName: 'goal-mandala-production-db-sg',
  description: 'Security group for Aurora database',
  allowAllOutbound: false,
});

// Lambda → データベース接続を許可
dbSg.addIngressRule(
  lambdaSg,
  ec2.Port.tcp(5432),
  'Allow Lambda to access database'
);
```

## データベース設計

### Aurora Serverless V2設定

```typescript
private createDatabase(vpc: ec2.Vpc): rds.DatabaseCluster {
  const dbCluster = new rds.DatabaseCluster(this, 'ProductionDatabase', {
    engine: rds.DatabaseClusterEngine.auroraPostgres({
      version: rds.AuroraPostgresEngineVersion.VER_15_3,
    }),
    clusterIdentifier: 'goal-mandala-production-db',
    writer: rds.ClusterInstance.serverlessV2('writer', {
      autoMinorVersionUpgrade: true,
    }),
    readers: [
      rds.ClusterInstance.serverlessV2('reader', {
        scaleWithWriter: true,
      }),
    ],
    serverlessV2MinCapacity: 0.5,
    serverlessV2MaxCapacity: 2.0,
    vpc,
    vpcSubnets: {
      subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
    },
    securityGroups: [dbSg],
    backup: {
      retention: cdk.Duration.days(7),
      preferredWindow: '03:00-04:00',
    },
    storageEncrypted: true,
    storageEncryptionKey: kmsKey,
    deletionProtection: true,
    removalPolicy: cdk.RemovalPolicy.RETAIN,
  });

  return dbCluster;
}
```

## Lambda関数設計

### 共通設定

```typescript
const commonLambdaProps = {
  runtime: lambda.Runtime.NODEJS_18_X,
  memorySize: 512,
  timeout: cdk.Duration.seconds(30),
  vpc,
  vpcSubnets: {
    subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
  },
  securityGroups: [lambdaSg],
  tracing: lambda.Tracing.ACTIVE, // X-Ray有効化
  environment: {
    NODE_ENV: 'production',
    DATABASE_SECRET_ARN: secrets.databaseSecret.secretArn,
    JWT_SECRET_ARN: secrets.jwtSecret.secretArn,
  },
  logRetention: logs.RetentionDays.ONE_MONTH,
};
```

### 個別Lambda関数

```typescript
// 認証API
const authFunction = new lambda.Function(this, 'AuthFunction', {
  ...commonLambdaProps,
  functionName: 'goal-mandala-production-auth',
  code: lambda.Code.fromAsset('packages/backend/dist/auth'),
  handler: 'index.handler',
});

// 目標管理API
const goalFunction = new lambda.Function(this, 'GoalFunction', {
  ...commonLambdaProps,
  functionName: 'goal-mandala-production-goal',
  code: lambda.Code.fromAsset('packages/backend/dist/goal'),
  handler: 'index.handler',
});

// タスク管理API
const taskFunction = new lambda.Function(this, 'TaskFunction', {
  ...commonLambdaProps,
  functionName: 'goal-mandala-production-task',
  code: lambda.Code.fromAsset('packages/backend/dist/task'),
  handler: 'index.handler',
});

// 振り返りAPI
const reflectionFunction = new lambda.Function(this, 'ReflectionFunction', {
  ...commonLambdaProps,
  functionName: 'goal-mandala-production-reflection',
  code: lambda.Code.fromAsset('packages/backend/dist/reflection'),
  handler: 'index.handler',
});

// AI統合API
const aiFunction = new lambda.Function(this, 'AIFunction', {
  ...commonLambdaProps,
  functionName: 'goal-mandala-production-ai',
  code: lambda.Code.fromAsset('packages/backend/dist/ai'),
  handler: 'index.handler',
  timeout: cdk.Duration.seconds(900), // 15分
});
```

## API Gateway設計

```typescript
private createApiGateway(lambdaFunctions: LambdaFunctions): apigateway.RestApi {
  const api = new apigateway.RestApi(this, 'ProductionApi', {
    restApiName: 'goal-mandala-production-api',
    description: 'Goal Mandala Production API',
    deployOptions: {
      stageName: 'v1',
      tracingEnabled: true, // X-Ray有効化
      loggingLevel: apigateway.MethodLoggingLevel.INFO,
      dataTraceEnabled: true,
      metricsEnabled: true,
    },
    defaultCorsPreflightOptions: {
      allowOrigins: apigateway.Cors.ALL_ORIGINS,
      allowMethods: apigateway.Cors.ALL_METHODS,
      allowHeaders: ['Content-Type', 'Authorization'],
    },
  });

  // エンドポイント定義
  const auth = api.root.addResource('auth');
  auth.addMethod('POST', new apigateway.LambdaIntegration(lambdaFunctions.auth));

  const goals = api.root.addResource('goals');
  goals.addMethod('GET', new apigateway.LambdaIntegration(lambdaFunctions.goal));
  goals.addMethod('POST', new apigateway.LambdaIntegration(lambdaFunctions.goal));

  const goal = goals.addResource('{goalId}');
  goal.addMethod('GET', new apigateway.LambdaIntegration(lambdaFunctions.goal));
  goal.addMethod('PUT', new apigateway.LambdaIntegration(lambdaFunctions.goal));
  goal.addMethod('DELETE', new apigateway.LambdaIntegration(lambdaFunctions.goal));

  // ... 他のエンドポイント

  return api;
}
```

## CloudFront + S3設計

```typescript
private createCloudFront(): cloudfront.Distribution {
  // S3バケット
  const websiteBucket = new s3.Bucket(this, 'WebsiteBucket', {
    bucketName: 'goal-mandala-production-website',
    encryption: s3.BucketEncryption.S3_MANAGED,
    blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
    removalPolicy: cdk.RemovalPolicy.RETAIN,
  });

  // CloudFront OAI
  const oai = new cloudfront.OriginAccessIdentity(this, 'OAI', {
    comment: 'OAI for Goal Mandala Production',
  });

  websiteBucket.grantRead(oai);

  // CloudFront Distribution
  const distribution = new cloudfront.Distribution(this, 'Distribution', {
    defaultBehavior: {
      origin: new origins.S3Origin(websiteBucket, {
        originAccessIdentity: oai,
      }),
      viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      compress: true,
    },
    defaultRootObject: 'index.html',
    errorResponses: [
      {
        httpStatus: 404,
        responseHttpStatus: 200,
        responsePagePath: '/index.html',
        ttl: cdk.Duration.minutes(5),
      },
      {
        httpStatus: 403,
        responseHttpStatus: 200,
        responsePagePath: '/index.html',
        ttl: cdk.Duration.minutes(5),
      },
    ],
    priceClass: cloudfront.PriceClass.PRICE_CLASS_200,
  });

  return distribution;
}
```

## 監視・アラート設計

### CloudWatch Dashboards

```typescript
private createMonitoring(
  lambdaFunctions: LambdaFunctions,
  api: apigateway.RestApi,
  database: rds.DatabaseCluster,
  stateMachine: sfn.StateMachine
): void {
  const dashboard = new cloudwatch.Dashboard(this, 'ProductionDashboard', {
    dashboardName: 'goal-mandala-production',
  });

  // API メトリクス
  dashboard.addWidgets(
    new cloudwatch.GraphWidget({
      title: 'API Requests',
      left: [api.metricCount()],
      right: [api.metric4XXError(), api.metric5XXError()],
    })
  );

  // Lambda メトリクス
  dashboard.addWidgets(
    new cloudwatch.GraphWidget({
      title: 'Lambda Invocations',
      left: [
        lambdaFunctions.auth.metricInvocations(),
        lambdaFunctions.goal.metricInvocations(),
        lambdaFunctions.task.metricInvocations(),
      ],
    })
  );

  // データベース メトリクス
  dashboard.addWidgets(
    new cloudwatch.GraphWidget({
      title: 'Database Connections',
      left: [database.metricDatabaseConnections()],
    })
  );

  // Step Functions メトリクス
  dashboard.addWidgets(
    new cloudwatch.GraphWidget({
      title: 'Step Functions Executions',
      left: [
        stateMachine.metricStarted(),
        stateMachine.metricSucceeded(),
        stateMachine.metricFailed(),
      ],
    })
  );
}
```

### CloudWatch Alarms

```typescript
// API エラー率アラーム
const apiErrorAlarm = new cloudwatch.Alarm(this, 'ApiErrorAlarm', {
  alarmName: 'goal-mandala-production-api-error-rate',
  metric: api.metric5XXError({
    statistic: 'Average',
    period: cdk.Duration.minutes(5),
  }),
  threshold: 5,
  evaluationPeriods: 2,
  comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
});

// Lambda エラー率アラーム
const lambdaErrorAlarm = new cloudwatch.Alarm(this, 'LambdaErrorAlarm', {
  alarmName: 'goal-mandala-production-lambda-error-rate',
  metric: lambdaFunctions.auth.metricErrors({
    statistic: 'Sum',
    period: cdk.Duration.minutes(5),
  }),
  threshold: 10,
  evaluationPeriods: 2,
  comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
});

// データベース接続エラーアラーム
const dbConnectionAlarm = new cloudwatch.Alarm(this, 'DbConnectionAlarm', {
  alarmName: 'goal-mandala-production-db-connection-error',
  metric: database.metricDatabaseConnections({
    statistic: 'Maximum',
    period: cdk.Duration.minutes(5),
  }),
  threshold: 45,
  evaluationPeriods: 2,
  comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
});

// SNS Topic
const alertTopic = new sns.Topic(this, 'AlertTopic', {
  topicName: 'goal-mandala-production-alerts',
  displayName: 'Goal Mandala Production Alerts',
});

// Slack統合（Lambda経由）
const slackNotificationFunction = new lambda.Function(this, 'SlackNotificationFunction', {
  runtime: lambda.Runtime.NODEJS_18_X,
  handler: 'index.handler',
  code: lambda.Code.fromAsset('packages/backend/dist/slack-notification'),
  environment: {
    SLACK_WEBHOOK_URL: secrets.slackWebhookUrl.secretValueFromJson('url').toString(),
  },
});

alertTopic.addSubscription(new subscriptions.LambdaSubscription(slackNotificationFunction));

// アラームをSNSに接続
apiErrorAlarm.addAlarmAction(new cloudwatchActions.SnsAction(alertTopic));
lambdaErrorAlarm.addAlarmAction(new cloudwatchActions.SnsAction(alertTopic));
dbConnectionAlarm.addAlarmAction(new cloudwatchActions.SnsAction(alertTopic));
```

## CI/CDパイプライン設計

### GitHub Actionsワークフロー

```yaml
# .github/workflows/deploy-production.yml
name: Deploy to Production

on:
  push:
    branches:
      - main
  workflow_dispatch:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '23.10.0'
          cache: 'pnpm'
      
      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: '8.15.0'
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Run tests
        run: pnpm test
      
      - name: Run lint
        run: pnpm lint
      
      - name: Run type-check
        run: pnpm type-check

  deploy:
    needs: test
    runs-on: ubuntu-latest
    environment:
      name: production
      url: https://goal-mandala.example.com
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ap-northeast-1
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '23.10.0'
          cache: 'pnpm'
      
      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: '8.15.0'
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Build
        run: pnpm build
      
      - name: Deploy CDK
        run: |
          cd packages/infrastructure
          pnpm cdk deploy GoalMandalaProductionStack --require-approval never
      
      - name: Deploy Frontend
        run: |
          aws s3 sync packages/frontend/dist s3://goal-mandala-production-website --delete
          aws cloudfront create-invalidation --distribution-id ${{ secrets.CLOUDFRONT_DISTRIBUTION_ID }} --paths "/*"
      
      - name: Verify Deployment
        run: |
          curl -f https://goal-mandala.example.com/health || exit 1
      
      - name: Notify Slack
        if: always()
        uses: slackapi/slack-github-action@v1
        with:
          webhook-url: ${{ secrets.SLACK_WEBHOOK_URL }}
          payload: |
            {
              "text": "Production deployment ${{ job.status }}: ${{ github.sha }}"
            }
```

### ロールバックワークフロー

```yaml
# .github/workflows/rollback-production.yml
name: Rollback Production

on:
  workflow_dispatch:
    inputs:
      version:
        description: 'Version to rollback to'
        required: true

jobs:
  rollback:
    runs-on: ubuntu-latest
    environment:
      name: production
    
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ github.event.inputs.version }}
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ap-northeast-1
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '23.10.0'
          cache: 'pnpm'
      
      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: '8.15.0'
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Build
        run: pnpm build
      
      - name: Rollback CDK
        run: |
          cd packages/infrastructure
          pnpm cdk deploy GoalMandalaProductionStack --require-approval never
      
      - name: Rollback Frontend
        run: |
          aws s3 sync packages/frontend/dist s3://goal-mandala-production-website --delete
          aws cloudfront create-invalidation --distribution-id ${{ secrets.CLOUDFRONT_DISTRIBUTION_ID }} --paths "/*"
      
      - name: Verify Rollback
        run: |
          curl -f https://goal-mandala.example.com/health || exit 1
      
      - name: Notify Slack
        if: always()
        uses: slackapi/slack-github-action@v1
        with:
          webhook-url: ${{ secrets.SLACK_WEBHOOK_URL }}
          payload: |
            {
              "text": "Production rollback to ${{ github.event.inputs.version }}: ${{ job.status }}"
            }
```

## セキュリティ設計

### IAMロール・ポリシー

```typescript
// Lambda実行ロール
const lambdaRole = new iam.Role(this, 'LambdaExecutionRole', {
  roleName: 'goal-mandala-production-lambda-role',
  assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
  managedPolicies: [
    iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaVPCAccessExecutionRole'),
    iam.ManagedPolicy.fromAwsManagedPolicyName('AWSXRayDaemonWriteAccess'),
  ],
  inlinePolicies: {
    SecretsManagerAccess: new iam.PolicyDocument({
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ['secretsmanager:GetSecretValue'],
          resources: [
            secrets.databaseSecret.secretArn,
            secrets.jwtSecret.secretArn,
          ],
        }),
      ],
    }),
    CloudWatchLogsAccess: new iam.PolicyDocument({
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            'logs:CreateLogGroup',
            'logs:CreateLogStream',
            'logs:PutLogEvents',
          ],
          resources: ['arn:aws:logs:*:*:*'],
        }),
      ],
    }),
  },
});
```

### CloudTrail設定

```typescript
private createCloudTrail(): void {
  const trailBucket = new s3.Bucket(this, 'CloudTrailBucket', {
    bucketName: 'goal-mandala-production-cloudtrail',
    encryption: s3.BucketEncryption.S3_MANAGED,
    blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
    lifecycleRules: [
      {
        expiration: cdk.Duration.days(90),
      },
    ],
    removalPolicy: cdk.RemovalPolicy.RETAIN,
  });

  const trail = new cloudtrail.Trail(this, 'CloudTrail', {
    trailName: 'goal-mandala-production-trail',
    bucket: trailBucket,
    includeGlobalServiceEvents: true,
    isMultiRegionTrail: true,
    enableFileValidation: true,
    sendToCloudWatchLogs: true,
  });

  // 管理イベントを記録
  trail.logAllLambdaDataEvents();
  trail.logAllS3DataEvents();
}
```

## コスト最適化設計

### リソース最適化

1. **Aurora Serverless V2**
   - 最小ACU: 0.5（低負荷時のコスト削減）
   - 最大ACU: 2.0（高負荷時の性能確保）
   - 自動スケーリング

2. **Lambda**
   - 予約済み同時実行数を使用しない
   - メモリサイズを最適化（512MB）
   - タイムアウトを適切に設定

3. **NAT Gateway**
   - 1つのNAT Gatewayのみ使用
   - Multi-AZではなくSingle-AZ

4. **CloudFront**
   - キャッシュを最大限活用
   - Price Class 200（アジア・北米・ヨーロッパ）

### コスト監視

```typescript
// 予算アラート
const budget = new budgets.CfnBudget(this, 'MonthlyBudget', {
  budget: {
    budgetName: 'goal-mandala-production-monthly',
    budgetLimit: {
      amount: 100,
      unit: 'USD',
    },
    timeUnit: 'MONTHLY',
    budgetType: 'COST',
  },
  notificationsWithSubscribers: [
    {
      notification: {
        notificationType: 'ACTUAL',
        comparisonOperator: 'GREATER_THAN',
        threshold: 80,
      },
      subscribers: [
        {
          subscriptionType: 'EMAIL',
          address: 'admin@example.com',
        },
      ],
    },
  ],
});
```

## デプロイ戦略

### Blue-Green Deployment

本番環境では、Blue-Green Deploymentを採用します：

1. **Blue環境**: 現在稼働中の環境
2. **Green環境**: 新しいバージョンをデプロイする環境
3. **切り替え**: CloudFrontのオリジンを切り替え
4. **ロールバック**: 問題発生時はBlue環境に戻す

### カナリアデプロイ

Lambda関数では、カナリアデプロイを採用します：

```typescript
const alias = new lambda.Alias(this, 'ProductionAlias', {
  aliasName: 'production',
  version: lambdaFunction.currentVersion,
});

new codedeploy.LambdaDeploymentGroup(this, 'DeploymentGroup', {
  alias,
  deploymentConfig: codedeploy.LambdaDeploymentConfig.CANARY_10PERCENT_5MINUTES,
  alarms: [lambdaErrorAlarm],
});
```

## まとめ

本番環境デプロイ設計では、以下の点を重視しました：

1. **高可用性**: Multi-AZ構成、自動フェイルオーバー
2. **セキュリティ**: 暗号化、最小権限、監査ログ
3. **コスト最適化**: Serverless、Auto Scaling、適切なリソースサイズ
4. **監視・アラート**: CloudWatch、X-Ray、SNS通知
5. **自動化**: CI/CD、Infrastructure as Code
6. **安全なデプロイ**: Blue-Green、カナリアデプロイ、ロールバック機能

この設計に基づいて実装することで、安全で信頼性の高い本番環境を構築できます。

  