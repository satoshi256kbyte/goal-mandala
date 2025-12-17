import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { reflectionApi } from '../reflectionApi';
import type {
  Reflection,
  CreateReflectionInput,
  UpdateReflectionInput,
} from '../../types/reflection';

// Mock apiClient
vi.mock('../api-client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

import { apiClient } from '../api-client';

describe('ReflectionApiClient', () => {
  const mockReflection: Reflection = {
    id: 'reflection-1',
    goalId: 'goal-1',
    userId: 'user-1',
    summary: 'Test summary',
    regrettableActions: ['action-1'],
    slowProgressActions: ['action-2'],
    notStartedActions: ['action-3'],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('createReflection', () => {
    it('should create reflection successfully', async () => {
      const input: CreateReflectionInput = {
        goalId: 'goal-1',
        summary: 'Test summary',
        regrettableActions: ['action-1'],
        slowProgressActions: ['action-2'],
        notStartedActions: ['action-3'],
      };

      vi.mocked(apiClient.post).mockResolvedValueOnce({
        data: { success: true, data: { reflection: mockReflection } },
        status: 201,
        statusText: 'Created',
        headers: {},
      });

      const result = await reflectionApi.createReflection(input);

      expect(apiClient.post).toHaveBeenCalledWith('/reflections', input);
      expect(result).toEqual(mockReflection);
    });

    it('should retry on network error', async () => {
      vi.useRealTimers();

      const input: CreateReflectionInput = {
        goalId: 'goal-1',
        summary: 'Test summary',
      };

      vi.mocked(apiClient.post)
        .mockRejectedValueOnce({ message: 'Network error' })
        .mockRejectedValueOnce({ message: 'Network error' })
        .mockResolvedValueOnce({
          data: { success: true, data: { reflection: mockReflection } },
          status: 201,
          statusText: 'Created',
          headers: {},
        });

      const result = await reflectionApi.createReflection(input);

      expect(apiClient.post).toHaveBeenCalledTimes(3);
      expect(result).toEqual(mockReflection);
    }, 10000);

    it('should not retry on client error', async () => {
      const input: CreateReflectionInput = {
        goalId: 'goal-1',
        summary: 'Test summary',
      };

      vi.mocked(apiClient.post).mockRejectedValueOnce({
        response: { status: 400 },
        message: 'Bad request',
      });

      await expect(reflectionApi.createReflection(input)).rejects.toThrow();
      expect(apiClient.post).toHaveBeenCalledTimes(1);
    });
  });

  describe('getReflection', () => {
    it('should get reflection by id', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({
        data: { success: true, data: { reflection: mockReflection } },
        status: 200,
        statusText: 'OK',
        headers: {},
      });

      const result = await reflectionApi.getReflection('reflection-1');

      expect(apiClient.get).toHaveBeenCalledWith('/reflections/reflection-1');
      expect(result).toEqual(mockReflection);
    });

    it('should handle not found error', async () => {
      vi.mocked(apiClient.get).mockRejectedValueOnce({
        response: { status: 404 },
        message: 'Not found',
      });

      await expect(reflectionApi.getReflection('invalid-id')).rejects.toThrow();
    });
  });

  describe('getReflectionsByGoal', () => {
    it('should get reflections by goal id', async () => {
      const mockReflections = [mockReflection];

      vi.mocked(apiClient.get).mockResolvedValueOnce({
        data: { success: true, data: { reflections: mockReflections, total: 1 } },
        status: 200,
        statusText: 'OK',
        headers: {},
      });

      const result = await reflectionApi.getReflectionsByGoal('goal-1');

      expect(apiClient.get).toHaveBeenCalledWith('/goals/goal-1/reflections');
      expect(result).toEqual(mockReflections);
    });

    it('should return empty array when no reflections found', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({
        data: { success: true, data: { reflections: [], total: 0 } },
        status: 200,
        statusText: 'OK',
        headers: {},
      });

      const result = await reflectionApi.getReflectionsByGoal('goal-1');

      expect(result).toEqual([]);
    });
  });

  describe('updateReflection', () => {
    it('should update reflection successfully', async () => {
      const input: UpdateReflectionInput = {
        summary: 'Updated summary',
      };

      const updatedReflection = { ...mockReflection, summary: 'Updated summary' };

      vi.mocked(apiClient.put).mockResolvedValueOnce({
        data: { success: true, data: { reflection: updatedReflection } },
        status: 200,
        statusText: 'OK',
        headers: {},
      });

      const result = await reflectionApi.updateReflection('reflection-1', input);

      expect(apiClient.put).toHaveBeenCalledWith('/reflections/reflection-1', input);
      expect(result).toEqual(updatedReflection);
    });

    it('should handle validation error', async () => {
      const input: UpdateReflectionInput = {
        summary: '',
      };

      vi.mocked(apiClient.put).mockRejectedValueOnce({
        response: { status: 400 },
        message: 'Validation error',
      });

      await expect(reflectionApi.updateReflection('reflection-1', input)).rejects.toThrow();
    });
  });

  describe('deleteReflection', () => {
    it('should delete reflection successfully', async () => {
      vi.mocked(apiClient.delete).mockResolvedValueOnce({
        data: { success: true, message: 'Deleted' },
        status: 200,
        statusText: 'OK',
        headers: {},
      });

      const result = await reflectionApi.deleteReflection('reflection-1');

      expect(apiClient.delete).toHaveBeenCalledWith('/reflections/reflection-1');
      expect(result).toBe(true);
    });

    it('should handle delete error', async () => {
      vi.mocked(apiClient.delete).mockRejectedValueOnce({
        response: { status: 404 },
        message: 'Not found',
      });

      await expect(reflectionApi.deleteReflection('invalid-id')).rejects.toThrow();
    });
  });

  describe('getActionProgress', () => {
    it('should get action progress by goal id', async () => {
      const mockProgress = {
        regrettable: [{ id: 'action-1', title: 'Action 1', progress: 50 }],
        slowProgress: [{ id: 'action-2', title: 'Action 2', progress: 30 }],
        notStarted: [{ id: 'action-3', title: 'Action 3', progress: 0 }],
      };

      vi.mocked(apiClient.get).mockResolvedValueOnce({
        data: { success: true, data: mockProgress },
        status: 200,
        statusText: 'OK',
        headers: {},
      });

      const result = await reflectionApi.getActionProgress('goal-1');

      expect(apiClient.get).toHaveBeenCalledWith('/goals/goal-1/action-progress');
      expect(result).toEqual(mockProgress);
    });
  });

  describe('Retry logic with exponential backoff', () => {
    it('should use exponential backoff for retries', async () => {
      vi.useRealTimers();

      const input: CreateReflectionInput = {
        goalId: 'goal-1',
        summary: 'Test summary',
      };

      vi.mocked(apiClient.post)
        .mockRejectedValueOnce({ message: 'Network error' })
        .mockRejectedValueOnce({ message: 'Network error' })
        .mockRejectedValueOnce({ message: 'Network error' })
        .mockResolvedValueOnce({
          data: { success: true, data: { reflection: mockReflection } },
          status: 201,
          statusText: 'Created',
          headers: {},
        });

      const result = await reflectionApi.createReflection(input);
      expect(result).toEqual(mockReflection);
    }, 15000);
  });

  describe('Error handling', () => {
    it('should handle 500 error with retry', async () => {
      const input: CreateReflectionInput = {
        goalId: 'goal-1',
        summary: 'Test summary',
      };

      vi.mocked(apiClient.post)
        .mockRejectedValueOnce({ response: { status: 500 }, message: 'Server error' })
        .mockResolvedValueOnce({
          data: { success: true, data: { reflection: mockReflection } },
          status: 201,
          statusText: 'Created',
          headers: {},
        });

      const result = await reflectionApi.createReflection(input);

      expect(apiClient.post).toHaveBeenCalledTimes(2);
      expect(result).toEqual(mockReflection);
    });

    it('should handle timeout error with retry', async () => {
      const input: CreateReflectionInput = {
        goalId: 'goal-1',
        summary: 'Test summary',
      };

      vi.mocked(apiClient.post)
        .mockRejectedValueOnce({ code: 'ECONNABORTED', message: 'Timeout' })
        .mockResolvedValueOnce({
          data: { success: true, data: { reflection: mockReflection } },
          status: 201,
          statusText: 'Created',
          headers: {},
        });

      const result = await reflectionApi.createReflection(input);

      expect(apiClient.post).toHaveBeenCalledTimes(2);
      expect(result).toEqual(mockReflection);
    });

    it('should throw error after max retries', async () => {
      vi.useRealTimers();

      const input: CreateReflectionInput = {
        goalId: 'goal-1',
        summary: 'Test summary',
      };

      vi.mocked(apiClient.post).mockRejectedValue({
        message: 'Network error',
      });

      await expect(reflectionApi.createReflection(input)).rejects.toThrow();
      expect(apiClient.post).toHaveBeenCalledTimes(4); // 初回 + 3回リトライ
    }, 15000);
  });
});
