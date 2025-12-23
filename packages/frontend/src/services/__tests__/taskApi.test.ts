import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { taskApi } from '../taskApi';
import { TaskStatus, TaskFilters } from '@goal-mandala/shared';

// Mock fetch globally
global.fetch = vi.fn();

describe('TaskApiClient', () => {
  const mockToken = 'test-token';
  const API_BASE_URL = 'http://localhost:3001/api';

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('accessToken', mockToken);
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('getTasks', () => {
    it('should fetch tasks without filters', async () => {
      const mockTasks = [
        { id: '1', title: 'Task 1', status: 'not_started' as TaskStatus },
        { id: '2', title: 'Task 2', status: 'in_progress' as TaskStatus },
      ];

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ tasks: mockTasks }),
      });

      const result = await taskApi.getTasks();

      expect(global.fetch).toHaveBeenCalledWith(`${API_BASE_URL}/tasks`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${mockToken}`,
        },
      });
      expect(result.tasks).toEqual(mockTasks);
    });

    it('should fetch tasks with filters', async () => {
      const filters: TaskFilters = {
        statuses: ['in_progress' as TaskStatus, 'completed' as TaskStatus],
        deadlineRange: 'today',
        actionIds: ['action-1', 'action-2'],
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ tasks: [] }),
      });

      await taskApi.getTasks(filters);

      const expectedUrl = `${API_BASE_URL}/tasks?status=in_progress&status=completed&deadlineRange=today&actionIds=action-1&actionIds=action-2`;
      expect(global.fetch).toHaveBeenCalledWith(expectedUrl, expect.any(Object));
    });

    it('should fetch tasks with search query', async () => {
      const searchQuery = 'test search';

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ tasks: [] }),
      });

      await taskApi.getTasks(undefined, searchQuery);

      const expectedUrl = `${API_BASE_URL}/tasks?search=test+search`;
      expect(global.fetch).toHaveBeenCalledWith(expectedUrl, expect.any(Object));
    });

    it('should throw error on failed request', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Server error' }),
      });

      await expect(taskApi.getTasks()).rejects.toThrow('Server error');
    });

    it('should handle network error with retry', async () => {
      vi.useFakeTimers();
      const error = new Error('Failed to fetch');
      (global.fetch as any).mockRejectedValue(error);

      const promise = taskApi.getTasks();

      // Fast-forward through all retry delays
      await vi.runAllTimersAsync();

      await expect(promise).rejects.toThrow();
      vi.useRealTimers();
    });
  });

  describe('getTaskById', () => {
    it('should fetch task detail by id', async () => {
      const taskId = 'task-1';
      const mockResponse = {
        task: { id: taskId, title: 'Task 1', status: 'not_started' as TaskStatus },
        notes: [],
        history: [],
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await taskApi.getTaskById(taskId);

      expect(global.fetch).toHaveBeenCalledWith(`${API_BASE_URL}/tasks/${taskId}`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${mockToken}`,
        },
      });
      expect(result).toEqual(mockResponse);
    });

    it('should throw error when task not found', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: 'Task not found' }),
      });

      await expect(taskApi.getTaskById('invalid-id')).rejects.toThrow('Task not found');
    });
  });

  describe('updateTaskStatus', () => {
    it('should update task status', async () => {
      const taskId = 'task-1';
      const status: TaskStatus = 'completed';
      const mockResponse = {
        task: { id: taskId, status, completedAt: new Date().toISOString() },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await taskApi.updateTaskStatus(taskId, status);

      expect(global.fetch).toHaveBeenCalledWith(`${API_BASE_URL}/tasks/${taskId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${mockToken}`,
        },
      });
      expect(result.task.status).toBe(status);
    });

    it('should throw error on invalid status', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Invalid status' }),
      });

      await expect(taskApi.updateTaskStatus('task-1', 'invalid' as TaskStatus)).rejects.toThrow(
        'Invalid status'
      );
    });
  });

  describe('Note operations', () => {
    describe('addNote', () => {
      it('should add note to task', async () => {
        const taskId = 'task-1';
        const content = 'Test note';
        const mockNote = { id: 'note-1', taskId, content, createdAt: new Date().toISOString() };

        (global.fetch as any).mockResolvedValueOnce({
          ok: true,
          json: async () => ({ note: mockNote }),
        });

        const result = await taskApi.addNote(taskId, content);

        expect(global.fetch).toHaveBeenCalledWith(`${API_BASE_URL}/tasks/${taskId}/notes`, {
          method: 'POST',
          body: JSON.stringify({ content }),
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${mockToken}`,
          },
        });
        expect(result.note).toEqual(mockNote);
      });

      it('should throw error on empty content', async () => {
        (global.fetch as any).mockResolvedValueOnce({
          ok: false,
          status: 400,
          json: async () => ({ error: 'Content is required' }),
        });

        await expect(taskApi.addNote('task-1', '')).rejects.toThrow('Content is required');
      });
    });

    describe('updateNote', () => {
      it('should update note content', async () => {
        const taskId = 'task-1';
        const noteId = 'note-1';
        const content = 'Updated note';
        const mockNote = {
          id: noteId,
          taskId,
          content,
          updatedAt: new Date().toISOString(),
        };

        (global.fetch as any).mockResolvedValueOnce({
          ok: true,
          json: async () => ({ note: mockNote }),
        });

        const result = await taskApi.updateNote(taskId, noteId, content);

        expect(global.fetch).toHaveBeenCalledWith(
          `${API_BASE_URL}/tasks/${taskId}/notes/${noteId}`,
          {
            method: 'PATCH',
            body: JSON.stringify({ content }),
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${mockToken}`,
            },
          }
        );
        expect(result.note.content).toBe(content);
      });
    });

    describe('deleteNote', () => {
      it('should delete note', async () => {
        const taskId = 'task-1';
        const noteId = 'note-1';

        (global.fetch as any).mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        });

        const result = await taskApi.deleteNote(taskId, noteId);

        expect(global.fetch).toHaveBeenCalledWith(
          `${API_BASE_URL}/tasks/${taskId}/notes/${noteId}`,
          {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${mockToken}`,
            },
          }
        );
        expect(result.success).toBe(true);
      });
    });
  });

  describe('Bulk operations', () => {
    describe('bulkUpdateStatus', () => {
      it('should update multiple tasks status', async () => {
        const taskIds = ['task-1', 'task-2', 'task-3'];
        const status: TaskStatus = 'completed';

        (global.fetch as any).mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, updatedCount: 3 }),
        });

        const result = await taskApi.bulkUpdateStatus(taskIds, status);

        expect(global.fetch).toHaveBeenCalledWith(`${API_BASE_URL}/tasks/bulk/status`, {
          method: 'POST',
          body: JSON.stringify({ taskIds, status }),
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${mockToken}`,
          },
        });
        expect(result.success).toBe(true);
        expect(result.updatedCount).toBe(3);
      });

      it('should throw error on empty task ids', async () => {
        (global.fetch as any).mockResolvedValueOnce({
          ok: false,
          status: 400,
          json: async () => ({ error: 'Task IDs are required' }),
        });

        await expect(taskApi.bulkUpdateStatus([], 'completed' as TaskStatus)).rejects.toThrow(
          'Task IDs are required'
        );
      });
    });

    describe('bulkDelete', () => {
      it('should delete multiple tasks', async () => {
        const taskIds = ['task-1', 'task-2'];

        (global.fetch as any).mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, deletedCount: 2 }),
        });

        const result = await taskApi.bulkDelete(taskIds);

        expect(global.fetch).toHaveBeenCalledWith(`${API_BASE_URL}/tasks/bulk`, {
          method: 'DELETE',
          body: JSON.stringify({ taskIds }),
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${mockToken}`,
          },
        });
        expect(result.success).toBe(true);
        expect(result.deletedCount).toBe(2);
      });
    });
  });

  describe('Saved views', () => {
    describe('getSavedViews', () => {
      it('should fetch saved views', async () => {
        const mockViews = [
          { id: 'view-1', name: 'My View', filters: {}, searchQuery: '' },
          { id: 'view-2', name: 'Another View', filters: { statuses: ['in_progress'] } },
        ];

        (global.fetch as any).mockResolvedValueOnce({
          ok: true,
          json: async () => ({ views: mockViews }),
        });

        const result = await taskApi.getSavedViews();

        expect(global.fetch).toHaveBeenCalledWith(`${API_BASE_URL}/saved-views`, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${mockToken}`,
          },
        });
        expect(result.views).toEqual(mockViews);
      });
    });

    describe('saveView', () => {
      it('should save a new view', async () => {
        const name = 'My View';
        const filters: TaskFilters = { statuses: ['in_progress' as TaskStatus] };
        const searchQuery = 'test';
        const mockView = { id: 'view-1', name, filters, searchQuery };

        (global.fetch as any).mockResolvedValueOnce({
          ok: true,
          json: async () => ({ view: mockView }),
        });

        const result = await taskApi.saveView(name, filters, searchQuery);

        expect(global.fetch).toHaveBeenCalledWith(`${API_BASE_URL}/saved-views`, {
          method: 'POST',
          body: JSON.stringify({ name, filters, searchQuery }),
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${mockToken}`,
          },
        });
        expect(result.view).toEqual(mockView);
      });
    });

    describe('deleteSavedView', () => {
      it('should delete a saved view', async () => {
        const viewId = 'view-1';

        (global.fetch as any).mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        });

        const result = await taskApi.deleteSavedView(viewId);

        expect(global.fetch).toHaveBeenCalledWith(`${API_BASE_URL}/saved-views/${viewId}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${mockToken}`,
          },
        });
        expect(result.success).toBe(true);
      });
    });
  });

  describe('Authentication', () => {
    it('should include authorization header when token exists', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ tasks: [] }),
      });

      await taskApi.getTasks();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockToken}`,
          }),
        })
      );
    });

    it('should not include authorization header when token does not exist', async () => {
      localStorage.removeItem('accessToken');

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ tasks: [] }),
      });

      await taskApi.getTasks();

      expect(global.fetch).toHaveBeenCalledWith(
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
