import { PrismaClient } from '@prisma/client';

describe('Database Migration Tests', () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = new PrismaClient();
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Table Existence Tests', () => {
    test('should have all required tables', async () => {
      const expectedTables = [
        'User',
        'Goal',
        'SubGoal',
        'Action',
        'Task',
        'TaskReminder',
        'Reflection',
      ];

      for (const tableName of expectedTables) {
        const result = (await prisma.$queryRaw`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = ${tableName}
          );
        `) as [{ exists: boolean }];

        expect(result[0].exists).toBe(true);
      }
    });

    test('should have correct enum types', async () => {
      const expectedEnums = ['GoalStatus', 'ActionType', 'TaskType', 'TaskStatus'];

      for (const enumName of expectedEnums) {
        const result = (await prisma.$queryRaw`
          SELECT EXISTS (
            SELECT FROM pg_type 
            WHERE typname = ${enumName}
            AND typtype = 'e'
          );
        `) as [{ exists: boolean }];

        expect(result[0].exists).toBe(true);
      }
    });
  });

  describe('Foreign Key Constraint Tests', () => {
    test('should enforce foreign key constraints', async () => {
      // 存在しないユーザーIDで目標を作成しようとするとエラーになる
      await expect(
        prisma.goal.create({
          data: {
            id: 'test-goal-fk',
            user_id: 'non-existent-user',
            title: 'Test Goal',
            description: 'Test Description',
            deadline: new Date(),
            background: 'Test Background',
            status: 'ACTIVE',
            progress: 0,
          },
        })
      ).rejects.toThrow();
    });

    test('should cascade delete properly', async () => {
      // テストユーザーを作成
      const user = await prisma.user.create({
        data: {
          id: 'test-cascade-user',
          email: 'cascade@test.com',
          name: 'Cascade Test User',
        },
      });

      // 目標を作成
      const goal = await prisma.goal.create({
        data: {
          id: 'test-cascade-goal',
          user_id: user.id,
          title: 'Cascade Test Goal',
          description: 'Test Description',
          deadline: new Date(),
          background: 'Test Background',
          status: 'ACTIVE',
          progress: 0,
        },
      });

      // サブ目標を作成
      await prisma.subGoal.create({
        data: {
          id: 'test-cascade-subgoal',
          goal_id: goal.id,
          title: 'Test SubGoal',
          description: 'Test Description',
          background: 'Test Background',
          position: 0,
          progress: 0,
        },
      });

      // ユーザーを削除（カスケード削除をテスト）
      await prisma.user.delete({
        where: { id: user.id },
      });

      // 関連データが削除されていることを確認
      const remainingGoals = await prisma.goal.findMany({
        where: { user_id: user.id },
      });
      expect(remainingGoals).toHaveLength(0);

      const remainingSubGoals = await prisma.subGoal.findMany({
        where: { goal_id: goal.id },
      });
      expect(remainingSubGoals).toHaveLength(0);
    });
  });

  describe('Index Performance Tests', () => {
    test('should have proper indexes for common queries', async () => {
      // インデックスの存在確認
      const indexes = (await prisma.$queryRaw`
        SELECT indexname, tablename 
        FROM pg_indexes 
        WHERE schemaname = 'public'
        AND indexname NOT LIKE '%_pkey'
        ORDER BY tablename, indexname;
      `) as Array<{ indexname: string; tablename: string }>;

      // 期待されるインデックスが存在することを確認
      const indexNames = indexes.map(idx => idx.indexname);

      // ユーザーのメール検索用インデックス
      expect(indexNames.some(name => name.includes('email'))).toBe(true);
    });
  });

  describe('Data Integrity Tests', () => {
    test('should enforce unique constraints', async () => {
      // 同じメールアドレスでユーザーを2回作成しようとするとエラーになる
      const userData = {
        id: 'test-unique-user-1',
        email: 'unique@test.com',
        name: 'Unique Test User 1',
      };

      await prisma.user.create({ data: userData });

      await expect(
        prisma.user.create({
          data: {
            id: 'test-unique-user-2',
            email: 'unique@test.com', // 同じメールアドレス
            name: 'Unique Test User 2',
          },
        })
      ).rejects.toThrow();

      // クリーンアップ
      await prisma.user.delete({ where: { id: userData.id } });
    });

    test('should enforce check constraints', async () => {
      const user = await prisma.user.create({
        data: {
          id: 'test-check-user',
          email: 'check@test.com',
          name: 'Check Test User',
        },
      });

      // 進捗率が範囲外の値でエラーになることを確認
      await expect(
        prisma.goal.create({
          data: {
            id: 'test-check-goal',
            user_id: user.id,
            title: 'Check Test Goal',
            description: 'Test Description',
            deadline: new Date(),
            background: 'Test Background',
            status: 'ACTIVE',
            progress: 150, // 範囲外の値
          },
        })
      ).rejects.toThrow();

      // クリーンアップ
      await prisma.user.delete({ where: { id: user.id } });
    });
  });

  describe('Mandala Structure Tests', () => {
    test('should support complete mandala structure', async () => {
      // 完全なマンダラ構造を作成してテスト
      const user = await prisma.user.create({
        data: {
          id: 'test-mandala-user',
          email: 'mandala@test.com',
          name: 'Mandala Test User',
        },
      });

      const goal = await prisma.goal.create({
        data: {
          id: 'test-mandala-goal',
          user_id: user.id,
          title: 'Mandala Test Goal',
          description: 'Test Description',
          deadline: new Date(),
          background: 'Test Background',
          status: 'ACTIVE',
          progress: 0,
        },
      });

      // 8個のサブ目標を作成
      const subGoals = [];
      for (let i = 0; i < 8; i++) {
        const subGoal = await prisma.subGoal.create({
          data: {
            id: `test-mandala-subgoal-${i}`,
            goal_id: goal.id,
            title: `SubGoal ${i}`,
            description: `SubGoal ${i} Description`,
            background: `SubGoal ${i} Background`,
            position: i,
            progress: 0,
          },
        });
        subGoals.push(subGoal);

        // 各サブ目標に8個のアクションを作成
        for (let j = 0; j < 8; j++) {
          await prisma.action.create({
            data: {
              id: `test-mandala-action-${i}-${j}`,
              sub_goal_id: subGoal.id,
              title: `Action ${i}-${j}`,
              description: `Action ${i}-${j} Description`,
              background: `Action ${i}-${j} Background`,
              type: j % 2 === 0 ? 'EXECUTION' : 'HABIT',
              position: j,
              progress: 0,
            },
          });
        }
      }

      // 作成されたデータを確認
      const createdSubGoals = await prisma.subGoal.findMany({
        where: { goal_id: goal.id },
      });
      expect(createdSubGoals).toHaveLength(8);

      const createdActions = await prisma.action.findMany({
        where: {
          sub_goal_id: { in: subGoals.map(sg => sg.id) },
        },
      });
      expect(createdActions).toHaveLength(64); // 8 × 8

      // クリーンアップ
      await prisma.user.delete({ where: { id: user.id } });
    });
  });
});
