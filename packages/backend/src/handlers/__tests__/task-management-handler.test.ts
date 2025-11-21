// Mock all dependencies before imports
jest.mock('../../generated/prisma-client');
jest.mock('../../middleware/auth', () => ({
  authMiddleware: jest.fn((c: any, next: any) => next()),
  getCurrentUser: jest.fn(() => ({
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
  })),
}));

jest.mock('../../services/task.service', () => ({
  TaskService: jest.fn().mockImplementation(() => ({
    getTasks: jest.fn(),
    getTaskById: jest.fn(),
    updateTaskStatus: jest.fn(),
    addNote: jest.fn(),
    updateNote: jest.fn(),
    deleteNote: jest.fn(),
    getTaskNotes: jest.fn(),
    getTaskHistory: jest.fn(),
    checkUserAccess: jest.fn(),
    bulkUpdateStatus: jest.fn(),
    bulkDelete: jest.fn(),
  })),
}));

jest.mock('../../services/filter.service', () => ({
  FilterService: jest.fn().mockImplementation(() => ({
    searchTasks: jest.fn(),
    getSavedViews: jest.fn(),
    saveView: jest.fn(),
    getSavedViewById: jest.fn(),
    deleteSavedView: jest.fn(),
  })),
}));

jest.mock('../../services/progress.service', () => ({
  ProgressService: jest.fn().mockImplementation(() => ({
    updateProgress: jest.fn(),
  })),
}));

jest.mock('../../services/notification.service', () => ({
  NotificationService: jest.fn().mockImplementation(() => ({
    cancelNotification: jest.fn(),
  })),
}));

import { testClient } from 'hono/testing';
import taskManagementApp from '../task-management';
import { TaskService } from '../../services/task.service';
import { FilterService } from '../../services/filter.service';
import { ProgressService } from '../../services/progress.service';
import { NotificationService } from '../../services/notification.service';

describe('Task Management Handler', () => {
  let client: ReturnType<typeof testClient>;
  let mockTaskService: any;
  let mockFilterService: any;
  let mockProgressService: any;
  let mockNotificationService: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Get mock instances
    mockTaskService = new (TaskService as any)();
    mockFilterService = new (FilterService as any)();
    mockProgressService = new (ProgressService as any)();
    mockNotificationService = new (NotificationService as any)();

    client = testClient(taskManagementApp);
  });

  describe('GET /tasks', () => {
    it('should return tasks list', async () => {
      const mockTasks = [
        {
          id: 'task-1',
          title: 'Test Task',
          status: 'not_started',
          type: 'execution',
          estimatedMinutes: 30,
        },
      ];

      mockTaskService.getTasks.mockResolvedValue(mockTasks);

      const res = await client.tasks.$get();
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.tasks).toEqual(mockTasks);
      expect(data.total).toBe(1);
    });

    it('should apply filters', async () => {
      const mockTasks = [];
      mockTaskService.getTasks.mockResolvedValue(mockTasks);

      const res = await client.tasks.$get({
        query: {
          status: 'completed',
          deadlineRange: 'today',
        },
      });

      expect(res.status).toBe(200);
    });

    it('should apply search', async () => {
      const mockTasks = [{ id: 'task-1', title: 'Test Task' }];
      const filteredTasks = [{ id: 'task-1', title: 'Test Task' }];

      mockTaskService.getTasks.mockResolvedValue(mockTasks);
      mockFilterService.searchTasks.mockReturnValue(filteredTasks);

      const res = await client.tasks.$get({
        query: { search: 'test' },
      });

      expect(res.status).toBe(200);
    });
  });

  describe('PATCH /tasks/:id/status', () => {
    it('should update task status', async () => {
      const mockTask = { id: 'task-1', status: 'completed' };

      mockTaskService.checkUserAccess.mockResolvedValue(true);
      mockTaskService.getTaskById.mockResolvedValue(mockTask);
      mockTaskService.updateTaskStatus.mockResolvedValue(mockTask);
      mockProgressService.updateProgress.mockResolvedValue(undefined);
      mockNotificationService.cancelNotification.mockResolvedValue(undefined);

      const res = await client.tasks[':id'].status.$patch({
        param: { id: 'task-1' },
        json: { status: 'completed' },
      });

      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.task).toEqual(mockTask);
    });

    it('should validate status input', async () => {
      mockTaskService.checkUserAccess.mockResolvedValue(true);
      mockTaskService.getTaskById.mockResolvedValue({ id: 'task-1' });

      const res = await client.tasks[':id'].status.$patch({
        param: { id: 'task-1' },
        json: { status: 'invalid_status' },
      });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /tasks/bulk/status', () => {
    it('should update multiple tasks status', async () => {
      const taskIds = ['task-1', 'task-2'];

      mockTaskService.checkUserAccess.mockResolvedValue(true);
      mockTaskService.bulkUpdateStatus.mockResolvedValue(undefined);
      mockProgressService.updateProgress.mockResolvedValue(undefined);
      mockNotificationService.cancelNotification.mockResolvedValue(undefined);

      const res = await client.tasks.bulk.status.$post({
        json: { taskIds, status: 'completed' },
      });

      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.updatedCount).toBe(2);
    });

    it('should validate bulk operation input', async () => {
      const res = await client.tasks.bulk.status.$post({
        json: { taskIds: [], status: 'completed' },
      });

      expect(res.status).toBe(400);
    });
  });

  describe('Error Handling', () => {
    it('should handle validation errors', async () => {
      const res = await client.tasks[':id'].status.$patch({
        param: { id: 'task-1' },
        json: { status: 'invalid' },
      });

      expect(res.status).toBe(400);
    });

    it('should handle authorization errors', async () => {
      mockTaskService.checkUserAccess.mockResolvedValue(false);
      mockTaskService.getTaskById.mockResolvedValue({ id: 'task-1' });

      const res = await client.tasks[':id'].$get({
        param: { id: 'task-1' },
      });

      expect(res.status).toBe(403);
    });
  });
});
