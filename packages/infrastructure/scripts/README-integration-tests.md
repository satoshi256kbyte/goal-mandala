# SecretsManager統合テスト実行ガイド

このディレクトリには、SecretsManagerConstructの統合テストを実行するためのスクリプトが含まれています。

## ファイル構成

- `run-secrets-integration-tests.ts` - メインの統合テスト実行スクリプト
- `check-integration-test-readiness.sh` - 統合テスト実行前の準備確認スクリプト
- `README-integration-tests.md` - このファイル

## クイックスタート

### 1. 実行準備確認

統合テストを実行する前に、必要な条件が満たされているかを確認します：

```bash
# 基本確認（test環境）
./scripts/check-integration-test-readiness.sh

# 特定の環境での確認
./scripts/check-integration-test-readiness.sh dev ap-northeast-1 goal-mandala
```

### 2. 統合テスト実行

準備が完了したら、統合テストを実行します：

```bash
# 基本実行
pnpm run test:integration:secrets

# 特定の環境での実行
pnpm run test:integration:secrets:dev

# パフォーマンステスト付き実行
pnpm run test:integration:secrets:performance
```

### 3. 詳細オプション指定

より詳細な設定で実行する場合：

```bash
ts-node scripts/run-secrets-integration-tests.ts \
  --env=dev \
  --region=ap-northeast-1 \
  --stack-prefix=goal-mandala \
  --test-lambda=goal-mandala-dev-secrets-integration-test \
  --perf-duration=120000 \
  --perf-concurrency=10
```

## 利用可能なオプション

### run-secrets-integration-tests.ts

| オプション           | 説明                               | デフォルト値     |
| -------------------- | ---------------------------------- | ---------------- |
| `--env`              | テスト対象の環境                   | `test`           |
| `--region`           | AWSリージョン                      | `ap-northeast-1` |
| `--stack-prefix`     | スタックプレフィックス             | `goal-mandala`   |
| `--test-lambda`      | テスト用Lambda関数名               | 自動検出         |
| `--perf-duration`    | パフォーマンステスト実行時間（ms） | `60000`          |
| `--perf-concurrency` | パフォーマンステスト並行数         | `5`              |

### check-integration-test-readiness.sh

```bash
./scripts/check-integration-test-readiness.sh [ENVIRONMENT] [REGION] [STACK_PREFIX]
```

- `ENVIRONMENT`: テスト対象の環境（デフォルト: `test`）
- `REGION`: AWSリージョン（デフォルト: `ap-northeast-1`）
- `STACK_PREFIX`: スタックプレフィックス（デフォルト: `goal-mandala`）

## テスト内容

統合テストでは以下の項目を検証します：

1. **シークレット存在確認** - CDKデプロイ後のシークレット作成確認
2. **Lambda関数アクセス** - Lambda関数からのシークレット取得テスト
3. **環境別アクセス制御** - 環境間でのシークレット分離確認
4. **ローテーション機能** - シークレットローテーション設定確認
5. **パフォーマンス** - シークレット取得のパフォーマンス測定
6. **セキュリティ設定** - KMS暗号化、IAM権限の確認
7. **監視・アラート** - CloudWatchメトリクス、アラーム設定確認
8. **エラーハンドリング** - 各種エラーケースの処理確認

## 前提条件

### 必要なツール

- Node.js 18以上
- AWS CLI v2
- pnpm または npm
- TypeScript
- ts-node

### AWS認証情報

以下のいずれかの方法でAWS認証情報を設定してください：

```bash
# AWS CLIでの設定
aws configure

# 環境変数での設定
export AWS_ACCESS_KEY_ID=your_access_key
export AWS_SECRET_ACCESS_KEY=your_secret_key
export AWS_REGION=ap-northeast-1
```

### 必要なIAM権限

統合テストを実行するユーザー/ロールには以下の権限が必要です：

- `secretsmanager:DescribeSecret`
- `secretsmanager:GetSecretValue`
- `secretsmanager:ListSecrets`
- `lambda:GetFunction`
- `lambda:InvokeFunction`
- `cloudwatch:GetMetricStatistics`
- `cloudwatch:ListMetrics`

## テスト結果

テスト結果は以下の場所に保存されます：

- `test-results/secrets-manager-integration-test-{environment}-{timestamp}.json`
- `test-results/secrets-manager-integration-test-{environment}-latest.json`

### 結果の例

```json
{
  "environment": "dev",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "totalTests": 8,
  "passedTests": 7,
  "failedTests": 1,
  "successRate": 87.5,
  "summary": {
    "secretsExistence": true,
    "lambdaAccess": true,
    "environmentIsolation": true,
    "rotationFunctionality": false,
    "performanceMetrics": true
  }
}
```

## トラブルシューティング

### よくある問題

#### 1. AWS認証エラー

```
Error: AWS credentials not configured or invalid
```

**解決方法：**

```bash
aws configure
# または
export AWS_ACCESS_KEY_ID=your_key
export AWS_SECRET_ACCESS_KEY=your_secret
```

#### 2. シークレットが見つからない

```
❌ シークレット不存在: goal-mandala-test-secret-database
```

**解決方法：**

- CDKスタックがデプロイされているか確認
- 環境名とスタックプレフィックスが正しいか確認

#### 3. Lambda関数が見つからない

```
⚠️ Test Lambda function name not provided, skipping Lambda access test
```

**解決方法：**

- 統合テスト用Lambda関数は test, dev 環境でのみ自動作成されます
- 手動でLambda関数名を指定: `--test-lambda=function-name`

#### 4. 権限不足エラー

```
Error: AccessDenied
```

**解決方法：**

- IAM権限を確認
- リソースポリシーを確認
- 環境別アクセス制御設定を確認

### デバッグモード

詳細なログを確認するには：

```bash
# デバッグモードで実行
DEBUG=1 ts-node scripts/run-secrets-integration-tests.ts --env=dev
```

## CI/CD統合

### GitHub Actions例

```yaml
- name: Check Integration Test Readiness
  run: ./packages/infrastructure/scripts/check-integration-test-readiness.sh dev

- name: Run SecretsManager Integration Tests
  run: pnpm run test:integration:secrets:dev
  env:
    AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
    AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
    AWS_REGION: ap-northeast-1
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
ts-node scripts/run-secrets-integration-tests.ts --env=dev

# ステージング環境：パフォーマンステスト付き
ts-node scripts/run-secrets-integration-tests.ts --env=stg --perf-duration=120000

# 本番環境：軽量なヘルスチェック
ts-node scripts/run-secrets-integration-tests.ts --env=prod --perf-duration=30000 --perf-concurrency=2
```

### 3. 結果の保存と分析

テスト結果を継続的に分析：

```bash
# 結果をS3に保存
aws s3 cp test-results/ s3://your-bucket/integration-test-results/ --recursive

# CloudWatchメトリクスとして送信
aws cloudwatch put-metric-data \
  --namespace "GoalMandala/IntegrationTests" \
  --metric-data MetricName=SuccessRate,Value=87.5,Unit=Percent
```

## 関連ドキュメント

- [SecretsManager統合テストガイド](../docs/secrets-manager-integration-tests.md)
- [SecretsManagerConstruct設計ドキュメント](../.kiro/specs/1.2.4-secrets-manager-setup/design.md)
- [セキュリティガイド](../../.kiro/steering/8-security-guide.md)
- [実装ガイド](../../.kiro/steering/7-implementation-guide.md)
