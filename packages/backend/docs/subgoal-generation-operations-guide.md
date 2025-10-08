# サブ目標生成API 運用ガイド

## 概要

このドキュメントは、サブ目標生成API（`POST /api/ai/generate/subgoals`）の運用に関する情報を提供します。監視項目、アラート対応手順、パフォーマンス最適化、トラブルシューティングなどを含みます。

## 目次

1. [監視項目](#監視項目)
2. [アラート対応手順](#アラート対応手順)
3. [パフォーマンス監視](#パフォーマンス監視)
4. [ログ管理](#ログ管理)
5. [セキュリティ監視](#セキュリティ監視)
6. [定期メンテナンス](#定期メンテナンス)
7. [スケーリング](#スケーリング)

---

## 監視項目

### 1. Lambda関数メトリクス

#### 実行時間（Duration）

- **メトリクス名**: `Duration`
- **閾値**:
  - 警告: p95 > 45秒
  - エラー: p95 > 55秒
- **確認方法**: CloudWatch Metrics
- **対応**: [処理時間超過アラート](#処理時間超過アラート)を参照

#### エラー率（Errors）

- **メトリクス名**: `Errors`
- **閾値**:
  - 警告: 5% 以上
  - エラー: 10% 以上
- **確認方法**: CloudWatch Metrics
- **対応**: [エラー率上昇アラート](#エラー率上昇アラート)を参照

#### スロットリング（Throttles）

- **メトリクス名**: `Throttles`
- **閾値**: 1件以上
- **確認方法**: CloudWatch Metrics
- **対応**: [スロットリング発生アラート](#スロットリング発生アラート)を参照

#### 同時実行数（ConcurrentExecutions）

- **メトリクス名**: `ConcurrentExecutions`
- **閾値**: 8以上（予約済み同時実行数10の80%）
- **確認方法**: CloudWatch Metrics
- **対応**: 同時実行数制限の見直し

### 2. API Gatewayメトリクス

#### リクエスト数（Count）

- **メトリクス名**: `Count`
- **確認方法**: CloudWatch Metrics
- **用途**: トラフィックパターンの把握

#### 4XXエラー（4XXError）

- **メトリクス名**: `4XXError`
- **閾値**: 10% 以上
- **確認方法**: CloudWatch Metrics
- **対応**: クライアント側のエラーを調査

#### 5XXエラー（5XXError）

- **メトリクス名**: `5XXError`
- **閾値**: 5% 以上
- **確認方法**: CloudWatch Metrics
- **対応**: サーバー側のエラーを調査

#### レイテンシ（Latency）

- **メトリクス名**: `Latency`
- **閾値**: p95 > 60秒
- **確認方法**: CloudWatch Metrics
- **対応**: パフォーマンス最適化を検討

### 3. Bedrockメトリクス

#### モデル呼び出し成功率

- **確認方法**: CloudWatch Logs Insights
- **クエリ**:
  ```
  fields @timestamp, action, error.code
  | filter action = "bedrock_invoke_model"
  | stats count() as total,
          sum(error.code = "BedrockError") as errors
          by bin(5m)
  | fields total, errors, (errors / total * 100) as error_rate
  ```
- **閾値**: エラー率 > 5%

#### トークン使用量

- **確認方法**: CloudWatch Logs Insights
- **クエリ**:
  ```
  fields @timestamp, metadata.tokensUsed
  | filter action = "subgoal_generation_success"
  | stats sum(metadata.tokensUsed) as total_tokens by bin(1h)
  ```
- **用途**: コスト管理、使用量予測

### 4. データベースメトリクス

#### 接続エラー

- **確認方法**: CloudWatch Logs
- **検索文字列**: `"DatabaseError"`
- **閾値**: 5件/時間以上
- **対応**: データベース接続設定の見直し

#### トランザクションエラー

- **確認方法**: CloudWatch Logs
- **検索文字列**: `"transaction failed"`
- **閾値**: 3件/時間以上
- **対応**: データベースの状態確認

---

## アラート対応手順

### エラー率上昇アラート

**アラート条件**: Lambda関数のエラー率が5%を超える

**対応手順**:

1. **エラーの種類を特定**

   ```bash
   # CloudWatch Logs Insightsで実行
   fields @timestamp, error.code, error.message
   | filter level = "ERROR"
   | stats count() by error.code
   | sort count desc
   ```

2. **エラーコード別の対応**
   - `VALIDATION_ERROR`: クライアント側の問題。パターンを分析し、ドキュメント改善を検討
   - `QUALITY_ERROR`: AI生成品質の問題。プロンプトの見直しを検討
   - `DATABASE_ERROR`: データベース接続を確認。必要に応じてRDS Proxyの導入を検討
   - `AI_SERVICE_ERROR`: Bedrockサービスの状態を確認。AWS Service Healthをチェック

3. **影響範囲の確認**
   - 特定のユーザーのみか、全体的な問題か
   - 特定の時間帯に集中しているか

4. **一時的な対応**
   - 必要に応じてレート制限を調整
   - 問題が解決するまで、ユーザーに通知

5. **恒久的な対応**
   - 根本原因を特定し、修正をデプロイ
   - 再発防止策を実施

### 処理時間超過アラート

**アラート条件**: Lambda関数の処理時間（p95）が45秒を超える

**対応手順**:

1. **処理時間の内訳を確認**

   ```bash
   # CloudWatch Logs Insightsで実行
   fields @timestamp, duration, metadata.tokensUsed
   | filter action = "subgoal_generation_success"
   | stats avg(duration) as avg_duration,
           max(duration) as max_duration,
           avg(metadata.tokensUsed) as avg_tokens
           by bin(5m)
   ```

2. **ボトルネックの特定**
   - Bedrock呼び出し時間
   - データベース処理時間
   - その他の処理時間

3. **最適化の実施**
   - プロンプトの最適化（トークン数削減）
   - データベースクエリの最適化
   - 並列処理の導入検討

4. **Lambda設定の見直し**
   - メモリサイズの増加（現在1024MB）
   - タイムアウトの調整（現在60秒）

### スロットリング発生アラート

**アラート条件**: Lambda関数のスロットリングが発生

**対応手順**:

1. **同時実行数の確認**

   ```bash
   # CloudWatch Metricsで確認
   # Metric: ConcurrentExecutions
   ```

2. **トラフィックパターンの分析**
   - ピーク時間帯の特定
   - 急激なトラフィック増加の原因調査

3. **対応策の実施**
   - 予約済み同時実行数の増加（現在10）
   - アカウントレベルの同時実行数制限の確認
   - 必要に応じてAWSサポートに連絡

### データベース接続エラーアラート

**アラート条件**: データベース接続エラーが5件/時間以上発生

**対応手順**:

1. **データベースの状態確認**
   - Aurora Serverlessの状態確認
   - CPU使用率、メモリ使用率の確認
   - 接続数の確認

2. **接続設定の確認**
   - Prisma接続プール設定の確認
   - タイムアウト設定の確認
   - Secrets Managerの認証情報確認

3. **対応策の実施**
   - 接続プール設定の最適化
   - Aurora Serverlessのスケーリング設定見直し
   - 必要に応じてRDS Proxyの導入検討

---

## パフォーマンス監視

### 処理時間の分析

#### 日次レポート

```bash
# CloudWatch Logs Insightsで実行
fields @timestamp, duration, metadata.tokensUsed, metadata.estimatedCost
| filter action = "subgoal_generation_success"
| stats
    count() as total_requests,
    avg(duration) as avg_duration,
    percentile(duration, 50) as p50_duration,
    percentile(duration, 95) as p95_duration,
    percentile(duration, 99) as p99_duration,
    avg(metadata.tokensUsed) as avg_tokens,
    sum(metadata.estimatedCost) as total_cost
    by bin(1d)
```

#### 時間帯別分析

```bash
# CloudWatch Logs Insightsで実行
fields @timestamp, duration
| filter action = "subgoal_generation_success"
| stats
    count() as requests,
    avg(duration) as avg_duration,
    percentile(duration, 95) as p95_duration
    by bin(1h)
```

### トークン使用量の監視

#### 日次トークン使用量

```bash
# CloudWatch Logs Insightsで実行
fields @timestamp, metadata.tokensUsed, metadata.estimatedCost
| filter action = "subgoal_generation_success"
| stats
    sum(metadata.tokensUsed) as total_tokens,
    sum(metadata.estimatedCost) as total_cost
    by bin(1d)
```

#### ユーザー別トークン使用量（上位10ユーザー）

```bash
# CloudWatch Logs Insightsで実行
fields @timestamp, userId, metadata.tokensUsed
| filter action = "subgoal_generation_success"
| stats sum(metadata.tokensUsed) as total_tokens by userId
| sort total_tokens desc
| limit 10
```

---

## ログ管理

### ログの種類

#### 1. 情報ログ（INFO）

- リクエスト開始
- リクエスト成功
- 認可チェック成功

#### 2. エラーログ（ERROR）

- バリデーションエラー
- AI生成エラー
- データベースエラー
- 予期しないエラー

### ログの検索

#### 特定ユーザーのリクエスト履歴

```bash
fields @timestamp, action, duration, error.code
| filter userId = "USER_ID_HERE"
| sort @timestamp desc
```

#### エラーの集計

```bash
fields @timestamp, error.code, error.message
| filter level = "ERROR"
| stats count() by error.code, error.message
| sort count desc
```

#### 処理時間が長いリクエスト

```bash
fields @timestamp, requestId, userId, duration
| filter action = "subgoal_generation_success" and duration > 40000
| sort duration desc
```

### ログの保持期間

- **CloudWatch Logs**: 30日間
- **長期保存**: S3にエクスポート（90日間）

---

## セキュリティ監視

### 認証エラーの監視

```bash
# CloudWatch Logs Insightsで実行
fields @timestamp, error.code, error.message
| filter error.code = "AUTHENTICATION_ERROR"
| stats count() by bin(1h)
```

**閾値**: 10件/時間以上で調査

### 認可エラーの監視

```bash
# CloudWatch Logs Insightsで実行
fields @timestamp, userId, error.code
| filter error.code = "FORBIDDEN_ERROR"
| stats count() by userId
| sort count desc
```

**閾値**: 同一ユーザーから5件以上で調査

### プロンプトインジェクション検出

```bash
# CloudWatch Logs Insightsで実行
fields @timestamp, userId, error.message
| filter error.message like /不正な入力/
| stats count() by userId
```

**対応**: 該当ユーザーのアクティビティを調査

---

## 定期メンテナンス

### 日次タスク

- [ ] エラーログの確認
- [ ] パフォーマンスメトリクスの確認
- [ ] トークン使用量の確認
- [ ] コストの確認

### 週次タスク

- [ ] 週次レポートの作成
- [ ] アラート履歴の確認
- [ ] パフォーマンストレンドの分析
- [ ] セキュリティログの確認

### 月次タスク

- [ ] 月次レポートの作成
- [ ] コスト分析と予算確認
- [ ] パフォーマンス最適化の検討
- [ ] セキュリティ監査
- [ ] ドキュメントの更新

---

## スケーリング

### Lambda関数のスケーリング

#### 同時実行数の調整

現在の設定: 予約済み同時実行数 = 10

**増加の判断基準**:

- スロットリングが頻繁に発生
- ピーク時のトラフィックが増加
- ユーザー数の増加

**調整手順**:

1. CloudWatch Metricsで `ConcurrentExecutions` を確認
2. ピーク時の同時実行数を特定
3. 余裕を持った値に設定（ピーク時の1.5倍程度）
4. CDKコードを更新してデプロイ

```typescript
// CDKでの設定例
const subGoalGenerationFunction = new lambda.Function(
  this,
  'SubGoalGenerationFunction',
  {
    // ...
    reservedConcurrentExecutions: 20, // 10 → 20に増加
  }
);
```

#### メモリサイズの調整

現在の設定: 1024MB

**増加の判断基準**:

- 処理時間が長い（p95 > 45秒）
- メモリ使用率が高い（80%以上）

**調整手順**:

1. Lambda Insightsでメモリ使用率を確認
2. 適切なメモリサイズを決定
3. CDKコードを更新してデプロイ

```typescript
// CDKでの設定例
const subGoalGenerationFunction = new lambda.Function(
  this,
  'SubGoalGenerationFunction',
  {
    // ...
    memorySize: 2048, // 1024MB → 2048MBに増加
  }
);
```

### データベースのスケーリング

#### Aurora Serverless V2のスケーリング

現在の設定: 最小ACU = 0.5、最大ACU = 2

**増加の判断基準**:

- データベース接続エラーが頻発
- CPU使用率が高い（80%以上）
- 接続数が上限に近い

**調整手順**:

1. CloudWatch Metricsでデータベースメトリクスを確認
2. 適切なACU範囲を決定
3. CDKコードを更新してデプロイ

```typescript
// CDKでの設定例
const cluster = new rds.DatabaseCluster(this, 'Database', {
  // ...
  serverlessV2MinCapacity: 1, // 0.5 → 1に増加
  serverlessV2MaxCapacity: 4, // 2 → 4に増加
});
```

---

## 緊急時対応

### サービス停止手順

1. **API Gatewayの無効化**
   - AWS Consoleから該当ステージを無効化
   - または、Lambda関数の同時実行数を0に設定

2. **ユーザーへの通知**
   - ステータスページの更新
   - メール通知（必要に応じて）

3. **問題の調査**
   - CloudWatch Logsの確認
   - エラーパターンの分析
   - 根本原因の特定

4. **修正とデプロイ**
   - 修正をテスト環境で検証
   - 本番環境にデプロイ

5. **サービス復旧**
   - API Gatewayの有効化
   - 動作確認
   - ユーザーへの通知

### ロールバック手順

1. **前バージョンの特定**

   ```bash
   git log --oneline -10
   ```

2. **ロールバック実行**

   ```bash
   git revert <commit-hash>
   git push origin main
   ```

3. **自動デプロイの確認**
   - GitHub Actionsの実行確認
   - デプロイ完了の確認

4. **動作確認**
   - ヘルスチェックエンドポイントの確認
   - 主要機能のテスト

---

## 関連ドキュメント

- [API仕様書](./subgoal-generation-api-specification.md)
- [エラーコード一覧](./subgoal-generation-error-codes.md)
- [トラブルシューティングガイド](./subgoal-generation-troubleshooting-guide.md)

---

## 連絡先

### 緊急時連絡先

- **開発チーム**: [開発チームのSlackチャンネル]
- **インフラチーム**: [インフラチームのSlackチャンネル]
- **オンコール**: [オンコール担当者の連絡先]

### エスカレーション

1. **レベル1**: 開発チーム（通常の問題）
2. **レベル2**: インフラチーム（インフラ関連の問題）
3. **レベル3**: AWSサポート（AWS側の問題）
