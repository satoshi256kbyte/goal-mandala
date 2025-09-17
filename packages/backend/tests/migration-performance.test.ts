import { PrismaClient } from '@prisma/client';
import { performance } from 'perf_hooks';

describe('Migration Performance Tests', () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = new PrismaClient();
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Query Performance Tests', () => {
    test('should perform user queries within acceptable time', async () => {
      const startTime = performance.now();

      await prisma.user.findMany({
        take: 100,
      });

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // 100ユーザー取得が1秒以内に完了することを確認
      expect(executionTime).toBeLessThan(1000);
    });

    test('should perform goal queries with relations within acceptable time', async () => {
      const startTime = performance.now();

      await prisma.goal.findMany({
        take: 50,
        include: {
          sub_goals: {
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

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // 関連データ込みで50目標取得が2秒以内に完了することを確認
      expect(executionTime).toBeLessThan(2000);
    });

    test('should perform complex aggregation queries within acceptable time', async () => {
      const startTime = performance.now();

      // 複雑な集計クエリ：ユーザー別の目標進捗統計
      await prisma.$queryRaw`
        SELECT 
          u.id,
          u.name,
          COUNT(g.id) as goal_count,
          AVG(g.progress) as avg_progress,
          MAX(g.progress) as max_progress,
          MIN(g.progress) as min_progress
        FROM "User" u
        LEFT JOIN "Goal" g ON u.id = g.user_id
        GROUP BY u.id, u.name
        LIMIT 100;
      `;

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // 集計クエリが1.5秒以内に完了することを確認
      expect(executionTime).toBeLessThan(1500);
    });
  });

  describe('Bulk Operation Performance Tests', () => {
    test('should handle bulk inserts efficiently', async () => {
      const testUsers = Array.from({ length: 100 }, (_, i) => ({
        id: `perf-test-user-${i}`,
        email: `perftest${i}@example.com`,
        name: `Performance Test User ${i}`,
      }));

      const startTime = performance.now();

      // バルクインサート
      await prisma.user.createMany({
        data: testUsers,
        skipDuplicates: true,
      });

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // 100ユーザーのバルクインサートが1秒以内に完了することを確認
      expect(executionTime).toBeLessThan(1000);

      // クリーンアップ
      await prisma.user.deleteMany({
        where: {
          id: { in: testUsers.map(u => u.id) },
        },
      });
    });

    test('should handle bulk updates efficiently', async () => {
      // テストデータ準備
      const testUsers = Array.from({ length: 50 }, (_, i) => ({
        id: `bulk-update-user-${i}`,
        email: `bulkupdate${i}@example.com`,
        name: `Bulk Update User ${i}`,
      }));

      await prisma.user.createMany({
        data: testUsers,
        skipDuplicates: true,
      });

      const startTime = performance.now();

      // バルクアップデート
      await prisma.user.updateMany({
        where: {
          id: { in: testUsers.map(u => u.id) },
        },
        data: {
          name: 'Updated Name',
        },
      });

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // 50ユーザーのバルクアップデートが500ms以内に完了することを確認
      expect(executionTime).toBeLessThan(500);

      // クリーンアップ
      await prisma.user.deleteMany({
        where: {
          id: { in: testUsers.map(u => u.id) },
        },
      });
    });
  });

  describe('Connection Pool Performance Tests', () => {
    test('should handle concurrent queries efficiently', async () => {
      const concurrentQueries = Array.from({ length: 10 }, () =>
        prisma.user.findMany({ take: 10 })
      );

      const startTime = performance.now();

      await Promise.all(concurrentQueries);

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // 10個の並行クエリが1秒以内に完了することを確認
      expect(executionTime).toBeLessThan(1000);
    });
  });

  describe('Index Effectiveness Tests', () => {
    test('should use indexes for email lookups', async () => {
      // インデックスが効いているかテスト用のユーザーを作成
      const testUser = await prisma.user.create({
        data: {
          id: 'index-test-user',
          email: 'indextest@example.com',
          name: 'Index Test User',
        },
      });

      const startTime = performance.now();

      // メールアドレスでの検索（インデックスが効くはず）
      await prisma.user.findUnique({
        where: { email: 'indextest@example.com' },
      });

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // インデックスを使った検索が50ms以内に完了することを確認
      expect(executionTime).toBeLessThan(50);

      // クリーンアップ
      await prisma.user.delete({ where: { id: testUser.id } });
    });
  });

  describe('Memory Usage Tests', () => {
    test('should handle large result sets without memory issues', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // 大量のデータを取得（ただし実際のデータ量に依存）
      const results = await prisma.user.findMany({
        take: 1000,
      });

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // メモリ使用量の増加が50MB以内であることを確認
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);

      // 結果が取得できていることを確認
      expect(Array.isArray(results)).toBe(true);
    });
  });
});
