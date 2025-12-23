import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { subGoalApiClient } from '../subgoal-api';
import type { SubGoal } from '../../types/mandala';

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

describe('SubGoalApiClient', () => {
  const mockSubGoal: SubGoal = {
    id: 'subgoal-1',
    goalId: 'goal-1',
    title: 'Test SubGoal',
    description: 'Test description',
    position: 1,
    status: 'not_started',
    progress: 0,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getSubGoals', () => {
    it('should get subgoals by goal id', async () => {
      const mockResponse = {
        success: true,
        data: { subGoals: [mockSubGoal] },
      };

      vi.mocked(apiClient.get).mockResolvedValueOnce({
        data: mockResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
      });

      const result = await subGoalApiClient.getSubGoals('goal-1');

      expect(apiClient.get).toHaveBeenCalledWith('/goals/goal-1/subgoals');
      expect(result).toEqual(mockResponse);
    });

    it('should handle error when fetching subgoals', async () => {
      vi.mocked(apiClient.get).mockRejectedValueOnce({
        response: { status: 404 },
        message: 'Not found',
      });

      await expect(subGoalApiClient.getSubGoals('invalid-id')).rejects.toThrow();
    });
  });

  describe('updateSubGoal', () => {
    it('should update subgoal successfully', async () => {
      const updateData = {
        title: 'Updated SubGoal',
        description: 'Updated description',
      };

      const mockResponse = {
        success: true,
        data: { subGoal: { ...mockSubGoal, ...updateData } },
      };

      vi.mocked(apiClient.put).mockResolvedValueOnce({
        data: mockResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
      });

      const result = await subGoalApiClient.updateSubGoal('subgoal-1', updateData);

      expect(apiClient.put).toHaveBeenCalledWith('/subgoals/subgoal-1', updateData);
      expect(result).toEqual(mockResponse);
    });

    it('should handle validation error', async () => {
      vi.mocked(apiClient.put).mockRejectedValueOnce({
        response: {
          data: {
            error: {
              code: 'VALIDATION_ERROR',
              details: {
                validationErrors: [{ message: 'Title is required' }],
              },
            },
          },
        },
      });

      await expect(subGoalApiClient.updateSubGoal('subgoal-1', { title: '' })).rejects.toThrow(
        '入力エラー'
      );
    });
  });

  describe('reorderSubGoals', () => {
    it('should reorder subgoals successfully', async () => {
      const reorderData = {
        subGoals: [
          { id: 'subgoal-1', position: 2 },
          { id: 'subgoal-2', position: 1 },
        ],
      };

      const mockResponse = {
        success: true,
        data: { subGoals: [mockSubGoal] },
      };

      vi.mocked(apiClient.put).mockResolvedValueOnce({
        data: mockResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
      });

      const result = await subGoalApiClient.reorderSubGoals('goal-1', reorderData);

      expect(apiClient.put).toHaveBeenCalledWith('/goals/goal-1/subgoals/reorder', reorderData);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('bulkUpdateSubGoals', () => {
    it('should bulk update subgoals successfully', async () => {
      const bulkData = {
        updates: [
          { id: 'subgoal-1', changes: { title: 'Updated 1' } },
          { id: 'subgoal-2', changes: { title: 'Updated 2' } },
        ],
        deletes: ['subgoal-3'],
      };

      const mockResponse = {
        success: true,
        data: { updated: 2, deleted: 1 },
      };

      vi.mocked(apiClient.post).mockResolvedValueOnce({
        data: mockResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
      });

      const result = await subGoalApiClient.bulkUpdateSubGoals('goal-1', bulkData);

      expect(apiClient.post).toHaveBeenCalledWith('/goals/goal-1/subgoals/bulk-update', bulkData);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('regenerateSubGoals', () => {
    it('should regenerate subgoals successfully', async () => {
      const regenerateData = {
        goalId: 'goal-1',
        preserveCustomizations: true,
      };

      const mockResponse = {
        success: true,
        data: { processingId: 'processing-1' },
      };

      vi.mocked(apiClient.post).mockResolvedValueOnce({
        data: mockResponse,
        status: 202,
        statusText: 'Accepted',
        headers: {},
      });

      const result = await subGoalApiClient.regenerateSubGoals(regenerateData);

      expect(apiClient.post).toHaveBeenCalledWith(
        '/goals/goal-1/subgoals/regenerate',
        regenerateData
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('Draft operations', () => {
    it('should save draft successfully', async () => {
      const draftData = {
        goalId: 'goal-1',
        subGoals: [{ title: 'Draft SubGoal' }],
      };

      const mockResponse = {
        success: true,
        data: { draftId: 'draft-1' },
      };

      vi.mocked(apiClient.post).mockResolvedValueOnce({
        data: mockResponse,
        status: 201,
        statusText: 'Created',
        headers: {},
      });

      const result = await subGoalApiClient.saveDraft(draftData);

      expect(apiClient.post).toHaveBeenCalledWith('/drafts/subgoals', draftData);
      expect(result).toEqual(mockResponse);
    });

    it('should get draft successfully', async () => {
      const mockResponse = {
        success: true,
        data: { subGoals: [mockSubGoal] },
      };

      vi.mocked(apiClient.get).mockResolvedValueOnce({
        data: mockResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
      });

      const result = await subGoalApiClient.getDraft('goal-1');

      expect(apiClient.get).toHaveBeenCalledWith('/drafts/subgoals/goal-1');
      expect(result).toEqual(mockResponse);
    });

    it('should delete draft successfully', async () => {
      vi.mocked(apiClient.delete).mockResolvedValueOnce({
        data: { success: true },
        status: 200,
        statusText: 'OK',
        headers: {},
      });

      const result = await subGoalApiClient.deleteDraft('goal-1');

      expect(apiClient.delete).toHaveBeenCalledWith('/drafts/subgoals/goal-1');
      expect(result).toEqual({ success: true });
    });
  });

  describe('Error handling', () => {
    it('should handle network error', async () => {
      vi.mocked(apiClient.get).mockRejectedValueOnce({
        code: 'ERR_NETWORK',
        retryable: true,
        message: 'Network error',
      });

      await expect(subGoalApiClient.getSubGoals('goal-1')).rejects.toThrow('ネットワークエラー');
    });

    it('should handle API error', async () => {
      vi.mocked(apiClient.get).mockRejectedValueOnce({
        response: {
          data: {
            error: {
              message: 'Server error',
            },
          },
        },
      });

      await expect(subGoalApiClient.getSubGoals('goal-1')).rejects.toThrow('Server error');
    });

    it('should handle unknown error', async () => {
      vi.mocked(apiClient.get).mockRejectedValueOnce(new Error('Unknown error'));

      await expect(subGoalApiClient.getSubGoals('goal-1')).rejects.toThrow('Unknown error');
    });
  });
});
