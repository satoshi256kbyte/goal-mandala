# 非同期処理エラーコード一覧

## 概要

このドキュメントは、AI生成非同期処理システムで発生する可能性のある全てのエラーコードと、その説明、原因、対処方法を記載します。

## エラーコード体系

エラーコードは以下の形式で定義されます：

```text
<カテゴリ>_<詳細>
```

### カテゴリ

- **VALIDATION**: 入力値検証エラー
- **AUTH**: 認証・認可エラー
- **PROCESSING**: 処理実行エラー
- **AI**: AI生成エラー
- **DATABASE**: データベースエラー
- **TIMEOUT**: タイムアウトエラー
- **RATE_LIMIT**: レート制限エラー
- **INTERNAL**: 内部エラー

---

## エラーコード一覧

### 入力値検証エラー（VALIDATION）

#### VALIDATION_ERROR

**HTTPステータス**: 400 Bad Request

**説明**: 入力値が不正です。

**原因**:

- 必須フィールドが欠落している
- フィールドの型が不正
- 値が許容範囲外
- フォーマットが不正

**エラーレスポンス例**:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "入力値が不正です",
    "details": [
      {
        "field": "params.title",
        "message": "タイトルは1文字以上200文字以内で入力してください"
      },
      {
        "field": "params.deadline",
        "message": "達成期限は未来の日時を指定してください"
      }
    ]
  }
}
```

**対処方法**:

1. エラーメッセージの`details`フィールドを確認
2. 指摘されたフィールドの値を修正
3. リクエストを再送信

**関連要件**: 要件1.2, 11.6

---

#### INVALID_PROCESS_TYPE

**HTTPステータス**: 400 Bad Request

**説明**: 処理タイプが不正です。

**原因**:

- `type`フィールドに許可されていない値が指定されている
- 許可される値: `SUBGOAL_GENERATION`, `ACTION_GENERATION`, `TASK_GENERATION`

**エラーレスポンス例**:

```json
{
  "success": false,
  "error": {
    "code": "INVALID_PROCESS_TYPE",
    "message": "処理タイプが不正です。SUBGOAL_GENERATION、ACTION_GENERATION、TASK_GENERATIONのいずれかを指定してください"
  }
}
```

**対処方法**:

1. `type`フィールドの値を確認
2. 許可された値のいずれかに修正
3. リクエストを再送信

**関連要件**: 要件1.2, 2.3

---

#### INVALID_UUID

**HTTPステータス**: 400 Bad Request

**説明**: UUIDの形式が不正です。

**原因**:

- `processId`, `goalId`, `subGoalId`, `actionId`などのUUIDフィールドの形式が不正

**エラーレスポンス例**:

```json
{
  "success": false,
  "error": {
    "code": "INVALID_UUID",
    "message": "UUIDの形式が不正です",
    "details": [
      {
        "field": "processId",
        "message": "有効なUUID形式で指定してください"
      }
    ]
  }
}
```

**対処方法**:

1. UUIDフィールドの値を確認
2. 正しいUUID形式（例: `550e8400-e29b-41d4-a716-446655440000`）に修正
3. リクエストを再送信

**関連要件**: 要件3.2

---

### 認証・認可エラー（AUTH）

#### UNAUTHORIZED

**HTTPステータス**: 401 Unauthorized

**説明**: 認証が必要です。

**原因**:

- JWTトークンが提供されていない
- JWTトークンの形式が不正
- JWTトークンの署名が不正

**エラーレスポンス例**:

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "認証が必要です。有効なJWTトークンを提供してください"
  }
}
```

**対処方法**:

1. `Authorization`ヘッダーが設定されているか確認
2. JWTトークンが有効か確認
3. 必要に応じて再ログインしてトークンを取得
4. リクエストを再送信

**関連要件**: 要件13.1, 13.2

---

#### TOKEN_EXPIRED

**HTTPステータス**: 401 Unauthorized

**説明**: JWTトークンの有効期限が切れています。

**原因**:

- JWTトークンの有効期限（24時間）が切れている

**エラーレスポンス例**:

```json
{
  "success": false,
  "error": {
    "code": "TOKEN_EXPIRED",
    "message": "トークンの有効期限が切れています。再ログインしてください"
  }
}
```

**対処方法**:

1. 再ログインして新しいJWTトークンを取得
2. リクエストを再送信

**関連要件**: 要件13.1, 13.2

---

#### FORBIDDEN

**HTTPステータス**: 403 Forbidden

**説明**: この処理にアクセスする権限がありません。

**原因**:

- 他のユーザーの処理にアクセスしようとしている
- ユーザーIDと処理の所有者が一致しない

**エラーレスポンス例**:

```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "この処理にアクセスする権限がありません"
  }
}
```

**対処方法**:

1. 自分の処理IDを確認
2. 正しい処理IDでリクエストを再送信

**関連要件**: 要件3.5, 13.3, 13.6, 13.7

---

### 処理実行エラー（PROCESSING）

#### PROCESSING_NOT_FOUND

**HTTPステータス**: 404 Not Found

**説明**: 指定された処理が見つかりません。

**原因**:

- 存在しない処理IDが指定されている
- 処理が削除されている
- 処理IDが間違っている

**エラーレスポンス例**:

```json
{
  "success": false,
  "error": {
    "code": "PROCESSING_NOT_FOUND",
    "message": "指定された処理が見つかりません"
  }
}
```

**対処方法**:

1. 処理IDが正しいか確認
2. 処理履歴APIで処理の存在を確認
3. 正しい処理IDでリクエストを再送信

**関連要件**: 要件3.2

---

#### RETRY_NOT_ALLOWED

**HTTPステータス**: 400 Bad Request

**説明**: この処理は再試行できません。

**原因**:

- 処理が完了済み（`COMPLETED`）
- 処理がキャンセル済み（`CANCELLED`）
- 処理が実行中（`PENDING`, `PROCESSING`）

**エラーレスポンス例**:

```json
{
  "success": false,
  "error": {
    "code": "RETRY_NOT_ALLOWED",
    "message": "この処理は再試行できません。完了済みまたはキャンセル済みの処理は再試行できません",
    "currentStatus": "COMPLETED"
  }
}
```

**対処方法**:

1. 処理の現在のステータスを確認
2. 再試行可能なステータス（`FAILED`, `TIMEOUT`）の処理のみ再試行

**関連要件**: 要件7.2, 7.3

---

#### MAX_RETRY_EXCEEDED

**HTTPステータス**: 400 Bad Request

**説明**: リトライ回数の上限を超えました。

**原因**:

- リトライ回数が3回を超えている

**エラーレスポンス例**:

```json
{
  "success": false,
  "error": {
    "code": "MAX_RETRY_EXCEEDED",
    "message": "リトライ回数の上限（3回）を超えました。新しい処理として開始してください",
    "retryCount": 3
  }
}
```

**対処方法**:

1. 新しい処理として開始
2. 入力パラメータを見直して再度実行

**関連要件**: 要件7.6

---

#### CANCEL_NOT_ALLOWED

**HTTPステータス**: 400 Bad Request

**説明**: この処理はキャンセルできません。

**原因**:

- 処理が完了済み（`COMPLETED`）
- 処理が失敗済み（`FAILED`）
- 処理がタイムアウト済み（`TIMEOUT`）
- 処理が既にキャンセル済み（`CANCELLED`）

**エラーレスポンス例**:

```json
{
  "success": false,
  "error": {
    "code": "CANCEL_NOT_ALLOWED",
    "message": "この処理はキャンセルできません。完了済みまたは失敗済みの処理はキャンセルできません",
    "currentStatus": "COMPLETED"
  }
}
```

**対処方法**:

1. 処理の現在のステータスを確認
2. キャンセル可能なステータス（`PENDING`, `PROCESSING`）の処理のみキャンセル

**関連要件**: 要件9.2, 9.3

---

### AI生成エラー（AI）

#### AI_ERROR

**HTTPステータス**: 500 Internal Server Error

**説明**: AI生成に失敗しました。

**原因**:

- Bedrock APIのエラー
- モデルの応答エラー
- プロンプトの問題
- トークン数の超過

**エラーレスポンス例**:

```json
{
  "success": false,
  "error": {
    "code": "AI_ERROR",
    "message": "AI生成に失敗しました。もう一度お試しください",
    "retryable": true
  }
}
```

**対処方法**:

1. しばらく待ってから再試行
2. 入力内容を簡潔にする
3. サポートチームに連絡（繰り返し発生する場合）

**関連要件**: 要件11.1

---

#### AI_THROTTLING

**HTTPステータス**: 429 Too Many Requests

**説明**: Bedrock APIのレート制限に達しました。

**原因**:

- Bedrock APIのリクエスト数が制限を超えている
- 短時間に大量のリクエストを送信している

**エラーレスポンス例**:

```json
{
  "success": false,
  "error": {
    "code": "AI_THROTTLING",
    "message": "AI APIのレート制限に達しました。しばらく待ってから再試行してください",
    "retryable": true,
    "retryAfter": 60
  }
}
```

**対処方法**:

1. `retryAfter`秒待機
2. 自動的にリトライされる
3. 繰り返し発生する場合はサポートチームに連絡

**関連要件**: 要件8.1

---

#### AI_RESPONSE_INVALID

**HTTPステータス**: 500 Internal Server Error

**説明**: AIの応答が不正です。

**原因**:

- AIの応答が期待される形式と異なる
- JSONパースエラー
- 必須フィールドの欠落

**エラーレスポンス例**:

```json
{
  "success": false,
  "error": {
    "code": "AI_RESPONSE_INVALID",
    "message": "AIの応答が不正です。もう一度お試しください",
    "retryable": true
  }
}
```

**対処方法**:

1. 再試行
2. 繰り返し発生する場合はサポートチームに連絡

**関連要件**: 要件11.1

---

### データベースエラー（DATABASE）

#### DATABASE_ERROR

**HTTPステータス**: 500 Internal Server Error

**説明**: データベース操作に失敗しました。

**原因**:

- データベース接続エラー
- クエリ実行エラー
- 制約違反
- トランザクションエラー

**エラーレスポンス例**:

```json
{
  "success": false,
  "error": {
    "code": "DATABASE_ERROR",
    "message": "データベース操作に失敗しました。もう一度お試しください",
    "retryable": true
  }
}
```

**対処方法**:

1. しばらく待ってから再試行
2. 繰り返し発生する場合はサポートチームに連絡

**関連要件**: 要件11.2

---

#### DATABASE_CONNECTION_ERROR

**HTTPステータス**: 503 Service Unavailable

**説明**: データベースに接続できません。

**原因**:

- データベースサーバーがダウンしている
- ネットワークの問題
- 接続プールの枯渇

**エラーレスポンス例**:

```json
{
  "success": false,
  "error": {
    "code": "DATABASE_CONNECTION_ERROR",
    "message": "データベースに接続できません。しばらく待ってから再試行してください",
    "retryable": true
  }
}
```

**対処方法**:

1. しばらく待ってから再試行
2. 自動的にリトライされる
3. 繰り返し発生する場合はサポートチームに連絡

**関連要件**: 要件8.2, 11.2

---

#### DATABASE_CONSTRAINT_VIOLATION

**HTTPステータス**: 400 Bad Request

**説明**: データベース制約違反が発生しました。

**原因**:

- 一意制約違反
- 外部キー制約違反
- チェック制約違反

**エラーレスポンス例**:

```json
{
  "success": false,
  "error": {
    "code": "DATABASE_CONSTRAINT_VIOLATION",
    "message": "データベース制約違反が発生しました。入力値を確認してください",
    "retryable": false
  }
}
```

**対処方法**:

1. 入力値を確認
2. 重複するデータがないか確認
3. 関連データが存在するか確認

**関連要件**: 要件11.2

---

### タイムアウトエラー（TIMEOUT）

#### TIMEOUT_ERROR

**HTTPステータス**: 504 Gateway Timeout

**説明**: 処理時間が制限を超えました。

**原因**:

- 処理が5分を超えている
- AI生成に時間がかかりすぎている
- データベースクエリが遅い

**エラーレスポンス例**:

```json
{
  "success": false,
  "error": {
    "code": "TIMEOUT_ERROR",
    "message": "処理時間が制限を超えました。再試行してください",
    "retryable": true
  }
}
```

**対処方法**:

1. 再試行
2. 入力内容を簡潔にする
3. 繰り返し発生する場合はサポートチームに連絡

**関連要件**: 要件6.1, 6.2, 6.3, 6.4, 11.3

---

#### STEP_FUNCTIONS_TIMEOUT

**HTTPステータス**: 504 Gateway Timeout

**説明**: Step Functionsの実行がタイムアウトしました。

**原因**:

- Step Functionsの実行時間が10分を超えている

**エラーレスポンス例**:

```json
{
  "success": false,
  "error": {
    "code": "STEP_FUNCTIONS_TIMEOUT",
    "message": "ワークフローの実行がタイムアウトしました。再試行してください",
    "retryable": true
  }
}
```

**対処方法**:

1. 再試行
2. サポートチームに連絡

**関連要件**: 要件6.1, 6.2, 6.3

---

### レート制限エラー（RATE_LIMIT）

#### RATE_LIMIT_EXCEEDED

**HTTPステータス**: 429 Too Many Requests

**説明**: リクエスト数が制限を超えました。

**原因**:

- 1分間に20リクエストを超えている
- 短時間に大量のリクエストを送信している

**エラーレスポンス例**:

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "リクエスト数が制限を超えました。しばらく待ってから再試行してください",
    "retryAfter": 60
  },
  "rateLimit": {
    "limit": 20,
    "remaining": 0,
    "reset": 1696992000
  }
}
```

**対処方法**:

1. `retryAfter`秒待機
2. リクエスト頻度を調整
3. レスポンスヘッダーの`X-RateLimit-*`を確認

**関連要件**: 要件13.4

---

### 内部エラー（INTERNAL）

#### INTERNAL_ERROR

**HTTPステータス**: 500 Internal Server Error

**説明**: 内部エラーが発生しました。

**原因**:

- 予期しないエラー
- システムの不具合
- 設定の問題

**エラーレスポンス例**:

```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "内部エラーが発生しました。サポートチームに連絡してください",
    "retryable": false,
    "errorId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

**対処方法**:

1. `errorId`を記録
2. サポートチームに連絡
3. エラーの詳細を報告

**関連要件**: 要件11.7

---

#### STEP_FUNCTIONS_ERROR

**HTTPステータス**: 500 Internal Server Error

**説明**: Step Functionsの実行に失敗しました。

**原因**:

- Step Functionsの設定エラー
- Lambda関数の実行エラー
- IAM権限の問題

**エラーレスポンス例**:

```json
{
  "success": false,
  "error": {
    "code": "STEP_FUNCTIONS_ERROR",
    "message": "ワークフローの実行に失敗しました。サポートチームに連絡してください",
    "retryable": false
  }
}
```

**対処方法**:

1. サポートチームに連絡
2. エラーの詳細を報告

**関連要件**: 要件11.7

---

#### LAMBDA_ERROR

**HTTPステータス**: 500 Internal Server Error

**説明**: Lambda関数の実行に失敗しました。

**原因**:

- Lambda関数のエラー
- メモリ不足
- タイムアウト

**エラーレスポンス例**:

```json
{
  "success": false,
  "error": {
    "code": "LAMBDA_ERROR",
    "message": "関数の実行に失敗しました。サポートチームに連絡してください",
    "retryable": false
  }
}
```

**対処方法**:

1. サポートチームに連絡
2. エラーの詳細を報告

**関連要件**: 要件11.7

---

## エラーコード一覧表

| コード                        | HTTPステータス | カテゴリ   | リトライ可能 | 説明                       |
| ----------------------------- | -------------- | ---------- | ------------ | -------------------------- |
| VALIDATION_ERROR              | 400            | VALIDATION | ❌           | 入力値が不正               |
| INVALID_PROCESS_TYPE          | 400            | VALIDATION | ❌           | 処理タイプが不正           |
| INVALID_UUID                  | 400            | VALIDATION | ❌           | UUIDの形式が不正           |
| UNAUTHORIZED                  | 401            | AUTH       | ❌           | 認証が必要                 |
| TOKEN_EXPIRED                 | 401            | AUTH       | ❌           | トークンの有効期限切れ     |
| FORBIDDEN                     | 403            | AUTH       | ❌           | アクセス権限なし           |
| PROCESSING_NOT_FOUND          | 404            | PROCESSING | ❌           | 処理が見つからない         |
| RETRY_NOT_ALLOWED             | 400            | PROCESSING | ❌           | 再試行不可                 |
| MAX_RETRY_EXCEEDED            | 400            | PROCESSING | ❌           | リトライ上限超過           |
| CANCEL_NOT_ALLOWED            | 400            | PROCESSING | ❌           | キャンセル不可             |
| AI_ERROR                      | 500            | AI         | ✅           | AI生成エラー               |
| AI_THROTTLING                 | 429            | AI         | ✅           | AIレート制限               |
| AI_RESPONSE_INVALID           | 500            | AI         | ✅           | AI応答が不正               |
| DATABASE_ERROR                | 500            | DATABASE   | ✅           | データベースエラー         |
| DATABASE_CONNECTION_ERROR     | 503            | DATABASE   | ✅           | データベース接続エラー     |
| DATABASE_CONSTRAINT_VIOLATION | 400            | DATABASE   | ❌           | データベース制約違反       |
| TIMEOUT_ERROR                 | 504            | TIMEOUT    | ✅           | タイムアウト               |
| STEP_FUNCTIONS_TIMEOUT        | 504            | TIMEOUT    | ✅           | Step Functionsタイムアウト |
| RATE_LIMIT_EXCEEDED           | 429            | RATE_LIMIT | ✅           | レート制限超過             |
| INTERNAL_ERROR                | 500            | INTERNAL   | ❌           | 内部エラー                 |
| STEP_FUNCTIONS_ERROR          | 500            | INTERNAL   | ❌           | Step Functionsエラー       |
| LAMBDA_ERROR                  | 500            | INTERNAL   | ❌           | Lambda関数エラー           |

---

## エラーハンドリングのベストプラクティス

### クライアント側

1. **リトライ可能なエラーの自動リトライ**

```typescript
async function callApiWithRetry(
  apiCall: () => Promise<Response>,
  maxRetries: number = 3
): Promise<Response> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await apiCall();

      if (response.ok) {
        return response;
      }

      const error = await response.json();

      // リトライ可能なエラーの場合
      if (error.error.retryable) {
        const delay = error.error.retryAfter || Math.pow(2, i) * 1000;
        await sleep(delay);
        continue;
      }

      // リトライ不可能なエラーの場合
      throw new Error(error.error.message);
    } catch (error) {
      if (i === maxRetries - 1) {
        throw error;
      }
    }
  }

  throw new Error('最大リトライ回数を超えました');
}
```

2. **エラーメッセージの表示**

```typescript
function displayError(error: ApiError) {
  // ユーザーフレンドリーなメッセージを表示
  const message = error.error.message;

  // 詳細情報がある場合は表示
  if (error.error.details) {
    error.error.details.forEach(detail => {
      console.error(`${detail.field}: ${detail.message}`);
    });
  }

  // リトライ可能な場合は案内
  if (error.error.retryable) {
    console.log('しばらく待ってから再試行してください');
  }
}
```

### サーバー側

1. **エラーログの記録**

```typescript
function logError(error: Error, context: any) {
  console.error(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      code: error.code,
      message: error.message,
      context,
      stack: error.stack,
    })
  );
}
```

2. **機密情報のマスキング**

```typescript
function sanitizeError(error: Error): ApiError {
  // 機密情報を含まないエラーメッセージを返す
  return {
    success: false,
    error: {
      code: error.code,
      message: getUserFriendlyMessage(error),
      retryable: isRetryable(error),
    },
  };
}
```

---

## サポート

エラーが解決しない場合は、以下の情報を含めてサポートチームに連絡してください：

- **エラーコード**
- **エラーメッセージ**
- **processId**（該当する場合）
- **errorId**（該当する場合）
- **発生日時**
- **リクエスト内容**（機密情報を除く）
- **再現手順**

### 連絡先

- **メール**: support@example.com
- **Slack**: #async-processing-support
- **電話**: +81-XX-XXXX-XXXX（営業時間: 9:00-18:00 JST）

---

## 参考資料

- [API仕様書](./async-processing-api-specification.md)
- [運用ガイド](./async-processing-operations-guide.md)
- [トラブルシューティングガイド](./async-processing-troubleshooting-guide.md)
