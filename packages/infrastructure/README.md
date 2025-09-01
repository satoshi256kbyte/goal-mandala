# インフラストラクチャ

このディレクトリには、AWS CDKを使用したインフラストラクチャコードが含まれています。

## 概要

- **VPC・ネットワーク**: セキュアなネットワーク環境
- **Aurora Serverless V2**: スケーラブルなデータベース
- **Secrets Manager**: 機密情報の安全な管理
- **CloudFront + S3**: 高速なフロントエンド配信
- **監視・ログ**: CloudWatch による包括的な監視

## ディレクトリ構造

```
packages/infrastructure/
├── src/                    # CDKソースコード
│   ├── config/            # 環境設定
│   ├── constructs/        # 再利用可能なコンストラクト
│   ├── stacks/           # CDKスタック定義
│   └── lambda/           # Lambda関数コード
├── scripts/              # 運用スクリプト
├── docs/                 # ドキュメント
├── config/               # 環境別設定ファイル
└── test-results/         # テスト結果（自動生成）
```

## セットアップ

### 前提条件

- Node.js 23.10.0
- AWS CLI設定済み
- AWS CDK CLI (`npm install -g aws-cdk`)

### 初期セットアップ

```bash
# 依存関係のインストール
pnpm install

# CDK Bootstrap（初回のみ）
pnpm cdk bootstrap

# 設定ファイルの確認
ls config/
```

## デプロイ

### 開発環境

```bash
# 差分確認
pnpm cdk diff VpcStack-dev DatabaseStack-dev FrontendStack-dev

# デプロイ
pnpm cdk deploy VpcStack-dev DatabaseStack-dev FrontendStack-dev
```

### 本番環境

```bash
# 差分確認
pnpm cdk diff VpcStack-prd DatabaseStack-prd FrontendStack-prd

# デプロイ
pnpm cdk deploy VpcStack-prd DatabaseStack-prd FrontendStack-prd
```

## フロントエンド配信環境

### 構成

- **S3バケット**: 静的ファイルの保存
- **CloudFront**: CDN配信とキャッシュ
- **ACM証明書**: SSL/TLS暗号化
- **OAC**: オリジンアクセス制御

### デプロイ手順

```bash
# 1. インフラのデプロイ
pnpm cdk deploy FrontendStack-{環境名}

# 2. フロントエンドのビルドとアップロード
cd ../frontend
pnpm build
aws s3 sync dist/ s3://{バケット名}/ --delete

# 3. CloudFrontキャッシュの無効化
aws cloudfront create-invalidation \
  --distribution-id {ディストリビューションID} \
  --paths "/*"
```

### 自動デプロイ

```bash
# 統合デプロイスクリプト
./scripts/deploy-frontend.sh {環境名}
```

## テスト

### 機能テスト

```bash
# 基本的な機能テスト
./scripts/functional-test.sh {ドメイン名} {環境名}

# 例
./scripts/functional-test.sh localhost local
./scripts/functional-test.sh goal-mandala.example.com prd
```

### パフォーマンステスト

```bash
# パフォーマンステスト
./scripts/performance-test.sh {ドメイン名} {環境名}

# 例
./scripts/performance-test.sh goal-mandala.example.com prd
```

### 統合テスト

```bash
# 全体的な統合テスト
./scripts/integration-test.sh {環境名} [ドメイン名]

# 例
./scripts/integration-test.sh local
./scripts/integration-test.sh prd goal-mandala.example.com
```

## 監視・運用

### CloudWatchメトリクス

主要なメトリクス：

- **CloudFront**: リクエスト数、エラー率、キャッシュヒット率
- **S3**: オブジェクト数、バケットサイズ
- **Aurora**: CPU使用率、接続数、レプリケーションラグ

### アラート

設定済みアラート：

- 高エラー率（5%以上）
- 低キャッシュヒット率（80%未満）
- データベース接続エラー

### ログ

- **CloudTrail**: API呼び出しログ
- **S3アクセスログ**: ウェブサイトアクセス記録
- **CloudFrontログ**: 配信ログ

## セキュリティ

### 実装済みセキュリティ機能

- **OAC**: S3への直接アクセス制限
- **SSL/TLS**: 全通信の暗号化
- **セキュリティヘッダー**: XSS、CSRF等の攻撃防止
- **IAM**: 最小権限の原則
- **Secrets Manager**: 機密情報の暗号化保存

### セキュリティチェック

```bash
# セキュリティヘッダーの確認
curl -I https://{ドメイン名}

# SSL証明書の確認
openssl s_client -connect {ドメイン名}:443 -servername {ドメイン名}
```

## トラブルシューティング

### よくある問題

1. **403 Forbidden エラー**
   - OAC設定の確認
   - S3バケットポリシーの確認

2. **キャッシュが効かない**
   - キャッシュポリシーの確認
   - Cache-Controlヘッダーの設定

3. **SSL証明書エラー**
   - ACM証明書の状態確認
   - DNS検証の完了確認

### ログの確認

```bash
# CloudFormationイベントの確認
aws cloudformation describe-stack-events --stack-name {スタック名}

# CloudWatchログの確認
aws logs describe-log-groups
aws logs filter-log-events --log-group-name {ロググループ名}
```

## ドキュメント

### 運用ドキュメント

- [フロントエンド配信環境 運用ガイド](./docs/frontend-deployment-guide.md)
- [トラブルシューティングガイド](./docs/frontend-troubleshooting-guide.md)
- [セキュリティガイド](./docs/frontend-security-guide.md)

### 技術ドキュメント

- [Aurora Serverless セットアップ](./docs/aurora-serverless-setup-summary.md)
- [Secrets Manager 実装](./docs/secrets-manager-implementation-summary.md)
- [IAM データベース認証](./docs/iam-database-authentication-setup.md)

## 環境設定

### 環境別設定ファイル

- `config/local.json`: ローカル開発環境
- `config/dev.json`: 開発環境
- `config/stg.json`: ステージング環境
- `config/prod.json`: 本番環境

### 設定項目

```json
{
  "serviceName": "goal-mandala",
  "environment": "dev",
  "region": "ap-northeast-1",
  "vpc": {
    "cidr": "10.0.0.0/16",
    "enableNatGateway": true
  },
  "database": {
    "engine": "aurora-postgresql",
    "version": "15.4",
    "minCapacity": 0.5,
    "maxCapacity": 1
  },
  "frontend": {
    "domainName": "dev.goal-mandala.example.com",
    "certificateArn": "arn:aws:acm:us-east-1:...",
    "priceClass": "PriceClass_100"
  }
}
```

## コマンドリファレンス

### CDK コマンド

```bash
# スタック一覧
pnpm cdk list

# 差分確認
pnpm cdk diff {スタック名}

# デプロイ
pnpm cdk deploy {スタック名}

# 削除
pnpm cdk destroy {スタック名}

# 合成（CloudFormationテンプレート生成）
pnpm cdk synth {スタック名}
```

### テストコマンド

```bash
# ユニットテスト
pnpm test

# カバレッジ付きテスト
pnpm test:coverage

# 統合テスト
pnpm test:integration

# 全テスト実行
pnpm test:all
```

### 運用コマンド

```bash
# フロントエンドデプロイ
./scripts/deploy-frontend.sh {環境名}

# パフォーマンステスト
./scripts/performance-test.sh {ドメイン名} {環境名}

# セキュリティチェック
./scripts/security-check.sh {ドメイン名}

# 統合テスト
./scripts/integration-test.sh {環境名}
```

## 開発ガイドライン

### コーディング規約

- TypeScript strict モード使用
- ESLint + Prettier による自動フォーマット
- 単体テストカバレッジ 80% 以上

### コミット規約

- Conventional Commits に従う
- feat: 新機能
- fix: バグ修正
- docs: ドキュメント更新
- test: テスト追加・修正

### プルリクエスト

- 全テストが通ること
- コードレビューの承認
- ドキュメントの更新

## サポート

### 問い合わせ先

- **開発チーム**: [開発者メール]
- **インフラチーム**: [インフラ担当者メール]
- **緊急時**: [緊急連絡先]

### 参考資料

- [AWS CDK ドキュメント](https://docs.aws.amazon.com/cdk/)
- [AWS CloudFront ドキュメント](https://docs.aws.amazon.com/cloudfront/)
- [AWS Aurora ドキュメント](https://docs.aws.amazon.com/aurora/)
- [プロジェクト Wiki](https://github.com/your-org/goal-mandala/wiki)
