import { PrismaClient } from '../generated/prisma-client/index.js';
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
        createMany: jest.fn().mockResolvedValue({ count: 0 }),
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
        type: 'ACTION',
        status: 'PENDING',
        estimatedTime: data.estimatedMinutes,
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      prisma.task.createMany.mockResolvedValue({ count: tasksData.length });
      prisma.task.findMany.mockResolvedValue(mockTasks);

      const createdTasks = await taskDatabaseService.createTasks(testActionId, tasksData);

      expect(createdTasks).toHaveLength(3);
      expect(prisma.task.createMany).toHaveBeenCalledWith({
        data: tasksData.map(task => ({
          actionId: testActionId,
          title: task.title,
          description: task.description,
          type: 'ACTION',
          status: 'PENDING',
          estimatedTime: task.estimatedMinutes,
        })),
      });
      expect(prisma.task.findMany).toHaveBeenCalledWith({
        where: { actionId: testActionId },
        orderBy: { createdAt: 'asc' },
      });
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

      prisma.task.createMany.mockRejectedValue(
        new Error('Foreign key constraint failed on the field: `actionId`')
      );

      await expect(taskDatabaseService.createTasks('invalid-action-id', tasksData)).rejects.toThrow(
        'Foreign key constraint failed'
      );
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
            type: 'ACTION',
            status: 'PENDING',
            estimatedTime: 30,
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
            type: 'ACTION',
            status: 'PENDING',
            estimatedTime: 30,
          },
        });

        return { actionId: testActionId, taskId: task.id };
      });

      expect(result.actionId).toBe(testActionId);
      expect(result.taskId).toBe('task-tx-1');
      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });
});
