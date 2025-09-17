# 設計書

## 概要

曼荼羅目標管理システムのPrismaスキーマ設計において、ER図で定義されたデータ構造をPrisma ORMで実装可能な形式に変換します。TypeScriptでの型安全性、PostgreSQLでのパフォーマンス最適化、データベースマイグレーションの自動化を実現する設計を行います。

## アーキテクチャ設計

### スキーマファイル構成

```
packages/backend/prisma/
├── schema.prisma          # メインスキーマファイル
├── migrations/           # マイグレーションファイル
└── seed.ts              # シードデータ
```

### データベース設定

```prisma
generator client {
  provider = "prisma-client-js"
  output   = "../src/generated/prisma-client"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

## データモデル設計

### 1. Userモデル

```prisma
model User {
  id        String   @id @default(uuid()) @db.Uuid
  email     String   @unique @db.VarChar(255)
  name      String   @db.VarChar(100)
  industry  UserIndustry?
  companySize CompanySize?
  jobType   String?  @db.VarChar(100)
  position  String?  @db.VarChar(100)
  createdAt DateTime @default(now()) @db.Timestamptz
  updatedAt DateTime @updatedAt @db.Timestamptz

  // Relations
  goals Goal[]

  @@map("users")
}
```

### 2. Goalモデル

```prisma
model Goal {
  id          String     @id @default(uuid()) @db.Uuid
  userId      String     @db.Uuid
  title       String     @db.VarChar(200)
  description String?    @db.Text
  deadline    DateTime?  @db.Timestamptz
  background  String?    @db.Text
  constraints String?    @db.Text
  status      GoalStatus @default(ACTIVE)
  progress    Int        @default(0) @db.SmallInt
  createdAt   DateTime   @default(now()) @db.Timestamptz
  updatedAt   DateTime   @updatedAt @db.Timestamptz

  // Relations
  user     User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  subGoals SubGoal[]

  // Constraints
  @@check([progress >= 0 && progress <= 100], name: "progress_range")
  
  // Indexes
  @@index([userId, status])
  @@index([userId, createdAt])
  @@map("goals")
}
```

### 3. SubGoalモデル

```prisma
model SubGoal {
  id          String @id @default(uuid()) @db.Uuid
  goalId      String @db.Uuid
  title       String @db.VarChar(200)
  description String? @db.Text
  background  String? @db.Text
  constraints String? @db.Text
  position    Int    @db.SmallInt
  progress    Int    @default(0) @db.SmallInt
  createdAt   DateTime @default(now()) @db.Timestamptz
  updatedAt   DateTime @updatedAt @db.Timestamptz

  // Relations
  goal    Goal     @relation(fields: [goalId], references: [id], onDelete: Cascade)
  actions Action[]

  // Constraints
  @@check([position >= 0 && position <= 7], name: "position_range")
  @@check([progress >= 0 && progress <= 100], name: "progress_range")
  
  // Unique constraints
  @@unique([goalId, position])
  
  // Indexes
  @@index([goalId, position])
  @@map("sub_goals")
}
```

### 4. Actionモデル

```prisma
model Action {
  id          String @id @default(uuid()) @db.Uuid
  subGoalId   String @db.Uuid
  title       String @db.VarChar(200)
  description String? @db.Text
  background  String? @db.Text
  constraints String? @db.Text
  position    Int    @db.SmallInt
  progress    Int    @default(0) @db.SmallInt
  createdAt   DateTime @default(now()) @db.Timestamptz
  updatedAt   DateTime @updatedAt @db.Timestamptz

  // Relations
  subGoal SubGoal @relation(fields: [subGoalId], references: [id], onDelete: Cascade)
  tasks   Task[]

  // Constraints
  @@check([position >= 0 && position <= 7], name: "position_range")
  @@check([progress >= 0 && progress <= 100], name: "progress_range")
  
  // Unique constraints
  @@unique([subGoalId, position])
  
  // Indexes
  @@index([subGoalId, position])
  @@map("actions")
}
```

### 5. Taskモデル

```prisma
model Task {
  id            String     @id @default(uuid()) @db.Uuid
  actionId      String     @db.Uuid
  title         String     @db.VarChar(200)
  description   String?    @db.Text
  type          TaskType   @default(ACTION)
  status        TaskStatus @default(PENDING)
  estimatedTime Int?       @db.SmallInt
  completedAt   DateTime?  @db.Timestamptz
  createdAt     DateTime   @default(now()) @db.Timestamptz
  updatedAt     DateTime   @updatedAt @db.Timestamptz

  // Relations
  action       Action        @relation(fields: [actionId], references: [id], onDelete: Cascade)
  reminders    TaskReminder[]
  reflections  Reflection[]

  // Indexes
  @@index([actionId, status])
  @@index([status, createdAt])
  @@map("tasks")
}
```

### 6. TaskReminderモデル

```prisma
model TaskReminder {
  id          String         @id @default(uuid()) @db.Uuid
  taskId      String         @db.Uuid
  reminderAt  DateTime       @db.Timestamptz
  message     String?        @db.Text
  status      ReminderStatus @default(PENDING)
  sentAt      DateTime?      @db.Timestamptz
  createdAt   DateTime       @default(now()) @db.Timestamptz
  updatedAt   DateTime       @updatedAt @db.Timestamptz

  // Relations
  task Task @relation(fields: [taskId], references: [id], onDelete: Cascade)

  // Indexes
  @@index([status, reminderAt])
  @@index([taskId, reminderAt])
  @@map("task_reminders")
}
```

### 7. Reflectionモデル

```prisma
model Reflection {
  id        String   @id @default(uuid()) @db.Uuid
  taskId    String   @db.Uuid
  content   String   @db.Text
  rating    Int?     @db.SmallInt
  createdAt DateTime @default(now()) @db.Timestamptz
  updatedAt DateTime @updatedAt @db.Timestamptz

  // Relations
  task Task @relation(fields: [taskId], references: [id], onDelete: Cascade)

  // Constraints
  @@check([rating >= 1 && rating <= 5], name: "rating_range")
  
  // Indexes
  @@index([taskId, createdAt])
  @@map("reflections")
}
```

## Enum定義

### UserIndustry

```prisma
enum UserIndustry {
  TECHNOLOGY
  FINANCE
  HEALTHCARE
  EDUCATION
  MANUFACTURING
  RETAIL
  CONSULTING
  GOVERNMENT
  NON_PROFIT
  OTHER
}
```

### CompanySize

```prisma
enum CompanySize {
  STARTUP        // 1-10人
  SMALL          // 11-50人
  MEDIUM         // 51-200人
  LARGE          // 201-1000人
  ENTERPRISE     // 1000人以上
}
```

### GoalStatus

```prisma
enum GoalStatus {
  ACTIVE
  COMPLETED
  PAUSED
  CANCELLED
}
```

### TaskType

```prisma
enum TaskType {
  ACTION      // 実行タスク
  LEARNING    // 学習タスク
  RESEARCH    // 調査タスク
  MEETING     // 会議・打ち合わせ
  REVIEW      // レビュー・確認
}
```

### TaskStatus

```prisma
enum TaskStatus {
  PENDING     // 未着手
  IN_PROGRESS // 進行中
  COMPLETED   // 完了
  CANCELLED   // キャンセル
}
```

### ReminderStatus

```prisma
enum ReminderStatus {
  PENDING   // 送信待ち
  SENT      // 送信済み
  FAILED    // 送信失敗
  CANCELLED // キャンセル
}
```

## インデックス戦略

### 1. 基本インデックス

- **ユーザー目標一覧**: `(userId, status)`, `(userId, createdAt)`
- **階層データ取得**: `(goalId, position)`, `(subGoalId, position)`
- **タスク管理**: `(actionId, status)`, `(status, createdAt)`

### 2. リマインダー用インデックス

- **送信対象検索**: `(status, reminderAt)`
- **タスク別リマインダー**: `(taskId, reminderAt)`

### 3. 分析用インデックス

- **振り返り分析**: `(taskId, createdAt)`

## パフォーマンス最適化

### 1. クエリ最適化

```prisma
// 階層データの効率的な取得用
@@index([goalId, position], name: "idx_subgoal_hierarchy")
@@index([subGoalId, position], name: "idx_action_hierarchy")
```

### 2. カスケード削除

```prisma
// データ整合性を保ちながら効率的な削除
@relation(fields: [userId], references: [id], onDelete: Cascade)
```

### 3. 部分インデックス（将来的な拡張）

```sql
-- アクティブな目標のみのインデックス（PostgreSQL固有）
CREATE INDEX idx_active_goals ON goals (user_id, created_at) 
WHERE status = 'ACTIVE';
```

## マイグレーション戦略

### 1. 初期マイグレーション

```bash
# スキーマからマイグレーション生成
npx prisma migrate dev --name init

# 本番環境へのデプロイ
npx prisma migrate deploy
```

### 2. スキーマ検証

```bash
# スキーマの妥当性確認
npx prisma validate

# データベースとの同期確認
npx prisma db pull
```

### 3. シードデータ

```typescript
// prisma/seed.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // テストユーザーの作成
  const user = await prisma.user.create({
    data: {
      email: 'test@example.com',
      name: 'テストユーザー',
      industry: 'TECHNOLOGY',
      companySize: 'STARTUP'
    }
  })
}
```

## 型安全性の確保

### 1. Prismaクライアント生成

```typescript
// 自動生成される型定義の活用
import { User, Goal, Prisma } from '@prisma/client'

// 関連データを含む型
type GoalWithSubGoals = Prisma.GoalGetPayload<{
  include: { subGoals: true }
}>
```

### 2. バリデーション

```typescript
// Zodスキーマとの連携
import { z } from 'zod'

const CreateGoalSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  deadline: z.date().optional(),
  progress: z.number().min(0).max(100)
})
```

## セキュリティ考慮事項

### 1. データアクセス制御

```prisma
// Row Level Security（RLS）の準備
// PostgreSQLのRLS機能と連携予定
```

### 2. 機密データの保護

```prisma
// 機密情報は別テーブルで管理
model UserSecret {
  id     String @id @default(uuid())
  userId String @unique
  // 暗号化された機密データ
}
```

## 監視とメトリクス

### 1. クエリパフォーマンス

```typescript
// Prismaのクエリログ有効化
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
})
```

### 2. 接続プール管理

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  // 接続プール設定
  // ?connection_limit=10&pool_timeout=20
}
```
