# Prisma Database Schema

## 概要

曼荼羅目標管理システムのデータベーススキーマ定義です。Prisma ORMを使用してPostgreSQLデータベースとの型安全なやり取りを実現します。

## スキーマ構成

### モデル一覧

1. **User** - ユーザー情報
2. **Goal** - 目標（中央の目標）
3. **SubGoal** - サブ目標（8個の周辺目標）
4. **Action** - アクション（各サブ目標に8個）
5. **Task** - タスク（各アクションに複数）
6. **TaskReminder** - タスクリマインダー
7. **Reflection** - 振り返り

### 階層構造

```
User
└── Goal (1:N)
    └── SubGoal (1:8) - position: 0-7
        └── Action (1:8) - position: 0-7
            └── Task (1:N)
                ├── TaskReminder (1:N)
                └── Reflection (1:N)
```

## 使用方法

### 1. 環境変数設定

```bash
# .env ファイルに設定
DATABASE_URL="postgresql://username:password@localhost:5432/goal_mandala"
```

### 2. マイグレーション実行

```bash
# 開発環境でのマイグレーション
npx prisma migrate dev --name init

# 本番環境でのマイグレーション
npx prisma migrate deploy
```

### 3. シードデータ投入

```bash
npx prisma db seed
```

### 4. Prismaクライアント生成

```bash
npx prisma generate
```

## 開発者向けコマンド

### スキーマ検証

```bash
# スキーマの妥当性確認
npx prisma validate

# スキーマのフォーマット
npx prisma format
```

### データベース管理

```bash
# データベースの状態確認
npx prisma db pull

# Prisma Studioでデータ確認
npx prisma studio
```

### 型定義の活用

```typescript
import { PrismaClient, User, Goal, Prisma } from '../generated/prisma-client';

const prisma = new PrismaClient();

// 関連データを含む型
type GoalWithSubGoals = Prisma.GoalGetPayload<{
  include: { subGoals: true };
}>;

// ユーザーの目標一覧取得
const goals = await prisma.goal.findMany({
  where: { userId: user.id },
  include: {
    subGoals: {
      include: {
        actions: {
          include: {
            tasks: true,
          },
        },
      },
    },
  },
});
```

## 制約事項

### 位置制約

- SubGoal.position: 0-7 (8個の位置)
- Action.position: 0-7 (8個の位置)

### 進捗制約

- Goal.progress: 0-100 (パーセント)
- SubGoal.progress: 0-100 (パーセント)
- Action.progress: 0-100 (パーセント)

### 評価制約

- Reflection.rating: 1-5 (5段階評価)

## インデックス戦略

### パフォーマンス最適化

- ユーザー目標一覧: `(userId, status)`, `(userId, createdAt)`
- 階層データ取得: `(goalId, position)`, `(subGoalId, position)`
- タスク管理: `(actionId, status)`, `(status, createdAt)`
- リマインダー: `(status, reminderAt)`, `(taskId, reminderAt)`

## セキュリティ考慮事項

### データアクセス制御

- 全てのクエリでユーザーIDによるフィルタリングが必要
- カスケード削除により関連データの整合性を保証

### 機密データ保護

- パスワードなどの機密情報は別途暗号化して管理
- 個人情報は最小限に留める

## トラブルシューティング

### よくある問題

1. **DATABASE_URL not found**

   ```bash
   # .envファイルにDATABASE_URLを設定
   echo 'DATABASE_URL="postgresql://..."' >> .env
   ```

2. **Migration failed**

   ```bash
   # マイグレーション状態の確認
   npx prisma migrate status

   # 問題のあるマイグレーションをリセット
   npx prisma migrate reset
   ```

3. **Client generation failed**
   ```bash
   # キャッシュクリア後に再生成
   npx prisma generate --force-color
   ```
