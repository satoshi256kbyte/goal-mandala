# Step Functions統合 API仕様書

## 概要

Step Functions統合APIは、アクションからタスクへの変換処理を非同期ワークフローとして実行するためのAPIです。AWS Step Functionsを使用して、長時間処理の信頼性と可視性を向上させます。

## 目次

1. [エンドポイント](#エンドポイント)
2. [認証](#認証)
3. [API一覧](#api一覧)
4. [エラーレスポンス](#エラーレスポンス)
5. [ワークフロー状態](#ワークフロー状態)
6. [サンプルコード](#サンプルコード)
7. [制限事項](#制限事項)

---

## エンドポイント

### 基本情報

- **プロトコル**: HTTPS
- **ベースURL**: `https://api.example.com`
- **Content-Type**: application/json
- **認証**: JWT Bearer Token（必須）

---

## 認証

### 認証方法

Amazon Cognito User Poolによる認証が必要です。リクエストヘッダーに有効なJWTトークンを含める必要があります。

### 認証ヘッダー

```http
Authorization: Bearer <JWT_TOKEN>
```

### 認証エラー

- **401 Unauthorized**: トークンが提供されていない、または無効
- **403 Forbidden**: 他人の目標へのアクセス試行

---

## API一覧

### 1. ワークフロー開始

アクションからタスクへの変換処理を開始します。

#### エンドポイント

```
POST /api/v1/goals/{goalId}/start-activity
```

#### パスパラメータ

| パラメータ | 型            | 必須 | 説明   |
| ---------- | ------------- | ---- | ------ |
| goalId     | string (UUID) | ✓    | 目標ID |

#### リクエストボディ

なし

#### レスポンス（200 OK）

```typescript
interface StartWorkflowResponse {
  success: true;
  data: {
    executionArn: string; // Step Functions実行ARN
    startDate: string; // 開始日時（ISO 8601形式）
    status: 'RUNNING'; // 実行状態
  };
}
```

#### レスポンス例

```json
{
  "success": true,
  "data": {
    "executionArn": "arn:aws:states:ap-northeast-1:123456789012:execution:TaskGenerationWorkflow:abc123",
    "startDate": "2025-12-09T10:00:00.000Z",
    "status": "RUNNING"
  }
}
```

#### エラーレスポンス

- **400 Bad Request**: 目標IDが不正
- **404 Not Found**: 目標が見つからない
- **403 Forbidden**: 他人の目標へのアクセス
- **409 Conflict**: 既にワークフローが実行中
- **500 Internal Server Error**: ワークフロー開始失敗

---

### 2. ワークフロー状態取得

実行中のワークフローの状態を取得します。

#### エンドポイント

```
GET /api/v1/workflows/{executionArn}/status
```

#### パスパラメータ

| パラメータ   | 型     | 必須 | 説明                                       |
| ------------ | ------ | ---- | ------------------------------------------ |
| executionArn | string | ✓    | Step Functions実行ARN（URLエンコード必須） |

#### レスポンス（200 OK）

```typescript
interface GetStatusResponse {
  success: true;
  data: {
    executionArn: string; // 実行ARN
    status: WorkflowStatus; // 実行状態
    startDate: string; // 開始日時（ISO 8601形式）
    stopDate?: string; // 終了日時（ISO 8601形式）
    progressPercentage: number; // 進捗率（0-100）
    processedActions: number; // 処理済みアクション数
    totalActions: number; // 総アクション数
    failedActions: string[]; // 失敗したアクションIDの配列
    error?: string; // エラーメッセージ（失敗時）
  };
}

type WorkflowStatus =
  | 'RUNNING' // 実行中
  | 'SUCCEEDED' // 成功
  | 'FAILED' // 失敗
  | 'TIMED_OUT' // タイムアウト
  | 'ABORTED'; // 中止
```

#### レスポンス例（実行中）

```json
{
  "success": true,
  "data": {
    "executionArn": "arn:aws:states:ap-northeast-1:123456789012:execution:TaskGenerationWorkflow:abc123",
    "status": "RUNNING",
    "startDate": "2025-12-09T10:00:00.000Z",
    "progressPercentage": 45,
    "processedActions": 29,
    "totalActions": 64,
    "failedActions": []
  }
}
```

#### レスポンス例（成功）

```json
{
  "success": true,
  "data": {
    "executionArn": "arn:aws:states:ap-northeast-1:123456789012:execution:TaskGenerationWorkflow:abc123",
    "status": "SUCCEEDED",
    "startDate": "2025-12-09T10:00:00.000Z",
    "stopDate": "2025-12-09T10:15:30.000Z",
    "progressPercentage": 100,
    "processedActions": 64,
    "totalActions": 64,
    "failedActions": []
  }
}
```

#### レスポンス例（部分失敗）

```json
{
  "success": true,
  "data": {
    "executionArn": "arn:aws:states:ap-northeast-1:123456789012:execution:TaskGenerationWorkflow:abc123",
    "status": "SUCCEEDED",
    "startDate": "2025-12-09T10:00:00.000Z",
    "stopDate": "2025-12-09T10:15:30.000Z",
    "progressPercentage": 95,
    "processedActions": 61,
    "totalActions": 64,
    "failedActions": ["action-001", "action-015", "action-042"]
  }
}
```

#### エラーレスポンス

- **400 Bad Request**: 実行ARNが不正
- **404 Not Found**: 実行が見つからない
- **403 Forbidden**: 他人の実行へのアクセス
- **500 Internal Server Error**: 状態取得失敗

---

### 3. ワークフローキャンセル

実行中のワークフローをキャンセルします。

#### エンドポイント

```
POST /api/v1/workflows/{executionArn}/cancel
```

#### パスパラメータ

| パラメータ   | 型     | 必須 | 説明                                       |
| ------------ | ------ | ---- | ------------------------------------------ |
| executionArn | string | ✓    | Step Functions実行ARN（URLエンコード必須） |

#### リクエストボディ

```typescript
interface CancelWorkflowRequest {
  reason?: string; // キャンセル理由（オプション）
}
```

#### レスポンス（200 OK）

```typescript
interface CancelWorkflowResponse {
  success: true;
  data: {
    executionArn: string; // 実行ARN
    status: 'ABORTED'; // 実行状態
    stopDate: string; // 停止日時（ISO 8601形式）
  };
}
```

#### レスポンス例

```json
{
  "success": true,
  "data": {
    "executionArn": "arn:aws:states:ap-northeast-1:123456789012:execution:TaskGenerationWorkflow:abc123",
    "status": "ABORTED",
    "stopDate": "2025-12-09T10:05:00.000Z"
  }
}
```

#### エラーレスポンス

- **400 Bad Request**: 実行ARNが不正
- **404 Not Found**: 実行が見つからない
- **403 Forbidden**: 他人の実行へのアクセス
- **409 Conflict**: 既に完了または停止済み
- **500 Internal Server Error**: キャンセル失敗

---

## エラーレスポンス

### エラーレスポンス形式

```typescript
interface ErrorResponse {
  success: false;
  error: {
    code: string; // エラーコード
    message: string; // エラーメッセージ
    retryable?: boolean; // リトライ可能かどうか
    details?: any; // 詳細情報
  };
}
```

### エラーコード一覧

| コード               | HTTPステータス | 説明                   | リトライ可能 |
| -------------------- | -------------- | ---------------------- | ------------ |
| VALIDATION_ERROR     | 400            | 入力データが不正       | ✗            |
| NOT_FOUND            | 404            | リソースが見つからない | ✗            |
| FORBIDDEN            | 403            | アクセス権限がない     | ✗            |
| CONFLICT             | 409            | リソースの状態が不正   | ✗            |
| WORKFLOW_START_ERROR | 500            | ワークフロー開始失敗   | ✓            |
| WORKFLOW_STOP_ERROR  | 500            | ワークフロー停止失敗   | ✓            |
| DATABASE_ERROR       | 500            | データベースエラー     | ✓            |
| INTERNAL_ERROR       | 500            | 内部エラー             | ✓            |

---

## ワークフロー状態

### 状態遷移図

```
RUNNING → SUCCEEDED (全アクション成功)
        → FAILED (全アクション失敗)
        → TIMED_OUT (タイムアウト)
        → ABORTED (ユーザーによるキャンセル)
```

### 状態の説明

#### RUNNING（実行中）

- ワークフローが実行中
- 進捗率が0-99%
- キャンセル可能

#### SUCCEEDED（成功）

- ワークフローが正常に完了
- 進捗率が100%（全アクション成功）または95%以上（部分成功）
- キャンセル不可

#### FAILED（失敗）

- ワークフローが失敗
- 全アクションが失敗、またはシステムエラー
- キャンセル不可

#### TIMED_OUT（タイムアウト）

- ワークフローがタイムアウト（15分超過）
- 部分的に処理されたタスクは保存される
- キャンセル不可

#### ABORTED（中止）

- ユーザーによるキャンセル
- 部分的に処理されたタスクは削除される
- キャンセル不可（既に中止済み）

---

## サンプルコード

### JavaScript/TypeScript

#### ワークフロー開始

```typescript
async function startWorkflow(goalId: string): Promise<StartWorkflowResponse> {
  const token = await getAuthToken();

  const response = await fetch(
    `https://api.example.com/api/v1/goals/${goalId}/start-activity`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`API Error: ${error.error.message}`);
  }

  return await response.json();
}

// 使用例
try {
  const result = await startWorkflow('goal-123');
  console.log(`ワークフロー開始: ${result.data.executionArn}`);
} catch (error) {
  console.error('ワークフロー開始エラー:', error);
}
```

#### ワークフロー状態取得（ポーリング）

```typescript
async function pollWorkflowStatus(
  executionArn: string,
  interval: number = 5000
): Promise<GetStatusResponse> {
  const token = await getAuthToken();
  const encodedArn = encodeURIComponent(executionArn);

  while (true) {
    const response = await fetch(
      `https://api.example.com/api/v1/workflows/${encodedArn}/status`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`API Error: ${error.error.message}`);
    }

    const result = await response.json();
    const status = result.data.status;

    // 終了状態の場合は結果を返す
    if (['SUCCEEDED', 'FAILED', 'TIMED_OUT', 'ABORTED'].includes(status)) {
      return result;
    }

    // 実行中の場合は待機
    console.log(`進捗: ${result.data.progressPercentage}%`);
    await new Promise(resolve => setTimeout(resolve, interval));
  }
}

// 使用例
try {
  const result = await pollWorkflowStatus('arn:aws:states:...');
  console.log(`ワークフロー完了: ${result.data.status}`);
  console.log(
    `処理済みアクション: ${result.data.processedActions}/${result.data.totalActions}`
  );

  if (result.data.failedActions.length > 0) {
    console.log(`失敗したアクション: ${result.data.failedActions.length}個`);
  }
} catch (error) {
  console.error('ワークフロー状態取得エラー:', error);
}
```

#### ワークフローキャンセル

```typescript
async function cancelWorkflow(
  executionArn: string,
  reason?: string
): Promise<CancelWorkflowResponse> {
  const token = await getAuthToken();
  const encodedArn = encodeURIComponent(executionArn);

  const response = await fetch(
    `https://api.example.com/api/v1/workflows/${encodedArn}/cancel`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ reason }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`API Error: ${error.error.message}`);
  }

  return await response.json();
}

// 使用例
try {
  const result = await cancelWorkflow(
    'arn:aws:states:...',
    'ユーザーによるキャンセル'
  );
  console.log(`ワークフローキャンセル: ${result.data.status}`);
} catch (error) {
  console.error('ワークフローキャンセルエラー:', error);
}
```

### React Hookの例

```typescript
import { useState, useEffect } from 'react';

interface UseWorkflowResult {
  startWorkflow: (goalId: string) => Promise<void>;
  cancelWorkflow: () => Promise<void>;
  loading: boolean;
  error: string | null;
  executionArn: string | null;
  status: WorkflowStatus | null;
  progress: number;
  processedActions: number;
  totalActions: number;
  failedActions: string[];
}

function useWorkflow(): UseWorkflowResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [executionArn, setExecutionArn] = useState<string | null>(null);
  const [status, setStatus] = useState<WorkflowStatus | null>(null);
  const [progress, setProgress] = useState(0);
  const [processedActions, setProcessedActions] = useState(0);
  const [totalActions, setTotalActions] = useState(0);
  const [failedActions, setFailedActions] = useState<string[]>([]);

  // ポーリング
  useEffect(() => {
    if (!executionArn || status === 'SUCCEEDED' || status === 'FAILED' ||
        status === 'TIMED_OUT' || status === 'ABORTED') {
      return;
    }

    const interval = setInterval(async () => {
      try {
        const result = await getWorkflowStatus(executionArn);
        setStatus(result.data.status);
        setProgress(result.data.progressPercentage);
        setProcessedActions(result.data.processedActions);
        setTotalActions(result.data.totalActions);
        setFailedActions(result.data.failedActions);
      } catch (err) {
        console.error('状態取得エラー:', err);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [executionArn, status]);

  const startWorkflow = async (goalId: string) => {
    setLoading(true);
    setError(null);

    try {
      const result = await startWorkflowAPI(goalId);
      setExecutionArn(result.data.executionArn);
      setStatus(result.data.status);
      setProgress(0);
      setProcessedActions(0);
      setTotalActions(0);
      setFailedActions([]);
    } catch (err) {
      const errorResponse = err as ErrorResponse;
      setError(errorResponse.error?.message || 'ワークフロー開始に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const cancelWorkflow = async () => {
    if (!executionArn) return;

    setLoading(true);
    setError(null);

    try {
      const result = await cancelWorkflowAPI(executionArn);
      setStatus(result.data.status);
    } catch (err) {
      const errorResponse = err as ErrorResponse;
      setError(errorResponse.error?.message || 'ワークフローキャンセルに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return {
    startWorkflow,
    cancelWorkflow,
    loading,
    error,
    executionArn,
    status,
    progress,
    processedActions,
    totalActions,
    failedActions,
  };
}

// 使用例
function WorkflowComponent({ goalId }: { goalId: string }) {
  const {
    startWorkflow,
    cancelWorkflow,
    loading,
    error,
    status,
    progress,
    processedActions,
    totalActions,
    failedActions,
  } = useWorkflow();

  const handleStart = () => {
    startWorkflow(goalId);
  };

  const handleCancel = () => {
    if (window.confirm('ワークフローをキャンセルしますか？')) {
      cancelWorkflow();
    }
  };

  return (
    <div>
      <button onClick={handleStart} disabled={loading || status === 'RUNNING'}>
        {loading ? 'ワークフロー開始中...' : 'ワークフローを開始'}
      </button>

      {status === 'RUNNING' && (
        <button onClick={handleCancel} disabled={loading}>
          キャンセル
        </button>
      )}

      {error && <div className="error">{error}</div>}

      {status && (
        <div>
          <h3>ワークフロー状態: {status}</h3>
          <div className="progress-bar">
            <div className="progress" style={{ width: `${progress}%` }}>
              {progress}%
            </div>
          </div>
          <p>
            処理済みアクション: {processedActions}/{totalActions}
          </p>

          {failedActions.length > 0 && (
            <div className="failed-actions">
              <h4>失敗したアクション（{failedActions.length}個）</h4>
              <ul>
                {failedActions.map(actionId => (
                  <li key={actionId}>{actionId}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

---

## 制限事項

### レート制限

- **ワークフロー開始**: 10リクエスト/分/ユーザー
- **状態取得**: 60リクエスト/分/ユーザー
- **キャンセル**: 10リクエスト/分/ユーザー
- **超過時のレスポンス**: 429 Too Many Requests

### 処理時間

- **ワークフロータイムアウト**: 15分
- **AI呼び出しタイムアウト**: 2分/アクション
- **バッチ処理タイムアウト**: 5分/バッチ

### 並列処理

- **バッチ並列数**: 最大3バッチ
- **アクション並列数**: 最大8アクション/バッチ
- **バッチサイズ**: 最大8アクション/バッチ

### データサイズ

- **リクエストボディ**: 最大10KB
- **レスポンスボディ**: 最大100KB

### 同時実行

- **同時実行数**: 10ワークフロー/ユーザー
- **超過時の動作**: 409 Conflict

---

## ベストプラクティス

### 1. エラーハンドリング

- リトライ可能なエラーは指数バックオフでリトライ
- ユーザーフレンドリーなエラーメッセージを表示
- エラーログを適切に記録

### 2. ポーリング

- 5秒間隔でポーリング（推奨）
- 進捗率を表示してユーザーに状況を伝える
- 終了状態を検出したらポーリングを停止

### 3. ユーザーエクスペリエンス

- 処理中の進捗を表示
- キャンセルボタンを提供
- 失敗したアクションを表示
- リトライ機能を提供

### 4. セキュリティ

- 認証トークンを安全に管理
- HTTPS通信を使用
- 実行ARNをURLエンコード

### 5. パフォーマンス

- 不要なポーリングを避ける
- 状態をキャッシュする
- 並列リクエストを制限する

---

## 関連ドキュメント

- [運用ガイド](./workflow-operations-guide.md)
- [開発者ドキュメント](./workflow-developer-guide.md)
- [タスク生成API仕様書](./task-generation-api-specification.md)

---

## 変更履歴

| バージョン | 日付       | 変更内容     |
| ---------- | ---------- | ------------ |
| 1.0.0      | 2025-12-09 | 初版リリース |

---

## サポート

質問や問題がある場合は、以下の情報を含めて開発チームに連絡してください：

- エラーコード
- 実行ARN
- タイムスタンプ
- 再現手順
- 期待される動作
- 実際の動作
