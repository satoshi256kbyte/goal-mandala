/**
 * ProcessingStateServiceのユニットテスト
 */

import { ProcessingStateService } from '../processing-state.service';
import { PrismaClient, ProcessingType, ProcessingStatus } from '../../generated/prisma-client';
import { ProcessingError } from '../../types/async-processing.types';

// Prismaクライアントのモック
jest.mock('../../generated/prisma-client', () => {
  return {
    PrismaClient: jest.fn().mockImplementation(() => ({
      processingState: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
        findMany: jest.fn(),
      },
    })),
    ProcessingType: {
      SUBGOAL_GENERATION: 'SUBGOAL_GENERATION',
      ACTION_GENERATION: 'ACTION_GENERATION',
      TASK_GENERATION: 'TASK_GENERATION',
    },
    ProcessingStatus: {
      PENDING: 'PENDING',
      PROCESSING: 'PROCESSING',
      COMPLETED: 'COMPLETED',
      FAILED: 'FAILED',
      TIMEOUT: 'TIMEOUT',
      CANCELLED: 'CANCELLED',
    },
  };
});

describe('ProcessingStateService', () => {
  let service: ProcessingStateService;
  let mockPrisma: jest.Mocked<PrismaClient>;

  beforeEach(() => {
    mockPrisma = new PrismaClient() as jest.Mocked<PrismaClient>;
    service = new ProcessingStateService(mockPrisma);
    jest.clearAllMocks();
  });

  describe('createProcessingState', () => {
    it('処理状態を作成できる', async () => {
      // Arrange
      const userId = 'user-123';
      const type = ProcessingType.SUBGOAL_GENERATION;
      const targetId = 'goal-123';
      const mockCreatedState = {
        id: 'process-123',
        userId,
        type,
        status: ProcessingStatus.PENDING,
        progress: 0,
        createdAt: new Date(),
      };

      (mockPrisma.processingState.create as jest.Mock).mockResolvedValue(mockCreatedState);

      // Act
      const result = await service.createProcessingState({
        userId,
        type,
        targetId,
      });

      // Assert
      expect(mockPrisma.processingState.create).toHaveBeenCalledWith({
        data: {
          userId,
          type,
          targetId,
          status: ProcessingStatus.PENDING,
          progress: 0,
        },
        select: {
          id: true,
          userId: true,
          type: true,
          status: true,
          progress: true,
          createdAt: true,
        },
      });
      expect(result).toEqual(mockCreatedState);
    });

    it('targetIdなしで処理状態を作成できる', async () => {
      // Arrange
      const userId = 'user-123';
      const type = ProcessingType.SUBGOAL_GENERATION;
      const mockCreatedState = {
        id: 'process-123',
        userId,
        type,
        status: ProcessingStatus.PENDING,
        progress: 0,
        createdAt: new Date(),
      };

      (mockPrisma.processingState.create as jest.Mock).mockResolvedValue(mockCreatedState);

      // Act
      const result = await service.createProcessingState({
        userId,
        type,
      });

      // Assert
      expect(mockPrisma.processingState.create).toHaveBeenCalledWith({
        data: {
          userId,
          type,
          targetId: undefined,
          status: ProcessingStatus.PENDING,
          progress: 0,
        },
        select: {
          id: true,
          userId: true,
          type: true,
          status: true,
          progress: true,
          createdAt: true,
        },
      });
      expect(result).toEqual(mockCreatedState);
    });
  });

  describe('getProcessingState', () => {
    it('処理状態を取得できる', async () => {
      // Arrange
      const processId = 'process-123';
      const userId = 'user-123';
      const mockState = {
        id: processId,
        userId,
        type: ProcessingType.SUBGOAL_GENERATION,
        status: ProcessingStatus.PROCESSING,
        targetId: 'goal-123',
        progress: 50,
        result: null,
        error: null,
        retryCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        completedAt: null,
      };

      (mockPrisma.processingState.findUnique as jest.Mock).mockResolvedValue(mockState);

      // Act
      const result = await service.getProcessingState(processId, userId);

      // Assert
      expect(mockPrisma.processingState.findUnique).toHaveBeenCalledWith({
        where: {
          id: processId,
        },
      });
      expect(result).toEqual(mockState);
    });

    it('処理が存在しない場合はnullを返す', async () => {
      // Arrange
      const processId = 'process-123';
      const userId = 'user-123';

      (mockPrisma.processingState.findUnique as jest.Mock).mockResolvedValue(null);

      // Act
      const result = await service.getProcessingState(processId, userId);

      // Assert
      expect(result).toBeNull();
    });

    it('他のユーザーの処理の場合はnullを返す', async () => {
      // Arrange
      const processId = 'process-123';
      const userId = 'user-123';
      const otherUserId = 'user-456';
      const mockState = {
        id: processId,
        userId: otherUserId,
        type: ProcessingType.SUBGOAL_GENERATION,
        status: ProcessingStatus.PROCESSING,
        targetId: 'goal-123',
        progress: 50,
        result: null,
        error: null,
        retryCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        completedAt: null,
      };

      (mockPrisma.processingState.findUnique as jest.Mock).mockResolvedValue(mockState);

      // Act
      const result = await service.getProcessingState(processId, userId);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('updateProcessingStatus', () => {
    it('処理ステータスを更新できる', async () => {
      // Arrange
      const processId = 'process-123';
      const status = ProcessingStatus.PROCESSING;

      (mockPrisma.processingState.update as jest.Mock).mockResolvedValue({});

      // Act
      await service.updateProcessingStatus(processId, status);

      // Assert
      expect(mockPrisma.processingState.update).toHaveBeenCalledWith({
        where: {
          id: processId,
        },
        data: {
          status,
        },
      });
    });

    it('完了ステータスの場合はcompletedAtを設定する', async () => {
      // Arrange
      const processId = 'process-123';
      const status = ProcessingStatus.COMPLETED;

      (mockPrisma.processingState.update as jest.Mock).mockResolvedValue({});

      // Act
      await service.updateProcessingStatus(processId, status);

      // Assert
      expect(mockPrisma.processingState.update).toHaveBeenCalledWith({
        where: {
          id: processId,
        },
        data: expect.objectContaining({
          status,
          completedAt: expect.any(Date),
        }),
      });
    });

    it('失敗ステータスの場合はcompletedAtを設定する', async () => {
      // Arrange
      const processId = 'process-123';
      const status = ProcessingStatus.FAILED;

      (mockPrisma.processingState.update as jest.Mock).mockResolvedValue({});

      // Act
      await service.updateProcessingStatus(processId, status);

      // Assert
      expect(mockPrisma.processingState.update).toHaveBeenCalledWith({
        where: {
          id: processId,
        },
        data: expect.objectContaining({
          status,
          completedAt: expect.any(Date),
        }),
      });
    });

    it('タイムアウトステータスの場合はcompletedAtを設定する', async () => {
      // Arrange
      const processId = 'process-123';
      const status = ProcessingStatus.TIMEOUT;

      (mockPrisma.processingState.update as jest.Mock).mockResolvedValue({});

      // Act
      await service.updateProcessingStatus(processId, status);

      // Assert
      expect(mockPrisma.processingState.update).toHaveBeenCalledWith({
        where: {
          id: processId,
        },
        data: expect.objectContaining({
          status,
          completedAt: expect.any(Date),
        }),
      });
    });

    it('キャンセルステータスの場合はcompletedAtを設定する', async () => {
      // Arrange
      const processId = 'process-123';
      const status = ProcessingStatus.CANCELLED;

      (mockPrisma.processingState.update as jest.Mock).mockResolvedValue({});

      // Act
      await service.updateProcessingStatus(processId, status);

      // Assert
      expect(mockPrisma.processingState.update).toHaveBeenCalledWith({
        where: {
          id: processId,
        },
        data: expect.objectContaining({
          status,
          completedAt: expect.any(Date),
        }),
      });
    });
  });

  describe('updateProcessingProgress', () => {
    it('処理進捗を更新できる', async () => {
      // Arrange
      const processId = 'process-123';
      const progress = 50;

      (mockPrisma.processingState.update as jest.Mock).mockResolvedValue({});

      // Act
      await service.updateProcessingProgress(processId, progress);

      // Assert
      expect(mockPrisma.processingState.update).toHaveBeenCalledWith({
        where: {
          id: processId,
        },
        data: {
          progress,
        },
      });
    });
  });

  describe('updateProcessingResult', () => {
    it('処理結果を更新できる', async () => {
      // Arrange
      const processId = 'process-123';
      const result = { goalId: 'goal-123', subGoals: [] };

      (mockPrisma.processingState.update as jest.Mock).mockResolvedValue({});

      // Act
      await service.updateProcessingResult(processId, result);

      // Assert
      expect(mockPrisma.processingState.update).toHaveBeenCalledWith({
        where: {
          id: processId,
        },
        data: {
          result,
          status: ProcessingStatus.COMPLETED,
          progress: 100,
          completedAt: expect.any(Date),
        },
      });
    });
  });

  describe('updateProcessingError', () => {
    it('処理エラーを更新できる', async () => {
      // Arrange
      const processId = 'process-123';
      const error: ProcessingError = {
        code: 'AI_ERROR',
        message: 'AI生成に失敗しました',
        retryable: true,
      };

      (mockPrisma.processingState.update as jest.Mock).mockResolvedValue({});

      // Act
      await service.updateProcessingError(processId, error);

      // Assert
      expect(mockPrisma.processingState.update).toHaveBeenCalledWith({
        where: {
          id: processId,
        },
        data: {
          error,
          status: ProcessingStatus.FAILED,
          completedAt: expect.any(Date),
        },
      });
    });
  });

  describe('getProcessingHistory', () => {
    it('処理履歴を取得できる', async () => {
      // Arrange
      const userId = 'user-123';
      const request = {
        page: 1,
        pageSize: 20,
      };
      const mockStates = [
        {
          id: 'process-1',
          status: ProcessingStatus.COMPLETED,
          type: ProcessingType.SUBGOAL_GENERATION,
          progress: 100,
          createdAt: new Date('2025-10-10T10:00:00Z'),
          completedAt: new Date('2025-10-10T10:05:00Z'),
        },
        {
          id: 'process-2',
          status: ProcessingStatus.PROCESSING,
          type: ProcessingType.ACTION_GENERATION,
          progress: 50,
          createdAt: new Date('2025-10-10T09:00:00Z'),
          completedAt: null,
        },
      ];

      (mockPrisma.processingState.count as jest.Mock).mockResolvedValue(2);
      (mockPrisma.processingState.findMany as jest.Mock).mockResolvedValue(mockStates);

      // Act
      const result = await service.getProcessingHistory(userId, request);

      // Assert
      expect(mockPrisma.processingState.count).toHaveBeenCalledWith({
        where: {
          userId,
        },
      });
      expect(mockPrisma.processingState.findMany).toHaveBeenCalledWith({
        where: {
          userId,
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip: 0,
        take: 20,
        select: {
          id: true,
          status: true,
          type: true,
          progress: true,
          createdAt: true,
          completedAt: true,
        },
      });
      expect(result.processes).toHaveLength(2);
      expect(result.pagination).toEqual({
        page: 1,
        pageSize: 20,
        totalCount: 2,
        totalPages: 1,
      });
    });

    it('タイプでフィルタリングできる', async () => {
      // Arrange
      const userId = 'user-123';
      const request = {
        page: 1,
        pageSize: 20,
        type: ProcessingType.SUBGOAL_GENERATION,
      };

      (mockPrisma.processingState.count as jest.Mock).mockResolvedValue(0);
      (mockPrisma.processingState.findMany as jest.Mock).mockResolvedValue([]);

      // Act
      await service.getProcessingHistory(userId, request);

      // Assert
      expect(mockPrisma.processingState.count).toHaveBeenCalledWith({
        where: {
          userId,
          type: ProcessingType.SUBGOAL_GENERATION,
        },
      });
    });

    it('ステータスでフィルタリングできる', async () => {
      // Arrange
      const userId = 'user-123';
      const request = {
        page: 1,
        pageSize: 20,
        status: ProcessingStatus.COMPLETED,
      };

      (mockPrisma.processingState.count as jest.Mock).mockResolvedValue(0);
      (mockPrisma.processingState.findMany as jest.Mock).mockResolvedValue([]);

      // Act
      await service.getProcessingHistory(userId, request);

      // Assert
      expect(mockPrisma.processingState.count).toHaveBeenCalledWith({
        where: {
          userId,
          status: ProcessingStatus.COMPLETED,
        },
      });
    });

    it('日付範囲でフィルタリングできる', async () => {
      // Arrange
      const userId = 'user-123';
      const request = {
        page: 1,
        pageSize: 20,
        startDate: '2025-10-01T00:00:00Z',
        endDate: '2025-10-31T23:59:59Z',
      };

      (mockPrisma.processingState.count as jest.Mock).mockResolvedValue(0);
      (mockPrisma.processingState.findMany as jest.Mock).mockResolvedValue([]);

      // Act
      await service.getProcessingHistory(userId, request);

      // Assert
      expect(mockPrisma.processingState.count).toHaveBeenCalledWith({
        where: {
          userId,
          createdAt: {
            gte: new Date('2025-10-01T00:00:00Z'),
            lte: new Date('2025-10-31T23:59:59Z'),
          },
        },
      });
    });

    it('ページネーションが正しく動作する', async () => {
      // Arrange
      const userId = 'user-123';
      const request = {
        page: 2,
        pageSize: 10,
      };

      (mockPrisma.processingState.count as jest.Mock).mockResolvedValue(25);
      (mockPrisma.processingState.findMany as jest.Mock).mockResolvedValue([]);

      // Act
      const result = await service.getProcessingHistory(userId, request);

      // Assert
      expect(mockPrisma.processingState.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        })
      );
      expect(result.pagination).toEqual({
        page: 2,
        pageSize: 10,
        totalCount: 25,
        totalPages: 3,
      });
    });

    it('デフォルト値が適用される', async () => {
      // Arrange
      const userId = 'user-123';
      const request = {};

      (mockPrisma.processingState.count as jest.Mock).mockResolvedValue(0);
      (mockPrisma.processingState.findMany as jest.Mock).mockResolvedValue([]);

      // Act
      const result = await service.getProcessingHistory(userId, request);

      // Assert
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.pageSize).toBe(20);
    });
  });
});
