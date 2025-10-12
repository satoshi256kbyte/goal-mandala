/**
 * action-database.serviceのカバレッジ改善テスト
 */

import { ActionDatabaseService } from '../action-database.service';
import { ActionOutput } from '../../types/action-generation.types';

// Prismaクライアントをモック
const mockPrisma = {
  action: {
    create: jest.fn(),
    deleteMany: jest.fn(),
  },
  subGoal: {
    findUnique: jest.fn(),
  },
  $transaction: jest.fn(),
  $disconnect: jest.fn(),
};

describe('ActionDatabaseService Coverage Tests', () => {
  let service: ActionDatabaseService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ActionDatabaseService(mockPrisma as any);
  });

  it('deleteExistingActions - 既存アクション削除', async () => {
    mockPrisma.action.deleteMany.mockResolvedValue({ count: 5 });

    await service.deleteExistingActions('subgoal-123');

    expect(mockPrisma.action.deleteMany).toHaveBeenCalledWith({
      where: { subGoalId: 'subgoal-123' },
    });
  });

  it('createActions - アクション作成', async () => {
    const actions: ActionOutput[] = [
      {
        title: 'アクション1',
        description: '説明1',
        background: '背景1',
        type: 'EXECUTION',
        position: 0,
      },
      {
        title: 'アクション2',
        description: '説明2',
        background: '背景2',
        type: 'HABIT',
        position: 1,
      },
    ];

    const createdActions = actions.map((action, index) => ({
      id: `action-${index + 1}`,
      subGoalId: 'subgoal-123',
      ...action,
      progress: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    mockPrisma.action.create
      .mockResolvedValueOnce(createdActions[0])
      .mockResolvedValueOnce(createdActions[1]);

    const result = await service.createActions('subgoal-123', actions);

    expect(mockPrisma.action.create).toHaveBeenCalledTimes(2);
    expect(mockPrisma.action.create).toHaveBeenNthCalledWith(1, {
      data: {
        subGoalId: 'subgoal-123',
        title: 'アクション1',
        description: '説明1',
        background: '背景1',
        type: 'EXECUTION',
        position: 0,
        progress: 0,
      },
    });
    expect(result).toEqual(createdActions);
  });

  it('getSubGoalWithGoal - サブ目標と目標情報取得', async () => {
    const subGoalData = {
      id: 'subgoal-123',
      goal: {
        id: 'goal-123',
        userId: 'user-123',
      },
    };

    mockPrisma.subGoal.findUnique.mockResolvedValue(subGoalData);

    const result = await service.getSubGoalWithGoal('subgoal-123');

    expect(mockPrisma.subGoal.findUnique).toHaveBeenCalledWith({
      where: { id: 'subgoal-123' },
      select: {
        id: true,
        goal: {
          select: {
            id: true,
            userId: true,
          },
        },
      },
    });
    expect(result).toEqual(subGoalData);
  });

  it('getSubGoalWithGoal - 存在しないサブ目標', async () => {
    mockPrisma.subGoal.findUnique.mockResolvedValue(null);

    const result = await service.getSubGoalWithGoal('nonexistent-id');

    expect(result).toBeNull();
  });

  it('executeInTransaction - トランザクション実行', async () => {
    const mockTransactionFn = jest.fn().mockResolvedValue('transaction result');
    mockPrisma.$transaction.mockImplementation(async fn => {
      return await fn(mockPrisma);
    });

    const result = await service.executeInTransaction(mockTransactionFn);

    expect(mockPrisma.$transaction).toHaveBeenCalled();
    expect(mockTransactionFn).toHaveBeenCalledWith(mockPrisma);
    expect(result).toBe('transaction result');
  });

  it('disconnect - Prismaクライアント切断', async () => {
    await service.disconnect();

    expect(mockPrisma.$disconnect).toHaveBeenCalled();
  });

  it('エラーハンドリング - データベースエラー', async () => {
    mockPrisma.action.deleteMany.mockRejectedValue(new Error('Database connection failed'));

    await expect(service.deleteExistingActions('subgoal-123')).rejects.toThrow(
      'Database connection failed'
    );
  });
});
