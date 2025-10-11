# 非同期処理運用ガイド

## 概要

このドキュメントは、AI生成非同期処理システムの運用方法、監視方法、アラート対応手順を定義します。システム管理者と運用担当者向けのガイドです。

## 目次

1. [システム概要](#システム概要)
2. [監視方法](#監視方法)
3. [アラート対応](#アラート対応)
4. [日常運用](#日常運用)
5. [パフォーマンス管理](#パフォーマンス管理)
6. [データ管理](#データ管理)
7. [セキュリティ管理](#セキュリティ管理)

---

## システム概要

### アーキテクチャ

```text
Frontend → CloudFront → API Gateway → Lambda Handler → Step Functions → AI Worker → Aurora
                                                          ↓
                                                    ProcessingState
```

### 主要コンポーネント

| コンポーネント         | 役割             | 重要度 |
| ---------------------- | ---------------- | ------ |
| AsyncProcessingHandler | 非同期処理開始   | 高     |
| StatusCheckHandler     | 処理状態取得     | 高     |
| RetryHandler           | 処理再試行       | 中     |
| CancelHandler          | 処理キャンセル   | 中     |
| AIGenerationWorker     | AI生成実行       | 高     |
| ProcessingStateService | 状態管理         | 高     |
| Step Functions         | ワークフロー制御 | 高     |

### 処理フロー

1. ユーザーがAPI経由で非同期処理を開始
2. AsyncProcessingHandlerが処理IDを生成し、Step Functionsを起動
3. Step FunctionsがAIGenerationWorkerを実行
4. AIGenerationWorkerがAI生成を実行し、進捗を更新
5. 完了後、結果をデータベースに保存
6. ユーザーがStatusCheckHandlerで状態を確認

---

## 監視方法

### CloudWatch Logs

#### ログの確認方法

1. AWS Management Consoleにログイン
2. CloudWatch → ログ → ロググループを選択
3. 以下のロググループを確認：
   - `/aws/lambda/async-processing-handler`
   - `/aws/lambda/status-check-handler`
   - `/aws/lambda/retry-handler`
   - `/aws/lambda/cancel-handler`
   - `/aws/lambda/ai-generation-worker`

#### ログフォーマット

構造化ログ（JSON形式）で出力されます：

```json
{
  "timestamp": "2025-10-11T10:00:00.000Z",
  "level": "INFO",
  "processId": "660e8400-e29b-41d4-a716-446655440000",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "type": "SUBGOAL_GENERATION",
  "status": "PROCESSING",
  "progress": 50,
  "message": "AI生成処理が50%完了しました",
  "duration": 120000
}
```

#### ログレベル

- **ERROR**: エラー発生時（即座に対応が必要）
- **WARN**: 警告（注意が必要）
- **INFO**: 通常の処理情報
- **DEBUG**: デバッグ情報（開発環境のみ）

#### ログ検索クエリ例

##### エラーログの検索

```text
fields @timestamp, processId, userId, type, message
| filter level = "ERROR"
| sort @timestamp desc
| limit 100
```

##### 特定処理の追跡

```text
fields @timestamp, status, progress, message
| filter processId = "660e8400-e29b-41d4-a716-446655440000"
| sort @timestamp asc
```

##### 処理時間の分析

```text
fields @timestamp, type, duration
| filter level = "INFO" and message like /完了/
| stats avg(duration), max(duration), min(duration) by type
```

### CloudWatch Metrics

#### 主要メトリクス

| メトリクス名             | 説明             | 単位         | 閾値           |
| ------------------------ | ---------------- | ------------ | -------------- |
| AsyncProcessingStarted   | 非同期処理開始数 | Count        | -              |
| AsyncProcessingCompleted | 完了数           | Count        | -              |
| AsyncProcessingFailed    | 失敗数           | Count        | > 5/5分        |
| AsyncProcessingTimeout   | タイムアウト数   | Count        | > 10/5分       |
| ProcessingDuration       | 処理時間         | Milliseconds | > 300000 (5分) |
| QueueDepth               | 待機中の処理数   | Count        | > 100          |
| ErrorRate                | エラー率         | Percent      | > 5%           |

#### メトリクスの確認方法

1. CloudWatch → メトリクス → すべてのメトリクス
2. カスタム名前空間「AsyncProcessing」を選択
3. 確認したいメトリクスを選択
4. 期間を設定（推奨: 1時間、1日、1週間）

#### ダッシュボード

CloudWatchダッシュボード「AsyncProcessing-Dashboard」で以下を確認：

- 処理開始数の推移
- 完了率の推移
- エラー率の推移
- 平均処理時間の推移
- 待機中の処理数

### Step Functions

#### 実行状態の確認

1. AWS Management Console → Step Functions
2. ステートマシン「AIGenerationStateMachine」を選択
3. 実行履歴を確認

#### 確認項目

- **実行中**: 現在実行中の処理数
- **成功**: 成功した処理数
- **失敗**: 失敗した処理数
- **タイムアウト**: タイムアウトした処理数
- **実行時間**: 平均実行時間

---

## アラート対応

### アラート一覧

#### 1. エラー率アラート

**条件**: エラー率 > 5% (5分間)

**重要度**: 高

**対応手順**:

1. CloudWatch Logsでエラーログを確認
2. エラーの種類を特定：
   - AI_ERROR: Bedrock APIの問題
   - DATABASE_ERROR: データベース接続の問題
   - TIMEOUT_ERROR: 処理時間超過
3. エラー種別に応じた対応を実施（詳細は[トラブルシューティングガイド](./async-processing-troubleshooting-guide.md)参照）
4. 対応後、エラー率が正常値に戻ることを確認

#### 2. タイムアウト率アラート

**条件**: タイムアウト率 > 10% (5分間)

**重要度**: 高

**対応手順**:

1. Step Functionsの実行履歴を確認
2. タイムアウトした処理の詳細を確認
3. 以下を確認：
   - Bedrock APIのレスポンス時間
   - データベースクエリの実行時間
   - Lambda関数のメモリ使用量
4. 必要に応じて以下を実施：
   - Lambda関数のメモリサイズを増加
   - タイムアウト時間を調整
   - データベースクエリを最適化

#### 3. 処理時間アラート

**条件**: 平均処理時間 > 5分 (5分間)

**重要度**: 中

**対応手順**:

1. CloudWatch Metricsで処理時間の推移を確認
2. 処理タイプ別の処理時間を分析
3. 以下を確認：
   - Bedrock APIのレスポンス時間
   - データベース接続プールの状態
   - Lambda関数のコールドスタート
4. パフォーマンス最適化を検討

#### 4. 待機中処理数アラート

**条件**: 待機中の処理数 > 100

**重要度**: 中

**対応手順**:

1. データベースで待機中の処理を確認
2. Lambda同時実行数の制限を確認
3. 必要に応じて以下を実施：
   - Lambda同時実行数を増加
   - 処理の優先度付けを検討
   - ユーザーに処理遅延を通知

### アラート通知先

- **Slack**: #async-processing-alerts チャンネル
- **メール**: ops-team@example.com
- **PagerDuty**: 重大アラートのみ

### エスカレーション

| 時間       | 対応者           | 連絡先           |
| ---------- | ---------------- | ---------------- |
| 0-30分     | オンコール担当者 | Slack, PagerDuty |
| 30分-1時間 | チームリーダー   | 電話             |
| 1時間以上  | マネージャー     | 電話             |

---

## 日常運用

### 日次チェック

#### 朝（9:00）

- [ ] CloudWatchダッシュボードで前日の処理状況を確認
- [ ] エラーログを確認し、異常がないか確認
- [ ] 待機中の処理数を確認
- [ ] Step Functionsの実行状態を確認

#### 夕方（17:00）

- [ ] 当日の処理状況を確認
- [ ] エラー率、タイムアウト率を確認
- [ ] 翌日の予定処理数を確認

### 週次チェック

#### 月曜日

- [ ] 前週の処理統計を確認
- [ ] エラー傾向を分析
- [ ] パフォーマンス指標を確認
- [ ] 容量計画を見直し

### 月次チェック

#### 月初

- [ ] 前月の処理統計レポートを作成
- [ ] コスト分析を実施
- [ ] パフォーマンス改善計画を策定
- [ ] セキュリティ監査を実施

### 定期メンテナンス

#### 週次（日曜日 2:00-4:00）

- [ ] 古い処理レコードのクリーンアップ（90日以上前）
- [ ] データベースインデックスの最適化
- [ ] ログの圧縮とアーカイブ

#### 月次（第1日曜日 2:00-6:00）

- [ ] データベースバックアップの検証
- [ ] 災害復旧手順のテスト
- [ ] セキュリティパッチの適用

---

## パフォーマンス管理

### パフォーマンス指標

#### 目標値

| 指標                       | 目標値         | 測定方法           |
| -------------------------- | -------------- | ------------------ |
| API応答時間（処理開始）    | 95%ile < 1秒   | CloudWatch Metrics |
| API応答時間（状態取得）    | 95%ile < 500ms | CloudWatch Metrics |
| 処理完了時間（サブ目標）   | 平均 3-5分     | CloudWatch Logs    |
| 処理完了時間（アクション） | 平均 5-10分    | CloudWatch Logs    |
| 処理完了時間（タスク）     | 平均 10-15分   | CloudWatch Logs    |
| エラー率                   | < 1%           | CloudWatch Metrics |
| タイムアウト率             | < 5%           | CloudWatch Metrics |

#### パフォーマンス改善

##### Lambda関数の最適化

1. **メモリサイズの調整**
   - CloudWatch Logsでメモリ使用量を確認
   - 使用率が80%を超える場合はメモリを増加
   - 推奨: AsyncProcessingHandler 512MB、AIGenerationWorker 1024MB

2. **コールドスタート対策**
   - Provisioned Concurrencyの検討
   - 初期化処理の最適化
   - 依存関係の削減

3. **タイムアウト設定**
   - 処理内容に応じた適切なタイムアウト設定
   - 推奨: AsyncProcessingHandler 30秒、AIGenerationWorker 300秒

##### データベースの最適化

1. **接続プールの設定**
   - Prismaの接続プール設定を確認
   - 推奨: min 2, max 10

2. **クエリの最適化**
   - スロークエリログを確認
   - インデックスの追加を検討
   - N+1問題の解消

3. **RDS Proxyの検討**
   - 接続数が多い場合はRDS Proxyの導入を検討

### キャパシティプランニング

#### Lambda同時実行数

| 環境                   | 現在 | 目標 | 上限 |
| ---------------------- | ---- | ---- | ---- |
| AsyncProcessingHandler | 50   | 100  | 500  |
| AIGenerationWorker     | 10   | 20   | 100  |

#### データベース容量

- **現在**: 10GB
- **月間増加**: 約1GB
- **容量計画**: 6ヶ月ごとに見直し

#### コスト管理

- **月次予算**: $500
- **主要コスト**:
  - Lambda実行: 40%
  - Bedrock API: 30%
  - Aurora: 20%
  - その他: 10%

---

## データ管理

### データ保持ポリシー

| データ種別         | 保持期間 | 削除方法 |
| ------------------ | -------- | -------- |
| 処理状態レコード   | 90日     | 自動削除 |
| CloudWatch Logs    | 30日     | 自動削除 |
| CloudWatch Metrics | 15ヶ月   | 自動削除 |
| Step Functions履歴 | 90日     | 自動削除 |

### バックアップ

#### データベースバックアップ

- **頻度**: 日次（自動）
- **保持期間**: 7日
- **バックアップ時刻**: 3:00 JST
- **検証**: 月次

#### 災害復旧

- **RTO（目標復旧時間）**: 4時間
- **RPO（目標復旧時点）**: 24時間
- **復旧手順**: [災害復旧手順書](./disaster-recovery.md)参照

### データクリーンアップ

#### 自動クリーンアップ

週次で以下のデータを自動削除：

```sql
-- 90日以上前の完了・失敗・キャンセル済み処理
DELETE FROM processing_state
WHERE status IN ('COMPLETED', 'FAILED', 'CANCELLED', 'TIMEOUT')
  AND completed_at < NOW() - INTERVAL '90 days';
```

#### 手動クリーンアップ

必要に応じて以下を実施：

1. 古いログの圧縮とアーカイブ
2. 不要なメトリクスの削除
3. テストデータの削除

---

## セキュリティ管理

### アクセス制御

#### IAMロール

| ロール                    | 権限                           | 対象           |
| ------------------------- | ------------------------------ | -------------- |
| AsyncProcessingLambdaRole | Lambda実行、Step Functions起動 | Lambda関数     |
| StepFunctionsRole         | Lambda呼び出し                 | Step Functions |
| MonitoringRole            | CloudWatch読み取り             | 運用担当者     |

#### API認証

- JWT認証必須
- トークン有効期限: 24時間
- レート制限: 20リクエスト/分/ユーザー

### セキュリティ監査

#### 日次

- [ ] 認証失敗ログを確認
- [ ] 不正アクセス試行を確認
- [ ] レート制限超過を確認

#### 週次

- [ ] IAMロールの権限を確認
- [ ] セキュリティグループの設定を確認
- [ ] 機密情報の漏洩がないか確認

#### 月次

- [ ] 脆弱性スキャンを実施
- [ ] セキュリティパッチの適用状況を確認
- [ ] アクセスログの監査

### インシデント対応

#### セキュリティインシデント発生時

1. **検知・報告**（0-15分）
   - インシデントを検知
   - セキュリティチームに報告
   - 影響範囲を特定

2. **初期対応**（15-60分）
   - 該当システムの隔離
   - 不正アクセスの遮断
   - ログの保全

3. **調査・分析**（1-4時間）
   - ログ分析
   - 原因究明
   - 被害状況の確認

4. **復旧・改善**（4時間以降）
   - システム復旧
   - セキュリティ対策の強化
   - 再発防止策の実施

#### 連絡先

- **セキュリティチーム**: security@example.com
- **緊急連絡先**: +81-XX-XXXX-XXXX
- **Slack**: #security-incidents

---

## 付録

### 便利なコマンド

#### CloudWatch Logsの確認

```bash
# 最新のエラーログを取得
aws logs filter-log-events \
  --log-group-name /aws/lambda/async-processing-handler \
  --filter-pattern "ERROR" \
  --start-time $(date -u -d '1 hour ago' +%s)000 \
  --limit 10

# 特定処理のログを取得
aws logs filter-log-events \
  --log-group-name /aws/lambda/ai-generation-worker \
  --filter-pattern "processId=660e8400-e29b-41d4-a716-446655440000"
```

#### Step Functionsの確認

```bash
# 実行中の処理を確認
aws stepfunctions list-executions \
  --state-machine-arn arn:aws:states:ap-northeast-1:123456789012:stateMachine:AIGenerationStateMachine \
  --status-filter RUNNING

# 失敗した処理を確認
aws stepfunctions list-executions \
  --state-machine-arn arn:aws:states:ap-northeast-1:123456789012:stateMachine:AIGenerationStateMachine \
  --status-filter FAILED \
  --max-results 10
```

#### データベースクエリ

```sql
-- 処理状態の統計
SELECT
  status,
  type,
  COUNT(*) as count,
  AVG(progress) as avg_progress
FROM processing_state
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY status, type;

-- 処理時間の分析
SELECT
  type,
  AVG(EXTRACT(EPOCH FROM (completed_at - created_at))) as avg_duration_seconds,
  MAX(EXTRACT(EPOCH FROM (completed_at - created_at))) as max_duration_seconds
FROM processing_state
WHERE status = 'COMPLETED'
  AND completed_at >= NOW() - INTERVAL '7 days'
GROUP BY type;
```

### チェックリスト

#### 新規デプロイ時

- [ ] Lambda関数のデプロイ確認
- [ ] Step Functionsの動作確認
- [ ] データベースマイグレーション実行
- [ ] CloudWatchアラームの設定確認
- [ ] 統合テストの実行
- [ ] ロールバック手順の確認

#### 障害発生時

- [ ] 影響範囲の特定
- [ ] ユーザーへの通知
- [ ] 原因の調査
- [ ] 応急処置の実施
- [ ] 恒久対策の検討
- [ ] 事後報告書の作成

### 参考資料

- [API仕様書](./async-processing-api-specification.md)
- [トラブルシューティングガイド](./async-processing-troubleshooting-guide.md)
- [エラーコード一覧](./async-processing-error-codes.md)
- [AWS Lambda ベストプラクティス](https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html)
- [AWS Step Functions ベストプラクティス](https://docs.aws.amazon.com/step-functions/latest/dg/bp-express.html)
