# 変更履歴スキーマ実装サマリー

## 概要

マンダラチャート編集機能のための変更履歴管理スキーマを実装しました。このドキュメントでは、実装内容と使用方法を説明します。

## 実装内容

### 1. Prismaスキーマ拡張

#### ChangeHistoryモデルの追加

```prisma
model ChangeHistory {
  id         String   @id @default(uuid()) @db.Uuid
  entityType String   @db.VarChar(20) // 'goal', 'subgoal', 'action'
  entityId   String   @db.Uuid
  userId     String   @db.Uuid
  changedAt  DateTime @default(now()) @db.Timestamptz
  changes    Json // 変更内容の配列
  createdAt  DateTime @default(now()) @db.Timestamptz

  // Relations
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Indexes
  @@index([entityType, entityId, changedAt])
  @@index([userId, changedAt])
  @@map("change_history")
}
```

#### 既存モデルの確認

以下のモデルには既に`updatedAt`フィールドが存在し、楽観的ロックに使用できます：

- `Goal.updatedAt`
- `SubGoal.updatedAt`
- `Action.updatedAt`

### 2. データベーステーブル構造

#### change_historyテーブル

| カラム名    | データ型    | 制約                    | 説明                                      |
| ----------- | ----------- | ----------------------- | ----------------------------------------- |
| id          | UUID        | PRIMARY KEY             | 履歴レコードID                            |
| entity_type | VARCHAR(20) | NOT NULL                | エンティティタイプ（goal/subgoal/action） |
| entity_id   | UUID        | NOT NULL                | エンティティID                            |
| user_id     | UUID        | NOT NULL, FK            | 変更を行ったユーザーID                    |
| changed_at  | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 変更日時                                  |
| changes     | JSONB       | NOT NULL                | 変更内容（JSON配列）                      |
| created_at  | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | レコード作成日時                          |

#### インデックス

1. **複合インデックス**: `(entity_type, entity_id, changed_at)`
   - 用途: 特定エンティティの履歴を時系列で取得
   - クエリ例: 目標IDに対する変更履歴の取得

2. **複合インデックス**: `(user_id, changed_at)`
   - 用途: ユーザーごとの変更履歴を時系列で取得
   - クエリ例: ユーザーの最近の変更履歴の取得

#### 外部キー制約

- `user_id` → `users.id`: CASCADE DELETE
  - ユーザーが削除されると、そのユーザーの変更履歴も削除される

### 3. 変更内容のJSON構造

変更内容は以下の形式でJSONB型に保存されます：

```typescript
interface ChangeEntry {
  field: string; // 変更されたフィールド名
  oldValue: string; // 変更前の値
  newValue: string; // 変更後の値
}

// 例
[
  {
    field: 'title',
    oldValue: '古いタイトル',
    newValue: '新しいタイトル',
  },
  {
    field: 'description',
    oldValue: '古い説明',
    newValue: '新しい説明',
  },
];
```

## マイグレーション

### マイグレーションファイル

- **パス**: `packages/backend/prisma/migrations/20251005002705_add_change_history_table/migration.sql`
- **内容**:
  - change_historyテーブルの作成
  - インデックスの作成
  - 外部キー制約の追加

### 実行方法

#### 方法1: スクリプトを使用（推奨）

```bash
cd packages/backend
./scripts/run-migration.sh
```

このスクリプトは以下を自動的に実行します：

1. Dockerコンテナの起動確認
2. データベース接続確認
3. Prismaクライアント生成
4. マイグレーション実行
5. テーブル作成確認
6. テスト実行（オプション）

#### 方法2: 手動実行

```bash
# 1. Dockerコンテナ起動
docker-compose up -d postgres

# 2. マイグレーション実行
cd packages/backend
npx prisma migrate deploy

# 3. 確認
docker exec -it goal-mandala-postgres psql -U goal_mandala_user -d goal_mandala_dev -c "\dt change_history"
```

詳細な手順は `MIGRATION_INSTRUCTIONS.md` を参照してください。

## テスト

### テストファイル

- **パス**: `packages/backend/tests/migration-change-history.test.ts`

### テスト内容

1. **スキーマ検証テスト**
   - テーブルの存在確認
   - カラムの存在確認
   - データ型の確認
   - インデックスの確認
   - 外部キー制約の確認

2. **データ整合性テスト**
   - 変更履歴レコードの作成
   - 変更履歴の取得
   - カスケード削除の動作確認
   - 複雑なJSON構造の保存・取得

3. **updatedAtフィールドテスト**
   - Goal、SubGoal、ActionモデルのupdatedAt確認
   - 更新時のupdatedAt自動更新確認

### テスト実行

```bash
cd packages/backend
npm test -- tests/migration-change-history.test.ts --run
```

## 使用例

### 変更履歴の記録

```typescript
import { PrismaClient } from './generated/prisma-client';

const prisma = new PrismaClient();

// 目標の更新と変更履歴の記録
async function updateGoalWithHistory(
  goalId: string,
  userId: string,
  oldTitle: string,
  newTitle: string
) {
  // トランザクションで実行
  await prisma.$transaction(async tx => {
    // 目標を更新
    await tx.goal.update({
      where: { id: goalId },
      data: { title: newTitle },
    });

    // 変更履歴を記録
    await tx.changeHistory.create({
      data: {
        entityType: 'goal',
        entityId: goalId,
        userId: userId,
        changes: [
          {
            field: 'title',
            oldValue: oldTitle,
            newValue: newTitle,
          },
        ],
      },
    });
  });
}
```

### 変更履歴の取得

```typescript
// 特定の目標の変更履歴を取得
async function getGoalHistory(goalId: string, limit: number = 20) {
  return await prisma.changeHistory.findMany({
    where: {
      entityType: 'goal',
      entityId: goalId,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      changedAt: 'desc',
    },
    take: limit,
  });
}
```

### 楽観的ロックの実装

```typescript
// updatedAtを使用した楽観的ロック
async function updateGoalWithOptimisticLock(
  goalId: string,
  userId: string,
  updatedAt: Date,
  newData: { title?: string; description?: string }
) {
  // 現在のデータを取得
  const currentGoal = await prisma.goal.findUnique({
    where: { id: goalId },
  });

  if (!currentGoal) {
    throw new Error('Goal not found');
  }

  // updatedAtを比較して競合をチェック
  if (currentGoal.updatedAt.getTime() !== updatedAt.getTime()) {
    throw new Error('Edit conflict: Goal has been modified by another user');
  }

  // 変更内容を記録
  const changes = [];
  if (newData.title && newData.title !== currentGoal.title) {
    changes.push({
      field: 'title',
      oldValue: currentGoal.title,
      newValue: newData.title,
    });
  }
  if (newData.description && newData.description !== currentGoal.description) {
    changes.push({
      field: 'description',
      oldValue: currentGoal.description || '',
      newValue: newData.description,
    });
  }

  // トランザクションで更新
  return await prisma.$transaction(async tx => {
    // 更新
    const updated = await tx.goal.update({
      where: { id: goalId },
      data: newData,
    });

    // 変更履歴を記録
    if (changes.length > 0) {
      await tx.changeHistory.create({
        data: {
          entityType: 'goal',
          entityId: goalId,
          userId: userId,
          changes: changes,
        },
      });
    }

    return updated;
  });
}
```

## パフォーマンス考慮事項

### インデックスの活用

1. **エンティティ別履歴取得**: `(entity_type, entity_id, changed_at)`インデックスを使用
2. **ユーザー別履歴取得**: `(user_id, changed_at)`インデックスを使用

### クエリ最適化

```typescript
// ページネーション付き履歴取得
async function getHistoryWithPagination(
  entityType: string,
  entityId: string,
  page: number = 1,
  pageSize: number = 20
) {
  const skip = (page - 1) * pageSize;

  const [history, total] = await Promise.all([
    prisma.changeHistory.findMany({
      where: { entityType, entityId },
      orderBy: { changedAt: 'desc' },
      skip,
      take: pageSize,
      include: {
        user: {
          select: { id: true, name: true },
        },
      },
    }),
    prisma.changeHistory.count({
      where: { entityType, entityId },
    }),
  ]);

  return {
    history,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}
```

## セキュリティ考慮事項

1. **アクセス制御**: 変更履歴の閲覧は、エンティティの所有者または管理者のみに制限
2. **データ検証**: 変更内容のJSONは適切にバリデーション
3. **監査ログ**: 変更履歴自体が監査ログとして機能

## 今後の拡張

1. **ロールバック機能**: 特定の履歴バージョンへの復元
2. **差分表示**: 変更内容の視覚的な差分表示
3. **変更通知**: 重要な変更の通知機能
4. **履歴の圧縮**: 古い履歴の自動アーカイブ

## トラブルシューティング

### よくある問題

1. **Docker volume permission エラー**

   ```bash
   docker-compose down -v
   docker volume rm goal-mandala_postgres-data
   docker-compose up -d postgres
   ```

2. **マイグレーション失敗**

   ```bash
   npx prisma migrate status
   npx prisma migrate resolve --rolled-back "20251005002705_add_change_history_table"
   npx prisma migrate deploy
   ```

3. **テスト失敗**
   - データベース接続を確認
   - テストデータのクリーンアップを確認
   - Prismaクライアントを再生成: `npx prisma generate`

## 関連ドキュメント

- [MIGRATION_INSTRUCTIONS.md](../MIGRATION_INSTRUCTIONS.md) - 詳細なマイグレーション手順
- [design.md](../../../.kiro/specs/2.1.5-edit-functionality/design.md) - 編集機能の設計書
- [requirements.md](../../../.kiro/specs/2.1.5-edit-functionality/requirements.md) - 編集機能の要件定義

## まとめ

変更履歴スキーマの実装により、以下が可能になりました：

1. ✅ 目標、サブ目標、アクションの変更履歴の記録
2. ✅ 楽観的ロックによる編集競合の検出
3. ✅ ユーザーごと・エンティティごとの履歴取得
4. ✅ JSON形式での柔軟な変更内容の保存
5. ✅ 包括的なテストによる品質保証

次のステップとして、バックエンドAPIの実装に進むことができます。
