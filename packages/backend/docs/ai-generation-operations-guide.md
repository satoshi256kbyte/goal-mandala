# AI生成機能 運用ガイド

## 概要

このドキュメントは、AI生成機能（Amazon Bedrock Nova Micro統合）の運用手順、監視方法、トラブルシューティングガイドを提供します。

## デプロイ手順

### 前提条件

- AWS CLI がインストールされていること
- AWS CDK がインストールされていること（`npm install -g aws-cdk`）
- 適切なAWS認証情報が設定されていること
- Node.js 20.x がインストールされていること

### 環境変数の設定

デプロイ前に以下の環境変数を設定してください：

```bash
# AWS設定
export AWS_REGION=ap-northeast-1
export AWS_ACCOUNT_ID=123456789012

# 環境設定
export ENVIRONMENT=dev  # dev, stg, prod

# Bedrock設定
export BEDROCK_MODEL_ID=amazon.nova-micro-v1:0
export BEDROCK_REGION=ap-northeast-1
export BEDROCK_MAX_RETRIES=3
export BEDROCK_TIMEOUT_MS=300000
```

### デプロイ手順

#### 1. 依存関係のインストール

```bash
# ルートディレクトリで実行
pnpm install

# バックエンドのビルド
cd packages/backend
pnpm build
```

#### 2. CDKスタックのデプロイ

```bash
# インフラストラクチャディレクトリに移動
cd packages/infrastructure

# CDKスタックの合成（確認）
pnpm cdk synth

# デプロイ実行
pnpm cdk deploy goal-mandala-${ENVIRONMENT}-api --require-approval never
```

#### 3. デプロイ後の確認

```bash
# Lambda関数の確認
aws lambda get-function --function-name goal-mandala-${ENVIRONMENT}-ai-processor

# API Gatewayの確認
aws apigateway get-rest-apis --query "items[?name=='goal-mandala-${ENVIRONMENT}-api']"

# CloudWatch Logsの確認
aws logs describe-log-groups --log-group-name-prefix /aws/lambda/goal-mandala-${ENVIRONMENT}-ai-processor
```

### ロールバック手順

問題が発生した場合、以下の手順でロールバックします：

```bash
# 前のバージョンのコードをチェックアウト
git checkout <previous-commit-hash>

# 再ビルド
cd packages/backend
pnpm build

# 再デプロイ
cd packages/infrastructure
pnpm cdk deploy goal-mandala-${ENVIRONMENT}-api --require-approval never
```

## 監視方法

### CloudWatch メトリクス

#### Lambda関数のメトリクス

以下のメトリクスを監視してください：

1. **Invocations（呼び出し回数）**
   - 正常な呼び出し回数を確認
   - 異常な増加がないか監視

2. **Errors（エラー数）**
   - エラー率を監視
   - 閾値: 5分間で5回以上のエラー

3. **Duration（実行時間）**
   - 平均実行時間を監視
   - 閾値: 平均60秒以上

4. **Throttles（スロットリング）**
   - スロットリング発生回数を監視
   - 閾値: 1回でも発生したらアラート

5. **ConcurrentExecutions（同時実行数）**
   - 同時実行数を監視
   - 閾値: 8以上（予約済み同時実行数10の80%）

#### CloudWatch Logsの確認

```bash
# 最新のログを確認
aws logs tail /aws/lambda/goal-mandala-${ENVIRONMENT}-ai-processor --follow

# エラーログの検索
aws logs filter-log-events \
  --log-group-name /aws/lambda/goal-mandala-${ENVIRONMENT}-ai-processor \
  --filter-pattern "ERROR"

# 特定期間のログを確認
aws logs filter-log-events \
  --log-group-name /aws/lambda/goal-mandala-${ENVIRONMENT}-ai-processor \
  --start-time $(date -u -d '1 hour ago' +%s)000 \
  --end-time $(date -u +%s)000
```

### CloudWatch アラーム

以下のアラームが設定されています：

| アラーム名                         | 条件                        | アクション |
| ---------------------------------- | --------------------------- | ---------- |
| ai-processor-error-rate            | 5分間で5回以上のエラー      | SNS通知    |
| ai-processor-duration              | 平均実行時間が60秒以上      | SNS通知    |
| ai-processor-throttle              | スロットリングが1回でも発生 | SNS通知    |
| ai-processor-concurrent-executions | 同時実行数が8以上           | SNS通知    |

### アラーム状態の確認

```bash
# アラーム一覧の確認
aws cloudwatch describe-alarms \
  --alarm-name-prefix goal-mandala-${ENVIRONMENT}-ai-processor

# アラーム履歴の確認
aws cloudwatch describe-alarm-history \
  --alarm-name goal-mandala-${ENVIRONMENT}-ai-processor-error-rate \
  --max-records 10
```

### X-Ray トレーシング

Lambda関数はX-Rayトレーシングが有効化されています。

```bash
# トレースの確認
aws xray get-trace-summaries \
  --start-time $(date -u -d '1 hour ago' +%s) \
  --end-time $(date -u +%s)

# サービスマップの確認
aws xray get-service-graph \
  --start-time $(date -u -d '1 hour ago' +%s) \
  --end-time $(date -u +%s)
```

## パフォーマンス監視

### レスポンス時間の監視

```bash
# CloudWatch Insightsクエリ
aws logs start-query \
  --log-group-name /aws/lambda/goal-mandala-${ENVIRONMENT}-ai-processor \
  --start-time $(date -u -d '1 hour ago' +%s) \
  --end-time $(date -u +%s) \
  --query-string 'fields @timestamp, @duration | stats avg(@duration), max(@duration), min(@duration)'
```

### コスト監視

Bedrock Nova Microの使用コストを監視します：

```bash
# Cost Explorerでコストを確認
aws ce get-cost-and-usage \
  --time-period Start=$(date -u -d '1 month ago' +%Y-%m-%d),End=$(date -u +%Y-%m-%d) \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --filter file://bedrock-filter.json
```

bedrock-filter.json:

```json
{
  "Dimensions": {
    "Key": "SERVICE",
    "Values": ["Amazon Bedrock"]
  }
}
```

## トラブルシューティング

### 一般的な問題と解決方法

#### 1. Lambda関数がタイムアウトする

**症状**: Lambda関数が15分でタイムアウトする

**原因**:

- Bedrockのレスポンスが遅い
- ネットワーク接続の問題
- プロンプトが複雑すぎる

**解決方法**:

```bash
# Lambda関数のタイムアウト設定を確認
aws lambda get-function-configuration \
  --function-name goal-mandala-${ENVIRONMENT}-ai-processor \
  --query 'Timeout'

# タイムアウトを延長（必要に応じて）
aws lambda update-function-configuration \
  --function-name goal-mandala-${ENVIRONMENT}-ai-processor \
  --timeout 900  # 15分
```

#### 2. スロットリングエラーが発生する

**症状**: ThrottlingExceptionエラーが発生

**原因**:

- Bedrockのレート制限に達している
- Lambda同時実行数の制限に達している

**解決方法**:

```bash
# Lambda予約済み同時実行数を確認
aws lambda get-function-concurrency \
  --function-name goal-mandala-${ENVIRONMENT}-ai-processor

# 同時実行数を増やす
aws lambda put-function-concurrency \
  --function-name goal-mandala-${ENVIRONMENT}-ai-processor \
  --reserved-concurrent-executions 20

# Bedrockのクォータを確認
aws service-quotas get-service-quota \
  --service-code bedrock \
  --quota-code L-12345678
```

#### 3. メモリ不足エラー

**症状**: Lambda関数がメモリ不足でエラーになる

**原因**:

- メモリ設定が不足している
- メモリリークが発生している

**解決方法**:

```bash
# メモリ使用量を確認
aws logs filter-log-events \
  --log-group-name /aws/lambda/goal-mandala-${ENVIRONMENT}-ai-processor \
  --filter-pattern "Memory Size"

# メモリサイズを増やす
aws lambda update-function-configuration \
  --function-name goal-mandala-${ENVIRONMENT}-ai-processor \
  --memory-size 2048  # 2GB
```

#### 4. 認証エラー

**症状**: 401 Unauthorized エラーが発生

**原因**:

- JWTトークンが無効
- Cognito User Poolの設定が正しくない
- IAMロールの権限が不足

**解決方法**:

```bash
# Cognito User Poolの確認
aws cognito-idp describe-user-pool \
  --user-pool-id ${USER_POOL_ID}

# IAMロールの権限を確認
aws iam get-role-policy \
  --role-name goal-mandala-${ENVIRONMENT}-lambda-execution-role \
  --policy-name BedrockAccess
```

#### 5. Bedrockモデルにアクセスできない

**症状**: AccessDeniedException エラーが発生

**原因**:

- Bedrockモデルへのアクセス権限がない
- モデルIDが正しくない
- リージョンが正しくない

**解決方法**:

```bash
# Bedrockモデルへのアクセス権限を確認
aws bedrock list-foundation-models \
  --region ap-northeast-1

# IAMポリシーを確認
aws iam get-role-policy \
  --role-name goal-mandala-${ENVIRONMENT}-lambda-execution-role \
  --policy-name BedrockAccess

# 必要に応じて権限を追加
aws iam put-role-policy \
  --role-name goal-mandala-${ENVIRONMENT}-lambda-execution-role \
  --policy-name BedrockAccess \
  --policy-document file://bedrock-policy.json
```

### ログの分析

#### エラーログの抽出

```bash
# エラーログを抽出
aws logs filter-log-events \
  --log-group-name /aws/lambda/goal-mandala-${ENVIRONMENT}-ai-processor \
  --filter-pattern "ERROR" \
  --start-time $(date -u -d '1 hour ago' +%s)000 \
  --output json | jq '.events[].message'
```

#### リクエストIDでログを検索

```bash
# 特定のリクエストIDのログを検索
aws logs filter-log-events \
  --log-group-name /aws/lambda/goal-mandala-${ENVIRONMENT}-ai-processor \
  --filter-pattern "request-id-12345" \
  --output json | jq '.events[].message'
```

## メンテナンス

### 定期メンテナンス

#### 月次メンテナンス

1. **ログの確認とクリーンアップ**

   ```bash
   # 古いログストリームを削除（30日以上前）
   aws logs describe-log-streams \
     --log-group-name /aws/lambda/goal-mandala-${ENVIRONMENT}-ai-processor \
     --order-by LastEventTime \
     --descending \
     --query "logStreams[?lastEventTimestamp < \`$(date -u -d '30 days ago' +%s)000\`].logStreamName" \
     --output text | xargs -I {} aws logs delete-log-stream \
       --log-group-name /aws/lambda/goal-mandala-${ENVIRONMENT}-ai-processor \
       --log-stream-name {}
   ```

2. **コスト分析**
   - Bedrockの使用量とコストを確認
   - Lambda実行時間とコストを確認
   - 最適化の機会を検討

3. **パフォーマンスレビュー**
   - レスポンス時間の傾向を分析
   - エラー率の傾向を分析
   - 改善点を特定

#### 四半期メンテナンス

1. **依存関係の更新**

   ```bash
   # パッケージの更新確認
   cd packages/backend
   pnpm outdated

   # セキュリティ脆弱性のチェック
   pnpm audit

   # 更新の適用
   pnpm update
   ```

2. **セキュリティレビュー**
   - IAMロールと権限の見直し
   - セキュリティグループの見直し
   - ログの監査

## 緊急時対応

### インシデント対応フロー

1. **検知**
   - CloudWatchアラームの通知を受信
   - ユーザーからの報告

2. **初期対応**

   ```bash
   # 現在の状態を確認
   aws lambda get-function \
     --function-name goal-mandala-${ENVIRONMENT}-ai-processor

   # 最新のエラーログを確認
   aws logs tail /aws/lambda/goal-mandala-${ENVIRONMENT}-ai-processor \
     --since 1h --filter-pattern "ERROR"
   ```

3. **影響範囲の特定**
   - エラー率の確認
   - 影響を受けているユーザー数の確認
   - 他のサービスへの影響の確認

4. **対応**
   - 必要に応じてロールバック
   - 設定の修正
   - スケーリングの調整

5. **復旧確認**
   - エラー率が正常に戻ったことを確認
   - レスポンス時間が正常に戻ったことを確認
   - ユーザーからの報告がないことを確認

6. **事後対応**
   - インシデントレポートの作成
   - 再発防止策の検討と実施

### エスカレーション

重大なインシデントの場合、以下の順序でエスカレーションします：

1. オンコールエンジニア
2. テックリード
3. エンジニアリングマネージャー
4. CTO

## 連絡先

- オンコールエンジニア: oncall@example.com
- テックリード: tech-lead@example.com
- Slackチャンネル: #goal-mandala-alerts

## 参考資料

- [API仕様書](./ai-generation-api-specification.md)
- [開発者ドキュメント](./ai-generation-developer-guide.md)
- [AWS Lambda ドキュメント](https://docs.aws.amazon.com/lambda/)
- [Amazon Bedrock ドキュメント](https://docs.aws.amazon.com/bedrock/)
- [CloudWatch ドキュメント](https://docs.aws.amazon.com/cloudwatch/)
