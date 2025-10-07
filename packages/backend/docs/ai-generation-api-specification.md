# AI生成API仕様書

## 概要

このドキュメントは、Amazon Bedrock Nova Microを使用したAI生成APIの仕様を定義します。このAPIは、目標からサブ目標、サブ目標からアクション、アクションからタスクを生成する機能を提供します。

## バージョン

- API Version: 1.0.0
- Last Updated: 2025-10-06

## ベースURL

```
https://api.goal-mandala.example.com/v1
```

## 認証

全てのエンドポイントはAmazon Cognito User Poolsによる認証が必要です。

### 認証方法

リクエストヘッダーに以下を含める必要があります：

```
Authorization: Bearer <JWT_TOKEN>
```

### 認証エラー

認証に失敗した場合、以下のレスポンスが返されます：

```json
{
  "statusCode": 401,
  "body": {
    "success": false,
    "error": {
      "code": "AUTHENTICATION_ERROR",
      "message": "認証が必要です",
      "retryable": false
    }
  }
}
```

## エンドポイント

### 1. サブ目標生成

目標情報から8つのサブ目標を生成します。

#### エンドポイント

```
POST /ai/generate-subgoals
```

#### リクエスト

##### ヘッダー

| ヘッダー名    | 必須 | 説明             |
| ------------- | ---- | ---------------- |
| Authorization | ✓    | Bearer トークン  |
| Content-Type  | ✓    | application/json |

##### ボディ

```json
{
  "type": "subgoal",
  "userId": "string",
  "input": {
    "title": "string",
    "description": "string",
    "deadline": "string",
    "background": "string",
    "constraints": "string"
  }
}
```

##### パラメータ詳細

| フィールド        | 型     | 必須 | 説明         | 制約                                     |
| ----------------- | ------ | ---- | ------------ | ---------------------------------------- |
| type              | string | ✓    | 生成タイプ   | 固定値: "subgoal"                        |
| userId            | string | ✓    | ユーザーID   | 認証されたユーザーIDと一致する必要がある |
| input.title       | string | ✓    | 目標タイトル | 1-100文字                                |
| input.description | string | ✓    | 目標説明     | 1-500文字                                |
| input.deadline    | string | ✓    | 達成期限     | ISO 8601形式（YYYY-MM-DD）               |
| input.background  | string | ✓    | 背景・理由   | 1-500文字                                |
| input.constraints | string | -    | 制約事項     | 0-500文字                                |

##### リクエスト例

```json
{
  "type": "subgoal",
  "userId": "user-123",
  "input": {
    "title": "TypeScriptのエキスパートになる",
    "description": "6ヶ月でTypeScriptの高度な機能を習得し、実務で活用できるレベルになる",
    "deadline": "2025-12-31",
    "background": "フロントエンド開発者として、型安全性の高いコードを書けるようになりたい",
    "constraints": "平日は2時間、週末は4時間の学習時間を確保できる"
  }
}
```

#### レスポンス

##### 成功時（200 OK）

```json
{
  "success": true,
  "data": [
    {
      "title": "型システムを完全に理解する",
      "description": "TypeScriptの型システムの全機能を理解し、活用できるようになる",
      "background": "型安全性を高めるために必要",
      "position": 0
    },
    {
      "title": "ジェネリクスをマスターする",
      "description": "ジェネリクスを使った再利用可能なコードを書けるようになる",
      "background": "コードの再利用性を高めるために必要",
      "position": 1
    }
    // ... 残り6個のサブ目標
  ]
}
```

##### レスポンスフィールド

| フィールド         | 型      | 説明                           |
| ------------------ | ------- | ------------------------------ |
| success            | boolean | 処理の成否                     |
| data               | array   | サブ目標の配列（8個）          |
| data[].title       | string  | サブ目標タイトル（30文字以内） |
| data[].description | string  | サブ目標説明（200文字以内）    |
| data[].background  | string  | 背景・理由（100文字以内）      |
| data[].position    | number  | 位置（0-7）                    |

##### エラー時

###### バリデーションエラー（400 Bad Request）

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "typeフィールドが存在しません",
    "retryable": false
  }
}
```

###### 認証エラー（401 Unauthorized）

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

###### サーバーエラー（500 Internal Server Error）

```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "AI生成中にエラーが発生しました",
    "retryable": true
  }
}
```

### 2. アクション生成

サブ目標情報から8つのアクションを生成します。

#### エンドポイント

```
POST /ai/generate-actions
```

#### リクエスト

##### ヘッダー

| ヘッダー名    | 必須 | 説明             |
| ------------- | ---- | ---------------- |
| Authorization | ✓    | Bearer トークン  |
| Content-Type  | ✓    | application/json |

##### ボディ

```json
{
  "type": "action",
  "userId": "string",
  "input": {
    "goalTitle": "string",
    "goalDescription": "string",
    "subGoalTitle": "string",
    "subGoalDescription": "string",
    "background": "string",
    "constraints": "string"
  }
}
```

##### パラメータ詳細

| フィールド               | 型     | 必須 | 説明             | 制約                                     |
| ------------------------ | ------ | ---- | ---------------- | ---------------------------------------- |
| type                     | string | ✓    | 生成タイプ       | 固定値: "action"                         |
| userId                   | string | ✓    | ユーザーID       | 認証されたユーザーIDと一致する必要がある |
| input.goalTitle          | string | ✓    | 目標タイトル     | 1-100文字                                |
| input.goalDescription    | string | ✓    | 目標説明         | 1-500文字                                |
| input.subGoalTitle       | string | ✓    | サブ目標タイトル | 1-100文字                                |
| input.subGoalDescription | string | ✓    | サブ目標説明     | 1-500文字                                |
| input.background         | string | ✓    | 背景・理由       | 1-500文字                                |
| input.constraints        | string | -    | 制約事項         | 0-500文字                                |

##### リクエスト例

```json
{
  "type": "action",
  "userId": "user-123",
  "input": {
    "goalTitle": "TypeScriptのエキスパートになる",
    "goalDescription": "6ヶ月でTypeScriptの高度な機能を習得する",
    "subGoalTitle": "型システムを完全に理解する",
    "subGoalDescription": "TypeScriptの型システムの全機能を理解し、活用できるようになる",
    "background": "型安全性を高めるために必要",
    "constraints": "平日2時間の学習時間"
  }
}
```

#### レスポンス

##### 成功時（200 OK）

```json
{
  "success": true,
  "data": [
    {
      "title": "TypeScriptの公式ドキュメントを読む",
      "description": "TypeScriptの公式ドキュメントを通読し、型システムの基礎を理解する",
      "type": "execution",
      "background": "基礎知識の習得に必要",
      "position": 0
    },
    {
      "title": "毎日型定義を書く練習をする",
      "description": "毎日30分以上、型定義を書く練習を継続する",
      "type": "habit",
      "background": "継続的な練習が必要",
      "position": 1
    }
    // ... 残り6個のアクション
  ]
}
```

##### レスポンスフィールド

| フィールド         | 型      | 説明                                         |
| ------------------ | ------- | -------------------------------------------- |
| success            | boolean | 処理の成否                                   |
| data               | array   | アクションの配列（8個）                      |
| data[].title       | string  | アクションタイトル（30文字以内）             |
| data[].description | string  | アクション説明（200文字以内）                |
| data[].type        | string  | アクション種別（"execution" または "habit"） |
| data[].background  | string  | 背景・理由（100文字以内）                    |
| data[].position    | number  | 位置（0-7）                                  |

### 3. タスク生成

アクション情報から具体的なタスクを生成します。

#### エンドポイント

```
POST /ai/generate-tasks
```

#### リクエスト

##### ヘッダー

| ヘッダー名    | 必須 | 説明             |
| ------------- | ---- | ---------------- |
| Authorization | ✓    | Bearer トークン  |
| Content-Type  | ✓    | application/json |

##### ボディ

```json
{
  "type": "task",
  "userId": "string",
  "input": {
    "actionTitle": "string",
    "actionDescription": "string",
    "actionType": "string",
    "background": "string",
    "constraints": "string"
  }
}
```

##### パラメータ詳細

| フィールド              | 型     | 必須 | 説明               | 制約                                     |
| ----------------------- | ------ | ---- | ------------------ | ---------------------------------------- |
| type                    | string | ✓    | 生成タイプ         | 固定値: "task"                           |
| userId                  | string | ✓    | ユーザーID         | 認証されたユーザーIDと一致する必要がある |
| input.actionTitle       | string | ✓    | アクションタイトル | 1-100文字                                |
| input.actionDescription | string | ✓    | アクション説明     | 1-500文字                                |
| input.actionType        | string | ✓    | アクション種別     | "execution" または "habit"               |
| input.background        | string | ✓    | 背景・理由         | 1-500文字                                |
| input.constraints       | string | -    | 制約事項           | 0-500文字                                |

##### リクエスト例

```json
{
  "type": "task",
  "userId": "user-123",
  "input": {
    "actionTitle": "TypeScriptの公式ドキュメントを読む",
    "actionDescription": "TypeScriptの公式ドキュメントを通読し、型システムの基礎を理解する",
    "actionType": "execution",
    "background": "基礎知識の習得に必要",
    "constraints": "1日2時間まで"
  }
}
```

#### レスポンス

##### 成功時（200 OK）

```json
{
  "success": true,
  "data": [
    {
      "title": "基本的な型の章を読む",
      "description": "string、number、booleanなどの基本型について学ぶ",
      "type": "execution",
      "estimatedMinutes": 30
    },
    {
      "title": "ユニオン型とインターセクション型の章を読む",
      "description": "複合型の使い方を理解する",
      "type": "execution",
      "estimatedMinutes": 45
    }
    // ... 残りのタスク（3-10個）
  ]
}
```

##### レスポンスフィールド

| フィールド              | 型      | 説明                                     |
| ----------------------- | ------- | ---------------------------------------- |
| success                 | boolean | 処理の成否                               |
| data                    | array   | タスクの配列（3-10個）                   |
| data[].title            | string  | タスクタイトル（50文字以内）             |
| data[].description      | string  | タスク説明（200文字以内）                |
| data[].type             | string  | タスク種別（"execution" または "habit"） |
| data[].estimatedMinutes | number  | 推定所要時間（分）（30-60分）            |

## エラーコード一覧

| コード               | HTTPステータス | 説明                             | リトライ可能 |
| -------------------- | -------------- | -------------------------------- | ------------ |
| VALIDATION_ERROR     | 400            | リクエストのバリデーションエラー | ✗            |
| AUTHENTICATION_ERROR | 401            | 認証エラー                       | ✗            |
| INTERNAL_ERROR       | 500            | サーバー内部エラー               | ✓            |
| THROTTLING_ERROR     | 429            | レート制限エラー                 | ✓            |
| TIMEOUT_ERROR        | 504            | タイムアウトエラー               | ✓            |

## レート制限

- リクエスト数: 1000リクエスト/分
- バーストリクエスト数: 2000リクエスト

レート制限を超えた場合、429 Too Many Requestsが返されます。

## タイムアウト

- API Gateway タイムアウト: 30秒
- Lambda タイムアウト: 15分（AI処理用）

## パフォーマンス

### 期待されるレスポンス時間

| エンドポイント        | 平均レスポンス時間 | 95パーセンタイル |
| --------------------- | ------------------ | ---------------- |
| /ai/generate-subgoals | 10-20秒            | 30秒             |
| /ai/generate-actions  | 10-20秒            | 30秒             |
| /ai/generate-tasks    | 5-15秒             | 25秒             |

## セキュリティ

### プロンプトインジェクション対策

入力値は以下の方法でサニタイズされます：

- 特殊文字のエスケープ
- 文字数制限の適用
- プロンプトインジェクションパターンの検出

### データ保護

- 全ての通信はHTTPS経由
- ユーザーデータは暗号化して保存
- ログには機密情報を含めない

## 使用例

### cURLでの使用例

```bash
# サブ目標生成
curl -X POST https://api.goal-mandala.example.com/v1/ai/generate-subgoals \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "subgoal",
    "userId": "user-123",
    "input": {
      "title": "TypeScriptのエキスパートになる",
      "description": "6ヶ月でTypeScriptの高度な機能を習得する",
      "deadline": "2025-12-31",
      "background": "型安全性の高いコードを書けるようになりたい"
    }
  }'
```

### JavaScriptでの使用例

```javascript
const response = await fetch(
  'https://api.goal-mandala.example.com/v1/ai/generate-subgoals',
  {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${jwtToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'subgoal',
      userId: 'user-123',
      input: {
        title: 'TypeScriptのエキスパートになる',
        description: '6ヶ月でTypeScriptの高度な機能を習得する',
        deadline: '2025-12-31',
        background: '型安全性の高いコードを書けるようになりたい',
      },
    }),
  }
);

const result = await response.json();
if (result.success) {
  console.log('生成されたサブ目標:', result.data);
} else {
  console.error('エラー:', result.error);
}
```

## 変更履歴

| バージョン | 日付       | 変更内容     |
| ---------- | ---------- | ------------ |
| 1.0.0      | 2025-10-06 | 初版リリース |

## サポート

問題が発生した場合は、以下の情報を含めてサポートチームに連絡してください：

- リクエストID（レスポンスヘッダーの `x-request-id`）
- タイムスタンプ
- エラーメッセージ
- リクエスト内容（機密情報を除く）
