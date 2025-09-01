# フロントエンド配信環境 セキュリティガイド

## 概要

CloudFront + S3構成におけるセキュリティ設定とベストプラクティスについて説明します。

## セキュリティアーキテクチャ

### 多層防御戦略

```
インターネット
    ↓
[WAF] ← オプション
    ↓
[CloudFront]
    ↓ (OAC)
[S3バケット]
```

### セキュリティコンポーネント

1. **Origin Access Control (OAC)**: S3への直接アクセス制限
2. **SSL/TLS証明書**: 通信の暗号化
3. **セキュリティヘッダー**: ブラウザセキュリティ機能の有効化
4. **バケットポリシー**: S3アクセス制御
5. **IAMロール**: 最小権限の原則

## SSL/TLS設定

### 1. ACM証明書の設定

#### 証明書の作成

```bash
# ACM証明書の作成（us-east-1リージョン必須）
aws acm request-certificate \
  --domain-name goal-mandala.example.com \
  --subject-alternative-names "*.goal-mandala.example.com" \
  --validation-method DNS \
  --region us-east-1
```

#### DNS検証の設定

```bash
# 検証レコードの取得
aws acm describe-certificate \
  --certificate-arn {証明書ARN} \
  --region us-east-1

# Route53での検証レコード追加
aws route53 change-resource-record-sets \
  --hosted-zone-id {ゾーンID} \
  --change-batch file://validation-record.json
```

#### 証明書の自動更新

```json
{
  "Comment": "ACM証明書の自動更新設定",
  "Changes": [
    {
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "_amazonses.goal-mandala.example.com",
        "Type": "TXT",
        "TTL": 300,
        "ResourceRecords": [
          {
            "Value": "\"certificate-validation-value\""
          }
        ]
      }
    }
  ]
}
```

### 2. TLS設定の強化

#### 最小TLSバージョンの設定

```typescript
// CDKでのTLS設定
const distribution = new cloudfront.Distribution(this, 'Distribution', {
  defaultBehavior: {
    // ...
    viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
  },
  minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
});
```

#### 暗号化スイートの制限

```bash
# 強力な暗号化スイートのみを許可
aws cloudfront update-distribution \
  --id {ディストリビューションID} \
  --distribution-config file://tls-security-config.json
```

## Origin Access Control (OAC)

### 1. OACの設定

#### OACの作成

```typescript
// CDKでのOAC設定
const oac = new cloudfront.OriginAccessControl(this, 'OAC', {
  originAccessControlName: `${serviceName}-${environment}-oac`,
  description: 'OAC for S3 bucket access',
  originAccessControlOriginType: cloudfront.OriginAccessControlOriginType.S3,
  signingBehavior: cloudfront.OriginAccessControlSigningBehavior.ALWAYS,
  signingProtocol: cloudfront.OriginAccessControlSigningProtocol.SIGV4,
});
```

#### S3バケットポリシーの設定

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowCloudFrontServicePrincipal",
      "Effect": "Allow",
      "Principal": {
        "Service": "cloudfront.amazonaws.com"
      },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::bucket-name/*",
      "Condition": {
        "StringEquals": {
          "AWS:SourceArn": "arn:aws:cloudfront::account-id:distribution/distribution-id"
        }
      }
    }
  ]
}
```

### 2. 直接アクセスの防止

#### S3パブリックアクセスブロック

```typescript
// CDKでのパブリックアクセスブロック
const bucket = new s3.Bucket(this, 'FrontendBucket', {
  bucketName: bucketName,
  blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
  encryption: s3.BucketEncryption.S3_MANAGED,
  enforceSSL: true,
});
```

#### アクセステスト

```bash
# 直接S3アクセスが拒否されることを確認
curl -I https://{バケット名}.s3.amazonaws.com/index.html
# 期待される結果: 403 Forbidden

# CloudFront経由のアクセスが成功することを確認
curl -I https://{CloudFrontドメイン}/index.html
# 期待される結果: 200 OK
```

## セキュリティヘッダー

### 1. Response Headers Policyの設定

#### 基本セキュリティヘッダー

```typescript
// CDKでのセキュリティヘッダー設定
const responseHeadersPolicy = new cloudfront.ResponseHeadersPolicy(this, 'SecurityHeaders', {
  responseHeadersPolicyName: `${serviceName}-${environment}-security-headers`,
  securityHeadersBehavior: {
    strictTransportSecurity: {
      accessControlMaxAge: Duration.seconds(31536000), // 1年
      includeSubdomains: true,
      preload: true,
      override: true,
    },
    contentTypeOptions: {
      override: true,
    },
    frameOptions: {
      frameOption: cloudfront.FrameOptions.DENY,
      override: true,
    },
    referrerPolicy: {
      referrerPolicy: cloudfront.ReferrerPolicyHeaderValue.STRICT_ORIGIN_WHEN_CROSS_ORIGIN,
      override: true,
    },
  },
});
```

#### Content Security Policy (CSP)

```typescript
// CSPヘッダーの設定
const responseHeadersPolicy = new cloudfront.ResponseHeadersPolicy(this, 'SecurityHeaders', {
  customHeadersBehavior: {
    customHeaders: [
      {
        header: 'Content-Security-Policy',
        value:
          "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://api.goal-mandala.example.com;",
        override: true,
      },
      {
        header: 'X-Content-Security-Policy',
        value: "default-src 'self'",
        override: true,
      },
    ],
  },
});
```

### 2. セキュリティヘッダーの検証

#### 自動テスト

```bash
#!/bin/bash
# security-headers-test.sh

DOMAIN="https://goal-mandala.example.com"

echo "Testing security headers for $DOMAIN"

# HSTS ヘッダーの確認
hsts=$(curl -s -I $DOMAIN | grep -i "strict-transport-security")
if [ -z "$hsts" ]; then
  echo "❌ HSTS header is missing"
else
  echo "✅ HSTS header found: $hsts"
fi

# X-Content-Type-Options の確認
content_type=$(curl -s -I $DOMAIN | grep -i "x-content-type-options")
if [ -z "$content_type" ]; then
  echo "❌ X-Content-Type-Options header is missing"
else
  echo "✅ X-Content-Type-Options header found: $content_type"
fi

# X-Frame-Options の確認
frame_options=$(curl -s -I $DOMAIN | grep -i "x-frame-options")
if [ -z "$frame_options" ]; then
  echo "❌ X-Frame-Options header is missing"
else
  echo "✅ X-Frame-Options header found: $frame_options"
fi

# Referrer-Policy の確認
referrer_policy=$(curl -s -I $DOMAIN | grep -i "referrer-policy")
if [ -z "$referrer_policy" ]; then
  echo "❌ Referrer-Policy header is missing"
else
  echo "✅ Referrer-Policy header found: $referrer_policy"
fi
```

#### セキュリティスキャンツール

```bash
# Mozilla Observatory でのセキュリティスキャン
curl -X POST https://http-observatory.security.mozilla.org/api/v1/analyze \
  -d "host=goal-mandala.example.com" \
  -d "rescan=true"

# SSL Labs でのSSL/TLSテスト
curl "https://api.ssllabs.com/api/v3/analyze?host=goal-mandala.example.com&publish=off&startNew=on"
```

## アクセス制御

### 1. IAMロールとポリシー

#### 最小権限の原則

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::goal-mandala-frontend-bucket/*"
    },
    {
      "Effect": "Allow",
      "Action": ["cloudfront:CreateInvalidation"],
      "Resource": "arn:aws:cloudfront::*:distribution/*"
    }
  ]
}
```

#### デプロイ用IAMロール

```typescript
// CDKでのデプロイ用IAMロール
const deployRole = new iam.Role(this, 'DeployRole', {
  roleName: `${serviceName}-${environment}-deploy-role`,
  assumedBy: new iam.ServicePrincipal('codebuild.amazonaws.com'),
  inlinePolicies: {
    DeployPolicy: new iam.PolicyDocument({
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ['s3:GetObject', 's3:PutObject', 's3:DeleteObject', 's3:ListBucket'],
          resources: [bucket.bucketArn, `${bucket.bucketArn}/*`],
        }),
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ['cloudfront:CreateInvalidation'],
          resources: [`arn:aws:cloudfront::${this.account}:distribution/*`],
        }),
      ],
    }),
  },
});
```

### 2. S3バケットセキュリティ

#### バケット暗号化

```typescript
// CDKでのS3暗号化設定
const bucket = new s3.Bucket(this, 'FrontendBucket', {
  encryption: s3.BucketEncryption.S3_MANAGED,
  enforceSSL: true,
  versioned: true,
  lifecycleRules: [
    {
      id: 'DeleteOldVersions',
      enabled: true,
      noncurrentVersionExpiration: Duration.days(30),
    },
  ],
});
```

#### バケット通知設定

```typescript
// セキュリティイベントの通知
bucket.addEventNotification(s3.EventType.OBJECT_CREATED, new s3n.SnsDestination(securityTopic), {
  prefix: 'suspicious/',
});
```

## Web Application Firewall (WAF)

### 1. WAFの設定（オプション）

#### 基本的なWAFルール

```typescript
// CDKでのWAF設定
const webAcl = new wafv2.CfnWebACL(this, 'WebACL', {
  scope: 'CLOUDFRONT',
  defaultAction: { allow: {} },
  rules: [
    {
      name: 'AWSManagedRulesCommonRuleSet',
      priority: 1,
      overrideAction: { none: {} },
      statement: {
        managedRuleGroupStatement: {
          vendorName: 'AWS',
          name: 'AWSManagedRulesCommonRuleSet',
        },
      },
      visibilityConfig: {
        sampledRequestsEnabled: true,
        cloudWatchMetricsEnabled: true,
        metricName: 'CommonRuleSetMetric',
      },
    },
    {
      name: 'RateLimitRule',
      priority: 2,
      action: { block: {} },
      statement: {
        rateBasedStatement: {
          limit: 2000,
          aggregateKeyType: 'IP',
        },
      },
      visibilityConfig: {
        sampledRequestsEnabled: true,
        cloudWatchMetricsEnabled: true,
        metricName: 'RateLimitMetric',
      },
    },
  ],
});
```

#### CloudFrontとWAFの関連付け

```typescript
// ディストリビューションにWAFを関連付け
const distribution = new cloudfront.Distribution(this, 'Distribution', {
  webAclId: webAcl.attrArn,
  // その他の設定...
});
```

### 2. WAFログとモニタリング

#### WAFログの設定

```bash
# WAFログの有効化
aws wafv2 put-logging-configuration \
  --resource-arn {WebACL-ARN} \
  --log-destination-configs arn:aws:logs:region:account:log-group:aws-waf-logs-cloudfront
```

#### 異常検知アラート

```bash
# 高いブロック率のアラーム
aws cloudwatch put-metric-alarm \
  --alarm-name "HighWAFBlockRate" \
  --alarm-description "High WAF block rate detected" \
  --metric-name BlockedRequests \
  --namespace AWS/WAFV2 \
  --statistic Sum \
  --period 300 \
  --threshold 100 \
  --comparison-operator GreaterThanThreshold
```

## セキュリティ監視

### 1. CloudTrailログ

#### API呼び出しの監視

```typescript
// CDKでのCloudTrail設定
const trail = new cloudtrail.Trail(this, 'SecurityTrail', {
  bucket: auditBucket,
  includeGlobalServiceEvents: true,
  isMultiRegionTrail: true,
  enableFileValidation: true,
});

// S3とCloudFrontのイベントを記録
trail.addS3EventSelector([
  {
    bucket: frontendBucket,
    objectPrefix: '',
  },
]);
```

#### 異常なAPI呼び出しの検知

```bash
# 異常なS3アクセスの検知
aws logs filter-log-events \
  --log-group-name CloudTrail/S3DataEvents \
  --filter-pattern '{ $.eventName = "GetObject" && $.sourceIPAddress != "CloudFront" }'
```

### 2. アクセスログ分析

#### S3アクセスログの設定

```typescript
// CDKでのアクセスログ設定
const accessLogsBucket = new s3.Bucket(this, 'AccessLogsBucket', {
  bucketName: `${serviceName}-${environment}-access-logs`,
  lifecycleRules: [
    {
      id: 'DeleteOldLogs',
      enabled: true,
      expiration: Duration.days(90),
    },
  ],
});

frontendBucket.addToResourcePolicy(
  new iam.PolicyStatement({
    effect: iam.Effect.ALLOW,
    principals: [new iam.ServicePrincipal('logging.s3.amazonaws.com')],
    actions: ['s3:PutObject'],
    resources: [`${accessLogsBucket.bucketArn}/*`],
  })
);
```

#### ログ分析スクリプト

```bash
#!/bin/bash
# analyze-access-logs.sh

LOG_BUCKET="goal-mandala-access-logs"
DATE=$(date -d "yesterday" +%Y-%m-%d)

# 昨日のアクセスログをダウンロード
aws s3 sync s3://$LOG_BUCKET/$DATE/ ./logs/

# 異常なアクセスパターンを検索
echo "Analyzing access patterns for $DATE"

# 大量リクエストのIPを特定
awk '{print $3}' logs/*.log | sort | uniq -c | sort -nr | head -10

# 404エラーの多いパスを特定
awk '$9=="404" {print $7}' logs/*.log | sort | uniq -c | sort -nr | head -10

# 異常なUser-Agentを特定
awk -F'"' '{print $6}' logs/*.log | sort | uniq -c | sort -nr | head -10
```

## インシデント対応

### 1. セキュリティインシデント対応手順

#### レベル1: 疑わしい活動の検知

```bash
# 1. 即座のログ収集
aws logs create-export-task \
  --log-group-name /aws/cloudfront/distribution/{distribution-id} \
  --from $(date -d "1 hour ago" +%s)000 \
  --to $(date +%s)000 \
  --destination s3://{incident-logs-bucket}/$(date +%Y%m%d-%H%M%S)/

# 2. 現在のアクセス状況確認
aws cloudwatch get-metric-statistics \
  --namespace AWS/CloudFront \
  --metric-name Requests \
  --dimensions Name=DistributionId,Value={distribution-id} \
  --start-time $(date -d "1 hour ago" --iso-8601) \
  --end-time $(date --iso-8601) \
  --period 300 \
  --statistics Sum
```

#### レベル2: 攻撃の確認

```bash
# 1. WAFルールの緊急追加
aws wafv2 update-web-acl \
  --scope CLOUDFRONT \
  --id {web-acl-id} \
  --lock-token {lock-token} \
  --rules file://emergency-block-rules.json

# 2. 特定IPの即座ブロック
aws wafv2 create-ip-set \
  --scope CLOUDFRONT \
  --name EmergencyBlockList \
  --addresses {攻撃元IP}/32
```

#### レベル3: 全面的な対応

```bash
# 1. CloudFrontディストリビューションの一時停止
aws cloudfront update-distribution \
  --id {distribution-id} \
  --distribution-config file://disabled-distribution.json

# 2. メンテナンスページの表示
aws s3 cp maintenance.html s3://{bucket-name}/index.html

# 3. 緊急連絡先への通知
aws sns publish \
  --topic-arn arn:aws:sns:region:account:security-alerts \
  --message "Security incident detected. Distribution temporarily disabled."
```

### 2. 復旧手順

#### 安全性確認後の復旧

```bash
# 1. 脆弱性の修正確認
./scripts/security-scan.sh

# 2. 段階的な復旧
aws cloudfront update-distribution \
  --id {distribution-id} \
  --distribution-config file://secure-distribution.json

# 3. 監視強化
aws cloudwatch put-metric-alarm \
  --alarm-name "PostIncidentMonitoring" \
  --metric-name Requests \
  --threshold 1000 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1
```

## セキュリティベストプラクティス

### 1. 定期的なセキュリティ監査

#### 月次セキュリティチェック

```bash
#!/bin/bash
# monthly-security-audit.sh

echo "=== Monthly Security Audit ==="

# 1. SSL証明書の有効期限確認
aws acm describe-certificate --certificate-arn {cert-arn} \
  --query 'Certificate.NotAfter' --output text

# 2. S3バケットのパブリックアクセス確認
aws s3api get-public-access-block --bucket {bucket-name}

# 3. IAMポリシーの最終更新日確認
aws iam list-policies --scope Local \
  --query 'Policies[?contains(PolicyName, `frontend`)].UpdateDate'

# 4. CloudTrailログの整合性確認
aws cloudtrail validate-logs \
  --trail-arn {trail-arn} \
  --start-time $(date -d "30 days ago" --iso-8601)

echo "Security audit completed"
```

### 2. 自動化されたセキュリティテスト

#### CI/CDパイプラインでのセキュリティテスト

```yaml
# .github/workflows/security-test.yml
name: Security Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Run security headers test
        run: |
          ./scripts/security-headers-test.sh

      - name: SSL/TLS configuration test
        run: |
          ./scripts/ssl-test.sh

      - name: Dependency vulnerability scan
        run: |
          npm audit --audit-level high

      - name: Infrastructure security scan
        run: |
          cdk-nag --app "npx ts-node packages/infrastructure/src/index.ts"
```

### 3. セキュリティ設定の文書化

#### セキュリティ設定チェックリスト

- [ ] SSL/TLS証明書が正しく設定されている
- [ ] 最小TLSバージョンがv1.2以上に設定されている
- [ ] OACが正しく設定されS3への直接アクセスが制限されている
- [ ] セキュリティヘッダーが適切に設定されている
- [ ] S3バケットのパブリックアクセスがブロックされている
- [ ] IAMロールが最小権限の原則に従っている
- [ ] CloudTrailログが有効になっている
- [ ] CloudWatchアラームが設定されている
- [ ] 定期的なセキュリティ監査が実施されている
- [ ] インシデント対応手順が文書化されている

## 参考資料

- [AWS CloudFront セキュリティベストプラクティス](https://docs.aws.amazon.com/cloudfront/latest/DeveloperGuide/security.html)
- [AWS S3 セキュリティベストプラクティス](https://docs.aws.amazon.com/s3/latest/userguide/security-best-practices.html)
- [OWASP セキュアヘッダープロジェクト](https://owasp.org/www-project-secure-headers/)
- [Mozilla セキュリティガイドライン](https://infosec.mozilla.org/guidelines/web_security)
- [AWS WAF 開発者ガイド](https://docs.aws.amazon.com/waf/latest/developerguide/)
