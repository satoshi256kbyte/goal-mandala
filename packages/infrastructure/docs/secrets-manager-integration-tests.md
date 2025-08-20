# SecretsManager統合テストガイド

このドキュメントでは、SecretsManagerConstructの統合テストの実行方法と内容について説明します。

## 概要

SecretsManager統合テストは、実際のAWS環境に対して以下のテストを実行します：

1. **CDKデプロイ後のシークレット存在確認テスト**
2. **Lambda関数からのシークレット取得テスト**
3. **環境別アクセス制御のテスト**
4. **ローテーション機能の動作テスト**
5. **パフォーマンステストの実装**

## 前提条件

### 必要なツール

- Node.js 18以上
- AWS CLI v2
- pnpm または npm
- jq（オプション、結果表示の改善用）

### AWS認証情報

統合テストを実行する前に、適切なAWS認証情報を設定してください：

```bash
# AWS CLIの設定
aws configure

# または環境変数での設定
export AWS_ACCESS_KEY_ID=your_access_key
export AWS_SECRET_ACCESS_KEY=your_secret_key
export AWS_REGION=ap-northeast-1
```

### 必要なIAM権限

統合テストを実行するユーザー/ロールには以下の権限が必要です：

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:DescribeSecret",
        "secretsmanager:GetSecretValue",
        "secretsmanager:ListSecrets",
        "secretsmanager:ListSecretVersionIds",
        "lambda:GetFunction",
        "lambda:InvokeFunction",
        "cloudformation:DescribeStacks",
        "cloudformation:DescribeStackResources",
        "cloudwatch:GetMetricStatistics",
        "cloudwatch:ListMetrics"
      ],
      "Resource": "*"
    }
  ]
}
```

## テスト実行方法

### 基本的な実行

```bash
# テスト環境での実行
pnpm run test:integration:secrets

# 特定の環境での実行
pnpm run test:integration:secrets:dev
pnpm run test:integration:secrets:stg
pnpm run test:integration:secrets:prod

# パフォーマンステスト付きで実行
pnpm run test:integration:secrets:performance
```

### 詳細なオプション指定

```bash
# カスタム設定での実行
ts-node scripts/run-secrets-integration-tests.ts \
  --env=dev \
  --region=ap-northeast-1 \
  --stack-prefix=goal-mandala \
  --test-lambda=goal-mandala-dev-secrets-integration-test \
  --perf-duration=120000 \
  --perf-concurrency=10
```

### シェルスクリプトでの実行

```bash
# 基本実行
./scripts/run-integration-tests.sh test

# パフォーマンステスト付きで実行
./scripts/run-integration-tests.sh dev --performance

# Lambda関数を指定して実行
./scripts/run-integration-tests.sh prod --lambda-function goal-mandala-prod-secret-service

# 全オプション付きで実行
./scripts/run-integration-tests.sh stg \
  --performance \
  --lambda-function goal-mandala-stg-secret-service \
  --region ap-northeast-1 \
  --concurrency 10 \
  --duration 60000
```

### 環境変数での設定

```bash
# 環境変数を設定して実行
export ENVIRONMENT=dev
export AWS_REGION=ap-northeast-1
export LAMBDA_FUNCTION_NAME=goal-mandala-dev-secret-service
export ENABLE_PERFORMANCE_TEST=true
export PERFORMANCE_CONCURRENCY=10
export PERFORMANCE_DURATION=60000

pnpm run test:integration:secrets
```

## テスト内容詳細

### 1. シークレット存在確認テスト

以下のシークレットが正しく作成されていることを確認します：

- `goal-mandala-{env}-secret-database`
- `goal-mandala-{env}-secret-jwt`
- `goal-mandala-{env}-secret-external-apis`

**確認項目：**

- シークレットの存在
- KMS暗号化の設定
- 適切な命名規則の適用
- 環境別タグの設定

### 2. Lambda関数からのシークレット取得テスト

統合テスト用Lambda関数を通じてシークレットにアクセスできることを確認します。

**確認項目：**

- 各シークレットへのアクセス成功
- レスポンス時間の測定
- エラーハンドリングの動作
- IAM権限の適切な設定

**統合テスト用Lambda関数：**

- 関数名: `goal-mandala-{env}-secrets-integration-test`
- テスト・開発環境でのみ自動作成
- SecretsManagerからの取得テスト機能を内蔵

### 3. 環境別アクセス制御テスト

環境間でのシークレット分離が適切に機能することを確認します。

**確認項目：**

- 現在の環境のシークレットへのアクセス成功
- 他の環境のシークレットへのアクセス拒否
- 環境別命名規則の適用
- 環境別IAMポリシーの動作

### 4. ローテーション機能テスト

シークレットローテーション機能が正しく設定されていることを確認します。

**確認項目：**

- ローテーション設定の有効性
- ローテーション用Lambda関数の存在
- ローテーション履歴の確認
- ローテーション失敗時のアラート設定

### 5. パフォーマンステスト

シークレット取得のパフォーマンスを測定します。

**確認項目：**

- 平均レスポンス時間（目標：2秒未満）
- 95パーセンタイルレイテンシ（目標：5秒未満）
- 成功率（目標：95%以上）
- 同時接続数での負荷テスト
- スループット（リクエスト/秒）

### 6. セキュリティ設定テスト

セキュリティ設定が適切に適用されていることを確認します。

**確認項目：**

- KMS暗号化の確認
- IAMロールの存在確認
- 最小権限ポリシーの確認
- 環境タグの確認

### 7. 監視・アラート設定テスト

監視とアラート設定が正しく機能することを確認します。

**確認項目：**

- CloudWatchメトリクスの確認
- カスタムメトリクスの確認
- アラーム設定の確認
- SNS通知設定の確認

### 8. エラーハンドリングテスト

エラーハンドリングが適切に機能することを確認します。

**確認項目：**

- 存在しないシークレットへのアクセス
- アクセス拒否エラーの処理
- スロットリングエラーの処理
- ネットワークエラーの処理

## テスト結果の解釈

### 成功例

```json
{
  "summary": {
    "totalTests": 5,
    "passedTests": 5,
    "failedTests": 0,
    "successRate": 100
  },
  "secretsExistence": {
    "success": true,
    "results": [
      {
        "secretName": "goal-mandala-test-secret-database",
        "exists": true,
        "encrypted": true,
        "lastRotated": "2024-01-15T10:30:00Z"
      }
    ]
  }
}
```

### 失敗例と対処法

#### シークレットが見つからない場合

```json
{
  "secretsExistence": {
    "success": false,
    "results": [
      {
        "secretName": "goal-mandala-test-secret-database",
        "exists": false,
        "error": "ResourceNotFoundException"
      }
    ]
  }
}
```

**対処法：**

1. CDKスタックが正しくデプロイされているか確認
2. 環境名が正しく設定されているか確認
3. AWS認証情報とリージョンが正しいか確認

#### Lambda関数アクセスエラー

```json
{
  "lambdaAccess": {
    "success": false,
    "results": [
      {
        "secretName": "goal-mandala-test-secret-database",
        "success": false,
        "error": "AccessDenied"
      }
    ]
  }
}
```

**対処法：**

1. Lambda関数のIAM権限を確認
2. シークレットのリソースポリシーを確認
3. KMS暗号化キーへのアクセス権限を確認

#### パフォーマンステスト失敗

```json
{
  "performance": {
    "success": false,
    "results": {
      "averageLatency": 3500,
      "successRate": 85,
      "thresholds": {
        "maxLatency": 2000,
        "minSuccessRate": 95
      }
    }
  }
}
```

**対処法：**

1. Lambda関数のメモリ設定を増加
2. VPC設定によるレイテンシ影響を確認
3. 同時実行数制限を確認
4. CloudWatchメトリクスで詳細分析

## CI/CDでの統合

### GitHub Actionsでの実行例

```yaml
name: SecretsManager Integration Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  integration-tests:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        environment: [dev, stg]

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ap-northeast-1

      - name: Run integration tests
        run: |
          cd packages/infrastructure
          ./scripts/run-integration-tests.sh ${{ matrix.environment }}
        env:
          ENVIRONMENT: ${{ matrix.environment }}

      - name: Upload test results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: integration-test-results-${{ matrix.environment }}
          path: packages/infrastructure/integration-test-results-*.json
```

## トラブルシューティング

### よくある問題

#### 1. AWS認証エラー

```bash
Error: AWS credentials not configured or invalid
```

**解決方法：**

```bash
aws configure
# または
export AWS_ACCESS_KEY_ID=your_key
export AWS_SECRET_ACCESS_KEY=your_secret
```

#### 2. Lambda関数が見つからない

```bash
Warning: Could not auto-detect Lambda function name
```

**解決方法：**

```bash
# Lambda関数名を明示的に指定
./scripts/run-integration-tests.sh dev --lambda-function your-function-name
```

#### 3. 権限不足エラー

```bash
Error: AccessDenied
```

**解決方法：**

1. IAM権限を確認
2. リソースポリシーを確認
3. 環境別アクセス制御設定を確認

### ログの確認

詳細なログを確認するには：

```bash
# デバッグモードで実行
DEBUG=true ./scripts/run-integration-tests.sh test

# AWS CLIのデバッグログを有効化
export AWS_CLI_FILE_ENCODING=UTF-8
aws configure set cli_follow_redirects false
```

## ベストプラクティス

### 1. 定期実行

統合テストは以下のタイミングで実行することを推奨します：

- CDKスタックデプロイ後
- 本番環境への変更前
- 定期的なヘルスチェック（週次）

### 2. 環境別設定

各環境に応じてテスト設定を調整：

```bash
# 開発環境：基本テストのみ
./scripts/run-integration-tests.sh dev

# ステージング環境：パフォーマンステスト付き
./scripts/run-integration-tests.sh stg --performance

# 本番環境：軽量なヘルスチェック
./scripts/run-integration-tests.sh prod --concurrency 1 --duration 10000
```

### 3. 結果の保存と分析

テスト結果は以下の方法で保存・分析：

```bash
# 結果をS3に保存
aws s3 cp integration-test-results-*.json s3://your-bucket/test-results/

# CloudWatchメトリクスとして送信
aws cloudwatch put-metric-data \
  --namespace "GoalMandala/IntegrationTests" \
  --metric-data MetricName=SuccessRate,Value=100,Unit=Percent
```

## 関連ドキュメント

- [SecretsManagerConstruct設計ドキュメント](../design.md)
- [セキュリティガイド](../../docs/security-checklist.md)
- [運用手順書](../../docs/operations-guide.md)
- [トラブルシューティングガイド](../../TROUBLESHOOTING.md)
