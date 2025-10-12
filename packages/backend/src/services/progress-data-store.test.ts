import { PrismaClient } from '../generated/prisma-client';
import { PrismaProgressDataStore, InMemoryProgressDataStore } from './progress-data-store';

// Prismaクライアントのモック
const mockPrisma = {
  progressHistory: {
    create: jest.fn(),
    findMany: jest.fn(),
    deleteMany: jest.fn(),
  },
  goal: {
    findUnique: jest.fn(),
  },
  subGoal: {
    findUnique: jest.fn(),
  },
  action: {
    findUnique: jest.fn(),
  },
  task: {
    findUnique: jest.fn(),
  },
} as unknown as PrismaClient;

describe('PrismaProgressDataStore', () => {
  let store: PrismaProgressDataStore;

  beforeEach(() => {
    store = new PrismaProgressDataStore(mockPrisma);
    jest.clearAllMocks();
  });

  describe('saveProgress', () => {
    it('進捗データを正しく保存する', async () => {
      // Arrange
      const entityType = 'goal';
      const entityId = 'goal-1';
      const progress = 75;

      (mockPrisma.progressHistory.create as jest.Mock).mockResolvedValue({});

      // Act
      await store.saveProgress(entityType, entityId, progress);

      // Assert
      expect(mockPrisma.progressHistory.create).toHaveBeenCalledWith({
        data: {
          entityType,
          entityId,
          progress: 75,
          timestamp: expect.any(Date),
        },
      });
    });

    it('進捗値を整数に丸める', async () => {
      // Arrange
      const entityType = 'action';
      const entityId = 'action-1';
      const progress = 75.7;

      (mockPrisma.progressHistory.create as jest.Mock).mockResolvedValue({});

      // Act
      await store.saveProgress(entityType, entityId, progress);

      // Assert
      expect(mockPrisma.progressHistory.create).toHaveBeenCalledWith({
        data: {
          entityType,
          entityId,
          progress: 76, // 丸められた値
          timestamp: expect.any(Date),
        },
      });
    });

    it('保存エラー時は例外を投げる', async () => {
      // Arrange
      const entityType = 'task';
      const entityId = 'task-1';
      const progress = 100;

      (mockPrisma.progressHistory.create as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      // Act & Assert
      await expect(store.saveProgress(entityType, entityId, progress)).rejects.toThrow(
        'Database error'
      );
    });
  });

  describe('getProgress', () => {
    it('目標の進捗を正しく取得する', async () => {
      // Arrange
      const entityType = 'goal';
      const entityId = 'goal-1';

      (mockPrisma.goal.findUnique as jest.Mock).mockResolvedValue({
        progress: 65,
      });

      // Act
      const progress = await store.getProgress(entityType, entityId);

      // Assert
      expect(progress).toBe(65);
      expect(mockPrisma.goal.findUnique).toHaveBeenCalledWith({
        where: { id: entityId },
        select: { progress: true },
      });
    });

    it('タスクの進捗を正しく取得する（完了済み）', async () => {
      // Arrange
      const entityType = 'task';
      const entityId = 'task-1';

      (mockPrisma.task.findUnique as jest.Mock).mockResolvedValue({
        status: 'COMPLETED',
      });

      // Act
      const progress = await store.getProgress(entityType, entityId);

      // Assert
      expect(progress).toBe(100);
    });

    it('タスクの進捗を正しく取得する（未完了）', async () => {
      // Arrange
      const entityType = 'task';
      const entityId = 'task-1';

      (mockPrisma.task.findUnique as jest.Mock).mockResolvedValue({
        status: 'PENDING',
      });

      // Act
      const progress = await store.getProgress(entityType, entityId);

      // Assert
      expect(progress).toBe(0);
    });

    it('存在しないエンティティの場合はnullを返す', async () => {
      // Arrange
      const entityType = 'goal';
      const entityId = 'non-existent';

      (mockPrisma.goal.findUnique as jest.Mock).mockResolvedValue(null);

      // Act
      const progress = await store.getProgress(entityType, entityId);

      // Assert
      expect(progress).toBeNull();
    });

    it('不正なエンティティタイプの場合はnullを返す', async () => {
      // Arrange
      const entityType = 'invalid';
      const entityId = 'some-id';

      // Act
      const progress = await store.getProgress(entityType, entityId);

      // Assert
      expect(progress).toBeNull();
    });
  });

  describe('getProgressHistory', () => {
    it('進捗履歴を正しく取得する', async () => {
      // Arrange
      const entityType = 'goal';
      const entityId = 'goal-1';
      const days = 30;

      const mockHistory = [
        { timestamp: new Date('2024-01-01'), progress: 10 },
        { timestamp: new Date('2024-01-02'), progress: 20 },
        { timestamp: new Date('2024-01-03'), progress: 30 },
      ];

      (mockPrisma.progressHistory.findMany as jest.Mock).mockResolvedValue(mockHistory);

      // Act
      const history = await store.getProgressHistory(entityType, entityId, days);

      // Assert
      expect(history).toHaveLength(3);
      expect(history[0]).toEqual({ date: new Date('2024-01-01'), progress: 10 });
      expect(history[1]).toEqual({ date: new Date('2024-01-02'), progress: 20 });
      expect(history[2]).toEqual({ date: new Date('2024-01-03'), progress: 30 });

      expect(mockPrisma.progressHistory.findMany).toHaveBeenCalledWith({
        where: {
          entityType,
          entityId,
          timestamp: {
            gte: expect.any(Date),
          },
        },
        orderBy: { timestamp: 'asc' },
        select: { timestamp: true, progress: true },
      });
    });

    it('エラー時は空配列を返す', async () => {
      // Arrange
      const entityType = 'goal';
      const entityId = 'goal-1';
      const days = 30;

      (mockPrisma.progressHistory.findMany as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      // Act
      const history = await store.getProgressHistory(entityType, entityId, days);

      // Assert
      expect(history).toEqual([]);
    });
  });

  describe('getSignificantProgressChanges', () => {
    it('大きな変化点を正しく検出する', async () => {
      // Arrange
      const entityType = 'goal';
      const entityId = 'goal-1';
      const days = 30;
      const threshold = 15;

      // getProgressHistoryをモック
      store.getProgressHistory = jest.fn().mockResolvedValue([
        { date: new Date('2024-01-01'), progress: 10 },
        { date: new Date('2024-01-02'), progress: 15 }, // +5 (閾値未満)
        { date: new Date('2024-01-03'), progress: 35 }, // +20 (閾値以上)
        { date: new Date('2024-01-04'), progress: 30 }, // -5 (閾値未満)
        { date: new Date('2024-01-05'), progress: 50 }, // +20 (閾値以上)
      ]);

      // Act
      const changes = await store.getSignificantProgressChanges(
        entityType,
        entityId,
        days,
        threshold
      );

      // Assert
      expect(changes).toHaveLength(2);
      expect(changes[0]).toEqual({
        date: new Date('2024-01-03'),
        progress: 35,
        change: 20,
      });
      expect(changes[1]).toEqual({
        date: new Date('2024-01-05'),
        progress: 50,
        change: 20,
      });
    });

    it('履歴が1件以下の場合は空配列を返す', async () => {
      // Arrange
      const entityType = 'goal';
      const entityId = 'goal-1';
      const days = 30;

      store.getProgressHistory = jest
        .fn()
        .mockResolvedValue([{ date: new Date('2024-01-01'), progress: 10 }]);

      // Act
      const changes = await store.getSignificantProgressChanges(entityType, entityId, days);

      // Assert
      expect(changes).toEqual([]);
    });
  });

  describe('getProgressTrend', () => {
    it('増加傾向を正しく検出する', async () => {
      // Arrange
      const entityType = 'goal';
      const entityId = 'goal-1';
      const days = 30;

      store.getProgressHistoryEntries = jest.fn().mockResolvedValue([
        { date: new Date('2024-01-01'), progress: 0 },
        { date: new Date('2024-01-02'), progress: 15 },
        { date: new Date('2024-01-03'), progress: 30 },
        { date: new Date('2024-01-04'), progress: 45 },
        { date: new Date('2024-01-05'), progress: 60 },
        { date: new Date('2024-01-06'), progress: 75 },
        { date: new Date('2024-01-07'), progress: 90 },
      ]);

      // Act
      const trend = await store.getProgressTrend(entityType, entityId, days);

      // Assert
      expect(trend.direction).toBe('increasing');
      expect(trend.rate).toBeGreaterThan(0);
      expect(trend.confidence).toBeGreaterThan(0);
    });

    it('減少傾向を正しく検出する', async () => {
      // Arrange
      const entityType = 'goal';
      const entityId = 'goal-1';
      const days = 30;

      store.getProgressHistoryEntries = jest.fn().mockResolvedValue([
        { date: new Date('2024-01-01'), progress: 90 },
        { date: new Date('2024-01-02'), progress: 75 },
        { date: new Date('2024-01-03'), progress: 60 },
        { date: new Date('2024-01-04'), progress: 45 },
        { date: new Date('2024-01-05'), progress: 30 },
        { date: new Date('2024-01-06'), progress: 15 },
        { date: new Date('2024-01-07'), progress: 0 },
      ]);

      // Act
      const trend = await store.getProgressTrend(entityType, entityId, days);

      // Assert
      expect(trend.direction).toBe('decreasing');
      expect(trend.rate).toBeGreaterThan(0);
    });

    it('安定傾向を正しく検出する', async () => {
      // Arrange
      const entityType = 'goal';
      const entityId = 'goal-1';
      const days = 30;

      store.getProgressHistory = jest.fn().mockResolvedValue([
        { date: new Date('2024-01-01'), progress: 50 },
        { date: new Date('2024-01-02'), progress: 50 },
        { date: new Date('2024-01-03'), progress: 50 },
        { date: new Date('2024-01-04'), progress: 50 },
        { date: new Date('2024-01-05'), progress: 50 },
      ]);

      // Act
      const trend = await store.getProgressTrend(entityType, entityId, days);

      // Assert
      expect(trend.direction).toBe('stable');
    });

    it('データが不足している場合は安定として返す', async () => {
      // Arrange
      const entityType = 'goal';
      const entityId = 'goal-1';
      const days = 30;

      store.getProgressHistory = jest
        .fn()
        .mockResolvedValue([{ date: new Date('2024-01-01'), progress: 50 }]);

      // Act
      const trend = await store.getProgressTrend(entityType, entityId, days);

      // Assert
      expect(trend.direction).toBe('stable');
      expect(trend.rate).toBe(0);
      expect(trend.confidence).toBe(0);
    });
  });
});

describe('InMemoryProgressDataStore', () => {
  let store: InMemoryProgressDataStore;

  beforeEach(() => {
    store = new InMemoryProgressDataStore();
  });

  describe('saveProgress', () => {
    it('進捗データを正しく保存する', async () => {
      // Arrange
      const entityType = 'goal';
      const entityId = 'goal-1';
      const progress = 75;

      // Act
      await store.saveProgress(entityType, entityId, progress);

      // Assert
      const savedProgress = await store.getProgress(entityType, entityId);
      expect(savedProgress).toBe(75);
    });

    it('同じエンティティの複数の進捗を履歴として保存する', async () => {
      // Arrange
      const entityType = 'goal';
      const entityId = 'goal-1';

      // Act
      await store.saveProgress(entityType, entityId, 25);
      await store.saveProgress(entityType, entityId, 50);
      await store.saveProgress(entityType, entityId, 75);

      // Assert
      const history = await store.getProgressHistory(entityType, entityId, 30);
      expect(history).toHaveLength(3);
      expect(history[0].progress).toBe(25);
      expect(history[1].progress).toBe(50);
      expect(history[2].progress).toBe(75);
    });
  });

  describe('getProgress', () => {
    it('最新の進捗を返す', async () => {
      // Arrange
      const entityType = 'goal';
      const entityId = 'goal-1';

      await store.saveProgress(entityType, entityId, 25);
      await store.saveProgress(entityType, entityId, 50);
      await store.saveProgress(entityType, entityId, 75);

      // Act
      const progress = await store.getProgress(entityType, entityId);

      // Assert
      expect(progress).toBe(75);
    });

    it('存在しないエンティティの場合はnullを返す', async () => {
      // Act
      const progress = await store.getProgress('goal', 'non-existent');

      // Assert
      expect(progress).toBeNull();
    });
  });

  describe('getProgressHistory', () => {
    it('指定期間内の履歴を返す', async () => {
      // Arrange
      const entityType = 'goal';
      const entityId = 'goal-1';

      // 古いデータ（期間外）
      const oldDate = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000); // 40日前
      store.getAllData().set(`${entityType}:${entityId}`, [{ progress: 10, timestamp: oldDate }]);

      // 新しいデータ（期間内）
      await store.saveProgress(entityType, entityId, 50);
      await store.saveProgress(entityType, entityId, 75);

      // Act
      const history = await store.getProgressHistory(entityType, entityId, 30);

      // Assert
      expect(history).toHaveLength(2); // 古いデータは除外される
      expect(history[0].progress).toBe(50);
      expect(history[1].progress).toBe(75);
    });
  });

  describe('clear', () => {
    it('全データをクリアする', async () => {
      // Arrange
      await store.saveProgress('goal', 'goal-1', 50);
      await store.saveProgress('action', 'action-1', 75);

      // Act
      store.clear();

      // Assert
      const goalProgress = await store.getProgress('goal', 'goal-1');
      const actionProgress = await store.getProgress('action', 'action-1');
      expect(goalProgress).toBeNull();
      expect(actionProgress).toBeNull();
    });
  });
});
