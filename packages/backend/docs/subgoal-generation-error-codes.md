# サブ目標生成API エラーコード一覧

## 概要

このドキュメントは、サブ目標生成API（`POST /api/ai/generate/subgoals`）で発生する可能性のあるエラーコードとその対処方法を説明します。

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
- フィールドの値が制約を満たしていない（文字数制限、形式など）
- 不正な入力データ（プロンプトインジェクション検出など）

**対処方法**:

1. `error.details` フィールドを確認し、どのフィールドに問題があるか特定する
2. 各フィールドの制約を確認する：
   - `title`: 1〜200文字
   - `description`: 1〜2000文字
   - `deadline`: ISO 8601形式、未来の日付
   - `background`: 1〜1000文字
   - `constraints`: 0〜1000文字（オプション）
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
        "field": "title",
        "message": "目標タイトルは200文字以内である必要があります"
      },
      {
        "field": "deadline",
        "message": "達成期限は未来の日付である必要があります"
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

### FORBIDDEN_ERROR

**HTTPステータスコード**: 403 Forbidden

**説明**: 認可エラー（権限不足）

**リトライ可能**: いいえ

**原因**:

- 他のユーザーの目標を更新しようとしている
- 目標の所有者でないユーザーがアクセスしている

**対処方法**:

1. 自分が所有する目標のみを更新できることを確認する
2. `goalId` が正しいか確認する
3. 新規目標を作成する場合は `goalId` を指定しない

**例**:

```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN_ERROR",
    "message": "この操作を実行する権限がありません",
    "retryable": false
  }
}
```

---

### NOT_FOUND_ERROR

**HTTPステータスコード**: 404 Not Found

**説明**: リソースが見つからない

**リトライ可能**: いいえ

**原因**:

- 指定された `goalId` の目標が存在しない
- 目標が既に削除されている

**対処方法**:

1. `goalId` が正しいか確認する
2. 目標が削除されていないか確認する
3. 新規目標を作成する場合は `goalId` を指定しない

**例**:

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND_ERROR",
    "message": "指定されたリソースが見つかりません",
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

- 生成されたサブ目標の数が8個でない
- サブ目標のタイトルが30文字を超えている
- サブ目標の説明が50〜200文字の範囲外
- サブ目標の背景が100文字を超えている

**対処方法**:

1. しばらく待ってから再試行する
2. 目標の説明をより具体的にする
3. 背景情報や制約事項を追加して、AIがより適切なサブ目標を生成できるようにする
4. 複数回失敗する場合は、目標の内容を見直す

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
async function generateSubGoals(
  request: SubGoalGenerationRequest
): Promise<SubGoalGenerationResponse> {
  try {
    const response = await fetch('/api/ai/generate/subgoals', {
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

        case 'FORBIDDEN_ERROR':
        case 'NOT_FOUND_ERROR':
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
    console.error('サブ目標生成エラー:', error);
    throw error;
  }
}
```

### リトライロジックの実装例

```typescript
async function generateSubGoalsWithRetry(
  request: SubGoalGenerationRequest,
  maxRetries: number = 3
): Promise<SubGoalGenerationResponse> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await generateSubGoals(request);
    } catch (error) {
      lastError = error as Error;

      // リトライ可能なエラーかチェック
      if (error instanceof Error && error.message.includes('retryable')) {
        // 指数バックオフ
        const delay = Math.pow(2, attempt) * 1000;
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

## トラブルシューティング

### よくある問題と解決方法

#### 1. バリデーションエラーが頻発する

**症状**: `VALIDATION_ERROR` が繰り返し発生する

**確認事項**:

- 各フィールドの文字数制限を確認
- 日付形式がISO 8601形式（`YYYY-MM-DDTHH:mm:ssZ`）であることを確認
- 達成期限が未来の日付であることを確認

**解決方法**:

- フロントエンドでバリデーションを実装し、送信前にチェックする
- エラーメッセージを確認し、該当フィールドを修正する

#### 2. AI生成の品質エラーが発生する

**症状**: `QUALITY_ERROR` が発生する

**確認事項**:

- 目標の説明が十分に具体的か
- 背景情報が適切に提供されているか

**解決方法**:

- 目標の説明をより詳細にする
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

## 関連ドキュメント

- [API仕様書](./subgoal-generation-api-specification.md)
- [運用ガイド](./subgoal-generation-operations-guide.md)
- [トラブルシューティングガイド](./subgoal-generation-troubleshooting-guide.md)
