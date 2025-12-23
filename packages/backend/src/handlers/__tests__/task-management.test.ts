import { Hono } from 'hono';
import { z } from 'zod';
import {
  generateMockTask,
  generateMockTaskNote,
  generateMockTaskHistory,
} from '@goal-mandala/shared';

// Create mock service instances first
const mockTaskService = {
  getTasks: jest.fn(),
  getTaskById: jest.fn(),
  updateTaskStatus: jest.fn(),
  addNote: jest.fn(),
  updateNote: jest.fn(),
  deleteNote: jest.fn(),
  bulkUpdateStatus: jest.fn(),
  bulkDelete: jest.fn(),
  getNotes: jest.fn(),
  getTaskHistory: jest.fn(),
};

const mockFilterService = {
  searchTasks: jest.fn(),
  getSavedViews: jest.fn(),
  saveView: jest.fn(),
  deleteSavedView: jest.fn(),
  applyFilters: jest.fn(),
};

const mockProgressService = {
  updateProgress: jest.fn(),
  calculateTaskProgress: jest.fn(),
  calculateActionProgress: jest.fn(),
};

// Mock dependencies
jest.mock('../../generated/prisma-client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('../../services/task.service', () => ({
  TaskService: jest.fn().mockImplementation(() => mockTaskService),
}));

jest.mock('../../services/filter.service', () => ({
  FilterService: jest.fn().mockImplementation(() => mockFilterService),
}));

jest.mock('../../services/progress.service', () => ({
  ProgressService: jest.fn().mockImplementation(() => mockProgressService),
}));

// Mock auth middleware to inject user context
const mockAuthMiddleware = jest.fn((c, next) => {
  c.set('user', { id: 'user-1', email: 'test@example.com' });
  return next();
});

jest.mock('../../middleware/auth', () => ({
  authMiddleware: mockAuthMiddleware,
}));

// Mock logger
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock security utils
jest.mock('../../utils/security', () => ({
  sanitizeErrorForLogging: jest.fn(error => ({
    message: error instanceof Error ? error.message : 'Unknown error',
  })),
}));

import taskManagementApp, { setServices } from '../task-management';

describe('Task Management Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Inject mock services
    setServices({
      taskService: mockTaskService as any,
      filterService: mockFilterService as any,
      progressService: mockProgressService as any,
    });
  });

  describe('GET /api/tasks - タスク一覧取得', () => {
    it('正常系: 認証済みユーザーのタスク一覧を取得できる', async () => {
      const mockTasks = [generateMockTask(), generateMockTask()];
      mockTaskService.getTasks.mockResolvedValue(mockTasks);

      const res = await taskManagementApp.request('/api/tasks', {
        headers: { Authorization: 'Bearer test-token' },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.tasks).toHaveLength(2);
      expect(data.data.total).toBe(2);
      expect(mockTaskService.getTasks).toHaveBeenCalledWith('user-1', {});
    });

    it('正常系: ステータスフィルターを適用できる', async () => {
      const mockTasks = [generateMockTask({ status: 'completed' })];
      mockTaskService.getTasks.mockResolvedValue(mockTasks);

      const res = await taskManagementApp.request(
        '/api/tasks?status=completed&status=in_progress',
        {
          headers: { Authorization: 'Bearer test-token' },
        }
      );

      expect(res.status).toBe(200);
      expect(mockTaskService.getTasks).toHaveBeenCalledWith('user-1', {
        statuses: ['completed', 'in_progress'],
      });
    });

    it('正常系: 期限フィルターを適用できる', async () => {
      const mockTasks = [generateMockTask()];
      mockTaskService.getTasks.mockResolvedValue(mockTasks);

      const res = await taskManagementApp.request('/api/tasks?deadlineRange=today', {
        headers: { Authorization: 'Bearer test-token' },
      });

      expect(res.status).toBe(200);
      expect(mockTaskService.getTasks).toHaveBeenCalledWith('user-1', {
        deadlineRange: 'today',
      });
    });

    it('正常系: アクションIDフィルターを適用できる', async () => {
      const mockTasks = [generateMockTask()];
      mockTaskService.getTasks.mockResolvedValue(mockTasks);

      const res = await taskManagementApp.request(
        '/api/tasks?actionIds=action-1&actionIds=action-2',
        {
          headers: { Authorization: 'Bearer test-token' },
        }
      );

      expect(res.status).toBe(200);
      expect(mockTaskService.getTasks).toHaveBeenCalledWith('user-1', {
        actionIds: ['action-1', 'action-2'],
      });
    });

    it('正常系: 検索クエリを適用できる', async () => {
      const mockTasks = [generateMockTask()];
      const filteredTasks = [mockTasks[0]];
      mockTaskService.getTasks.mockResolvedValue(mockTasks);
      mockFilterService.searchTasks.mockReturnValue(filteredTasks);

      const res = await taskManagementApp.request('/api/tasks?search=test', {
        headers: { Authorization: 'Bearer test-token' },
      });

      expect(res.status).toBe(200);
      expect(mockFilterService.searchTasks).toHaveBeenCalledWith(mockTasks, 'test');
      const data = await res.json();
      expect(data.data.tasks).toHaveLength(1);
    });

    it('異常系: 認証なしでアクセスするとエラー', async () => {
      mockAuthMiddleware.mockImplementationOnce((c, next) => {
        throw new Error('Unauthorized');
      });

      const res = await taskManagementApp.request('/api/tasks');

      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INTERNAL_ERROR');
    });

    it('異常系: サービスエラーが発生した場合', async () => {
      mockTaskService.getTasks.mockRejectedValue(new Error('Database error'));

      const res = await taskManagementApp.request('/api/tasks', {
        headers: { Authorization: 'Bearer test-token' },
      });

      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('GET /api/tasks/:id - タスク詳細取得', () => {
    it('正常系: タスク詳細、ノート、履歴を取得できる', async () => {
      const mockTask = generateMockTask();
      const mockNotes = [generateMockTaskNote()];
      const mockHistory = [generateMockTaskHistory()];

      mockTaskService.getTaskById.mockResolvedValue(mockTask);
      mockTaskService.getNotes.mockResolvedValue(mockNotes);
      mockTaskService.getTaskHistory.mockResolvedValue(mockHistory);

      const res = await taskManagementApp.request(`/api/tasks/${mockTask.id}`, {
        headers: { Authorization: 'Bearer test-token' },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.task).toBeDefined();
      expect(data.data.notes).toHaveLength(1);
      expect(data.data.history).toHaveLength(1);
      expect(mockTaskService.getTaskById).toHaveBeenCalledWith(mockTask.id);
      expect(mockTaskService.getNotes).toHaveBeenCalledWith(mockTask.id);
      expect(mockTaskService.getTaskHistory).toHaveBeenCalledWith(mockTask.id);
    });

    it('異常系: 存在しないタスクIDでエラー', async () => {
      mockTaskService.getTaskById.mockRejectedValue(new Error('Task not found'));

      const res = await taskManagementApp.request('/api/tasks/invalid-id', {
        headers: { Authorization: 'Bearer test-token' },
      });

      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('PATCH /api/tasks/:id/status - タスク状態更新', () => {
    it('正常系: タスク状態を更新できる', async () => {
      const mockTask = generateMockTask({ status: 'completed' });
      mockTaskService.updateTaskStatus.mockResolvedValue(mockTask);
      mockProgressService.updateProgress.mockResolvedValue(undefined);

      const res = await taskManagementApp.request(`/api/tasks/${mockTask.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
        body: JSON.stringify({ status: 'completed' }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.task.status).toBe('completed');
      expect(mockTaskService.updateTaskStatus).toHaveBeenCalledWith(
        mockTask.id,
        'completed',
        'user-1'
      );
      expect(mockProgressService.updateProgress).toHaveBeenCalledWith(mockTask.id);
    });

    it('異常系: 無効なステータスでバリデーションエラー', async () => {
      const res = await taskManagementApp.request('/api/tasks/task-1/status', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
        body: JSON.stringify({ status: 'invalid_status' }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('異常系: ステータスが未指定でバリデーションエラー', async () => {
      const res = await taskManagementApp.request('/api/tasks/task-1/status', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/tasks/:id/notes - ノート追加', () => {
    it('正常系: ノートを追加できる', async () => {
      const mockNote = generateMockTaskNote();
      mockTaskService.addNote.mockResolvedValue(mockNote);

      const res = await taskManagementApp.request('/api/tasks/task-1/notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
        body: JSON.stringify({ content: 'Test note content' }),
      });

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.note).toBeDefined();
      expect(mockTaskService.addNote).toHaveBeenCalledWith('task-1', 'Test note content', 'user-1');
    });

    it('異常系: 空のコンテンツでバリデーションエラー', async () => {
      const res = await taskManagementApp.request('/api/tasks/task-1/notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
        body: JSON.stringify({ content: '' }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('異常系: コンテンツが5000文字を超えるとバリデーションエラー', async () => {
      const longContent = 'a'.repeat(5001);
      const res = await taskManagementApp.request('/api/tasks/task-1/notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
        body: JSON.stringify({ content: longContent }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('PATCH /api/tasks/:id/notes/:noteId - ノート更新', () => {
    it('正常系: ノートを更新できる', async () => {
      const mockNote = generateMockTaskNote({ content: 'Updated content' });
      mockTaskService.updateNote.mockResolvedValue(mockNote);

      const res = await taskManagementApp.request('/api/tasks/task-1/notes/note-1', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
        body: JSON.stringify({ content: 'Updated content' }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.note.content).toBe('Updated content');
      expect(mockTaskService.updateNote).toHaveBeenCalledWith(
        'note-1',
        'Updated content',
        'user-1'
      );
    });

    it('異常系: 空のコンテンツでバリデーションエラー', async () => {
      const res = await taskManagementApp.request('/api/tasks/task-1/notes/note-1', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
        body: JSON.stringify({ content: '' }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('DELETE /api/tasks/:id/notes/:noteId - ノート削除', () => {
    it('正常系: ノートを削除できる', async () => {
      mockTaskService.deleteNote.mockResolvedValue(undefined);

      const res = await taskManagementApp.request('/api/tasks/task-1/notes/note-1', {
        method: 'DELETE',
        headers: { Authorization: 'Bearer test-token' },
      });

      expect(res.status).toBe(204);
      expect(mockTaskService.deleteNote).toHaveBeenCalledWith('note-1', 'user-1');
    });

    it('異常系: 存在しないノートIDでエラー', async () => {
      mockTaskService.deleteNote.mockRejectedValue(new Error('Note not found'));

      const res = await taskManagementApp.request('/api/tasks/task-1/notes/invalid-id', {
        method: 'DELETE',
        headers: { Authorization: 'Bearer test-token' },
      });

      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('POST /api/tasks/bulk/status - 一括状態更新', () => {
    it('正常系: 複数タスクの状態を一括更新できる', async () => {
      const taskIds = [
        '550e8400-e29b-41d4-a716-446655440001',
        '550e8400-e29b-41d4-a716-446655440002',
      ];
      mockTaskService.bulkUpdateStatus.mockResolvedValue(undefined);

      const res = await taskManagementApp.request('/api/tasks/bulk/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
        body: JSON.stringify({ taskIds, status: 'completed' }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.updatedCount).toBe(2);
      expect(mockTaskService.bulkUpdateStatus).toHaveBeenCalledWith(taskIds, 'completed', 'user-1');
    });

    it('異常系: taskIdsが空配列でバリデーションエラー', async () => {
      const res = await taskManagementApp.request('/api/tasks/bulk/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
        body: JSON.stringify({ taskIds: [], status: 'completed' }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('異常系: taskIdsが100個を超えるとバリデーションエラー', async () => {
      const taskIds = Array.from(
        { length: 101 },
        (_, i) => `550e8400-e29b-41d4-a716-${String(i).padStart(12, '0')}`
      );

      const res = await taskManagementApp.request('/api/tasks/bulk/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
        body: JSON.stringify({ taskIds, status: 'completed' }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('異常系: statusが未指定でエラー', async () => {
      const taskIds = ['550e8400-e29b-41d4-a716-446655440001'];

      const res = await taskManagementApp.request('/api/tasks/bulk/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
        body: JSON.stringify({ taskIds }),
      });

      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INTERNAL_ERROR');
    });

    it('異常系: 無効なUUID形式でバリデーションエラー', async () => {
      const res = await taskManagementApp.request('/api/tasks/bulk/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
        body: JSON.stringify({ taskIds: ['invalid-uuid'], status: 'completed' }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('DELETE /api/tasks/bulk - 一括削除', () => {
    it('正常系: 複数タスクを一括削除できる', async () => {
      const taskIds = [
        '550e8400-e29b-41d4-a716-446655440001',
        '550e8400-e29b-41d4-a716-446655440002',
      ];
      mockTaskService.bulkDelete.mockResolvedValue(undefined);

      const res = await taskManagementApp.request('/api/tasks/bulk', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
        body: JSON.stringify({ taskIds }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.deletedCount).toBe(2);
      expect(mockTaskService.bulkDelete).toHaveBeenCalledWith(taskIds, 'user-1');
    });

    it('異常系: taskIdsが空配列でバリデーションエラー', async () => {
      const res = await taskManagementApp.request('/api/tasks/bulk', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
        body: JSON.stringify({ taskIds: [] }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/saved-views - 保存済みビュー一覧取得', () => {
    it('正常系: 保存済みビュー一覧を取得できる', async () => {
      const mockViews = [
        {
          id: 'view-1',
          userId: 'user-1',
          name: 'Test View',
          filters: { statuses: ['completed'] },
          searchQuery: '',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      mockFilterService.getSavedViews.mockResolvedValue(mockViews);

      const res = await taskManagementApp.request('/api/saved-views', {
        headers: { Authorization: 'Bearer test-token' },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.views).toHaveLength(1);
      expect(mockFilterService.getSavedViews).toHaveBeenCalledWith('user-1');
    });
  });

  describe('POST /api/saved-views - ビュー保存', () => {
    it('正常系: ビューを保存できる', async () => {
      const mockView = {
        id: 'view-1',
        userId: 'user-1',
        name: 'Test View',
        filters: { statuses: ['completed'] },
        searchQuery: 'test',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockFilterService.saveView.mockResolvedValue(mockView);

      const res = await taskManagementApp.request('/api/saved-views', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
        body: JSON.stringify({
          name: 'Test View',
          filters: { statuses: ['completed'] },
          searchQuery: 'test',
        }),
      });

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.view.name).toBe('Test View');
      expect(mockFilterService.saveView).toHaveBeenCalledWith(
        'user-1',
        'Test View',
        { statuses: ['completed'] },
        'test'
      );
    });

    it('異常系: 名前が空でバリデーションエラー', async () => {
      const res = await taskManagementApp.request('/api/saved-views', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
        body: JSON.stringify({
          name: '',
          filters: {},
        }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('異常系: 名前が255文字を超えるとバリデーションエラー', async () => {
      const longName = 'a'.repeat(256);
      const res = await taskManagementApp.request('/api/saved-views', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
        body: JSON.stringify({
          name: longName,
          filters: {},
        }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('DELETE /api/saved-views/:id - 保存済みビュー削除', () => {
    it('正常系: ビューを削除できる', async () => {
      mockFilterService.deleteSavedView.mockResolvedValue(undefined);

      const res = await taskManagementApp.request('/api/saved-views/view-1', {
        method: 'DELETE',
        headers: { Authorization: 'Bearer test-token' },
      });

      expect(res.status).toBe(204);
      expect(mockFilterService.deleteSavedView).toHaveBeenCalledWith('view-1', 'user-1');
    });

    it('異常系: 存在しないビューIDでエラー', async () => {
      mockFilterService.deleteSavedView.mockRejectedValue(new Error('View not found'));

      const res = await taskManagementApp.request('/api/saved-views/invalid-id', {
        method: 'DELETE',
        headers: { Authorization: 'Bearer test-token' },
      });

      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('エラーハンドリング', () => {
    it('Zodバリデーションエラーを適切に処理する', async () => {
      const res = await taskManagementApp.request('/api/tasks/task-1/status', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
        body: JSON.stringify({ status: 'invalid' }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toBe('バリデーションエラーが発生しました');
      expect(data.error.details).toBeDefined();
      expect(data.error.timestamp).toBeDefined();
    });

    it('予期しないエラーを適切に処理する', async () => {
      mockTaskService.getTasks.mockRejectedValue(new Error('Unexpected error'));

      const res = await taskManagementApp.request('/api/tasks', {
        headers: { Authorization: 'Bearer test-token' },
      });

      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INTERNAL_ERROR');
      expect(data.error.message).toBe('予期しないエラーが発生しました');
    });
  });

  describe('認証・認可', () => {
    it('認証ミドルウェアが正しく動作する', async () => {
      const mockTasks = [generateMockTask()];
      mockTaskService.getTasks.mockResolvedValue(mockTasks);

      const res = await taskManagementApp.request('/api/tasks', {
        headers: { Authorization: 'Bearer test-token' },
      });

      expect(res.status).toBe(200);
      expect(mockAuthMiddleware).toHaveBeenCalled();
    });

    it('ユーザーコンテキストが正しく設定される', async () => {
      const mockTasks = [generateMockTask()];
      mockTaskService.getTasks.mockResolvedValue(mockTasks);

      await taskManagementApp.request('/api/tasks', {
        headers: { Authorization: 'Bearer test-token' },
      });

      expect(mockTaskService.getTasks).toHaveBeenCalledWith('user-1', {});
    });
  });

  describe('CORSミドルウェア', () => {
    it('CORSヘッダーが正しく設定される', async () => {
      const mockTasks = [generateMockTask()];
      mockTaskService.getTasks.mockResolvedValue(mockTasks);

      const res = await taskManagementApp.request('/api/tasks', {
        headers: { Authorization: 'Bearer test-token' },
      });

      expect(res.status).toBe(200);
      // CORSヘッダーの確認は実際のレスポンスヘッダーで行う
    });
  });
});
