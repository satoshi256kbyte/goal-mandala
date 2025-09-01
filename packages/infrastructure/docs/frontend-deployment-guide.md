# フロントエンド配信環境 運用ガイド

## 概要

このドキュメントでは、CloudFront + S3構成によるフロントエンド配信環境の運用手順について説明します。

## アーキテクチャ概要

```
エンドユーザー → CloudFront → S3バケット
                     ↓
                 SSL証明書(ACM)
                     ↓
                 セキュリティヘッダー
```

### 主要コンポーネント

- **S3バケット**: 静的ファイルの保存
- **CloudFront**: CDN配信とキャッシュ
- **ACM証明書**: SSL/TLS暗号化
- **OAC**: オリジンアクセス制御

## デプロイ手順

### 1. インフラストラクチャのデプロイ

```bash
# 1. 依存関係のインストール
cd packages/infrastructure
pnpm install

# 2. CDK設定の確認
pnpm cdk diff FrontendStack-{環境名}

# 3. インフラのデプロイ
pnpm cdk deploy FrontendStack-{環境名}
```

### 2. フロントエンドアプリケーションのデプロイ

```bash
# 1. フロントエンドのビルド
cd packages/frontend
pnpm install
pnpm build

# 2. S3へのアップロード
aws s3 sync dist/ s3://{バケット名}/ --delete

# 3. CloudFrontキャッシュの無効化
aws cloudfront create-invalidation \
  --distribution-id {ディストリビューションID} \
  --paths "/*"
```

### 3. 自動デプロイスクリプトの使用

```bash
# デプロイスクリプトの実行
./packages/infrastructure/scripts/deploy-frontend.sh {環境名}
```

## ロールバック手順

### 1. 緊急時の即座ロールバック

```bash
# 1. 前回のバックアップから復元
aws s3 sync s3://{バックアップバケット}/backup-{日時}/ s3://{バケット名}/ --delete

# 2. CloudFrontキャッシュの無効化
aws cloudfront create-invalidation \
  --distribution-id {ディストリビューションID} \
  --paths "/*"
```

### 2. Git履歴を使用したロールバック

```bash
# 1. 前のコミットに戻る
git checkout {前のコミットハッシュ}

# 2. フロントエンドの再ビルド
cd packages/frontend
pnpm build

# 3. 再デプロイ
aws s3 sync dist/ s3://{バケット名}/ --delete
aws cloudfront create-invalidation \
  --distribution-id {ディストリビューションID} \
  --paths "/*"
```

### 3. インフラストラクチャのロールバック

```bash
# 1. 前のCDKスタック状態に戻る
git checkout {前のコミットハッシュ}

# 2. CDKスタックの更新
cd packages/infrastructure
pnpm cdk deploy FrontendStack-{環境名}
```

## 監視とメンテナンス

### 1. 日常監視項目

#### CloudWatchメトリクス確認

```bash
# CloudFrontメトリクスの確認
aws cloudwatch get-metric-statistics \
  --namespace AWS/CloudFront \
  --metric-name Requests \
  --dimensions Name=DistributionId,Value={ディストリビューションID} \
  --start-time {開始時刻} \
  --end-time {終了時刻} \
  --period 3600 \
  --statistics Sum
```

#### 主要メトリクス

- **Requests**: リクエスト数
- **BytesDownloaded**: ダウンロード量
- **4xxErrorRate**: クライアントエラー率
- **5xxErrorRate**: サーバーエラー率
- **CacheHitRate**: キャッシュヒット率

### 2. 定期メンテナンス

#### 週次タスク

- [ ] CloudWatchアラームの確認
- [ ] エラーログの確認
- [ ] キャッシュヒット率の確認
- [ ] SSL証明書の有効期限確認

#### 月次タスク

- [ ] コスト分析とレポート作成
- [ ] パフォーマンス分析
- [ ] セキュリティ設定の見直し
- [ ] バックアップの整合性確認

## セキュリティ管理

### 1. SSL証明書管理

```bash
# 証明書の状態確認
aws acm describe-certificate --certificate-arn {証明書ARN}

# 証明書の自動更新確認
aws acm list-certificates --certificate-statuses ISSUED
```

### 2. セキュリティヘッダーの確認

```bash
# セキュリティヘッダーのテスト
curl -I https://{ドメイン名}

# 期待されるヘッダー:
# Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
# X-Content-Type-Options: nosniff
# X-Frame-Options: DENY
# Referrer-Policy: strict-origin-when-cross-origin
```

### 3. アクセス制御の確認

```bash
# S3への直接アクセスが拒否されることを確認
curl -I https://{バケット名}.s3.amazonaws.com/index.html
# 期待される結果: 403 Forbidden
```

## パフォーマンス最適化

### 1. キャッシュ設定の最適化

#### 静的アセット（長期キャッシュ）

- **対象**: `/assets/*`, `*.js`, `*.css`, `*.png`, `*.jpg`
- **TTL**: 1年（31536000秒）
- **圧縮**: 有効

#### HTML・API（短期キャッシュ）

- **対象**: `*.html`, `/api/*`
- **TTL**: 5分（300秒）
- **圧縮**: 有効

### 2. パフォーマンス測定

```bash
# ページロード時間の測定
curl -w "@curl-format.txt" -o /dev/null -s https://{ドメイン名}

# curl-format.txt の内容:
#      time_namelookup:  %{time_namelookup}\n
#         time_connect:  %{time_connect}\n
#      time_appconnect:  %{time_appconnect}\n
#     time_pretransfer:  %{time_pretransfer}\n
#        time_redirect:  %{time_redirect}\n
#   time_starttransfer:  %{time_starttransfer}\n
#                      ----------\n
#           time_total:  %{time_total}\n
```

## コスト管理

### 1. コスト監視

```bash
# CloudFrontのコスト確認
aws ce get-cost-and-usage \
  --time-period Start=2024-01-01,End=2024-01-31 \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --group-by Type=DIMENSION,Key=SERVICE
```

### 2. コスト最適化施策

#### S3ストレージクラスの最適化

```bash
# ライフサイクルポリシーの設定確認
aws s3api get-bucket-lifecycle-configuration --bucket {バケット名}
```

#### CloudFront価格クラスの見直し

- **PriceClass_100**: 北米・ヨーロッパのみ（最安）
- **PriceClass_200**: 北米・ヨーロッパ・アジア
- **PriceClass_All**: 全世界（最高性能）

## 環境別設定

### Local環境

- **ドメイン**: localhost
- **SSL**: 無効
- **キャッシュ**: 無効

### Dev環境

- **ドメイン**: dev.goal-mandala.example.com
- **SSL**: 有効（ACM証明書）
- **キャッシュ**: 短期設定

### Staging環境

- **ドメイン**: stg.goal-mandala.example.com
- **SSL**: 有効（ACM証明書）
- **キャッシュ**: 本番相当

### Production環境

- **ドメイン**: goal-mandala.example.com
- **SSL**: 有効（ACM証明書）
- **キャッシュ**: 最適化設定

## 緊急時対応

### 1. サービス停止時の対応

```bash
# 1. CloudFrontディストリビューションの無効化
aws cloudfront update-distribution \
  --id {ディストリビューションID} \
  --distribution-config file://disabled-distribution.json

# 2. メンテナンスページの表示
aws s3 cp maintenance.html s3://{バケット名}/index.html
```

### 2. 大量アクセス時の対応

```bash
# 1. CloudWatchアラームの確認
aws cloudwatch describe-alarms --alarm-names "HighRequestRate"

# 2. 必要に応じてWAFの有効化
aws wafv2 associate-web-acl \
  --web-acl-arn {WAF-ARN} \
  --resource-arn {CloudFront-ARN}
```

### 3. セキュリティインシデント時の対応

```bash
# 1. 不正ファイルの即座削除
aws s3 rm s3://{バケット名}/{不正ファイル}

# 2. CloudFrontキャッシュの即座無効化
aws cloudfront create-invalidation \
  --distribution-id {ディストリビューションID} \
  --paths "/{不正ファイル}"

# 3. アクセスログの確認
aws s3 cp s3://{ログバケット}/ ./logs/ --recursive
```

## 連絡先

### 緊急時連絡先

- **プライマリ**: [管理者メール]
- **セカンダリ**: [副管理者メール]
- **Slack**: #infrastructure-alerts

### エスカレーション手順

1. **レベル1**: 開発チーム対応（30分以内）
2. **レベル2**: インフラチーム対応（1時間以内）
3. **レベル3**: 外部ベンダー対応（2時間以内）

## 参考資料

- [AWS CloudFront ドキュメント](https://docs.aws.amazon.com/cloudfront/)
- [AWS S3 ドキュメント](https://docs.aws.amazon.com/s3/)
- [AWS ACM ドキュメント](https://docs.aws.amazon.com/acm/)
- [CDK ドキュメント](https://docs.aws.amazon.com/cdk/)
