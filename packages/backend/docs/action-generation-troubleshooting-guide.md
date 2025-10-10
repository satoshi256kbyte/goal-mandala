# アクション生成API トラブルシューティングガイド

## 概要

このドキュメントは、アクション生成API（`POST /api/ai/generate/actions`）で発生する可能性のある問題と、その解決方法を説明します。

## 目次

1. [よくある問題](#よくある問題)
2. [エラー別トラブルシューティング](#エラー別トラブルシューティング)
3. [品質エラーの対処方法](#品質エラーの対処方法)
4. [パフォーマンス問題](#パフォーマンス問題)
5. [ログの確認方法](#ログの確認方法)
6. [デバッグ手順](#デバッグ手順)

---

## よくある問題

### 問題1: バリデーションエラーが頻発する

**症状**:

- `VALIDATION_ERROR` が繰り返し発生する
- 特定のフィールドでエラーが出る

**原因**:

- サブ目標IDがUUID形式でない
- サブ目標が存在しない
- フロントエンドのバリデーションが不十分

**解決方法**:

1. **エラー詳細の確認**

   ```json
   {
     "error": {
       "code": "VALIDATION_ERROR",
       "details": [
         {
           "field": "subGoalId",
           "message": "サブ目標IDは有効なUUID形式である必要があります"
         }
       ]
     }
   }
   ```

2. **各フィールドの制約を確認**
   - `subGoalId`: UUID v4形式、必須
   - `regenerate`: boolean、オプション

3. **フロントエンドでのバリデーション実装**

   ```typescript
   // 例: React Hook Formでのバリデーション
   const schema = z.object({
     subGoalId: z.string().uuid({
       message: 'サブ目標IDは有効なUUID形式である必要があります',
     }),
     regenerate: z.boolean().optional().default(false),
   });
   ```

4. **サブ目標の存在確認**
   ```typescript
   // サブ目標一覧を取得して、有効なIDを使用
   const subGoals = await fetchSubGoals(goalId);
   const validSubGoalId = subGoals[0].id;
   ```

---

### 問題2: AI生成の品質エラーが発生する

**症状**:

- `QUALITY_ERROR` が発生する
- アクションの生成に失敗する

**原因**:

- サブ目標の説明が不十分
- AIが適切なアクションを生成できない
- プロンプトの品質問題

**解決方法**:

1. **サブ目標の説明を具体化**

   ```typescript
   // ❌ 悪い例
   {
     "title": "基礎を学ぶ",
     "description": "基礎を学習する",
     "background": "必要だから"
   }

   // ✅ 良い例
   {
     "title": "TypeScriptの基礎文法を習得する",
     "description": "TypeScriptの型システム、インターフェース、ジェネリクスなどの基礎文法を理解し、実務で活用できるレベルになる",
     "background": "フロントエンド開発で型安全性の高いコードを書けるようになりたい。現在はJavaScriptを使用しているが、大規模プロジェクトでの保守性に課題を感じている。",
     "constraints": "平日は1時間、週末は2時間の学習時間を確保できる"
   }
   ```

2. **背景情報の充実**
   - 現在の状況
   - サブ目標を立てた理由
   - 達成後のビジョン

3. **制約事項の明記**
   - 時間的制約
   - リソース的制約
   - スキル的制約

4. **リトライの実施**
   - 数回リトライすることで成功する場合がある
   - 指数バックオフでリトライを実装

---

### 問題3: 処理時間が長い

**症状**:

- レスポンスが返ってくるまで30秒以上かかる
- タイムアウトエラーが発生する

**原因**:

- Bedrock APIの応答が遅い
- データベース処理が遅い（コンテキスト取得）
- Lambda関数のコールドスタート

**解決方法**:

1. **処理時間の内訳を確認**

   ```bash
   # CloudWatch Logs Insightsで実行
   fields @timestamp, duration, metadata.tokensUsed
   | filter action = "action_generation_success"
   | stats avg(duration) as avg_duration,
           max(duration) as max_duration,
           percentile(duration, 95) as p95_duration
   ```

2. **プロンプトの最適化**
   - 不要な情報を削除
   - トークン数を削減

3. **Lambda設定の見直し**
   - メモリサイズの増加（現在1024MB）
   - タイムアウトの調整（現在60秒）

4. **データベース接続の最適化**
   - 接続プールの設定確認
   - クエリの最適化

---

### 問題4: 認証エラーが発生する

**症状**:

- `AUTHENTICATION_ERROR` が発生する
- 401 Unauthorizedが返される

**原因**:

- 認証トークンが提供されていない
- トークンが無効または期限切れ
- ヘッダー形式が正しくない

**解決方法**:

1. **Authorizationヘッダーの確認**

   ```typescript
   // 正しい形式
   const headers = {
     Authorization: `Bearer ${token}`,
     'Content-Type': 'application/json',
   };
   ```

2. **トークンの有効期限確認**

   ```typescript
   // JWTトークンのデコード
   import jwt_decode from 'jwt-decode';

   const decoded = jwt_decode(token);
   const isExpired = decoded.exp * 1000 < Date.now();

   if (isExpired) {
     // トークンを再取得
     await refreshToken();
   }
   ```

3. **トークンの再取得**
   - ログイン画面にリダイレクト
   - リフレッシュトークンを使用して新しいトークンを取得

---

### 問題5: データベース接続エラーが発生する

**症状**:

- `DATABASE_ERROR` が発生する
- トランザクションエラーが発生する

**原因**:

- データベース接続の問題
- 接続プールの枯渇
- データベースの一時的な障害

**解決方法**:

1. **データベースの状態確認**

   ```bash
   # Aurora Serverlessの状態確認
   aws rds describe-db-clusters \
     --db-cluster-identifier <cluster-id> \
     --query 'DBClusters[0].Status'
   ```

2. **接続プール設定の確認**

   ```typescript
   // Prismaクライアントの設定
   const prisma = new PrismaClient({
     datasources: {
       db: {
         url: process.env.DATABASE_URL,
       },
     },
     // 接続プール設定
     // connection_limit=10&pool_timeout=20
   });
   ```

3. **接続数の確認**

   ```sql
   -- PostgreSQLで実行
   SELECT count(*) FROM pg_stat_activity;
   ```

4. **対応策**
   - 接続プール設定の最適化
   - Aurora Serverlessのスケーリング設定見直し
   - RDS Proxyの導入検討

---

### 問題6: アクション種別が正しく判定されない

**症状**:

- 全てのアクションが「実行アクション」になる
- 習慣アクションが生成されない

**原因**:

- AIが種別を判定していない
- キーワードマッチングが機能していない
- サブ目標の説明が不十分

**解決方法**:

1. **ログの確認**

   ```bash
   # CloudWatch Logs Insightsで実行
   fields @timestamp, requestId
   | filter level = "WARN" and action like /action_type/
   | sort @timestamp desc
   ```

2. **サブ目標の説明を改善**
   - 継続的な実施が必要なアクションを明示
   - 「毎日」「毎週」などのキーワードを含める

3. **手動での種別変更**
   - フロントエンドで種別を変更できる機能を提供
   - ユーザーフィードバックを収集

---

## エラー別トラブルシューティング

### VALIDATION_ERROR

**チェックリスト**:

- [ ] `subGoalId` がUUID形式か
- [ ] サブ目標が存在するか
- [ ] `regenerate` がboolean型か

**デバッグ手順**:

1. リクエストボディをログ出力
2. バリデーションエラーの詳細を確認
3. 該当フィールドを修正
4. 再送信

**ログの確認**:

```bash
# CloudWatch Logs Insightsで実行
fields @timestamp, error.details
| filter error.code = "VALIDATION_ERROR"
| sort @timestamp desc
| limit 10
```

---

### QUALITY_ERROR

**チェックリスト**:

- [ ] サブ目標の説明が具体的か
- [ ] 背景情報が十分に提供されているか
- [ ] 制約事項が明記されているか
- [ ] サブ目標が現実的か

**デバッグ手順**:

1. 生成されたアクションの内容を確認（ログから）
2. 品質基準を満たしていない項目を特定
3. サブ目標の説明を改善
4. リトライ

**ログの確認**:

```bash
# CloudWatch Logs Insightsで実行
fields @timestamp, error.message
| filter error.code = "QUALITY_ERROR"
| sort @timestamp desc
| limit 10
```

---

### DATABASE_ERROR

**チェックリスト**:

- [ ] データベースが起動しているか
- [ ] 接続情報が正しいか
- [ ] 接続プールが枯渇していないか
- [ ] トランザクションがタイムアウトしていないか

**デバッグ手順**:

1. データベースの状態確認
2. 接続数の確認
3. エラーログの詳細確認
4. 必要に応じてデータベースの再起動

**ログの確認**:

```bash
# CloudWatch Logs Insightsで実行
fields @timestamp, error.message, error.originalError
| filter error.code = "DATABASE_ERROR"
| sort @timestamp desc
| limit 10
```

---

### AI_SERVICE_ERROR

**チェックリスト**:

- [ ] Bedrockサービスが利用可能か
- [ ] APIレート制限を超えていないか
- [ ] IAM権限が正しく設定されているか
- [ ] モデルIDが正しいか

**デバッグ手順**:

1. AWS Service Healthの確認
2. Bedrockサービスの状態確認
3. IAM権限の確認
4. レート制限の確認

**ログの確認**:

```bash
# CloudWatch Logs Insightsで実行
fields @timestamp, error.message, error.retryable
| filter error.code = "AI_SERVICE_ERROR"
| sort @timestamp desc
| limit 10
```

---

## 品質エラーの対処方法

### 品質基準

アクション生成APIは以下の品質基準を満たす必要があります：

1. **個数**: 必ず8個
2. **タイトル**: 50文字以内
3. **説明**: 100-200文字
4. **背景**: 100文字以内
5. **重複**: タイトルの重複なし
6. **類似度**: 説明の類似度が80%未満

### 品質エラーのパターン

#### パターン1: アクション数が8個でない

**原因**:

- AIが適切な数のアクションを生成できない
- サブ目標の説明が不十分

**解決方法**:

- サブ目標の説明をより具体的にする
- 背景情報を追加する
- リトライする

#### パターン2: タイトルが長すぎる

**原因**:

- AIが簡潔なタイトルを生成できない

**解決方法**:

- プロンプトの改善（開発者向け）
- リトライする

#### パターン3: 説明が短すぎる

**原因**:

- AIが詳細な説明を生成できない
- サブ目標の説明が不十分

**解決方法**:

- サブ目標の説明をより詳細にする
- 背景情報を追加する
- リトライする

#### パターン4: アクション間で重複が多い

**原因**:

- サブ目標の説明が抽象的
- 制約事項が不明確

**解決方法**:

- サブ目標の説明をより具体的にする
- 制約事項を明記する
- リトライする

### 品質改善のヒント

1. **サブ目標の説明を具体化**
   - 何を、どのように、どの程度達成するか明確にする
   - 具体的な数値や期限を含める

2. **背景情報を充実**
   - なぜそのサブ目標が必要か説明する
   - 現在の状況と達成後のビジョンを記述する

3. **制約事項を明記**
   - 時間的制約（平日1時間、週末2時間など）
   - リソース的制約（予算、ツールなど）
   - スキル的制約（現在のレベル、経験など）

---

## パフォーマンス問題

### 処理時間が長い

**診断手順**:

1. **処理時間の分布を確認**

   ```bash
   # CloudWatch Logs Insightsで実行
   fields @timestamp, duration
   | filter action = "action_generation_success"
   | stats
       count() as requests,
       avg(duration) as avg_duration,
       percentile(duration, 50) as p50,
       percentile(duration, 95) as p95,
       percentile(duration, 99) as p99
   ```

2. **ボトルネックの特定**
   - Bedrock呼び出し時間
   - データベース処理時間（コンテキスト取得）
   - その他の処理時間

3. **最適化の実施**
   - プロンプトの最適化
   - データベースクエリの最適化
   - Lambda設定の調整

---

### メモリ不足

**症状**:

- Lambda関数がメモリ不足でエラーになる
- 処理が途中で停止する

**診断手順**:

1. **メモリ使用量の確認**

   ```bash
   # CloudWatch Logs Insightsで実行
   fields @timestamp, @maxMemoryUsed, @memorySize
   | filter @type = "REPORT"
   | stats
       avg(@maxMemoryUsed) as avg_memory,
       max(@maxMemoryUsed) as max_memory,
       avg(@memorySize) as allocated_memory
   ```

2. **メモリサイズの調整**
   - 現在: 1024MB
   - 推奨: メモリ使用量の1.5倍程度

---

### 同時実行数の制限

**症状**:

- スロットリングエラーが発生する
- リクエストが拒否される

**診断手順**:

1. **同時実行数の確認**

   ```bash
   # CloudWatch Metricsで確認
   # Metric: ConcurrentExecutions
   ```

2. **対応策**
   - 予約済み同時実行数の増加
   - アカウントレベルの制限確認
   - トラフィックの分散

---

## ログの確認方法

### CloudWatch Logsでのログ検索

#### 基本的な検索

```bash
# 特定のリクエストIDで検索
fields @timestamp, @message
| filter requestId = "req-1234567890"
| sort @timestamp asc
```

#### エラーログの検索

```bash
# エラーログのみ表示
fields @timestamp, level, error.code, error.message
| filter level = "ERROR"
| sort @timestamp desc
| limit 50
```

#### 特定ユーザーのログ検索

```bash
# 特定ユーザーのリクエスト履歴
fields @timestamp, action, duration, error.code
| filter userId = "user-123"
| sort @timestamp desc
```

#### 処理時間が長いリクエスト

```bash
# 処理時間が25秒以上のリクエスト
fields @timestamp, requestId, userId, duration
| filter action = "action_generation_success" and duration > 25000
| sort duration desc
```

#### アクション種別判定の警告

```bash
# アクション種別判定の警告ログ
fields @timestamp, requestId, subGoalId
| filter level = "WARN" and action like /action_type/
| sort @timestamp desc
```

---

## デバッグ手順

### ステップ1: エラーの特定

1. **エラーコードの確認**
   - レスポンスの `error.code` を確認
   - エラーメッセージを確認

2. **ログの確認**
   - CloudWatch Logsでエラーログを検索
   - リクエストIDでログを追跡

3. **影響範囲の確認**
   - 特定のユーザーのみか
   - 全体的な問題か
   - 特定の時間帯に集中しているか
   - 特定のサブ目標に関連しているか

---

### ステップ2: 原因の調査

1. **リクエストデータの確認**
   - 入力データが正しいか
   - バリデーションを通過しているか

2. **システム状態の確認**
   - Lambda関数の状態
   - データベースの状態
   - Bedrockサービスの状態

3. **ログの詳細分析**
   - エラースタックトレースの確認
   - 処理フローの追跡

---

### ステップ3: 対応策の実施

1. **一時的な対応**
   - エラーメッセージの改善
   - リトライの実装
   - ユーザーへの通知

2. **恒久的な対応**
   - 根本原因の修正
   - テストの追加
   - ドキュメントの更新

---

### ステップ4: 検証

1. **修正の検証**
   - テスト環境での動作確認
   - エッジケースのテスト

2. **本番環境での確認**
   - デプロイ後の動作確認
   - ログの監視

3. **再発防止**
   - 監視アラートの設定
   - ドキュメントの更新

---

## よくある質問（FAQ）

### Q1: リトライは何回まで実施すべきか？

**A**: 一般的には3回までのリトライを推奨します。指数バックオフを使用して、1秒、2秒、4秒の間隔でリトライしてください。

```typescript
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      const delay = Math.pow(2, i) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Max retries exceeded');
}
```

---

### Q2: タイムアウトエラーが発生した場合の対処法は？

**A**: 以下の対応を検討してください：

1. プロンプトの最適化（トークン数削減）
2. Lambda関数のメモリサイズ増加
3. タイムアウト時間の延長（最大15分）
4. 処理の分割（複数のAPI呼び出しに分ける）

---

### Q3: データベース接続エラーが頻発する場合は？

**A**: 以下を確認してください：

1. 接続プール設定の最適化
2. Aurora Serverlessのスケーリング設定
3. 接続数の監視
4. RDS Proxyの導入検討

---

### Q4: AI生成の品質を向上させるには？

**A**: 以下の方法を試してください：

1. サブ目標の説明をより具体的にする
2. 背景情報を充実させる
3. 制約事項を明記する
4. プロンプトテンプレートの改善（開発者向け）
5. 類似サブ目標からの学習機能の実装（将来の拡張）

---

### Q5: アクション種別が正しく判定されない場合は？

**A**: 以下を確認してください：

1. サブ目標の説明に「毎日」「毎週」などのキーワードを含める
2. 継続的な実施が必要なアクションを明示する
3. フロントエンドで種別を手動変更できる機能を提供する
4. ユーザーフィードバックを収集して改善する

---

## 関連ドキュメント

- [API仕様書](./action-generation-api-specification.md)
- [エラーコード一覧](./action-generation-error-codes.md)
- [運用ガイド](./action-generation-operations-guide.md)

---

## サポート

問題が解決しない場合は、以下の情報を含めて開発チームに連絡してください：

- エラーコード
- リクエストID
- タイムスタンプ
- 再現手順
- 期待される動作
- 実際の動作
- サブ目標の内容（可能であれば）
