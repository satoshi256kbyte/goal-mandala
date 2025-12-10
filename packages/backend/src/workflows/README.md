# Task Generation Workflow

このディレクトリには、Step Functionsを使用したタスク生成ワークフローの定義が含まれています。

## ファイル構成

- `task-generation-workflow.json`: Step Functions State Machine定義（JSON形式）
- `types.ts`: ワークフローの入力/出力/状態の型定義
- `README.md`: このファイル

## ワークフロー概要

Task Generation Workflowは、アクションからタスクへの変換処理を非同期で実行するワークフローです。

### 主要な特徴

1. **バッチ処理**: アクションを最大8個のバッチに分割して処理
2. **並列処理**:
   - 最大3バッチを同時処理
   - バッチ内の最大8アクションを同時処理
3. **リトライ機能**: 指数バックオフ（2秒、4秒、8秒）で最大3回リトライ
4. **タイムアウト**:
   - 全体: 15分（900秒）
   - AI呼び出し: 2分（120秒）
5. **エラーハンドリング**: 部分失敗に対応し、成功したタスクは保存

## ワークフローの状態遷移

```
ValidateInput
  ↓
GetActions
  ↓
CreateBatches
  ↓
ProcessBatches (Map: 最大3並列)
  ↓
  ProcessBatch (Map: 最大8並列)
    ↓
    GenerateTasks (AI呼び出し、2分タイムアウト、3回リトライ)
      ↓
    SaveTasks (DB保存、3回リトライ)
      ↓
    MarkActionSuccess / MarkActionFailed
  ↓
  UpdateBatchProgress
↓
AggregateResults
  ↓
CheckResults (Choice)
  ↓
  ├─ UpdateGoalStatusActive → Success
  ├─ UpdateGoalStatusPartial → SendPartialSuccessNotification → Success
  └─ UpdateGoalStatusFailed → SendFailureNotification → Fail
```

## エラーハンドリング

### エラー分類

1. **Validation Errors**: 入力データの不正
   - 対応: 即座に失敗、リトライなし
   - 例: 存在しないgoalId、不正なフォーマット

2. **Transient Errors**: 一時的な障害
   - 対応: 指数バックオフでリトライ（最大3回）
   - 例: AI APIタイムアウト、データベース接続エラー

3. **Permanent Errors**: 恒久的な障害
   - 対応: リトライせず即座に失敗
   - 例: AI APIクォータ超過、権限エラー

4. **Partial Errors**: 一部のアクションの失敗
   - 対応: 成功したタスクは保存、失敗リストを記録

### リトライポリシー

- **GenerateTasks**:
  - ErrorEquals: ["States.TaskFailed"]
  - IntervalSeconds: 2
  - MaxAttempts: 3
  - BackoffRate: 2.0
  - リトライ間隔: 2秒 → 4秒 → 8秒

- **SaveTasks**:
  - ErrorEquals: ["States.TaskFailed"]
  - IntervalSeconds: 1
  - MaxAttempts: 3
  - BackoffRate: 2.0
  - リトライ間隔: 1秒 → 2秒 → 4秒

- **GetActions**:
  - ErrorEquals: ["States.TaskFailed"]
  - IntervalSeconds: 2
  - MaxAttempts: 3
  - BackoffRate: 2.0
  - リトライ間隔: 2秒 → 4秒 → 8秒

## タイムアウト設定

- **ワークフロー全体**: 900秒（15分）
- **GenerateTasks**: 120秒（2分）
- **その他のタスク**: デフォルト（60秒）

## 並列処理設定

### バッチレベル並列化

```json
"ProcessBatches": {
  "Type": "Map",
  "MaxConcurrency": 3
}
```

最大3バッチを同時処理することで、メモリ使用量とスループットのバランスを取ります。

### アクションレベル並列化

```json
"ProcessBatch": {
  "Type": "Map",
  "MaxConcurrency": 8
}
```

バッチ内の最大8アクションを同時処理することで、Lambda同時実行数の制限を考慮しながら高速化します。

## 入力例

```json
{
  "goalId": "goal-123",
  "userId": "user-456",
  "actionIds": [
    "action-1",
    "action-2",
    "action-3",
    "action-4",
    "action-5",
    "action-6",
    "action-7",
    "action-8"
  ]
}
```

## 出力例

### 成功時

```json
{
  "goalId": "goal-123",
  "executionArn": "arn:aws:states:ap-northeast-1:123456789012:execution:TaskGenerationWorkflow:exec-123",
  "status": "SUCCEEDED",
  "successCount": 8,
  "failedCount": 0,
  "failedActions": [],
  "duration": 45000
}
```

### 部分失敗時

```json
{
  "goalId": "goal-123",
  "executionArn": "arn:aws:states:ap-northeast-1:123456789012:execution:TaskGenerationWorkflow:exec-123",
  "status": "PARTIAL",
  "successCount": 6,
  "failedCount": 2,
  "failedActions": ["action-3", "action-7"],
  "duration": 60000
}
```

### 完全失敗時

```json
{
  "goalId": "goal-123",
  "executionArn": "arn:aws:states:ap-northeast-1:123456789012:execution:TaskGenerationWorkflow:exec-123",
  "status": "FAILED",
  "successCount": 0,
  "failedCount": 8,
  "failedActions": [
    "action-1",
    "action-2",
    "action-3",
    "action-4",
    "action-5",
    "action-6",
    "action-7",
    "action-8"
  ],
  "duration": 30000,
  "error": "All actions failed to generate tasks"
}
```

## Lambda関数の役割

### ValidateInputFunction

- 入力パラメータ（goalId、userId、actionIds）のバリデーション
- 目標の存在確認
- ユーザーの権限確認

### GetActionsFunction

- アクションとそのコンテキストをデータベースから取得
- サブ目標と目標の情報も含めて取得

### CreateBatchesFunction

- アクションを最大8個のバッチに分割
- バッチ順序の維持

### TaskGenerationFunction

- 既存のタスク生成Lambda関数を再利用
- AI（Bedrock）を使用してタスクを生成

### SaveTasksFunction

- 生成されたタスクをデータベースに保存
- トランザクション処理でアトミック性を保証

### UpdateProgressFunction

- ワークフロー進捗をデータベースに更新
- 進捗率と推定残り時間を計算

### AggregateResultsFunction

- 全バッチの結果を集約
- 成功/失敗カウント
- 失敗アクションリストの作成

### UpdateGoalStatusFunction

- 目標のステータスを更新（active/partial/failed）
- 完了時刻を記録

### HandleErrorFunction

- エラーログの記録
- エラー通知の準備

## 監視とログ

### CloudWatch Logs

各Lambda関数は構造化ログを出力します：

```json
{
  "timestamp": "2024-12-09T10:00:00.000Z",
  "level": "INFO",
  "executionArn": "arn:aws:states:...",
  "goalId": "goal-123",
  "userId": "user-456",
  "event": "workflow_started",
  "details": {
    "actionCount": 8,
    "batchCount": 1
  }
}
```

### CloudWatch Metrics

- `WorkflowExecutionCount`: 実行回数
- `WorkflowSuccessRate`: 成功率
- `WorkflowDuration`: 実行時間
- `WorkflowFailureRate`: 失敗率
- `ActionProcessingTime`: アクション処理時間
- `ActionFailureRate`: アクション失敗率

### SNS通知

- 部分失敗時: `SendPartialSuccessNotification`
- 完全失敗時: `SendFailureNotification`

## ローカルテスト

Step Functions Localを使用してローカルでテストできます：

```bash
# Step Functions Localの起動
docker run -p 8083:8083 amazon/aws-stepfunctions-local

# ワークフローの実行
aws stepfunctions start-execution \
  --endpoint-url http://localhost:8083 \
  --state-machine-arn arn:aws:states:us-east-1:123456789012:stateMachine:TaskGenerationWorkflow \
  --input file://test-input.json
```

## デプロイ

CDKを使用してデプロイします：

```typescript
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as fs from 'fs';

const workflowDefinition = JSON.parse(
  fs.readFileSync('src/workflows/task-generation-workflow.json', 'utf-8')
);

const stateMachine = new sfn.StateMachine(this, 'TaskGenerationWorkflow', {
  definition: sfn.DefinitionBody.fromString(JSON.stringify(workflowDefinition)),
  timeout: cdk.Duration.minutes(15),
});
```

## 参考資料

- [AWS Step Functions Developer Guide](https://docs.aws.amazon.com/step-functions/latest/dg/welcome.html)
- [Step Functions State Machine Structure](https://docs.aws.amazon.com/step-functions/latest/dg/amazon-states-language-state-machine-structure.html)
- [Error Handling in Step Functions](https://docs.aws.amazon.com/step-functions/latest/dg/concepts-error-handling.html)
- [Step Functions Best Practices](https://docs.aws.amazon.com/step-functions/latest/dg/sfn-best-practices.html)
