# 振り返り機能 設計書

## アーキテクチャ概要

振り返り機能は、ユーザーが目標達成状況を振り返り、改善点を記録するための機能です。以下の3層アーキテクチャで実装します：

```
フロントエンド（React）
    ↓
API Gateway + Lambda（Hono）
    ↓
Aurora Serverless V2（PostgreSQL）
```

## データベース設計

### Reflectionsテーブル

```sql
CREATE TABLE reflections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  summary TEXT NOT NULL CHECK (char_length(summary) <= 1000),
  regretful_actions TEXT CHECK (char_length(regretful_actions) <= 500),
  slow_progress_actions TEXT CHECK (char_length(slow_progress_actions) <= 500),
  untouched_actions TEXT CHECK (char_length(untouched_actions) <= 500),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reflections_goal_id ON reflections(goal_id);
CREATE INDEX idx_reflections_user_id ON reflections(user_id);
CREATE INDEX idx_reflections_created_at ON reflections(created_at DESC);
```

### Prismaスキーマ

```prisma
model Reflection {
  id                   String   @id @default(uuid())
  goalId               String   @map("goal_id")
  userId               String   @map("user_id")
  summary              String   @db.Text
  regretfulActions     String?  @map("regretful_actions") @db.Text
  slowProgressActions  String?  @map("slow_progress_actions") @db.Text
  untouchedActions     String?  @map("untouched_actions") @db.Text
  createdAt            DateTime @default(now()) @map("created_at")
  updatedAt            DateTime @updatedAt @map("updated_at")

  goal Goal @relation(fields: [goalId], references: [id], onDelete: Cascade)
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([goalId])
  @@index([userId])
  @@index([createdAt(sort: Desc)])
  @@map("reflections")
}
```

## API設計

### エンドポイント一覧

| メソッド | パス | 説明 | 認証 |
|---------|------|------|------|
| POST | /api/reflections | 振り返り作成 | 必須 |
| GET | /api/reflections | 振り返り一覧取得 | 必須 |
| GET | /api/reflections/:id | 振り返り詳細取得 | 必須 |
| PUT | /api/reflections/:id | 振り返り更新 | 必須 |
| DELETE | /api/reflections/:id | 振り返り削除 | 必須 |

## バックエンド実装

### ディレクトリ構造

```
packages/backend/src/
├── handlers/
│   └── reflection-handler.ts
├── services/
│   ├── reflection-service.ts
│   └── validation-service.ts
├── repositories/
│   └── reflection-repository.ts
├── schemas/
│   └── reflection-schema.ts
└── types/
    └── reflection-types.ts
```

## フロントエンド実装

### ディレクトリ構造

```
packages/frontend/src/
├── pages/
│   ├── ReflectionInputPage.tsx
│   ├── ReflectionListPage.tsx
│   └── ReflectionDetailPage.tsx
├── components/
│   └── reflection/
│       ├── ReflectionForm.tsx
│       ├── ReflectionCard.tsx
│       └── ReflectionList.tsx
├── hooks/
│   ├── useReflection.ts
│   └── useReflectionForm.ts
└── api/
    └── reflection-api.ts
```

## セキュリティ設計

1. **JWT認証**: すべてのAPIエンドポイントでJWTトークンを検証
2. **所有者確認**: ユーザーは自分の振り返りのみにアクセス可能
3. **入力サニタイゼーション**: XSS対策のため入力値をサニタイズ

## パフォーマンス最適化

1. **インデックス活用**: goal_id、user_id、created_atにインデックスを設定
2. **ページネーション**: LIMIT/OFFSETを使用
3. **React Query**: 5分間のstaleTimeを設定

## 監視・ログ

- CloudWatchメトリクス: 作成数、エラー数
- 構造化ログ: JSON形式でログ出力
- アラート: エラー率が10%を超えたら通知

## テスト戦略

1. **プロパティベーステスト**: 20個以上のプロパティを検証
2. **統合テスト**: CRUD操作の完全なフロー
3. **E2Eテスト**: ユーザーフローの検証

## 参考資料

- [タスク管理機能（3.1）](./../3.1.1-task-management/)
- [リマインド機能（3.2）](./../3.2-reminder-functionality/)
- [Step Functions統合（3.3）](./../3.3-step-functions-integration/)
