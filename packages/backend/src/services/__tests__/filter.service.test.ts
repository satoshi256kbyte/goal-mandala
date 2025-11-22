/**
 * FilterServiceのユニットテスト
 * Requirements: 4.1-4.5, 5.1-5.5, 6.1-6.5, 7.1-7.5, 8.1-8.5
 */

import { FilterService } from '../filter.service';
import { TaskStatus } from '../../generated/prisma-client';

// Prismaクライアントのモック
const mockPrisma = {
  savedView: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    delete: jest.fn(),
  },
};

// FilterServiceのインスタンス作成
const filterService = new FilterService(mockPrisma);

// テスト用のタスクデータ
const mockTasks = [
  {
    id: 'task-1',
    actionId: 'action-1',
    title: 'プログラミング学習',
    description: 'TypeScriptの基礎を学ぶ',
    type: 'EXECUTION',
    status: TaskStatus.NOT_STARTED,
    estimatedMinutes: 60,
    deadline: new Date('2025-11-21'), // 明日
    completedAt: null,
    createdAt: new Date('2025-11-20'),
    updatedAt: new Date('2025-11-20'),
  },
  {
    id: 'task-2',
    actionId: 'action-2',
    title: 'ランニング',
    description: '朝のランニング30分',
    type: 'HABIT',
    status: TaskStatus.COMPLETED,
    estimatedMinutes: 30,
    deadline: new Date('2025-11-20'), // 今日
    completedAt: new Date('2025-11-20T08:00:00'),
    createdAt: new Date('2025-11-19'),
    updatedAt: new Date('2025-11-20'),
  },
  {
    id: 'task-3',
    actionId: 'action-1',
    title: 'レポート作成',
    description: '月次レポートの作成',
    type: 'EXECUTION',
    status: TaskStatus.IN_PROGRESS,
    estimatedMinutes: 120,
    deadline: new Date('2025-11-19'), // 昨日（期限切れ）
    completedAt: null,
    createdAt: new Date('2025-11-18'),
    updatedAt: new Date('2025-11-20'),
  },
] as any[];

describe('FilterService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // 現在時刻を2025-11-20T10:00:00に固定
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-11-20T10:00:00'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('applyFilters', () => {
    it('should return all tasks when no filters applied', () => {
      const result = filterService.applyFilters(mockTasks, {});
      expect(result).toHaveLength(3);
      expect(result).toEqual(mockTasks);
    });

    it('should filter tasks by status', () => {
      const filters = { statuses: [TaskStatus.COMPLETED] };
      const result = filterService.applyFilters(mockTasks, filters);

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe(TaskStatus.COMPLETED);
    });

    it('should filter tasks by multiple statuses', () => {
      const filters = { statuses: [TaskStatus.COMPLETED, TaskStatus.IN_PROGRESS] };
      const result = filterService.applyFilters(mockTasks, filters);

      expect(result).toHaveLength(2);
      expect(
        result.every(
          task => task.status === TaskStatus.COMPLETED || task.status === TaskStatus.IN_PROGRESS
        )
      ).toBe(true);
    });

    it('should filter tasks by today deadline', () => {
      const filters = { deadlineRange: 'today' as const };
      const result = filterService.applyFilters(mockTasks, filters);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('task-2');
    });

    it('should filter overdue tasks', () => {
      const filters = { deadlineRange: 'overdue' as const };
      const result = filterService.applyFilters(mockTasks, filters);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('task-3');
      expect(result[0].status).not.toBe(TaskStatus.COMPLETED);
    });

    it('should filter tasks by action IDs', () => {
      const filters = { actionIds: ['action-1'] };
      const result = filterService.applyFilters(mockTasks, filters);

      expect(result).toHaveLength(2);
      expect(result.every(task => task.actionId === 'action-1')).toBe(true);
    });

    it('should apply multiple filters', () => {
      const filters = {
        statuses: [TaskStatus.NOT_STARTED, TaskStatus.IN_PROGRESS],
        actionIds: ['action-1'],
      };
      const result = filterService.applyFilters(mockTasks, filters);

      expect(result).toHaveLength(2);
      expect(
        result.every(
          task =>
            task.actionId === 'action-1' &&
            (task.status === TaskStatus.NOT_STARTED || task.status === TaskStatus.IN_PROGRESS)
        )
      ).toBe(true);
    });
  });

  describe('searchTasks', () => {
    it('should return all tasks when query is empty', () => {
      const result = filterService.searchTasks(mockTasks, '');
      expect(result).toHaveLength(3);
      expect(result).toEqual(mockTasks);
    });

    it('should search tasks by title', () => {
      const result = filterService.searchTasks(mockTasks, 'プログラミング');
      expect(result).toHaveLength(1);
      expect(result[0].title).toContain('プログラミング');
    });

    it('should search tasks by description', () => {
      const result = filterService.searchTasks(mockTasks, 'TypeScript');
      expect(result).toHaveLength(1);
      expect(result[0].description).toContain('TypeScript');
    });

    it('should search with multiple keywords (AND condition)', () => {
      const result = filterService.searchTasks(mockTasks, 'プログラミング TypeScript');
      expect(result).toHaveLength(1);
      expect(result[0].title).toContain('プログラミング');
      expect(result[0].description).toContain('TypeScript');
    });

    it('should return empty array when no matches found', () => {
      const result = filterService.searchTasks(mockTasks, '存在しないキーワード');
      expect(result).toHaveLength(0);
    });

    it('should be case insensitive', () => {
      const result = filterService.searchTasks(mockTasks, 'TYPESCRIPT');
      expect(result).toHaveLength(1);
      expect(result[0].description).toContain('TypeScript');
    });
  });

  describe('saveView', () => {
    const mockUserId = 'user-1';
    const mockViewName = 'テストビュー';
    const mockFilters = { statuses: [TaskStatus.COMPLETED] };
    const mockQuery = 'プログラミング';

    const mockSavedView = {
      id: 'view-1',
      userId: mockUserId,
      name: mockViewName,
      filters: JSON.stringify(mockFilters),
      searchQuery: mockQuery,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should save view with filters and query', async () => {
      mockPrisma.savedView.create.mockResolvedValue(mockSavedView);

      const result = await filterService.saveView(mockUserId, mockViewName, mockFilters, mockQuery);

      expect(mockPrisma.savedView.create).toHaveBeenCalledWith({
        data: {
          userId: mockUserId,
          name: mockViewName,
          filters: JSON.stringify(mockFilters),
          searchQuery: mockQuery,
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
        },
      });

      expect(result.filters).toEqual(mockFilters);
      expect(result.name).toBe(mockViewName);
    });

    it('should save view without query', async () => {
      const viewWithoutQuery = { ...mockSavedView, searchQuery: null };
      mockPrisma.savedView.create.mockResolvedValue(viewWithoutQuery);

      await filterService.saveView(mockUserId, mockViewName, mockFilters);

      expect(mockPrisma.savedView.create).toHaveBeenCalledWith({
        data: {
          userId: mockUserId,
          name: mockViewName,
          filters: JSON.stringify(mockFilters),
          searchQuery: null,
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
        },
      });
    });
  });

  describe('getSavedViews', () => {
    const mockUserId = 'user-1';
    const mockSavedViews = [
      {
        id: 'view-1',
        userId: mockUserId,
        name: 'ビュー1',
        filters: JSON.stringify({ statuses: [TaskStatus.COMPLETED] }),
        searchQuery: 'プログラミング',
        createdAt: new Date('2025-11-20'),
        updatedAt: new Date('2025-11-20'),
      },
      {
        id: 'view-2',
        userId: mockUserId,
        name: 'ビュー2',
        filters: JSON.stringify({ deadlineRange: 'today' }),
        searchQuery: null,
        createdAt: new Date('2025-11-19'),
        updatedAt: new Date('2025-11-19'),
      },
    ];

    it('should return saved views for user', async () => {
      mockPrisma.savedView.findMany.mockResolvedValue(mockSavedViews);

      const result = await filterService.getSavedViews(mockUserId);

      expect(mockPrisma.savedView.findMany).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        orderBy: { createdAt: 'desc' },
      });

      expect(result).toHaveLength(2);
      expect(result[0].filters).toEqual({ statuses: [TaskStatus.COMPLETED] });
      expect(result[1].filters).toEqual({ deadlineRange: 'today' });
    });
  });

  describe('deleteSavedView', () => {
    const mockViewId = 'view-1';
    const mockUserId = 'user-1';
    const mockExistingView = {
      id: mockViewId,
      userId: mockUserId,
      name: 'テストビュー',
    };

    it('should delete saved view', async () => {
      mockPrisma.savedView.findUnique.mockResolvedValue(mockExistingView);
      mockPrisma.savedView.delete.mockResolvedValue(mockExistingView);

      await filterService.deleteSavedView(mockViewId, mockUserId);

      expect(mockPrisma.savedView.delete).toHaveBeenCalledWith({
        where: { id: mockViewId },
      });
    });

    it('should throw error if view not found', async () => {
      mockPrisma.savedView.findUnique.mockResolvedValue(null);

      await expect(filterService.deleteSavedView(mockViewId, mockUserId)).rejects.toThrow(
        'Saved view not found'
      );
    });

    it('should throw error if user does not own view', async () => {
      const unauthorizedView = { ...mockExistingView, userId: 'other-user' };
      mockPrisma.savedView.findUnique.mockResolvedValue(unauthorizedView);

      await expect(filterService.deleteSavedView(mockViewId, mockUserId)).rejects.toThrow(
        'Unauthorized: Cannot delete saved view owned by other user'
      );
    });
  });

  describe('highlightMatches', () => {
    it('should highlight single keyword', () => {
      const text = 'プログラミング学習を始める';
      const query = 'プログラミング';
      const result = filterService.highlightMatches(text, query);

      expect(result).toBe('<mark>プログラミング</mark>学習を始める');
    });

    it('should highlight multiple keywords', () => {
      const text = 'TypeScriptでプログラミング学習';
      const query = 'TypeScript プログラミング';
      const result = filterService.highlightMatches(text, query);

      expect(result).toContain('<mark>TypeScript</mark>');
      expect(result).toContain('<mark>プログラミング</mark>');
    });

    it('should be case insensitive', () => {
      const text = 'TypeScript学習';
      const query = 'typescript';
      const result = filterService.highlightMatches(text, query);

      expect(result).toBe('<mark>TypeScript</mark>学習');
    });

    it('should return original text when query is empty', () => {
      const text = 'プログラミング学習';
      const result = filterService.highlightMatches(text, '');

      expect(result).toBe(text);
    });

    it('should handle overlapping matches correctly', () => {
      const text = 'プログラミングプログラム';
      const query = 'プログラミング プログラム';
      const result = filterService.highlightMatches(text, query);

      // 長いキーワードが優先されるべき
      expect(result).toBe('<mark>プログラミング</mark><mark>プログラム</mark>');
    });
  });
});
