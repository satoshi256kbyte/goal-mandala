# 設計書

## 概要

曼荼羅目標管理システムのデータベースマイグレーション実装において、Prismaを使用した安全で効率的なマイグレーション戦略を設計します。開発環境から本番環境まで一貫したマイグレーション管理を実現し、CI/CDパイプラインとの統合も含めた包括的なソリューションを提供します。

## アーキテクチャ設計

### マイグレーション管理構成

```
packages/backend/
├── prisma/
│   ├── schema.prisma          # スキーマ定義
│   ├── migrations/           # マイグレーションファイル
│   │   └── 20241217000000_init/
│   │       └── migration.sql
│   ├── seed.ts              # シードデータ
│   └── README.md            # 使用方法
├── scripts/
│   ├── migrate-dev.sh       # 開発環境マイグレーション
│   ├── migrate-prod.sh      # 本番環境マイグレーション
│   ├── migrate-status.sh    # マイグレーション状態確認
│   └── migrate-rollback.sh  # ロールバック
└── docs/
    └── migration-guide.md   # マイグレーション手順書
```

### 環境別設定

```typescript
// 環境別データベース接続設定
interface DatabaseConfig {
  development: {
    url: string;
    shadowDatabaseUrl?: string;
  };
  staging: {
    url: string;
    shadowDatabaseUrl?: string;
  };
  production: {
    url: string;
    directUrl?: string;
  };
}
```

## マイグレーション戦略

### 1. 初期マイグレーション生成

```bash
# 初期マイグレーション生成
npx prisma migrate dev --name init

# 生成されるファイル構造
prisma/migrations/20241217000000_init/
└── migration.sql
```

#### 生成されるSQL構造

```sql
-- CreateEnum
CREATE TYPE "UserIndustry" AS ENUM ('TECHNOLOGY', 'FINANCE', 'HEALTHCARE', 'EDUCATION', 'MANUFACTURING', 'RETAIL', 'CONSULTING', 'GOVERNMENT', 'NON_PROFIT', 'OTHER');

CREATE TYPE "CompanySize" AS ENUM ('STARTUP', 'SMALL', 'MEDIUM', 'LARGE', 'ENTERPRISE');

CREATE TYPE "GoalStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'PAUSED', 'CANCELLED');

CREATE TYPE "TaskType" AS ENUM ('ACTION', 'LEARNING', 'RESEARCH', 'MEETING', 'REVIEW');

CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

CREATE TYPE "ReminderStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "industry" "UserIndustry",
    "companySize" "CompanySize",
    "jobType" VARCHAR(100),
    "position" VARCHAR(100),
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- 以下、全テーブルの作成SQL...
```

### 2. インデックス戦略

```sql
-- パフォーマンス最適化インデックス
CREATE INDEX "goals_userId_status_idx" ON "goals"("userId", "status");
CREATE INDEX "goals_userId_createdAt_idx" ON "goals"("userId", "createdAt");
CREATE INDEX "sub_goals_goalId_position_idx" ON "sub_goals"("goalId", "position");
CREATE INDEX "actions_subGoalId_position_idx" ON "actions"("subGoalId", "position");
CREATE INDEX "tasks_actionId_status_idx" ON "tasks"("actionId", "status");
CREATE INDEX "tasks_status_createdAt_idx" ON "tasks"("status", "createdAt");
CREATE INDEX "task_reminders_status_reminderAt_idx" ON "task_reminders"("status", "reminderAt");
CREATE INDEX "task_reminders_taskId_reminderAt_idx" ON "task_reminders"("taskId", "reminderAt");
CREATE INDEX "reflections_taskId_createdAt_idx" ON "reflections"("taskId", "createdAt");

-- ユニーク制約
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "sub_goals_goalId_position_key" ON "sub_goals"("goalId", "position");
CREATE UNIQUE INDEX "actions_subGoalId_position_key" ON "actions"("subGoalId", "position");
```

### 3. 外部キー制約

```sql
-- カスケード削除設定
ALTER TABLE "goals" ADD CONSTRAINT "goals_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "sub_goals" ADD CONSTRAINT "sub_goals_goalId_fkey" 
    FOREIGN KEY ("goalId") REFERENCES "goals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "actions" ADD CONSTRAINT "actions_subGoalId_fkey" 
    FOREIGN KEY ("subGoalId") REFERENCES "sub_goals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "tasks" ADD CONSTRAINT "tasks_actionId_fkey" 
    FOREIGN KEY ("actionId") REFERENCES "actions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "task_reminders" ADD CONSTRAINT "task_reminders_taskId_fkey" 
    FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "reflections" ADD CONSTRAINT "reflections_taskId_fkey" 
    FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

## 実行スクリプト設計

### 1. 開発環境マイグレーション

```bash
#!/bin/bash
# scripts/migrate-dev.sh

set -e

echo "🚀 Starting development migration..."

# 環境変数チェック
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL is not set"
    exit 1
fi

# データベース接続確認
echo "📡 Checking database connection..."
npx prisma db pull --force || {
    echo "❌ Cannot connect to database"
    exit 1
}

# マイグレーション実行
echo "📦 Running migration..."
npx prisma migrate dev --name init

# マイグレーション状態確認
echo "✅ Checking migration status..."
npx prisma migrate status

# Prismaクライアント生成
echo "🔧 Generating Prisma client..."
npx prisma generate

echo "🎉 Development migration completed successfully!"
```

### 2. 本番環境マイグレーション

```bash
#!/bin/bash
# scripts/migrate-prod.sh

set -e

echo "🚀 Starting production migration..."

# 環境変数チェック
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL is not set"
    exit 1
fi

# バックアップ確認
echo "💾 Checking backup status..."
read -p "Have you created a database backup? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Please create a backup before proceeding"
    exit 1
fi

# マイグレーション実行（本番用）
echo "📦 Running production migration..."
npx prisma migrate deploy

# 検証
echo "✅ Verifying migration..."
npx prisma migrate status

echo "🎉 Production migration completed successfully!"
```

### 3. マイグレーション状態確認

```bash
#!/bin/bash
# scripts/migrate-status.sh

echo "📊 Migration Status Report"
echo "=========================="

# 現在の状態確認
npx prisma migrate status

# データベース構造確認
echo -e "\n📋 Database Schema:"
npx prisma db pull --print

# テーブル一覧確認
echo -e "\n📚 Tables:"
psql $DATABASE_URL -c "\dt"

# インデックス確認
echo -e "\n🔍 Indexes:"
psql $DATABASE_URL -c "SELECT schemaname, tablename, indexname FROM pg_indexes WHERE schemaname = 'public';"
```

### 4. ロールバック機能

```bash
#!/bin/bash
# scripts/migrate-rollback.sh

set -e

echo "⚠️  Database Rollback Utility"
echo "============================="

# 警告表示
echo "🚨 WARNING: This will rollback the database to a previous state"
echo "🚨 Make sure you have a recent backup!"

read -p "Are you sure you want to proceed? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Rollback cancelled"
    exit 1
fi

# マイグレーション履歴表示
echo "📜 Migration History:"
npx prisma migrate status

# ロールバック実行
echo "🔄 Rolling back migration..."
npx prisma migrate reset --force

echo "✅ Rollback completed"
```

## CI/CD統合設計

### 1. GitHub Actions ワークフロー

```yaml
# .github/workflows/database-migration.yml
name: Database Migration

on:
  push:
    branches: [main]
    paths: ['packages/backend/prisma/**']
  pull_request:
    paths: ['packages/backend/prisma/**']

jobs:
  migration-test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: test_db
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          
      - name: Install dependencies
        run: |
          cd packages/backend
          npm install
          
      - name: Run migration test
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db
        run: |
          cd packages/backend
          npx prisma migrate deploy
          npx prisma db seed
          
      - name: Verify migration
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db
        run: |
          cd packages/backend
          npm run test:migration
```

### 2. 環境別デプロイメント

```yaml
# 本番環境デプロイ
deploy-production:
  if: github.ref == 'refs/heads/main'
  needs: [migration-test]
  runs-on: ubuntu-latest
  environment: production
  
  steps:
    - name: Deploy to Production
      env:
        DATABASE_URL: ${{ secrets.PROD_DATABASE_URL }}
      run: |
        cd packages/backend
        npx prisma migrate deploy
        
    - name: Notify deployment
      uses: 8398a7/action-slack@v3
      with:
        status: ${{ job.status }}
        text: "Database migration deployed to production"
      env:
        SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
```

## テスト戦略

### 1. マイグレーションテスト

```typescript
// tests/migration.test.ts
import { PrismaClient } from '../src/generated/prisma-client'

describe('Database Migration Tests', () => {
  let prisma: PrismaClient

  beforeAll(async () => {
    prisma = new PrismaClient()
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  test('should create all required tables', async () => {
    // テーブル存在確認
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `
    
    const expectedTables = [
      'users', 'goals', 'sub_goals', 'actions', 
      'tasks', 'task_reminders', 'reflections'
    ]
    
    expectedTables.forEach(table => {
      expect(tables).toContainEqual(
        expect.objectContaining({ table_name: table })
      )
    })
  })

  test('should create all required indexes', async () => {
    const indexes = await prisma.$queryRaw`
      SELECT indexname 
      FROM pg_indexes 
      WHERE schemaname = 'public'
    `
    
    expect(indexes).toContainEqual(
      expect.objectContaining({ indexname: 'goals_userId_status_idx' })
    )
  })

  test('should enforce foreign key constraints', async () => {
    // 外部キー制約テスト
    const user = await prisma.user.create({
      data: {
        email: 'test@example.com',
        name: 'Test User'
      }
    })

    const goal = await prisma.goal.create({
      data: {
        userId: user.id,
        title: 'Test Goal',
        status: 'ACTIVE'
      }
    })

    // カスケード削除テスト
    await prisma.user.delete({ where: { id: user.id } })
    
    const deletedGoal = await prisma.goal.findUnique({
      where: { id: goal.id }
    })
    
    expect(deletedGoal).toBeNull()
  })
})
```

### 2. パフォーマンステスト

```typescript
// tests/migration-performance.test.ts
describe('Migration Performance Tests', () => {
  test('should complete migration within acceptable time', async () => {
    const startTime = Date.now()
    
    // マイグレーション実行
    await execAsync('npx prisma migrate deploy')
    
    const duration = Date.now() - startTime
    
    // 30秒以内に完了することを確認
    expect(duration).toBeLessThan(30000)
  })

  test('should handle large dataset migration', async () => {
    // 大量データでのマイグレーションテスト
    const testDataSize = 10000
    
    // テストデータ作成とマイグレーション実行
    // パフォーマンス測定
  })
})
```

## 監視とログ

### 1. マイグレーションログ

```typescript
// utils/migration-logger.ts
export class MigrationLogger {
  static log(level: 'info' | 'warn' | 'error', message: string, meta?: any) {
    const timestamp = new Date().toISOString()
    const logEntry = {
      timestamp,
      level,
      message,
      meta,
      service: 'migration'
    }
    
    console.log(JSON.stringify(logEntry))
    
    // CloudWatch Logsに送信（本番環境）
    if (process.env.NODE_ENV === 'production') {
      this.sendToCloudWatch(logEntry)
    }
  }

  private static async sendToCloudWatch(logEntry: any) {
    // CloudWatch Logs実装
  }
}
```

### 2. メトリクス収集

```typescript
// utils/migration-metrics.ts
export class MigrationMetrics {
  static async recordMigrationTime(duration: number) {
    // CloudWatch Metricsに送信
    await cloudWatch.putMetricData({
      Namespace: 'GoalMandala/Database',
      MetricData: [{
        MetricName: 'MigrationDuration',
        Value: duration,
        Unit: 'Milliseconds',
        Timestamp: new Date()
      }]
    }).promise()
  }

  static async recordMigrationSuccess() {
    await cloudWatch.putMetricData({
      Namespace: 'GoalMandala/Database',
      MetricData: [{
        MetricName: 'MigrationSuccess',
        Value: 1,
        Unit: 'Count',
        Timestamp: new Date()
      }]
    }).promise()
  }
}
```

## セキュリティ考慮事項

### 1. 接続セキュリティ

```typescript
// config/database-security.ts
export const getDatabaseConfig = () => {
  const baseConfig = {
    ssl: process.env.NODE_ENV === 'production' ? {
      rejectUnauthorized: true,
      ca: process.env.DB_CA_CERT
    } : false,
    
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '10'),
    
    // 接続タイムアウト
    connectTimeout: 60000,
    acquireTimeout: 60000,
    timeout: 60000
  }

  return baseConfig
}
```

### 2. 権限管理

```sql
-- データベースユーザー権限設定
CREATE USER migration_user WITH PASSWORD 'secure_password';
GRANT CREATE, USAGE ON SCHEMA public TO migration_user;
GRANT CREATE ON DATABASE goal_mandala TO migration_user;

-- 本番環境では最小権限
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;
```

## 災害復旧計画

### 1. バックアップ戦略

```bash
#!/bin/bash
# scripts/backup-database.sh

BACKUP_DIR="/backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p $BACKUP_DIR

# フルバックアップ
pg_dump $DATABASE_URL > $BACKUP_DIR/full_backup.sql

# スキーマのみバックアップ
pg_dump --schema-only $DATABASE_URL > $BACKUP_DIR/schema_backup.sql

# データのみバックアップ
pg_dump --data-only $DATABASE_URL > $BACKUP_DIR/data_backup.sql

echo "Backup completed: $BACKUP_DIR"
```

### 2. 復旧手順

```bash
#!/bin/bash
# scripts/restore-database.sh

BACKUP_FILE=$1

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <backup_file>"
    exit 1
fi

# データベース復旧
psql $DATABASE_URL < $BACKUP_FILE

# マイグレーション状態確認
npx prisma migrate status

echo "Database restored from: $BACKUP_FILE"
```
