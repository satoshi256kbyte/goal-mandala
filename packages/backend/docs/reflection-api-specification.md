# 振り返り機能 API仕様書

## 概要

振り返り機能は、目標達成状況の分析と改善点の記録を行うためのAPIです。

## エンドポイント一覧

| エンドポイント | メソッド | 説明 | 認証 |
|---------------|---------|------|------|
| `/api/reflections` | POST | 振り返りを作成 | 必須 |
| `/api/reflections/:id` | GET | 振り返りを取得 | 必須 |
| `/api/goals/:goalId/reflections` | GET | 振り返り一覧を取得 | 必須 |
| `/api/reflections/:id` | PUT | 振り返りを更新 | 必須 |
| `/api/reflections/:id` | DELETE | 振り返りを削除 | 必須 |
| `/api/goals/:goalId/action-progress` | GET | アクション進捗を取得 | 必須 |

## 認証

全てのエンドポイントはJWT認証が必須です。

### リクエストヘッダー

```
Authorization: Bearer <JWT_TOKEN>
```

### 認証エラー

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "認証が必要です",
    "timestamp": "2025-12-12T00:00:00.000Z"
  }
}
```

## エンドポイント詳細

### 1. 振り返りを作成

#### リクエスト

```
POST /api/reflections
Content-Type: application/json
Authorization: Bearer <JWT_TOKEN>
```

#### リクエストボディ

```json
{
  "goalId": "550e8400-e29b-41d4-a716-446655440000",
  "summary": "目標達成に向けて順調に進んでいます",
  "regretfulActions": "もう少し早く始めればよかったアクション",
  "slowProgressActions": "思ったより進まなかったアクション",
  "untouchedActions": "未着手となったアクション"
}
```

#### リクエストボディフィールド

| フィールド | 型 | 必須 | 説明 |
|-----------|---|------|------|
| goalId | string (UUID) | ✓ | 目標ID |
| summary | string | ✓ | 総括（1文字以上） |
| regretfulActions | string | - | 惜しかったアクション |
| slowProgressActions | string | - | 進まなかったアクション |
| untouchedActions | string | - | 未着手アクション |

#### レスポンス（成功）

```json
{
  "success": true,
  "data": {
    "reflection": {
      "id": "reflection-123",
      "goalId": "550e8400-e29b-41d4-a716-446655440000",
      "summary": "目標達成に向けて順調に進んでいます",
      "regretfulActions": "もう少し早く始めればよかったアクション",
      "slowProgressActions": "思ったより進まなかったアクション",
      "untouchedActions": "未着手となったアクション",
      "createdAt": "2025-12-12T00:00:00.000Z",
      "updatedAt": "2025-12-12T00:00:00.000Z"
    }
  }
}
```

#### レスポンス（バリデーションエラー）

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "入力データが不正です",
    "details": [
      {
        "field": "goalId",
        "message": "有効なUUIDを入力してください"
      },
      {
        "field": "summary",
        "message": "総括は必須です"
      }
    ],
    "timestamp": "2025-12-12T00:00:00.000Z"
  }
}
```

### 2. 振り返りを取得

#### リクエスト

```
GET /api/reflections/:id
Authorization: Bearer <JWT_TOKEN>
```

#### パスパラメータ

| パラメータ | 型 | 説明 |
|-----------|---|------|
| id | string | 振り返りID |

#### レスポンス（成功）

```json
{
  "success": true,
  "data": {
    "reflection": {
      "id": "reflection-123",
      "goalId": "550e8400-e29b-41d4-a716-446655440000",
      "summary": "目標達成に向けて順調に進んでいます",
      "regretfulActions": "もう少し早く始めればよかったアクション",
      "slowProgressActions": "思ったより進まなかったアクション",
      "untouchedActions": "未着手となったアクション",
      "createdAt": "2025-12-12T00:00:00.000Z",
      "updatedAt": "2025-12-12T00:00:00.000Z"
    }
  }
}
```

#### レスポンス（Not Found）

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "振り返りが見つかりません",
    "timestamp": "2025-12-12T00:00:00.000Z"
  }
}
```

### 3. 振り返り一覧を取得

#### リクエスト

```
GET /api/goals/:goalId/reflections
Authorization: Bearer <JWT_TOKEN>
```

#### パスパラメータ

| パラメータ | 型 | 説明 |
|-----------|---|------|
| goalId | string (UUID) | 目標ID |

#### レスポンス（成功）

```json
{
  "success": true,
  "data": {
    "reflections": [
      {
        "id": "reflection-123",
        "goalId": "550e8400-e29b-41d4-a716-446655440000",
        "summary": "目標達成に向けて順調に進んでいます",
        "regretfulActions": "もう少し早く始めればよかったアクション",
        "slowProgressActions": "思ったより進まなかったアクション",
        "untouchedActions": "未着手となったアクション",
        "createdAt": "2025-12-12T00:00:00.000Z",
        "updatedAt": "2025-12-12T00:00:00.000Z"
      }
    ],
    "total": 1
  }
}
```

#### レスポンス（空）

```json
{
  "success": true,
  "data": {
    "reflections": [],
    "total": 0
  }
}
```

### 4. 振り返りを更新

#### リクエスト

```
PUT /api/reflections/:id
Content-Type: application/json
Authorization: Bearer <JWT_TOKEN>
```

#### パスパラメータ

| パラメータ | 型 | 説明 |
|-----------|---|------|
| id | string | 振り返りID |

#### リクエストボディ

```json
{
  "summary": "更新された総括",
  "regretfulActions": "更新された惜しかったアクション"
}
```

#### リクエストボディフィールド

| フィールド | 型 | 必須 | 説明 |
|-----------|---|------|------|
| summary | string | - | 総括 |
| regretfulActions | string | - | 惜しかったアクション |
| slowProgressActions | string | - | 進まなかったアクション |
| untouchedActions | string | - | 未着手アクション |

**注意**: 少なくとも1つのフィールドを更新する必要があります。

#### レスポンス（成功）

```json
{
  "success": true,
  "data": {
    "reflection": {
      "id": "reflection-123",
      "goalId": "550e8400-e29b-41d4-a716-446655440000",
      "summary": "更新された総括",
      "regretfulActions": "更新された惜しかったアクション",
      "slowProgressActions": "思ったより進まなかったアクション",
      "untouchedActions": "未着手となったアクション",
      "createdAt": "2025-12-12T00:00:00.000Z",
      "updatedAt": "2025-12-12T00:01:00.000Z"
    }
  }
}
```

#### レスポンス（バリデーションエラー）

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "少なくとも1つのフィールドを更新してください",
    "timestamp": "2025-12-12T00:00:00.000Z"
  }
}
```

### 5. 振り返りを削除

#### リクエスト

```
DELETE /api/reflections/:id
Authorization: Bearer <JWT_TOKEN>
```

#### パスパラメータ

| パラメータ | 型 | 説明 |
|-----------|---|------|
| id | string | 振り返りID |

#### レスポンス（成功）

```json
{
  "success": true,
  "message": "振り返りを削除しました"
}
```

#### レスポンス（Not Found）

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "振り返りが見つかりません",
    "timestamp": "2025-12-12T00:00:00.000Z"
  }
}
```

### 6. アクション進捗を取得

#### リクエスト

```
GET /api/goals/:goalId/action-progress
Authorization: Bearer <JWT_TOKEN>
```

#### パスパラメータ

| パラメータ | 型 | 説明 |
|-----------|---|------|
| goalId | string (UUID) | 目標ID |

#### レスポンス（成功）

```json
{
  "success": true,
  "data": {
    "regretful": [
      {
        "id": "action-1",
        "title": "アクション1",
        "progress": 90,
        "subGoalTitle": "サブ目標1"
      }
    ],
    "slowProgress": [
      {
        "id": "action-2",
        "title": "アクション2",
        "progress": 10,
        "subGoalTitle": "サブ目標1"
      }
    ],
    "untouched": [
      {
        "id": "action-3",
        "title": "アクション3",
        "progress": 0,
        "subGoalTitle": "サブ目標2"
      }
    ]
  }
}
```

#### アクション分類基準

| 分類 | 進捗率 | 説明 |
|------|--------|------|
| regretful | 80%以上 | 惜しかったアクション |
| slowProgress | 1%〜20% | 進まなかったアクション |
| untouched | 0% | 未着手アクション |

## エラーコード一覧

| コード | HTTPステータス | 説明 |
|--------|---------------|------|
| UNAUTHORIZED | 401 | 認証が必要です |
| FORBIDDEN | 403 | アクセス権限がありません |
| NOT_FOUND | 404 | リソースが見つかりません |
| VALIDATION_ERROR | 400 | 入力データが不正です |
| INTERNAL_ERROR | 500 | サーバー内部エラー |

## セキュリティ仕様

### 認証

- JWT（JSON Web Token）を使用
- トークンの有効期限: 24時間
- リフレッシュトークンの有効期限: 7日間

### 認可

- ユーザーは自分の振り返りのみアクセス可能
- 他のユーザーの振り返りへのアクセスは拒否される

### データ検証

- 全ての入力データはZodスキーマで検証
- SQLインジェクション対策: Prismaによるパラメータ化クエリ
- XSS対策: 入力値のサニタイズ

## レート制限

- 1分あたり60リクエスト
- 超過時のレスポンス:

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "リクエスト数が上限を超えました。しばらくしてから再試行してください",
    "timestamp": "2025-12-12T00:00:00.000Z"
  }
}
```

## バージョニング

現在のAPIバージョン: v1

将来的なバージョンアップ時は、URLパスに`/v2/`を追加します。

## サポート

問題が発生した場合は、以下の情報を含めてサポートチームに連絡してください：

- リクエストID（レスポンスヘッダーの`X-Request-ID`）
- タイムスタンプ
- エラーメッセージ
- 再現手順
