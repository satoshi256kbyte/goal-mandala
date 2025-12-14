# トラブルシューティングガイド

## 概要

本ドキュメントは、目標管理曼荼羅システムで発生する可能性のある問題と、その対処方法を説明します。

## 目次

1. [よくある問題](#よくある問題)
2. [ログの確認方法](#ログの確認方法)
3. [メトリクスの確認方法](#メトリクスの確認方法)
4. [緊急時の対応](#緊急時の対応)
5. [エスカレーション](#エスカレーション)

## よくある問題

### 1. デプロイ失敗

#### 問題1-1: テストジョブ失敗

**症状**

GitHub Actionsのテストジョブ（lint、type-check、unit tests、integration tests、E2E tests）が失敗する

**原因**

- コードの構文エラー
- 型エラー
- テストケースの失敗
- 依存関係の問題

**解決方法**

1. **GitHub Actionsのログを確認**

   - GitHub > Actions > 失敗したワークフローを選択
   - エラーメッセージを確認

2. **ローカル環境で再現**

```bash
# Lint実行
npm run lint

# Type Check実行
npm run type-check

# Unit Tests実行
npm run test

# Integration Tests実行
npm run test:integration

# E2E Tests実行
npm run test:e2e
```

3. **問題を修正**

   - 構文エラーを修正
   - 型エラーを修正
   - テストケースを修正
   - 依存関係を更新

4. **再度push**

```bash
git add .
git commit -m "fix: テストエラーを修正"
git push origin main
```

#### 問題1-2: AWS認証エラー

**症状**

GitHub ActionsのデプロイジョブでAWS認証が失敗する

**原因**

- GitHub Secretsの設定が間違っている
- IAMユーザーの権限が不足している
- アクセスキーが無効化されている

**解決方法**

1. **GitHub Secretsを確認**

   - GitHub > Settings > Secrets and variables > Actions
   - `AWS_ACCESS_KEY_ID`と`AWS_SECRET_ACCESS_KEY`が正しく設定されているか確認

2. **IAMユーザーの権限を確認**

```bash
# IAMユーザーの権限を確認
aws iam list-attached-user-policies \
  --user-name github-actions-deploy

# アクセスキーの状態を確認
aws iam list-access-keys \
  --user-name github-actions-deploy
```

3. **アクセスキーをローテーション**

```bash
# 新しいアクセスキーを作成
aws iam create-access-key \
  --user-name github-actions-deploy

# GitHub Secretsを更新
# GitHub > Settings > Secrets and variables > Actions
# AWS_ACCESS_KEY_IDとAWS_SECRET_ACCESS_KEYを更新
```

#### 問題1-3: CDKデプロイエラー

**症状**

CDKデプロイが失敗する

**原因**

- CloudFormationスタックの更新エラー
- リソースの制限に達している
- 依存関係の問題

**解決方法**

1. **CloudFormationスタックのエラーを確認**

```bash
# CloudFormationスタックのイベントを確認
aws cloudformation describe-stack-events \
  --stack-name DatabaseStack-production \
  --max-items 10

# スタックの状態を確認
aws cloudformation describe-stacks \
  --stack-name DatabaseStack-production
```

2. **エラーメッセージを確認**

   - リソースの制限に達している場合、制限緩和を申請
   - 依存関係の問題がある場合、依存関係を修正

3. **ロールバック**

```bash
# スタックをロールバック
aws cloudformation cancel-update-stack \
  --stack-name DatabaseStack-production
```

### 2. ヘルスチェック失敗

#### 問題2-1: APIヘルスチェック失敗

**症状**

APIヘルスチェックエンドポイントが200 OKを返さない

**原因**

- Lambda関数が起動していない
- データベース接続エラー
- API Gatewayの設定が間違っている

**解決方法**

1. **Lambda関数のログを確認**

```bash
# Lambda関数のログを確認
aws logs tail /aws/lambda/goal-mandala-production-api --follow

# エラーログをフィルタ
aws logs filter-log-events \
  --log-group-name /aws/lambda/goal-mandala-production-api \
  --filter-pattern "ERROR"
```

2. **データベース接続を確認**

```bash
# RDSインスタンスの状態を確認
aws rds describe-db-instances \
  --db-instance-identifier goal-mandala-production

# データベース接続を確認
psql -h YOUR_RDS_ENDPOINT -U goal_mandala_user -d goal_mandala_prod
```

3. **API Gatewayの設定を確認**

```bash
# API Gatewayのエンドポイントを確認
aws apigateway get-rest-apis

# API Gatewayのステージを確認
aws apigateway get-stages \
  --rest-api-id YOUR_API_ID
```

#### 問題2-2: データベース接続エラー

**症状**

データベースへの接続が失敗する

**原因**

- データベースが停止している
- セキュリティグループの設定が間違っている
- 接続数が上限に達している
- Secrets Managerの認証情報が間違っている

**解決方法**

1. **データベースの状態を確認**

```bash
# RDSインスタンスの状態を確認
aws rds describe-db-instances \
  --db-instance-identifier goal-mandala-production
```

2. **セキュリティグループを確認**

```bash
# セキュリティグループを確認
aws ec2 describe-security-groups \
  --group-ids YOUR_SECURITY_GROUP_ID
```

3. **接続数を確認**

```bash
# データベース接続数を確認
psql -h YOUR_RDS_ENDPOINT -U goal_mandala_user -d goal_mandala_prod -c "SELECT count(*) FROM pg_stat_activity;"
```

4. **Secrets Managerの認証情報を確認**

```bash
# Secrets Managerの認証情報を確認
aws secretsmanager get-secret-value \
  --secret-id goal-mandala/production/database
```

### 3. CloudFrontキャッシュ問題

#### 問題3-1: フロントエンドの更新が反映されない

**症状**

フロントエンドをデプロイしたが、更新が反映されない

**原因**

- CloudFrontキャッシュが残っている
- ブラウザキャッシュが残っている

**解決方法**

1. **CloudFrontキャッシュを無効化**

```bash
# CloudFrontキャッシュを無効化
aws cloudfront create-invalidation \
  --distribution-id YOUR_CLOUDFRONT_DISTRIBUTION_ID \
  --paths "/*"

# 無効化の状態を確認
aws cloudfront get-invalidation \
  --distribution-id YOUR_CLOUDFRONT_DISTRIBUTION_ID \
  --id YOUR_INVALIDATION_ID
```

2. **ブラウザキャッシュをクリア**

   - Chrome: Ctrl+Shift+Delete > キャッシュをクリア
   - Firefox: Ctrl+Shift+Delete > キャッシュをクリア
   - Safari: Command+Option+E

3. **再度アクセス**

   - ブラウザでCloudFrontのURLにアクセス
   - 更新が反映されていることを確認

### 4. データベース接続エラー

#### 問題4-1: 接続数が上限に達している

**症状**

データベースへの接続が失敗し、「too many connections」エラーが発生する

**原因**

- Lambda関数が接続をクローズしていない
- 接続数の上限が低すぎる

**解決方法**

1. **接続数を確認**

```bash
# データベース接続数を確認
psql -h YOUR_RDS_ENDPOINT -U goal_mandala_user -d goal_mandala_prod -c "SELECT count(*) FROM pg_stat_activity;"

# 接続の詳細を確認
psql -h YOUR_RDS_ENDPOINT -U goal_mandala_user -d goal_mandala_prod -c "SELECT * FROM pg_stat_activity;"
```

2. **接続をクローズ**

```bash
# アイドル接続をクローズ
psql -h YOUR_RDS_ENDPOINT -U goal_mandala_user -d goal_mandala_prod -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle' AND state_change < now() - interval '5 minutes';"
```

3. **接続数の上限を増やす**

```bash
# RDSパラメータグループを確認
aws rds describe-db-parameters \
  --db-parameter-group-name goal-mandala-production \
  --query "Parameters[?ParameterName=='max_connections']"

# 接続数の上限を増やす
aws rds modify-db-parameter-group \
  --db-parameter-group-name goal-mandala-production \
  --parameters "ParameterName=max_connections,ParameterValue=100,ApplyMethod=immediate"
```

## ログの確認方法

### 1. CloudWatch Logs

#### Lambda関数のログ

```bash
# Lambda関数のログを確認
aws logs tail /aws/lambda/goal-mandala-production-api --follow

# エラーログをフィルタ
aws logs filter-log-events \
  --log-group-name /aws/lambda/goal-mandala-production-api \
  --filter-pattern "ERROR"

# 特定期間のログを確認
aws logs filter-log-events \
  --log-group-name /aws/lambda/goal-mandala-production-api \
  --start-time $(date -u -d '1 hour ago' +%s)000 \
  --end-time $(date -u +%s)000
```

#### API Gatewayのログ

```bash
# API Gatewayのログを確認
aws logs tail /aws/apigateway/goal-mandala-production --follow

# エラーログをフィルタ
aws logs filter-log-events \
  --log-group-name /aws/apigateway/goal-mandala-production \
  --filter-pattern "ERROR"
```

### 2. X-Ray トレーシング

#### トレースの確認

```bash
# X-Rayトレースを確認
aws xray get-trace-summaries \
  --start-time $(date -u -d '1 hour ago' +%s) \
  --end-time $(date -u +%s)

# 特定のトレースを確認
aws xray batch-get-traces \
  --trace-ids YOUR_TRACE_ID
```

#### サービスマップの確認

1. AWSコンソールにログイン
2. **X-Ray** > **Service map** に移動
3. サービスマップを確認
4. エラーがあるサービスをクリック
5. トレースを確認

### 3. CloudTrail

#### API呼び出しログの確認

```bash
# CloudTrailイベントを確認
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=EventName,AttributeValue=DeleteDBCluster \
  --max-results 10

# 特定ユーザーのイベントを確認
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=Username,AttributeValue=github-actions-deploy \
  --max-results 10

# 特定期間のイベントを確認
aws cloudtrail lookup-events \
  --start-time $(date -u -d '1 hour ago' +%s) \
  --end-time $(date -u +%s)
```

## メトリクスの確認方法

### 1. CloudWatch Dashboards

#### ダッシュボードの確認

1. AWSコンソールにログイン
2. **CloudWatch** > **Dashboards** に移動
3. `goal-mandala-production` ダッシュボードを選択
4. 以下のメトリクスを確認：
   - Lambda実行回数
   - Lambda実行時間
   - Lambda エラー率
   - API Gateway リクエスト数
   - API Gateway レイテンシー
   - Aurora接続数
   - Aurora CPU使用率

#### メトリクスのクエリ

```bash
# Lambda実行回数を確認
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Invocations \
  --dimensions Name=FunctionName,Value=goal-mandala-production-api \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Sum

# Lambda エラー率を確認
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Errors \
  --dimensions Name=FunctionName,Value=goal-mandala-production-api \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Sum
```

### 2. CloudWatch Alarms

#### アラームの確認

```bash
# アラーム一覧を確認
aws cloudwatch describe-alarms

# 特定のアラームを確認
aws cloudwatch describe-alarms \
  --alarm-names goal-mandala-production-high-error-rate

# アラーム履歴を確認
aws cloudwatch describe-alarm-history \
  --alarm-name goal-mandala-production-high-error-rate \
  --max-records 10
```

## 緊急時の対応

### 1. ロールバック実行

#### 手順

1. **GitHub Actionsでロールバックワークフローを実行**

   - GitHub > Actions > Rollback Production を選択
   - **Run workflow** をクリック
   - バージョンを指定（タグまたはコミットSHA）
   - 確認メッセージ「rollback」を入力
   - **Run workflow** をクリック

2. **ロールバックの進行状況を確認**

   - GitHub Actionsのログを確認
   - ロールバックが完了するまで待機

3. **ヘルスチェックを確認**

```bash
# APIヘルスチェック
curl https://YOUR_API_ENDPOINT/health

# バージョン確認
curl https://YOUR_API_ENDPOINT/version
```

詳細は[ロールバック手順書](./rollback-guide.md)を参照してください。

### 2. サービス停止

#### 手順

1. **CloudFrontディストリビューションを無効化**

```bash
# CloudFrontディストリビューションを無効化
aws cloudfront update-distribution \
  --id YOUR_CLOUDFRONT_DISTRIBUTION_ID \
  --distribution-config file://distribution-config-disabled.json
```

2. **API Gatewayを無効化**

```bash
# API Gatewayステージを削除
aws apigateway delete-stage \
  --rest-api-id YOUR_API_ID \
  --stage-name production
```

3. **Lambda関数を無効化**

```bash
# Lambda関数の同時実行数を0に設定
aws lambda put-function-concurrency \
  --function-name goal-mandala-production-api \
  --reserved-concurrent-executions 0
```

### 3. 問題調査

#### 手順

1. **ログを確認**

   - CloudWatch Logs
   - X-Ray トレーシング
   - CloudTrail

2. **メトリクスを確認**

   - CloudWatch Dashboards
   - CloudWatch Alarms

3. **原因を特定**

   - エラーメッセージを分析
   - トレースを分析
   - メトリクスを分析

4. **対応方法を決定**

   - 修正デプロイ
   - ロールバック
   - サービス停止

## エスカレーション

### 1. 連絡先リスト

| 役割 | 名前 | 連絡先 | 対応時間 |
|------|------|--------|---------|
| プロジェクトマネージャー | [名前] | [メール/電話] | 平日 9:00-18:00 |
| テックリード | [名前] | [メール/電話] | 平日 9:00-18:00 |
| インフラエンジニア | [名前] | [メール/電話] | 平日 9:00-18:00 |
| オンコール担当 | [名前] | [メール/電話] | 24時間365日 |

### 2. エスカレーション基準

| レベル | 基準 | 対応時間 | 連絡先 |
|--------|------|---------|--------|
| レベル1（低） | サービスに影響なし | 1営業日以内 | プロジェクトマネージャー |
| レベル2（中） | 一部のユーザーに影響 | 4時間以内 | テックリード |
| レベル3（高） | 全ユーザーに影響 | 1時間以内 | インフラエンジニア |
| レベル4（緊急） | サービス停止 | 即座 | オンコール担当 |

### 3. エスカレーション手順

1. **問題を特定**

   - 症状を確認
   - 影響範囲を確認
   - レベルを判断

2. **連絡先に連絡**

   - メールまたは電話で連絡
   - 問題の詳細を説明
   - 対応状況を報告

3. **対応を実施**

   - 指示に従って対応
   - 進捗を報告
   - 完了を報告

4. **事後対応**

   - 原因を分析
   - 再発防止策を検討
   - ドキュメントを更新

## まとめ

本ドキュメントでは、目標管理曼荼羅システムで発生する可能性のある問題と、その対処方法を説明しました。

### 重要なポイント

1. **よくある問題**: デプロイ失敗、ヘルスチェック失敗、CloudFrontキャッシュ問題、データベース接続エラーの対処方法を理解
2. **ログの確認方法**: CloudWatch Logs、X-Ray トレーシング、CloudTrailを活用
3. **メトリクスの確認方法**: CloudWatch Dashboards、CloudWatch Alarmsを活用
4. **緊急時の対応**: ロールバック実行、サービス停止、問題調査の手順を理解
5. **エスカレーション**: 連絡先リスト、エスカレーション基準、エスカレーション手順を理解

### 次のステップ

- [運用マニュアル](./operations-manual.md)を参照して、日常的な運用方法を理解してください
- [ロールバック手順書](./rollback-guide.md)を参照して、ロールバック方法を理解してください
