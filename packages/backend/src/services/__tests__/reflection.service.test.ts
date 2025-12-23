import { PrismaClient } from '@prisma/client';
import { ReflectionService } from '../reflection.service';
import { NotFoundError } from '../../utils/errors';

// 有効なUUID定数
const VALID_GOAL_ID = '550e8400-e29b-41d4-a716-446655440000';
const VALID_REFLECTION_ID = '660e8400-e29b-41d4-a716-446655440000';
const VALID_REFLECTION_ID_2 = '660e8400-e29b-41d4-a716-446655440001';
const VALID_USER_ID = '770e8400-e29b-41d4-a716-446655440000';
const VALID_USER_ID_2 = '770e8400-e29b-41d4-a716-446655440001';

// Prismaのモック
jest.mock('@prisma/client', () => {
  const mockPrismaClient = {
    reflection: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };
  return {
    PrismaClient: jest.fn(() => mockPrismaClient),
  };
});

describe('ReflectionService', () => {
  let service: ReflectionService;
  let prisma: PrismaClient;

  beforeEach(() => {
    prisma = new PrismaClient();
    service = new ReflectionService(prisma);
    jest.clearAllMocks();
  });

  describe('createReflection', () => {
    it('有効なデータで振り返りを作成できる', async () => {
      const mockReflection = {
        id: VALID_REFLECTION_ID,
        goalId: VALID_GOAL_ID,
        summary: 'テスト総括',
        regretfulActions: null,
        slowProgressActions: null,
        untouchedActions: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.reflection.create as jest.Mock).mockResolvedValue(mockReflection);

      const result = await service.createReflection({
        goalId: VALID_GOAL_ID,
        summary: 'テスト総括',
      });

      expect(result).toEqual(mockReflection);
      expect(prisma.reflection.create).toHaveBeenCalledWith({
        data: {
          goalId: VALID_GOAL_ID,
          summary: 'テスト総括',
          regretfulActions: undefined,
          slowProgressActions: undefined,
          untouchedActions: undefined,
        },
      });
    });

    it('全てのフィールドを含むデータで振り返りを作成できる', async () => {
      const mockReflection = {
        id: VALID_REFLECTION_ID,
        goalId: VALID_GOAL_ID,
        summary: 'テスト総括',
        regretfulActions: '惜しかったアクション',
        slowProgressActions: '進まなかったアクション',
        untouchedActions: '未着手アクション',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.reflection.create as jest.Mock).mockResolvedValue(mockReflection);

      const result = await service.createReflection({
        goalId: VALID_GOAL_ID,
        summary: 'テスト総括',
        regretfulActions: '惜しかったアクション',
        slowProgressActions: '進まなかったアクション',
        untouchedActions: '未着手アクション',
      });

      expect(result).toEqual(mockReflection);
      expect(prisma.reflection.create).toHaveBeenCalledWith({
        data: {
          goalId: VALID_GOAL_ID,
          summary: 'テスト総括',
          regretfulActions: '惜しかったアクション',
          slowProgressActions: '進まなかったアクション',
          untouchedActions: '未着手アクション',
        },
      });
    });

    it('無効なgoalIdでバリデーションエラーが発生する', async () => {
      await expect(
        service.createReflection({
          goalId: 'invalid-uuid',
          summary: 'テスト総括',
        })
      ).rejects.toThrow();
    });

    it('空のsummaryでバリデーションエラーが発生する', async () => {
      await expect(
        service.createReflection({
          goalId: VALID_GOAL_ID,
          summary: '',
        })
      ).rejects.toThrow();
    });

    it('データベースエラーが発生した場合はエラーをスローする', async () => {
      (prisma.reflection.create as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(
        service.createReflection({
          goalId: VALID_GOAL_ID,
          summary: 'テスト総括',
        })
      ).rejects.toThrow('振り返りの作成に失敗しました');
    });
  });

  describe('getReflection', () => {
    it('振り返りIDとユーザーIDで振り返りを取得できる', async () => {
      const mockReflection = {
        id: VALID_REFLECTION_ID,
        goalId: VALID_GOAL_ID,
        summary: 'テスト総括',
        regretfulActions: null,
        slowProgressActions: null,
        untouchedActions: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        goal: {
          id: VALID_GOAL_ID,
          userId: VALID_USER_ID,
          title: 'テスト目標',
          description: 'テスト説明',
          deadline: new Date(),
          background: 'テスト背景',
          constraints: null,
          status: 'active',
          progress: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      (prisma.reflection.findFirst as jest.Mock).mockResolvedValue(mockReflection);

      const result = await service.getReflection(VALID_REFLECTION_ID, VALID_USER_ID);

      expect(result).toEqual(mockReflection);
      expect(prisma.reflection.findFirst).toHaveBeenCalledWith({
        where: {
          id: VALID_REFLECTION_ID,
          goal: {
            userId: VALID_USER_ID,
          },
        },
        include: {
          goal: true,
        },
      });
    });

    it('振り返りが見つからない場合はnullを返す', async () => {
      (prisma.reflection.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await service.getReflection(VALID_REFLECTION_ID, VALID_USER_ID);

      expect(result).toBeNull();
    });

    it('他のユーザーの振り返りは取得できない', async () => {
      (prisma.reflection.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await service.getReflection(VALID_REFLECTION_ID, VALID_USER_ID_2);

      expect(result).toBeNull();
      expect(prisma.reflection.findFirst).toHaveBeenCalledWith({
        where: {
          id: VALID_REFLECTION_ID,
          goal: {
            userId: VALID_USER_ID_2,
          },
        },
        include: {
          goal: true,
        },
      });
    });

    it('データベースエラーが発生した場合はエラーをスローする', async () => {
      (prisma.reflection.findFirst as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(service.getReflection(VALID_REFLECTION_ID, VALID_USER_ID)).rejects.toThrow(
        '振り返りの取得に失敗しました'
      );
    });
  });

  describe('getReflectionsByGoal', () => {
    it('目標IDとユーザーIDで振り返り一覧を取得できる', async () => {
      const mockReflections = [
        {
          id: VALID_REFLECTION_ID_2,
          goalId: VALID_GOAL_ID,
          summary: 'テスト総括2',
          regretfulActions: null,
          slowProgressActions: null,
          untouchedActions: null,
          createdAt: new Date('2025-12-11T10:00:00Z'),
          updatedAt: new Date('2025-12-11T10:00:00Z'),
        },
        {
          id: VALID_REFLECTION_ID,
          goalId: VALID_GOAL_ID,
          summary: 'テスト総括1',
          regretfulActions: null,
          slowProgressActions: null,
          untouchedActions: null,
          createdAt: new Date('2025-12-10T10:00:00Z'),
          updatedAt: new Date('2025-12-10T10:00:00Z'),
        },
      ];

      (prisma.reflection.findMany as jest.Mock).mockResolvedValue(mockReflections);

      const result = await service.getReflectionsByGoal(VALID_GOAL_ID, VALID_USER_ID);

      expect(result).toEqual(mockReflections);
      expect(prisma.reflection.findMany).toHaveBeenCalledWith({
        where: {
          goalId: VALID_GOAL_ID,
          goal: {
            userId: VALID_USER_ID,
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    });

    it('振り返りが存在しない場合は空配列を返す', async () => {
      (prisma.reflection.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getReflectionsByGoal(VALID_GOAL_ID, VALID_USER_ID);

      expect(result).toEqual([]);
    });

    it('他のユーザーの振り返りは取得できない', async () => {
      (prisma.reflection.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getReflectionsByGoal(VALID_GOAL_ID, VALID_USER_ID_2);

      expect(result).toEqual([]);
      expect(prisma.reflection.findMany).toHaveBeenCalledWith({
        where: {
          goalId: VALID_GOAL_ID,
          goal: {
            userId: VALID_USER_ID_2,
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    });

    it('データベースエラーが発生した場合はエラーをスローする', async () => {
      (prisma.reflection.findMany as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(service.getReflectionsByGoal(VALID_GOAL_ID, VALID_USER_ID)).rejects.toThrow(
        '振り返り一覧の取得に失敗しました'
      );
    });
  });

  describe('updateReflection', () => {
    it('有効なデータで振り返りを更新できる', async () => {
      const mockExistingReflection = {
        id: VALID_REFLECTION_ID,
        goalId: VALID_GOAL_ID,
        summary: '古い総括',
        regretfulActions: null,
        slowProgressActions: null,
        untouchedActions: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        goal: {
          id: VALID_GOAL_ID,
          userId: VALID_USER_ID,
          title: 'テスト目標',
          description: 'テスト説明',
          deadline: new Date(),
          background: 'テスト背景',
          constraints: null,
          status: 'active',
          progress: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      const mockUpdatedReflection = {
        ...mockExistingReflection,
        summary: '新しい総括',
        updatedAt: new Date(),
      };

      (prisma.reflection.findFirst as jest.Mock).mockResolvedValue(mockExistingReflection);
      (prisma.reflection.update as jest.Mock).mockResolvedValue(mockUpdatedReflection);

      const result = await service.updateReflection(VALID_REFLECTION_ID, VALID_USER_ID, {
        summary: '新しい総括',
      });

      expect(result).toEqual(mockUpdatedReflection);
      expect(prisma.reflection.update).toHaveBeenCalledWith({
        where: { id: VALID_REFLECTION_ID },
        data: {
          summary: '新しい総括',
          regretfulActions: undefined,
          slowProgressActions: undefined,
          untouchedActions: undefined,
        },
      });
    });

    it('振り返りが見つからない場合はNotFoundErrorをスローする', async () => {
      (prisma.reflection.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.updateReflection(VALID_REFLECTION_ID, VALID_USER_ID, {
          summary: '新しい総括',
        })
      ).rejects.toThrow(NotFoundError);
    });

    it('他のユーザーの振り返りは更新できない', async () => {
      (prisma.reflection.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.updateReflection(VALID_REFLECTION_ID, VALID_USER_ID_2, {
          summary: '新しい総括',
        })
      ).rejects.toThrow(NotFoundError);
    });

    it('無効なデータでバリデーションエラーが発生する', async () => {
      await expect(
        service.updateReflection(VALID_REFLECTION_ID, VALID_USER_ID, {
          summary: '',
        })
      ).rejects.toThrow();
    });

    it('データベースエラーが発生した場合はエラーをスローする', async () => {
      const mockExistingReflection = {
        id: VALID_REFLECTION_ID,
        goalId: VALID_GOAL_ID,
        summary: '古い総括',
        regretfulActions: null,
        slowProgressActions: null,
        untouchedActions: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        goal: {
          id: VALID_GOAL_ID,
          userId: VALID_USER_ID,
          title: 'テスト目標',
          description: 'テスト説明',
          deadline: new Date(),
          background: 'テスト背景',
          constraints: null,
          status: 'active',
          progress: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      (prisma.reflection.findFirst as jest.Mock).mockResolvedValue(mockExistingReflection);
      (prisma.reflection.update as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(
        service.updateReflection(VALID_REFLECTION_ID, VALID_USER_ID, {
          summary: '新しい総括',
        })
      ).rejects.toThrow('振り返りの更新に失敗しました');
    });
  });

  describe('deleteReflection', () => {
    it('振り返りを削除できる', async () => {
      const mockExistingReflection = {
        id: VALID_REFLECTION_ID,
        goalId: VALID_GOAL_ID,
        summary: 'テスト総括',
        regretfulActions: null,
        slowProgressActions: null,
        untouchedActions: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        goal: {
          id: VALID_GOAL_ID,
          userId: VALID_USER_ID,
          title: 'テスト目標',
          description: 'テスト説明',
          deadline: new Date(),
          background: 'テスト背景',
          constraints: null,
          status: 'active',
          progress: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      (prisma.reflection.findFirst as jest.Mock).mockResolvedValue(mockExistingReflection);
      (prisma.reflection.delete as jest.Mock).mockResolvedValue(mockExistingReflection);

      await service.deleteReflection(VALID_REFLECTION_ID, VALID_USER_ID);

      expect(prisma.reflection.delete).toHaveBeenCalledWith({
        where: { id: VALID_REFLECTION_ID },
      });
    });

    it('振り返りが見つからない場合はNotFoundErrorをスローする', async () => {
      (prisma.reflection.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.deleteReflection(VALID_REFLECTION_ID, VALID_USER_ID)).rejects.toThrow(
        NotFoundError
      );
    });

    it('他のユーザーの振り返りは削除できない', async () => {
      (prisma.reflection.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.deleteReflection(VALID_REFLECTION_ID, VALID_USER_ID_2)).rejects.toThrow(
        NotFoundError
      );
    });

    it('データベースエラーが発生した場合はエラーをスローする', async () => {
      const mockExistingReflection = {
        id: VALID_REFLECTION_ID,
        goalId: VALID_GOAL_ID,
        summary: 'テスト総括',
        regretfulActions: null,
        slowProgressActions: null,
        untouchedActions: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        goal: {
          id: VALID_GOAL_ID,
          userId: VALID_USER_ID,
          title: 'テスト目標',
          description: 'テスト説明',
          deadline: new Date(),
          background: 'テスト背景',
          constraints: null,
          status: 'active',
          progress: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      (prisma.reflection.findFirst as jest.Mock).mockResolvedValue(mockExistingReflection);
      (prisma.reflection.delete as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(service.deleteReflection(VALID_REFLECTION_ID, VALID_USER_ID)).rejects.toThrow(
        '振り返りの削除に失敗しました'
      );
    });
  });
});
