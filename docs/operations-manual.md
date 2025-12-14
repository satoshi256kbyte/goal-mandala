# 運用マニュアル

## 概要

本ドキュメントは、目標管理曼荼羅システムの本番環境の運用方法を説明します。

## 目次

1. [日常的な監視](#日常的な監視)
2. [アラート対応](#アラート対応)
3. [バックアップ・リストア](#バックアップリストア)
4. [スケーリング](#スケーリング)
5. [セキュリティ対応](#セキュリティ対応)

## 日常的な監視

### 1. CloudWatch Dashboards確認

毎日、以下のダッシュボードを確認してください。

#### アクセス方法

1. AWSコンソールにログイン
2. **CloudWatch** > **Dashboards** に移動
3. `goal-mandala-production` ダッシュボードを選択

#### 確認項目

| メトリクス | 正常範囲 | 異常時の対応 |
|-----------|---------|-------------|
| Lambda実行回数 | 0-10,000/日 | 急激な増加時は原因調査 |
| Lambda実行時間 | 平均 < 1秒 | 1秒超過時は最適化検討 |
| Lambda エラー率 | < 1% | 1%超過時は原因調査 |
| API Gateway リクエスト数 | 0-10,000/日 | 急激な増加時は原因調査 |
| API Gateway レイテンシー | 95%ile < 2秒 | 2秒超過時は最適化検討 |
| Aurora接続数 | < 50 | 50超過時はコネクションプール確認 |
| Aurora CPU使用率 | < 70% | 70%超過時はスケーリング検討 |

### 2. CloudWatch Alarms確認

毎日、以下のアラームを確認してください。

#### アクセス方法

1. AWSコンソールにログイン
2. **CloudWatch** > **Alarms** に移動

#### 確認項目

| アラーム名 | 説明 | 正常状態 |
|-----------|------|---------|
| `goal-mandala-production-high-error-rate` | エラー率が5%を超えた | OK（緑） |
| `goal-mandala-production-high-latency` | レイテンシーが2秒を超えた | OK（緑） |
| `goal-mandala-production-database-connection-error` | データベース接続エラー | OK（緑） |

#### アラーム状態の確認

- **OK（緑）**: 正常
- **ALARM（赤）**: 異常 → [アラート対応](#アラート対応)を参照
- **INSUFFICIENT_DATA（灰色）**: データ不足 → メトリクスが正しく送信されているか確認

### 3. コスト確認

毎週、以下のコストを確認してください。

#### アクセス方法

1. AWSコンソールにログイン
2. **Billing** > **Cost Explorer** に移動

#### 確認項目

| サービス | 月間予算 | 確認頻度 |
|---------|---------|---------|
| Lambda | $5 | 毎週 |
| Aurora Serverless V2 | $10 | 毎週 |
| S3 | $1 | 毎週 |
| CloudFront | $1 | 毎週 |
| API Gateway | $1 | 毎週 |
| **合計** | **$18** | **毎週** |

#### 予算アラート

予算の80%を超えた場合、SNS経由でメール通知が送信されます。

## アラート対応

### 1. エラー率上昇時の対応

#### アラーム

`goal-mandala-production-high-error-rate`

#### 症状

Lambda関数のエラー率が5%を超えた

#### 対応手順

1. **CloudWatch Logsを確認**

```bash
# Lambda関数のログを確認
aws logs tail /aws/lambda/goal-mandala-production-api --follow

# エラーログをフィルタ
aws logs filter-log-events \
  --log-group-name /aws/lambda/goal-mandala-production-api \
  --filter-pattern "ERROR"
```

2. **エラーの原因を特定**

   - データベース接続エラー
   - API呼び出しエラー
   - バリデーションエラー
   - タイムアウトエラー

3. **対応方法**

   - **データベース接続エラー**: データベースの状態を確認、必要に応じて再起動
   - **API呼び出しエラー**: 外部APIの状態を確認、リトライロジックを確認
   - **バリデーションエラー**: 入力データを確認、バリデーションロジックを修正
   - **タイムアウトエラー**: Lambda関数のタイムアウト設定を確認、最適化を検討

4. **修正デプロイ**

   - 問題を修正
   - テスト実行
   - デプロイ

5. **エラー率の確認**

   - CloudWatch Dashboardsでエラー率を確認
   - 正常範囲（< 1%）に戻ったことを確認

### 2. レイテンシー上昇時の対応

#### アラーム

`goal-mandala-production-high-latency`

#### 症状

API Gatewayのレイテンシーが2秒を超えた

#### 対応手順

1. **X-Ray トレーシングを確認**

```bash
# X-Rayトレースを確認
aws xray get-trace-summaries \
  --start-time $(date -u -d '1 hour ago' +%s) \
  --end-time $(date -u +%s)
```

2. **ボトルネックを特定**

   - Lambda関数の実行時間
   - データベースクエリの実行時間
   - 外部API呼び出しの実行時間

3. **対応方法**

   - **Lambda関数の実行時間**: コードを最適化、メモリを増やす
   - **データベースクエリの実行時間**: インデックスを追加、クエリを最適化
   - **外部API呼び出しの実行時間**: タイムアウトを設定、キャッシュを追加

4. **最適化デプロイ**

   - 最適化を実施
   - テスト実行
   - デプロイ

5. **レイテンシーの確認**

   - CloudWatch Dashboardsでレイテンシーを確認
   - 正常範囲（95%ile < 2秒）に戻ったことを確認

### 3. データベース接続エラー時の対応

#### アラーム

`goal-mandala-production-database-connection-error`

#### 症状

データベースへの接続が失敗した

#### 対応手順

1. **データベースの状態を確認**

```bash
# RDSインスタンスの状態を確認
aws rds describe-db-instances \
  --db-instance-identifier goal-mandala-production

# データベース接続を確認
aws rds describe-db-cluster-endpoints \
  --db-cluster-identifier goal-mandala-production
```

2. **接続エラーの原因を特定**

   - データベースが停止している
   - セキュリティグループの設定が間違っている
   - 接続数が上限に達している
   - Secrets Managerの認証情報が間違っている

3. **対応方法**

   - **データベースが停止している**: データベースを起動
   - **セキュリティグループの設定が間違っている**: セキュリティグループを修正
   - **接続数が上限に達している**: 接続数を増やす、コネクションプールを最適化
   - **Secrets Managerの認証情報が間違っている**: 認証情報を修正

4. **接続確認**

```bash
# データベース接続を確認
psql -h YOUR_RDS_ENDPOINT -U goal_mandala_user -d goal_mandala_prod
```

5. **エラー率の確認**

   - CloudWatch Dashboardsでエラー率を確認
   - 正常範囲（< 1%）に戻ったことを確認

## バックアップ・リストア

### 1. データベースバックアップ

Aurora Serverless V2は自動バックアップが有効化されています。

#### 自動バックアップ設定

- **バックアップ保持期間**: 7日間
- **バックアップウィンドウ**: 03:00-04:00 JST
- **スナップショット**: 毎日自動作成

#### 手動スナップショット作成

```bash
# 手動スナップショット作成
aws rds create-db-cluster-snapshot \
  --db-cluster-snapshot-identifier goal-mandala-production-manual-$(date +%Y%m%d-%H%M%S) \
  --db-cluster-identifier goal-mandala-production

# スナップショット一覧確認
aws rds describe-db-cluster-snapshots \
  --db-cluster-identifier goal-mandala-production
```

### 2. S3バックアップ

フロントエンドのS3バケットは、バージョニングが有効化されています。

#### バージョニング確認

```bash
# バージョニング状態確認
aws s3api get-bucket-versioning \
  --bucket YOUR_S3_BUCKET_NAME

# オブジェクトバージョン一覧確認
aws s3api list-object-versions \
  --bucket YOUR_S3_BUCKET_NAME
```

#### 手動バックアップ

```bash
# S3バケット全体をバックアップ
aws s3 sync s3://YOUR_S3_BUCKET_NAME s3://YOUR_BACKUP_BUCKET_NAME
```

### 3. リストア手順

#### データベースリストア

```bash
# スナップショットからリストア
aws rds restore-db-cluster-from-snapshot \
  --db-cluster-identifier goal-mandala-production-restored \
  --snapshot-identifier goal-mandala-production-manual-20251213-120000 \
  --engine aurora-postgresql \
  --engine-version 15.4

# リストア完了後、エンドポイントを確認
aws rds describe-db-clusters \
  --db-cluster-identifier goal-mandala-production-restored
```

#### S3リストア

```bash
# 特定バージョンのオブジェクトをリストア
aws s3api get-object \
  --bucket YOUR_S3_BUCKET_NAME \
  --key index.html \
  --version-id YOUR_VERSION_ID \
  index.html

# バックアップバケットからリストア
aws s3 sync s3://YOUR_BACKUP_BUCKET_NAME s3://YOUR_S3_BUCKET_NAME
```

## スケーリング

### 1. Lambda同時実行数調整

#### 現在の設定

- **予約済み同時実行数**: 10
- **プロビジョニング済み同時実行数**: 0（コールドスタート対策なし）

#### 調整手順

```bash
# 予約済み同時実行数を増やす
aws lambda put-function-concurrency \
  --function-name goal-mandala-production-api \
  --reserved-concurrent-executions 20

# プロビジョニング済み同時実行数を設定（コールドスタート対策）
aws lambda put-provisioned-concurrency-config \
  --function-name goal-mandala-production-api \
  --provisioned-concurrent-executions 5 \
  --qualifier $LATEST
```

### 2. データベースACU調整

#### 現在の設定

- **最小ACU**: 0.5
- **最大ACU**: 2

#### 調整手順

```bash
# ACUを増やす
aws rds modify-db-cluster \
  --db-cluster-identifier goal-mandala-production \
  --serverless-v2-scaling-configuration MinCapacity=1,MaxCapacity=4 \
  --apply-immediately
```

### 3. CloudFrontキャッシュ設定

#### 現在の設定

- **キャッシュポリシー**: CachingOptimized
- **TTL**: 86400秒（24時間）

#### 調整手順

```bash
# キャッシュポリシーを変更
aws cloudfront update-distribution \
  --id YOUR_CLOUDFRONT_DISTRIBUTION_ID \
  --distribution-config file://distribution-config.json
```

## セキュリティ対応

### 1. Secrets Manager認証情報ローテーション

#### ローテーション手順

```bash
# 新しいパスワードを生成
NEW_PASSWORD=$(openssl rand -base64 32)

# Secrets Managerを更新
aws secretsmanager update-secret \
  --secret-id goal-mandala/production/database \
  --secret-string "{
    \"username\": \"goal_mandala_user\",
    \"password\": \"$NEW_PASSWORD\",
    \"host\": \"YOUR_RDS_ENDPOINT\",
    \"port\": 5432,
    \"database\": \"goal_mandala_prod\"
  }"

# データベースのパスワードを更新
psql -h YOUR_RDS_ENDPOINT -U postgres -c "ALTER USER goal_mandala_user WITH PASSWORD '$NEW_PASSWORD';"
```

#### ローテーション頻度

- **推奨**: 90日毎
- **最低**: 180日毎

### 2. IAMポリシー見直し

#### 見直し手順

1. **IAMユーザーの確認**

```bash
# IAMユーザー一覧確認
aws iam list-users

# IAMユーザーのポリシー確認
aws iam list-attached-user-policies \
  --user-name github-actions-deploy
```

2. **最小権限の原則を適用**

   - 不要な権限を削除
   - 必要最小限の権限のみを付与

3. **アクセスキーのローテーション**

```bash
# 新しいアクセスキーを作成
aws iam create-access-key \
  --user-name github-actions-deploy

# 古いアクセスキーを無効化
aws iam update-access-key \
  --user-name github-actions-deploy \
  --access-key-id OLD_ACCESS_KEY_ID \
  --status Inactive

# 古いアクセスキーを削除
aws iam delete-access-key \
  --user-name github-actions-deploy \
  --access-key-id OLD_ACCESS_KEY_ID
```

### 3. CloudTrail監査ログ確認

#### 確認手順

1. **CloudTrailログを確認**

```bash
# CloudTrailイベントを確認
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=EventName,AttributeValue=DeleteDBCluster \
  --max-results 10

# 特定ユーザーのイベントを確認
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=Username,AttributeValue=github-actions-deploy \
  --max-results 10
```

2. **異常なアクセスパターンを検出**

   - 深夜のAPI呼び出し
   - 大量のデータ削除
   - 不正なIPアドレスからのアクセス

3. **対応方法**

   - 異常なアクセスを検出した場合、IAMユーザーを無効化
   - アクセスキーをローテーション
   - セキュリティグループを見直し

## まとめ

本ドキュメントでは、目標管理曼荼羅システムの本番環境の運用方法を説明しました。

### 重要なポイント

1. **日常的な監視**: CloudWatch Dashboards、CloudWatch Alarms、コストを毎日確認
2. **アラート対応**: エラー率上昇、レイテンシー上昇、データベース接続エラーに迅速に対応
3. **バックアップ・リストア**: 自動バックアップを活用し、必要に応じて手動バックアップを作成
4. **スケーリング**: Lambda同時実行数、データベースACU、CloudFrontキャッシュを適切に調整
5. **セキュリティ対応**: Secrets Manager認証情報ローテーション、IAMポリシー見直し、CloudTrail監査ログ確認を定期的に実施

### 次のステップ

- [トラブルシューティングガイド](./troubleshooting-guide.md)を参照して、問題発生時の対処方法を理解してください
- [ロールバック手順書](./rollback-guide.md)を参照して、ロールバック方法を理解してください
