# Step Functions統合 運用ガイド

## 概要

このドキュメントは、Step Functions統合機能の運用に関するガイドです。デプロイ手順、監視方法、トラブルシューティングについて説明します。

## 目次

1. [デプロイ手順](#デプロイ手順)
2. [監視方法](#監視方法)
3. [アラート設定](#アラート設定)
4. [トラブルシューティング](#トラブルシューティング)
5. [パフォーマンス最適化](#パフォーマンス最適化)
6. [セキュリティ](#セキュリティ)
7. [バックアップとリカバリ](#バックアップとリカバリ)

---

## デプロイ手順

### 前提条件

- AWS CLI設定済み
- AWS CDK v2インストール済み
- Node.js 23.10.0以上
- pnpm 8.15.0以上
- 適切なIAM権限

### 環境変数設定

デプロイ前に以下の環境変数を設定してください：

```bash
# AWS設定
export AWS_REGION=ap-northeast-1
export AWS_ACCOUNT_ID=123456789012

# データベース設定
export DATABASE_URL=postgresql://user:password@host:5432/database

# JWT設定
export JWT_SECRET=your_jwt_secret_here

# Step Functions設定
export WORKFLOW_TIMEOUT=900  # 15分（秒）
export MAX_BATCH_CONCURRENCY=3
export MAX_ACTION_CONCURRENCY=8
export BATCH_SIZE=8
```

### デプロイコマンド

#### 開発環境

```bash
# 1. 依存関係のインストール
pnpm install

# 2. ビルド
pnpm run build

# 3. CDKスタックのデプロイ
cd packages/infrastructure
pnpm run cdk:deploy TaskGenerationWorkflowStack-dev

# 4. Lambda関数のデプロイ
cd ../backend
pnpm run deploy:dev
```

#### ステージング環境

```bash
# 環境変数を設定
export NODE_ENV=staging

# CDKスタックのデプロイ
cd packages/infrastructure
pnpm run cdk:deploy TaskGenerationWorkflowStack-staging

# Lambda関数のデプロイ
cd ../backend
pnpm run deploy:staging
```

#### 本番環境

```bash
# 環境変数を設定
export NODE_ENV=production

# CDKスタックのデプロイ
cd packages/infrastructure
pnpm run cdk:deploy TaskGenerationWorkflowStack-prod

# Lambda関数のデプロイ
cd ../backend
pnpm run deploy:prod
```

### デプロイ後の確認

#### 1. State Machine確認

```bash
# State Machineの一覧を取得
aws stepfunctions list-state-machines --region ap-northeast-1

# State Machineの詳細を取得
aws stepfunctions describe-state-machine \
  --state-machine-arn arn:aws:states:ap-northeast-1:123456789012:stateMachine:TaskGenerationWorkflow
```

#### 2. Lambda関数確認

```bash
# Lambda関数の一覧を取得
aws lambda list-functions --region ap-northeast-1 | grep workflow

# Lambda関数の詳細を取得
aws lambda get-function \
  --function-name goal-mandala-dev-workflow-start
```

#### 3. DynamoDBテーブル確認

```bash
# テーブルの一覧を取得
aws dynamodb list-tables --region ap-northeast-1

# テーブルの詳細を取得
aws dynamodb describe-table \
  --table-name WorkflowExecution
```

#### 4. CloudWatch Logs確認

```bash
# ロググループの一覧を取得
aws logs describe-log-groups --region ap-northeast-1 | grep workflow

# 最新のログを取得
aws logs tail /aws/lambda/goal-mandala-dev-workflow-start --follow
```

### ロールバック手順

#### 1. CDKスタックのロールバック

```bash
# 前のバージョンのスタックをデプロイ
cd packages/infrastructure
git checkout <previous-commit>
pnpm run cdk:deploy TaskGenerationWorkflowStack-prod
```

#### 2. Lambda関数のロールバック

```bash
# 前のバージョンをデプロイ
aws lambda update-function-code \
  --function-name goal-mandala-prod-workflow-start \
  --s3-bucket my-deployment-bucket \
  --s3-key lambda/workflow-start-v1.0.0.zip
```

#### 3. State Machine定義のロールバック

```bash
# 前のバージョンの定義を適用
aws stepfunctions update-state-machine \
  --state-machine-arn arn:aws:states:ap-northeast-1:123456789012:stateMachine:TaskGenerationWorkflow \
  --definition file://state-machine-v1.0.0.json
```

---

## 監視方法

### CloudWatch メトリクス

#### State Machine メトリクス

| メトリクス名        | 説明                   | 推奨閾値 |
| ------------------- | ---------------------- | -------- |
| ExecutionsFailed    | 失敗した実行数         | > 10%    |
| ExecutionsTimedOut  | タイムアウトした実行数 | > 5%     |
| ExecutionTime       | 実行時間               | > 10分   |
| ExecutionsStarted   | 開始した実行数         | -        |
| ExecutionsSucceeded | 成功した実行数         | -        |

#### Lambda メトリクス

| メトリクス名         | 説明               | 推奨閾値 |
| -------------------- | ------------------ | -------- |
| Invocations          | 呼び出し回数       | -        |
| Errors               | エラー回数         | > 5%     |
| Duration             | 実行時間           | > 30秒   |
| Throttles            | スロットリング回数 | > 0      |
| ConcurrentExecutions | 同時実行数         | > 80%    |

#### DynamoDB メトリクス

| メトリクス名               | 説明           | 推奨閾値 |
| -------------------------- | -------------- | -------- |
| ConsumedReadCapacityUnits  | 読み取り容量   | > 80%    |
| ConsumedWriteCapacityUnits | 書き込み容量   | > 80%    |
| UserErrors                 | ユーザーエラー | > 0      |
| SystemErrors               | システムエラー | > 0      |

### CloudWatch Logs

#### ログの確認

```bash
# State Machineのログを確認
aws logs tail /aws/states/TaskGenerationWorkflow --follow

# Lambda関数のログを確認
aws logs tail /aws/lambda/goal-mandala-prod-workflow-start --follow

# エラーログのみを確認
aws logs filter-log-events \
  --log-group-name /aws/lambda/goal-mandala-prod-workflow-start \
  --filter-pattern "ERROR"
```

#### ログの検索

```bash
# 特定の実行ARNのログを検索
aws logs filter-log-events \
  --log-group-name /aws/states/TaskGenerationWorkflow \
  --filter-pattern "arn:aws:states:ap-northeast-1:123456789012:execution:TaskGenerationWorkflow:abc123"

# 特定の期間のログを検索
aws logs filter-log-events \
  --log-group-name /aws/lambda/goal-mandala-prod-workflow-start \
  --start-time 1638316800000 \
  --end-time 1638320400000
```

### CloudWatch Insights

#### クエリ例

##### 1. エラー率の計算

```sql
fields @timestamp, @message
| filter @message like /ERROR/
| stats count() as error_count by bin(5m)
```

##### 2. 実行時間の分析

```sql
fields @timestamp, executionArn, duration
| filter @type = "ExecutionSucceeded"
| stats avg(duration), max(duration), min(duration) by bin(1h)
```

##### 3. 失敗したアクションの集計

```sql
fields @timestamp, failedActions
| filter @type = "ExecutionFailed"
| stats count() as failure_count by failedActions
```

### X-Ray トレーシング

#### トレースの確認

```bash
# トレースの一覧を取得
aws xray get-trace-summaries \
  --start-time 2025-12-09T00:00:00Z \
  --end-time 2025-12-09T23:59:59Z

# 特定のトレースを取得
aws xray batch-get-traces \
  --trace-ids 1-5f8a1234-abcd1234efgh5678ijkl9012
```

#### サービスマップの確認

AWS X-Rayコンソールでサービスマップを確認し、以下を監視：

- Lambda関数間の呼び出し関係
- レイテンシ
- エラー率
- スロットリング

---

## アラート設定

### CloudWatch アラーム

#### 1. 失敗率アラーム

```bash
aws cloudwatch put-metric-alarm \
  --alarm-name workflow-failure-rate-high \
  --alarm-description "ワークフロー失敗率が10%を超えた" \
  --metric-name ExecutionsFailed \
  --namespace AWS/States \
  --statistic Sum \
  --period 300 \
  --evaluation-periods 2 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=StateMachineArn,Value=arn:aws:states:ap-northeast-1:123456789012:stateMachine:TaskGenerationWorkflow \
  --alarm-actions arn:aws:sns:ap-northeast-1:123456789012:workflow-alerts
```

#### 2. タイムアウトアラーム

```bash
aws cloudwatch put-metric-alarm \
  --alarm-name workflow-timeout-high \
  --alarm-description "ワークフロータイムアウトが5%を超えた" \
  --metric-name ExecutionsTimedOut \
  --namespace AWS/States \
  --statistic Sum \
  --period 300 \
  --evaluation-periods 2 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=StateMachineArn,Value=arn:aws:states:ap-northeast-1:123456789012:stateMachine:TaskGenerationWorkflow \
  --alarm-actions arn:aws:sns:ap-northeast-1:123456789012:workflow-alerts
```

#### 3. Lambda エラーアラーム

```bash
aws cloudwatch put-metric-alarm \
  --alarm-name lambda-error-rate-high \
  --alarm-description "Lambda関数のエラー率が5%を超えた" \
  --metric-name Errors \
  --namespace AWS/Lambda \
  --statistic Sum \
  --period 300 \
  --evaluation-periods 2 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=FunctionName,Value=goal-mandala-prod-workflow-start \
  --alarm-actions arn:aws:sns:ap-northeast-1:123456789012:workflow-alerts
```

### SNS 通知設定

#### 1. SNSトピックの作成

```bash
aws sns create-topic \
  --name workflow-alerts \
  --region ap-northeast-1
```

#### 2. メール通知の設定

```bash
aws sns subscribe \
  --topic-arn arn:aws:sns:ap-northeast-1:123456789012:workflow-alerts \
  --protocol email \
  --notification-endpoint admin@example.com
```

#### 3. Slack通知の設定

```bash
# Lambda関数を作成してSNSトピックにサブスクライブ
aws sns subscribe \
  --topic-arn arn:aws:sns:ap-northeast-1:123456789012:workflow-alerts \
  --protocol lambda \
  --notification-endpoint arn:aws:lambda:ap-northeast-1:123456789012:function:slack-notifier
```

---

## トラブルシューティング

### よくある問題

#### 1. ワークフローが開始しない

**症状**: ワークフロー開始APIが409 Conflictを返す

**原因**: 既にワークフローが実行中

**解決方法**:

```bash
# 実行中のワークフローを確認
aws stepfunctions list-executions \
  --state-machine-arn arn:aws:states:ap-northeast-1:123456789012:stateMachine:TaskGenerationWorkflow \
  --status-filter RUNNING

# 必要に応じてキャンセル
aws stepfunctions stop-execution \
  --execution-arn <execution-arn> \
  --cause "Manual cancellation"
```

#### 2. ワークフローがタイムアウトする

**症状**: ワークフローが15分でタイムアウト

**原因**: AI呼び出しが遅い、またはアクション数が多い

**解決方法**:

- バッチサイズを調整（8 → 6）
- 並列度を調整（3 → 2）
- タイムアウト時間を延長（15分 → 20分）

```bash
# State Machine定義を更新
aws stepfunctions update-state-machine \
  --state-machine-arn arn:aws:states:ap-northeast-1:123456789012:stateMachine:TaskGenerationWorkflow \
  --definition file://state-machine-updated.json
```

#### 3. Lambda関数がタイムアウトする

**症状**: Lambda関数が2分でタイムアウト

**原因**: AI呼び出しが遅い

**解決方法**:

```bash
# Lambda関数のタイムアウトを延長
aws lambda update-function-configuration \
  --function-name goal-mandala-prod-task-generation \
  --timeout 180  # 3分
```

#### 4. DynamoDBスロットリング

**症状**: DynamoDBへの書き込みが失敗

**原因**: 書き込み容量不足

**解決方法**:

```bash
# オンデマンドモードに変更
aws dynamodb update-table \
  --table-name WorkflowExecution \
  --billing-mode PAY_PER_REQUEST

# または、プロビジョニング容量を増やす
aws dynamodb update-table \
  --table-name WorkflowExecution \
  --provisioned-throughput ReadCapacityUnits=10,WriteCapacityUnits=10
```

#### 5. 部分失敗が多発

**症状**: 多くのアクションが失敗する

**原因**: AI生成品質が低い、またはネットワークエラー

**解決方法**:

- プロンプトを改善
- リトライ回数を増やす（3回 → 5回）
- バックオフ時間を調整（2秒 → 5秒）

```typescript
// State Machine定義を更新
{
  "Retry": [
    {
      "ErrorEquals": ["States.TaskFailed"],
      "IntervalSeconds": 5,  // 2秒 → 5秒
      "MaxAttempts": 5,      // 3回 → 5回
      "BackoffRate": 2.0
    }
  ]
}
```

### デバッグ手順

#### 1. ログの確認

```bash
# State Machineのログを確認
aws logs tail /aws/states/TaskGenerationWorkflow --follow

# Lambda関数のログを確認
aws logs tail /aws/lambda/goal-mandala-prod-workflow-start --follow
```

#### 2. 実行履歴の確認

```bash
# 実行履歴を取得
aws stepfunctions get-execution-history \
  --execution-arn <execution-arn> \
  --max-results 100
```

#### 3. X-Rayトレースの確認

AWS X-Rayコンソールでトレースを確認し、以下を分析：

- どのLambda関数で時間がかかっているか
- どこでエラーが発生しているか
- リトライが正しく動作しているか

#### 4. メトリクスの確認

CloudWatchコンソールでメトリクスを確認し、以下を分析：

- 失敗率の推移
- 実行時間の推移
- スロットリングの発生状況

---

## パフォーマンス最適化

### 並列処理の最適化

#### 1. バッチサイズの調整

```typescript
// 推奨設定
const BATCH_SIZE = 8; // アクション数が多い場合は6に減らす
```

#### 2. 並列度の調整

```typescript
// 推奨設定
const MAX_BATCH_CONCURRENCY = 3; // メモリ使用量が高い場合は2に減らす
const MAX_ACTION_CONCURRENCY = 8; // Lambda同時実行数が不足する場合は6に減らす
```

### Lambda関数の最適化

#### 1. メモリサイズの調整

```bash
# メモリサイズを増やす（実行時間が短縮される）
aws lambda update-function-configuration \
  --function-name goal-mandala-prod-task-generation \
  --memory-size 2048  # 1024MB → 2048MB
```

#### 2. Provisioned Concurrencyの設定

```bash
# コールドスタートを削減
aws lambda put-provisioned-concurrency-config \
  --function-name goal-mandala-prod-task-generation \
  --provisioned-concurrent-executions 5
```

### DynamoDBの最適化

#### 1. GSIの追加

```bash
# goalIdでの検索を高速化
aws dynamodb update-table \
  --table-name WorkflowExecution \
  --attribute-definitions AttributeName=goalId,AttributeType=S \
  --global-secondary-index-updates \
    "[{\"Create\":{\"IndexName\":\"goalId-index\",\"KeySchema\":[{\"AttributeName\":\"goalId\",\"KeyType\":\"HASH\"}],\"Projection\":{\"ProjectionType\":\"ALL\"},\"ProvisionedThroughput\":{\"ReadCapacityUnits\":5,\"WriteCapacityUnits\":5}}}]"
```

#### 2. TTLの設定

```bash
# 90日後に自動削除
aws dynamodb update-time-to-live \
  --table-name WorkflowExecution \
  --time-to-live-specification Enabled=true,AttributeName=ttl
```

---

## セキュリティ

### IAM権限の最小化

#### 1. Lambda実行ロール

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:Query"
      ],
      "Resource": "arn:aws:dynamodb:ap-northeast-1:123456789012:table/WorkflowExecution"
    },
    {
      "Effect": "Allow",
      "Action": ["bedrock:InvokeModel"],
      "Resource": "arn:aws:bedrock:ap-northeast-1::foundation-model/amazon.nova-micro-v1:0"
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:ap-northeast-1:123456789012:log-group:/aws/lambda/*"
    }
  ]
}
```

#### 2. Step Functions実行ロール

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["lambda:InvokeFunction"],
      "Resource": "arn:aws:lambda:ap-northeast-1:123456789012:function:goal-mandala-*-workflow-*"
    },
    {
      "Effect": "Allow",
      "Action": ["sns:Publish"],
      "Resource": "arn:aws:sns:ap-northeast-1:123456789012:workflow-notifications"
    }
  ]
}
```

### データ暗号化

#### 1. DynamoDB暗号化

```bash
# AWS管理キーで暗号化
aws dynamodb update-table \
  --table-name WorkflowExecution \
  --sse-specification Enabled=true,SSEType=KMS
```

#### 2. CloudWatch Logs暗号化

```bash
# KMSキーで暗号化
aws logs associate-kms-key \
  --log-group-name /aws/states/TaskGenerationWorkflow \
  --kms-key-id arn:aws:kms:ap-northeast-1:123456789012:key/12345678-1234-1234-1234-123456789012
```

### アクセス制御

#### 1. API Gateway認証

- Cognito User Poolによる認証
- JWTトークンの検証
- ユーザーIDとgoalIDの所有権確認

#### 2. Step Functions実行権限

- ユーザーは自分の目標のみ実行可能
- 管理者は全ワークフローの監視可能

---

## バックアップとリカバリ

### DynamoDBバックアップ

#### 1. オンデマンドバックアップ

```bash
# バックアップを作成
aws dynamodb create-backup \
  --table-name WorkflowExecution \
  --backup-name workflow-execution-backup-$(date +%Y%m%d)

# バックアップの一覧を取得
aws dynamodb list-backups \
  --table-name WorkflowExecution
```

#### 2. ポイントインタイムリカバリ

```bash
# ポイントインタイムリカバリを有効化
aws dynamodb update-continuous-backups \
  --table-name WorkflowExecution \
  --point-in-time-recovery-specification PointInTimeRecoveryEnabled=true

# 特定の時点にリストア
aws dynamodb restore-table-to-point-in-time \
  --source-table-name WorkflowExecution \
  --target-table-name WorkflowExecution-restored \
  --restore-date-time 2025-12-09T10:00:00Z
```

### State Machine定義のバックアップ

```bash
# State Machine定義を取得
aws stepfunctions describe-state-machine \
  --state-machine-arn arn:aws:states:ap-northeast-1:123456789012:stateMachine:TaskGenerationWorkflow \
  --query 'definition' \
  --output text > state-machine-backup-$(date +%Y%m%d).json
```

### Lambda関数のバックアップ

```bash
# Lambda関数のコードをダウンロード
aws lambda get-function \
  --function-name goal-mandala-prod-workflow-start \
  --query 'Code.Location' \
  --output text | xargs wget -O lambda-backup-$(date +%Y%m%d).zip
```

---

## 定期メンテナンス

### 日次タスク

- [ ] CloudWatch Logsの確認
- [ ] エラー率の確認
- [ ] 実行時間の確認

### 週次タスク

- [ ] メトリクスの分析
- [ ] アラートの確認
- [ ] パフォーマンスの確認

### 月次タスク

- [ ] DynamoDBバックアップの作成
- [ ] State Machine定義のバックアップ
- [ ] Lambda関数のバックアップ
- [ ] コスト分析
- [ ] セキュリティ監査

---

## 関連ドキュメント

- [API仕様書](./workflow-api-specification.md)
- [開発者ドキュメント](./workflow-developer-guide.md)

---

## サポート

質問や問題がある場合は、以下の情報を含めて開発チームに連絡してください：

- エラーコード
- 実行ARN
- タイムスタンプ
- 再現手順
- 期待される動作
- 実際の動作
- CloudWatch Logsのスクリーンショット
