# Secrets Manager 運用手順書

## 概要

AWS Secrets Managerを使用した機密情報管理システムの運用手順書です。日常的な運用、監視、メンテナンス、緊急時対応の手順を記載しています。

## 目次

1. [日常運用](#日常運用)
2. [監視・アラート](#監視アラート)
3. [メンテナンス](#メンテナンス)
4. [緊急時対応](#緊急時対応)
5. [バックアップ・復旧](#バックアップ復旧)
6. [セキュリティ運用](#セキュリティ運用)

## 日常運用

### 運用チェックリスト（日次）

- [ ] **シークレット取得成功率の確認**

  ```bash
  aws cloudwatch get-metric-statistics \
    --namespace "AWS/SecretsManager" \
    --metric-name "SuccessfulRequestCount" \
    --start-time $(date -d '1 day ago' -u +%Y-%m-%dT%H:%M:%S) \
    --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
    --period 3600 \
    --statistics Sum
  ```

- [ ] **エラー率の確認**

  ```bash
  aws logs filter-log-events \
    --log-group-name "/aws/lambda/goal-mandala-prod-api" \
    --start-time $(date -d '1 day ago' +%s)000 \
    --filter-pattern "ERROR SecretServiceError"
  ```

- [ ] **キャッシュヒット率の確認**

  ```bash
  aws cloudwatch get-metric-statistics \
    --namespace "GoalMandala/SecretsManager" \
    --metric-name "CacheHitRate" \
    --start-time $(date -d '1 day ago' -u +%Y-%m-%dT%H:%M:%S) \
    --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
    --period 3600 \
    --statistics Average
  ```

- [ ] **異常なアクセスパターンの確認**

  ```bash
  aws cloudtrail lookup-events \
    --lookup-attributes AttributeKey=EventName,AttributeValue=GetSecretValue \
    --start-time $(date -d '1 day ago' -u +%Y-%m-%dT%H:%M:%S) \
    --end-time $(date -u +%Y-%m-%dT%H:%M:%S)
  ```

### 運用チェックリスト（週次）

- [ ] **シークレットローテーション状況の確認**

  ```bash
  aws secretsmanager describe-secret \
    --secret-id goal-mandala-prod-secret-database \
    --query 'RotationRules'
  ```

- [ ] **KMS暗号化キーの使用状況確認**

  ```bash
  aws kms describe-key \
    --key-id alias/goal-mandala-prod-secrets-key \
    --query 'KeyMetadata.KeyUsage'
  ```

- [ ] **CloudTrailログの分析**

  ```bash
  aws logs start-query \
    --log-group-name "/aws/cloudtrail" \
    --start-time $(date -d '7 days ago' +%s) \
    --end-time $(date +%s) \
    --query-string 'fields @timestamp, sourceIPAddress, userIdentity.type | filter eventName = "GetSecretValue" | stats count() by sourceIPAddress'
  ```

- [ ] **未使用シークレットの確認**

  ```bash
  aws secretsmanager list-secrets \
    --query 'SecretList[?LastAccessedDate < `$(date -d "30 days ago" -u +%Y-%m-%dT%H:%M:%S)`]'
  ```

### 運用チェックリスト（月次）

- [ ] **コスト分析**

  ```bash
  aws ce get-cost-and-usage \
    --time-period Start=$(date -d '1 month ago' +%Y-%m-%d),End=$(date +%Y-%m-%d) \
    --granularity MONTHLY \
    --metrics BlendedCost \
    --group-by Type=DIMENSION,Key=SERVICE \
    --filter '{"Dimensions":{"Key":"SERVICE","Values":["AWS Secrets Manager"]}}'
  ```

- [ ] **セキュリティ監査**

  ```bash
  # IAM権限の確認
  aws iam get-role-policy \
    --role-name goal-mandala-prod-lambda-secrets-role \
    --policy-name goal-mandala-prod-secrets-read-policy
  ```

- [ ] **パフォーマンス分析**

  ```bash
  # レスポンス時間の分析
  aws logs insights start-query \
    --log-group-name "/aws/lambda/goal-mandala-prod-api" \
    --start-time $(date -d '1 month ago' +%s) \
    --end-time $(date +%s) \
    --query-string 'fields @timestamp, @duration | filter @message like /SecretService/ | stats avg(@duration), max(@duration), min(@duration)'
  ```

## 監視・アラート

### CloudWatch アラーム設定

#### 1. シークレット取得失敗率アラーム

```bash
aws cloudwatch put-metric-alarm \
  --alarm-name "SecretsManager-HighErrorRate-Prod" \
  --alarm-description "High error rate for secrets retrieval" \
  --metric-name "ErrorCount" \
  --namespace "AWS/SecretsManager" \
  --statistic Sum \
  --period 300 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2 \
  --alarm-actions "arn:aws:sns:ap-northeast-1:123456789012:goal-mandala-prod-alerts"
```

#### 2. 異常なアクセス頻度アラーム

```bash
aws cloudwatch put-metric-alarm \
  --alarm-name "SecretsManager-HighAccessRate-Prod" \
  --alarm-description "Unusually high access rate to secrets" \
  --metric-name "SuccessfulRequestCount" \
  --namespace "AWS/SecretsManager" \
  --statistic Sum \
  --period 300 \
  --threshold 100 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --alarm-actions "arn:aws:sns:ap-northeast-1:123456789012:goal-mandala-prod-alerts"
```

#### 3. KMS暗号化エラーアラーム

```bash
aws cloudwatch put-metric-alarm \
  --alarm-name "KMS-DecryptionErrors-Prod" \
  --alarm-description "KMS decryption errors for secrets" \
  --metric-name "NumberOfMessagesReceived" \
  --namespace "AWS/KMS" \
  --statistic Sum \
  --period 300 \
  --threshold 1 \
  --comparison-operator GreaterThanOrEqualToThreshold \
  --evaluation-periods 1 \
  --alarm-actions "arn:aws:sns:ap-northeast-1:123456789012:goal-mandala-prod-alerts"
```

### ダッシュボード設定

```bash
# CloudWatchダッシュボードの作成
aws cloudwatch put-dashboard \
  --dashboard-name "SecretsManager-Operations-Prod" \
  --dashboard-body file://dashboard-config.json
```

**dashboard-config.json:**

```json
{
  "widgets": [
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["AWS/SecretsManager", "SuccessfulRequestCount"],
          [".", "ErrorCount"]
        ],
        "period": 300,
        "stat": "Sum",
        "region": "ap-northeast-1",
        "title": "Secrets Manager Request Count"
      }
    },
    {
      "type": "metric",
      "properties": {
        "metrics": [["GoalMandala/SecretsManager", "CacheHitRate"]],
        "period": 300,
        "stat": "Average",
        "region": "ap-northeast-1",
        "title": "Cache Hit Rate"
      }
    }
  ]
}
```

### ログ監視設定

#### 1. エラーログフィルター

```bash
aws logs put-metric-filter \
  --log-group-name "/aws/lambda/goal-mandala-prod-api" \
  --filter-name "SecretsManagerErrors" \
  --filter-pattern "ERROR SecretServiceError" \
  --metric-transformations \
    metricName=SecretsManagerErrorCount,metricNamespace=GoalMandala/SecretsManager,metricValue=1
```

#### 2. 異常アクセスパターンフィルター

```bash
aws logs put-metric-filter \
  --log-group-name "/aws/lambda/goal-mandala-prod-api" \
  --filter-name "HighFrequencyAccess" \
  --filter-pattern "[timestamp, requestId, level=\"INFO\", message=\"Retrieving*secret\"]" \
  --metric-transformations \
    metricName=SecretAccessCount,metricNamespace=GoalMandala/SecretsManager,metricValue=1
```

## メンテナンス

### 定期メンテナンス（月次）

#### 1. シークレットローテーション確認

```bash
#!/bin/bash
# secrets-rotation-check.sh

ENVIRONMENT="prod"
SECRETS=(
  "goal-mandala-${ENVIRONMENT}-secret-database"
  "goal-mandala-${ENVIRONMENT}-secret-jwt"
  "goal-mandala-${ENVIRONMENT}-secret-external-apis"
)

for secret in "${SECRETS[@]}"; do
  echo "Checking rotation for: $secret"

  rotation_info=$(aws secretsmanager describe-secret \
    --secret-id "$secret" \
    --query '{LastRotatedDate:LastRotatedDate,RotationEnabled:RotationEnabled,RotationRules:RotationRules}' \
    --output json)

  echo "$rotation_info" | jq .
  echo "---"
done
```

#### 2. 未使用シークレットのクリーンアップ

```bash
#!/bin/bash
# unused-secrets-cleanup.sh

CUTOFF_DATE=$(date -d '90 days ago' -u +%Y-%m-%dT%H:%M:%S)

aws secretsmanager list-secrets \
  --query "SecretList[?LastAccessedDate < '$CUTOFF_DATE'].Name" \
  --output text | while read secret_name; do

  if [ -n "$secret_name" ]; then
    echo "Found unused secret: $secret_name"
    echo "Last accessed: $(aws secretsmanager describe-secret --secret-id "$secret_name" --query 'LastAccessedDate' --output text)"

    # 手動確認後に削除
    read -p "Delete this secret? (y/N): " confirm
    if [ "$confirm" = "y" ]; then
      aws secretsmanager delete-secret \
        --secret-id "$secret_name" \
        --recovery-window-in-days 30
      echo "Secret scheduled for deletion: $secret_name"
    fi
  fi
done
```

#### 3. KMS暗号化キーのローテーション

```bash
# KMSキーローテーションの有効化確認
aws kms get-key-rotation-status \
  --key-id alias/goal-mandala-prod-secrets-key

# ローテーションが無効の場合は有効化
aws kms enable-key-rotation \
  --key-id alias/goal-mandala-prod-secrets-key
```

### パフォーマンス最適化

#### 1. キャッシュ設定の調整

```typescript
// Lambda関数のキャッシュ設定最適化
const secretService = new SecretService('ap-northeast-1', undefined, {
  ttl: 15 * 60 * 1000, // 15分（本番環境推奨）
  maxSize: 200, // キャッシュサイズ増加
  enableMetrics: true,
});
```

#### 2. 接続プールの最適化

```bash
# Lambda関数の同時実行数制限設定
aws lambda put-provisioned-concurrency-config \
  --function-name goal-mandala-prod-api \
  --provisioned-concurrency-config ProvisionedConcurrencyConfig=100
```

## 緊急時対応

### インシデント対応フロー

#### 1. 緊急度判定

| レベル | 状況                         | 対応時間  |
| ------ | ---------------------------- | --------- |
| P1     | 全シークレットアクセス不可   | 15分以内  |
| P2     | 特定シークレットアクセス不可 | 30分以内  |
| P3     | パフォーマンス劣化           | 1時間以内 |
| P4     | 監視アラート                 | 4時間以内 |

#### 2. P1インシデント対応手順

```bash
#!/bin/bash
# p1-incident-response.sh

echo "=== P1 Incident Response: Secrets Manager Outage ==="

# 1. 現在の状況確認
echo "1. Checking current status..."
aws secretsmanager list-secrets --query 'SecretList[0:5].Name' --output table

# 2. CloudTrailでエラー確認
echo "2. Checking CloudTrail for errors..."
aws logs filter-log-events \
  --log-group-name "/aws/cloudtrail" \
  --start-time $(date -d '1 hour ago' +%s)000 \
  --filter-pattern "{ $.eventName = GetSecretValue && $.errorCode exists }"

# 3. Lambda関数の同時実行数制限を一時的に削除
echo "3. Removing Lambda concurrency limits..."
aws lambda delete-provisioned-concurrency-config \
  --function-name goal-mandala-prod-api

# 4. 緊急時フォールバック設定の有効化
echo "4. Enabling emergency fallback..."
aws lambda update-function-configuration \
  --function-name goal-mandala-prod-api \
  --environment Variables='{EMERGENCY_MODE=true,USE_FALLBACK_SECRETS=true}'

# 5. ヘルスチェック実行
echo "5. Running health check..."
aws lambda invoke \
  --function-name goal-mandala-prod-api \
  --payload '{"httpMethod":"GET","path":"/health"}' \
  response.json

cat response.json
```

#### 3. ロールバック手順

```bash
#!/bin/bash
# rollback-secrets-config.sh

BACKUP_DATE="2024-01-19"

echo "=== Rolling back Secrets Manager configuration ==="

# 1. 前回の正常な設定を復元
echo "1. Restoring previous configuration..."
aws secretsmanager restore-secret \
  --secret-id goal-mandala-prod-secret-database \
  --version-id $(aws secretsmanager list-secret-version-ids \
    --secret-id goal-mandala-prod-secret-database \
    --query "Versions[?CreatedDate<'${BACKUP_DATE}T23:59:59'][0].VersionId" \
    --output text)

# 2. Lambda関数の設定を復元
echo "2. Restoring Lambda configuration..."
aws lambda update-function-configuration \
  --function-name goal-mandala-prod-api \
  --environment Variables='{EMERGENCY_MODE=false,USE_FALLBACK_SECRETS=false}'

# 3. 動作確認
echo "3. Verifying rollback..."
aws lambda invoke \
  --function-name goal-mandala-prod-api \
  --payload '{"httpMethod":"GET","path":"/health"}' \
  rollback-test.json

if grep -q '"statusCode":200' rollback-test.json; then
  echo "✅ Rollback successful"
else
  echo "❌ Rollback failed"
  cat rollback-test.json
fi
```

### 通信・エスカレーション

#### 1. 緊急連絡先

```bash
# Slack通知
curl -X POST -H 'Content-type: application/json' \
  --data '{"text":"🚨 P1 Incident: Secrets Manager outage detected"}' \
  $SLACK_WEBHOOK_URL

# メール通知
aws sns publish \
  --topic-arn "arn:aws:sns:ap-northeast-1:123456789012:goal-mandala-prod-alerts" \
  --message "P1 Incident: Secrets Manager outage detected" \
  --subject "URGENT: Production Secrets Manager Issue"
```

#### 2. エスカレーション手順

1. **15分以内**: 開発チームリーダーに連絡
2. **30分以内**: CTO/技術責任者に連絡
3. **1時間以内**: 経営陣に状況報告

## バックアップ・復旧

### 自動バックアップ設定

```bash
#!/bin/bash
# setup-secrets-backup.sh

# 1. バックアップ用S3バケットの作成
aws s3 mb s3://goal-mandala-secrets-backup-prod \
  --region ap-northeast-1

# 2. バックアップ用Lambda関数のデプロイ
aws lambda create-function \
  --function-name goal-mandala-secrets-backup \
  --runtime nodejs18.x \
  --role arn:aws:iam::123456789012:role/lambda-secrets-backup-role \
  --handler index.handler \
  --zip-file fileb://secrets-backup-function.zip

# 3. 日次バックアップスケジュールの設定
aws events put-rule \
  --name secrets-backup-daily \
  --schedule-expression "cron(0 2 * * ? *)"

aws events put-targets \
  --rule secrets-backup-daily \
  --targets "Id"="1","Arn"="arn:aws:lambda:ap-northeast-1:123456789012:function:goal-mandala-secrets-backup"
```

### 手動バックアップ

```bash
#!/bin/bash
# manual-secrets-backup.sh

BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="secrets-backup-${BACKUP_DATE}"

mkdir -p "$BACKUP_DIR"

# 全シークレットのメタデータをバックアップ
aws secretsmanager list-secrets \
  --query 'SecretList[*].{Name:Name,Description:Description,LastChangedDate:LastChangedDate}' \
  --output json > "${BACKUP_DIR}/secrets-metadata.json"

# 各シークレットの設定をバックアップ（値は除く）
while read -r secret_name; do
  if [ -n "$secret_name" ]; then
    echo "Backing up configuration for: $secret_name"

    aws secretsmanager describe-secret \
      --secret-id "$secret_name" \
      --output json > "${BACKUP_DIR}/${secret_name//\//_}-config.json"
  fi
done < <(aws secretsmanager list-secrets --query 'SecretList[*].Name' --output text | tr '\t' '\n')

# バックアップをS3にアップロード
tar -czf "${BACKUP_DIR}.tar.gz" "$BACKUP_DIR"
aws s3 cp "${BACKUP_DIR}.tar.gz" "s3://goal-mandala-secrets-backup-prod/manual-backups/"

echo "Backup completed: ${BACKUP_DIR}.tar.gz"
```

### 災害復旧手順

```bash
#!/bin/bash
# disaster-recovery.sh

BACKUP_FILE="$1"
TARGET_REGION="ap-northeast-1"

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: $0 <backup-file>"
  exit 1
fi

echo "=== Disaster Recovery: Restoring Secrets Manager ==="

# 1. バックアップファイルの展開
tar -xzf "$BACKUP_FILE"
BACKUP_DIR=$(basename "$BACKUP_FILE" .tar.gz)

# 2. KMS暗号化キーの復元
echo "1. Restoring KMS encryption key..."
aws kms create-key \
  --description "Restored encryption key for Secrets Manager" \
  --key-usage ENCRYPT_DECRYPT \
  --key-spec SYMMETRIC_DEFAULT

KEY_ID=$(aws kms list-keys --query 'Keys[-1].KeyId' --output text)

aws kms create-alias \
  --alias-name alias/goal-mandala-prod-secrets-key-restored \
  --target-key-id "$KEY_ID"

# 3. シークレットの復元（構造のみ、値は手動設定が必要）
echo "2. Restoring secret structures..."
for config_file in "${BACKUP_DIR}"/*-config.json; do
  if [ -f "$config_file" ]; then
    secret_name=$(jq -r '.Name' "$config_file")
    description=$(jq -r '.Description' "$config_file")

    echo "Restoring secret: $secret_name"

    # 新しいシークレットを作成（値は仮）
    aws secretsmanager create-secret \
      --name "$secret_name" \
      --description "$description" \
      --secret-string '{"placeholder":"restore-required"}' \
      --kms-key-id "$KEY_ID"
  fi
done

echo "3. Manual intervention required:"
echo "   - Update secret values manually"
echo "   - Verify IAM permissions"
echo "   - Test application connectivity"
```

## セキュリティ運用

### セキュリティ監査（月次）

```bash
#!/bin/bash
# security-audit.sh

echo "=== Monthly Security Audit ==="

# 1. IAM権限の確認
echo "1. Checking IAM permissions..."
aws iam simulate-principal-policy \
  --policy-source-arn "arn:aws:iam::123456789012:role/goal-mandala-prod-lambda-secrets-role" \
  --action-names secretsmanager:GetSecretValue \
  --resource-arns "arn:aws:secretsmanager:ap-northeast-1:123456789012:secret:goal-mandala-prod-secret-database-*"

# 2. 不正アクセスの確認
echo "2. Checking for unauthorized access..."
aws logs filter-log-events \
  --log-group-name "/aws/cloudtrail" \
  --start-time $(date -d '30 days ago' +%s)000 \
  --filter-pattern "{ $.eventName = GetSecretValue && $.errorCode = AccessDenied }"

# 3. 異常なアクセスパターンの確認
echo "3. Checking for unusual access patterns..."
aws logs insights start-query \
  --log-group-name "/aws/cloudtrail" \
  --start-time $(date -d '30 days ago' +%s) \
  --end-time $(date +%s) \
  --query-string 'fields @timestamp, sourceIPAddress, userIdentity.type | filter eventName = "GetSecretValue" | stats count() by sourceIPAddress | sort count desc | limit 10'

# 4. KMS暗号化キーの使用状況確認
echo "4. Checking KMS key usage..."
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=ResourceName,AttributeValue=goal-mandala-prod-secrets-key \
  --start-time $(date -d '30 days ago' -u +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S)
```

### 脆弱性スキャン

```bash
#!/bin/bash
# vulnerability-scan.sh

echo "=== Vulnerability Scan ==="

# 1. 依存関係の脆弱性チェック
echo "1. Checking dependencies..."
cd packages/backend
npm audit --audit-level moderate

# 2. Lambda関数のセキュリティ設定確認
echo "2. Checking Lambda security configuration..."
aws lambda get-function-configuration \
  --function-name goal-mandala-prod-api \
  --query '{Runtime:Runtime,Environment:Environment,Role:Role,VpcConfig:VpcConfig}'

# 3. Secrets Managerの設定確認
echo "3. Checking Secrets Manager configuration..."
aws secretsmanager list-secrets \
  --query 'SecretList[*].{Name:Name,KmsKeyId:KmsKeyId,RotationEnabled:RotationEnabled}' \
  --output table
```

## 運用自動化

### 運用スクリプトの配置

```bash
# 運用スクリプト用ディレクトリの作成
mkdir -p /opt/goal-mandala/operations/scripts

# スクリプトの配置
cp secrets-rotation-check.sh /opt/goal-mandala/operations/scripts/
cp security-audit.sh /opt/goal-mandala/operations/scripts/
cp manual-secrets-backup.sh /opt/goal-mandala/operations/scripts/

# 実行権限の設定
chmod +x /opt/goal-mandala/operations/scripts/*.sh
```

### Cron設定

```bash
# crontabの設定
crontab -e

# 以下を追加
# 日次ヘルスチェック（毎日9:00）
0 9 * * * /opt/goal-mandala/operations/scripts/daily-health-check.sh

# 週次セキュリティチェック（毎週月曜9:00）
0 9 * * 1 /opt/goal-mandala/operations/scripts/security-audit.sh

# 月次バックアップ（毎月1日2:00）
0 2 1 * * /opt/goal-mandala/operations/scripts/manual-secrets-backup.sh
```

## 運用メトリクス

### KPI設定

| メトリクス               | 目標値    | 測定方法           |
| ------------------------ | --------- | ------------------ |
| シークレット取得成功率   | 99.9%以上 | CloudWatch Metrics |
| 平均レスポンス時間       | 100ms以下 | Lambda Duration    |
| キャッシュヒット率       | 80%以上   | カスタムメトリクス |
| セキュリティインシデント | 0件/月    | 手動カウント       |
| ローテーション成功率     | 100%      | CloudWatch Events  |

### レポート生成

```bash
#!/bin/bash
# generate-monthly-report.sh

REPORT_DATE=$(date +%Y-%m)
REPORT_FILE="secrets-manager-report-${REPORT_DATE}.md"

cat > "$REPORT_FILE" << EOF
# Secrets Manager 運用レポート - ${REPORT_DATE}

## サマリー

- 稼働率: $(calculate_uptime)%
- 総リクエスト数: $(get_total_requests)
- エラー率: $(calculate_error_rate)%
- セキュリティインシデント: 0件

## 詳細メトリクス

### パフォーマンス
- 平均レスポンス時間: $(get_avg_response_time)ms
- キャッシュヒット率: $(get_cache_hit_rate)%

### セキュリティ
- 不正アクセス試行: $(get_unauthorized_attempts)件
- ローテーション実行: $(get_rotation_count)回

## 改善提案

$(generate_recommendations)

EOF

echo "Report generated: $REPORT_FILE"
```

## 関連ドキュメント

- [API仕様書](./secrets-manager-api-specification.md)
- [トラブルシューティングガイド](./secrets-manager-troubleshooting-guide.md)
- [セキュリティ設定ガイド](./secrets-manager-security-guide.md)
- [統合テストガイド](./secrets-manager-integration-tests.md)

## 連絡先

### 運用チーム

- **プライマリ**: <operations@goal-mandala.com>
- **セカンダリ**: <devops@goal-mandala.com>
- **緊急時**: +81-XX-XXXX-XXXX

### エスカレーション

- **Level 1**: 運用チーム（即座に対応）
- **Level 2**: 開発チーム（30分以内）
- **Level 3**: 技術責任者（1時間以内）
