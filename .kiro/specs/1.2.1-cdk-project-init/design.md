# 設計書

## 概要

AWS CDKプロジェクトをモノレポ構成内に初期化し、環境別スタック管理とCI/CD統合を実現する設計を行います。packages/infrastructureディレクトリにCDKプロジェクトを配置し、標準的なAWS開発パターンに従った構成を構築します。

## アーキテクチャ

### プロジェクト構造

```
packages/infrastructure/
├── src/
│   ├── config/
│   │   ├── constants.ts          # 定数定義
│   │   ├── environment.ts        # 環境別設定
│   │   └── index.ts              # 設定エクスポート
│   ├── constructs/
│   │   ├── database-construct.ts # データベース関連コンストラクト
│   │   ├── lambda-construct.ts   # Lambda関連コンストラクト
│   │   └── index.ts              # コンストラクトエクスポート
│   ├── stacks/
│   │   ├── api-stack.ts          # API関連スタック
│   │   ├── database-stack.ts     # データベーススタック
│   │   ├── frontend-stack.ts     # フロントエンド配信スタック
│   │   └── index.ts              # スタックエクスポート
│   └── index.ts                  # CDKアプリケーションエントリーポイント
├── config/
│   ├── local.json               # ローカル環境設定
│   ├── dev.json                 # 開発環境設定
│   ├── stg.json                 # ステージング環境設定
│   └── prod.json                # 本番環境設定
├── cdk.json                     # CDK設定ファイル
├── package.json                 # パッケージ定義
├── tsconfig.json               # TypeScript設定
└── jest.config.js              # テスト設定
```

### 環境別スタック設計

#### スタック命名規約

AWS命名規約に従い、以下の形式でスタック名を定義：

```
{サービス名}-{環境名}-{スタック種別}
```

例：

- `goal-mandala-dev-database`
- `goal-mandala-prod-api`
- `goal-mandala-stg-frontend`

#### 環境設定管理

各環境の設定値を外部JSONファイルで管理：

```typescript
// config/environment.ts
export interface EnvironmentConfig {
  stackPrefix: string;
  region: string;
  account?: string;
  database: {
    instanceClass: string;
    minCapacity: number;
    maxCapacity: number;
  };
  lambda: {
    timeout: number;
    memorySize: number;
  };
  frontend: {
    domainName?: string;
    certificateArn?: string;
  };
}
```

## コンポーネント設計

### CDKアプリケーション（src/index.ts）

```typescript
import * as cdk from 'aws-cdk-lib';
import { DatabaseStack } from './stacks/database-stack';
import { ApiStack } from './stacks/api-stack';
import { FrontendStack } from './stacks/frontend-stack';
import { getEnvironmentConfig } from './config/environment';

const app = new cdk.App();
const environment = app.node.tryGetContext('environment') || 'dev';
const config = getEnvironmentConfig(environment);

// 環境とアカウント情報
const env = {
  region: config.region,
  account: config.account || process.env.CDK_DEFAULT_ACCOUNT,
};

// スタック作成
const databaseStack = new DatabaseStack(app, `${config.stackPrefix}-database`, {
  env,
  config,
});

const apiStack = new ApiStack(app, `${config.stackPrefix}-api`, {
  env,
  config,
  database: databaseStack.database,
});

const frontendStack = new FrontendStack(app, `${config.stackPrefix}-frontend`, {
  env,
  config,
  api: apiStack.api,
});
```

### 設定管理システム

#### 環境設定ローダー

```typescript
// config/environment.ts
import * as fs from 'fs';
import * as path from 'path';

export function getEnvironmentConfig(environment: string): EnvironmentConfig {
  const configPath = path.join(__dirname, '..', 'config', `${environment}.json`);
  
  if (!fs.existsSync(configPath)) {
    throw new Error(`Configuration file not found: ${configPath}`);
  }
  
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  return validateConfig(config);
}

function validateConfig(config: any): EnvironmentConfig {
  // 設定値の検証ロジック
  if (!config.stackPrefix) {
    throw new Error('stackPrefix is required in configuration');
  }
  
  return config as EnvironmentConfig;
}
```

### 基本コンストラクト

#### データベースコンストラクト

```typescript
// constructs/database-construct.ts
import * as cdk from 'aws-cdk-lib';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

export interface DatabaseConstructProps {
  vpc: ec2.Vpc;
  config: EnvironmentConfig;
}

export class DatabaseConstruct extends Construct {
  public readonly cluster: rds.DatabaseCluster;
  
  constructor(scope: Construct, id: string, props: DatabaseConstructProps) {
    super(scope, id);
    
    // Aurora Serverless V2クラスター作成
    this.cluster = new rds.DatabaseCluster(this, 'Cluster', {
      engine: rds.DatabaseClusterEngine.auroraPostgres({
        version: rds.AuroraPostgresEngineVersion.VER_15_4,
      }),
      serverlessV2MinCapacity: props.config.database.minCapacity,
      serverlessV2MaxCapacity: props.config.database.maxCapacity,
      vpc: props.vpc,
      // その他の設定...
    });
  }
}
```

## データモデル

### 設定ファイル構造

#### cdk.json

```json
{
  "app": "npx ts-node src/index.ts",
  "watch": {
    "include": [
      "**"
    ],
    "exclude": [
      "README.md",
      "cdk*.json",
      "**/*.d.ts",
      "**/*.js",
      "tsconfig.json",
      "package*.json",
      "yarn.lock",
      "node_modules",
      "test"
    ]
  },
  "context": {
    "@aws-cdk/aws-lambda:recognizeLayerVersion": true,
    "@aws-cdk/core:checkSecretUsage": true,
    "@aws-cdk/core:target-partitions": ["aws", "aws-cn"],
    "@aws-cdk/aws-autoscaling:generateLaunchTemplateInsteadOfLaunchConfig": true,
    "@aws-cdk/aws-iam:minimizePolicies": true,
    "@aws-cdk/core:validateSnapshotRemovalPolicy": true,
    "@aws-cdk/aws-codepipeline:crossAccountKeyAliasStackSafeResourceName": true,
    "@aws-cdk/aws-s3:createDefaultLoggingPolicy": true,
    "@aws-cdk/aws-sns-subscriptions:restrictSqsDescryption": true,
    "@aws-cdk/aws-apigateway:disableCloudWatchRole": true,
    "@aws-cdk/core:enablePartitionLiterals": true,
    "@aws-cdk/aws-events:eventsTargetQueueSameAccount": true,
    "@aws-cdk/aws-iam:standardizedServicePrincipals": true,
    "@aws-cdk/aws-ecs:disableExplicitDeploymentControllerForCircuitBreaker": true,
    "@aws-cdk/aws-iam:importedRoleStackSafeDefaultPolicyName": true,
    "@aws-cdk/aws-s3:serverAccessLogsUseBucketPolicy": true,
    "@aws-cdk/aws-route53-patters:useCertificate": true,
    "@aws-cdk/customresources:installLatestAwsSdkDefault": false,
    "@aws-cdk/aws-rds:databaseProxyUniqueResourceName": true,
    "@aws-cdk/aws-codedeploy:removeAlarmsFromDeploymentGroup": true,
    "@aws-cdk/aws-apigateway:authorizerChangeDeploymentLogicalId": true,
    "@aws-cdk/aws-ec2:launchTemplateDefaultUserData": true,
    "@aws-cdk/aws-secretsmanager:useAttachedSecretResourcePolicyForSecretTargetAttachments": true,
    "@aws-cdk/aws-redshift:columnId": true,
    "@aws-cdk/aws-stepfunctions-tasks:enableLogging": true,
    "@aws-cdk/aws-ec2:restrictDefaultSecurityGroup": true,
    "@aws-cdk/aws-apigateway:requestValidatorUniqueId": true,
    "@aws-cdk/aws-kms:aliasNameRef": true,
    "@aws-cdk/aws-autoscaling:generateLaunchTemplateInsteadOfLaunchConfig": true,
    "@aws-cdk/core:includePrefixInUniqueNameGeneration": true,
    "@aws-cdk/aws-efs:denyAnonymousAccess": true,
    "@aws-cdk/aws-opensearchservice:enableLogging": true,
    "@aws-cdk/aws-lambda:useLatestRuntimeVersion": true
  }
}
```

#### 環境設定例（config/dev.json）

```json
{
  "stackPrefix": "goal-mandala-dev",
  "region": "ap-northeast-1",
  "database": {
    "instanceClass": "serverless",
    "minCapacity": 0.5,
    "maxCapacity": 1
  },
  "lambda": {
    "timeout": 30,
    "memorySize": 256
  },
  "frontend": {
    "domainName": null,
    "certificateArn": null
  }
}
```

## エラーハンドリング

### 設定検証

1. **環境設定ファイル存在チェック**
   - 指定された環境の設定ファイルが存在しない場合はエラー
   - 必須フィールドが不足している場合はエラー

2. **AWS認証情報チェック**
   - CDKデプロイ時にAWS認証情報が設定されていない場合はエラー
   - 指定されたリージョンが有効でない場合はエラー

3. **リソース命名衝突チェック**
   - 同一アカウント・リージョン内でスタック名が重複する場合はエラー
   - グローバルリソース（S3バケット等）の名前衝突チェック

### デプロイエラー対応

1. **ロールバック戦略**
   - スタック作成失敗時の自動ロールバック
   - 部分的な更新失敗時の状態復旧

2. **依存関係エラー**
   - スタック間の依存関係エラーの検出と報告
   - 循環依存の防止

## テスト戦略

### ユニットテスト

1. **設定ローダーテスト**
   - 各環境設定ファイルの読み込みテスト
   - 不正な設定値に対するバリデーションテスト

2. **コンストラクトテスト**
   - 各コンストラクトの生成テスト
   - プロパティの正しい設定確認

### 統合テスト

1. **CDK Synthテスト**
   - 各環境でのテンプレート生成テスト
   - CloudFormationテンプレートの妥当性確認

2. **デプロイテスト**
   - 開発環境での実際のデプロイテスト
   - リソース作成の確認

## セキュリティ考慮事項

### IAM権限管理

1. **最小権限の原則**
   - 各リソースに必要最小限の権限のみ付与
   - クロスアカウントアクセスの制限

2. **シークレット管理**
   - AWS Secrets Managerでの機密情報管理
   - ハードコーディングの禁止

### ネットワークセキュリティ

1. **VPC設計**
   - プライベートサブネットでのリソース配置
   - セキュリティグループの適切な設定

2. **暗号化**
   - 保存時暗号化の有効化
   - 転送時暗号化の強制

## パフォーマンス最適化

### CDKビルド最適化

1. **キャッシュ活用**
   - node_modulesキャッシュの活用
   - CDK synthキャッシュの利用

2. **並列処理**
   - 複数スタックの並列デプロイ
   - 依存関係を考慮した最適化

### リソース最適化

1. **コスト効率**
   - 開発環境でのリソースサイズ最小化
   - 不要なリソースの自動削除

2. **デプロイ時間短縮**
   - 変更差分のみのデプロイ
   - ホットスワップ機能の活用
