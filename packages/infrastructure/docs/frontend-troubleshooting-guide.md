# フロントエンド配信環境 トラブルシューティングガイド

## 概要

CloudFront + S3構成でのフロントエンド配信環境における一般的な問題と解決方法について説明します。

## 問題分類と対応フロー

### 1. アクセス関連の問題

#### 問題: サイトにアクセスできない

**症状**

- ブラウザでサイトが表示されない
- タイムアウトエラーが発生
- DNS解決エラー

**診断手順**

```bash
# 1. DNS解決の確認
nslookup {ドメイン名}
dig {ドメイン名}

# 2. CloudFrontの状態確認
aws cloudfront get-distribution --id {ディストリビューションID}

# 3. S3バケットの状態確認
aws s3 ls s3://{バケット名}/
```

**解決方法**

1. **DNS問題の場合**

   ```bash
   # Route53レコードの確認
   aws route53 list-resource-record-sets --hosted-zone-id {ゾーンID}
   ```

2. **CloudFront問題の場合**

   ```bash
   # ディストリビューションの再デプロイ
   aws cloudfront update-distribution --id {ディストリビューションID} \
     --distribution-config file://distribution-config.json
   ```

3. **S3問題の場合**

   ```bash
   # バケットポリシーの確認
   aws s3api get-bucket-policy --bucket {バケット名}
   ```

#### 問題: 403 Forbidden エラー

**症状**

- ページアクセス時に403エラー
- 特定のファイルのみアクセス不可

**診断手順**

```bash
# 1. S3バケットポリシーの確認
aws s3api get-bucket-policy --bucket {バケット名}

# 2. OAC設定の確認
aws cloudfront get-origin-access-control --id {OAC-ID}

# 3. ファイルの存在確認
aws s3 ls s3://{バケット名}/{ファイルパス}
```

**解決方法**

1. **バケットポリシーの修正**

   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Principal": {
           "Service": "cloudfront.amazonaws.com"
         },
         "Action": "s3:GetObject",
         "Resource": "arn:aws:s3:::bucket-name/*",
         "Condition": {
           "StringEquals": {
             "AWS:SourceArn": "arn:aws:cloudfront::account:distribution/distribution-id"
           }
         }
       }
     ]
   }
   ```

2. **OAC設定の確認と修正**

   ```bash
   # OACの再作成
   aws cloudfront create-origin-access-control \
     --origin-access-control-config file://oac-config.json
   ```

#### 問題: 404 Not Found エラー

**症状**

- 存在するはずのページで404エラー
- SPAルーティングが動作しない

**診断手順**

```bash
# 1. ファイルの存在確認
aws s3 ls s3://{バケット名}/ --recursive | grep {ファイル名}

# 2. CloudFrontエラーページ設定の確認
aws cloudfront get-distribution-config --id {ディストリビューションID}
```

**解決方法**

1. **ファイルが存在しない場合**

   ```bash
   # ファイルの再アップロード
   aws s3 cp {ローカルファイル} s3://{バケット名}/{ファイルパス}
   ```

2. **SPAルーティング問題の場合**

   ```bash
   # エラーページ設定の追加
   aws cloudfront update-distribution \
     --id {ディストリビューションID} \
     --distribution-config file://spa-error-config.json
   ```

### 2. パフォーマンス関連の問題

#### 問題: ページロードが遅い

**症状**

- 初回アクセスが3秒以上かかる
- 静的ファイルの読み込みが遅い

**診断手順**

```bash
# 1. キャッシュヒット率の確認
aws cloudwatch get-metric-statistics \
  --namespace AWS/CloudFront \
  --metric-name CacheHitRate \
  --dimensions Name=DistributionId,Value={ディストリビューションID} \
  --start-time {開始時刻} \
  --end-time {終了時刻} \
  --period 3600 \
  --statistics Average

# 2. オリジンレスポンス時間の確認
aws cloudwatch get-metric-statistics \
  --namespace AWS/CloudFront \
  --metric-name OriginLatency \
  --dimensions Name=DistributionId,Value={ディストリビューションID} \
  --start-time {開始時刻} \
  --end-time {終了時刻} \
  --period 3600 \
  --statistics Average
```

**解決方法**

1. **キャッシュ設定の最適化**

   ```bash
   # キャッシュポリシーの更新
   aws cloudfront update-distribution \
     --id {ディストリビューションID} \
     --distribution-config file://optimized-cache-config.json
   ```

2. **ファイル圧縮の有効化**

   ```bash
   # 圧縮設定の確認と有効化
   aws cloudfront get-distribution-config --id {ディストリビューションID}
   ```

3. **価格クラスの見直し**

   ```bash
   # より多くのエッジロケーションを使用
   aws cloudfront update-distribution \
     --id {ディストリビューションID} \
     --distribution-config file://price-class-all-config.json
   ```

#### 問題: キャッシュが効いていない

**症状**

- キャッシュヒット率が低い（80%未満）
- 同じファイルに何度もオリジンアクセス

**診断手順**

```bash
# 1. キャッシュポリシーの確認
aws cloudfront get-cache-policy --id {キャッシュポリシーID}

# 2. リクエストヘッダーの確認
curl -I https://{ドメイン名}/{ファイルパス}
```

**解決方法**

1. **キャッシュポリシーの修正**

   ```json
   {
     "CachePolicyConfig": {
       "Name": "OptimizedCaching",
       "DefaultTTL": 86400,
       "MaxTTL": 31536000,
       "MinTTL": 0,
       "ParametersInCacheKeyAndForwardedToOrigin": {
         "EnableAcceptEncodingGzip": true,
         "EnableAcceptEncodingBrotli": true,
         "QueryStringsConfig": {
           "QueryStringBehavior": "none"
         },
         "HeadersConfig": {
           "HeaderBehavior": "none"
         },
         "CookiesConfig": {
           "CookieBehavior": "none"
         }
       }
     }
   }
   ```

2. **Cache-Controlヘッダーの設定**

   ```bash
   # S3オブジェクトのメタデータ更新
   aws s3 cp s3://{バケット名}/{ファイル} s3://{バケット名}/{ファイル} \
     --metadata-directive REPLACE \
     --cache-control "public, max-age=31536000"
   ```

### 3. SSL/TLS関連の問題

#### 問題: SSL証明書エラー

**症状**

- ブラウザでSSL警告が表示
- 証明書が無効または期限切れ

**診断手順**

```bash
# 1. 証明書の状態確認
aws acm describe-certificate --certificate-arn {証明書ARN}

# 2. 証明書の検証状態確認
openssl s_client -connect {ドメイン名}:443 -servername {ドメイン名}

# 3. CloudFrontの証明書設定確認
aws cloudfront get-distribution-config --id {ディストリビューションID}
```

**解決方法**

1. **証明書の再発行**

   ```bash
   # 新しい証明書の作成
   aws acm request-certificate \
     --domain-name {ドメイン名} \
     --validation-method DNS \
     --region us-east-1
   ```

2. **DNS検証の完了**

   ```bash
   # 検証レコードの追加
   aws route53 change-resource-record-sets \
     --hosted-zone-id {ゾーンID} \
     --change-batch file://validation-record.json
   ```

3. **CloudFrontの証明書更新**

   ```bash
   # ディストリビューションの証明書更新
   aws cloudfront update-distribution \
     --id {ディストリビューションID} \
     --distribution-config file://updated-cert-config.json
   ```

#### 問題: Mixed Content エラー

**症状**

- HTTPSページでHTTPリソースが読み込まれない
- ブラウザコンソールにMixed Contentエラー

**診断手順**

```bash
# 1. HTMLファイル内のHTTPリンクを検索
grep -r "http://" packages/frontend/dist/

# 2. セキュリティヘッダーの確認
curl -I https://{ドメイン名}
```

**解決方法**

1. **HTTPリンクをHTTPSに変更**

   ```bash
   # ファイル内のHTTPリンクを一括置換
   find packages/frontend/dist/ -name "*.html" -exec sed -i 's/http:\/\//https:\/\//g' {} \;
   ```

2. **Content Security Policyの設定**

   ```bash
   # セキュリティヘッダーの追加
   aws cloudfront update-distribution \
     --id {ディストリビューションID} \
     --distribution-config file://csp-config.json
   ```

### 4. デプロイ関連の問題

#### 問題: デプロイ後に変更が反映されない

**症状**

- ファイルを更新してもブラウザで古いバージョンが表示
- キャッシュ無効化が効かない

**診断手順**

```bash
# 1. S3のファイル更新時刻確認
aws s3 ls s3://{バケット名}/ --recursive

# 2. CloudFrontキャッシュ無効化の状態確認
aws cloudfront list-invalidations --distribution-id {ディストリビューションID}

# 3. ブラウザキャッシュの確認
curl -H "Cache-Control: no-cache" https://{ドメイン名}/{ファイルパス}
```

**解決方法**

1. **強制キャッシュ無効化**

   ```bash
   # 全ファイルのキャッシュ無効化
   aws cloudfront create-invalidation \
     --distribution-id {ディストリビューションID} \
     --paths "/*"
   ```

2. **ファイルの再アップロード**

   ```bash
   # ファイルの強制上書き
   aws s3 sync packages/frontend/dist/ s3://{バケット名}/ \
     --delete \
     --cache-control "no-cache"
   ```

3. **バージョニングの実装**

   ```bash
   # ファイル名にハッシュを追加
   # webpack/viteの設定でファイル名にハッシュを含める
   ```

#### 問題: CDKデプロイが失敗する

**症状**

- `cdk deploy`コマンドでエラーが発生
- スタックの更新が途中で停止

**診断手順**

```bash
# 1. CloudFormationスタックの状態確認
aws cloudformation describe-stacks --stack-name {スタック名}

# 2. CloudFormationイベントの確認
aws cloudformation describe-stack-events --stack-name {スタック名}

# 3. CDK差分の確認
pnpm cdk diff FrontendStack-{環境名}
```

**解決方法**

1. **リソースの手動削除**

   ```bash
   # 問題のあるリソースを手動削除
   aws cloudfront delete-distribution --id {ディストリビューションID}
   ```

2. **スタックのロールバック**

   ```bash
   # 前の安定状態に戻す
   aws cloudformation cancel-update-stack --stack-name {スタック名}
   ```

3. **段階的デプロイ**

   ```bash
   # 一部のリソースのみデプロイ
   pnpm cdk deploy FrontendStack-{環境名} --exclusively
   ```

### 5. セキュリティ関連の問題

#### 問題: セキュリティヘッダーが設定されていない

**症状**

- セキュリティスキャンで警告が出る
- ブラウザの開発者ツールで警告表示

**診断手順**

```bash
# 1. セキュリティヘッダーの確認
curl -I https://{ドメイン名}

# 2. Response Headers Policyの確認
aws cloudfront get-response-headers-policy --id {ポリシーID}
```

**解決方法**

1. **Response Headers Policyの作成**

   ```json
   {
     "ResponseHeadersPolicyConfig": {
       "Name": "SecurityHeaders",
       "SecurityHeadersConfig": {
         "StrictTransportSecurity": {
           "AccessControlMaxAgeSec": 31536000,
           "IncludeSubdomains": true,
           "Preload": true,
           "Override": true
         },
         "ContentTypeOptions": {
           "Override": true
         },
         "FrameOptions": {
           "FrameOption": "DENY",
           "Override": true
         },
         "ReferrerPolicy": {
           "ReferrerPolicy": "strict-origin-when-cross-origin",
           "Override": true
         }
       }
     }
   }
   ```

2. **ディストリビューションへの適用**

   ```bash
   aws cloudfront update-distribution \
     --id {ディストリビューションID} \
     --distribution-config file://security-headers-config.json
   ```

### 6. 監視・ログ関連の問題

#### 問題: CloudWatchメトリクスが表示されない

**症状**

- CloudWatchでメトリクスが確認できない
- アラームが動作しない

**診断手順**

```bash
# 1. メトリクスの存在確認
aws cloudwatch list-metrics --namespace AWS/CloudFront

# 2. ディストリビューションの設定確認
aws cloudfront get-distribution-config --id {ディストリビューションID}
```

**解決方法**

1. **メトリクス収集の有効化**

   ```bash
   # ディストリビューションでメトリクス収集を有効化
   aws cloudfront update-distribution \
     --id {ディストリビューションID} \
     --distribution-config file://metrics-enabled-config.json
   ```

2. **アラームの再作成**

   ```bash
   # CloudWatchアラームの作成
   aws cloudwatch put-metric-alarm \
     --alarm-name "HighErrorRate" \
     --alarm-description "High error rate detected" \
     --metric-name 4xxErrorRate \
     --namespace AWS/CloudFront \
     --statistic Average \
     --period 300 \
     --threshold 5 \
     --comparison-operator GreaterThanThreshold
   ```

## 緊急時対応チェックリスト

### レベル1: サービス影響なし（情報収集）

- [ ] 問題の詳細を記録
- [ ] 影響範囲を特定
- [ ] 関連ログを収集
- [ ] 一時的な回避策を検討

### レベル2: 部分的サービス影響（1時間以内対応）

- [ ] 関係者への通知
- [ ] 緊急回避策の実施
- [ ] 根本原因の調査開始
- [ ] 進捗の定期報告

### レベル3: 全面的サービス停止（30分以内対応）

- [ ] 緊急事態宣言
- [ ] 全関係者への即座通知
- [ ] メンテナンスページの表示
- [ ] ロールバックの実施
- [ ] 外部ベンダーへの連絡

## 予防策

### 1. 定期的なヘルスチェック

```bash
#!/bin/bash
# health-check.sh

# サイトの応答確認
response=$(curl -s -o /dev/null -w "%{http_code}" https://{ドメイン名})
if [ $response -ne 200 ]; then
  echo "ERROR: Site is not responding correctly (HTTP $response)"
  exit 1
fi

# SSL証明書の有効期限確認
expiry=$(openssl s_client -connect {ドメイン名}:443 -servername {ドメイン名} 2>/dev/null | openssl x509 -noout -dates | grep notAfter | cut -d= -f2)
expiry_epoch=$(date -d "$expiry" +%s)
current_epoch=$(date +%s)
days_until_expiry=$(( (expiry_epoch - current_epoch) / 86400 ))

if [ $days_until_expiry -lt 30 ]; then
  echo "WARNING: SSL certificate expires in $days_until_expiry days"
fi

echo "Health check passed"
```

### 2. 自動化されたテスト

```bash
#!/bin/bash
# automated-test.sh

# パフォーマンステスト
load_time=$(curl -w "%{time_total}" -o /dev/null -s https://{ドメイン名})
if (( $(echo "$load_time > 3.0" | bc -l) )); then
  echo "WARNING: Page load time is $load_time seconds (>3.0s)"
fi

# セキュリティヘッダーテスト
headers=$(curl -I -s https://{ドメイン名})
if ! echo "$headers" | grep -q "Strict-Transport-Security"; then
  echo "ERROR: HSTS header is missing"
fi

echo "Automated tests passed"
```

### 3. 監視アラートの設定

```bash
# 高エラー率アラーム
aws cloudwatch put-metric-alarm \
  --alarm-name "HighErrorRate" \
  --alarm-description "High error rate detected" \
  --metric-name 4xxErrorRate \
  --namespace AWS/CloudFront \
  --statistic Average \
  --period 300 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold \
  --alarm-actions arn:aws:sns:region:account:alert-topic

# 低キャッシュヒット率アラーム
aws cloudwatch put-metric-alarm \
  --alarm-name "LowCacheHitRate" \
  --alarm-description "Low cache hit rate detected" \
  --metric-name CacheHitRate \
  --namespace AWS/CloudFront \
  --statistic Average \
  --period 900 \
  --threshold 80 \
  --comparison-operator LessThanThreshold \
  --alarm-actions arn:aws:sns:region:account:alert-topic
```

## 参考資料

- [AWS CloudFront トラブルシューティング](https://docs.aws.amazon.com/cloudfront/latest/DeveloperGuide/troubleshooting.html)
- [AWS S3 トラブルシューティング](https://docs.aws.amazon.com/s3/latest/userguide/troubleshooting.html)
- [AWS ACM トラブルシューティング](https://docs.aws.amazon.com/acm/latest/userguide/troubleshooting.html)
- [HTTP ステータスコード リファレンス](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status)
