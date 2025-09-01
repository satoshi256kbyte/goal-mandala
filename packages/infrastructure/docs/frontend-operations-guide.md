# フロントエンド配信環境 運用手順書

## 概要

CloudFront + S3構成によるフロントエンド配信環境の日常運用、監視、メンテナンス手順について説明します。

## 日常運用手順

### 1. 日次チェック項目

#### 朝の健全性確認（9:00 AM）

```bash
# 1. サイトの基本動作確認
curl -I https://goal-mandala.example.com
# 期待値: HTTP/2 200

# 2. 主要ページの応答時間確認
./packages/infrastructure/scripts/performance-test.sh prod
# 期待値: 平均レスポンス時間 < 3秒

# 3. CloudWatchアラームの確認
aws cloudwatch describe-alarms \
  --alarm-names "HighErrorRate" "LowCacheHitRate" "CertificateExpiration" \
  --state-value ALARM
# 期待値: アラーム状態のアラームが0件
```

#### 夕方の統計確認（6:00 PM）

```bash
# 1. 当日のアクセス統計確認
aws cloudwatch get-metric-statistics \
  --namespace AWS/CloudFront \
  --metric-name Requests \
  --dimensions Name=DistributionId,Value={distribution-id} \
  --start-time $(date -d "today 00:00" --iso-8601) \
  --end-time $(date --iso-8601) \
  --period 86400 \
  --statistics Sum

# 2. エラー率の確認
aws cloudwatch get-metric-statistics \
  --namespace AWS/CloudFront \
  --metric-name 4xxErrorRate \
  --dimensions Name=DistributionId,Value={distribution-id} \
  --start-time $(date -d "today 00:00" --iso-8601) \
  --end-time $(date --iso-8601) \
  --period 86400 \
  --statistics Average

# 3. キャッシュヒット率の確認
aws cloudwatch get-metric-statistics \
  --namespace AWS/CloudFront \
  --metric-name CacheHitRate \
  --dimensions Name=DistributionId,Value={distribution-id} \
  --start-time $(date -d "today 00:00" --iso-8601) \
  --end-time $(date --iso-8601) \
  --period 86400 \
  --statistics Average
```

### 2. 週次メンテナンス（毎週月曜日）

#### セキュリティチェック

```bash
# 1. SSL証明書の有効期限確認
aws acm describe-certificate --certificate-arn {certificate-arn} \
  --query 'Certificate.NotAfter' --output text

# 2. セキュリティヘッダーの確認
curl -I https://goal-mandala.example.com | grep -E "(Strict-Transport-Security|X-Content-Type-Options|X-Frame-Options)"

# 3. 不正アクセスの確認
aws logs filter-log-events \
  --log-group-name /aws/cloudfront/distribution/{distribution-id} \
  --start-time $(date -d "7 days ago" +%s)000 \
  --filter-pattern '[timestamp, request_id, client_ip="403" || client_ip="404"]'
```

#### パフォーマンス分析

```bash
# 1. 週間パフォーマンスレポートの生成
./packages/infrastructure/scripts/performance-test.sh prod > weekly-performance-$(date +%Y%m%d).txt

# 2. キャッシュ効率の分析
aws cloudwatch get-metric-statistics \
  --namespace AWS/CloudFront \
  --metric-name CacheHitRate \
  --dimensions Name=DistributionId,Value={distribution-id} \
  --start-time $(date -d "7 days ago" --iso-8601) \
  --end-time $(date --iso-8601) \
  --period 86400 \
  --statistics Average,Minimum,Maximum

# 3. 遅いリクエストの特定
aws logs filter-log-events \
  --log-group-name /aws/cloudfront/distribution/{distribution-id} \
  --start-time $(date -d "7 days ago" +%s)000 \
  --filter-pattern '[timestamp, request_id, client_ip, method, uri, status, bytes, time_taken > 5000]'
```

### 3. 月次レビュー（毎月第1営業日）

#### コスト分析

```bash
# 1. CloudFrontのコスト確認
aws ce get-cost-and-usage \
  --time-period Start=$(date -d "last month" +%Y-%m-01),End=$(date +%Y-%m-01) \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --group-by Type=DIMENSION,Key=SERVICE \
  --filter file://cloudfront-cost-filter.json

# 2. S3のコスト確認
aws ce get-cost-and-usage \
  --time-period Start=$(date -d "last month" +%Y-%m-01),End=$(date +%Y-%m-01) \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --group-by Type=DIMENSION,Key=USAGE_TYPE \
  --filter file://s3-cost-filter.json

# 3. データ転送量の分析
aws cloudwatch get-metric-statistics \
  --namespace AWS/CloudFront \
  --metric-name BytesDownloaded \
  --dimensions Name=DistributionId,Value={distribution-id} \
  --start-time $(date -d "last month" +%Y-%m-01T00:00:00) \
  --end-time $(date +%Y-%m-01T00:00:00) \
  --period 2592000 \
  --statistics Sum
```

#### セキュリティ監査

```bash
# 1. IAMポリシーの確認
aws iam list-policies --scope Local \
  --query 'Policies[?contains(PolicyName, `frontend`)].{Name:PolicyName,UpdateDate:UpdateDate}'

# 2. S3バケットのパブリックアクセス確認
aws s3api get-public-access-block --bucket {bucket-name}

# 3. CloudTrailログの整合性確認
aws cloudtrail validate-logs \
  --trail-arn {trail-arn} \
  --start-time $(date -d "30 days ago" --iso-8601)
```

## デプロイ手順

### 1. 通常デプロイ（営業時間外推奨）

#### 事前準備

```bash
# 1. 現在の状態をバックアップ
aws s3 sync s3://{bucket-name}/ ./backup/$(date +%Y%m%d-%H%M%S)/ --exclude "*.log"

# 2. デプロイ前のヘルスチェック
./packages/infrastructure/scripts/performance-test.sh prod

# 3. メンテナンス通知（必要に応じて）
aws sns publish \
  --topic-arn arn:aws:sns:region:account:maintenance-notifications \
  --message "フロントエンドのデプロイを開始します。短時間のサービス中断が発生する可能性があります。"
```

#### デプロイ実行

```bash
# 1. フロントエンドのビルド
cd packages/frontend
pnpm install --frozen-lockfile
pnpm build

# 2. デプロイスクリプトの実行
cd ../../packages/infrastructure
./scripts/deploy-frontend.sh prod

# 3. デプロイ後の確認
sleep 60  # キャッシュ無効化の完了を待機
./scripts/performance-test.sh prod
```

#### 事後確認

```bash
# 1. 主要機能の動作確認
curl -I https://goal-mandala.example.com/
curl -I https://goal-mandala.example.com/assets/app.js
curl -I https://goal-mandala.example.com/assets/app.css

# 2. エラーログの確認
aws logs filter-log-events \
  --log-group-name /aws/cloudfront/distribution/{distribution-id} \
  --start-time $(date -d "10 minutes ago" +%s)000 \
  --filter-pattern '[timestamp, request_id, client_ip, method, uri, status >= 400]'

# 3. 完了通知
aws sns publish \
  --topic-arn arn:aws:sns:region:account:maintenance-notifications \
  --message "フロントエンドのデプロイが完了しました。"
```

### 2. 緊急デプロイ

#### 緊急時の迅速デプロイ

```bash
# 1. 緊急デプロイの開始通知
aws sns publish \
  --topic-arn arn:aws:sns:region:account:emergency-notifications \
  --message "緊急デプロイを開始します。理由: ${EMERGENCY_REASON}"

# 2. 最小限のテストでデプロイ
SKIP_BUILD=false ./packages/infrastructure/scripts/deploy-frontend.sh prod

# 3. 即座の動作確認
curl -f https://goal-mandala.example.com/ || echo "ERROR: Site is not accessible"

# 4. 緊急デプロイ完了通知
aws sns publish \
  --topic-arn arn:aws:sns:region:account:emergency-notifications \
  --message "緊急デプロイが完了しました。"
```

## ロールバック手順

### 1. 通常ロールバック

#### Git履歴を使用したロールバック

```bash
# 1. 前の安定バージョンを特定
git log --oneline -10

# 2. 前のコミットにチェックアウト
git checkout {previous-commit-hash}

# 3. フロントエンドの再ビルド
cd packages/frontend
pnpm build

# 4. 再デプロイ
cd ../infrastructure
./scripts/deploy-frontend.sh prod

# 5. 動作確認
./scripts/performance-test.sh prod
```

#### S3バージョニングを使用したロールバック

```bash
# 1. 前のバージョンを特定
aws s3api list-object-versions --bucket {bucket-name} --prefix index.html

# 2. 前のバージョンを復元
aws s3api copy-object \
  --bucket {bucket-name} \
  --copy-source "{bucket-name}/index.html?versionId={previous-version-id}" \
  --key index.html

# 3. CloudFrontキャッシュの無効化
aws cloudfront create-invalidation \
  --distribution-id {distribution-id} \
  --paths "/*"
```

### 2. 緊急ロールバック

#### 即座のサービス復旧

```bash
# 1. メンテナンスページの表示
aws s3 cp maintenance.html s3://{bucket-name}/index.html

# 2. 全キャッシュの即座無効化
aws cloudfront create-invalidation \
  --distribution-id {distribution-id} \
  --paths "/*"

# 3. 緊急事態の通知
aws sns publish \
  --topic-arn arn:aws:sns:region:account:emergency-notifications \
  --message "緊急ロールバックを実行しました。メンテナンスページを表示中です。"

# 4. 問題の調査と修正後、正常なバージョンの復旧
# （上記の通常ロールバック手順を実行）
```

## 監視とアラート

### 1. CloudWatchアラームの設定

#### 高エラー率アラーム

```bash
aws cloudwatch put-metric-alarm \
  --alarm-name "Frontend-HighErrorRate" \
  --alarm-description "フロントエンドで高いエラー率を検出" \
  --metric-name 4xxErrorRate \
  --namespace AWS/CloudFront \
  --statistic Average \
  --period 300 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=DistributionId,Value={distribution-id} \
  --evaluation-periods 2 \
  --alarm-actions arn:aws:sns:region:account:frontend-alerts
```

#### 低キャッシュヒット率アラーム

```bash
aws cloudwatch put-metric-alarm \
  --alarm-name "Frontend-LowCacheHitRate" \
  --alarm-description "フロントエンドで低いキャッシュヒット率を検出" \
  --metric-name CacheHitRate \
  --namespace AWS/CloudFront \
  --statistic Average \
  --period 900 \
  --threshold 80 \
  --comparison-operator LessThanThreshold \
  --dimensions Name=DistributionId,Value={distribution-id} \
  --evaluation-periods 3 \
  --alarm-actions arn:aws:sns:region:account:frontend-alerts
```

#### SSL証明書期限アラーム

```bash
aws cloudwatch put-metric-alarm \
  --alarm-name "Frontend-CertificateExpiration" \
  --alarm-description "SSL証明書の期限が近づいています" \
  --metric-name DaysToExpiry \
  --namespace AWS/CertificateManager \
  --statistic Minimum \
  --period 43200 \
  --threshold 30 \
  --comparison-operator LessThanThreshold \
  --dimensions Name=CertificateArn,Value={certificate-arn} \
  --evaluation-periods 1 \
  --alarm-actions arn:aws:sns:region:account:frontend-alerts
```

### 2. ログ監視

#### 異常なアクセスパターンの検出

```bash
# 1. 大量リクエストの検出
aws logs filter-log-events \
  --log-group-name /aws/cloudfront/distribution/{distribution-id} \
  --start-time $(date -d "1 hour ago" +%s)000 \
  --filter-pattern '[timestamp, request_id, client_ip, method, uri, status, bytes, time_taken, referrer, user_agent]' \
  | jq -r '.events[].message' \
  | awk '{print $3}' \
  | sort | uniq -c | sort -nr | head -10

# 2. 404エラーの多いパスの検出
aws logs filter-log-events \
  --log-group-name /aws/cloudfront/distribution/{distribution-id} \
  --start-time $(date -d "1 hour ago" +%s)000 \
  --filter-pattern '[timestamp, request_id, client_ip, method, uri, status="404"]' \
  | jq -r '.events[].message' \
  | awk '{print $5}' \
  | sort | uniq -c | sort -nr | head -10

# 3. 異常なUser-Agentの検出
aws logs filter-log-events \
  --log-group-name /aws/cloudfront/distribution/{distribution-id} \
  --start-time $(date -d "1 hour ago" +%s)000 \
  --filter-pattern '[timestamp, request_id, client_ip, method, uri, status, bytes, time_taken, referrer, user_agent]' \
  | jq -r '.events[].message' \
  | awk -F'"' '{print $6}' \
  | grep -v -E "(Mozilla|Chrome|Safari|Firefox)" \
  | sort | uniq -c | sort -nr | head -10
```

## トラブルシューティング

### 1. 一般的な問題の診断フロー

#### サイトにアクセスできない場合

```bash
# 1. DNS解決の確認
nslookup goal-mandala.example.com
dig goal-mandala.example.com

# 2. CloudFrontの状態確認
aws cloudfront get-distribution --id {distribution-id} \
  --query 'Distribution.Status' --output text

# 3. S3バケットの状態確認
aws s3 ls s3://{bucket-name}/index.html

# 4. 証明書の状態確認
aws acm describe-certificate --certificate-arn {certificate-arn} \
  --query 'Certificate.Status' --output text
```

#### パフォーマンスが悪い場合

```bash
# 1. キャッシュヒット率の確認
aws cloudwatch get-metric-statistics \
  --namespace AWS/CloudFront \
  --metric-name CacheHitRate \
  --dimensions Name=DistributionId,Value={distribution-id} \
  --start-time $(date -d "1 hour ago" --iso-8601) \
  --end-time $(date --iso-8601) \
  --period 3600 \
  --statistics Average

# 2. オリジンレスポンス時間の確認
aws cloudwatch get-metric-statistics \
  --namespace AWS/CloudFront \
  --metric-name OriginLatency \
  --dimensions Name=DistributionId,Value={distribution-id} \
  --start-time $(date -d "1 hour ago" --iso-8601) \
  --end-time $(date --iso-8601) \
  --period 3600 \
  --statistics Average

# 3. パフォーマンステストの実行
./packages/infrastructure/scripts/performance-test.sh prod
```

### 2. 緊急時対応手順

#### レベル1: 軽微な問題（1時間以内対応）

1. **問題の特定と記録**
2. **影響範囲の確認**
3. **一時的な回避策の検討**
4. **修正作業の実施**
5. **動作確認**

#### レベル2: 重大な問題（30分以内対応）

1. **緊急事態の宣言**
2. **関係者への即座通知**
3. **メンテナンスページの表示**
4. **ロールバックの実施**
5. **根本原因の調査**

#### レベル3: 全面停止（15分以内対応）

1. **全面緊急事態の宣言**
2. **全関係者への緊急通知**
3. **CloudFrontディストリビューションの無効化**
4. **代替手段の検討**
5. **外部ベンダーへの連絡**

## セキュリティ運用

### 1. 定期的なセキュリティチェック

#### 日次セキュリティチェック

```bash
# 1. 異常なアクセスの確認
aws logs filter-log-events \
  --log-group-name /aws/cloudfront/distribution/{distribution-id} \
  --start-time $(date -d "24 hours ago" +%s)000 \
  --filter-pattern '[timestamp, request_id, client_ip, method, uri, status >= 400]' \
  | jq -r '.events[].message' | wc -l

# 2. セキュリティヘッダーの確認
curl -I https://goal-mandala.example.com | grep -E "(Strict-Transport-Security|X-Content-Type-Options|X-Frame-Options)"

# 3. SSL証明書の状態確認
openssl s_client -connect goal-mandala.example.com:443 -servername goal-mandala.example.com < /dev/null 2>/dev/null | openssl x509 -noout -dates
```

#### 週次セキュリティ監査

```bash
# 1. IAMポリシーの確認
aws iam list-policies --scope Local \
  --query 'Policies[?contains(PolicyName, `frontend`)].{Name:PolicyName,UpdateDate:UpdateDate}'

# 2. S3バケットポリシーの確認
aws s3api get-bucket-policy --bucket {bucket-name}

# 3. CloudTrailログの確認
aws logs filter-log-events \
  --log-group-name CloudTrail/S3DataEvents \
  --start-time $(date -d "7 days ago" +%s)000 \
  --filter-pattern '{ $.eventName = "GetObject" && $.sourceIPAddress != "CloudFront" }'
```

### 2. インシデント対応

#### セキュリティインシデント検知時

```bash
# 1. 即座のログ収集
aws logs create-export-task \
  --log-group-name /aws/cloudfront/distribution/{distribution-id} \
  --from $(date -d "2 hours ago" +%s)000 \
  --to $(date +%s)000 \
  --destination s3://incident-logs-bucket/$(date +%Y%m%d-%H%M%S)/

# 2. 攻撃元IPの特定
aws logs filter-log-events \
  --log-group-name /aws/cloudfront/distribution/{distribution-id} \
  --start-time $(date -d "1 hour ago" +%s)000 \
  --filter-pattern '[timestamp, request_id, client_ip, method, uri, status >= 400]' \
  | jq -r '.events[].message' | awk '{print $3}' | sort | uniq -c | sort -nr

# 3. 緊急ブロック（必要に応じて）
# WAFルールの追加やCloudFrontディストリビューションの一時停止
```

## パフォーマンス最適化

### 1. 定期的なパフォーマンス分析

#### 月次パフォーマンスレビュー

```bash
# 1. 月間パフォーマンスレポートの生成
./packages/infrastructure/scripts/performance-test.sh prod > monthly-performance-$(date +%Y%m).txt

# 2. キャッシュ効率の分析
aws cloudwatch get-metric-statistics \
  --namespace AWS/CloudFront \
  --metric-name CacheHitRate \
  --dimensions Name=DistributionId,Value={distribution-id} \
  --start-time $(date -d "30 days ago" --iso-8601) \
  --end-time $(date --iso-8601) \
  --period 86400 \
  --statistics Average

# 3. 遅いリクエストの分析
aws logs filter-log-events \
  --log-group-name /aws/cloudfront/distribution/{distribution-id} \
  --start-time $(date -d "30 days ago" +%s)000 \
  --filter-pattern '[timestamp, request_id, client_ip, method, uri, status, bytes, time_taken > 5000]'
```

### 2. 最適化施策の実施

#### キャッシュ設定の最適化

```bash
# 1. キャッシュヒット率の低いパスの特定
aws logs filter-log-events \
  --log-group-name /aws/cloudfront/distribution/{distribution-id} \
  --start-time $(date -d "7 days ago" +%s)000 \
  --filter-pattern '[timestamp, request_id, client_ip, method, uri, status, bytes, time_taken, referrer, user_agent, cache_status="Miss"]' \
  | jq -r '.events[].message' | awk '{print $5}' | sort | uniq -c | sort -nr

# 2. キャッシュポリシーの更新
aws cloudfront update-distribution \
  --id {distribution-id} \
  --distribution-config file://optimized-cache-config.json

# 3. 効果の測定
sleep 3600  # 1時間待機
./packages/infrastructure/scripts/performance-test.sh prod
```

## バックアップとリストア

### 1. 定期バックアップ

#### 日次バックアップ

```bash
#!/bin/bash
# daily-backup.sh

BACKUP_BUCKET="goal-mandala-backups"
DATE=$(date +%Y%m%d)

# S3コンテンツのバックアップ
aws s3 sync s3://{frontend-bucket}/ s3://${BACKUP_BUCKET}/frontend/${DATE}/ \
  --exclude "*.log" --exclude "*.tmp"

# 設定のバックアップ
aws cloudfront get-distribution-config --id {distribution-id} > ${DATE}-distribution-config.json
aws s3 cp ${DATE}-distribution-config.json s3://${BACKUP_BUCKET}/config/

# 古いバックアップの削除（30日以上前）
aws s3 rm s3://${BACKUP_BUCKET}/frontend/ --recursive \
  --exclude "*" --include "*$(date -d '30 days ago' +%Y%m%d)*"
```

### 2. リストア手順

#### 完全リストア

```bash
# 1. バックアップからの復元
RESTORE_DATE="20241201"  # 復元したい日付
aws s3 sync s3://goal-mandala-backups/frontend/${RESTORE_DATE}/ s3://{frontend-bucket}/ \
  --delete

# 2. CloudFrontキャッシュの無効化
aws cloudfront create-invalidation \
  --distribution-id {distribution-id} \
  --paths "/*"

# 3. 動作確認
./packages/infrastructure/scripts/performance-test.sh prod
```

## 連絡先とエスカレーション

### 緊急連絡先

- **レベル1サポート**: [開発チーム] - 平日 9:00-18:00
- **レベル2サポート**: [インフラチーム] - 24時間対応
- **レベル3サポート**: [外部ベンダー] - 24時間対応

### エスカレーション手順

1. **軽微な問題**: 開発チーム → 1時間以内対応
2. **重大な問題**: インフラチーム → 30分以内対応
3. **全面停止**: 外部ベンダー → 15分以内対応

### 通知チャネル

- **Slack**: #infrastructure-alerts
- **メール**: <alerts@goal-mandala.example.com>
- **SMS**: 緊急時のみ（レベル3）

## 参考資料

- [フロントエンド配信環境 デプロイガイド](./frontend-deployment-guide.md)
- [フロントエンド配信環境 セキュリティガイド](./frontend-security-guide.md)
- [フロントエンド配信環境 トラブルシューティングガイド](./frontend-troubleshooting-guide.md)
- [AWS CloudFront 運用ガイド](https://docs.aws.amazon.com/cloudfront/latest/DeveloperGuide/operations.html)
- [AWS S3 運用ガイド](https://docs.aws.amazon.com/s3/latest/userguide/operations.html)
