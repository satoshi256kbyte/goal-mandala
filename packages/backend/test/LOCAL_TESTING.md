# Step Functions ローカルテスト環境

## 概要

このドキュメントは、Step Functions統合機能のローカルテスト環境のセットアップと使用方法を説明します。

## 前提条件

- Docker Desktop がインストールされていること
- Node.js 23.10.0 以上
- pnpm 8.0.0 以上

## セットアップ

### 1. Docker環境の起動

```bash
# packages/backend ディレクトリから実行
cd packages/backend

# ローカルテスト環境を起動
docker-compose -f docker-compose.local.yml up -d

# ヘルスチェック
docker-compose -f docker-compose.local.yml ps
```

### 2. 環境変数の設定

`.env.local` ファイルを作成：

```bash
# Step Functions Local
STEPFUNCTIONS_ENDPOINT=http://localhost:8083

# DynamoDB Local
DYNAMODB_ENDPOINT=http://localhost:8000

# PostgreSQL Test
DATABASE_URL=postgresql://goal_mandala_user:test_password@localhost:5433/goal_mandala_test

# Lambda Endpoint (SAM Local)
LAMBDA_ENDPOINT=http://localhost:3001

# テストモード
NODE_ENV=test
```

### 3. State Machine定義の検証

```bash
# State Machine定義の構文チェック
npm run workflow:validate

# または直接実行
aws stepfunctions validate-state-machine-definition \
  --definition file://src/workflows/state-machines/task-generation-workflow.json \
  --endpoint-url http://localhost:8083
```

## 使用方法

### State Machineの作成

```bash
# State Machineをローカル環境に作成
npm run workflow:create-local

# または直接実行
aws stepfunctions create-state-machine \
  --name TaskGenerationWorkflow-local \
  --definition file://src/workflows/state-machines/task-generation-workflow.json \
  --role-arn arn:aws:iam::123456789012:role/DummyRole \
  --endpoint-url http://localhost:8083
```

### ワークフローの実行

```bash
# ワークフローを実行
npm run workflow:execute-local

# または直接実行
aws stepfunctions start-execution \
  --state-machine-arn arn:aws:states:us-east-1:123456789012:stateMachine:TaskGenerationWorkflow-local \
  --name test-execution-$(date +%s) \
  --input file://test/fixtures/workflow-input.json \
  --endpoint-url http://localhost:8083
```

### 実行状況の確認

```bash
# 実行状況を確認
aws stepfunctions describe-execution \
  --execution-arn <execution-arn> \
  --endpoint-url http://localhost:8083

# 実行履歴を確認
aws stepfunctions get-execution-history \
  --execution-arn <execution-arn> \
  --endpoint-url http://localhost:8083
```

## テストシナリオ

### 1. 正常系テスト

全アクションが成功するシナリオ：

```bash
npm run test:workflow:happy-path
```

### 2. 部分失敗テスト

一部のアクションが失敗するシナリオ：

```bash
npm run test:workflow:partial-failure
```

### 3. バリデーションエラーテスト

入力データが不正なシナリオ：

```bash
npm run test:workflow:validation-error
```

### 4. タイムアウトテスト

処理がタイムアウトするシナリオ：

```bash
npm run test:workflow:timeout
```

## モックサービス

### Lambda関数のモック

Lambda関数は `test/mocks/lambda` ディレクトリに配置されたモック実装を使用します：

- `validate-input.mock.ts`: 入力検証のモック
- `get-actions.mock.ts`: アクション取得のモック
- `task-generation.mock.ts`: タスク生成のモック
- `save-tasks.mock.ts`: タスク保存のモック

### DynamoDBのモック

DynamoDB Localを使用してワークフロー実行履歴を保存します。

テーブル作成：

```bash
npm run dynamodb:create-tables-local
```

### AI APIのモック

AI API（Bedrock）のモックは `test/mocks/ai-service.mock.ts` に実装されています。

## デバッグ

### ログの確認

```bash
# Step Functions Localのログ
docker-compose -f docker-compose.local.yml logs -f stepfunctions-local

# DynamoDB Localのログ
docker-compose -f docker-compose.local.yml logs -f dynamodb-local

# PostgreSQLのログ
docker-compose -f docker-compose.local.yml logs -f postgres-test
```

### State Machine定義のデバッグ

```bash
# State Machine定義を表示
aws stepfunctions describe-state-machine \
  --state-machine-arn <state-machine-arn> \
  --endpoint-url http://localhost:8083
```

### 実行履歴の詳細確認

```bash
# 実行履歴を詳細表示
aws stepfunctions get-execution-history \
  --execution-arn <execution-arn> \
  --max-results 100 \
  --endpoint-url http://localhost:8083 \
  | jq '.events[] | {timestamp, type, details}'
```

## トラブルシューティング

### Step Functions Localが起動しない

```bash
# コンテナの状態確認
docker-compose -f docker-compose.local.yml ps

# コンテナの再起動
docker-compose -f docker-compose.local.yml restart stepfunctions-local

# ログの確認
docker-compose -f docker-compose.local.yml logs stepfunctions-local
```

### Lambda関数が呼び出せない

Lambda Endpointの設定を確認：

```bash
# 環境変数の確認
echo $LAMBDA_ENDPOINT

# SAM Localが起動しているか確認
curl http://localhost:3001/health
```

### DynamoDBに接続できない

```bash
# DynamoDB Localの状態確認
docker-compose -f docker-compose.local.yml ps dynamodb-local

# テーブル一覧を確認
aws dynamodb list-tables --endpoint-url http://localhost:8000
```

## クリーンアップ

```bash
# コンテナを停止
docker-compose -f docker-compose.local.yml down

# データも削除する場合
docker-compose -f docker-compose.local.yml down -v
```

## 参考資料

- [AWS Step Functions Local](https://docs.aws.amazon.com/step-functions/latest/dg/sfn-local.html)
- [DynamoDB Local](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DynamoDBLocal.html)
- [AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-install.html)
