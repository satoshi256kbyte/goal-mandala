import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { recordChangeHistory, calculateChanges } from './change-history';

// モックを最初に設定
const mockCreate = jest.fn();
const mockFindUnique = jest.fn();

// PrismaClientをモック
jest.mock('../generated/prisma-client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    changeHistory: {
      create: mockCreate,
    },
    user: {
      findUnique: mockFindUnique,
    },
  })),
}));

// ロガーをモック
jest.mock('../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

// 動的インポートでPrismaClientを読み込み
let PrismaClient: any;

describe('Change History Service', () => {
  let prisma: any;

  beforeEach(async () => {
    // モジュールをインポート
    const prismaModule = await import('../generated/prisma-client');
    PrismaClient = prismaModule.PrismaClient;
    prisma = new PrismaClient();

    // モックをクリア
    jest.clearAllMocks();
  });

  describe('calculateChanges', () => {
    it('should calculate changes between old and new data', () => {
      const oldData = {
        title: '古いタイトル',
        description: '古い説明',
        background: '古い背景',
        constraints: '古い制約',
      };

      const newData = {
        title: '新しいタイトル',
        description: '古い説明',
        background: '新しい背景',
        constraints: '古い制約',
      };

      const changes = calculateChanges(oldData, newData);

      expect(changes).toHaveLength(2);
      expect(changes).toContainEqual({
        field: 'title',
        oldValue: '古いタイトル',
        newValue: '新しいタイトル',
      });
      expect(changes).toContainEqual({
        field: 'background',
        oldValue: '古い背景',
        newValue: '新しい背景',
      });
    });

    it('should handle null values correctly', () => {
      const oldData = {
        title: 'タイトル',
        description: '説明',
        background: '背景',
        constraints: null,
      };

      const newData = {
        title: 'タイトル',
        description: '説明',
        background: '背景',
        constraints: '新しい制約',
      };

      const changes = calculateChanges(oldData, newData);

      expect(changes).toHaveLength(1);
      expect(changes).toContainEqual({
        field: 'constraints',
        oldValue: null,
        newValue: '新しい制約',
      });
    });

    it('should return empty array when no changes', () => {
      const data = {
        title: 'タイトル',
        description: '説明',
        background: '背景',
        constraints: '制約',
      };

      const changes = calculateChanges(data, data);

      expect(changes).toHaveLength(0);
    });

    it('should handle Date objects correctly', () => {
      const oldDate = new Date('2024-01-01');
      const newDate = new Date('2024-12-31');

      const oldData = {
        title: 'タイトル',
        deadline: oldDate,
      };

      const newData = {
        title: 'タイトル',
        deadline: newDate,
      };

      const changes = calculateChanges(oldData, newData);

      expect(changes).toHaveLength(1);
      expect(changes[0].field).toBe('deadline');
      expect(changes[0].oldValue).toBe(oldDate.toISOString());
      expect(changes[0].newValue).toBe(newDate.toISOString());
    });

    it('should ignore specified fields', () => {
      const oldData = {
        title: '古いタイトル',
        description: '古い説明',
        updatedAt: new Date('2024-01-01'),
        createdAt: new Date('2024-01-01'),
      };

      const newData = {
        title: '新しいタイトル',
        description: '新しい説明',
        updatedAt: new Date('2024-01-02'),
        createdAt: new Date('2024-01-01'),
      };

      const changes = calculateChanges(oldData, newData, ['updatedAt', 'createdAt']);

      expect(changes).toHaveLength(2);
      expect(changes.find(c => c.field === 'updatedAt')).toBeUndefined();
      expect(changes.find(c => c.field === 'createdAt')).toBeUndefined();
    });
  });

  describe('recordChangeHistory', () => {
    it('should record change history for goal', async () => {
      const mockUser = {
        id: 'user-123',
        name: '山田太郎',
        email: 'test@example.com',
      };

      const changes = [
        {
          field: 'title',
          oldValue: '古いタイトル',
          newValue: '新しいタイトル',
        },
      ];

      mockFindUnique.mockResolvedValue(mockUser as any);
      mockCreate.mockResolvedValue({
        id: 'history-123',
        entityType: 'goal',
        entityId: 'goal-123',
        userId: 'user-123',
        changedAt: new Date(),
        changes: changes as any,
        createdAt: new Date(),
      });

      const result = await recordChangeHistory(prisma, 'goal', 'goal-123', 'user-123', changes);

      expect(result).toBeDefined();
      expect(result.entityType).toBe('goal');
      expect(result.entityId).toBe('goal-123');
      expect(result.userId).toBe('user-123');
      expect(mockCreate).toHaveBeenCalledWith({
        data: {
          entityType: 'goal',
          entityId: 'goal-123',
          userId: 'user-123',
          changes: changes,
        },
      });
    });

    it('should record change history for subgoal', async () => {
      const mockUser = {
        id: 'user-456',
        name: '佐藤花子',
        email: 'test2@example.com',
      };

      const changes = [
        {
          field: 'description',
          oldValue: '古い説明',
          newValue: '新しい説明',
        },
      ];

      mockFindUnique.mockResolvedValue(mockUser as any);
      mockCreate.mockResolvedValue({
        id: 'history-456',
        entityType: 'subgoal',
        entityId: 'subgoal-456',
        userId: 'user-456',
        changedAt: new Date(),
        changes: changes as any,
        createdAt: new Date(),
      });

      const result = await recordChangeHistory(
        prisma,
        'subgoal',
        'subgoal-456',
        'user-456',
        changes
      );

      expect(result).toBeDefined();
      expect(result.entityType).toBe('subgoal');
      expect(result.entityId).toBe('subgoal-456');
    });

    it('should record change history for action', async () => {
      const mockUser = {
        id: 'user-789',
        name: '鈴木一郎',
        email: 'test3@example.com',
      };

      const changes = [
        {
          field: 'background',
          oldValue: '古い背景',
          newValue: '新しい背景',
        },
      ];

      mockFindUnique.mockResolvedValue(mockUser as any);
      mockCreate.mockResolvedValue({
        id: 'history-789',
        entityType: 'action',
        entityId: 'action-789',
        userId: 'user-789',
        changedAt: new Date(),
        changes: changes as any,
        createdAt: new Date(),
      });

      const result = await recordChangeHistory(prisma, 'action', 'action-789', 'user-789', changes);

      expect(result).toBeDefined();
      expect(result.entityType).toBe('action');
      expect(result.entityId).toBe('action-789');
    });

    it('should not record history when no changes', async () => {
      const result = await recordChangeHistory(prisma, 'goal', 'goal-123', 'user-123', []);

      expect(result).toBeNull();
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      const changes = [
        {
          field: 'title',
          oldValue: '古いタイトル',
          newValue: '新しいタイトル',
        },
      ];

      mockCreate.mockRejectedValue(new Error('Database error'));

      await expect(
        recordChangeHistory(prisma, 'goal', 'goal-123', 'user-123', changes)
      ).rejects.toThrow('Database error');
    });
  });
});
