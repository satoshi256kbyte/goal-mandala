import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTasks, useUpdateTaskStatus, useAddNote } from '../useTasks';
import { taskApi } from '../../services/taskApi';
import { generateMockTask, generateMockTaskNote } from '@goal-mandala/shared';

// taskApiをモック
jest.mock('../../services/taskApi');
const mockTaskApi = taskApi as jest.Mocked<typeof taskApi>;

// テスト用のQueryClientProvider
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const TestWrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return TestWrapper;
};

describe('useTasks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch tasks successfully', async () => {
    const mockTasks = [generateMockTask(), generateMockTask()];
    mockTaskApi.getTasks.mockResolvedValue({ tasks: mockTasks });

    const { result } = renderHook(() => useTasks(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.tasks).toEqual(mockTasks);
    expect(mockTaskApi.getTasks).toHaveBeenCalledWith(undefined, undefined);
  });

  it('should pass filters and search query to API', async () => {
    const filters = { statuses: ['completed'] };
    const searchQuery = 'test';
    mockTaskApi.getTasks.mockResolvedValue({ tasks: [] });

    renderHook(() => useTasks(filters, searchQuery), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(mockTaskApi.getTasks).toHaveBeenCalledWith(filters, searchQuery);
    });
  });

  it('should handle API errors', async () => {
    mockTaskApi.getTasks.mockRejectedValue(new Error('API Error'));

    const { result } = renderHook(() => useTasks(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(new Error('API Error'));
  });
});

describe('useUpdateTaskStatus', () => {
  it('should update task status successfully', async () => {
    const mockTask = generateMockTask({ status: 'completed' });
    mockTaskApi.updateTaskStatus.mockResolvedValue({ task: mockTask });

    const { result } = renderHook(() => useUpdateTaskStatus(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ taskId: 'task-1', status: 'completed' });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockTaskApi.updateTaskStatus).toHaveBeenCalledWith('task-1', 'completed');
  });

  it('should handle update errors', async () => {
    mockTaskApi.updateTaskStatus.mockRejectedValue(new Error('Update failed'));

    const { result } = renderHook(() => useUpdateTaskStatus(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ taskId: 'task-1', status: 'completed' });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(new Error('Update failed'));
  });
});

describe('useAddNote', () => {
  it('should add note successfully', async () => {
    const mockNote = generateMockTaskNote();
    mockTaskApi.addNote.mockResolvedValue({ note: mockNote });

    const { result } = renderHook(() => useAddNote(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ taskId: 'task-1', content: 'Test note' });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockTaskApi.addNote).toHaveBeenCalledWith('task-1', 'Test note');
  });

  it('should handle add note errors', async () => {
    mockTaskApi.addNote.mockRejectedValue(new Error('Add note failed'));

    const { result } = renderHook(() => useAddNote(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ taskId: 'task-1', content: 'Test note' });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(new Error('Add note failed'));
  });
});
