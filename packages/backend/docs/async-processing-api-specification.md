# 非同期処理API仕様書

## 概要

AI生成処理の非同期実行と状態管理APIの詳細仕様を定義します。このAPIは、時間のかかるAI生成処理（サブ目標、アクション、タスク生成）を非同期で実行し、処理状態の管理、進捗通知、リトライ、キャンセル機能を提供します。

## ベースURL

```text
https://api.example.com/api/ai/async
```

## 認証

全てのエンドポイントはJWT認証が必要です。

```http
Authorization: Bearer <JWT_TOKEN>
```

## エンドポイント一覧

| メソッド | パス                 | 説明           | ステータスコード |
| -------- | -------------------- | -------------- | ---------------- |
| POST     | `/generate`          | 非同期処理開始 | 202 Accepted     |
| GET      | `/status/:processId` | 処理状態取得   | 200 OK           |
| POST     | `/retry/:processId`  | 処理再試行     | 202 Accepted     |
| POST     | `/cancel/:processId` | 処理キャンセル | 200 OK           |
| GET      | `/history`           | 処理履歴取得   | 200 OK           |

---

## 1. 非同期処理開始

AI生成処理を非同期で開始します。

### エンドポイント

```http
POST /api/ai/async/generate
```

### リクエストヘッダー

```http
Content-Type: application/json
Authorization: Bearer <JWT_TOKEN>
```

### リクエストボディ

#### サブ目標生成の場合

```json
{
  "type": "SUBGOAL_GENERATION",
  "params": {
    "goalId": "550e8400-e29b-41d4-a716-446655440000",
    "title": "TypeScriptのエキスパートになる",
    "description": "6ヶ月でTypeScriptの高度な機能を習得し、実務で活用できるレベルになる",
    "deadline": "2025-12-31T23:59:59Z",
    "background": "フロントエンド開発者として、型安全性の高いコードを書けるようになりたい",
    "constraints": "平日は2時間、週末は4時間の学習時間を確保できる"
  }
}
```

#### アクション生成の場合

```json
{
  "type": "ACTION_GENERATION",
  "params": {
    "subGoalId": "550e8400-e29b-41d4-a716-446655440001"
  }
}
```

#### タスク生成の場合

```json
{
  "type": "TASK_GENERATION",
  "params": {
    "actionId": "550e8400-e29b-41d4-a716-446655440002"
  }
}
```

### リクエストパラメータ

| フィールド | 型     | 必須 | 説明                                                                       |
| ---------- | ------ | ---- | -------------------------------------------------------------------------- |
| type       | string | ✓    | 処理タイプ（`SUBGOAL_GENERATION`, `ACTION_GENERATION`, `TASK_GENERATION`） |
| params     | object | ✓    | 処理タイプごとのパラメータ                                                 |

#### サブ目標生成パラメータ

| フィールド  | 型                | 必須 | 説明                      |
| ----------- | ----------------- | ---- | ------------------------- |
| goalId      | string (UUID)     | ✓    | 目標ID                    |
| title       | string            | ✓    | 目標タイトル（1-200文字） |
| description | string            | ✓    | 目標説明（1-2000文字）    |
| deadline    | string (ISO 8601) | ✓    | 達成期限                  |
| background  | string            | ✓    | 背景・理由（1-2000文字）  |
| constraints | string            |      | 制約事項（最大2000文字）  |

#### アクション生成パラメータ

| フィールド | 型            | 必須 | 説明       |
| ---------- | ------------- | ---- | ---------- |
| subGoalId  | string (UUID) | ✓    | サブ目標ID |

#### タスク生成パラメータ

| フィールド | 型            | 必須 | 説明         |
| ---------- | ------------- | ---- | ------------ |
| actionId   | string (UUID) | ✓    | アクションID |

### レスポンス

#### 成功時（202 Accepted）

```json
{
  "success": true,
  "data": {
    "processId": "660e8400-e29b-41d4-a716-446655440000",
    "status": "PENDING",
    "type": "SUBGOAL_GENERATION",
    "createdAt": "2025-10-11T10:00:00Z",
    "estimatedCompletionTime": "2025-10-11T10:05:00Z"
  }
}
```

#### レスポンスフィールド

| フィールド                   | 型                | 説明                  |
| ---------------------------- | ----------------- | --------------------- |
| success                      | boolean           | 処理成功フラグ        |
| data.processId               | string (UUID)     | 処理ID                |
| data.status                  | string            | 処理状態（`PENDING`） |
| data.type                    | string            | 処理タイプ            |
| data.createdAt               | string (ISO 8601) | 作成日時              |
| data.estimatedCompletionTime | string (ISO 8601) | 完了予定時刻          |

#### エラーレスポンス

##### バリデーションエラー（400 Bad Request）

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
      }
    ]
  }
}
```

##### 認証エラー（401 Unauthorized）

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "認証が必要です"
  }
}
```

##### レート制限エラー（429 Too Many Requests）

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "リクエスト数が制限を超えました。しばらく待ってから再試行してください",
    "retryAfter": 60
  }
}
```

---

## 2. 処理状態取得

非同期処理の現在の状態を取得します。

### エンドポイント

```http
GET /api/ai/async/status/:processId
```

### パスパラメータ

| パラメータ | 型            | 必須 | 説明   |
| ---------- | ------------- | ---- | ------ |
| processId  | string (UUID) | ✓    | 処理ID |

### リクエストヘッダー

```http
Authorization: Bearer <JWT_TOKEN>
```

### レスポンス

#### 処理中（200 OK）

```json
{
  "success": true,
  "data": {
    "processId": "660e8400-e29b-41d4-a716-446655440000",
    "status": "PROCESSING",
    "type": "SUBGOAL_GENERATION",
    "progress": 50,
    "createdAt": "2025-10-11T10:00:00Z",
    "updatedAt": "2025-10-11T10:02:30Z",
    "estimatedCompletionTime": "2025-10-11T10:05:00Z"
  }
}
```

#### 完了（200 OK）

```json
{
  "success": true,
  "data": {
    "processId": "660e8400-e29b-41d4-a716-446655440000",
    "status": "COMPLETED",
    "type": "SUBGOAL_GENERATION",
    "progress": 100,
    "result": {
      "goalId": "550e8400-e29b-41d4-a716-446655440000",
      "subGoals": [
        {
          "id": "770e8400-e29b-41d4-a716-446655440000",
          "title": "TypeScript基礎の習得",
          "description": "型システムの基本を理解する",
          "position": 0
        }
      ]
    },
    "createdAt": "2025-10-11T10:00:00Z",
    "updatedAt": "2025-10-11T10:04:30Z",
    "completedAt": "2025-10-11T10:04:30Z"
  }
}
```

#### 失敗（200 OK）

```json
{
  "success": true,
  "data": {
    "processId": "660e8400-e29b-41d4-a716-446655440000",
    "status": "FAILED",
    "type": "SUBGOAL_GENERATION",
    "progress": 50,
    "error": {
      "code": "AI_ERROR",
      "message": "AI生成に失敗しました。もう一度お試しください。",
      "retryable": true
    },
    "createdAt": "2025-10-11T10:00:00Z",
    "updatedAt": "2025-10-11T10:03:00Z",
    "completedAt": "2025-10-11T10:03:00Z"
  }
}
```

#### タイムアウト（200 OK）

```json
{
  "success": true,
  "data": {
    "processId": "660e8400-e29b-41d4-a716-446655440000",
    "status": "TIMEOUT",
    "type": "SUBGOAL_GENERATION",
    "progress": 30,
    "error": {
      "code": "TIMEOUT_ERROR",
      "message": "処理時間が制限を超えました。再試行してください。",
      "retryable": true
    },
    "createdAt": "2025-10-11T10:00:00Z",
    "updatedAt": "2025-10-11T10:05:00Z",
    "completedAt": "2025-10-11T10:05:00Z"
  }
}
```

#### レスポンスフィールド

| フィールド                   | 型                | 説明                                                                               |
| ---------------------------- | ----------------- | ---------------------------------------------------------------------------------- |
| success                      | boolean           | 処理成功フラグ                                                                     |
| data.processId               | string (UUID)     | 処理ID                                                                             |
| data.status                  | string            | 処理状態（`PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`, `TIMEOUT`, `CANCELLED`） |
| data.type                    | string            | 処理タイプ                                                                         |
| data.progress                | number            | 進捗率（0-100）                                                                    |
| data.result                  | object            | 処理結果（完了時のみ）                                                             |
| data.error                   | object            | エラー情報（失敗時のみ）                                                           |
| data.createdAt               | string (ISO 8601) | 作成日時                                                                           |
| data.updatedAt               | string (ISO 8601) | 更新日時                                                                           |
| data.completedAt             | string (ISO 8601) | 完了日時（完了時のみ）                                                             |
| data.estimatedCompletionTime | string (ISO 8601) | 完了予定時刻（処理中のみ）                                                         |

#### エラーレスポンス

##### 処理が見つからない（404 Not Found）

```json
{
  "success": false,
  "error": {
    "code": "PROCESSING_NOT_FOUND",
    "message": "指定された処理が見つかりません"
  }
}
```

##### アクセス権限なし（403 Forbidden）

```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "この処理にアクセスする権限がありません"
  }
}
```

---

## 3. 処理再試行

失敗またはタイムアウトした処理を再試行します。

### エンドポイント

```http
POST /api/ai/async/retry/:processId
```

### パスパラメータ

| パラメータ | 型            | 必須 | 説明             |
| ---------- | ------------- | ---- | ---------------- |
| processId  | string (UUID) | ✓    | 再試行する処理ID |

### リクエストヘッダー

```http
Authorization: Bearer <JWT_TOKEN>
```

### レスポンス

#### 成功時（202 Accepted）

```json
{
  "success": true,
  "data": {
    "processId": "880e8400-e29b-41d4-a716-446655440000",
    "status": "PENDING",
    "type": "SUBGOAL_GENERATION",
    "retryCount": 1,
    "originalProcessId": "660e8400-e29b-41d4-a716-446655440000",
    "createdAt": "2025-10-11T10:10:00Z",
    "estimatedCompletionTime": "2025-10-11T10:15:00Z"
  }
}
```

#### レスポンスフィールド

| フィールド                   | 型                | 説明                  |
| ---------------------------- | ----------------- | --------------------- |
| success                      | boolean           | 処理成功フラグ        |
| data.processId               | string (UUID)     | 新しい処理ID          |
| data.status                  | string            | 処理状態（`PENDING`） |
| data.type                    | string            | 処理タイプ            |
| data.retryCount              | number            | リトライ回数          |
| data.originalProcessId       | string (UUID)     | 元の処理ID            |
| data.createdAt               | string (ISO 8601) | 作成日時              |
| data.estimatedCompletionTime | string (ISO 8601) | 完了予定時刻          |

#### エラーレスポンス

##### 再試行不可（400 Bad Request）

```json
{
  "success": false,
  "error": {
    "code": "RETRY_NOT_ALLOWED",
    "message": "この処理は再試行できません。完了済みまたはキャンセル済みの処理は再試行できません。"
  }
}
```

##### リトライ上限超過（400 Bad Request）

```json
{
  "success": false,
  "error": {
    "code": "MAX_RETRY_EXCEEDED",
    "message": "リトライ回数の上限（3回）を超えました"
  }
}
```

---

## 4. 処理キャンセル

実行中の処理をキャンセルします。

### エンドポイント

```http
POST /api/ai/async/cancel/:processId
```

### パスパラメータ

| パラメータ | 型            | 必須 | 説明                 |
| ---------- | ------------- | ---- | -------------------- |
| processId  | string (UUID) | ✓    | キャンセルする処理ID |

### リクエストヘッダー

```http
Authorization: Bearer <JWT_TOKEN>
```

### リクエストボディ（オプション）

```json
{
  "reason": "ユーザーによるキャンセル"
}
```

### レスポンス

#### 成功時（200 OK）

```json
{
  "success": true,
  "data": {
    "processId": "660e8400-e29b-41d4-a716-446655440000",
    "status": "CANCELLED",
    "type": "SUBGOAL_GENERATION",
    "progress": 30,
    "createdAt": "2025-10-11T10:00:00Z",
    "updatedAt": "2025-10-11T10:03:00Z",
    "completedAt": "2025-10-11T10:03:00Z",
    "cancelReason": "ユーザーによるキャンセル"
  }
}
```

#### エラーレスポンス

##### キャンセル不可（400 Bad Request）

```json
{
  "success": false,
  "error": {
    "code": "CANCEL_NOT_ALLOWED",
    "message": "この処理はキャンセルできません。完了済みまたは失敗済みの処理はキャンセルできません。"
  }
}
```

---

## 5. 処理履歴取得

ユーザーの処理履歴を取得します。

### エンドポイント

```http
GET /api/ai/async/history
```

### クエリパラメータ

| パラメータ | 型                | 必須 | デフォルト | 説明                           |
| ---------- | ----------------- | ---- | ---------- | ------------------------------ |
| page       | number            |      | 1          | ページ番号                     |
| pageSize   | number            |      | 20         | 1ページあたりの件数（最大100） |
| type       | string            |      |            | 処理タイプでフィルタ           |
| status     | string            |      |            | ステータスでフィルタ           |
| startDate  | string (ISO 8601) |      |            | 開始日時でフィルタ             |
| endDate    | string (ISO 8601) |      |            | 終了日時でフィルタ             |

### リクエストヘッダー

```http
Authorization: Bearer <JWT_TOKEN>
```

### レスポンス

#### 成功時（200 OK）

```json
{
  "success": true,
  "data": {
    "processes": [
      {
        "processId": "660e8400-e29b-41d4-a716-446655440000",
        "status": "COMPLETED",
        "type": "SUBGOAL_GENERATION",
        "progress": 100,
        "createdAt": "2025-10-11T10:00:00Z",
        "completedAt": "2025-10-11T10:04:30Z"
      },
      {
        "processId": "770e8400-e29b-41d4-a716-446655440000",
        "status": "FAILED",
        "type": "ACTION_GENERATION",
        "progress": 50,
        "error": {
          "code": "AI_ERROR",
          "message": "AI生成に失敗しました"
        },
        "createdAt": "2025-10-11T09:00:00Z",
        "completedAt": "2025-10-11T09:03:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "totalCount": 45,
      "totalPages": 3,
      "hasNext": true,
      "hasPrevious": false
    }
  }
}
```

---

## エラーコード一覧

| コード               | HTTPステータス | 説明               |
| -------------------- | -------------- | ------------------ |
| VALIDATION_ERROR     | 400            | 入力値が不正       |
| UNAUTHORIZED         | 401            | 認証が必要         |
| FORBIDDEN            | 403            | アクセス権限なし   |
| PROCESSING_NOT_FOUND | 404            | 処理が見つからない |
| RETRY_NOT_ALLOWED    | 400            | 再試行不可         |
| MAX_RETRY_EXCEEDED   | 400            | リトライ上限超過   |
| CANCEL_NOT_ALLOWED   | 400            | キャンセル不可     |
| RATE_LIMIT_EXCEEDED  | 429            | レート制限超過     |
| AI_ERROR             | 500            | AI生成エラー       |
| DATABASE_ERROR       | 500            | データベースエラー |
| TIMEOUT_ERROR        | 500            | タイムアウト       |
| INTERNAL_ERROR       | 500            | 内部エラー         |

## レート制限

- **制限**: 20リクエスト/分/ユーザー
- **超過時**: 429 Too Many Requestsを返却
- **ヘッダー**:
  - `X-RateLimit-Limit`: 制限値
  - `X-RateLimit-Remaining`: 残りリクエスト数
  - `X-RateLimit-Reset`: リセット時刻（Unix timestamp）

## パフォーマンス指標

- **処理状態取得API**: 95パーセンタイルで500ms以内
- **非同期処理開始API**: 95パーセンタイルで1秒以内
- **処理完了時間**:
  - サブ目標生成: 平均3-5分
  - アクション生成: 平均5-10分
  - タスク生成: 平均10-15分

## セキュリティ

### 認証

- JWT認証必須
- トークン有効期限: 24時間
- リフレッシュトークン対応

### 認可

- ユーザーは自分の処理のみアクセス可能
- 他ユーザーの処理へのアクセスは403 Forbiddenを返却

### データ保護

- 全通信はHTTPS必須
- 機密情報はログに記録しない
- エラーメッセージに機密情報を含めない

## バージョニング

現在のAPIバージョン: `v1`

将来的なバージョンアップ時は、URLパスに`/v2`などを追加します。

## サポート

問題が発生した場合は、以下の情報を含めてサポートチームに連絡してください：

- processId
- エラーメッセージ
- 発生日時
- リクエスト内容（機密情報を除く）
