# 要件定義書

## はじめに

この要件定義書は、AI生成処理の非同期実行と状態管理機能の実装について定義します。2.2.1〜2.2.4で実装したAI生成API（サブ目標、アクション、タスク生成）を非同期処理として実行し、処理状態の管理、進捗通知、タイムアウト処理、リトライ機能を提供します。

プロダクト概要に記載されている通り、AI生成は時間がかかる処理であるため、非同期処理として実装し、ユーザーは処理状況を定期的に確認できるようにします。

## 要件

### 要件1: 非同期処理開始エンドポイント

**ユーザーストーリー:** ユーザーとして、AI生成処理を非同期で開始したい。そうすることで、処理完了を待たずに他の操作を続けられる。

#### 受入基準

1. WHEN POST /api/ai/async/generate エンドポイントにリクエストを送信する THEN 非同期処理が開始される
2. WHEN リクエストボディに生成タイプ（subgoals/actions/tasks）が含まれる THEN 必須フィールドが検証される
3. WHEN 認証トークンが有効である THEN ユーザーIDが抽出され、リクエストに紐付けられる
4. WHEN 非同期処理が開始される THEN 処理IDが生成され、レスポンスで返される
5. WHEN 処理状態レコードが作成される THEN ステータスが「PENDING」に設定される
6. WHEN レスポンスを返す THEN 即座に処理IDとステータスが返される
7. WHEN エラーが発生する THEN 適切なHTTPステータスコードとエラーメッセージが返される

### 要件2: 処理状態管理テーブル設計

**ユーザーストーリー:** システム開発者として、非同期処理の状態を永続化したい。そうすることで、処理の進捗を追跡し、エラー時の復旧が可能になる。

#### 受入基準

1. WHEN 処理状態テーブルを設計する THEN 以下のフィールドが含まれる: id、userId、type、status、targetId、progress、result、error、createdAt、updatedAt、completedAt
2. WHEN 処理状態を保存する THEN ステータスは「PENDING」「PROCESSING」「COMPLETED」「FAILED」「TIMEOUT」のいずれかである
3. WHEN 処理タイプを保存する THEN タイプは「SUBGOAL_GENERATION」「ACTION_GENERATION」「TASK_GENERATION」のいずれかである
4. WHEN 進捗を保存する THEN 0〜100の整数値で表現される
5. WHEN 処理結果を保存する THEN JSON形式で保存される
6. WHEN エラー情報を保存する THEN エラーメッセージとスタックトレースが保存される
7. WHEN 処理完了時刻を保存する THEN completedAtフィールドに記録される

### 要件3: 処理状態取得エンドポイント

**ユーザーストーリー:** ユーザーとして、非同期処理の現在の状態を確認したい。そうすることで、処理の進捗を把握し、完了を待つことができる。

#### 受入基準

1. WHEN GET /api/ai/async/status/:processId エンドポイントにリクエストを送信する THEN 処理状態が返される
2. WHEN 処理IDが有効である THEN 処理状態レコードがデータベースから取得される
3. WHEN 認証トークンが有効である THEN ユーザーIDが検証される
4. WHEN ユーザーが自分の処理を確認する THEN 処理状態が返される
5. WHEN ユーザーが他人の処理を確認しようとする THEN 403 Forbiddenが返される
6. WHEN 処理が完了している THEN ステータスが「COMPLETED」で結果データが含まれる
7. WHEN 処理が失敗している THEN ステータスが「FAILED」でエラー情報が含まれる

### 要件4: 処理状態更新機能

**ユーザーストーリー:** システム開発者として、非同期処理の状態を更新したい。そうすることで、処理の進捗をリアルタイムで反映できる。

#### 受入基準

1. WHEN 非同期処理が開始される THEN ステータスが「PENDING」から「PROCESSING」に更新される
2. WHEN 処理が進行する THEN 進捗率（0〜100）が更新される
3. WHEN 処理が完了する THEN ステータスが「COMPLETED」に更新され、結果データが保存される
4. WHEN 処理が失敗する THEN ステータスが「FAILED」に更新され、エラー情報が保存される
5. WHEN タイムアウトが発生する THEN ステータスが「TIMEOUT」に更新される
6. WHEN 状態を更新する THEN updatedAtフィールドが自動更新される
7. WHEN 処理が完了または失敗する THEN completedAtフィールドが設定される

### 要件5: 進捗通知機能

**ユーザーストーリー:** ユーザーとして、処理の進捗をリアルタイムで知りたい。そうすることで、処理完了までの時間を予測できる。

#### 受入基準

1. WHEN サブ目標生成が開始される THEN 進捗率が0%に設定される
2. WHEN AI生成が完了する THEN 進捗率が50%に更新される
3. WHEN データベース保存が完了する THEN 進捗率が100%に更新される
4. WHEN アクション生成が開始される THEN 進捗率が0%に設定される
5. WHEN 各サブ目標のアクション生成が完了する THEN 進捗率が段階的に更新される（12.5%ずつ）
6. WHEN タスク生成が開始される THEN 進捗率が0%に設定される
7. WHEN 各アクションのタスク生成が完了する THEN 進捗率が段階的に更新される

### 要件6: タイムアウト処理機能

**ユーザーストーリー:** システム管理者として、長時間実行される処理を検出したい。そうすることで、リソースの無駄遣いを防ぎ、適切に処理を終了できる。

#### 受入基準

1. WHEN 処理が開始される THEN タイムアウト時間（デフォルト5分）が設定される
2. WHEN 処理時間がタイムアウト時間を超える THEN 処理が自動的に中断される
3. WHEN タイムアウトが発生する THEN ステータスが「TIMEOUT」に更新される
4. WHEN タイムアウトが発生する THEN エラーメッセージが記録される
5. WHEN タイムアウトが発生する THEN CloudWatchアラートが発行される
6. WHEN タイムアウト時間を設定する THEN 処理タイプごとに異なる時間を設定できる
7. WHEN タイムアウト処理を実行する THEN リソースが適切にクリーンアップされる

### 要件7: リトライ機能

**ユーザーストーリー:** ユーザーとして、失敗した処理を再試行したい。そうすることで、一時的なエラーから復旧できる。

#### 受入基準

1. WHEN POST /api/ai/async/retry/:processId エンドポイントにリクエストを送信する THEN 処理が再試行される
2. WHEN 処理が「FAILED」または「TIMEOUT」状態である THEN 再試行が許可される
3. WHEN 処理が「COMPLETED」状態である THEN 再試行が拒否される
4. WHEN 再試行が開始される THEN 新しい処理IDが生成される
5. WHEN 再試行が開始される THEN 元の処理の入力パラメータが使用される
6. WHEN 再試行回数が上限（3回）を超える THEN 再試行が拒否される
7. WHEN 再試行が開始される THEN 再試行回数がインクリメントされる

### 要件8: 自動リトライ機能

**ユーザーストーリー:** システム開発者として、一時的なエラーを自動的に再試行したい。そうすることで、ユーザーの手動介入なしに復旧できる。

#### 受入基準

1. WHEN Bedrock APIがスロットリングエラーを返す THEN 自動的にリトライが実行される
2. WHEN データベース接続エラーが発生する THEN 自動的にリトライが実行される
3. WHEN ネットワークエラーが発生する THEN 自動的にリトライが実行される
4. WHEN リトライを実行する THEN エクスポネンシャルバックオフが適用される（1秒、2秒、4秒）
5. WHEN リトライが3回失敗する THEN 処理が「FAILED」状態に更新される
6. WHEN 自動リトライが実行される THEN リトライ回数がログに記録される
7. WHEN 永続的なエラーが発生する THEN 自動リトライは実行されない

### 要件9: 処理キャンセル機能

**ユーザーストーリー:** ユーザーとして、実行中の処理をキャンセルしたい。そうすることで、不要な処理を停止し、リソースを節約できる。

#### 受入基準

1. WHEN POST /api/ai/async/cancel/:processId エンドポイントにリクエストを送信する THEN 処理がキャンセルされる
2. WHEN 処理が「PENDING」または「PROCESSING」状態である THEN キャンセルが許可される
3. WHEN 処理が「COMPLETED」または「FAILED」状態である THEN キャンセルが拒否される
4. WHEN キャンセルが実行される THEN ステータスが「CANCELLED」に更新される
5. WHEN キャンセルが実行される THEN 実行中のLambda関数が停止される
6. WHEN キャンセルが実行される THEN リソースが適切にクリーンアップされる
7. WHEN キャンセルが実行される THEN キャンセル理由がログに記録される

### 要件10: 処理履歴管理機能

**ユーザーストーリー:** ユーザーとして、過去の処理履歴を確認したい。そうすることで、以前の生成結果を参照できる。

#### 受入基準

1. WHEN GET /api/ai/async/history エンドポイントにリクエストを送信する THEN 処理履歴が返される
2. WHEN 処理履歴を取得する THEN ユーザーの処理のみが返される
3. WHEN 処理履歴を取得する THEN 最新の処理から順に返される
4. WHEN 処理履歴を取得する THEN ページネーションが適用される（デフォルト20件）
5. WHEN 処理履歴をフィルタリングする THEN 処理タイプでフィルタリングできる
6. WHEN 処理履歴をフィルタリングする THEN ステータスでフィルタリングできる
7. WHEN 処理履歴をフィルタリングする THEN 日付範囲でフィルタリングできる

### 要件11: エラーハンドリング

**ユーザーストーリー:** ユーザーとして、処理が失敗した場合に適切なフィードバックを受け取りたい。そうすることで、問題を理解し、適切に対処できる。

#### 受入基準

1. WHEN AI生成エラーが発生する THEN エラーメッセージが記録される
2. WHEN データベースエラーが発生する THEN エラーメッセージが記録される
3. WHEN タイムアウトが発生する THEN エラーメッセージが記録される
4. WHEN エラーが発生する THEN エラー詳細がCloudWatch Logsに記録される
5. WHEN エラーが発生する THEN ユーザーには機密情報を含まないエラーメッセージが返される
6. WHEN エラーが発生する THEN エラー種別が分類される（VALIDATION_ERROR、AI_ERROR、DATABASE_ERROR、TIMEOUT_ERROR）
7. WHEN 重大なエラーが発生する THEN CloudWatchアラートが発行される

### 要件12: パフォーマンスとスケーラビリティ

**ユーザーストーリー:** システム管理者として、非同期処理のパフォーマンスを管理したい。そうすることで、多数のユーザーに安定したサービスを提供できる。

#### 受入基準

1. WHEN 処理状態を取得する THEN 95パーセンタイルで500ms以内に完了する
2. WHEN 同時処理が発生する THEN Lambda同時実行数制限が適用される
3. WHEN データベースクエリを実行する THEN 適切なインデックスが使用される
4. WHEN 処理履歴を取得する THEN ページネーションが適用される
5. WHEN 古い処理レコードを削除する THEN 定期的なクリーンアップが実行される（90日以上前）
6. WHEN 処理が集中する THEN キューイング機能が動作する
7. WHEN 処理負荷が高い THEN 自動スケーリングが動作する

### 要件13: セキュリティとアクセス制御

**ユーザーストーリー:** システム管理者として、APIへの不正アクセスを防止したい。そうすることで、システムとユーザーデータを保護できる。

#### 受入基準

1. WHEN APIリクエストを受信する THEN JWT認証トークンが検証される
2. WHEN 認証トークンが無効である THEN 401 Unauthorizedが返される
3. WHEN ユーザーが他人の処理を操作しようとする THEN 403 Forbiddenが返される
4. WHEN レート制限を超える THEN 429 Too Many Requestsが返される
5. WHEN 機密情報をログに記録する THEN マスキングが適用される
6. WHEN 処理結果を返す THEN ユーザーの権限が検証される
7. WHEN 処理をキャンセルする THEN ユーザーの権限が検証される

### 要件14: 監視とログ

**ユーザーストーリー:** システム管理者として、非同期処理の状況を監視したい。そうすることで、問題を早期に発見し、対処できる。

#### 受入基準

1. WHEN 処理が開始される THEN 構造化ログがCloudWatch Logsに出力される
2. WHEN ログを出力する THEN processId、userId、type、status、処理時間が含まれる
3. WHEN 処理が完了する THEN 成功メトリクスがCloudWatchに送信される
4. WHEN 処理が失敗する THEN 失敗メトリクスとエラー種別がCloudWatchに送信される
5. WHEN 処理時間が閾値を超える THEN アラートが発行される
6. WHEN エラー率が閾値を超える THEN アラートが発行される
7. WHEN タイムアウトが発生する THEN アラートが発行される

## 非機能要件

### パフォーマンス

- 処理状態取得API応答時間: 95パーセンタイルで500ms以内
- 非同期処理開始API応答時間: 95パーセンタイルで1秒以内
- スループット: 100リクエスト/秒（初期設定）
- データベース接続: 接続プール使用

### 可用性

- API成功率: 99.5%以上
- 自動リトライによる復旧
- エラー時の適切なフォールバック
- 処理状態の永続化

### スケーラビリティ

- Lambda同時実行数: 50（初期）→ 500（段階的拡張）
- データベース接続数: 適切な接続プール設定
- 処理キューイング機能
- 自動スケーリング

### セキュリティ

- JWT認証必須
- ユーザー権限検証
- レート制限: 20リクエスト/分/ユーザー
- 機密情報のマスキング

### 監視

- CloudWatch Logsへの構造化ログ出力
- CloudWatch Metricsへのカスタムメトリクス送信
- エラー率、レスポンス時間、タイムアウト率の監視
- アラート設定（エラー率、レスポンス時間、タイムアウト率）

## 制約事項

- Lambda関数の実行時間制限（最大15分）
- データベース接続数の制限
- 月次コスト予算の制約
- 処理履歴の保存期間（90日）
- 同時実行数の制限

## 依存関係

- 2.2.1 Bedrock Lambda関数（完了済み）
- 2.2.2 サブ目標生成API（完了済み）
- 2.2.3 アクション生成API（完了済み）
- 2.2.4 タスク生成API（進行中）
- 1.4.2 Prismaスキーマ定義（完了済み）
- 1.3.2 JWT認証ミドルウェア（完了済み）
- AWS SDK for JavaScript v3
- Prismaクライアント
- Zodバリデーションライブラリ

## 成功基準

1. 非同期処理状態管理APIが正常に動作する
2. 全ての受入基準を満たす
3. ユニットテストカバレッジが80%以上
4. 統合テストが全て成功する
5. パフォーマンス要件を満たす
6. セキュリティ要件を満たす
7. ドキュメントが整備される
8. フロントエンドとの統合が完了する

## インターフェース定義

### 非同期処理開始リクエスト

```typescript
POST /api/ai/async/generate
Content-Type: application/json
Authorization: Bearer <JWT_TOKEN>

{
  "type": "SUBGOAL_GENERATION", // または "ACTION_GENERATION", "TASK_GENERATION"
  "params": {
    // サブ目標生成の場合
    "goalId": "uuid",
    "title": "TypeScriptのエキスパートになる",
    "description": "6ヶ月でTypeScriptの高度な機能を習得し、実務で活用できるレベルになる",
    "deadline": "2025-12-31T23:59:59Z",
    "background": "フロントエンド開発者として、型安全性の高いコードを書けるようになりたい",
    "constraints": "平日は2時間、週末は4時間の学習時間を確保できる"
    
    // アクション生成の場合
    // "subGoalId": "uuid"
    
    // タスク生成の場合
    // "actionId": "uuid"
  }
}
```

### 非同期処理開始レスポンス

```typescript
HTTP/1.1 202 Accepted
Content-Type: application/json

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

### 処理状態取得レスポンス（処理中）

```typescript
HTTP/1.1 200 OK
Content-Type: application/json

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

### 処理状態取得レスポンス（完了）

```typescript
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "data": {
    "processId": "uuid",
    "status": "COMPLETED",
    "type": "SUBGOAL_GENERATION",
    "progress": 100,
    "result": {
      "goalId": "uuid",
      "subGoals": [
        // サブ目標データ
      ]
    },
    "createdAt": "2025-10-10T10:00:00Z",
    "updatedAt": "2025-10-10T10:04:30Z",
    "completedAt": "2025-10-10T10:04:30Z"
  }
}
```

### 処理状態取得レスポンス（失敗）

```typescript
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "data": {
    "processId": "uuid",
    "status": "FAILED",
    "type": "SUBGOAL_GENERATION",
    "progress": 50,
    "error": {
      "code": "AI_ERROR",
      "message": "AI生成に失敗しました。もう一度お試しください。",
      "retryable": true
    },
    "createdAt": "2025-10-10T10:00:00Z",
    "updatedAt": "2025-10-10T10:03:00Z",
    "completedAt": "2025-10-10T10:03:00Z"
  }
}
```

### 処理履歴取得レスポンス

```typescript
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "data": {
    "processes": [
      {
        "processId": "uuid",
        "status": "COMPLETED",
        "type": "SUBGOAL_GENERATION",
        "progress": 100,
        "createdAt": "2025-10-10T10:00:00Z",
        "completedAt": "2025-10-10T10:04:30Z"
      },
      // ... 他の処理
    ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "totalCount": 45,
      "totalPages": 3
    }
  }
}
```

## データベーススキーマ

### ProcessingState テーブル

```prisma
model ProcessingState {
  id            String   @id @default(uuid())
  userId        String
  type          ProcessingType
  status        ProcessingStatus
  targetId      String?  // goalId, subGoalId, actionId
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
