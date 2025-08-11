# 技術スタック

## アーキテクチャ

- Single Page Application (SPA)
- インフラ: AWS
- IaC: AWS CDK

## バックエンド(API)

- TypeScript + Hono
- Amazon Cognitoで認証
- Amazon CloudFront > Amazon API Gateway > AWS Lambda(Hono) > Amazon Aurora Serverless V2
- データベース認証情報はAWS Secrets Managerで管理
- データベーススキーマ管理: Prisma（マイグレーション + 型安全なORM）
- アクションごとのタスクを作る部分でStepFunctionsを使用
- 注：RDS Proxyは現時点では使用しない（MVP版のため）

## フロントエンド

- Amazon CloudFront > Amazon S3
- React + TypeScript
- CSSフレームワーク: Tailwind CSS

## 開発ツール

- バージョン管理: asdf（.tool-versionsでNode.js 23.10.0、Python 3.13.3を管理）
- 静的解析ツール: ESLint (TypeScript/React対応)
- フォーマッター: Prettier
- テストツール:
  - ユニットテスト: Jest + React Testing Library
  - E2Eテスト: Playwright
- CI/CDローカルテスト: act (GitHub Actionsワークフローのローカル実行)

## 配信

- バックエンド、フロントエンド共にAmazon CloudFrontで配信
- バックエンド、フロントエンドは同じCloudFrontディストリビューションに配置、故に同じドメインでアクセス可能

## CI/CD

- IaC、バックエンド、フロントエンドを一つのリポジトリで管理するモノレポ構成とする
- パッケージマネージャー: pnpm
- GitリポジトリはGitHubで管理
- CI/CDツールはGitHub Actionsを使用
- ユニットテストのカバレッジは80%以上を目指す
- E2Eテストを実施
- プリコミットでLintを実施
- mainへのプッシュで静的解析・自動テスト・カバレッジチェック・E2Eテストを実施
- データベースマイグレーション: Prismaを使用してCI/CDパイプラインで自動実行
- AWSへのデプロイはGitHub Actionsで実施するが、実施は手動

### GitHub Actionsローカルテスト

- **act**: GitHub Actionsワークフローをローカルで実行・テストするツール
- **使用目的**:
  - ワークフローの動作確認をローカルで実施
  - CI/CDパイプラインのデバッグ効率化
  - プッシュ前の事前検証
- **制限事項**:
  - 一部のGitHub固有機能は完全再現不可
  - AWSクレデンシャルは環境変数で設定
  - 複雑なワークフローは本番環境での最終確認が必要

## ローカル開発環境

- データベース: Docker Compose + PostgreSQL
- 認証: cognito-local（Docker）+ 開発用固定トークンのフォールバック
- AI: 開発用モックレスポンス（Bedrockエミュレータなし）
- API: AWS SAM CLI（Lambda + API Gatewayエミュレータ）
- Step Functions: AWS SAM CLI（ローカル実行サポート）
- CI/CDテスト: act（GitHub Actionsワークフローのローカル実行）
- 開発フロー:
  - `docker-compose up` でPostgreSQL + cognito-local起動
  - `sam local start-api` でLambda + API Gateway起動
  - フロントエンドは通常の開発サーバーで起動
  - `act` でCI/CDワークフローの事前テスト

## AI

- Amazon Bedrock + Amazon Nova Micro（コスト重視のテキスト生成）
- CDKでIAM権限とモデルアクセスを自動設定
- AIとの通信を行うのはLambda（故にAIへのリクエスト内容は15分以内に収まる程度に分解する）

## AIコーディング

- 全面的にKiroを活用
- MCP Serverを稼働させるためPythonを使用
  - PythonはMCPの稼働以外には使用しない
