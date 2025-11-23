import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { taskApi } from '../taskApi';
import { generateMockTask, generateMockTaskNote } from '@goal-mandala/shared';

// fetchをモック
global.fetch = vi.fn();
const mockFetch = fetch as any;

// localStorageをモック
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

describe('TaskApiClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue('test-token');
  });

  describe('getTasks', () => {
    it('should fetch tasks with correct parameters', async () => {
      const mockTasks = [generateMockTask(), generateMockTask()];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ tasks: mockTasks }),
      } as Response);

      const result = await taskApi.getTasks();

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/tasks',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-token',
          }),
        })
      );
      expect(result.tasks).toEqual(mockTasks);
    });

    it('should include filters in query parameters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ tasks: [] }),
      } as Response);

      const filters = {
        statuses: ['completed'],
        deadlineRange: 'today' as const,
        actionIds: ['action-1'],
      };

      await taskApi.getTasks(filters, 'search query');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/tasks?status=completed&deadlineRange=today&actionIds=action-1&search=search+query',
        expect.any(Object)
      );
    });
  });

  describe('updateTaskStatus', () => {
    it('should update task status with correct payload', async () => {
      const mockTask = generateMockTask({ status: 'completed' });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ task: mockTask }),
      } as Response);

      const result = await taskApi.updateTaskStatus('task-1', 'completed');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/tasks/task-1/status',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ status: 'completed' }),
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-token',
          }),
        })
      );
      expect(result.task).toEqual(mockTask);
    });
  });

  describe('addNote', () => {
    it('should add note with correct payload', async () => {
      const mockNote = generateMockTaskNote();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ note: mockNote }),
      } as Response);

      const result = await taskApi.addNote('task-1', 'Test note content');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/tasks/task-1/notes',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ content: 'Test note content' }),
        })
      );
      expect(result.note).toEqual(mockNote);
    });
  });

  describe('bulkUpdateStatus', () => {
    it('should perform bulk status update', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, updatedCount: 2 }),
      } as Response);

      const result = await taskApi.bulkUpdateStatus(['task-1', 'task-2'], 'completed');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/tasks/bulk/status',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            taskIds: ['task-1', 'task-2'],
            status: 'completed',
          }),
        })
      );
      expect(result.success).toBe(true);
      expect(result.updatedCount).toBe(2);
    });
  });

  describe('error handling', () => {
    it('should throw error when response is not ok', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Bad Request' }),
      } as Response);

      await expect(taskApi.getTasks()).rejects.toThrow('Bad Request');
    });

    it('should throw network error when fetch fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(taskApi.getTasks()).rejects.toThrow('Network error');
    });

    it('should handle malformed JSON response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      } as Response);

      await expect(taskApi.getTasks()).rejects.toThrow('Network error');
    });
  });

  describe('authentication', () => {
    it('should include authorization header when token exists', async () => {
      mockLocalStorage.getItem.mockReturnValue('test-token');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ tasks: [] }),
      } as Response);

      await taskApi.getTasks();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        })
      );
    });

    it('should send empty authorization header when no token', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ tasks: [] }),
      } as Response);

      await taskApi.getTasks();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: '',
          }),
        })
      );
    });
  });
});
