# 非同期処理トラブルシューティングガイド

## 概要

このドキュメントは、AI生成非同期処理システムで発生する可能性のある問題と、その解決方法を記載します。

## 目次

1. [よくある問題](#よくある問題)
2. [エラー別対応](#エラー別対応)
3. [パフォーマンス問題](#パフォーマンス問題)
4. [データ整合性問題](#データ整合性問題)
5. [診断ツール](#診断ツール)

---

## よくある問題

### 1. 処理が完了しない

#### 症状

- 処理状態が「PROCESSING」のまま進まない
- 進捗率が更新されない
- 完了予定時刻を過ぎても完了しない

#### 原因

1. **Step Functions実行の停止**
   - Lambda関数のタイムアウト
   - Step Functionsのタイムアウト
   - Lambda同時実行数の制限

2. **AI生成の遅延**
   - Bedrock APIのレスポンス遅延
   - Bedrock APIのスロットリング
   - プロンプトが複雑すぎる

3. **データベース接続の問題**
   - 接続プールの枯渇
   - データベースのロック
   - ネットワークの問題

#### 解決方法

##### Step 1: 処理状態の確認

```bash
# CloudWatch Logsで最新のログを確認
aws logs filter-log-events \
  --log-group-name /aws/lambda/ai-generation-worker \
  --filter-pattern "processId=<PROCESS_ID>" \
  --start-time $(date -u -d '1 hour ago' +%s)000
```

##### Step 2: Step Functions実行状態の確認

1. AWS Management Console → Step Functions
2. 該当のステートマシンを選択
3. 実行履歴から該当の実行を検索
4. 実行グラフで停止している状態を確認

##### Step 3: 対応

**Lambda関数のタイムアウトの場合**:

```bash
# Lambda関数のタイムアウト設定を確認
aws lambda get-function-configuration \
  --function-name ai-generation-worker

# タイムアウトを延長（例: 300秒 → 600秒）
aws lambda update-function-configuration \
  --function-name ai-generation-worker \
  --timeout 600
```

**Bedrock APIのスロットリングの場合**:

- リトライ設定を確認
- リクエスト頻度を調整
- Bedrock APIのクォータ引き上げを申請

**データベース接続の問題の場合**:

```typescript
// Prismaの接続プール設定を調整
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  pool_timeout = 30
  connection_limit = 10
}
```

##### Step 4: 手動での処理完了

最終手段として、手動で処理を完了状態に更新：

```sql
-- 処理状態を確認
SELECT * FROM processing_state WHERE id = '<PROCESS_ID>';

-- 手動で完了状態に更新（注意: 結果データが不完全な可能性あり）
UPDATE processing_state
SET
  status = 'FAILED',
  error = '{"code": "MANUAL_INTERVENTION", "message": "手動で失敗状態に更新"}',
  completed_at = NOW()
WHERE id = '<PROCESS_ID>';
```

---

### 2. エラー率が高い

#### 症状

- エラー率が5%を超える
- 特定の処理タイプでエラーが多発
- CloudWatchアラートが頻繁に発火

#### 原因

1. **AI生成エラー**
   - Bedrock APIのエラー
   - プロンプトの問題
   - モデルの問題

2. **データベースエラー**
   - 接続エラー
   - クエリエラー
   - 制約違反

3. **バリデーションエラー**
   - 入力値の不正
   - データ形式の不一致

#### 解決方法

##### Step 1: エラーログの分析

```bash
# エラーログを集計
aws logs filter-log-events \
  --log-group-name /aws/lambda/ai-generation-worker \
  --filter-pattern "ERROR" \
  --start-time $(date -u -d '24 hours ago' +%s)000 \
  | jq '.events[].message' \
  | jq -s 'group_by(.error.code) | map({code: .[0].error.code, count: length})'
```

##### Step 2: エラー種別ごとの対応

**AI_ERROR（Bedrock APIエラー）**:

```typescript
// リトライ設定の確認と調整
const RETRY_CONFIG = {
  maxAttempts: 3,
  backoffRate: 2,
  initialInterval: 1000,
};

// エラーハンドリングの強化
try {
  const result = await bedrockService.generate(prompt);
} catch (error) {
  if (error.name === 'ThrottlingException') {
    // スロットリングエラーの場合は待機時間を長くする
    await sleep(5000);
    return retry();
  }
  throw error;
}
```

**DATABASE_ERROR（データベースエラー）**:

```sql
-- 接続数を確認
SELECT count(*) FROM pg_stat_activity;

-- ロック状態を確認
SELECT * FROM pg_locks WHERE NOT granted;

-- 長時間実行中のクエリを確認
SELECT pid, now() - pg_stat_activity.query_start AS duration, query
FROM pg_stat_activity
WHERE state = 'active'
ORDER BY duration DESC;
```

**VALIDATION_ERROR（バリデーションエラー）**:

- 入力値のバリデーションルールを確認
- フロントエンドのバリデーションを強化
- エラーメッセージを改善

##### Step 3: 予防策

1. **入力値の事前検証を強化**
2. **リトライロジックの改善**
3. **エラーハンドリングの強化**
4. **監視アラートの調整**

---

### 3. 処理が遅い

#### 症状

- 処理完了時間が目標値を超える
- ユーザーから処理が遅いとの報告
- 平均処理時間が増加傾向

#### 原因

1. **Bedrock APIのレスポンス遅延**
2. **データベースクエリの遅延**
3. **Lambda関数のコールドスタート**
4. **メモリ不足**

#### 解決方法

##### Step 1: ボトルネックの特定

```bash
# 処理時間の分析
aws logs insights query \
  --log-group-name /aws/lambda/ai-generation-worker \
  --start-time $(date -u -d '24 hours ago' +%s) \
  --end-time $(date -u +%s) \
  --query-string 'fields @timestamp, duration, type
    | filter level = "INFO" and message like /完了/
    | stats avg(duration), max(duration), min(duration) by type'
```

##### Step 2: パフォーマンス改善

**Bedrock APIの最適化**:

```typescript
// プロンプトの最適化
const optimizedPrompt = `
簡潔に8つのサブ目標を生成してください。
各サブ目標は以下の形式で出力してください：
- タイトル: [タイトル]
- 説明: [説明]
`;

// タイムアウト設定の調整
const config = {
  timeout: 60000, // 60秒
};
```

**データベースクエリの最適化**:

```sql
-- インデックスの追加
CREATE INDEX idx_processing_state_user_created
ON processing_state(user_id, created_at DESC);

-- クエリの最適化
EXPLAIN ANALYZE
SELECT * FROM processing_state
WHERE user_id = '<USER_ID>'
ORDER BY created_at DESC
LIMIT 20;
```

**Lambda関数の最適化**:

```bash
# メモリサイズを増加
aws lambda update-function-configuration \
  --function-name ai-generation-worker \
  --memory-size 2048

# Provisioned Concurrencyの設定
aws lambda put-provisioned-concurrency-config \
  --function-name ai-generation-worker \
  --provisioned-concurrent-executions 5 \
  --qualifier $LATEST
```

---

### 4. リトライが失敗する

#### 症状

- リトライしても同じエラーが発生
- リトライ回数が上限に達する
- リトライ後も処理が完了しない

#### 原因

1. **永続的なエラー**
   - データの不整合
   - 設定の問題
   - 外部サービスの障害

2. **リトライロジックの問題**
   - リトライ条件が不適切
   - バックオフ時間が短すぎる

#### 解決方法

##### Step 1: エラーの種類を確認

```bash
# リトライ履歴を確認
aws logs filter-log-events \
  --log-group-name /aws/lambda/retry-handler \
  --filter-pattern "processId=<PROCESS_ID>"
```

##### Step 2: 永続的なエラーの対応

**データの不整合**:

```sql
-- 関連データの確認
SELECT * FROM goals WHERE id = '<GOAL_ID>';
SELECT * FROM sub_goals WHERE goal_id = '<GOAL_ID>';
SELECT * FROM actions WHERE sub_goal_id = '<SUB_GOAL_ID>';

-- データの修正
UPDATE goals SET status = 'ACTIVE' WHERE id = '<GOAL_ID>';
```

**設定の問題**:

- 環境変数を確認
- IAMロールの権限を確認
- Secrets Managerの設定を確認

##### Step 3: リトライロジックの改善

```typescript
// リトライ可能なエラーの判定を改善
function isRetryableError(error: Error): boolean {
  const retryableErrors = [
    'ThrottlingException',
    'ServiceUnavailableException',
    'DatabaseConnectionError',
    'NetworkError',
  ];

  return retryableErrors.some(e => error.name.includes(e));
}

// バックオフ時間の調整
const backoffTime = Math.min(
  initialInterval * Math.pow(backoffRate, retryCount),
  maxInterval
);
```

---

### 5. キャンセルが効かない

#### 症状

- キャンセルリクエストを送信しても処理が継続
- ステータスが「CANCELLED」にならない
- Step Functionsの実行が停止しない

#### 原因

1. **Step Functionsの実行停止失敗**
2. **Lambda関数の実行継続**
3. **状態更新の失敗**

#### 解決方法

##### Step 1: Step Functionsの実行状態を確認

```bash
# 実行中の処理を確認
aws stepfunctions list-executions \
  --state-machine-arn <STATE_MACHINE_ARN> \
  --status-filter RUNNING

# 実行を強制停止
aws stepfunctions stop-execution \
  --execution-arn <EXECUTION_ARN> \
  --error "ManualCancellation" \
  --cause "手動でキャンセルされました"
```

##### Step 2: データベースの状態を更新

```sql
-- 処理状態を確認
SELECT * FROM processing_state WHERE id = '<PROCESS_ID>';

-- 手動でキャンセル状態に更新
UPDATE processing_state
SET
  status = 'CANCELLED',
  completed_at = NOW(),
  updated_at = NOW()
WHERE id = '<PROCESS_ID>';
```

##### Step 3: Lambda関数の実行を確認

```bash
# 実行中のLambda関数を確認
aws lambda list-functions \
  --query 'Functions[?FunctionName==`ai-generation-worker`]'

# 必要に応じてLambda関数を再デプロイ
aws lambda update-function-code \
  --function-name ai-generation-worker \
  --zip-file fileb://function.zip
```

---

## エラー別対応

### AI_ERROR

#### 説明

Bedrock APIでエラーが発生しました。

#### 原因

- Bedrock APIのスロットリング
- モデルの応答エラー
- プロンプトの問題

#### 対応手順

1. **エラーメッセージを確認**

```bash
aws logs filter-log-events \
  --log-group-name /aws/lambda/ai-generation-worker \
  --filter-pattern "AI_ERROR"
```

2. **Bedrock APIの状態を確認**
   - AWS Service Health Dashboardを確認
   - Bedrock APIのクォータを確認

3. **リトライを実行**
   - 自動リトライが失敗している場合は手動でリトライ

4. **プロンプトを見直し**
   - プロンプトが複雑すぎないか確認
   - トークン数を確認

### DATABASE_ERROR

#### 説明

データベース操作でエラーが発生しました。

#### 原因

- 接続エラー
- クエリエラー
- 制約違反

#### 対応手順

1. **データベース接続を確認**

```bash
# RDSの状態を確認
aws rds describe-db-instances \
  --db-instance-identifier <DB_INSTANCE_ID>

# 接続テスト
psql -h <DB_HOST> -U <DB_USER> -d <DB_NAME> -c "SELECT 1;"
```

2. **エラーログを確認**

```sql
-- PostgreSQLのログを確認
SELECT * FROM pg_stat_activity WHERE state = 'active';
```

3. **接続プールを確認**

```typescript
// Prismaの接続プール設定
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  connection_limit = 10
}
```

4. **必要に応じて再起動**

```bash
# RDSの再起動
aws rds reboot-db-instance \
  --db-instance-identifier <DB_INSTANCE_ID>
```

### TIMEOUT_ERROR

#### 説明

処理時間が制限を超えました。

#### 原因

- 処理が複雑すぎる
- 外部APIのレスポンス遅延
- リソース不足

#### 対応手順

1. **処理時間を分析**

```bash
aws logs insights query \
  --log-group-name /aws/lambda/ai-generation-worker \
  --query-string 'fields @timestamp, duration
    | filter level = "INFO"
    | stats avg(duration), max(duration) by type'
```

2. **タイムアウト設定を調整**

```bash
# Lambda関数のタイムアウトを延長
aws lambda update-function-configuration \
  --function-name ai-generation-worker \
  --timeout 600

# Step Functionsのタイムアウトを延長
# CDKコードを修正してデプロイ
```

3. **処理を分割**
   - 大きな処理を小さな処理に分割
   - バッチ処理の導入を検討

### VALIDATION_ERROR

#### 説明

入力値が不正です。

#### 原因

- 必須フィールドの欠落
- 形式の不一致
- 値の範囲外

#### 対応手順

1. **バリデーションエラーの詳細を確認**

```json
{
  "code": "VALIDATION_ERROR",
  "message": "入力値が不正です",
  "details": [
    {
      "field": "params.title",
      "message": "タイトルは1文字以上200文字以内で入力してください"
    }
  ]
}
```

2. **入力値を修正**
   - フロントエンドのバリデーションを確認
   - APIリクエストを修正

3. **バリデーションルールを見直し**

```typescript
// Zodスキーマの確認
const schema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
});
```

---

## パフォーマンス問題

### Lambda関数のコールドスタート

#### 症状

- 初回実行が遅い
- 一定時間後の実行が遅い

#### 対応

1. **Provisioned Concurrencyの設定**

```bash
aws lambda put-provisioned-concurrency-config \
  --function-name ai-generation-worker \
  --provisioned-concurrent-executions 5 \
  --qualifier $LATEST
```

2. **初期化処理の最適化**

```typescript
// グローバルスコープで初期化
const prisma = new PrismaClient();
const bedrockClient = new BedrockRuntimeClient({});

export const handler = async event => {
  // ハンドラー内では初期化済みのクライアントを使用
};
```

### データベースクエリの遅延

#### 症状

- クエリ実行時間が長い
- データベース接続のタイムアウト

#### 対応

1. **スロークエリの特定**

```sql
-- スロークエリログを確認
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

2. **インデックスの追加**

```sql
-- 実行計画を確認
EXPLAIN ANALYZE
SELECT * FROM processing_state
WHERE user_id = '<USER_ID>'
ORDER BY created_at DESC;

-- インデックスを追加
CREATE INDEX idx_processing_state_user_created
ON processing_state(user_id, created_at DESC);
```

3. **クエリの最適化**

```typescript
// N+1問題の解消
const processes = await prisma.processingState.findMany({
  where: { userId },
  include: {
    user: true, // リレーションを一度に取得
  },
});
```

---

## データ整合性問題

### 処理状態とStep Functionsの不一致

#### 症状

- データベースの状態とStep Functionsの実行状態が一致しない
- 処理が完了しているのにステータスが「PROCESSING」

#### 対応

1. **両方の状態を確認**

```bash
# データベースの状態
psql -c "SELECT * FROM processing_state WHERE id = '<PROCESS_ID>';"

# Step Functionsの実行状態
aws stepfunctions describe-execution \
  --execution-arn <EXECUTION_ARN>
```

2. **不一致を修正**

```sql
-- Step Functionsが完了しているのにデータベースが未完了の場合
UPDATE processing_state
SET
  status = 'COMPLETED',
  progress = 100,
  completed_at = NOW()
WHERE id = '<PROCESS_ID>';
```

### 進捗率の異常

#### 症状

- 進捗率が100%を超える
- 進捗率が減少する
- 進捗率が更新されない

#### 対応

1. **進捗率を確認**

```sql
SELECT id, type, status, progress, created_at, updated_at
FROM processing_state
WHERE progress > 100 OR progress < 0;
```

2. **進捗率を修正**

```sql
-- 異常な進捗率を修正
UPDATE processing_state
SET progress = LEAST(GREATEST(progress, 0), 100)
WHERE progress > 100 OR progress < 0;
```

---

## 診断ツール

### ヘルスチェックスクリプト

```bash
#!/bin/bash
# health-check.sh

echo "=== 非同期処理システムヘルスチェック ==="

# Lambda関数の状態確認
echo "1. Lambda関数の状態"
aws lambda get-function \
  --function-name async-processing-handler \
  --query 'Configuration.State'

# Step Functionsの実行状態
echo "2. Step Functions実行状態"
aws stepfunctions list-executions \
  --state-machine-arn <STATE_MACHINE_ARN> \
  --status-filter RUNNING \
  --max-results 10

# データベース接続確認
echo "3. データベース接続"
psql -h <DB_HOST> -U <DB_USER> -d <DB_NAME> -c "SELECT 1;"

# 処理中の件数
echo "4. 処理中の件数"
psql -h <DB_HOST> -U <DB_USER> -d <DB_NAME> \
  -c "SELECT status, COUNT(*) FROM processing_state GROUP BY status;"

# エラー率
echo "5. 過去1時間のエラー率"
aws logs filter-log-events \
  --log-group-name /aws/lambda/ai-generation-worker \
  --filter-pattern "ERROR" \
  --start-time $(date -u -d '1 hour ago' +%s)000 \
  | jq '.events | length'

echo "=== ヘルスチェック完了 ==="
```

### ログ分析スクリプト

```bash
#!/bin/bash
# analyze-logs.sh

PROCESS_ID=$1

echo "=== 処理ID: $PROCESS_ID のログ分析 ==="

# 全ログを取得
aws logs filter-log-events \
  --log-group-name /aws/lambda/ai-generation-worker \
  --filter-pattern "processId=$PROCESS_ID" \
  --start-time $(date -u -d '24 hours ago' +%s)000 \
  | jq '.events[].message' \
  | jq -s '.'

echo "=== ログ分析完了 ==="
```

### パフォーマンス分析スクリプト

```bash
#!/bin/bash
# analyze-performance.sh

echo "=== パフォーマンス分析 ==="

# 処理時間の統計
aws logs insights query \
  --log-group-name /aws/lambda/ai-generation-worker \
  --start-time $(date -u -d '24 hours ago' +%s) \
  --end-time $(date -u +%s) \
  --query-string 'fields @timestamp, duration, type
    | filter level = "INFO" and message like /完了/
    | stats avg(duration), max(duration), min(duration), count(*) by type'

# メモリ使用量
aws logs insights query \
  --log-group-name /aws/lambda/ai-generation-worker \
  --start-time $(date -u -d '24 hours ago' +%s) \
  --end-time $(date -u +%s) \
  --query-string 'fields @timestamp, @maxMemoryUsed, @memorySize
    | stats avg(@maxMemoryUsed), max(@maxMemoryUsed) by bin(5m)'

echo "=== パフォーマンス分析完了 ==="
```

---

## 緊急連絡先

### サポートチーム

- **メール**: support@example.com
- **Slack**: #async-processing-support
- **電話**: +81-XX-XXXX-XXXX（営業時間: 9:00-18:00 JST）

### エスカレーション

| レベル | 対応者           | 連絡先           | 対応時間  |
| ------ | ---------------- | ---------------- | --------- |
| L1     | オンコール担当者 | Slack, PagerDuty | 即座      |
| L2     | チームリーダー   | 電話             | 30分以内  |
| L3     | マネージャー     | 電話             | 1時間以内 |

---

## 参考資料

- [API仕様書](./async-processing-api-specification.md)
- [運用ガイド](./async-processing-operations-guide.md)
- [エラーコード一覧](./async-processing-error-codes.md)
- [AWS Lambda トラブルシューティング](https://docs.aws.amazon.com/lambda/latest/dg/lambda-troubleshooting.html)
- [AWS Step Functions トラブルシューティング](https://docs.aws.amazon.com/step-functions/latest/dg/troubleshooting.html)
