# Backend API

目標管理曼荼羅システムのバックエンドAPIです。TypeScript + Hono + AWS Lambdaで構築されています。

## 概要

このバックエンドは、以下の主要機能を提供します：

- **認証・認可**: Amazon Cognito + JWT認証
- **AI統合**: Amazon Bedrock（Nova Micro）によるサブ目標・アクション・タスク生成
- **データ管理**: Prisma + Aurora Serverless V2によるデータ永続化
- **非同期処理**: Step Functionsによる長時間処理の管理

## 技術スタック

- **ランタイム**: Node.js 23.10.0
- **言語**: TypeScript
- **フレームワーク**: Hono
- **ORM**: Prisma
- **データベース**: PostgreSQL（Aurora Serverless V2）
- **AI**: Amazon Bedrock（Nova Micro）
- **認証**: Amazon Cognito
- **デプロイ**: AWS Lambda + API Gateway

## プロジェクト構造

```
packages/backend/
├── src/
│   ├── handlers/          # Lambda ハンドラー
│   │   └── subgoal-generation.ts
│   ├── services/          # ビジネスロジック
│   │   ├── bedrock.service.ts
│   │   ├── input-validation.service.ts
│   │   ├── subgoal-database.service.ts
│   │   ├── subgoal-generation.service.ts
│   │   └── subgoal-quality-validator.service.ts
│   ├── middleware/        # ミドルウェア
│   │   └── auth.ts
│   ├── types/            # 型定義
│   │   └── subgoal-generation.types.ts
│   ├── schemas/          # バリデーションスキーマ
│   │   └── subgoal-generation.schema.ts
│   ├── errors/           # カスタムエラークラス
│   │   └── subgoal-generation.errors.ts
│   ├── utils/            # ユーティリティ
│   │   ├── logger.ts
│   │   └── security.ts
│   └── __tests__/        # テスト
├── prisma/               # Prismaスキーマ・マイグレーション
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── docs/                 # ドキュメント
│   ├── subgoal-generation-api-specification.md
│   ├── subgoal-generation-error-codes.md
│   ├── subgoal-generation-operations-guide.md
│   └── subgoal-generation-troubleshooting-guide.md
├── template.yaml         # AWS SAM テンプレート
└── package.json
```

## セットアップ

### 前提条件

- Node.js 23.10.0（asdfで管理）
- Docker & Docker Compose
- AWS SAM CLI
- PostgreSQL（ローカル開発用）

### インストール

```bash
# ルートディレクトリから
pnpm install

# または、このディレクトリから
cd packages/backend
pnpm install
```

### 環境変数の設定

`.env.example`をコピーして`.env`を作成し、必要な環境変数を設定します：

```bash
cp .env.example .env
```

必要な環境変数：

```env
# データベース
DATABASE_URL="postgresql://user:password@localhost:5432/goal_mandala?schema=public"

# Bedrock
BEDROCK_MODEL_ID="amazon.nova-micro-v1:0"
BEDROCK_REGION="ap-northeast-1"

# ログレベル
LOG_LEVEL="INFO"

# JWT（開発環境用）
JWT_SECRET="your-jwt-secret-here"
```

### データベースのセットアップ

```bash
# Docker Composeでデータベースを起動
docker-compose up -d postgres

# マイグレーションの実行
pnpm prisma:migrate:dev

# シードデータの投入
pnpm prisma:seed
```

## 開発

### ローカル開発サーバーの起動

```bash
# SAM Localでローカル開発サーバーを起動
pnpm dev

# または
sam local start-api
```

APIは `http://localhost:3000` で利用可能になります。

### ビルド

```bash
# TypeScriptのビルド
pnpm build

# SAM用のビルド
sam build
```

### テスト

```bash
# 全テストの実行
pnpm test

# テストカバレッジの確認
pnpm test:coverage

# 特定のテストファイルの実行
pnpm test src/services/__tests__/subgoal-generation.service.test.ts
```

### リント・フォーマット

```bash
# ESLintの実行
pnpm lint

# Prettierでフォーマット
pnpm format

# 型チェック
pnpm type-check
```

## API エンドポイント

### サブ目標生成API

**エンドポイント**: `POST /api/ai/generate/subgoals`

**説明**: ユーザーが入力した目標から8つのサブ目標を自動生成します。

**認証**: 必須（JWT Bearer Token）

**リクエスト例**:

```json
{
  "title": "TypeScriptのエキスパートになる",
  "description": "6ヶ月でTypeScriptの高度な機能を習得し、実務で活用できるレベルになる",
  "deadline": "2025-12-31T23:59:59Z",
  "background": "フロントエンド開発者として、型安全性の高いコードを書けるようになりたい",
  "constraints": "平日は2時間、週末は4時間の学習時間を確保できる"
}
```

**レスポンス例**:

```json
{
  "success": true,
  "data": {
    "goalId": "uuid",
    "subGoals": [
      {
        "id": "uuid",
        "title": "TypeScriptの基礎文法を習得する",
        "description": "型システム、インターフェース、ジェネリクスなどの基本概念を理解し、実践できるようになる",
        "background": "TypeScriptの基礎がなければ、高度な機能を理解することは困難である",
        "position": 0,
        "progress": 0,
        "createdAt": "2025-10-07T10:00:00Z",
        "updatedAt": "2025-10-07T10:00:00Z"
      }
      // ... 残り7個のサブ目標
    ]
  },
  "metadata": {
    "generatedAt": "2025-10-07T10:00:00Z",
    "tokensUsed": 1500,
    "estimatedCost": 0.000225
  }
}
```

詳細は [サブ目標生成API仕様書](./docs/subgoal-generation-api-specification.md) を参照してください。

### アクション生成API

**エンドポイント**: `POST /api/ai/generate/actions`

**説明**: サブ目標から8つのアクションを自動生成します。各アクションは「実行アクション」または「習慣アクション」に自動分類されます。

**認証**: 必須（JWT Bearer Token）

**リクエスト例**:

```json
{
  "subGoalId": "550e8400-e29b-41d4-a716-446655440000",
  "regenerate": false
}
```

**レスポンス例**:

```json
{
  "success": true,
  "data": {
    "subGoalId": "550e8400-e29b-41d4-a716-446655440000",
    "actions": [
      {
        "id": "uuid",
        "title": "TypeScript公式ドキュメントを読む",
        "description": "TypeScript公式ドキュメントの基礎編を1日1章ずつ読み進め、サンプルコードを実際に動かして理解を深める",
        "background": "公式ドキュメントは最も正確で体系的な情報源である",
        "type": "execution",
        "position": 0,
        "progress": 0,
        "createdAt": "2025-10-09T10:00:00Z",
        "updatedAt": "2025-10-09T10:00:00Z"
      },
      {
        "id": "uuid",
        "title": "毎日TypeScriptコードを書く",
        "description": "毎日最低30分はTypeScriptでコードを書き、型システムの理解を深める習慣を作る",
        "background": "継続的な実践により、TypeScriptの型システムが自然に身につく",
        "type": "habit",
        "position": 1,
        "progress": 0,
        "createdAt": "2025-10-09T10:00:00Z",
        "updatedAt": "2025-10-09T10:00:00Z"
      }
      // ... 残り6個のアクション
    ]
  },
  "metadata": {
    "generatedAt": "2025-10-09T10:00:00Z",
    "tokensUsed": 2000,
    "estimatedCost": 0.0003,
    "goalContext": {
      "goalTitle": "TypeScriptのエキスパートになる",
      "subGoalTitle": "TypeScriptの基礎文法を習得する"
    }
  }
}
```

**アクション種別**:

- **実行アクション（EXECUTION）**: 一度実施すれば完了となるアクション（例：ドキュメントを読む、プロジェクトを実装）
- **習慣アクション（HABIT）**: 継続的に実施する必要があるアクション（例：毎日コードを書く、週に3本記事を読む）

詳細は [アクション生成API仕様書](./docs/action-generation-api-specification.md) を参照してください。

### タスク生成API

**エンドポイント**: `POST /api/ai/generate/tasks`

**説明**: アクションから複数の具体的なタスクを自動生成します。各タスクは30-60分程度で実行可能な粒度に分解され、優先度と依存関係が設定されます。

**認証**: 必須（JWT Bearer Token）

**リクエスト例**:

```json
{
  "actionId": "770e8400-e29b-41d4-a716-446655440000",
  "regenerate": false
}
```

**レスポンス例**:

```json
{
  "success": true,
  "data": {
    "actionId": "770e8400-e29b-41d4-a716-446655440000",
    "tasks": [
      {
        "id": "uuid",
        "title": "TypeScript公式ドキュメントの基礎編を読む",
        "description": "TypeScript公式ドキュメントの基礎編（型システム、インターフェース、クラス）を読み、サンプルコードを実際に動かして理解を深める",
        "type": "execution",
        "status": "not_started",
        "estimatedMinutes": 45,
        "priority": "high",
        "dependencies": [],
        "createdAt": "2025-10-10T10:00:00Z",
        "updatedAt": "2025-10-10T10:00:00Z"
      },
      {
        "id": "uuid",
        "title": "TypeScriptの型システムを実践する",
        "description": "学んだ型システムの知識を使って、簡単なTypeScriptプログラムを作成し、型の恩恵を体感する",
        "type": "execution",
        "status": "not_started",
        "estimatedMinutes": 60,
        "priority": "medium",
        "dependencies": ["前のタスクのID"],
        "createdAt": "2025-10-10T10:00:00Z",
        "updatedAt": "2025-10-10T10:00:00Z"
      }
      // ... 追加のタスク
    ]
  },
  "metadata": {
    "generatedAt": "2025-10-10T10:00:00Z",
    "tokensUsed": 2500,
    "estimatedCost": 0.00038,
    "actionContext": {
      "goalTitle": "TypeScriptのエキスパートになる",
      "subGoalTitle": "TypeScriptの基礎文法を習得する",
      "actionTitle": "TypeScript公式ドキュメントを読む",
      "actionType": "execution"
    },
    "taskCount": 3,
    "totalEstimatedMinutes": 150
  }
}
```

**タスクの特徴**:

- **粒度**: 各タスクは30-60分程度で実行可能（許容範囲: 15-120分）
- **種別**: アクションの種別を継承（実行タスク/習慣タスク）
- **優先度**: HIGH/MEDIUM/LOWの3段階で自動設定
- **依存関係**: タスク間の前提条件を自動検出

詳細は [タスク生成API仕様書](./docs/task-generation-api-specification.md) を参照してください。

### ヘルスチェック

**エンドポイント**: `GET /health`

**説明**: APIの稼働状態を確認します。

**認証**: 不要

**レスポンス例**:

```json
{
  "status": "ok",
  "timestamp": "2025-10-07T10:00:00Z"
}
```

## データベース

### Prismaスキーマ

データベーススキーマは `prisma/schema.prisma` で定義されています。

主要なモデル：

- **User**: ユーザー情報
- **Goal**: 目標
- **SubGoal**: サブ目標（目標に対して8個）
- **Action**: アクション（サブ目標に対して8個）
- **Task**: タスク（アクションに対してN個）

### マイグレーション

```bash
# 新しいマイグレーションの作成
pnpm prisma:migrate:dev --name migration_name

# マイグレーションの適用
pnpm prisma:migrate:deploy

# マイグレーションのステータス確認
pnpm prisma:migrate:status
```

### Prisma Studio

```bash
# Prisma Studioの起動（データベースGUI）
pnpm prisma:studio
```

## デプロイ

### 開発環境へのデプロイ

```bash
# SAMでデプロイ
sam deploy --config-env dev
```

### 本番環境へのデプロイ

```bash
# SAMでデプロイ
sam deploy --config-env prod
```

デプロイは通常、GitHub Actionsで自動的に実行されます。

## 監視・ログ

### CloudWatch Logs

Lambda関数のログは CloudWatch Logs に出力されます。

ログの確認：

```bash
# AWS CLIでログを確認
aws logs tail /aws/lambda/SubGoalGenerationFunction --follow
```

### 構造化ログ

全てのログは構造化されたJSON形式で出力されます：

```json
{
  "timestamp": "2025-10-07T10:00:00Z",
  "level": "INFO",
  "requestId": "req-123",
  "userId": "user-456",
  "action": "subgoal_generation_success",
  "duration": 25000,
  "metadata": {
    "goalId": "goal-789",
    "subGoalCount": 8,
    "tokensUsed": 1500,
    "estimatedCost": 0.000225
  }
}
```

### メトリクス

主要なメトリクス：

- **Duration**: 処理時間（p95 < 30秒が目標）
- **Errors**: エラー率（< 5%が目標）
- **Throttles**: スロットリング発生数
- **ConcurrentExecutions**: 同時実行数

## トラブルシューティング

よくある問題と解決方法については、以下のドキュメントを参照してください：

### サブ目標生成API

- [エラーコード一覧](./docs/subgoal-generation-error-codes.md)
- [トラブルシューティングガイド](./docs/subgoal-generation-troubleshooting-guide.md)
- [運用ガイド](./docs/subgoal-generation-operations-guide.md)

### アクション生成API

- [エラーコード一覧](./docs/action-generation-error-codes.md)
- [トラブルシューティングガイド](./docs/action-generation-troubleshooting-guide.md)
- [運用ガイド](./docs/action-generation-operations-guide.md)

### タスク生成API

- [エラーコード一覧](./docs/task-generation-error-codes.md)
- [トラブルシューティングガイド](./docs/task-generation-troubleshooting-guide.md)
- [運用ガイド](./docs/task-generation-operations-guide.md)

## ドキュメント

### サブ目標生成API

- [API仕様書](./docs/subgoal-generation-api-specification.md) - エンドポイント、リクエスト、レスポンスの詳細
- [エラーコード一覧](./docs/subgoal-generation-error-codes.md) - エラーコードと対処方法
- [運用ガイド](./docs/subgoal-generation-operations-guide.md) - 監視項目、アラート対応手順
- [トラブルシューティングガイド](./docs/subgoal-generation-troubleshooting-guide.md) - よくある問題と解決方法

### アクション生成API

- [API仕様書](./docs/action-generation-api-specification.md) - エンドポイント、リクエスト、レスポンス、アクション種別の詳細
- [エラーコード一覧](./docs/action-generation-error-codes.md) - エラーコードと対処方法
- [運用ガイド](./docs/action-generation-operations-guide.md) - 監視項目、アラート対応手順、アクション種別判定の仕組み
- [トラブルシューティングガイド](./docs/action-generation-troubleshooting-guide.md) - よくある問題と解決方法、品質エラーの対処

### タスク生成API

- [API仕様書](./docs/task-generation-api-specification.md) - エンドポイント、リクエスト、レスポンス、タスク粒度・優先度・依存関係の詳細
- [エラーコード一覧](./docs/task-generation-error-codes.md) - エラーコードと対処方法
- [運用ガイド](./docs/task-generation-operations-guide.md) - 監視項目、アラート対応手順、タスク粒度調整・優先度設定の仕組み
- [トラブルシューティングガイド](./docs/task-generation-troubleshooting-guide.md) - よくある問題と解決方法、品質エラーの対処

## コントリビューション

### コーディング規約

- TypeScriptの`any`型は使用しない
- 未使用変数は削除する
- ESLintとPrettierのルールに従う
- テストカバレッジ80%以上を維持

### プルリクエスト

1. フィーチャーブランチを作成
2. 変更を実装
3. テストを追加・更新
4. リント・フォーマットを実行
5. プルリクエストを作成

### コミットメッセージ

Conventional Commitsに従ってください：

```
feat: サブ目標生成APIの実装
fix: バリデーションエラーの修正
docs: API仕様書の更新
test: サブ目標生成サービスのテスト追加
```

## ライセンス

[ライセンス情報]

## サポート

問題が発生した場合は、以下の方法でサポートを受けられます：

- GitHub Issuesで報告
- 開発チームに連絡
- ドキュメントを確認

## 関連リンク

- [プロジェクトルートREADME](../../README.md)
- [フロントエンドREADME](../frontend/README.md)
- [インフラREADME](../infrastructure/README.md)
