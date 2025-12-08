import { Hono } from 'hono';
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
  getTaskNotes: jest.fn(),
  getTaskHistory: jest.fn(),
  checkUserAccess: jest.fn(),
};

const mockFilterService = {
  searchTasks: jest.fn(),
  getSavedViews: jest.fn(),
  saveView: jest.fn(),
  deleteSavedView: jest.fn(),
  getSavedViewById: jest.fn(),
};

const mockProgressService = {
  updateProgress: jest.fn(),
};

const mockNotificationService = {
  cancelNotification: jest.fn(),
  scheduleNotification: jest.fn(),
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

jest.mock('../../services/notification.service', () => ({
  NotificationService: jest.fn().mockImplementation(() => mockNotificationService),
}));

jest.mock('../../middleware/auth', () => ({
  authMiddleware: jest.fn((c, next) => {
    c.set('user', { id: 'user-1', email: 'test@example.com' });
    return next();
  }),
  getCurrentUser: jest.fn(() => ({ id: 'user-1', email: 'test@example.com' })),
}));

import taskManagementApp from '../task-management';

describe.skip('Task Management Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /tasks', () => {
    it('should return tasks for authenticated user', async () => {
      const mockTasks = [generateMockTask(), generateMockTask()];
      mockTaskService.getTasks.mockResolvedValue(mockTasks);

      const app = new Hono();
      app.route('/', taskManagementApp);

      const res = await app.request('/tasks', {
        headers: { Authorization: 'Bearer test-token' },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.tasks).toHaveLength(2);
      expect(data.total).toBe(2);
    });

    it('should apply filters when provided', async () => {
      const mockTasks = [generateMockTask({ status: 'completed' })];
      mockTaskService.getTasks.mockResolvedValue(mockTasks);

      const app = new Hono();
      app.route('/', taskManagementApp);

      const res = await app.request('/tasks?status=completed', {
        headers: { Authorization: 'Bearer test-token' },
      });

      expect(res.status).toBe(200);
      expect(mockTaskService.getTasks).toHaveBeenCalledWith('user-1', {
        statuses: ['completed'],
        deadlineRange: undefined,
        actionIds: undefined,
      });
    });

    it('should apply search when provided', async () => {
      const mockTasks = [generateMockTask()];
      mockTaskService.getTasks.mockResolvedValue(mockTasks);
      mockFilterService.searchTasks.mockReturnValue(mockTasks);

      const app = new Hono();
      app.route('/', taskManagementApp);

      const res = await app.request('/tasks?search=test', {
        headers: { Authorization: 'Bearer test-token' },
      });

      expect(res.status).toBe(200);
      expect(mockFilterService.searchTasks).toHaveBeenCalledWith(mockTasks, 'test');
    });
  });

  describe('GET /tasks/:id', () => {
    it('should return task details with notes and history', async () => {
      const mockTask = generateMockTask();
      const mockNotes = [generateMockTaskNote()];
      const mockHistory = [generateMockTaskHistory()];

      mockTaskService.checkUserAccess.mockResolvedValue(true);
      mockTaskService.getTaskById.mockResolvedValue(mockTask);
      mockTaskService.getTaskNotes.mockResolvedValue(mockNotes);
      mockTaskService.getTaskHistory.mockResolvedValue(mockHistory);

      const app = new Hono();
      app.route('/', taskManagementApp);

      const res = await app.request(`/tasks/${mockTask.id}`, {
        headers: { Authorization: 'Bearer test-token' },
      });

      expect(res.status).toBe(200);
      const data = await res.json();

      // JSONレスポンスでは日付は文字列として返される
      expect(data.task).toEqual({
        ...mockTask,
        createdAt: mockTask.createdAt.toISOString(),
        updatedAt: mockTask.updatedAt.toISOString(),
        deadline: mockTask.deadline?.toISOString(),
      });
      expect(data.notes).toEqual(
        mockNotes.map(note => ({
          ...note,
          createdAt: note.createdAt.toISOString(),
          updatedAt: note.updatedAt.toISOString(),
        }))
      );
      expect(data.history).toEqual(
        mockHistory.map(h => ({
          ...h,
          changedAt: h.changedAt.toISOString(),
        }))
      );
    });

    it('should return 403 when user lacks access', async () => {
      mockTaskService.checkUserAccess.mockResolvedValue(false);
      mockTaskService.getTaskById.mockResolvedValue(generateMockTask());

      const app = new Hono();
      app.route('/', taskManagementApp);

      const res = await app.request('/tasks/task-1', {
        headers: { Authorization: 'Bearer test-token' },
      });

      expect(res.status).toBe(403);
    });
  });

  describe('PATCH /tasks/:id/status', () => {
    it('should update task status successfully', async () => {
      const mockTask = generateMockTask({ status: 'completed' });
      mockTaskService.checkUserAccess.mockResolvedValue(true);
      mockTaskService.getTaskById.mockResolvedValue(mockTask);
      mockTaskService.updateTaskStatus.mockResolvedValue(mockTask);

      const app = new Hono();
      app.route('/', taskManagementApp);

      const res = await app.request(`/tasks/${mockTask.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
        body: JSON.stringify({ status: 'completed' }),
      });

      expect(res.status).toBe(200);
      expect(mockTaskService.updateTaskStatus).toHaveBeenCalledWith(mockTask.id, 'completed');
      expect(mockProgressService.updateProgress).toHaveBeenCalledWith(mockTask.id);
      expect(mockNotificationService.cancelNotification).toHaveBeenCalledWith(mockTask.id);
    });

    it('should return 400 for invalid status', async () => {
      mockTaskService.checkUserAccess.mockResolvedValue(true);
      mockTaskService.getTaskById.mockResolvedValue(generateMockTask());

      const app = new Hono();
      app.route('/', taskManagementApp);

      const res = await app.request('/tasks/task-1/status', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
        body: JSON.stringify({ status: 'invalid' }),
      });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /tasks/:id/notes', () => {
    it('should add note successfully', async () => {
      const mockNote = generateMockTaskNote();
      mockTaskService.checkUserAccess.mockResolvedValue(true);
      mockTaskService.getTaskById.mockResolvedValue(generateMockTask());
      mockTaskService.addNote.mockResolvedValue(mockNote);

      const app = new Hono();
      app.route('/', taskManagementApp);

      const res = await app.request('/tasks/task-1/notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
        body: JSON.stringify({ content: 'Test note' }),
      });

      expect(res.status).toBe(200);
      expect(mockTaskService.addNote).toHaveBeenCalledWith('task-1', 'user-1', 'Test note');
    });

    it('should return 400 for empty content', async () => {
      mockTaskService.checkUserAccess.mockResolvedValue(true);
      mockTaskService.getTaskById.mockResolvedValue(generateMockTask());

      const app = new Hono();
      app.route('/', taskManagementApp);

      const res = await app.request('/tasks/task-1/notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
        body: JSON.stringify({ content: '' }),
      });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /tasks/bulk/status', () => {
    it('should update multiple tasks successfully', async () => {
      const taskIds = [
        '550e8400-e29b-41d4-a716-446655440001',
        '550e8400-e29b-41d4-a716-446655440002',
      ];
      mockTaskService.checkUserAccess.mockResolvedValue(true);

      const app = new Hono();
      app.route('/', taskManagementApp);

      const res = await app.request('/tasks/bulk/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
        body: JSON.stringify({ taskIds, status: 'completed' }),
      });

      expect(res.status).toBe(200);
      expect(mockTaskService.bulkUpdateStatus).toHaveBeenCalledWith(taskIds, 'completed');

      const data = await res.json();
      expect(data.updatedCount).toBe(2);
    });

    it('should return 403 when user lacks access to some tasks', async () => {
      const taskIds = [
        '550e8400-e29b-41d4-a716-446655440001',
        '550e8400-e29b-41d4-a716-446655440002',
      ];
      mockTaskService.checkUserAccess.mockResolvedValueOnce(true).mockResolvedValueOnce(false);

      const app = new Hono();
      app.route('/', taskManagementApp);

      const res = await app.request('/tasks/bulk/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
        body: JSON.stringify({ taskIds, status: 'completed' }),
      });

      expect(res.status).toBe(403);
    });
  });

  describe('Saved Views', () => {
    it('should get saved views', async () => {
      const mockViews = [{ id: 'view-1', name: 'Test View', filters: {} }];
      mockFilterService.getSavedViews.mockResolvedValue(mockViews);

      const app = new Hono();
      app.route('/', taskManagementApp);

      const res = await app.request('/saved-views', {
        headers: { Authorization: 'Bearer test-token' },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.views).toEqual(mockViews);
    });

    it('should save view successfully', async () => {
      const mockView = { id: 'view-1', name: 'Test View', filters: {} };
      mockFilterService.saveView.mockResolvedValue(mockView);

      const app = new Hono();
      app.route('/', taskManagementApp);

      const res = await app.request('/saved-views', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
        body: JSON.stringify({
          name: 'Test View',
          filters: { statuses: ['completed'] },
        }),
      });

      expect(res.status).toBe(200);
      expect(mockFilterService.saveView).toHaveBeenCalledWith(
        'user-1',
        'Test View',
        { statuses: ['completed'] },
        undefined
      );
    });
  });
});
