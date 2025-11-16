# データベース設計

## 概要

曼荼羅目標管理システムのデータベース設計において、エンティティ関連図（ER図）を設計し、システムで扱うデータの構造とリレーションシップを定義します。マンダラチャートの階層構造（目標→サブ目標→アクション→タスク）を適切にモデル化し、データ整合性を保証する設計を行います。

## エンティティ定義

### User（ユーザー）

システムを利用するユーザーの基本情報を管理する。

```typescript
interface User {
  id: string;           // UUID、主キー
  email: string;        // メールアドレス、ユニーク制約
  name: string;         // 表示名
  industry?: string;    // 業種
  company_size?: string; // 組織規模
  job_title?: string;   // 職種
  position?: string;    // 役職
  created_at: Date;     // 作成日時
  updated_at: Date;     // 更新日時
}
```

### Goal（目標）

ユーザーが設定する中心目標を管理する。

```typescript
interface Goal {
  id: string;           // UUID、主キー
  user_id: string;      // ユーザーID、外部キー
  title: string;        // 目標タイトル
  description: string;  // 目標説明
  deadline: Date;       // 達成期限
  background: string;   // 背景・理由
  constraints?: string; // 制約事項
  status: GoalStatus;   // 目標状態
  progress: number;     // 進捗率（0-100）
  created_at: Date;     // 作成日時
  updated_at: Date;     // 更新日時
}

enum GoalStatus {
  DRAFT = 'draft',           // 下書き
  ACTIVE = 'active',         // 活動中
  COMPLETED = 'completed',   // 完了
  PAUSED = 'paused',         // 一時停止
  CANCELLED = 'cancelled'    // 中止
}
```

### SubGoal（サブ目標）

目標を達成するための8つのサブ目標を管理する。

```typescript
interface SubGoal {
  id: string;           // UUID、主キー
  goal_id: string;      // 目標ID、外部キー
  title: string;        // サブ目標タイトル
  description: string;  // サブ目標説明
  background: string;   // 背景・理由
  constraints?: string; // 制約事項
  position: number;     // 位置（0-7）
  progress: number;     // 進捗率（0-100）
  created_at: Date;     // 作成日時
  updated_at: Date;     // 更新日時
}
```

### Action（アクション）

サブ目標を達成するための8つのアクションを管理する。

```typescript
interface Action {
  id: string;           // UUID、主キー
  sub_goal_id: string;  // サブ目標ID、外部キー
  title: string;        // アクションタイトル
  description: string;  // アクション説明
  background: string;   // 背景・理由
  constraints?: string; // 制約事項
  type: ActionType;     // アクション種別
  position: number;     // 位置（0-7）
  progress: number;     // 進捗率（0-100）
  created_at: Date;     // 作成日時
  updated_at: Date;     // 更新日時
}

enum ActionType {
  EXECUTION = 'execution', // 実行アクション
  HABIT = 'habit'         // 習慣アクション
}
```

### Task（タスク）

アクションを実行するための具体的なタスクを管理する。

```typescript
interface Task {
  id: string;              // UUID、主キー
  action_id: string;       // アクションID、外部キー
  title: string;           // タスクタイトル
  description?: string;    // タスク説明
  type: TaskType;          // タスク種別
  status: TaskStatus;      // タスク状態
  estimated_minutes: number; // 推定所要時間（分）
  completed_at?: Date;     // 完了日時
  created_at: Date;        // 作成日時
  updated_at: Date;        // 更新日時
}

enum TaskType {
  EXECUTION = 'execution', // 実行タスク
  HABIT = 'habit'         // 習慣タスク
}

enum TaskStatus {
  NOT_STARTED = 'not_started', // 未着手
  IN_PROGRESS = 'in_progress', // 進行中
  COMPLETED = 'completed',     // 完了
  SKIPPED = 'skipped'         // スキップ
}
```

### TaskReminder（タスクリマインド）

タスクのリマインド情報を管理する。

```typescript
interface TaskReminder {
  id: string;           // UUID、主キー
  task_id: string;      // タスクID、外部キー
  reminder_date: Date;  // リマインド日
  sent: boolean;        // 送信済みフラグ
  sent_at?: Date;       // 送信日時
  created_at: Date;     // 作成日時
}
```

### Reflection（振り返り）

目標に対する振り返り情報を管理する。

```typescript
interface Reflection {
  id: string;                      // UUID、主キー
  goal_id: string;                 // 目標ID、外部キー
  summary: string;                 // 総括
  regretful_actions?: string;      // 惜しかったアクション
  slow_progress_actions?: string;  // 思ったより進まなかったアクション
  untouched_actions?: string;      // 未着手となったアクション
  created_at: Date;                // 作成日時
  updated_at: Date;                // 更新日時
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

## リレーションシップ設計

### 1:N リレーションシップ

- **User → Goal**: 1人のユーザーは複数の目標を持つ
- **Action → Task**: 1つのアクションは複数のタスクを持つ
- **Task → TaskReminder**: 1つのタスクは複数のリマインドを持つ
- **Goal → Reflection**: 1つの目標は複数の振り返りを持つ

### 1:8 リレーションシップ（固定）

- **Goal → SubGoal**: 1つの目標は必ず8つのサブ目標を持つ
- **SubGoal → Action**: 1つのサブ目標は必ず8つのアクションを持つ

## 制約条件定義

### 主キー制約

```sql
-- 全テーブルでUUID型の主キーを使用
ALTER TABLE users ADD CONSTRAINT pk_users PRIMARY KEY (id);
ALTER TABLE goals ADD CONSTRAINT pk_goals PRIMARY KEY (id);
ALTER TABLE sub_goals ADD CONSTRAINT pk_sub_goals PRIMARY KEY (id);
ALTER TABLE actions ADD CONSTRAINT pk_actions PRIMARY KEY (id);
ALTER TABLE tasks ADD CONSTRAINT pk_tasks PRIMARY KEY (id);
ALTER TABLE task_reminders ADD CONSTRAINT pk_task_reminders PRIMARY KEY (id);
ALTER TABLE reflections ADD CONSTRAINT pk_reflections PRIMARY KEY (id);
```

### 外部キー制約

```sql
-- 参照整合性を保証する外部キー制約
ALTER TABLE goals ADD CONSTRAINT fk_goals_user_id 
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE sub_goals ADD CONSTRAINT fk_sub_goals_goal_id 
  FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE CASCADE;

ALTER TABLE actions ADD CONSTRAINT fk_actions_sub_goal_id 
  FOREIGN KEY (sub_goal_id) REFERENCES sub_goals(id) ON DELETE CASCADE;

ALTER TABLE tasks ADD CONSTRAINT fk_tasks_action_id 
  FOREIGN KEY (action_id) REFERENCES actions(id) ON DELETE CASCADE;

ALTER TABLE task_reminders ADD CONSTRAINT fk_task_reminders_task_id 
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE;

ALTER TABLE reflections ADD CONSTRAINT fk_reflections_goal_id 
  FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE CASCADE;
```

### ユニーク制約

```sql
-- ユーザーのメールアドレスはユニーク
ALTER TABLE users ADD CONSTRAINT uk_users_email UNIQUE (email);

-- サブ目標の位置は目標内でユニーク
ALTER TABLE sub_goals ADD CONSTRAINT uk_sub_goals_position 
  UNIQUE (goal_id, position);

-- アクションの位置はサブ目標内でユニーク
ALTER TABLE actions ADD CONSTRAINT uk_actions_position 
  UNIQUE (sub_goal_id, position);
```

### チェック制約

```sql
-- 進捗率は0-100の範囲
ALTER TABLE goals ADD CONSTRAINT ck_goals_progress 
  CHECK (progress >= 0 AND progress <= 100);

ALTER TABLE sub_goals ADD CONSTRAINT ck_sub_goals_progress 
  CHECK (progress >= 0 AND progress <= 100);

ALTER TABLE actions ADD CONSTRAINT ck_actions_progress 
  CHECK (progress >= 0 AND progress <= 100);

-- 位置は0-7の範囲
ALTER TABLE sub_goals ADD CONSTRAINT ck_sub_goals_position 
  CHECK (position >= 0 AND position <= 7);

ALTER TABLE actions ADD CONSTRAINT ck_actions_position 
  CHECK (position >= 0 AND position <= 7);

-- 推定時間は正の値
ALTER TABLE tasks ADD CONSTRAINT ck_tasks_estimated_minutes 
  CHECK (estimated_minutes > 0);
```

## インデックス設計

### パフォーマンス最適化インデックス

```sql
-- ユーザーの目標一覧取得用
CREATE INDEX idx_goals_user_id_created_at ON goals(user_id, created_at DESC);

-- 目標のサブ目標取得用
CREATE INDEX idx_sub_goals_goal_id_position ON sub_goals(goal_id, position);

-- サブ目標のアクション取得用
CREATE INDEX idx_actions_sub_goal_id_position ON actions(sub_goal_id, position);

-- アクションのタスク取得用
CREATE INDEX idx_tasks_action_id_status ON tasks(action_id, status);

-- リマインド送信用
CREATE INDEX idx_task_reminders_reminder_date_sent ON task_reminders(reminder_date, sent);

-- 振り返り履歴取得用
CREATE INDEX idx_reflections_goal_id_created_at ON reflections(goal_id, created_at DESC);
```

## データ整合性検証

### マンダラ構造検証クエリ

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

### 進捗計算整合性検証

```sql
-- アクション進捗とタスク完了率の整合性確認
SELECT a.id, a.title, a.progress,
       ROUND(AVG(CASE WHEN t.status = 'completed' THEN 100 ELSE 0 END)) as calculated_progress
FROM actions a
LEFT JOIN tasks t ON a.id = t.action_id
GROUP BY a.id, a.title, a.progress
HAVING ABS(a.progress - ROUND(AVG(CASE WHEN t.status = 'completed' THEN 100 ELSE 0 END))) > 5;
```

## マイグレーション管理

### 概要

このセクションでは、Prismaを使用したデータベースマイグレーションの管理手順と運用ガイドについて説明します。

### 開発環境でのマイグレーション

#### 前提条件

- Docker Compose環境が起動していること
- PostgreSQLデータベースが利用可能であること
- 必要な環境変数が設定されていること

#### 初回セットアップ

```bash
# 1. プロジェクトルートディレクトリに移動
cd /path/to/goal-mandala

# 2. Docker Compose環境を起動
docker-compose up -d

# 3. バックエンドディレクトリに移動
cd packages/backend

# 4. 初回マイグレーション実行
./scripts/migrate-dev.sh init
```

#### 日常的なマイグレーション

```bash
# スキーマ変更後のマイグレーション
./scripts/migrate-dev.sh

# マイグレーション状態確認
./scripts/migrate-status.sh

# 詳細な状態確認
./scripts/migrate-status.sh all
```

#### スキーマ変更の手順

1. `prisma/schema.prisma` を編集
2. スキーマ検証を実行
   ```bash
   pnpm run db:validate
   ```
3. マイグレーション生成・実行
   ```bash
   ./scripts/migrate-dev.sh "変更内容の説明"
   ```
4. 変更内容の確認
   ```bash
   ./scripts/migrate-status.sh schema
   ```

### 本番環境でのマイグレーション

#### 事前準備

1. **バックアップの作成**
   ```bash
   ./scripts/backup-database.sh all
   ```

2. **マイグレーション計画の確認**
   - 影響範囲の評価
   - ダウンタイムの見積もり
   - ロールバック計画の策定

3. **ステージング環境でのテスト**
   ```bash
   # ステージング環境でドライラン
   NODE_ENV=staging ./scripts/migrate-prod.sh --dry-run
   ```

#### 本番マイグレーション実行

```bash
# 1. 環境変数設定
export NODE_ENV=production
export DATABASE_URL="postgresql://..."

# 2. セキュリティチェック
./scripts/setup-db-security.sh all

# 3. ドライラン実行
./scripts/migrate-prod.sh --dry-run

# 4. 本番マイグレーション実行
./scripts/migrate-prod.sh
```

#### 本番環境での注意事項

- **必ず事前にバックアップを取得**
- **ピーク時間を避けて実行**
- **監視体制を整備**
- **ロールバック手順を準備**

### マイグレーション状態の管理

#### マイグレーション状態の確認

```bash
# 基本的な状態確認
./scripts/migrate-status.sh

# スキーマ情報の確認
./scripts/migrate-status.sh schema

# マイグレーション履歴の確認
./scripts/migrate-status.sh history

# 全情報の確認
./scripts/migrate-status.sh all
```

#### ロールバック

```bash
# 利用可能なマイグレーション一覧
./scripts/migrate-rollback.sh list

# 特定のマイグレーションまでロールバック
./scripts/migrate-rollback.sh to 20231201000000_init

# 完全リセット（開発環境のみ）
./scripts/migrate-rollback.sh reset
```

### バックアップと復旧

#### バックアップの作成

```bash
# フルバックアップ
./scripts/backup-database.sh full

# スキーマのみバックアップ
./scripts/backup-database.sh schema

# データのみバックアップ
./scripts/backup-database.sh data

# 全種類のバックアップ
./scripts/backup-database.sh all
```

#### バックアップの管理

```bash
# バックアップ統計表示
./scripts/backup-database.sh stats

# 古いバックアップファイルの削除
./scripts/backup-database.sh cleanup
```

#### データベースの復旧

```bash
# 利用可能なバックアップファイル一覧
./scripts/restore-database.sh list

# 特定のバックアップから復旧
./scripts/restore-database.sh restore backups/full/full_backup_20231201_120000.sql

# S3からの復旧
./scripts/restore-database.sh s3-restore s3://bucket/backup.sql
```

### トラブルシューティング

#### よくある問題と解決方法

**1. マイグレーション実行エラー**

症状: `prisma migrate dev` でエラーが発生

原因と解決方法:
- データベース接続エラー
  ```bash
  # 接続確認
  ./scripts/migrate-status.sh test
  ```
- スキーマ構文エラー
  ```bash
  # スキーマ検証
  pnpm run db:validate
  ```

**2. マイグレーション状態の不整合**

症状: マイグレーション状態が期待と異なる

解決方法:
```bash
# マイグレーション状態をリセット
pnpm prisma migrate resolve --applied "マイグレーション名"

# または完全リセット（開発環境のみ）
./scripts/migrate-rollback.sh reset
```

**3. パフォーマンス問題**

症状: マイグレーション実行が遅い

対策:
- インデックス作成の最適化
- バッチサイズの調整
- 並行実行数の制限

**4. 本番環境でのマイグレーション失敗**

緊急対応手順:
1. 即座にアプリケーションを停止
2. バックアップからの復旧を検討
3. ロールバック実行
   ```bash
   ./scripts/migrate-rollback.sh reset
   ./scripts/restore-database.sh restore [最新のバックアップ]
   ```

#### ログの確認

```bash
# アプリケーションログ
docker-compose logs backend

# データベースログ
docker-compose logs postgres

# マイグレーションログ（CloudWatch）
aws logs tail /aws/lambda/goal-mandala-migration --follow
```

### セキュリティ設定

#### データベース接続のセキュリティ

```bash
# セキュリティ設定チェック
./scripts/setup-db-security.sh check

# 推奨設定の表示
./scripts/setup-db-security.sh recommend

# セキュリティ監査
./scripts/setup-db-security.sh audit
```

#### 推奨設定

本番環境:
```bash
DATABASE_URL="postgresql://user:password@host:5432/database?sslmode=require&connect_timeout=10&statement_timeout=30000&connection_limit=10&pool_timeout=10"
```

開発環境:
```bash
DATABASE_URL="postgresql://user:password@localhost:5432/database?connect_timeout=10&statement_timeout=30000&connection_limit=5&pool_timeout=10"
```

### 監視とログ

#### メトリクス監視

マイグレーション実行時に以下のメトリクスが収集されます：

- **MigrationStarted**: マイグレーション開始回数
- **MigrationCompleted**: マイグレーション完了回数
- **MigrationFailed**: マイグレーション失敗回数
- **MigrationDuration**: マイグレーション実行時間
- **DatabaseConnection**: データベース接続成功/失敗
- **TablesAffected**: 影響を受けたテーブル数

#### ログ出力

構造化ログが以下の形式で出力されます：

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

#### アラート設定

以下の条件でアラートを設定することを推奨します：

- マイグレーション失敗時
- マイグレーション実行時間が30秒を超過
- データベース接続失敗が連続3回発生

### CI/CD統合

#### GitHub Actions

マイグレーションは以下のタイミングで自動実行されます：

1. **プルリクエスト時**: マイグレーションテスト実行
2. **mainブランチマージ時**: 本番マイグレーション実行

#### 手動実行

緊急時のロールバックは手動で実行できます：

```bash
# GitHub Actionsの手動実行
gh workflow run database-migration.yml
```

### ベストプラクティス

#### マイグレーション設計

1. **段階的な変更**: 大きな変更は複数のマイグレーションに分割
2. **後方互換性**: 可能な限り後方互換性を保持
3. **テスト**: 必ずテスト環境で検証
4. **ドキュメント**: 変更内容を明確に記録

#### 運用

1. **定期バックアップ**: 自動バックアップの設定
2. **監視**: メトリクスとログの継続的な監視
3. **訓練**: 緊急時対応の定期的な訓練
4. **レビュー**: マイグレーション内容の事前レビュー
