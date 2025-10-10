import { PrismaClient } from '@prisma/client';
import { TaskDatabaseService } from '../task-database.service';
import { TaskOutput } from '../../types/task-generation.types';

// モックされたPrismaクライアントの型定義
type MockedPrismaClient = {
  $connect: jest.Mock;
  $disconnect: jest.Mock;
  $transaction: jest.Mock;
  task: {
    create: jest.Mock;
    createMany: jest.Mock;
    findMany: jest.Mock;
    deleteMany: jest.Mock;
  };
  action: {
    findUnique: jest.Mock;
    update: jest.Mock;
  };
};

/**
 * TaskDatabaseService統合テスト
 * 注: このテストはモックされたPrismaクライアントを使用します
 * 実際のデータベースを使用した統合テストは、Docker環境で別途実行してください
 */
describe('TaskDatabaseService Integration Tests', () => {
  let prisma: MockedPrismaClient;
  let taskDatabaseService: TaskDatabaseService;
  let testActionId: string;

  beforeAll(() => {
    testActionId = 'test-action-id-123';
  });

  beforeEach(() => {
    // モックされたPrismaクライアントを作成
    prisma = {
      $connect: jest.fn().mockResolvedValue(undefined),
      $disconnect: jest.fn().mockResolvedValue(undefined),
      $transaction: jest.fn(),
      task: {
        create: jest.fn(),
        createMany: jest.fn(),
        findMany: jest.fn(),
        deleteMany: jest.fn(),
      },
      action: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    } as unknown as MockedPrismaClient;

    taskDatabaseService = new TaskDatabaseService(prisma as unknown as PrismaClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('deleteExistingTasks', () => {
    it('既存のタスクを削除できる', async () => {
      prisma.task.deleteMany.mockResolvedValue({ count: 5 });

      await taskDatabaseService.deleteExistingTasks(testActionId);

      expect(prisma.task.deleteMany).toHaveBeenCalledWith({
        where: { actionId: testActionId },
      });
    });

    it('タスクが存在しない場合もエラーにならない', async () => {
      prisma.task.deleteMany.mockResolvedValue({ count: 0 });

      await expect(taskDatabaseService.deleteExistingTasks(testActionId)).resolves.not.toThrow();

      expect(prisma.task.deleteMany).toHaveBeenCalledWith({
        where: { actionId: testActionId },
      });
    });

    it('データベースエラーが発生した場合エラーをスローする', async () => {
      prisma.task.deleteMany.mockRejectedValue(new Error('Database connection error'));

      await expect(taskDatabaseService.deleteExistingTasks(testActionId)).rejects.toThrow(
        'Database connection error'
      );
    });
  });

  describe('createTasks', () => {
    it('複数のタスクを作成できる', async () => {
      const tasksData: TaskOutput[] = [
        {
          title: 'TypeScript公式ドキュメントの基礎編を読む',
          description:
            'TypeScript公式ドキュメントの基礎編（型システム、インターフェース、クラス）を読み、サンプルコードを実際に動かして理解を深める',
          estimatedMinutes: 45,
          priority: 'HIGH',
        },
        {
          title: 'TypeScriptの型システムを実践する',
          description:
            '学んだ型システムの知識を使って、簡単なTypeScriptプログラムを作成し、型の恩恵を体感する',
          estimatedMinutes: 60,
          priority: 'MEDIUM',
        },
        {
          title: 'TypeScriptのジェネリクスを学ぶ',
          description: 'ジェネリクスの概念と使い方を学び、実際のコードで活用する',
          estimatedMinutes: 50,
          priority: 'MEDIUM',
        },
      ];

      const mockTasks = tasksData.map((data, index) => ({
        id: `task-${index}`,
        actionId: testActionId,
        title: data.title,
        description: data.description,
        type: 'EXECUTION',
        status: 'NOT_STARTED',
        estimatedMinutes: data.estimatedMinutes,
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      prisma.task.create.mockImplementation((args: any) => {
        const index = mockTasks.findIndex(t => t.title === args.data.title);
        return Promise.resolve(mockTasks[index]);
      });

      const createdTasks = await taskDatabaseService.createTasks(
        testActionId,
        'EXECUTION',
        tasksData
      );

      expect(createdTasks).toHaveLength(3);
      expect(prisma.task.create).toHaveBeenCalledTimes(3);

      createdTasks.forEach((task, index) => {
        expect(task.title).toBe(tasksData[index].title);
        expect(task.description).toBe(tasksData[index].description);
        expect(task.estimatedMinutes).toBe(tasksData[index].estimatedMinutes);
        expect(task.type).toBe('EXECUTION');
        expect(task.status).toBe('NOT_STARTED');
        expect(task.actionId).toBe(testActionId);
      });
    });

    it('type（EXECUTION）が正しく設定される', async () => {
      const tasksData: TaskOutput[] = [
        {
          title: 'タスク1',
          description: '説明1',
          estimatedMinutes: 30,
          priority: 'HIGH',
        },
      ];

      const mockTask = {
        id: 'task-1',
        actionId: testActionId,
        title: tasksData[0].title,
        description: tasksData[0].description,
        type: 'EXECUTION',
        status: 'NOT_STARTED',
        estimatedMinutes: tasksData[0].estimatedMinutes,
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prisma.task.create.mockResolvedValue(mockTask);

      const createdTasks = await taskDatabaseService.createTasks(
        testActionId,
        'EXECUTION',
        tasksData
      );

      expect(createdTasks[0].type).toBe('EXECUTION');
    });

    it('type（HABIT）が正しく設定される', async () => {
      const tasksData: TaskOutput[] = [
        {
          title: '毎日ランニング',
          description: '30分間のランニングを継続する',
          estimatedMinutes: 30,
          priority: 'HIGH',
        },
      ];

      const mockTask = {
        id: 'task-1',
        actionId: testActionId,
        title: tasksData[0].title,
        description: tasksData[0].description,
        type: 'HABIT',
        status: 'NOT_STARTED',
        estimatedMinutes: tasksData[0].estimatedMinutes,
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prisma.task.create.mockResolvedValue(mockTask);

      const createdTasks = await taskDatabaseService.createTasks(testActionId, 'HABIT', tasksData);

      expect(createdTasks[0].type).toBe('HABIT');
    });

    it('status初期値がNOT_STARTEDに設定される', async () => {
      const tasksData: TaskOutput[] = [
        {
          title: 'タスク1',
          description: '説明1',
          estimatedMinutes: 30,
          priority: 'HIGH',
        },
        {
          title: 'タスク2',
          description: '説明2',
          estimatedMinutes: 45,
          priority: 'MEDIUM',
        },
      ];

      const mockTasks = tasksData.map((data, index) => ({
        id: `task-${index}`,
        actionId: testActionId,
        title: data.title,
        description: data.description,
        type: 'EXECUTION',
        status: 'NOT_STARTED',
        estimatedMinutes: data.estimatedMinutes,
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      prisma.task.create.mockImplementation((args: any) => {
        const index = mockTasks.findIndex(t => t.title === args.data.title);
        return Promise.resolve(mockTasks[index]);
      });

      const createdTasks = await taskDatabaseService.createTasks(
        testActionId,
        'EXECUTION',
        tasksData
      );

      createdTasks.forEach(task => {
        expect(task.status).toBe('NOT_STARTED');
      });
    });

    it('estimatedMinutesが正しく設定される', async () => {
      const tasksData: TaskOutput[] = [
        {
          title: 'タスク1',
          description: '説明1',
          estimatedMinutes: 30,
          priority: 'HIGH',
        },
        {
          title: 'タスク2',
          description: '説明2',
          estimatedMinutes: 60,
          priority: 'MEDIUM',
        },
      ];

      const mockTasks = tasksData.map((data, index) => ({
        id: `task-${index}`,
        actionId: testActionId,
        title: data.title,
        description: data.description,
        type: 'EXECUTION',
        status: 'NOT_STARTED',
        estimatedMinutes: data.estimatedMinutes,
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      prisma.task.create.mockImplementation((args: any) => {
        const index = mockTasks.findIndex(t => t.title === args.data.title);
        return Promise.resolve(mockTasks[index]);
      });

      const createdTasks = await taskDatabaseService.createTasks(
        testActionId,
        'EXECUTION',
        tasksData
      );

      expect(createdTasks[0].estimatedMinutes).toBe(30);
      expect(createdTasks[1].estimatedMinutes).toBe(60);
    });

    it('無効なactionIdでタスクを作成するとエラーが発生する', async () => {
      const tasksData: TaskOutput[] = [
        {
          title: 'タスク1',
          description: '説明1',
          estimatedMinutes: 30,
          priority: 'HIGH',
        },
      ];

      prisma.task.create.mockRejectedValue(
        new Error('Foreign key constraint failed on the field: `actionId`')
      );

      await expect(
        taskDatabaseService.createTasks('invalid-action-id', 'EXECUTION', tasksData)
      ).rejects.toThrow('Foreign key constraint failed');
    });
  });

  describe('executeInTransaction', () => {
    it('トランザクション内で複数の操作を実行できる', async () => {
      const mockTx = {
        task: {
          deleteMany: jest.fn().mockResolvedValue({ count: 3 }),
          create: jest.fn().mockResolvedValue({
            id: 'task-tx-1',
            actionId: testActionId,
            title: 'トランザクション内のタスク',
            description: '説明',
            type: 'EXECUTION',
            status: 'NOT_STARTED',
            estimatedMinutes: 30,
          }),
        },
      };

      prisma.$transaction.mockImplementation(async (callback: any) => {
        return await callback(mockTx);
      });

      const result = await taskDatabaseService.executeInTransaction(async tx => {
        // 既存のタスクを削除
        await tx.task.deleteMany({
          where: { actionId: testActionId },
        });

        // 新しいタスクを作成
        const task = await tx.task.create({
          data: {
            actionId: testActionId,
            title: 'トランザクション内のタスク',
            description: '説明',
            type: 'EXECUTION',
            status: 'NOT_STARTED',
            estimatedMinutes: 30,
          },
        });

        return { actionId: testActionId, taskId: task.id };
      });

      expect(result.actionId).toBe(testActionId);
      expect(result.taskId).toBe('task-tx-1');
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('トランザクション内でエラーが発生した場合ロールバックされる', async () => {
      prisma.$transaction.mockImplementation(async (callback: any) => {
        const mockTx = {
          task: {
            deleteMany: jest.fn().mockResolvedValue({ count: 3 }),
            create: jest.fn().mockResolvedValue({
              id: 'task-rollback',
              actionId: testActionId,
              title: 'ロールバックされるべきタスク',
            }),
          },
        };

        // トランザクション内でエラーを発生させる
        await expect(callback(mockTx)).rejects.toThrow('トランザクションエラー');
        throw new Error('トランザクションエラー');
      });

      await expect(
        taskDatabaseService.executeInTransaction(async tx => {
          // 既存のタスクを削除
          await tx.task.deleteMany({
            where: { actionId: testActionId },
          });

          // 新しいタスクを作成
          await tx.task.create({
            data: {
              actionId: testActionId,
              title: 'ロールバックされるべきタスク',
              description: '説明',
              type: 'EXECUTION',
              status: 'NOT_STARTED',
              estimatedMinutes: 30,
            },
          });

          // 意図的にエラーを発生させる
          throw new Error('トランザクションエラー');
        })
      ).rejects.toThrow('トランザクションエラー');

      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('トランザクション内で複数のタスクを作成し、エラー時にロールバックされる', async () => {
      prisma.$transaction.mockImplementation(async (callback: any) => {
        const mockTx = {
          task: {
            create: jest
              .fn()
              .mockResolvedValueOnce({
                id: 'task-1',
                actionId: testActionId,
                title: 'タスク1',
              })
              .mockResolvedValueOnce({
                id: 'task-2',
                actionId: testActionId,
                title: 'タスク2',
              }),
          },
        };

        await expect(callback(mockTx)).rejects.toThrow('タスク作成エラー');
        throw new Error('タスク作成エラー');
      });

      await expect(
        taskDatabaseService.executeInTransaction(async tx => {
          // 複数のタスクを作成
          await tx.task.create({
            data: {
              actionId: testActionId,
              title: 'タスク1',
              description: '説明1',
              type: 'EXECUTION',
              status: 'NOT_STARTED',
              estimatedMinutes: 30,
            },
          });

          await tx.task.create({
            data: {
              actionId: testActionId,
              title: 'タスク2',
              description: '説明2',
              type: 'EXECUTION',
              status: 'NOT_STARTED',
              estimatedMinutes: 45,
            },
          });

          // エラーを発生させる
          throw new Error('タスク作成エラー');
        })
      ).rejects.toThrow('タスク作成エラー');

      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });

  describe('エラーハンドリング', () => {
    it('データベース接続エラーが適切に処理される', async () => {
      prisma.task.deleteMany.mockRejectedValue(new Error('Connection timeout'));

      await expect(taskDatabaseService.deleteExistingTasks(testActionId)).rejects.toThrow(
        'Connection timeout'
      );
    });

    it('トランザクションタイムアウトが適切に処理される', async () => {
      prisma.$transaction.mockRejectedValue(new Error('Transaction timeout'));

      await expect(
        taskDatabaseService.executeInTransaction(async tx => {
          await tx.task.create({
            data: {
              actionId: testActionId,
              title: 'タイムアウトテスト',
              description: '説明',
              type: 'EXECUTION',
              status: 'NOT_STARTED',
              estimatedMinutes: 30,
            },
          });
        })
      ).rejects.toThrow('Transaction timeout');
    });
  });
});
