# 設計書

## 概要

AI生成処理の非同期実行と状態管理機能の設計を定義します。2.2.1〜2.2.4で実装したAI生成API（サブ目標、アクション、タスク生成）を非同期処理として実行し、処理状態の管理、進捗通知、タイムアウト処理、リトライ機能を提供します。

## アーキテクチャ

### システム構成図

```
Frontend → API Gateway → Lambda Handler → Step Functions → AI Worker → Aurora
                                              ↓
                                        ProcessingState
```

### 主要コンポーネント

1. **AsyncProcessingHandler**: 非同期処理開始、処理ID生成
2. **StatusCheckHandler**: 処理状態取得
3. **RetryHandler**: 処理再試行
4. **CancelHandler**: 処理キャンセル
5. **AIGenerationWorker**: 実際のAI生成処理実行
6. **ProcessingStateService**: 処理状態管理
7. **Step Functions**: ワークフロー制御、タイムアウト管理

## データモデル

### ProcessingState テーブル

```prisma
model ProcessingState {
  id            String   @id @default(uuid())
  userId        String
  type          ProcessingType
  status        ProcessingStatus
  targetId      String?
  progress      Int      @default(0)
  result        Json?
  error         Json?
  retryCount    Int      @default(0)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  completedAt   DateTime?

  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, createdAt])
  @@index([status, createdAt])
  @@index([type, status])
}

enum ProcessingType {
  SUBGOAL_GENERATION
  ACTION_GENERATION
  TASK_GENERATION
}

enum ProcessingStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
  TIMEOUT
  CANCELLED
}
```

## API設計

### 1. 非同期処理開始

```
POST /api/ai/async/generate
Authorization: Bearer <JWT_TOKEN>

Request:
{
  "type": "SUBGOAL_GENERATION",
  "params": { ... }
}

Response (202 Accepted):
{
  "success": true,
  "data": {
    "processId": "uuid",
    "status": "PENDING",
    "type": "SUBGOAL_GENERATION",
    "createdAt": "2025-10-10T10:00:00Z",
    "estimatedCompletionTime": "2025-10-10T10:05:00Z"
  }
}
```

### 2. 処理状態取得

```
GET /api/ai/async/status/:processId
Authorization: Bearer <JWT_TOKEN>

Response (200 OK):
{
  "success": true,
  "data": {
    "processId": "uuid",
    "status": "PROCESSING",
    "type": "SUBGOAL_GENERATION",
    "progress": 50,
    "createdAt": "2025-10-10T10:00:00Z",
    "updatedAt": "2025-10-10T10:02:30Z",
    "estimatedCompletionTime": "2025-10-10T10:05:00Z"
  }
}
```

### 3. 処理再試行

```
POST /api/ai/async/retry/:processId
Authorization: Bearer <JWT_TOKEN>

Response (202 Accepted):
{
  "success": true,
  "data": {
    "processId": "new-uuid",
    "status": "PENDING",
    ...
  }
}
```

### 4. 処理キャンセル

```
POST /api/ai/async/cancel/:processId
Authorization: Bearer <JWT_TOKEN>

Response (200 OK):
{
  "success": true,
  "data": {
    "processId": "uuid",
    "status": "CANCELLED",
    ...
  }
}
```

## Step Functions ワークフロー

### ワークフロー定義

```json
{
  "Comment": "AI Generation Async Processing",
  "StartAt": "UpdateStatusToProcessing",
  "States": {
    "UpdateStatusToProcessing": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:...:function:UpdateProcessingState",
      "Parameters": {
        "processId.$": "$.processId",
        "status": "PROCESSING"
      },
      "Next": "ExecuteAIGeneration",
      "Catch": [{
        "ErrorEquals": ["States.ALL"],
        "Next": "HandleError"
      }]
    },
    "ExecuteAIGeneration": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:...:function:AIGenerationWorker",
      "TimeoutSeconds": 300,
      "HeartbeatSeconds": 60,
      "Next": "UpdateStatusToCompleted",
      "Catch": [{
        "ErrorEquals": ["States.Timeout"],
        "Next": "HandleTimeout"
      }, {
        "ErrorEquals": ["States.ALL"],
        "Next": "HandleError"
      }]
    },
    "UpdateStatusToCompleted": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:...:function:UpdateProcessingState",
      "Parameters": {
        "processId.$": "$.processId",
        "status": "COMPLETED",
        "result.$": "$.result"
      },
      "End": true
    },
    "HandleTimeout": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:...:function:UpdateProcessingState",
      "Parameters": {
        "processId.$": "$.processId",
        "status": "TIMEOUT",
        "error": {
          "code": "TIMEOUT_ERROR",
          "message": "処理時間が制限を超えました"
        }
      },
      "End": true
    },
    "HandleError": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:...:function:UpdateProcessingState",
      "Parameters": {
        "processId.$": "$.processId",
        "status": "FAILED",
        "error.$": "$.error"
      },
      "End": true
    }
  }
}
```

## 進捗管理

### 進捗率の計算

```typescript
// サブ目標生成
const SUBGOAL_PROGRESS = {
  START: 0,
  AI_GENERATION_COMPLETE: 50,
  DATABASE_SAVE_COMPLETE: 100,
};

// アクション生成（8個のサブ目標）
const ACTION_PROGRESS = {
  START: 0,
  PER_SUBGOAL: 12.5, // 100 / 8
};

// タスク生成（64個のアクション）
const TASK_PROGRESS = {
  START: 0,
  PER_ACTION: 1.5625, // 100 / 64
};
```

## エラーハンドリング

### 自動リトライ戦略

```typescript
const RETRY_CONFIG = {
  maxAttempts: 3,
  backoffRate: 2,
  initialInterval: 1000, // 1秒
  // 1秒 → 2秒 → 4秒
};

// リトライ対象エラー
const RETRYABLE_ERRORS = [
  'ThrottlingException',
  'ServiceUnavailableException',
  'DatabaseConnectionError',
  'NetworkError',
];
```

## セキュリティ

### 認証・認可

```typescript
// JWT認証
function extractUserId(event: APIGatewayProxyEvent): string {
  const claims = event.requestContext?.authorizer?.claims;
  return (claims as Record<string, string>).sub;
}

// 処理所有者チェック
async function checkProcessOwnership(
  userId: string,
  processId: string
): Promise<void> {
  const process = await prisma.processingState.findUnique({
    where: { id: processId },
  });

  if (!process || process.userId !== userId) {
    throw new ForbiddenError('この処理にアクセスする権限がありません');
  }
}
```

## 監視とログ

### CloudWatch メトリクス

- `AsyncProcessingStarted`: 非同期処理開始数
- `AsyncProcessingCompleted`: 完了数
- `AsyncProcessingFailed`: 失敗数
- `AsyncProcessingTimeout`: タイムアウト数
- `ProcessingDuration`: 処理時間
- `QueueDepth`: 待機中の処理数

### アラート設定

- エラー率 > 5% (5分間)
- タイムアウト率 > 10% (5分間)
- 平均処理時間 > 5分 (5分間)
- 待機中の処理数 > 100

## パフォーマンス最適化

### Lambda設定

```typescript
// AsyncProcessingHandler
{
  memorySize: 512,
  timeout: 30, // 30秒（即座に返却するため短い）
  reservedConcurrentExecutions: 50,
}

// AIGenerationWorker
{
  memorySize: 1024,
  timeout: 300, // 5分
  reservedConcurrentExecutions: 10,
}
```

### データベース最適化

```typescript
// インデックス
@@index([userId, createdAt])  // ユーザーの処理履歴取得用
@@index([status, createdAt])  // ステータス別取得用
@@index([type, status])       // タイプ・ステータス別集計用
```

## テスト戦略

### ユニットテスト

- ProcessingStateService
- AsyncProcessingHandler
- StatusCheckHandler
- RetryHandler
- CancelHandler

### 統合テスト

- 非同期処理の完全フロー
- タイムアウト処理
- エラーハンドリング
- リトライ機能

### E2Eテスト

- フロントエンドからの非同期処理開始〜完了確認
- 処理キャンセル
- 処理再試行

## デプロイ設計

### CDKスタック

```typescript
// Step Functions定義
const stateMachine = new sfn.StateMachine(this, 'AIGenerationStateMachine', {
  definition: aiGenerationWorkflow,
  timeout: Duration.minutes(10),
});

// Lambda関数
const asyncHandler = new lambda.Function(this, 'AsyncProcessingHandler', {
  runtime: lambda.Runtime.NODEJS_20_X,
  handler: 'async-processing.handler',
  timeout: Duration.seconds(30),
  environment: {
    STATE_MACHINE_ARN: stateMachine.stateMachineArn,
  },
});

// Step Functions実行権限
stateMachine.grantStartExecution(asyncHandler);
```

## 制限事項と今後の拡張

### 現在の制限事項

1. 同時実行数: 50（非同期処理開始）、10（AI生成）
2. タイムアウト: 5分
3. 処理履歴保存期間: 90日
4. リトライ上限: 3回

### 今後の拡張予定

1. WebSocket対応（リアルタイム進捗通知）
2. 優先度キューイング
3. バッチ処理対応
4. 処理結果のキャッシュ
5. 詳細な進捗レポート機能

## まとめ

この設計により、以下を実現します：

1. **非同期処理**: 時間のかかるAI生成を非同期で実行
2. **状態管理**: 処理状態の永続化と追跡
3. **進捗通知**: リアルタイムな進捗更新
4. **タイムアウト処理**: 長時間実行の自動中断
5. **リトライ機能**: 一時的なエラーからの自動復旧
6. **監視性**: 包括的なログとメトリクス
7. **スケーラビリティ**: Step Functionsによる柔軟なスケーリング

