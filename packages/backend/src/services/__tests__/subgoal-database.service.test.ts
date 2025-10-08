import { PrismaClient } from '@prisma/client';
import { DatabaseService } from '../subgoal-database.service';
import { SubGoalGenerationRequest } from '../../types/subgoal-generation.types';

// モックされたPrismaクライアントの型定義
type MockedPrismaClient = {
  $connect: jest.Mock;
  $disconnect: jest.Mock;
  $transaction: jest.Mock;
  user: {
    create: jest.Mock;
    findUnique: jest.Mock;
    deleteMany: jest.Mock;
  };
  goal: {
    create: jest.Mock;
    findUnique: jest.Mock;
    findMany: jest.Mock;
    update: jest.Mock;
    deleteMany: jest.Mock;
  };
  subGoal: {
    create: jest.Mock;
    createMany: jest.Mock;
    findMany: jest.Mock;
    deleteMany: jest.Mock;
  };
};

/**
 * DatabaseService統合テスト
 * 注: このテストはモックされたPrismaクライアントを使用します
 * 実際のデータベースを使用した統合テストは、Docker環境で別途実行してください
 */
describe('DatabaseService Integration Tests', () => {
  let prisma: MockedPrismaClient;
  let databaseService: DatabaseService;
  let testUserId: string;
  let testGoalId: string;

  beforeAll(() => {
    testUserId = 'test-user-id-123';
    testGoalId = 'test-goal-id-456';
  });

  beforeEach(() => {
    // モックされたPrismaクライアントを作成
    prisma = {
      $connect: jest.fn().mockResolvedValue(undefined),
      $disconnect: jest.fn().mockResolvedValue(undefined),
      $transaction: jest.fn(),
      user: {
        create: jest.fn(),
        findUnique: jest.fn(),
        deleteMany: jest.fn(),
      },
      goal: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        deleteMany: jest.fn(),
      },
      subGoal: {
        create: jest.fn(),
        createMany: jest.fn(),
        findMany: jest.fn(),
        deleteMany: jest.fn(),
      },
    } as unknown as MockedPrismaClient;

    databaseService = new DatabaseService(prisma as unknown as PrismaClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createGoal', () => {
    it('新しい目標を作成できる', async () => {
      const goalData: SubGoalGenerationRequest = {
        title: 'TypeScriptのエキスパートになる',
        description: '6ヶ月でTypeScriptの高度な機能を習得する',
        deadline: '2025-12-31T23:59:59Z',
        background: 'フロントエンド開発者として成長したい',
        constraints: '平日は2時間、週末は4時間の学習時間を確保できる',
      };

      const mockGoal = {
        id: testGoalId,
        userId: testUserId,
        title: goalData.title,
        description: goalData.description,
        deadline: new Date(goalData.deadline),
        background: goalData.background,
        constraints: goalData.constraints,
        status: 'ACTIVE',
        progress: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prisma.goal.create.mockResolvedValue(mockGoal);

      const createdGoalId = await databaseService.createGoal(testUserId, goalData);

      expect(createdGoalId).toBe(testGoalId);
      expect(prisma.goal.create).toHaveBeenCalledWith({
        data: {
          userId: testUserId,
          title: goalData.title,
          description: goalData.description,
          deadline: new Date(goalData.deadline),
          background: goalData.background,
          constraints: goalData.constraints,
          status: 'ACTIVE',
          progress: 0,
        },
      });
    });

    it('制約事項なしで目標を作成できる', async () => {
      const goalData: SubGoalGenerationRequest = {
        title: 'テスト目標',
        description: 'テスト説明',
        deadline: '2025-12-31T23:59:59Z',
        background: 'テスト背景',
      };

      const mockGoal = {
        id: testGoalId,
        userId: testUserId,
        title: goalData.title,
        description: goalData.description,
        deadline: new Date(goalData.deadline),
        background: goalData.background,
        constraints: null,
        status: 'ACTIVE',
        progress: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prisma.goal.create.mockResolvedValue(mockGoal);

      const createdGoalId = await databaseService.createGoal(testUserId, goalData);

      expect(createdGoalId).toBe(testGoalId);
      expect(prisma.goal.create).toHaveBeenCalledWith({
        data: {
          userId: testUserId,
          title: goalData.title,
          description: goalData.description,
          deadline: new Date(goalData.deadline),
          background: goalData.background,
          constraints: undefined,
          status: 'ACTIVE',
          progress: 0,
        },
      });
    });
  });

  describe('getGoal', () => {
    it('存在する目標を取得できる', async () => {
      const mockGoal = {
        id: testGoalId,
        userId: testUserId,
      };

      prisma.goal.findUnique.mockResolvedValue(mockGoal);

      const goal = await databaseService.getGoal(testGoalId);

      expect(goal).toBeDefined();
      expect(goal?.id).toBe(testGoalId);
      expect(goal?.userId).toBe(testUserId);
      expect(prisma.goal.findUnique).toHaveBeenCalledWith({
        where: { id: testGoalId },
        select: { id: true, userId: true },
      });
    });

    it('存在しない目標の場合nullを返す', async () => {
      prisma.goal.findUnique.mockResolvedValue(null);

      const goal = await databaseService.getGoal('non-existent-id');

      expect(goal).toBeNull();
      expect(prisma.goal.findUnique).toHaveBeenCalledWith({
        where: { id: 'non-existent-id' },
        select: { id: true, userId: true },
      });
    });
  });

  describe('updateGoal', () => {
    it('目標を更新できる', async () => {
      const updatedData: SubGoalGenerationRequest = {
        title: '更新されたタイトル',
        description: '更新された説明',
        deadline: '2026-06-30T23:59:59Z',
        background: '更新された背景',
        constraints: '新しい制約',
      };

      const mockUpdatedGoal = {
        id: testGoalId,
        userId: testUserId,
        title: updatedData.title,
        description: updatedData.description,
        deadline: new Date(updatedData.deadline),
        background: updatedData.background,
        constraints: updatedData.constraints,
        status: 'ACTIVE',
        progress: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prisma.goal.update.mockResolvedValue(mockUpdatedGoal);

      await databaseService.updateGoal(testGoalId, updatedData);

      expect(prisma.goal.update).toHaveBeenCalledWith({
        where: { id: testGoalId },
        data: {
          title: updatedData.title,
          description: updatedData.description,
          deadline: new Date(updatedData.deadline),
          background: updatedData.background,
          constraints: updatedData.constraints,
          updatedAt: expect.any(Date),
        },
      });
    });

    it('存在しない目標の更新でエラーが発生する', async () => {
      const updatedData: SubGoalGenerationRequest = {
        title: '更新されたタイトル',
        description: '更新された説明',
        deadline: '2026-06-30T23:59:59Z',
        background: '更新された背景',
      };

      prisma.goal.update.mockRejectedValue(new Error('Record not found'));

      await expect(databaseService.updateGoal('non-existent-id', updatedData)).rejects.toThrow(
        'Record not found'
      );
    });
  });

  describe('deleteExistingSubGoals', () => {
    it('既存のサブ目標を削除できる', async () => {
      prisma.subGoal.deleteMany.mockResolvedValue({ count: 2 });

      await databaseService.deleteExistingSubGoals(testGoalId);

      expect(prisma.subGoal.deleteMany).toHaveBeenCalledWith({
        where: { goalId: testGoalId },
      });
    });

    it('サブ目標が存在しない場合もエラーにならない', async () => {
      prisma.subGoal.deleteMany.mockResolvedValue({ count: 0 });

      await expect(databaseService.deleteExistingSubGoals(testGoalId)).resolves.not.toThrow();

      expect(prisma.subGoal.deleteMany).toHaveBeenCalledWith({
        where: { goalId: testGoalId },
      });
    });
  });

  describe('createSubGoals', () => {
    it('8個のサブ目標を作成できる', async () => {
      const subGoalsData = Array.from({ length: 8 }, (_, i) => ({
        title: `サブ目標${i + 1}`,
        description: `説明${i + 1}`,
        background: `背景${i + 1}`,
        position: i,
      }));

      const mockSubGoals = subGoalsData.map((data, index) => ({
        id: `subgoal-${index}`,
        goalId: testGoalId,
        title: data.title,
        description: data.description,
        background: data.background,
        constraints: null,
        position: data.position,
        progress: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      prisma.subGoal.create.mockImplementation((args: any) => {
        const position = args.data.position;
        return Promise.resolve(mockSubGoals[position]);
      });

      const createdSubGoals = await databaseService.createSubGoals(testGoalId, subGoalsData);

      expect(createdSubGoals).toHaveLength(8);
      expect(prisma.subGoal.create).toHaveBeenCalledTimes(8);

      createdSubGoals.forEach((subGoal, index) => {
        expect(subGoal.title).toBe(`サブ目標${index + 1}`);
        expect(subGoal.description).toBe(`説明${index + 1}`);
        expect(subGoal.background).toBe(`背景${index + 1}`);
        expect(subGoal.position).toBe(index);
        expect(subGoal.progress).toBe(0);
        expect(subGoal.goalId).toBe(testGoalId);
      });
    });

    it('position値が正しく設定される', async () => {
      const subGoalsData = Array.from({ length: 8 }, (_, i) => ({
        title: `サブ目標${i + 1}`,
        description: `説明${i + 1}`,
        background: `背景${i + 1}`,
        position: i,
      }));

      const mockSubGoals = subGoalsData.map((data, index) => ({
        id: `subgoal-${index}`,
        goalId: testGoalId,
        title: data.title,
        description: data.description,
        background: data.background,
        constraints: null,
        position: data.position,
        progress: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      prisma.subGoal.create.mockImplementation((args: any) => {
        const position = args.data.position;
        return Promise.resolve(mockSubGoals[position]);
      });

      const createdSubGoals = await databaseService.createSubGoals(testGoalId, subGoalsData);

      createdSubGoals.forEach((subGoal, index) => {
        expect(subGoal.position).toBe(index);
      });
    });
  });

  describe('executeInTransaction', () => {
    it('トランザクション内で複数の操作を実行できる', async () => {
      const mockTx = {
        goal: {
          update: jest.fn().mockResolvedValue({
            id: testGoalId,
            title: 'トランザクション内で更新',
          }),
        },
        subGoal: {
          create: jest.fn().mockResolvedValue({
            id: 'subgoal-tx-1',
            goalId: testGoalId,
            title: 'トランザクション内のサブ目標',
            description: '説明',
            background: '背景',
            position: 0,
            progress: 0,
          }),
        },
      };

      prisma.$transaction.mockImplementation(async (callback: any) => {
        return await callback(mockTx);
      });

      const result = await databaseService.executeInTransaction(async tx => {
        // 目標を更新
        await tx.goal.update({
          where: { id: testGoalId },
          data: { title: 'トランザクション内で更新' },
        });

        // サブ目標を作成
        const subGoal = await tx.subGoal.create({
          data: {
            goalId: testGoalId,
            title: 'トランザクション内のサブ目標',
            description: '説明',
            background: '背景',
            position: 0,
            progress: 0,
          },
        });

        return { goalId: testGoalId, subGoalId: subGoal.id };
      });

      expect(result.goalId).toBe(testGoalId);
      expect(result.subGoalId).toBe('subgoal-tx-1');
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('トランザクション内でエラーが発生した場合ロールバックされる', async () => {
      prisma.$transaction.mockImplementation(async (callback: any) => {
        const mockTx = {
          goal: {
            update: jest.fn().mockResolvedValue({
              id: testGoalId,
              title: 'ロールバックされるべき更新',
            }),
          },
        };

        // トランザクション内でエラーを発生させる
        await expect(callback(mockTx)).rejects.toThrow('トランザクションエラー');
        throw new Error('トランザクションエラー');
      });

      await expect(
        databaseService.executeInTransaction(async tx => {
          // 目標を更新
          await tx.goal.update({
            where: { id: testGoalId },
            data: { title: 'ロールバックされるべき更新' },
          });

          // 意図的にエラーを発生させる
          throw new Error('トランザクションエラー');
        })
      ).rejects.toThrow('トランザクションエラー');

      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('トランザクション内で複数のサブ目標を作成し、エラー時にロールバックされる', async () => {
      prisma.$transaction.mockImplementation(async (callback: any) => {
        const mockTx = {
          subGoal: {
            create: jest
              .fn()
              .mockResolvedValueOnce({
                id: 'subgoal-1',
                goalId: testGoalId,
                title: 'サブ目標1',
              })
              .mockResolvedValueOnce({
                id: 'subgoal-2',
                goalId: testGoalId,
                title: 'サブ目標2',
              }),
          },
        };

        await expect(callback(mockTx)).rejects.toThrow('サブ目標作成エラー');
        throw new Error('サブ目標作成エラー');
      });

      await expect(
        databaseService.executeInTransaction(async tx => {
          // 複数のサブ目標を作成
          await tx.subGoal.create({
            data: {
              goalId: testGoalId,
              title: 'サブ目標1',
              description: '説明1',
              background: '背景1',
              position: 0,
              progress: 0,
            },
          });

          await tx.subGoal.create({
            data: {
              goalId: testGoalId,
              title: 'サブ目標2',
              description: '説明2',
              background: '背景2',
              position: 1,
              progress: 0,
            },
          });

          // エラーを発生させる
          throw new Error('サブ目標作成エラー');
        })
      ).rejects.toThrow('サブ目標作成エラー');

      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });

  describe('エラーハンドリング', () => {
    it('無効なgoalIdでサブ目標を作成するとエラーが発生する', async () => {
      const subGoalsData = [
        {
          title: 'サブ目標1',
          description: '説明1',
          background: '背景1',
          position: 0,
        },
      ];

      prisma.subGoal.create.mockRejectedValue(
        new Error('Foreign key constraint failed on the field: `goalId`')
      );

      await expect(databaseService.createSubGoals('invalid-goal-id', subGoalsData)).rejects.toThrow(
        'Foreign key constraint failed'
      );
    });

    it('重複するposition値でサブ目標を作成するとエラーが発生する', async () => {
      const duplicateSubGoal = [
        {
          title: 'サブ目標2',
          description: '説明2',
          background: '背景2',
          position: 0, // 重複
        },
      ];

      prisma.subGoal.create.mockRejectedValue(
        new Error('Unique constraint failed on the fields: (`goalId`,`position`)')
      );

      await expect(databaseService.createSubGoals(testGoalId, duplicateSubGoal)).rejects.toThrow(
        'Unique constraint failed'
      );
    });
  });
});
