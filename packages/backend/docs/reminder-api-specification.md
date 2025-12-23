# リマインド機能 API仕様書

## 概要

リマインド機能は、ユーザーが日々のタスクを忘れずに実行できるよう、メールでタスクをリマインドするシステムです。このドキュメントでは、リマインド機能に関連するAPIエンドポイントの仕様を定義します。

## エンドポイント一覧

| エンドポイント                      | メソッド | 説明                             | 認証 |
| ----------------------------------- | -------- | -------------------------------- | ---- |
| `/api/reminders/verify`             | POST     | Deep Linkトークンの検証          | 不要 |
| `/api/reminders/unsubscribe/:token` | GET      | リマインド配信停止               | 不要 |
| `/api/reminders/enable`             | POST     | リマインド再有効化               | 必要 |
| `/api/reminders/trigger`            | POST     | 手動リマインド送信（テスト用）   | 必要 |
| `/api/reminders/preview`            | POST     | メールプレビュー生成（テスト用） | 必要 |

## エンドポイント詳細

### 1. Deep Linkトークンの検証

**エンドポイント**: `POST /api/reminders/verify`

**説明**: メール内のDeep Linkトークンを検証し、ユーザーIDとタスクIDを取得します。

**リクエスト**:

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**レスポンス（成功）**:

```json
{
  "success": true,
  "data": {
    "userId": "user-123",
    "taskId": "task-456",
    "expiresAt": "2025-12-11T10:00:00.000Z"
  }
}
```

**レスポンス（エラー）**:

```json
{
  "success": false,
  "error": {
    "code": "INVALID_TOKEN",
    "message": "トークンが無効です"
  }
}
```

**エラーコード**:

- `INVALID_TOKEN`: トークンが無効または改ざんされている
- `TOKEN_EXPIRED`: トークンの有効期限が切れている
- `VALIDATION_ERROR`: リクエストボディのバリデーションエラー

### 2. リマインド配信停止

**エンドポイント**: `GET /api/reminders/unsubscribe/:token`

**説明**: メール内の配信停止リンクからアクセスし、リマインドを停止します。

**パラメータ**:

- `token` (string, required): 配信停止トークン（JWT）

**レスポンス（成功）**:

```json
{
  "success": true,
  "message": "リマインドの配信を停止しました"
}
```

**レスポンス（エラー）**:

```json
{
  "success": false,
  "error": {
    "code": "INVALID_TOKEN",
    "message": "トークンが無効です"
  }
}
```

**エラーコード**:

- `INVALID_TOKEN`: トークンが無効または改ざんされている
- `TOKEN_EXPIRED`: トークンの有効期限が切れている
- `USER_NOT_FOUND`: ユーザーが見つからない

### 3. リマインド再有効化

**エンドポイント**: `POST /api/reminders/enable`

**説明**: 停止したリマインドを再度有効化します。

**認証**: 必要（JWT Bearer Token）

**リクエスト**:

```json
{
  "userId": "user-123"
}
```

**レスポンス（成功）**:

```json
{
  "success": true,
  "message": "リマインドを再開しました"
}
```

**レスポンス（エラー）**:

```json
{
  "success": false,
  "error": {
    "code": "USER_NOT_FOUND",
    "message": "ユーザーが見つかりません"
  }
}
```

**エラーコード**:

- `UNAUTHORIZED`: 認証トークンが無効または期限切れ
- `USER_NOT_FOUND`: ユーザーが見つからない
- `VALIDATION_ERROR`: リクエストボディのバリデーションエラー

### 4. 手動リマインド送信（テスト用）

**エンドポイント**: `POST /api/reminders/trigger`

**説明**: 特定のユーザーに対して手動でリマインドメールを送信します（テスト用）。

**認証**: 必要（JWT Bearer Token、管理者権限）

**リクエスト**:

```json
{
  "userId": "user-123"
}
```

**レスポンス（成功）**:

```json
{
  "success": true,
  "data": {
    "messageId": "0100018d1234abcd-12345678-1234-1234-1234-123456789abc-000000",
    "taskCount": 3,
    "totalMinutes": 90
  }
}
```

**レスポンス（エラー）**:

```json
{
  "success": false,
  "error": {
    "code": "NO_TASKS_AVAILABLE",
    "message": "リマインド可能なタスクがありません"
  }
}
```

**エラーコード**:

- `UNAUTHORIZED`: 認証トークンが無効または期限切れ
- `FORBIDDEN`: 管理者権限がない
- `USER_NOT_FOUND`: ユーザーが見つからない
- `NO_TASKS_AVAILABLE`: リマインド可能なタスクがない
- `EMAIL_SEND_FAILED`: メール送信に失敗

### 5. メールプレビュー生成（テスト用）

**エンドポイント**: `POST /api/reminders/preview`

**説明**: リマインドメールのプレビューを生成します（テスト用）。

**認証**: 必要（JWT Bearer Token）

**リクエスト**:

```json
{
  "userId": "user-123"
}
```

**レスポンス（成功）**:

```json
{
  "success": true,
  "data": {
    "html": "<!DOCTYPE html><html>...",
    "subject": "今日のタスクリマインド",
    "taskCount": 3,
    "totalMinutes": 90
  }
}
```

**レスポンス（エラー）**:

```json
{
  "success": false,
  "error": {
    "code": "NO_TASKS_AVAILABLE",
    "message": "リマインド可能なタスクがありません"
  }
}
```

**エラーコード**:

- `UNAUTHORIZED`: 認証トークンが無効または期限切れ
- `USER_NOT_FOUND`: ユーザーが見つからない
- `NO_TASKS_AVAILABLE`: リマインド可能なタスクがない

## 共通仕様

### 認証

認証が必要なエンドポイントでは、リクエストヘッダーに以下を含める必要があります：

```
Authorization: Bearer <JWT_TOKEN>
```

### エラーレスポンス形式

すべてのエラーレスポンスは以下の形式に従います：

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "エラーメッセージ"
  }
}
```

### レート制限

- 手動リマインド送信: 1ユーザーあたり1日10回まで
- メールプレビュー生成: 1ユーザーあたり1分間に10回まで
- その他のエンドポイント: 1IPアドレスあたり1分間に60回まで

### タイムアウト

- すべてのエンドポイント: 30秒

## セキュリティ

### Deep Linkトークン

- アルゴリズム: HS256（HMAC with SHA-256）
- 有効期限: 24時間
- ペイロード: `{ userId, taskId, exp }`
- シークレット: AWS Secrets Managerで管理

### 配信停止トークン

- アルゴリズム: HS256（HMAC with SHA-256）
- 有効期限: なし（永続的）
- ペイロード: `{ userId }`
- シークレット: AWS Secrets Managerで管理

### CORS設定

- 許可オリジン: `https://goal-mandala.com`（本番環境）
- 許可メソッド: `GET`, `POST`
- 許可ヘッダー: `Content-Type`, `Authorization`

## 使用例

### Deep Linkトークンの検証

```bash
curl -X POST https://api.goal-mandala.com/api/reminders/verify \
  -H "Content-Type: application/json" \
  -d '{"token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."}'
```

### リマインド配信停止

```bash
curl -X GET https://api.goal-mandala.com/api/reminders/unsubscribe/eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### リマインド再有効化

```bash
curl -X POST https://api.goal-mandala.com/api/reminders/enable \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -d '{"userId":"user-123"}'
```

### 手動リマインド送信

```bash
curl -X POST https://api.goal-mandala.com/api/reminders/trigger \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -d '{"userId":"user-123"}'
```

### メールプレビュー生成

```bash
curl -X POST https://api.goal-mandala.com/api/reminders/preview \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -d '{"userId":"user-123"}'
```

## 変更履歴

| バージョン | 日付       | 変更内容 |
| ---------- | ---------- | -------- |
| 1.0.0      | 2025-12-10 | 初版作成 |
