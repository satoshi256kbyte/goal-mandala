# タスク生成API エラーコード一覧

## 概要

このドキュメントは、タスク生成API（`POST /api/ai/generate/tasks`）で発生する可能性のあるエラーコードとその対処方法を説明します。

## エラーレスポンス形式

全てのエラーレスポンスは以下の形式で返されます：

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "エラーメッセージ",
    "retryable": true,
    "details": [
      {
        "field": "フィールド名",
        "message": "詳細メッセージ"
      }
    ]
  }
}
```

### フィールド説明

- `success`: 常に `false`
- `error.code`: エラーコード（下記参照）
- `error.message`: ユーザー向けエラーメッセージ
- `error.retryable`: リトライ可能かどうか（`true` / `false`）
- `error.details`: エラーの詳細情報（オプション、バリデーションエラー時のみ）

## エラーコード一覧

### VALIDATION_ERROR

**HTTPステータスコード**: 400 Bad Request

**説明**: リクエストデータのバリデーションエラー

**リトライ可能**: いいえ

**原因**:

- 必須フィールドが欠けている
- `actionId` がUUID形式でない
- 不正な入力データ

**対処方法**:

1. `error.details` フィールドを確認し、どのフィールドに問題があるか特定する
2. 各フィールドの制約を確認する：
   - `actionId`: UUID v4形式、必須
   - `regenerate`: boolean、オプション
3. 入力データを修正して再送信する

**例**:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "入力データが不正です",
    "retryable": false,
    "details": [
      {
        "field": "actionId",
        "message": "アクションIDは有効なUUID形式である必要があります"
      }
    ]
  }
}
```

---

### AUTHENTICATION_ERROR

**HTTPステータスコード**: 401 Unauthorized

**説明**: 認証エラー

**リトライ可能**: いいえ

**原因**:

- 認証トークンが提供されていない
- 認証トークンが無効または期限切れ
- ユーザーIDが取得できない

**対処方法**:

1. `Authorization` ヘッダーに有効なJWTトークンが含まれているか確認する
2. トークンの有効期限を確認する
3. 必要に応じて再ログインしてトークンを取得する
4. ヘッダー形式: `Authorization: Bearer <token>`

**例**:

```json
{
  "success": false,
  "error": {
    "code": "AUTHENTICATION_ERROR",
    "message": "認証が必要です",
    "retryable": false
  }
}
```

---

### FORBIDDEN

**HTTPステータスコード**: 403 Forbidden

**説明**: 認可エラー（権限不足）

**リトライ可能**: いいえ

**原因**:

- 他のユーザーのアクションにアクセスしようとしている
- アクションの所有者でないユーザーがアクセスしている

**対処方法**:

1. 自分が所有する目標のアクションのみを操作できることを確認する
2. `actionId` が正しいか確認する
3. アクションが自分の目標に属しているか確認する

**例**:

```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "このアクションにアクセスする権限がありません",
    "retryable": false
  }
}
```

---

### NOT_FOUND

**HTTPステータスコード**: 404 Not Found

**説明**: リソースが見つからない

**リトライ可能**: いいえ

**原因**:

- 指定された `actionId` のアクションが存在しない
- アクションが既に削除されている

**対処方法**:

1. `actionId` が正しいか確認する
2. アクションが削除されていないか確認する
3. アクション一覧を再取得して、有効なIDを使用する

**例**:

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "指定されたアクションが見つかりません",
    "retryable": false
  }
}
```

---

### QUALITY_ERROR

**HTTPステータスコード**: 422 Unprocessable Entity

**説明**: AI生成結果の品質エラー

**リトライ可能**: はい

**原因**:

- 生成されたタスクの数が1個未満
- タスクのタイトルが50文字を超えている
- タスクの説明が200文字を超えている
- タスクの推定時間が15〜120分の範囲外
- タスク間で重複が多い
- タスクが抽象的すぎる

**対処方法**:

1. しばらく待ってから再試行する
2. アクションの説明をより具体的にする
3. 背景情報や制約事項を追加して、AIがより適切なタスクを生成できるようにする
4. 複数回失敗する場合は、アクションの内容を見直す

**例**:

```json
{
  "success": false,
  "error": {
    "code": "QUALITY_ERROR",
    "message": "AI生成結果の品質が基準を満たしませんでした。もう一度お試しください。",
    "retryable": true
  }
}
```

---

### DATABASE_ERROR

**HTTPステータスコード**: 500 Internal Server Error

**説明**: データベースエラー

**リトライ可能**: はい

**原因**:

- データベース接続エラー
- トランザクションエラー
- データ保存エラー
- データベースの一時的な障害

**対処方法**:

1. しばらく待ってから再試行する
2. 複数回失敗する場合は、システム管理者に連絡する
3. データベースの状態を確認する（管理者向け）

**例**:

```json
{
  "success": false,
  "error": {
    "code": "DATABASE_ERROR",
    "message": "データの保存に失敗しました",
    "retryable": true
  }
}
```

---

### AI_SERVICE_ERROR

**HTTPステータスコード**: 503 Service Unavailable

**説明**: AI生成サービスエラー

**リトライ可能**: はい（一部の場合はいいえ）

**原因**:

- Amazon Bedrockサービスの一時的な障害
- APIレート制限超過（スロットリング）
- タイムアウト
- モデルの一時的な利用不可

**対処方法**:

1. しばらく待ってから再試行する（推奨: 指数バックオフ）
2. 複数回失敗する場合は、システム管理者に連絡する
3. Bedrockサービスの状態を確認する（管理者向け）
4. レート制限を確認する（管理者向け）

**例**:

```json
{
  "success": false,
  "error": {
    "code": "AI_SERVICE_ERROR",
    "message": "AI生成サービスが一時的に利用できません",
    "retryable": true
  }
}
```

---

### INTERNAL_ERROR

**HTTPステータスコード**: 500 Internal Server Error

**説明**: 予期しないサーバーエラー

**リトライ可能**: はい

**原因**:

- 予期しない例外
- システムの内部エラー
- 設定エラー

**対処方法**:

1. しばらく待ってから再試行する
2. 複数回失敗する場合は、システム管理者に連絡する
3. サーバーログを確認する（管理者向け）

**例**:

```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "サーバーエラーが発生しました",
    "retryable": true
  }
}
```

---

## エラーハンドリングのベストプラクティス

### クライアント側の実装例

```typescript
async function generateTasks(
  request: TaskGenerationRequest
): Promise<TaskGenerationResponse> {
  try {
    const response = await fetch('/api/ai/generate/tasks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getAuthToken()}`,
      },
      body: JSON.stringify(request),
    });

    const data = await response.json();

    if (!response.ok) {
      // エラーハンドリング
      const error = data.error;

      switch (error.code) {
        case 'VALIDATION_ERROR':
          // バリデーションエラー: ユーザーに入力修正を促す
          showValidationErrors(error.details);
          break;

        case 'AUTHENTICATION_ERROR':
          // 認証エラー: ログイン画面にリダイレクト
          redirectToLogin();
          break;

        case 'FORBIDDEN':
        case 'NOT_FOUND':
          // 権限エラー: エラーメッセージを表示
          showErrorMessage(error.message);
          break;

        case 'QUALITY_ERROR':
        case 'DATABASE_ERROR':
        case 'AI_SERVICE_ERROR':
          // リトライ可能なエラー: リトライを提案
          if (error.retryable) {
            showRetryDialog(error.message);
          } else {
            showErrorMessage(error.message);
          }
          break;

        case 'INTERNAL_ERROR':
        default:
          // 予期しないエラー: 一般的なエラーメッセージを表示
          showErrorMessage(
            'エラーが発生しました。しばらく待ってから再試行してください。'
          );
          break;
      }

      throw new Error(error.message);
    }

    return data;
  } catch (error) {
    console.error('タスク生成エラー:', error);
    throw error;
  }
}
```

### リトライロジックの実装例

```typescript
async function generateTasksWithRetry(
  request: TaskGenerationRequest,
  maxRetries: number = 3
): Promise<TaskGenerationResponse> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await generateTasks(request);
    } catch (error) {
      lastError = error as Error;
      const errorResponse = error as { error?: { retryable?: boolean } };

      // リトライ可能なエラーかチェック
      if (errorResponse.error?.retryable) {
        // 指数バックオフ
        const delay = Math.pow(2, attempt) * 1000;
        console.log(
          `リトライします（${attempt + 1}/${maxRetries}）: ${delay}ms後`
        );
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      // リトライ不可能なエラーはすぐに投げる
      throw error;
    }
  }

  throw lastError || new Error('最大リトライ回数を超えました');
}
```

### React Hookでのエラーハンドリング例

```typescript
import { useState } from 'react';

interface UseTaskGenerationResult {
  generateTasks: (actionId: string, regenerate?: boolean) => Promise<void>;
  loading: boolean;
  error: string | null;
  errorCode: string | null;
  tasks: TaskOutput[] | null;
  retry: () => Promise<void>;
}

function useTaskGeneration(): UseTaskGenerationResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [tasks, setTasks] = useState<TaskOutput[] | null>(null);
  const [lastRequest, setLastRequest] = useState<{
    actionId: string;
    regenerate: boolean;
  } | null>(null);

  const generateTasks = async (actionId: string, regenerate: boolean = false) => {
    setLoading(true);
    setError(null);
    setErrorCode(null);
    setLastRequest({ actionId, regenerate });

    try {
      const result = await generateTasksWithRetry({ actionId, regenerate });
      setTasks(result.data.tasks);
    } catch (err: any) {
      const errorResponse = err as ErrorResponse;
      setError(errorResponse.error?.message || 'タスク生成に失敗しました');
      setErrorCode(errorResponse.error?.code || 'UNKNOWN_ERROR');
    } finally {
      setLoading(false);
    }
  };

  const retry = async () => {
    if (lastRequest) {
      await generateTasks(lastRequest.actionId, lastRequest.regenerate);
    }
  };

  return { generateTasks, loading, error, errorCode, tasks, retry };
}

// 使用例
function TaskGenerationComponent({ actionId }: { actionId: string }) {
  const { generateTasks, loading, error, errorCode, tasks, retry } =
    useTaskGeneration();

  const handleGenerate = () => {
    generateTasks(actionId);
  };

  return (
    <div>
      <button onClick={handleGenerate} disabled={loading}>
        {loading ? 'タスク生成中...' : 'タスクを生成'}
      </button>

      {error && (
        <div className="error">
          <p>{error}</p>
          {errorCode === 'QUALITY_ERROR' ||
          errorCode === 'DATABASE_ERROR' ||
          errorCode === 'AI_SERVICE_ERROR' ? (
            <button onClick={retry}>再試行</button>
          ) : null}
        </div>
      )}

      {tasks && (
        <div>
          <h3>生成されたタスク（{tasks.length}個）</h3>
          {tasks.map(task => (
            <div key={task.id} className={`task priority-${task.priority}`}>
              <h4>
                {task.title}
                <span className="badge">{task.priority}</span>
                <span className="badge">{task.type === 'execution' ? '実行' : '習慣'}</span>
              </h4>
              <p>{task.description}</p>
              <p>推定時間: {task.estimatedMinutes}分</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

## トラブルシューティング

### よくある問題と解決方法

#### 1. バリデーションエラーが発生する

**症状**: `VALIDATION_ERROR` が発生する

**確認事項**:

- `actionId` がUUID形式であることを確認
- アクションが存在することを確認

**解決方法**:

- フロントエンドでバリデーションを実装し、送信前にチェックする
- エラーメッセージを確認し、該当フィールドを修正する

#### 2. AI生成の品質エラーが発生する

**症状**: `QUALITY_ERROR` が発生する

**確認事項**:

- アクションの説明が十分に具体的か
- 背景情報が適切に提供されているか

**解決方法**:

- アクションの説明をより詳細にする
- 背景情報や制約事項を追加する
- 数回リトライする

#### 3. 認証エラーが発生する

**症状**: `AUTHENTICATION_ERROR` が発生する

**確認事項**:

- `Authorization` ヘッダーが正しく設定されているか
- トークンの有効期限が切れていないか

**解決方法**:

- トークンを再取得する
- ログイン状態を確認する

#### 4. 権限エラーが発生する

**症状**: `FORBIDDEN` が発生する

**確認事項**:

- アクションが自分の目標に属しているか
- `actionId` が正しいか

**解決方法**:

- 自分が所有する目標のアクションのみを操作する
- アクション一覧を再取得して、正しいIDを使用する

#### 5. タスクの粒度が適切でない

**症状**: 生成されたタスクの推定時間が短すぎる、または長すぎる

**確認事項**:

- アクションの説明が具体的か
- アクションの規模が適切か

**解決方法**:

- アクションの説明をより具体的にする
- 大きすぎるアクションは複数のアクションに分割する
- 再生成を試みる

#### 6. タスクの重複が多い

**症状**: 生成されたタスクに重複が多い

**確認事項**:

- アクションの説明が具体的か
- 制約事項が明記されているか

**解決方法**:

- アクションの説明をより具体的にする
- 制約事項を追加して、多様なタスクが生成されるようにする
- 再生成を試みる

#### 7. タスクが抽象的すぎる

**症状**: 生成されたタスクが抽象的で実行しにくい

**確認事項**:

- アクションの説明が具体的か
- 背景情報が十分に提供されているか

**解決方法**:

- アクションの説明をより具体的にする
- 背景情報や制約事項を追加する
- 再生成を試みる

## エラーコード別の対応フローチャート

```
リクエスト送信
    ↓
エラー発生？
    ↓ Yes
エラーコード確認
    ↓
┌─────────────────────────────────────┐
│ VALIDATION_ERROR                    │
│ → 入力データを修正して再送信        │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ AUTHENTICATION_ERROR                │
│ → 再ログインしてトークンを取得      │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ FORBIDDEN / NOT_FOUND               │
│ → エラーメッセージを表示            │
│ → アクションIDを確認                │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ QUALITY_ERROR                       │
│ → リトライを提案                    │
│ → アクションの説明を改善            │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ DATABASE_ERROR / AI_SERVICE_ERROR   │
│ → 指数バックオフでリトライ          │
│ → 複数回失敗したら管理者に連絡      │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ INTERNAL_ERROR                      │
│ → リトライ                          │
│ → 複数回失敗したら管理者に連絡      │
└─────────────────────────────────────┘
```

## 品質エラーの詳細

### タスク個数エラー

**原因**: 生成されたタスクが1個未満

**対処方法**:

- アクションの説明を確認し、より具体的にする
- 再生成を試みる

### タイトル長エラー

**原因**: タスクのタイトルが50文字を超えている

**対処方法**:

- 自動的にリトライされます
- 複数回失敗する場合は、アクションの説明を簡潔にする

### 説明長エラー

**原因**: タスクの説明が200文字を超えている

**対処方法**:

- 自動的にリトライされます
- 複数回失敗する場合は、アクションの説明を簡潔にする

### 推定時間範囲エラー

**原因**: タスクの推定時間が15〜120分の範囲外

**対処方法**:

- 自動的にリトライされます
- 複数回失敗する場合は、アクションの規模を見直す

### 重複エラー

**原因**: タスク間で重複が多い

**対処方法**:

- 警告ログが記録されますが、処理は継続されます
- 再生成を試みる

### 抽象度エラー

**原因**: タスクが抽象的すぎる

**対処方法**:

- 警告ログが記録されますが、処理は継続されます
- アクションの説明をより具体的にする

## 関連ドキュメント

- [API仕様書](./task-generation-api-specification.md)
- [運用ガイド](./task-generation-operations-guide.md)
- [トラブルシューティングガイド](./task-generation-troubleshooting-guide.md)

---

## サポート

問題が解決しない場合は、以下の情報を含めて開発チームに連絡してください：

- エラーコード
- リクエストID
- タイムスタンプ
- 再現手順
- 期待される動作
- 実際の動作
