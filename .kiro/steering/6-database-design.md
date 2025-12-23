---
inclusion: fileMatch
fileMatchPattern: 'packages/backend/{prisma,src/services}/**/*.{ts,prisma}'
---

# データベース設計

## 概要

マンダラ目標管理システムのデータベース設計。マンダラチャートの階層構造（目標→サブ目標→アクション→タスク）を適切にモデル化し、データ整合性を保証。

## エンティティ定義

### User（ユーザー）

```typescript
interface User {
  id: string;           // UUID、主キー
  email: string;        // メールアドレス、ユニーク
  name: string;         // 表示名
  industry?: string;    // 業種
  company_size?: string; // 組織規模
  job_title?: string;   // 職種
  position?: string;    // 役職
  created_at: Date;
  updated_at: Date;
}
```

### Goal（目標）

```typescript
interface Goal {
  id: string;
  user_id: string;      // 外部キー
  title: string;
  description: string;
  deadline: Date;
  background: string;
  constraints?: string;
  status: GoalStatus;   // draft/active/completed/paused/cancelled
  progress: number;     // 0-100
  created_at: Date;
  updated_at: Date;
}
```

### SubGoal（サブ目標）

```typescript
interface SubGoal {
  id: string;
  goal_id: string;      // 外部キー
  title: string;
  description: string;
  background: string;
  constraints?: string;
  position: number;     // 0-7
  progress: number;     // 0-100
  created_at: Date;
  updated_at: Date;
}
```

### Action（アクション）

```typescript
interface Action {
  id: string;
  sub_goal_id: string;  // 外部キー
  title: string;
  description: string;
  background: string;
  constraints?: string;
  type: ActionType;     // execution/habit
  position: number;     // 0-7
  progress: number;     // 0-100
  created_at: Date;
  updated_at: Date;
}
```

### Task（タスク）

```typescript
interface Task {
  id: string;
  action_id: string;    // 外部キー
  title: string;
  description?: string;
  type: TaskType;       // execution/habit
  status: TaskStatus;   // not_started/in_progress/completed/skipped
  estimated_minutes: number;
  completed_at?: Date;
  created_at: Date;
  updated_at: Date;
}
```

### TaskReminder（タスクリマインド）

```typescript
interface TaskReminder {
  id: string;
  task_id: string;      // 外部キー
  reminder_date: Date;
  sent: boolean;
  sent_at?: Date;
  created_at: Date;
}
```

### Reflection（振り返り）

```typescript
interface Reflection {
  id: string;
  goal_id: string;      // 外部キー
  summary: string;
  regretful_actions?: string;
  slow_progress_actions?: string;
  untouched_actions?: string;
  created_at: Date;
  updated_at: Date;
}
```

## ER図

```mermaid
erDiagram
    User {
        string id PK
        string email UK
        string name
        string industry
        string company_size
        string job_title
        string position
        datetime created_at
        datetime updated_at
    }
  
    Goal {
        string id PK
        string user_id FK
        string title
        text description
        date deadline
        text background
        text constraints
        enum status
        int progress
        datetime created_at
        datetime updated_at
    }
  
    SubGoal {
        string id PK
        string goal_id FK
        string title
        text description
        text background
        text constraints
        int position
        int progress
        datetime created_at
        datetime updated_at
    }
  
    Action {
        string id PK
        string sub_goal_id FK
        string title
        text description
        text background
        text constraints
        enum type
        int position
        int progress
        datetime created_at
        datetime updated_at
    }
  
    Task {
        string id PK
        string action_id FK
        string title
        text description
        enum type
        enum status
        int estimated_minutes
        datetime completed_at
        datetime created_at
        datetime updated_at
    }
  
    TaskReminder {
        string id PK
        string task_id FK
        date reminder_date
        boolean sent
        datetime sent_at
        datetime created_at
    }
  
    Reflection {
        string id PK
        string goal_id FK
        text summary
        text regretful_actions
        text slow_progress_actions
        text untouched_actions
        datetime created_at
        datetime updated_at
    }
  
    User ||--o{ Goal : creates
    Goal ||--|| SubGoal : contains_8
    SubGoal ||--|| Action : contains_8
    Action ||--o{ Task : contains
    Task ||--o{ TaskReminder : has
    Goal ||--o{ Reflection : has
```

## リレーションシップ

1:N リレーション:
- User → Goal
- Action → Task
- Task → TaskReminder
- Goal → Reflection

1:8 リレーション（固定）:
- Goal → SubGoal（必ず8つ）
- SubGoal → Action（必ず8つ）

## 制約条件

主キー: 全テーブルでUUID型

外部キー: 参照整合性保証、ON DELETE CASCADE

ユニーク制約:
- users.email
- sub_goals(goal_id, position)
- actions(sub_goal_id, position)

チェック制約:
- progress: 0-100
- position: 0-7
- estimated_minutes: > 0

## インデックス

```sql
-- パフォーマンス最適化
CREATE INDEX idx_goals_user_id_created_at ON goals(user_id, created_at DESC);
CREATE INDEX idx_sub_goals_goal_id_position ON sub_goals(goal_id, position);
CREATE INDEX idx_actions_sub_goal_id_position ON actions(sub_goal_id, position);
CREATE INDEX idx_tasks_action_id_status ON tasks(action_id, status);
CREATE INDEX idx_task_reminders_reminder_date_sent ON task_reminders(reminder_date, sent);
CREATE INDEX idx_reflections_goal_id_created_at ON reflections(goal_id, created_at DESC);
```

## データ整合性検証

マンダラ構造検証:

```sql
-- 8個のサブ目標を持たない目標を検出
SELECT g.id, g.title, COUNT(sg.id) as subgoal_count
FROM goals g
LEFT JOIN sub_goals sg ON g.id = sg.goal_id
GROUP BY g.id, g.title
HAVING COUNT(sg.id) != 8;

-- 8個のアクションを持たないサブ目標を検出
SELECT sg.id, sg.title, COUNT(a.id) as action_count
FROM sub_goals sg
LEFT JOIN actions a ON sg.id = a.sub_goal_id
GROUP BY sg.id, sg.title
HAVING COUNT(a.id) != 8;
```

## マイグレーション管理

### 概要

Prismaを使用したデータベースマイグレーションの管理手順と運用ガイド。

### 開発環境

前提条件:
- Docker Compose環境起動
- PostgreSQL利用可能
- 環境変数設定済み

初回セットアップ:
```bash
cd /path/to/goal-mandala
docker-compose up -d
cd packages/backend
./scripts/migrate-dev.sh init
```

日常的なマイグレーション:
```bash
./scripts/migrate-dev.sh
./scripts/migrate-status.sh
```

スキーマ変更手順:
1. `prisma/schema.prisma`編集
2. `pnpm run db:validate`
3. `./scripts/migrate-dev.sh "変更内容"`
4. `./scripts/migrate-status.sh schema`

### 本番環境

事前準備:
1. バックアップ作成: `./scripts/backup-database.sh all`
2. マイグレーション計画確認
3. ステージング環境テスト: `NODE_ENV=staging ./scripts/migrate-prod.sh --dry-run`

本番マイグレーション:
```bash
export NODE_ENV=production
export DATABASE_URL="postgresql://..."
./scripts/setup-db-security.sh all
./scripts/migrate-prod.sh --dry-run
./scripts/migrate-prod.sh
```

注意事項:
- 必ず事前バックアップ
- ピーク時間回避
- 監視体制整備
- ロールバック手順準備

### マイグレーション状態管理

状態確認:
```bash
./scripts/migrate-status.sh
./scripts/migrate-status.sh schema
./scripts/migrate-status.sh history
./scripts/migrate-status.sh all
```

ロールバック:
```bash
./scripts/migrate-rollback.sh list
./scripts/migrate-rollback.sh to 20231201000000_init
./scripts/migrate-rollback.sh reset  # 開発環境のみ
```

### バックアップと復旧

バックアップ:
```bash
./scripts/backup-database.sh full
./scripts/backup-database.sh schema
./scripts/backup-database.sh data
./scripts/backup-database.sh all
./scripts/backup-database.sh stats
./scripts/backup-database.sh cleanup
```

復旧:
```bash
./scripts/restore-database.sh list
./scripts/restore-database.sh restore backups/full/full_backup_20231201_120000.sql
./scripts/restore-database.sh s3-restore s3://bucket/backup.sql
```

### トラブルシューティング

よくある問題:

1. マイグレーション実行エラー
   - DB接続確認: `./scripts/migrate-status.sh test`
   - スキーマ検証: `pnpm run db:validate`

2. マイグレーション状態不整合
   ```bash
   pnpm prisma migrate resolve --applied "マイグレーション名"
   ./scripts/migrate-rollback.sh reset  # 開発環境のみ
   ```

3. 本番環境マイグレーション失敗
   - アプリケーション停止
   - バックアップから復旧検討
   - ロールバック実行

ログ確認:
```bash
docker-compose logs backend
docker-compose logs postgres
aws logs tail /aws/lambda/goal-mandala-migration --follow
```

### セキュリティ設定

```bash
./scripts/setup-db-security.sh check
./scripts/setup-db-security.sh recommend
./scripts/setup-db-security.sh audit
```

推奨設定:

本番環境:
```bash
DATABASE_URL="postgresql://user:password@host:5432/database?sslmode=require&connect_timeout=10&statement_timeout=30000&connection_limit=10&pool_timeout=10"
```

開発環境:
```bash
DATABASE_URL="postgresql://user:password@localhost:5432/database?connect_timeout=10&statement_timeout=30000&connection_limit=5&pool_timeout=10"
```

### 監視とログ

メトリクス:
- MigrationStarted/Completed/Failed
- MigrationDuration
- DatabaseConnection
- TablesAffected

ログ形式:
```json
{
  "timestamp": "2023-12-01T12:00:00.000Z",
  "level": "INFO",
  "message": "マイグレーション開始: init",
  "migrationName": "init",
  "metadata": {
    "action": "migration_start",
    "environment": "production"
  }
}
```

アラート設定:
- マイグレーション失敗時
- 実行時間30秒超過
- DB接続失敗連続3回

### CI/CD統合

GitHub Actions:
1. プルリクエスト時: マイグレーションテスト
2. mainマージ時: 本番マイグレーション

手動実行:
```bash
gh workflow run database-migration.yml
```

### ベストプラクティス

マイグレーション設計:
- 段階的変更（大きな変更は分割）
- 後方互換性保持
- テスト環境で検証
- 変更内容を明確に記録

運用:
- 定期バックアップ自動化
- メトリクス・ログ継続監視
- 緊急時対応の定期訓練
- マイグレーション内容の事前レビュー
