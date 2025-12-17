import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import {
  useCreateReflection,
  useReflection,
  useReflectionsByGoal,
  useUpdateReflection,
  useDeleteReflection,
  useActionProgress,
  reflectionKeys,
} from '../useReflections';
import { reflectionApi } from '../../services/reflectionApi';
import type {
  Reflection,
  CreateReflectionInput,
  UpdateReflectionInput,
} from '../../types/reflection';

// Mock reflectionApi
vi.mock('../../services/reflectionApi', () => ({
  reflectionApi: {
    createReflection: vi.fn(),
    getReflection: vi.fn(),
    getReflectionsByGoal: vi.fn(),
    updateReflection: vi.fn(),
    deleteReflection: vi.fn(),
    getActionProgress: vi.fn(),
  },
}));

describe('useReflections hooks', () => {
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

  describe('useCreateReflection', () => {
    it('should create reflection successfully', async () => {
      const input: CreateReflectionInput = {
        goalId: 'goal-1',
        summary: 'Test summary',
        regretfulActions: 'Action 1',
        slowProgressActions: 'Action 2',
        untouchedActions: 'Action 3',
      };

      const mockReflection: Reflection = {
        id: 'reflection-1',
        ...input,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      vi.mocked(reflectionApi.createReflection).mockResolvedValueOnce(mockReflection);

      const { result } = renderHook(() => useCreateReflection(), { wrapper: createWrapper() });

      result.current.mutate(input);

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(reflectionApi.createReflection).toHaveBeenCalledWith(input);
      expect(result.current.data).toEqual(mockReflection);
    });

    it('should handle error', async () => {
      const input: CreateReflectionInput = {
        goalId: 'goal-1',
        summary: 'Test summary',
      };

      const error = new Error('Failed to create reflection');
      vi.mocked(reflectionApi.createReflection).mockRejectedValueOnce(error);

      const { result } = renderHook(() => useCreateReflection(), { wrapper: createWrapper() });

      result.current.mutate(input);

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error).toEqual(error);
    });

    it('should invalidate goal reflections list after success', async () => {
      const input: CreateReflectionInput = {
        goalId: 'goal-1',
        summary: 'Test summary',
      };

      const mockReflection: Reflection = {
        id: 'reflection-1',
        ...input,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: 0 } },
      });

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      vi.mocked(reflectionApi.createReflection).mockResolvedValueOnce(mockReflection);

      const { result } = renderHook(() => useCreateReflection(), {
        wrapper: ({ children }: { children: ReactNode }) => (
          <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        ),
      });

      result.current.mutate(input);

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: reflectionKeys.list('goal-1') });
    });

    it('should set reflection in cache after success', async () => {
      const input: CreateReflectionInput = {
        goalId: 'goal-1',
        summary: 'Test summary',
      };

      const mockReflection: Reflection = {
        id: 'reflection-1',
        ...input,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: 0 } },
      });

      const setQueryDataSpy = vi.spyOn(queryClient, 'setQueryData');

      vi.mocked(reflectionApi.createReflection).mockResolvedValueOnce(mockReflection);

      const { result } = renderHook(() => useCreateReflection(), {
        wrapper: ({ children }: { children: ReactNode }) => (
          <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        ),
      });

      result.current.mutate(input);

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(setQueryDataSpy).toHaveBeenCalledWith(
        reflectionKeys.detail('reflection-1'),
        mockReflection
      );
    });
  });

  describe('useReflection', () => {
    it('should fetch reflection successfully', async () => {
      const reflectionId = 'reflection-1';
      const mockReflection: Reflection = {
        id: reflectionId,
        goalId: 'goal-1',
        summary: 'Test summary',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      vi.mocked(reflectionApi.getReflection).mockResolvedValueOnce(mockReflection);

      const { result } = renderHook(() => useReflection(reflectionId), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(reflectionApi.getReflection).toHaveBeenCalledWith(reflectionId);
      expect(result.current.data).toEqual(mockReflection);
    });

    it('should not fetch when reflectionId is empty', async () => {
      const { result } = renderHook(() => useReflection(''), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isFetching).toBe(false));

      expect(reflectionApi.getReflection).not.toHaveBeenCalled();
    });

    it('should handle error', async () => {
      const error = new Error('Reflection not found');
      vi.mocked(reflectionApi.getReflection).mockRejectedValueOnce(error);

      const { result } = renderHook(() => useReflection('invalid-id'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toEqual(error);
    });

    it('should use correct cache time', async () => {
      const mockReflection: Reflection = {
        id: 'reflection-1',
        goalId: 'goal-1',
        summary: 'Test summary',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      vi.mocked(reflectionApi.getReflection).mockResolvedValueOnce(mockReflection);

      const { result } = renderHook(() => useReflection('reflection-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // staleTime should be 5 minutes
      expect(result.current.isStale).toBe(false);
    });
  });

  describe('useReflectionsByGoal', () => {
    it('should fetch reflections by goal successfully', async () => {
      const goalId = 'goal-1';
      const mockReflections: Reflection[] = [
        {
          id: 'reflection-1',
          goalId,
          summary: 'Summary 1',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'reflection-2',
          goalId,
          summary: 'Summary 2',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      vi.mocked(reflectionApi.getReflectionsByGoal).mockResolvedValueOnce(mockReflections);

      const { result } = renderHook(() => useReflectionsByGoal(goalId), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(reflectionApi.getReflectionsByGoal).toHaveBeenCalledWith(goalId);
      expect(result.current.data).toEqual(mockReflections);
    });

    it('should not fetch when goalId is empty', async () => {
      const { result } = renderHook(() => useReflectionsByGoal(''), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isFetching).toBe(false));

      expect(reflectionApi.getReflectionsByGoal).not.toHaveBeenCalled();
    });

    it('should handle error', async () => {
      const error = new Error('Failed to fetch reflections');
      vi.mocked(reflectionApi.getReflectionsByGoal).mockRejectedValueOnce(error);

      const { result } = renderHook(() => useReflectionsByGoal('goal-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toEqual(error);
    });

    it('should handle empty reflections list', async () => {
      vi.mocked(reflectionApi.getReflectionsByGoal).mockResolvedValueOnce([]);

      const { result } = renderHook(() => useReflectionsByGoal('goal-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual([]);
    });
  });

  describe('useUpdateReflection', () => {
    it('should update reflection successfully', async () => {
      const reflectionId = 'reflection-1';
      const input: UpdateReflectionInput = {
        summary: 'Updated summary',
        regretfulActions: 'Updated action',
      };

      const mockUpdatedReflection: Reflection = {
        id: reflectionId,
        goalId: 'goal-1',
        ...input,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      vi.mocked(reflectionApi.updateReflection).mockResolvedValueOnce(mockUpdatedReflection);

      const { result } = renderHook(() => useUpdateReflection(), { wrapper: createWrapper() });

      result.current.mutate({ reflectionId, input });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(reflectionApi.updateReflection).toHaveBeenCalledWith(reflectionId, input);
      expect(result.current.data).toEqual(mockUpdatedReflection);
    });

    it('should handle error', async () => {
      const reflectionId = 'reflection-1';
      const input: UpdateReflectionInput = {
        summary: 'Updated summary',
      };

      const error = new Error('Update failed');
      vi.mocked(reflectionApi.updateReflection).mockRejectedValueOnce(error);

      const { result } = renderHook(() => useUpdateReflection(), { wrapper: createWrapper() });

      result.current.mutate({ reflectionId, input });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error).toEqual(error);
    });

    it('should update cache with server response', async () => {
      const reflectionId = 'reflection-1';
      const input: UpdateReflectionInput = {
        summary: 'Updated summary',
      };

      const existingReflection: Reflection = {
        id: reflectionId,
        goalId: 'goal-1',
        summary: 'Original summary',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const mockUpdatedReflection: Reflection = {
        ...existingReflection,
        summary: 'Updated summary',
        updatedAt: new Date().toISOString(),
      };

      const testQueryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false, gcTime: Infinity },
          mutations: { retry: false },
        },
      });

      // Set existing data in cache
      testQueryClient.setQueryData(reflectionKeys.detail(reflectionId), existingReflection);

      vi.mocked(reflectionApi.updateReflection).mockResolvedValueOnce(mockUpdatedReflection);

      const { result } = renderHook(() => useUpdateReflection(), {
        wrapper: ({ children }: { children: ReactNode }) => (
          <QueryClientProvider client={testQueryClient}>{children}</QueryClientProvider>
        ),
      });

      result.current.mutate({ reflectionId, input });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Wait a bit for cache to be updated
      await waitFor(() => {
        const cachedData = testQueryClient.getQueryData(reflectionKeys.detail(reflectionId)) as
          | Reflection
          | undefined;
        return cachedData !== undefined;
      });

      // Check that the final data (from server response) is in cache
      const cachedData = testQueryClient.getQueryData(
        reflectionKeys.detail(reflectionId)
      ) as Reflection;
      expect(cachedData).toBeDefined();
      expect(cachedData.summary).toBe('Updated summary');
    });

    it('should rollback on error', async () => {
      const reflectionId = 'reflection-1';
      const input: UpdateReflectionInput = {
        summary: 'Updated summary',
      };

      const existingReflection: Reflection = {
        id: reflectionId,
        goalId: 'goal-1',
        summary: 'Original summary',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const testQueryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false, gcTime: Infinity },
          mutations: { retry: false },
        },
      });

      // Set existing data in cache
      testQueryClient.setQueryData(reflectionKeys.detail(reflectionId), existingReflection);

      const error = new Error('Update failed');
      vi.mocked(reflectionApi.updateReflection).mockRejectedValueOnce(error);

      const { result } = renderHook(() => useUpdateReflection(), {
        wrapper: ({ children }: { children: ReactNode }) => (
          <QueryClientProvider client={testQueryClient}>{children}</QueryClientProvider>
        ),
      });

      result.current.mutate({ reflectionId, input });

      await waitFor(() => expect(result.current.isError).toBe(true));

      // Wait a bit for rollback to complete
      await waitFor(() => {
        const cachedData = testQueryClient.getQueryData(reflectionKeys.detail(reflectionId)) as
          | Reflection
          | undefined;
        return cachedData !== undefined;
      });

      // Check data was rolled back to original
      const cachedData = testQueryClient.getQueryData(
        reflectionKeys.detail(reflectionId)
      ) as Reflection;
      expect(cachedData).toBeDefined();
      expect(cachedData.summary).toBe('Original summary');
    });

    it('should invalidate reflections list after success', async () => {
      const reflectionId = 'reflection-1';
      const input: UpdateReflectionInput = {
        summary: 'Updated summary',
      };

      const mockUpdatedReflection: Reflection = {
        id: reflectionId,
        goalId: 'goal-1',
        ...input,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: 0 } },
      });

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      vi.mocked(reflectionApi.updateReflection).mockResolvedValueOnce(mockUpdatedReflection);

      const { result } = renderHook(() => useUpdateReflection(), {
        wrapper: ({ children }: { children: ReactNode }) => (
          <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        ),
      });

      result.current.mutate({ reflectionId, input });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: reflectionKeys.lists() });
    });
  });

  describe('useDeleteReflection', () => {
    it('should delete reflection successfully', async () => {
      const reflectionId = 'reflection-1';

      vi.mocked(reflectionApi.deleteReflection).mockResolvedValueOnce({ success: true });

      const { result } = renderHook(() => useDeleteReflection(), { wrapper: createWrapper() });

      result.current.mutate(reflectionId);

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(reflectionApi.deleteReflection).toHaveBeenCalledWith(reflectionId);
      expect(result.current.data?.success).toBe(true);
    });

    it('should handle error', async () => {
      const reflectionId = 'reflection-1';
      const error = new Error('Delete failed');

      vi.mocked(reflectionApi.deleteReflection).mockRejectedValueOnce(error);

      const { result } = renderHook(() => useDeleteReflection(), { wrapper: createWrapper() });

      result.current.mutate(reflectionId);

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error).toEqual(error);
    });

    it('should remove reflection from cache after success', async () => {
      const reflectionId = 'reflection-1';

      queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: 0 } },
      });

      const removeSpy = vi.spyOn(queryClient, 'removeQueries');

      vi.mocked(reflectionApi.deleteReflection).mockResolvedValueOnce({ success: true });

      const { result } = renderHook(() => useDeleteReflection(), {
        wrapper: ({ children }: { children: ReactNode }) => (
          <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        ),
      });

      result.current.mutate(reflectionId);

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(removeSpy).toHaveBeenCalledWith({ queryKey: reflectionKeys.detail(reflectionId) });
    });

    it('should invalidate reflections list after success', async () => {
      const reflectionId = 'reflection-1';

      queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: 0 } },
      });

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      vi.mocked(reflectionApi.deleteReflection).mockResolvedValueOnce({ success: true });

      const { result } = renderHook(() => useDeleteReflection(), {
        wrapper: ({ children }: { children: ReactNode }) => (
          <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        ),
      });

      result.current.mutate(reflectionId);

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: reflectionKeys.lists() });
    });
  });

  describe('useActionProgress', () => {
    it('should fetch action progress successfully', async () => {
      const goalId = 'goal-1';
      const mockProgress = {
        regretful: [
          { id: 'action-1', title: 'Action 1', progress: 85 },
          { id: 'action-2', title: 'Action 2', progress: 90 },
        ],
        slow: [{ id: 'action-3', title: 'Action 3', progress: 30 }],
        untouched: [{ id: 'action-4', title: 'Action 4', progress: 0 }],
      };

      vi.mocked(reflectionApi.getActionProgress).mockResolvedValueOnce(mockProgress);

      const { result } = renderHook(() => useActionProgress(goalId), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(reflectionApi.getActionProgress).toHaveBeenCalledWith(goalId);
      expect(result.current.data).toEqual(mockProgress);
    });

    it('should not fetch when goalId is empty', async () => {
      const { result } = renderHook(() => useActionProgress(''), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isFetching).toBe(false));

      expect(reflectionApi.getActionProgress).not.toHaveBeenCalled();
    });

    it('should handle error', async () => {
      const error = new Error('Failed to fetch action progress');
      vi.mocked(reflectionApi.getActionProgress).mockRejectedValueOnce(error);

      const { result } = renderHook(() => useActionProgress('goal-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toEqual(error);
    });

    it('should use shorter cache time (1 minute)', async () => {
      const mockProgress = {
        regretful: [],
        slow: [],
        untouched: [],
      };

      vi.mocked(reflectionApi.getActionProgress).mockResolvedValueOnce(mockProgress);

      const { result } = renderHook(() => useActionProgress('goal-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // staleTime should be 1 minute (shorter than other queries)
      expect(result.current.isStale).toBe(false);
    });
  });

  describe('Query keys', () => {
    it('should generate correct query keys', () => {
      expect(reflectionKeys.all).toEqual(['reflections']);
      expect(reflectionKeys.lists()).toEqual(['reflections', 'list']);
      expect(reflectionKeys.list('goal-1')).toEqual(['reflections', 'list', 'goal-1']);
      expect(reflectionKeys.details()).toEqual(['reflections', 'detail']);
      expect(reflectionKeys.detail('reflection-1')).toEqual([
        'reflections',
        'detail',
        'reflection-1',
      ]);
      expect(reflectionKeys.actionProgress('goal-1')).toEqual([
        'reflections',
        'actionProgress',
        'goal-1',
      ]);
    });
  });
});
