import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import {
  useTasks,
  useTaskDetail,
  useUpdateTaskStatus,
  useAddNote,
  useUpdateNote,
  useDeleteNote,
  useBulkUpdateStatus,
  useBulkDelete,
  useSavedViews,
  useSaveView,
  useDeleteSavedView,
  taskKeys,
} from '../useTasks';
import { taskApi } from '../../services/taskApi';
import { TaskStatus, TaskFilters } from '@goal-mandala/shared';

// Mock taskApi
vi.mock('../../services/taskApi', () => ({
  taskApi: {
    getTasks: vi.fn(),
    getTaskById: vi.fn(),
    updateTaskStatus: vi.fn(),
    addNote: vi.fn(),
    updateNote: vi.fn(),
    deleteNote: vi.fn(),
    bulkUpdateStatus: vi.fn(),
    bulkDelete: vi.fn(),
    getSavedViews: vi.fn(),
    saveView: vi.fn(),
    deleteSavedView: vi.fn(),
  },
}));

describe('useTasks hooks', () => {
  let queryClient: QueryClient;

  const createWrapper = () => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
        },
        mutations: {
          retry: false,
        },
      },
    });

    const Wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    Wrapper.displayName = 'QueryClientWrapper';
    return Wrapper;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient?.clear();
  });

  describe('useTasks', () => {
    it('should fetch tasks successfully', async () => {
      const mockTasks = [
        { id: '1', title: 'Task 1', status: 'not_started' as TaskStatus },
        { id: '2', title: 'Task 2', status: 'in_progress' as TaskStatus },
      ];

      vi.mocked(taskApi.getTasks).mockResolvedValueOnce({ tasks: mockTasks });

      const { result } = renderHook(() => useTasks(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(taskApi.getTasks).toHaveBeenCalledWith(undefined, undefined);
      expect(result.current.data?.tasks).toEqual(mockTasks);
    });

    it('should fetch tasks with filters', async () => {
      const filters: TaskFilters = {
        statuses: ['in_progress' as TaskStatus],
        deadlineRange: 'today',
      };

      vi.mocked(taskApi.getTasks).mockResolvedValueOnce({ tasks: [] });

      const { result } = renderHook(() => useTasks(filters), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(taskApi.getTasks).toHaveBeenCalledWith(filters, undefined);
    });

    it('should fetch tasks with search query', async () => {
      const searchQuery = 'test';

      vi.mocked(taskApi.getTasks).mockResolvedValueOnce({ tasks: [] });

      const { result } = renderHook(() => useTasks(undefined, searchQuery), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(taskApi.getTasks).toHaveBeenCalledWith(undefined, searchQuery);
    });

    it('should handle error', async () => {
      const error = new Error('Failed to fetch tasks');
      vi.mocked(taskApi.getTasks).mockRejectedValueOnce(error);

      const { result } = renderHook(() => useTasks(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toEqual(error);
    });

    it('should use correct cache time', async () => {
      vi.mocked(taskApi.getTasks).mockResolvedValueOnce({ tasks: [] });

      const { result } = renderHook(() => useTasks(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // staleTime should be 5 minutes
      expect(result.current.isStale).toBe(false);
    });
  });

  describe('useTaskDetail', () => {
    it('should fetch task detail successfully', async () => {
      const taskId = 'task-1';
      const mockResponse = {
        task: { id: taskId, title: 'Task 1', status: 'not_started' as TaskStatus },
        notes: [],
        history: [],
      };

      vi.mocked(taskApi.getTaskById).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useTaskDetail(taskId), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(taskApi.getTaskById).toHaveBeenCalledWith(taskId);
      expect(result.current.data).toEqual(mockResponse);
    });

    it('should not fetch when taskId is empty', async () => {
      const { result } = renderHook(() => useTaskDetail(''), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isFetching).toBe(false));

      expect(taskApi.getTaskById).not.toHaveBeenCalled();
    });

    it('should handle error', async () => {
      const error = new Error('Task not found');
      vi.mocked(taskApi.getTaskById).mockRejectedValueOnce(error);

      const { result } = renderHook(() => useTaskDetail('invalid-id'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toEqual(error);
    });
  });

  describe('useUpdateTaskStatus', () => {
    it('should update task status successfully', async () => {
      const taskId = 'task-1';
      const status: TaskStatus = 'completed';
      const mockResponse = {
        task: { id: taskId, status, completedAt: new Date().toISOString() },
      };

      vi.mocked(taskApi.updateTaskStatus).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useUpdateTaskStatus(), { wrapper: createWrapper() });

      result.current.mutate({ taskId, status });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(taskApi.updateTaskStatus).toHaveBeenCalledWith(taskId, status);
      expect(result.current.data).toEqual(mockResponse);
    });

    it('should handle error', async () => {
      const taskId = 'task-1';
      const status: TaskStatus = 'completed';

      const error = new Error('Update failed');
      vi.mocked(taskApi.updateTaskStatus).mockRejectedValueOnce(error);

      const { result } = renderHook(() => useUpdateTaskStatus(), { wrapper: createWrapper() });

      result.current.mutate({ taskId, status });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error).toEqual(error);
    });
  });

  describe('useAddNote', () => {
    it('should add note successfully', async () => {
      const taskId = 'task-1';
      const content = 'Test note';
      const mockNote = { id: 'note-1', taskId, content, createdAt: new Date().toISOString() };

      vi.mocked(taskApi.addNote).mockResolvedValueOnce({ note: mockNote });

      const { result } = renderHook(() => useAddNote(), { wrapper: createWrapper() });

      result.current.mutate({ taskId, content });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(taskApi.addNote).toHaveBeenCalledWith(taskId, content);
      expect(result.current.data?.note).toEqual(mockNote);
    });

    it('should handle error', async () => {
      const taskId = 'task-1';
      const content = 'Test note';
      const error = new Error('Failed to add note');

      vi.mocked(taskApi.addNote).mockRejectedValueOnce(error);

      const { result } = renderHook(() => useAddNote(), { wrapper: createWrapper() });

      result.current.mutate({ taskId, content });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error).toEqual(error);
    });
  });

  describe('useUpdateNote', () => {
    it('should update note successfully', async () => {
      const taskId = 'task-1';
      const noteId = 'note-1';
      const content = 'Updated note';
      const mockNote = { id: noteId, taskId, content, updatedAt: new Date().toISOString() };

      vi.mocked(taskApi.updateNote).mockResolvedValueOnce({ note: mockNote });

      const { result } = renderHook(() => useUpdateNote(), { wrapper: createWrapper() });

      result.current.mutate({ taskId, noteId, content });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(taskApi.updateNote).toHaveBeenCalledWith(taskId, noteId, content);
      expect(result.current.data?.note).toEqual(mockNote);
    });
  });

  describe('useDeleteNote', () => {
    it('should delete note successfully', async () => {
      const taskId = 'task-1';
      const noteId = 'note-1';

      vi.mocked(taskApi.deleteNote).mockResolvedValueOnce({ success: true });

      const { result } = renderHook(() => useDeleteNote(), { wrapper: createWrapper() });

      result.current.mutate({ taskId, noteId });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(taskApi.deleteNote).toHaveBeenCalledWith(taskId, noteId);
      expect(result.current.data?.success).toBe(true);
    });

    it('should handle error', async () => {
      const taskId = 'task-1';
      const noteId = 'note-1';
      const error = new Error('Failed to delete note');

      vi.mocked(taskApi.deleteNote).mockRejectedValueOnce(error);

      const { result } = renderHook(() => useDeleteNote(), { wrapper: createWrapper() });

      result.current.mutate({ taskId, noteId });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error).toEqual(error);
    });
  });

  describe('useBulkUpdateStatus', () => {
    it('should update multiple tasks status successfully', async () => {
      const taskIds = ['task-1', 'task-2', 'task-3'];
      const status: TaskStatus = 'completed';

      vi.mocked(taskApi.bulkUpdateStatus).mockResolvedValueOnce({
        success: true,
        updatedCount: 3,
      });

      const { result } = renderHook(() => useBulkUpdateStatus(), { wrapper: createWrapper() });

      result.current.mutate({ taskIds, status });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(taskApi.bulkUpdateStatus).toHaveBeenCalledWith(taskIds, status);
      expect(result.current.data?.updatedCount).toBe(3);
    });

    it('should invalidate queries after success', async () => {
      const taskIds = ['task-1', 'task-2'];
      const status: TaskStatus = 'completed';

      queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: 0 } },
      });

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      vi.mocked(taskApi.bulkUpdateStatus).mockResolvedValueOnce({
        success: true,
        updatedCount: 2,
      });

      const { result } = renderHook(() => useBulkUpdateStatus(), {
        wrapper: ({ children }: { children: ReactNode }) => (
          <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        ),
      });

      result.current.mutate({ taskIds, status });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: taskKeys.lists() });
      taskIds.forEach(taskId => {
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: taskKeys.detail(taskId) });
      });
    });
  });

  describe('useBulkDelete', () => {
    it('should delete multiple tasks successfully', async () => {
      const taskIds = ['task-1', 'task-2'];

      vi.mocked(taskApi.bulkDelete).mockResolvedValueOnce({ success: true, deletedCount: 2 });

      const { result } = renderHook(() => useBulkDelete(), { wrapper: createWrapper() });

      result.current.mutate({ taskIds });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(taskApi.bulkDelete).toHaveBeenCalledWith(taskIds);
      expect(result.current.data?.deletedCount).toBe(2);
    });

    it('should remove queries after success', async () => {
      const taskIds = ['task-1', 'task-2'];

      queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: 0 } },
      });

      const removeSpy = vi.spyOn(queryClient, 'removeQueries');

      vi.mocked(taskApi.bulkDelete).mockResolvedValueOnce({ success: true, deletedCount: 2 });

      const { result } = renderHook(() => useBulkDelete(), {
        wrapper: ({ children }: { children: ReactNode }) => (
          <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        ),
      });

      result.current.mutate({ taskIds });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      taskIds.forEach(taskId => {
        expect(removeSpy).toHaveBeenCalledWith({ queryKey: taskKeys.detail(taskId) });
      });
    });
  });

  describe('useSavedViews', () => {
    it('should fetch saved views successfully', async () => {
      const mockViews = [
        { id: 'view-1', name: 'My View', filters: {}, searchQuery: '' },
        { id: 'view-2', name: 'Another View', filters: { statuses: ['in_progress'] } },
      ];

      vi.mocked(taskApi.getSavedViews).mockResolvedValueOnce({ views: mockViews });

      const { result } = renderHook(() => useSavedViews(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(taskApi.getSavedViews).toHaveBeenCalled();
      expect(result.current.data?.views).toEqual(mockViews);
    });
  });

  describe('useSaveView', () => {
    it('should save view successfully', async () => {
      const name = 'My View';
      const filters: TaskFilters = { statuses: ['in_progress' as TaskStatus] };
      const searchQuery = 'test';
      const mockView = { id: 'view-1', name, filters, searchQuery };

      vi.mocked(taskApi.saveView).mockResolvedValueOnce({ view: mockView });

      const { result } = renderHook(() => useSaveView(), { wrapper: createWrapper() });

      result.current.mutate({ name, filters, searchQuery });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(taskApi.saveView).toHaveBeenCalledWith(name, filters, searchQuery);
      expect(result.current.data?.view).toEqual(mockView);
    });

    it('should invalidate saved views after success', async () => {
      queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: 0 } },
      });

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      vi.mocked(taskApi.saveView).mockResolvedValueOnce({ view: {} });

      const { result } = renderHook(() => useSaveView(), {
        wrapper: ({ children }: { children: ReactNode }) => (
          <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        ),
      });

      result.current.mutate({ name: 'Test', filters: {} });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: taskKeys.savedViews() });
    });
  });

  describe('useDeleteSavedView', () => {
    it('should delete saved view successfully', async () => {
      const viewId = 'view-1';

      vi.mocked(taskApi.deleteSavedView).mockResolvedValueOnce({ success: true });

      const { result } = renderHook(() => useDeleteSavedView(), { wrapper: createWrapper() });

      result.current.mutate({ viewId });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(taskApi.deleteSavedView).toHaveBeenCalledWith(viewId);
      expect(result.current.data?.success).toBe(true);
    });
  });

  describe('Query keys', () => {
    it('should generate correct query keys', () => {
      expect(taskKeys.all).toEqual(['tasks']);
      expect(taskKeys.lists()).toEqual(['tasks', 'list']);
      expect(taskKeys.list()).toEqual([
        'tasks',
        'list',
        { filters: undefined, searchQuery: undefined },
      ]);
      expect(taskKeys.details()).toEqual(['tasks', 'detail']);
      expect(taskKeys.detail('task-1')).toEqual(['tasks', 'detail', 'task-1']);
      expect(taskKeys.savedViews()).toEqual(['tasks', 'savedViews']);
    });

    it('should generate query keys with filters', () => {
      const filters: TaskFilters = { statuses: ['in_progress' as TaskStatus] };
      const searchQuery = 'test';

      expect(taskKeys.list(filters, searchQuery)).toEqual([
        'tasks',
        'list',
        { filters, searchQuery },
      ]);
    });
  });
});
