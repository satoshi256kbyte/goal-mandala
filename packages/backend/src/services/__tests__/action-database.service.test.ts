import { PrismaClient } from '@prisma/client';
import { ActionDatabaseService } from '../action-database.service';
import { ActionOutput } from '../../types/action-generation.types';

// モックされたPrismaクライアントの型定義
type MockedPrismaClient = {
  $connect: jest.Mock;
  $disconnect: jest.Mock;
  $transaction: jest.Mock;
  action: {
    create: jest.Mock;
    createMany: jest.Mock;
    findMany: jest.Mock;
    deleteMany: jest.Mock;
  };
  subGoal: {
    findUnique: jest.Mock;
    update: jest.Mock;
  };
};

/**
 * ActionDatabaseService統合テスト
 * 注: このテストはモックされたPrismaクライアントを使用します
 * 実際のデータベースを使用した統合テストは、Docker環境で別途実行してください
 */
describe('ActionDatabaseService Integration Tests', () => {
  let prisma: MockedPrismaClient;
  let actionDatabaseService: ActionDatabaseService;
  let testSubGoalId: string;

  beforeAll(() => {
    testSubGoalId = 'test-subgoal-id-123';
  });

  beforeEach(() => {
    // モックされたPrismaクライアントを作成
    prisma = {
      $connect: jest.fn().mockResolvedValue(undefined),
      $disconnect: jest.fn().mockResolvedValue(undefined),
      $transaction: jest.fn(),
      action: {
        create: jest.fn(),
        createMany: jest.fn(),
        findMany: jest.fn(),
        deleteMany: jest.fn(),
      },
      subGoal: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    } as unknown as MockedPrismaClient;

    actionDatabaseService = new ActionDatabaseService(prisma as unknown as PrismaClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('deleteExistingActions', () => {
    it('既存のアクションを削除できる', async () => {
      prisma.action.deleteMany.mockResolvedValue({ count: 8 });

      await actionDatabaseService.deleteExistingActions(testSubGoalId);

      expect(prisma.action.deleteMany).toHaveBeenCalledWith({
        where: { subGoalId: testSubGoalId },
      });
    });

    it('アクションが存在しない場合もエラーにならない', async () => {
      prisma.action.deleteMany.mockResolvedValue({ count: 0 });

      await expect(
        actionDatabaseService.deleteExistingActions(testSubGoalId)
      ).resolves.not.toThrow();

      expect(prisma.action.deleteMany).toHaveBeenCalledWith({
        where: { subGoalId: testSubGoalId },
      });
    });

    it('データベースエラーが発生した場合エラーをスローする', async () => {
      prisma.action.deleteMany.mockRejectedValue(new Error('Database connection error'));

      await expect(actionDatabaseService.deleteExistingActions(testSubGoalId)).rejects.toThrow(
        'Database connection error'
      );
    });
  });

  describe('createActions', () => {
    it('8個のアクションを作成できる', async () => {
      const actionsData: ActionOutput[] = Array.from({ length: 8 }, (_, i) => ({
        id: `action-${i}`,
        title: `アクション${i + 1}`,
        description: `説明${i + 1}`,
        background: `背景${i + 1}`,
        type: i % 2 === 0 ? 'EXECUTION' : 'HABIT',
        position: i,
        progress: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));

      const mockActions = actionsData.map((data, index) => ({
        id: `action-${index}`,
        subGoalId: testSubGoalId,
        title: data.title,
        description: data.description,
        background: data.background,
        constraints: null,
        type: data.type,
        position: data.position,
        progress: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      prisma.action.create.mockImplementation((args: any) => {
        const position = args.data.position;
        return Promise.resolve(mockActions[position]);
      });

      const createdActions = await actionDatabaseService.createActions(testSubGoalId, actionsData);

      expect(createdActions).toHaveLength(8);
      expect(prisma.action.create).toHaveBeenCalledTimes(8);

      createdActions.forEach((action, index) => {
        expect(action.title).toBe(`アクション${index + 1}`);
        expect(action.description).toBe(`説明${index + 1}`);
        expect(action.background).toBe(`背景${index + 1}`);
        expect(action.position).toBe(index);
        expect(action.progress).toBe(0);
        expect(action.subGoalId).toBe(testSubGoalId);
        expect(action.type).toBe(index % 2 === 0 ? 'EXECUTION' : 'HABIT');
      });
    });

    it('position値が正しく設定される（0-7）', async () => {
      const actionsData: ActionOutput[] = Array.from({ length: 8 }, (_, i) => ({
        id: `action-${i}`,
        title: `アクション${i + 1}`,
        description: `説明${i + 1}`,
        background: `背景${i + 1}`,
        type: 'EXECUTION',
        position: i,
        progress: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));

      const mockActions = actionsData.map((data, index) => ({
        id: `action-${index}`,
        subGoalId: testSubGoalId,
        title: data.title,
        description: data.description,
        background: data.background,
        constraints: null,
        type: data.type,
        position: data.position,
        progress: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      prisma.action.create.mockImplementation((args: any) => {
        const position = args.data.position;
        return Promise.resolve(mockActions[position]);
      });

      const createdActions = await actionDatabaseService.createActions(testSubGoalId, actionsData);

      createdActions.forEach((action, index) => {
        expect(action.position).toBe(index);
        expect(action.position).toBeGreaterThanOrEqual(0);
        expect(action.position).toBeLessThanOrEqual(7);
      });
    });

    it('type（EXECUTION/HABIT）が正しく設定される', async () => {
      const actionsData: ActionOutput[] = [
        {
          id: 'action-0',
          title: 'アクション1',
          description: '説明1',
          background: '背景1',
          type: 'EXECUTION',
          position: 0,
          progress: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'action-1',
          title: 'アクション2',
          description: '説明2',
          background: '背景2',
          type: 'HABIT',
          position: 1,
          progress: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      const mockActions = actionsData.map((data, index) => ({
        id: `action-${index}`,
        subGoalId: testSubGoalId,
        title: data.title,
        description: data.description,
        background: data.background,
        constraints: null,
        type: data.type,
        position: data.position,
        progress: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      prisma.action.create.mockImplementation((args: any) => {
        const position = args.data.position;
        return Promise.resolve(mockActions[position]);
      });

      const createdActions = await actionDatabaseService.createActions(
        testSubGoalId,
        actionsData.slice(0, 2)
      );

      expect(createdActions[0].type).toBe('EXECUTION');
      expect(createdActions[1].type).toBe('HABIT');
    });

    it('progress初期値が0に設定される', async () => {
      const actionsData: ActionOutput[] = Array.from({ length: 8 }, (_, i) => ({
        id: `action-${i}`,
        title: `アクション${i + 1}`,
        description: `説明${i + 1}`,
        background: `背景${i + 1}`,
        type: 'EXECUTION',
        position: i,
        progress: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));

      const mockActions = actionsData.map((data, index) => ({
        id: `action-${index}`,
        subGoalId: testSubGoalId,
        title: data.title,
        description: data.description,
        background: data.background,
        constraints: null,
        type: data.type,
        position: data.position,
        progress: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      prisma.action.create.mockImplementation((args: any) => {
        const position = args.data.position;
        return Promise.resolve(mockActions[position]);
      });

      const createdActions = await actionDatabaseService.createActions(testSubGoalId, actionsData);

      createdActions.forEach(action => {
        expect(action.progress).toBe(0);
      });
    });

    it('無効なsubGoalIdでアクションを作成するとエラーが発生する', async () => {
      const actionsData: ActionOutput[] = [
        {
          id: 'action-0',
          title: 'アクション1',
          description: '説明1',
          background: '背景1',
          type: 'EXECUTION',
          position: 0,
          progress: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      prisma.action.create.mockRejectedValue(
        new Error('Foreign key constraint failed on the field: `subGoalId`')
      );

      await expect(
        actionDatabaseService.createActions('invalid-subgoal-id', actionsData)
      ).rejects.toThrow('Foreign key constraint failed');
    });

    it('重複するposition値でアクションを作成するとエラーが発生する', async () => {
      const duplicateActions: ActionOutput[] = [
        {
          id: 'action-0',
          title: 'アクション1',
          description: '説明1',
          background: '背景1',
          type: 'EXECUTION',
          position: 0,
          progress: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'action-1',
          title: 'アクション2',
          description: '説明2',
          background: '背景2',
          type: 'EXECUTION',
          position: 0, // 重複
          progress: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      prisma.action.create
        .mockResolvedValueOnce({
          id: 'action-0',
          subGoalId: testSubGoalId,
          title: 'アクション1',
          description: '説明1',
          background: '背景1',
          constraints: null,
          type: 'EXECUTION',
          position: 0,
          progress: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .mockRejectedValueOnce(
          new Error('Unique constraint failed on the fields: (`subGoalId`,`position`)')
        );

      await expect(
        actionDatabaseService.createActions(testSubGoalId, duplicateActions)
      ).rejects.toThrow('Unique constraint failed');
    });
  });

  describe('executeInTransaction', () => {
    it('トランザクション内で複数の操作を実行できる', async () => {
      const mockTx = {
        action: {
          deleteMany: jest.fn().mockResolvedValue({ count: 8 }),
          create: jest.fn().mockResolvedValue({
            id: 'action-tx-1',
            subGoalId: testSubGoalId,
            title: 'トランザクション内のアクション',
            description: '説明',
            background: '背景',
            type: 'EXECUTION',
            position: 0,
            progress: 0,
          }),
        },
      };

      prisma.$transaction.mockImplementation(async (callback: any) => {
        return await callback(mockTx);
      });

      const result = await actionDatabaseService.executeInTransaction(async tx => {
        // 既存のアクションを削除
        await tx.action.deleteMany({
          where: { subGoalId: testSubGoalId },
        });

        // 新しいアクションを作成
        const action = await tx.action.create({
          data: {
            subGoalId: testSubGoalId,
            title: 'トランザクション内のアクション',
            description: '説明',
            background: '背景',
            type: 'EXECUTION',
            position: 0,
            progress: 0,
          },
        });

        return { subGoalId: testSubGoalId, actionId: action.id };
      });

      expect(result.subGoalId).toBe(testSubGoalId);
      expect(result.actionId).toBe('action-tx-1');
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('トランザクション内でエラーが発生した場合ロールバックされる', async () => {
      prisma.$transaction.mockImplementation(async (callback: any) => {
        const mockTx = {
          action: {
            deleteMany: jest.fn().mockResolvedValue({ count: 8 }),
            create: jest.fn().mockResolvedValue({
              id: 'action-rollback',
              subGoalId: testSubGoalId,
              title: 'ロールバックされるべきアクション',
            }),
          },
        };

        // トランザクション内でエラーを発生させる
        await expect(callback(mockTx)).rejects.toThrow('トランザクションエラー');
        throw new Error('トランザクションエラー');
      });

      await expect(
        actionDatabaseService.executeInTransaction(async tx => {
          // 既存のアクションを削除
          await tx.action.deleteMany({
            where: { subGoalId: testSubGoalId },
          });

          // 新しいアクションを作成
          await tx.action.create({
            data: {
              subGoalId: testSubGoalId,
              title: 'ロールバックされるべきアクション',
              description: '説明',
              background: '背景',
              type: 'EXECUTION',
              position: 0,
              progress: 0,
            },
          });

          // 意図的にエラーを発生させる
          throw new Error('トランザクションエラー');
        })
      ).rejects.toThrow('トランザクションエラー');

      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('トランザクション内で複数のアクションを作成し、エラー時にロールバックされる', async () => {
      prisma.$transaction.mockImplementation(async (callback: any) => {
        const mockTx = {
          action: {
            create: jest
              .fn()
              .mockResolvedValueOnce({
                id: 'action-1',
                subGoalId: testSubGoalId,
                title: 'アクション1',
              })
              .mockResolvedValueOnce({
                id: 'action-2',
                subGoalId: testSubGoalId,
                title: 'アクション2',
              }),
          },
        };

        await expect(callback(mockTx)).rejects.toThrow('アクション作成エラー');
        throw new Error('アクション作成エラー');
      });

      await expect(
        actionDatabaseService.executeInTransaction(async tx => {
          // 複数のアクションを作成
          await tx.action.create({
            data: {
              subGoalId: testSubGoalId,
              title: 'アクション1',
              description: '説明1',
              background: '背景1',
              type: 'EXECUTION',
              position: 0,
              progress: 0,
            },
          });

          await tx.action.create({
            data: {
              subGoalId: testSubGoalId,
              title: 'アクション2',
              description: '説明2',
              background: '背景2',
              type: 'HABIT',
              position: 1,
              progress: 0,
            },
          });

          // エラーを発生させる
          throw new Error('アクション作成エラー');
        })
      ).rejects.toThrow('アクション作成エラー');

      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });

  describe('エラーハンドリング', () => {
    it('データベース接続エラーが適切に処理される', async () => {
      prisma.action.deleteMany.mockRejectedValue(new Error('Connection timeout'));

      await expect(actionDatabaseService.deleteExistingActions(testSubGoalId)).rejects.toThrow(
        'Connection timeout'
      );
    });

    it('トランザクションタイムアウトが適切に処理される', async () => {
      prisma.$transaction.mockRejectedValue(new Error('Transaction timeout'));

      await expect(
        actionDatabaseService.executeInTransaction(async tx => {
          await tx.action.create({
            data: {
              subGoalId: testSubGoalId,
              title: 'タイムアウトテスト',
              description: '説明',
              background: '背景',
              type: 'EXECUTION',
              position: 0,
              progress: 0,
            },
          });
        })
      ).rejects.toThrow('Transaction timeout');
    });
  });
});
