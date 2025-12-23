# Step Functions統合 開発者ドキュメント

## 概要

このドキュメントは、Step Functions統合機能の開発に関するガイドです。アーキテクチャ、コンポーネント、ローカル開発手順について説明します。

## 目次

1. [アーキテクチャ](#アーキテクチャ)
2. [コンポーネント](#コンポーネント)
3. [State Machine定義](#state-machine定義)
4. [Lambda関数](#lambda関数)
5. [データモデル](#データモデル)
6. [ローカル開発](#ローカル開発)
7. [テスト](#テスト)
8. [デバッグ](#デバッグ)

---

## アーキテクチャ

### システム構成図

```mermaid
graph TB
    subgraph "Frontend"
        UI[React UI]
    end

    subgraph "API Layer"
        APIGW[API Gateway]
        StartLambda[Start Workflow Lambda]
        StatusLambda[Get Status Lambda]
        CancelLambda[Cancel Workflow Lambda]
    end

    subgraph "Workflow Layer"
        SF[Step Functions State Machine]
        ValidateLambda[Validate Input Lambda]
        GetActionsLambda[Get Actions Lambda]
        CreateBatchesLambda[Create Batches Lambda]
        TaskGenLambda[Task Generation Lambda]
        SaveTasksLambda[Save Tasks Lambda]
        UpdateProgressLambda[Update Progress Lambda]
        AggregateLambda[Aggregate Results Lambda]
        UpdateGoalLambda[Update Goal Status Lambda]
        HandleErrorLambda[Handle Error Lambda]
    end

    subgraph "AI Layer"
        Bedrock[Amazon Bedrock]
    end

    subgraph "Data Layer"
        DDB[(DynamoDB)]
    end

    subgraph "Monitoring Layer"
        CW[CloudWatch]
        SNS[SNS Topic]
    end

    UI -->|POST /goals/{id}/start-activity| APIGW
    UI -->|GET /workflows/{arn}/status| APIGW
    UI -->|POST /workflows/{arn}/cancel| APIGW

    APIGW --> StartLambda
    APIGW --> StatusLambda
    APIGW --> CancelLambda

    StartLambda -->|StartExecution| SF
    StatusLambda -->|DescribeExecution| SF
    CancelLambda -->|StopExecution| SF

    SF --> ValidateLambda
    SF --> GetActionsLambda
    SF --> CreateBatchesLambda
    SF --> TaskGenLambda
    SF --> SaveTasksLambda
    SF --> UpdateProgressLambda
    SF --> AggregateLambda
    SF --> UpdateGoalLambda
    SF --> HandleErrorLambda

    TaskGenLambda -->|Generate Tasks| Bedrock

    ValidateLambda --> DDB
    GetActionsLambda --> DDB
    SaveTasksLambda --> DDB
    UpdateProgressLambda --> DDB
    UpdateGoalLambda --> DDB

    SF -->|Log Events| CW
    SF -->|Send Alerts| SNS
```

### データフロー

```mermaid
sequenceDiagram
    participant UI as Frontend
    participant API as API Gateway
    participant Start as Start Lambda
    participant SF as Step Functions
    participant Validate as Validate Lambda
    participant GetActions as Get Actions Lambda
    participant CreateBatches as Create Batches Lambda
    participant TaskGen as Task Generation Lambda
    participant SaveTasks as Save Tasks Lambda
    participant UpdateProgress as Update Progress Lambda
    participant Aggregate as Aggregate Lambda
    participant UpdateGoal as Update Goal Lambda
    participant DDB as DynamoDB
    participant Bedrock as Amazon Bedrock

    UI->>API: POST /goals/{id}/start-activity
    API->>Start: Invoke
    Start->>DDB: Get Goal
    Start->>SF: StartExecution
    SF-->>Start: ExecutionArn
    Start->>DDB: Save Execution
    Start->>DDB: Update Goal Status (processing)
    Start-->>API: ExecutionArn
    API-->>UI: ExecutionArn

    SF->>Validate: Validate Input
    Validate->>DDB: Check Goal & Actions
    Validate-->>SF: Valid

    SF->>GetActions: Get Actions
    GetActions->>DDB: Query Actions
    GetActions-->>SF: Actions

    SF->>CreateBatches: Create Batches
    CreateBatches-->>SF: Batches

    loop For Each Batch
        loop For Each Action in Batch
            SF->>TaskGen: Generate Tasks
            TaskGen->>DDB: Get Context
            TaskGen->>Bedrock: Generate
            Bedrock-->>TaskGen: Tasks
            TaskGen->>SaveTasks: Save
            SaveTasks->>DDB: Insert Tasks
            SaveTasks-->>TaskGen: Success
            TaskGen-->>SF: Success
        end
        SF->>UpdateProgress: Update Progress
        UpdateProgress->>DDB: Update Execution
        UpdateProgress-->>SF: Progress
    end

    SF->>Aggregate: Aggregate Results
    Aggregate-->>SF: Summary

    SF->>UpdateGoal: Update Goal Status
    UpdateGoal->>DDB: Update Goal (active)
    UpdateGoal-->>SF: Success

    UI->>API: GET /workflows/{arn}/status
    API->>DDB: Get Execution
    DDB-->>API: Execution Data
    API-->>UI: Status & Progress
```

---

## コンポーネント

### 1. API Layer

#### Start Workflow Lambda

**責務**: ワークフロー実行を開始

**入力**:

```typescript
interface StartWorkflowInput {
  goalId: string;
  userId: string;
}
```

**出力**:

```typescript
interface StartWorkflowOutput {
  executionArn: string;
  startDate: string;
  status: 'RUNNING';
}
```

**実装ファイル**: `packages/backend/src/workflows/handlers/start-workflow.ts`

#### Get Status Lambda

**責務**: ワークフロー実行状況を取得

**入力**:

```typescript
interface GetStatusInput {
  executionArn: string;
}
```

**出力**:

```typescript
interface GetStatusOutput {
  executionArn: string;
  status: WorkflowStatus;
  startDate: string;
  stopDate?: string;
  progressPercentage: number;
  processedActions: number;
  totalActions: number;
  failedActions: string[];
  error?: string;
}
```

**実装ファイル**: `packages/backend/src/workflows/handlers/get-status.ts`

#### Cancel Workflow Lambda

**責務**: 実行中のワークフローをキャンセル

**入力**:

```typescript
interface CancelWorkflowInput {
  executionArn: string;
  reason: string;
}
```

**出力**:

```typescript
interface CancelWorkflowOutput {
  executionArn: string;
  status: 'ABORTED';
  stopDate: string;
}
```

**実装ファイル**: `packages/backend/src/workflows/handlers/cancel-workflow.ts`

### 2. Workflow Layer

#### Validate Input Lambda

**責務**: 入力データの検証

**処理内容**:

- goalIdの検証
- userIdの検証
- アクション存在確認

**実装ファイル**: `packages/backend/src/workflows/handlers/validate-input.ts`

#### Get Actions Lambda

**責務**: 目標に紐づくアクションを取得

**処理内容**:

- 目標に紐づくアクション取得
- アクションコンテキスト取得

**実装ファイル**: `packages/backend/src/workflows/handlers/get-actions.ts`

#### Create Batches Lambda

**責務**: アクションをバッチに分割

**処理内容**:

- アクションをバッチに分割（最大8/バッチ）
- バッチ順序の維持

**実装ファイル**: `packages/backend/src/workflows/handlers/create-batches.ts`

#### Task Generation Lambda

**責務**: アクションからタスクを生成

**処理内容**:

- 既存Lambda関数の再利用
- 入力フォーマット調整
- 出力フォーマット調整

**実装ファイル**: `packages/backend/src/workflows/handlers/task-generation.ts`

#### Save Tasks Lambda

**責務**: 生成されたタスクを保存

**処理内容**:

- トランザクション処理
- バッチインサート
- エラーハンドリング

**実装ファイル**: `packages/backend/src/workflows/handlers/save-tasks.ts`

#### Update Progress Lambda

**責務**: ワークフロー進捗を更新

**処理内容**:

- 進捗率計算
- 推定残り時間計算
- データベース更新

**実装ファイル**: `packages/backend/src/workflows/handlers/update-progress.ts`

#### Aggregate Results Lambda

**責務**: 結果を集約

**処理内容**:

- 結果集約
- 成功/失敗カウント
- 失敗アクションリスト作成

**実装ファイル**: `packages/backend/src/workflows/handlers/aggregate-results.ts`

#### Update Goal Status Lambda

**責務**: 目標ステータスを更新

**処理内容**:

- 目標ステータス更新（active/partial/failed）
- 完了時刻記録

**実装ファイル**: `packages/backend/src/workflows/handlers/update-goal-status.ts`

#### Handle Error Lambda

**責務**: エラーを処理

**処理内容**:

- エラーログ記録
- エラー通知準備

**実装ファイル**: `packages/backend/src/workflows/handlers/handle-error.ts`

---

## State Machine定義

### 基本構造

```json
{
  "Comment": "Task Generation Workflow",
  "StartAt": "ValidateInput",
  "States": {
    "ValidateInput": { ... },
    "GetActions": { ... },
    "CreateBatches": { ... },
    "ProcessBatches": { ... },
    "AggregateResults": { ... },
    "CheckResults": { ... },
    "UpdateGoalStatusActive": { ... },
    "UpdateGoalStatusPartial": { ... },
    "UpdateGoalStatusFailed": { ... },
    "Success": { ... },
    "Fail": { ... }
  },
  "TimeoutSeconds": 900
}
```

### 状態の種類

#### Task State

Lambda関数を呼び出す状態

```json
{
  "Type": "Task",
  "Resource": "arn:aws:lambda:REGION:ACCOUNT:function:FunctionName",
  "Next": "NextState",
  "Retry": [ ... ],
  "Catch": [ ... ]
}
```

#### Map State

配列の各要素に対して並列処理を実行する状態

```json
{
  "Type": "Map",
  "ItemsPath": "$.batches",
  "MaxConcurrency": 3,
  "Iterator": { ... },
  "Next": "NextState"
}
```

#### Choice State

条件分岐を行う状態

```json
{
  "Type": "Choice",
  "Choices": [
    {
      "Variable": "$.allSuccess",
      "BooleanEquals": true,
      "Next": "UpdateGoalStatusActive"
    }
  ],
  "Default": "UpdateGoalStatusFailed"
}
```

#### Pass State

データを変換する状態

```json
{
  "Type": "Pass",
  "Result": {
    "status": "success"
  },
  "End": true
}
```

### リトライポリシー

```json
{
  "Retry": [
    {
      "ErrorEquals": ["States.TaskFailed"],
      "IntervalSeconds": 2,
      "MaxAttempts": 3,
      "BackoffRate": 2.0
    }
  ]
}
```

### エラーハンドリング

```json
{
  "Catch": [
    {
      "ErrorEquals": ["States.ALL"],
      "ResultPath": "$.error",
      "Next": "HandleError"
    }
  ]
}
```

---

## Lambda関数

### 共通構造

```typescript
// Lambda関数のハンドラー
export const handler = async (
  event: InputType,
  context: Context
): Promise<OutputType> => {
  // ログ記録
  logger.info('Lambda function started', { event });

  try {
    // ビジネスロジック
    const result = await processEvent(event);

    // メトリクス記録
    await recordMetrics('FunctionName', 'Success', 1);

    return result;
  } catch (error) {
    // エラーログ記録
    logger.error('Lambda function failed', { error });

    // メトリクス記録
    await recordMetrics('FunctionName', 'Error', 1);

    throw error;
  }
};
```

### 環境変数

```typescript
// 環境変数の取得
const DATABASE_URL = process.env.DATABASE_URL!;
const STATE_MACHINE_ARN = process.env.STATE_MACHINE_ARN!;
const WORKFLOW_TABLE_NAME = process.env.WORKFLOW_TABLE_NAME!;
```

### エラーハンドリング

```typescript
// カスタムエラークラス
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

// エラーハンドリング
try {
  // 処理
} catch (error) {
  if (error instanceof ValidationError) {
    // バリデーションエラー
    return {
      statusCode: 400,
      body: JSON.stringify({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.message,
        },
      }),
    };
  } else if (error instanceof NotFoundError) {
    // 見つからないエラー
    return {
      statusCode: 404,
      body: JSON.stringify({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: error.message,
        },
      }),
    };
  } else {
    // その他のエラー
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
        },
      }),
    };
  }
}
```

---

## データモデル

### WorkflowExecution テーブル

```typescript
interface WorkflowExecution {
  executionArn: string; // パーティションキー
  goalId: string; // GSI
  userId: string;
  status: WorkflowStatus;
  startDate: string;
  stopDate?: string;
  input: {
    goalId: string;
    actionIds: string[];
  };
  output?: {
    successCount: number;
    failedCount: number;
    failedActions: string[];
  };
  progressPercentage: number;
  processedActions: number;
  totalActions: number;
  currentBatch: number;
  totalBatches: number;
  estimatedTimeRemaining: number;
  createdAt: string;
  updatedAt: string;
  ttl?: number; // 90日後に自動削除
}

type WorkflowStatus =
  | 'RUNNING'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'TIMED_OUT'
  | 'ABORTED';
```

### インデックス

```typescript
// GSI: goalId-index
{
  partitionKey: 'goalId',
  sortKey: 'startDate',
  projectionType: 'ALL'
}
```

---

## ローカル開発

### 前提条件

- Docker Desktop
- AWS SAM CLI
- Node.js 23.10.0以上
- pnpm 8.15.0以上

### セットアップ

#### 1. 依存関係のインストール

```bash
cd packages/backend
pnpm install
```

#### 2. 環境変数の設定

```bash
cp .env.example .env
# .envファイルを編集
```

#### 3. Docker環境の起動

```bash
docker-compose up -d
```

#### 4. データベースのマイグレーション

```bash
pnpm run db:migrate
```

### ローカル実行

#### Step Functions Local

```bash
# Step Functions Localの起動
docker run -p 8083:8083 \
  -e AWS_REGION=ap-northeast-1 \
  -e AWS_ACCESS_KEY_ID=local \
  -e AWS_SECRET_ACCESS_KEY=local \
  amazon/aws-stepfunctions-local

# State Machine定義の検証
aws stepfunctions --endpoint-url http://localhost:8083 \
  create-state-machine \
  --name TaskGenerationWorkflow \
  --definition file://state-machine.json \
  --role-arn arn:aws:iam::123456789012:role/DummyRole
```

#### Lambda関数のローカル実行

```bash
# SAM CLIでLambda関数を起動
sam local start-lambda --port 3001

# Lambda関数を呼び出し
aws lambda invoke \
  --endpoint-url http://localhost:3001 \
  --function-name start-workflow \
  --payload '{"goalId":"test-goal-id","userId":"test-user-id"}' \
  response.json
```

#### モックサービス

```bash
# AI APIモック
cd packages/backend/test/mocks
node ai-service.mock.js

# データベースモック
node database.mock.js
```

### デバッグ

#### VS Code デバッグ設定

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Lambda Function",
      "program": "${workspaceFolder}/packages/backend/src/workflows/handlers/start-workflow.ts",
      "preLaunchTask": "npm: build",
      "outFiles": ["${workspaceFolder}/packages/backend/dist/**/*.js"],
      "env": {
        "DATABASE_URL": "postgresql://user:password@localhost:5432/database",
        "STATE_MACHINE_ARN": "arn:aws:states:ap-northeast-1:123456789012:stateMachine:TaskGenerationWorkflow"
      }
    }
  ]
}
```

#### ログの確認

```bash
# Lambda関数のログ
tail -f packages/backend/logs/lambda.log

# State Machineのログ
tail -f packages/backend/logs/state-machine.log
```

---

## テスト

### ユニットテスト

```bash
# 全テストを実行
pnpm run test

# 特定のテストを実行
pnpm run test -- start-workflow.test.ts

# カバレッジを確認
pnpm run test:coverage
```

### 統合テスト

```bash
# 統合テストを実行
pnpm run test:integration

# 特定の統合テストを実行
pnpm run test:integration -- workflow-integration.test.ts
```

### プロパティベーステスト

```bash
# プロパティベーステストを実行
pnpm run test:property

# 特定のプロパティテストを実行
pnpm run test:property -- workflow-properties.test.ts
```

### E2Eテスト

```bash
# E2Eテストを実行
pnpm run test:e2e

# 特定のE2Eテストを実行
pnpm run test:e2e -- workflow-e2e.test.ts
```

### テストの書き方

#### ユニットテスト

```typescript
import { handler } from '../start-workflow';

describe('Start Workflow Lambda', () => {
  it('should start workflow successfully', async () => {
    const event = {
      goalId: 'test-goal-id',
      userId: 'test-user-id',
    };

    const result = await handler(event, {} as Context);

    expect(result.executionArn).toBeDefined();
    expect(result.status).toBe('RUNNING');
  });

  it('should throw error if goal not found', async () => {
    const event = {
      goalId: 'non-existent-goal-id',
      userId: 'test-user-id',
    };

    await expect(handler(event, {} as Context)).rejects.toThrow(NotFoundError);
  });
});
```

#### プロパティベーステスト

```typescript
import fc from 'fast-check';

describe('Workflow Properties', () => {
  it('Property 1: Workflow Execution Idempotency', () => {
    fc.assert(
      fc.asyncProperty(fc.uuid(), fc.uuid(), async (goalId, userId) => {
        // 同じ入力で複数回実行
        const result1 = await startWorkflow(goalId, userId);
        const result2 = await startWorkflow(goalId, userId);

        // 重複タスクが作成されないことを確認
        const tasks1 = await getTasks(goalId);
        const tasks2 = await getTasks(goalId);

        expect(tasks1).toEqual(tasks2);
      }),
      { numRuns: 100 }
    );
  });
});
```

---

## デバッグ

### CloudWatch Logs Insights

```sql
-- エラーログの検索
fields @timestamp, @message
| filter @message like /ERROR/
| sort @timestamp desc
| limit 100

-- 実行時間の分析
fields @timestamp, executionArn, duration
| filter @type = "ExecutionSucceeded"
| stats avg(duration), max(duration), min(duration) by bin(1h)

-- 失敗したアクションの集計
fields @timestamp, failedActions
| filter @type = "ExecutionFailed"
| stats count() as failure_count by failedActions
```

### X-Ray トレーシング

```typescript
// X-Rayトレーシングの有効化
import AWSXRay from 'aws-xray-sdk-core';
const AWS = AWSXRay.captureAWS(require('aws-sdk'));

// カスタムセグメントの作成
const segment = AWSXRay.getSegment();
const subsegment = segment.addNewSubsegment('CustomOperation');

try {
  // 処理
  subsegment.close();
} catch (error) {
  subsegment.addError(error);
  subsegment.close();
  throw error;
}
```

### ローカルデバッグ

```bash
# Lambda関数をデバッグモードで起動
sam local start-lambda --debug-port 5858

# VS Codeでデバッガーをアタッチ
# (F5キーを押してデバッグを開始)
```

---

## ベストプラクティス

### 1. エラーハンドリング

- カスタムエラークラスを使用
- エラーログを適切に記録
- リトライ可能なエラーを明示

### 2. ログ記録

- 構造化ログを使用
- 重要なイベントを記録
- 個人情報を記録しない

### 3. メトリクス記録

- カスタムメトリクスを記録
- 成功/失敗を記録
- 実行時間を記録

### 4. テスト

- ユニットテストを書く
- プロパティベーステストを書く
- 統合テストを書く

### 5. セキュリティ

- 最小権限の原則
- 環境変数で機密情報を管理
- 入力値を検証

---

## 関連ドキュメント

- [API仕様書](./workflow-api-specification.md)
- [運用ガイド](./workflow-operations-guide.md)
- [設計書](./.kiro/specs/3.3-step-functions-integration/design.md)
- [要件定義書](./.kiro/specs/3.3-step-functions-integration/requirements.md)

---

## サポート

質問や問題がある場合は、以下の情報を含めて開発チームに連絡してください：

- エラーコード
- 実行ARN
- タイムスタンプ
- 再現手順
- 期待される動作
- 実際の動作
- コードスニペット
