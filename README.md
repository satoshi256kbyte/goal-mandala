# 目標管理曼荼羅 (Goal Mandala)

曼荼羅チャートを活用した目標管理システム。AI（Amazon Bedrock）を使用して目標から具体的なタスクまでを自動生成し、日々の活動をサポートします。

## 概要

このシステムは、利用者が自然言語で入力した目標をもとに、AIが以下を自動生成します：

- **目標** → **8つのサブ目標** → **各サブ目標に8つのアクション** → **各アクションに複数のタスク**

生成されたマンダラチャートをもとに、日々のタスクリマインドと進捗管理を行い、目標達成をサポートします。

開発者向けドキュメントは [CONTRIBUTING.md](./CONTRIBUTING.md) を参照してください。

## クイックスタート

### 1. 環境変数の設定

```bash
# .env.exampleから.envファイルを作成
cp .env.example .env

# .envファイルを編集して適切な値を設定
# 特にJWT_SECRETとPOSTGRES_PASSWORDはデフォルト値から変更してください
```

### 2. 環境変数の検証

```bash
# 環境変数が正しく設定されているかチェック
pnpm run env:check
```

詳細な環境変数設定については [環境変数設定ガイド](./docs/environment-variables.md) を参照してください。

Docker環境の詳細なセットアップ手順については [Docker環境セットアップガイド](./docs/docker-setup-guide.md) を参照してください。

### 3. Docker環境の起動

```bash
# 開発環境の起動
docker-compose up -d

# または、Makefileを使用（推奨）
make -C tools/docker up

# サービスの状態確認
make -C tools/docker health
```

### 4. ローカル開発環境の起動

#### Docker環境の管理

Docker環境の操作には、便利なMakefileコマンドが利用できます：

```bash
# 利用可能なコマンドを表示
make -C tools/docker help

# 主要なコマンド
make -C tools/docker up      # 環境起動
make -C tools/docker down    # 環境停止
make -C tools/docker restart # 環境再起動
make -C tools/docker logs    # ログ表示
make -C tools/docker health  # ヘルスチェック
make -C tools/docker clean   # 環境クリーンアップ
```

#### AWS SAM CLI環境の起動

バックエンドAPIをローカルで実行するには、AWS SAM CLIを使用します：

```bash
# バックエンドAPI起動（Lambda + API Gateway エミュレート）
pnpm --filter @goal-mandala/backend dev

# または、専用スクリプトを使用
./tools/scripts/sam-local-start.sh

# 別ターミナルでフロントエンド起動
pnpm --filter @goal-mandala/frontend dev

# APIの動作確認
curl http://localhost:3001/health
```

**前提条件**: AWS SAM CLIとDocker Desktopがインストールされている必要があります。詳細は [CONTRIBUTING.md](./CONTRIBUTING.md) を参照してください。

## ドキュメント

### 開発者向けドキュメント

- [CONTRIBUTING.md](./CONTRIBUTING.md) - 開発者向け詳細ガイド（SAM CLI環境の使用方法を含む）
- [Docker環境セットアップガイド](./docs/docker-setup-guide.md) - Docker環境の詳細セットアップ手順
- [Docker環境トラブルシューティングガイド](./docs/docker-troubleshooting.md) - Docker関連問題の解決方法
- [環境変数設定ガイド](./docs/environment-variables.md) - 環境変数の詳細設定
- [AWS SAM CLI公式ドキュメント](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/) - SAM CLIの詳細な使用方法

### アーキテクチャドキュメント

- [モノレポアーキテクチャ](./docs/monorepo-architecture.md) - パッケージ構成と依存関係
- [統合テストガイド](./docs/integration-testing.md) - テスト実行方法

## 開発の進捗

[WBS](.kiro/steering/4-wbs.md)をご覧ください。
