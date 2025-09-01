# フロントエンド配信環境 ドキュメント

## 概要

このディレクトリには、CloudFront + S3構成によるフロントエンド配信環境に関する包括的なドキュメントが含まれています。

## ドキュメント一覧

### 運用関連

| ドキュメント                                                        | 説明                             | 対象者             |
| ------------------------------------------------------------------- | -------------------------------- | ------------------ |
| [運用手順書](./frontend-operations-guide.md)                        | 日常運用、監視、メンテナンス手順 | 運用担当者         |
| [デプロイガイド](./frontend-deployment-guide.md)                    | デプロイ手順とロールバック方法   | 開発者・運用担当者 |
| [トラブルシューティングガイド](./frontend-troubleshooting-guide.md) | 一般的な問題と解決方法           | 開発者・運用担当者 |

### セキュリティ関連

| ドキュメント                                          | 説明                                 | 対象者                     |
| ----------------------------------------------------- | ------------------------------------ | -------------------------- |
| [セキュリティガイド](./frontend-security-guide.md)    | セキュリティ設定とベストプラクティス | セキュリティ担当者・開発者 |
| [セキュリティチェックリスト](./security-checklist.md) | セキュリティ監査項目                 | セキュリティ担当者         |

### 技術仕様関連

| ドキュメント                                    | 説明                  | 対象者 |
| ----------------------------------------------- | --------------------- | ------ |
| [環境変数設定](./environment-variables.md)      | 環境変数の設定方法    | 開発者 |
| [GitHub Actions設定](./github-actions-setup.md) | CI/CDパイプライン設定 | 開発者 |

## クイックスタート

### 1. 初回セットアップ

```bash
# 1. 依存関係のインストール
cd packages/infrastructure
pnpm install

# 2. 環境設定ファイルの確認
cat config/dev.json

# 3. インフラのデプロイ
pnpm cdk deploy FrontendStack-dev
```

### 2. フロントエンドのデプロイ

```bash
# 自動デプロイスクリプトの使用
./scripts/deploy-frontend.sh dev
```

### 3. ヘルスチェック

```bash
# 基本ヘルスチェック
./scripts/health-check.sh dev

# 詳細ヘルスチェック
CHECK_DEEP=true ./scripts/health-check.sh dev
```

### 4. パフォーマンステスト

```bash
# パフォーマンステストの実行
./scripts/performance-test.sh dev
```

## アーキテクチャ概要

```
エンドユーザー
    ↓
[CloudFront Distribution]
    ↓ (Origin Access Control)
[S3 Bucket]
    ↓
[Static Website Files]
```

### 主要コンポーネント

- **CloudFront**: CDN配信とキャッシュ
- **S3**: 静的ファイルストレージ
- **ACM**: SSL/TLS証明書管理
- **OAC**: オリジンアクセス制御
- **Response Headers Policy**: セキュリティヘッダー設定

## 環境別設定

### 開発環境 (dev)

- **ドメイン**: CloudFrontデフォルトドメイン
- **SSL**: CloudFrontデフォルト証明書
- **キャッシュ**: 短期設定（開発効率重視）
- **監視**: 基本監視のみ

### ステージング環境 (stg)

- **ドメイン**: stg.goal-mandala.example.com
- **SSL**: ACMカスタム証明書
- **キャッシュ**: 本番相当設定
- **監視**: 詳細監視

### 本番環境 (prod)

- **ドメイン**: goal-mandala.example.com
- **SSL**: ACMカスタム証明書（HSTS有効）
- **キャッシュ**: 最適化設定
- **監視**: 包括的監視・アラート

## 運用スケジュール

### 日次タスク

- [ ] 朝の健全性確認（9:00 AM）
- [ ] 夕方の統計確認（6:00 PM）

### 週次タスク（毎週月曜日）

- [ ] セキュリティチェック
- [ ] パフォーマンス分析
- [ ] ログ分析

### 月次タスク（毎月第1営業日）

- [ ] コスト分析
- [ ] セキュリティ監査
- [ ] パフォーマンスレビュー

## 緊急時対応

### 連絡先

- **レベル1**: 開発チーム（平日 9:00-18:00）
- **レベル2**: インフラチーム（24時間対応）
- **レベル3**: 外部ベンダー（24時間対応）

### エスカレーション

1. **軽微な問題**: 1時間以内対応
2. **重大な問題**: 30分以内対応
3. **全面停止**: 15分以内対応

### 緊急時コマンド

```bash
# 緊急ロールバック
git checkout {previous-stable-commit}
./scripts/deploy-frontend.sh prod

# メンテナンスページ表示
aws s3 cp maintenance.html s3://{bucket-name}/index.html
aws cloudfront create-invalidation --distribution-id {id} --paths "/*"

# サービス停止
aws cloudfront update-distribution --id {id} --distribution-config file://disabled-config.json
```

## 監視・アラート

### 主要メトリクス

- **リクエスト数**: 異常なトラフィック増加の検知
- **エラー率**: 4xx/5xxエラーの監視
- **キャッシュヒット率**: パフォーマンス効率の監視
- **レスポンス時間**: ユーザーエクスペリエンスの監視

### アラート設定

- **高エラー率**: 5%以上で警告
- **低キャッシュヒット率**: 80%未満で警告
- **SSL証明書期限**: 30日前に警告
- **異常なトラフィック**: 通常の3倍以上で警告

## セキュリティ

### セキュリティ対策

- **SSL/TLS**: 全通信の暗号化
- **HSTS**: HTTP Strict Transport Security
- **CSP**: Content Security Policy
- **OAC**: Origin Access Control
- **WAF**: Web Application Firewall（オプション）

### セキュリティチェック

```bash
# セキュリティヘッダーの確認
curl -I https://goal-mandala.example.com

# SSL証明書の確認
openssl s_client -connect goal-mandala.example.com:443 -servername goal-mandala.example.com

# 脆弱性スキャン
./scripts/security-scan.sh prod
```

## パフォーマンス最適化

### キャッシュ戦略

- **静的アセット**: 1年間の長期キャッシュ
- **HTML**: 5分間の短期キャッシュ
- **API**: キャッシュなし

### 最適化施策

- **圧縮**: Gzip/Brotli圧縮有効
- **HTTP/2**: 有効
- **価格クラス**: 環境別最適化
- **エッジロケーション**: 地理的最適化

## トラブルシューティング

### よくある問題

1. **403 Forbidden**: OAC設定の確認
2. **404 Not Found**: SPAルーティング設定の確認
3. **SSL警告**: 証明書設定の確認
4. **遅いレスポンス**: キャッシュ設定の確認

### 診断コマンド

```bash
# 基本診断
./scripts/health-check.sh prod

# パフォーマンス診断
./scripts/performance-test.sh prod

# ログ分析
aws logs filter-log-events --log-group-name /aws/cloudfront/distribution/{id}
```

## 開発者向け情報

### ローカル開発

```bash
# フロントエンドの開発サーバー起動
cd packages/frontend
pnpm dev

# ビルドテスト
pnpm build
```

### デプロイテスト

```bash
# ドライラン
DRY_RUN=true ./scripts/deploy-frontend.sh dev

# ビルドのみ
BUILD_ONLY=true ./scripts/deploy-frontend.sh dev
```

## 参考資料

### AWS公式ドキュメント

- [AWS CloudFront Developer Guide](https://docs.aws.amazon.com/cloudfront/latest/DeveloperGuide/)
- [AWS S3 User Guide](https://docs.aws.amazon.com/s3/latest/userguide/)
- [AWS Certificate Manager User Guide](https://docs.aws.amazon.com/acm/latest/userguide/)

### ベストプラクティス

- [AWS Well-Architected Framework](https://aws.amazon.com/architecture/well-architected/)
- [CloudFront Security Best Practices](https://docs.aws.amazon.com/cloudfront/latest/DeveloperGuide/security.html)
- [S3 Security Best Practices](https://docs.aws.amazon.com/s3/latest/userguide/security-best-practices.html)

### コミュニティリソース

- [CDK Patterns](https://cdkpatterns.com/)
- [AWS Samples](https://github.com/aws-samples)
- [CloudFront Examples](https://github.com/aws-samples/amazon-cloudfront-samples)

## 更新履歴

| 日付       | バージョン | 変更内容 | 担当者     |
| ---------- | ---------- | -------- | ---------- |
| 2024-12-01 | 1.0.0      | 初版作成 | 開発チーム |

## ライセンス

このドキュメントは、プロジェクトのライセンスに従います。

## お問い合わせ

技術的な質問や改善提案については、以下にお問い合わせください：

- **開発チーム**: <dev-team@goal-mandala.example.com>
- **インフラチーム**: <infra-team@goal-mandala.example.com>
- **Slack**: #infrastructure-support
