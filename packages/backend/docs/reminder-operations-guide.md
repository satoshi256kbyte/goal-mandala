# リマインド機能 運用ガイド

## 概要

このドキュメントは、リマインド機能の運用に関する情報をまとめたものです。システムの監視、トラブルシューティング、メンテナンス手順について説明します。

## システム構成

### アーキテクチャ

```
EventBridge Rule (平日10:00 AM JST)
  ↓
Reminder Lambda Function
  ↓
├─ Aurora Database (ユーザー・タスク取得)
├─ Task Selector Service (タスク選択)
├─ Email Service (メール生成)
└─ Amazon SES (メール送信)
  ↓
CloudWatch Logs & Metrics
  ↓
SNS Topic (アラート通知)
```

### 主要コンポーネント

1. **EventBridge Rule**: 平日10:00 AM JST（01:00 UTC）にLambda関数をトリガー
2. **Reminder Lambda Function**: リマインド処理のオーケストレーション
3. **Task Selector Service**: ユーザーの気分選択に基づいてタスクを選択
4. **Email Service**: メールテンプレートの生成とSES統合
5. **Deep Link Service**: メール内リンクのトークン生成・検証
6. **Amazon SES**: メール配信
7. **CloudWatch**: ログ記録とメトリクス監視
8. **SNS**: アラート通知

## 監視

### CloudWatch Metrics

#### Lambda関数メトリクス

| メトリクス名 | 説明 | 正常範囲 | アラート閾値 |
|------------|------|---------|------------|
| `Invocations` | Lambda実行回数 | 1回/日（平日） | - |
| `Errors` | エラー発生回数 | 0回 | 5回以上 |
| `Duration` | 実行時間 | < 3分 | 4分以上 |
| `Throttles` | スロットリング回数 | 0回 | 1回以上 |

#### カスタムメトリクス

| メトリクス名 | 説明 | 正常範囲 | アラート閾値 |
|------------|------|---------|------------|
| `EmailsSent` | 送信成功メール数 | - | - |
| `EmailsFailed` | 送信失敗メール数 | 0回 | - |
| `EmailFailureRate` | メール失敗率 | < 2% | 5%以上 |
| `ProcessingTime` | 処理時間 | < 5分 | - |
| `UsersProcessed` | 処理ユーザー数 | - | - |

### CloudWatch Logs

#### ロググループ

- ロググループ名: `/aws/lambda/goal-mandala-{env}-reminder`
- 保持期間: 30日
- ログレベル: INFO, WARN, ERROR

#### ログ形式

```json
{
  "timestamp": "2025-12-10T01:00:00.000Z",
  "level": "INFO",
  "message": "Reminder processing started",
  "metadata": {
    "totalUsers": 100,
    "environment": "production"
  }
}
```

### CloudWatch Alarms

#### 設定済みアラーム

1. **ReminderErrorAlarm**
   - 条件: エラー数が5回以上（5分間）
   - アクション: SNS通知

2. **ReminderDurationAlarm**
   - 条件: 実行時間が4分以上（5分間平均）
   - アクション: SNS通知

3. **EmailFailureRateAlarm**
   - 条件: メール失敗率が5%以上（5分間、2回連続）
   - アクション: SNS通知

## EventBridge設定

### スケジュール設定

- **Cron式**: `cron(0 1 ? * MON-FRI *)`
- **説明**: 平日10:00 AM JST（01:00 UTC）に実行
- **タイムゾーン**: UTC
- **リトライ**: 最大2回、Exponential backoff

### スケジュールの有効化/無効化

```bash
# 無効化
aws events disable-rule --name goal-mandala-prod-reminder-schedule

# 有効化
aws events enable-rule --name goal-mandala-prod-reminder-schedule

# 状態確認
aws events describe-rule --name goal-mandala-prod-reminder-schedule
```

## Amazon SES設定

### 送信元メールアドレス

- **From**: `noreply@goal-mandala.com`
- **Reply-To**: `support@goal-mandala.com`

### 認証設定

1. **SPF**: `v=spf1 include:amazonses.com ~all`
2. **DKIM**: AWS SESで自動設定
3. **DMARC**: `v=DMARC1; p=quarantine; rua=mailto:dmarc@goal-mandala.com`

### 送信制限

- **送信レート**: 14メール/秒（本番環境）
- **日次送信上限**: 50,000メール/日
- **バウンス率**: < 5%
- **苦情率**: < 0.1%

### バウンス・苦情処理

- **バウンス**: 自動的にユーザーのリマインド設定を無効化
- **苦情**: 自動的にユーザーのリマインド設定を無効化し、運用チームに通知

## 日常運用

### 毎日の確認事項

1. **メール配信状況の確認**
   ```bash
   # 当日のメール送信数を確認
   aws cloudwatch get-metric-statistics \
     --namespace GoalMandala/Reminder \
     --metric-name EmailsSent \
     --start-time $(date -u -d '1 day ago' +%Y-%m-%dT%H:%M:%S) \
     --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
     --period 3600 \
     --statistics Sum
   ```

2. **エラー発生状況の確認**
   ```bash
   # 当日のエラー数を確認
   aws logs filter-log-events \
     --log-group-name /aws/lambda/goal-mandala-prod-reminder \
     --filter-pattern '{ $.level = "ERROR" }' \
     --start-time $(date -u -d '1 day ago' +%s)000
   ```

3. **CloudWatchアラームの確認**
   ```bash
   # アラーム状態を確認
   aws cloudwatch describe-alarms \
     --alarm-name-prefix goal-mandala-prod-reminder
   ```

### 週次の確認事項

1. **メール配信率の分析**
   - 送信成功率: > 95%
   - バウンス率: < 5%
   - 苦情率: < 0.1%

2. **Lambda実行時間の分析**
   - 平均実行時間: < 3分
   - 最大実行時間: < 5分

3. **ユーザーフィードバックの確認**
   - 配信停止率: < 5%
   - 再有効化率: > 10%

### 月次の確認事項

1. **コスト分析**
   - Lambda実行コスト
   - SES送信コスト
   - CloudWatchログコスト

2. **パフォーマンス最適化**
   - 処理時間の改善
   - メモリ使用量の最適化
   - バッチサイズの調整

## トラブルシューティング

### よくある問題と解決方法

#### 1. メール送信失敗

**症状**: メール送信失敗率が高い

**原因**:
- SES送信制限に達している
- メールアドレスが無効
- SESサービスの一時的な問題

**解決方法**:
```bash
# SES送信統計を確認
aws ses get-send-statistics

# SES送信制限を確認
aws ses get-send-quota

# 送信制限の引き上げをリクエスト（必要に応じて）
# AWS Supportケースを作成
```

#### 2. Lambda実行時間超過

**症状**: Lambda実行時間が5分を超えてタイムアウト

**原因**:
- 処理ユーザー数が多すぎる
- データベースクエリが遅い
- SES送信が遅い

**解決方法**:
```bash
# バッチサイズを調整（環境変数）
aws lambda update-function-configuration \
  --function-name goal-mandala-prod-reminder \
  --environment Variables={BATCH_SIZE=50}

# タイムアウトを延長（最大15分）
aws lambda update-function-configuration \
  --function-name goal-mandala-prod-reminder \
  --timeout 600
```

#### 3. EventBridgeトリガー失敗

**症状**: EventBridgeルールがLambda関数をトリガーしない

**原因**:
- ルールが無効化されている
- Lambda関数の権限が不足
- Cron式が間違っている

**解決方法**:
```bash
# ルールの状態を確認
aws events describe-rule --name goal-mandala-prod-reminder-schedule

# ルールを有効化
aws events enable-rule --name goal-mandala-prod-reminder-schedule

# ターゲットを確認
aws events list-targets-by-rule --rule goal-mandala-prod-reminder-schedule
```

#### 4. Deep Linkトークンエラー

**症状**: メール内のDeep Linkが動作しない

**原因**:
- トークンの有効期限切れ（24時間）
- JWT秘密鍵が変更された
- トークン生成ロジックのバグ

**解決方法**:
```bash
# JWT秘密鍵を確認
aws secretsmanager get-secret-value \
  --secret-id goal-mandala-prod-jwt-secret

# Lambda関数のログを確認
aws logs tail /aws/lambda/goal-mandala-prod-reminder --follow
```

### エスカレーション手順

1. **レベル1（軽微）**: 運用チームで対応
   - メール送信失敗（< 5%）
   - 一時的なエラー

2. **レベル2（中程度）**: 開発チームに連絡
   - メール送信失敗（5-10%）
   - Lambda実行時間超過
   - EventBridgeトリガー失敗

3. **レベル3（重大）**: 緊急対応チームを招集
   - メール送信失敗（> 10%）
   - システム全体の停止
   - セキュリティインシデント

## メンテナンス

### 定期メンテナンス

#### 月次メンテナンス

1. **Lambda関数の更新**
   - 依存パッケージの更新
   - セキュリティパッチの適用

2. **SES設定の確認**
   - SPF/DKIM/DMARC設定の確認
   - バウンス・苦情率の確認

3. **CloudWatchログの確認**
   - ログ保持期間の確認
   - ログサイズの確認

#### 四半期メンテナンス

1. **パフォーマンステスト**
   - 負荷テストの実施
   - ボトルネックの特定

2. **セキュリティ監査**
   - IAMロール・ポリシーの確認
   - JWT秘密鍵のローテーション

3. **コスト最適化**
   - Lambda実行コストの分析
   - SES送信コストの分析

### 緊急メンテナンス

#### システム停止手順

1. **EventBridgeルールの無効化**
   ```bash
   aws events disable-rule --name goal-mandala-prod-reminder-schedule
   ```

2. **進行中のLambda実行の確認**
   ```bash
   aws lambda list-functions --query 'Functions[?FunctionName==`goal-mandala-prod-reminder`]'
   ```

3. **ユーザーへの通知**
   - ステータスページの更新
   - メール通知（必要に応じて）

#### システム復旧手順

1. **問題の修正**
   - Lambda関数の更新
   - 設定の修正

2. **動作確認**
   - 手動トリガーでテスト
   - メール送信の確認

3. **EventBridgeルールの有効化**
   ```bash
   aws events enable-rule --name goal-mandala-prod-reminder-schedule
   ```

4. **監視の強化**
   - CloudWatchアラームの確認
   - ログの監視

## セキュリティ

### アクセス制御

- **Lambda実行ロール**: 最小権限の原則
- **Secrets Manager**: JWT秘密鍵の管理
- **IAMポリシー**: 定期的なレビュー

### データ保護

- **PII保護**: メールアドレスや個人情報のログ記録を避ける
- **暗号化**: 転送中・保存時の暗号化
- **データ保持**: リマインドログは90日後に削除

### 監査

- **CloudTrail**: API呼び出しの記録
- **CloudWatch Logs**: アプリケーションログの記録
- **定期レビュー**: 四半期ごとのセキュリティ監査

## 連絡先

### 運用チーム

- **メール**: ops@goal-mandala.com
- **Slack**: #goal-mandala-ops
- **オンコール**: PagerDuty

### 開発チーム

- **メール**: dev@goal-mandala.com
- **Slack**: #goal-mandala-dev

### エスカレーション

- **緊急時**: emergency@goal-mandala.com
- **セキュリティ**: security@goal-mandala.com

## 参考資料

- [リマインド機能 API仕様書](./reminder-api-specification.md)
- [リマインド機能 トラブルシューティングガイド](./reminder-troubleshooting-guide.md)
- [AWS Lambda ドキュメント](https://docs.aws.amazon.com/lambda/)
- [Amazon SES ドキュメント](https://docs.aws.amazon.com/ses/)
- [Amazon EventBridge ドキュメント](https://docs.aws.amazon.com/eventbridge/)

## 変更履歴

| バージョン | 日付 | 変更内容 |
|-----------|------|----------|
| 1.0.0 | 2025-12-10 | 初版作成 |
