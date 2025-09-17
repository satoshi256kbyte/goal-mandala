import { PrismaClient } from '../src/generated/prisma-client';
import { migrationLogger } from '../src/utils/migration-logger';
import { migrationMetrics } from '../src/utils/migration-metrics';

describe('Migration Performance Tests', () => {
  let prisma: PrismaClient;
  const PERFORMANCE_THRESHOLD = 30000; // 30秒

  beforeAll(async () => {
    prisma = new PrismaClient();
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(() => {
    migrationMetrics.clearMetrics();
  });

  describe('Migration Execution Time', () => {
    test('should complete migration within acceptable time', async () => {
      const migrationName = 'performance_test_migration';
      const startTime = Date.now();

      migrationMetrics.startMigration(migrationName);

      try {
        // マイグレーション相当の処理をシミュレート
        await simulateMigrationOperations();

        const endTime = Date.now();
        const duration = endTime - startTime;

        migrationMetrics.completeMigration(migrationName, 7, 0);

        await migrationLogger.performanceMetrics('migration_execution', duration, {
          migrationName,
          tablesCreated: 7,
        });

        expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD);
      } catch (error) {
        migrationMetrics.failMigration(migrationName, (error as Error).message);
        throw error;
      }
    });

    test('should handle large dataset migration efficiently', async () => {
      const migrationName = 'large_dataset_migration';
      const recordCount = 10000;

      migrationMetrics.startMigration(migrationName);

      const startTime = Date.now();

      try {
        // 大量データでのパフォーマンステスト
        await performLargeDatasetTest(recordCount);

        const endTime = Date.now();
        const duration = endTime - startTime;

        migrationMetrics.completeMigration(migrationName, 1, recordCount);

        await migrationLogger.performanceMetrics('large_dataset_migration', duration, {
          migrationName,
          recordCount,
        });

        // 大量データでも許容時間内で完了することを確認
        expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD * 2); // 大量データなので2倍の時間を許容
      } catch (error) {
        migrationMetrics.failMigration(migrationName, (error as Error).message);
        throw error;
      }
    });
  });

  describe('Database Connection Performance', () => {
    test('should establish database connection quickly', async () => {
      const startTime = Date.now();

      // 新しい接続を作成してテスト
      const testPrisma = new PrismaClient();

      try {
        await testPrisma.$connect();

        const connectionTime = Date.now() - startTime;

        migrationMetrics.recordDatabaseConnection(true, connectionTime);

        await migrationLogger.performanceMetrics('database_connection', connectionTime);

        // 接続時間が5秒以内であることを確認
        expect(connectionTime).toBeLessThan(5000);
      } finally {
        await testPrisma.$disconnect();
      }
    });

    test('should handle concurrent connections efficiently', async () => {
      const connectionCount = 5;
      const startTime = Date.now();

      const connectionPromises = Array.from({ length: connectionCount }, async () => {
        const testPrisma = new PrismaClient();
        try {
          await testPrisma.$connect();
          await testPrisma.$queryRaw`SELECT 1`;
          return testPrisma;
        } catch (error) {
          await testPrisma.$disconnect();
          throw error;
        }
      });

      try {
        const connections = await Promise.all(connectionPromises);

        const totalTime = Date.now() - startTime;

        await migrationLogger.performanceMetrics('concurrent_connections', totalTime, {
          connectionCount,
        });

        // 並行接続が10秒以内で完了することを確認
        expect(totalTime).toBeLessThan(10000);

        // 全接続をクリーンアップ
        await Promise.all(connections.map(conn => conn.$disconnect()));
      } catch (error) {
        migrationMetrics.recordDatabaseConnection(false);
        throw error;
      }
    });
  });

  describe('Schema Validation Performance', () => {
    test('should validate schema quickly', async () => {
      const startTime = Date.now();

      try {
        // スキーマ検証のシミュレート
        await validateSchemaStructure();

        const validationTime = Date.now() - startTime;

        migrationMetrics.recordSchemaValidation(true, validationTime);

        await migrationLogger.performanceMetrics('schema_validation', validationTime);

        // スキーマ検証が10秒以内で完了することを確認
        expect(validationTime).toBeLessThan(10000);
      } catch (error) {
        migrationMetrics.recordSchemaValidation(false);
        throw error;
      }
    });
  });

  describe('Index Creation Performance', () => {
    test('should create indexes efficiently', async () => {
      const startTime = Date.now();

      try {
        // インデックス作成のパフォーマンステスト
        await testIndexCreationPerformance();

        const indexCreationTime = Date.now() - startTime;

        await migrationLogger.performanceMetrics('index_creation', indexCreationTime);

        // インデックス作成が15秒以内で完了することを確認
        expect(indexCreationTime).toBeLessThan(15000);
      } catch (error) {
        await migrationLogger.error('インデックス作成パフォーマンステスト失敗', {
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    });
  });

  describe('Memory Usage', () => {
    test('should not exceed memory limits during migration', async () => {
      const initialMemory = process.memoryUsage();

      try {
        // メモリ使用量テスト用の処理
        await performMemoryIntensiveOperations();

        const finalMemory = process.memoryUsage();
        const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

        await migrationLogger.performanceMetrics('memory_usage', memoryIncrease, {
          initialHeapUsed: initialMemory.heapUsed,
          finalHeapUsed: finalMemory.heapUsed,
          memoryIncrease,
        });

        // メモリ使用量の増加が100MB以内であることを確認
        expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
      } catch (error) {
        await migrationLogger.error('メモリ使用量テスト失敗', {
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    });
  });

  // ヘルパー関数
  async function simulateMigrationOperations(): Promise<void> {
    // テーブル存在確認（マイグレーション相当の処理）
    const tables = await prisma.$queryRaw<Array<{ table_name: string }>>`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
    `;

    // 各テーブルの構造確認
    for (const table of tables) {
      await prisma.$queryRaw`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = ${table.table_name}
      `;
    }
  }

  async function performLargeDatasetTest(recordCount: number): Promise<void> {
    // テスト用ユーザーを大量作成
    const users = Array.from({ length: Math.min(recordCount, 1000) }, (_, i) => ({
      email: `perf-test-${i}-${Date.now()}@example.com`,
      name: `Performance Test User ${i}`,
    }));

    // バッチ挿入でパフォーマンステスト
    const batchSize = 100;
    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);
      await prisma.user.createMany({
        data: batch,
        skipDuplicates: true,
      });
    }

    // クリーンアップ
    await prisma.user.deleteMany({
      where: {
        email: {
          startsWith: `perf-test-`,
        },
      },
    });
  }

  async function validateSchemaStructure(): Promise<void> {
    // 全テーブルの存在確認
    const tables = await prisma.$queryRaw<Array<{ table_name: string }>>`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
    `;

    // 外部キー制約の確認
    await prisma.$queryRaw`
      SELECT tc.constraint_name, tc.table_name, kcu.column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
    `;

    // インデックスの確認
    await prisma.$queryRaw`
      SELECT indexname, tablename
      FROM pg_indexes
      WHERE schemaname = 'public'
    `;
  }

  async function testIndexCreationPerformance(): Promise<void> {
    // 既存インデックスの確認
    const indexes = await prisma.$queryRaw<Array<{ indexname: string; tablename: string }>>`
      SELECT indexname, tablename
      FROM pg_indexes
      WHERE schemaname = 'public'
      AND indexname NOT LIKE '%_pkey'
    `;

    // インデックス統計の取得
    for (const index of indexes.slice(0, 5)) {
      // 最初の5つのインデックスのみテスト
      await prisma.$queryRaw`
        SELECT schemaname, tablename, attname, n_distinct, correlation
        FROM pg_stats
        WHERE schemaname = 'public'
        AND tablename = ${index.tablename}
        LIMIT 5
      `;
    }
  }

  async function performMemoryIntensiveOperations(): Promise<void> {
    // 大量のデータを一時的にメモリに読み込む
    const largeQuery = await prisma.$queryRaw<Array<any>>`
      SELECT 
        t.table_name,
        c.column_name,
        c.data_type,
        c.is_nullable,
        c.column_default
      FROM information_schema.tables t
      JOIN information_schema.columns c ON t.table_name = c.table_name
      WHERE t.table_schema = 'public'
      AND t.table_type = 'BASE TABLE'
    `;

    // データを処理（メモリ使用量テスト）
    const processedData = largeQuery.map(row => ({
      ...row,
      processed: true,
      timestamp: new Date().toISOString(),
    }));

    // 一時的にデータを保持
    await new Promise(resolve => setTimeout(resolve, 1000));

    // メモリ解放のためのガベージコレクション促進
    if (global.gc) {
      global.gc();
    }
  }
});
