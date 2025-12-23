import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { actionApiClient } from '../action-api';
import type { Action } from '../../types/mandala';

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

describe('ActionApiClient', () => {
  const mockAction: Action = {
    id: 'action-1',
    subGoalId: 'subgoal-1',
    title: 'Test Action',
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

  describe('getActions', () => {
    it('should get actions by goal id', async () => {
      const mockResponse = {
        success: true,
        data: { actions: [mockAction] },
      };

      vi.mocked(apiClient.get).mockResolvedValueOnce({
        data: mockResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
      });

      const result = await actionApiClient.getActions('goal-1');

      expect(apiClient.get).toHaveBeenCalledWith('/goals/goal-1/actions');
      expect(result).toEqual(mockResponse);
    });

    it('should handle error when fetching actions', async () => {
      vi.mocked(apiClient.get).mockRejectedValueOnce({
        response: { status: 404 },
        message: 'Not found',
      });

      await expect(actionApiClient.getActions('invalid-id')).rejects.toThrow();
    });
  });

  describe('getActionsBySubGoal', () => {
    it('should get actions by subgoal id', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({
        data: { actions: [mockAction] },
        status: 200,
        statusText: 'OK',
        headers: {},
      });

      const result = await actionApiClient.getActionsBySubGoal('subgoal-1');

      expect(apiClient.get).toHaveBeenCalledWith('/subgoals/subgoal-1/actions');
      expect(result).toEqual([mockAction]);
    });
  });

  describe('updateAction', () => {
    it('should update action successfully', async () => {
      const updateData = {
        title: 'Updated Action',
        description: 'Updated description',
      };

      const mockResponse = {
        success: true,
        data: { action: { ...mockAction, ...updateData } },
      };

      vi.mocked(apiClient.put).mockResolvedValueOnce({
        data: mockResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
      });

      const result = await actionApiClient.updateAction('action-1', updateData);

      expect(apiClient.put).toHaveBeenCalledWith('/actions/action-1', updateData);
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

      await expect(actionApiClient.updateAction('action-1', { title: '' })).rejects.toThrow(
        '入力エラー'
      );
    });
  });

  describe('reorderActions', () => {
    it('should reorder actions successfully', async () => {
      const reorderData = {
        actions: [
          { id: 'action-1', position: 2 },
          { id: 'action-2', position: 1 },
        ],
      };

      const mockResponse = {
        success: true,
        data: { actions: [mockAction] },
      };

      vi.mocked(apiClient.put).mockResolvedValueOnce({
        data: mockResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
      });

      const result = await actionApiClient.reorderActions('subgoal-1', reorderData);

      expect(apiClient.put).toHaveBeenCalledWith(
        '/subgoals/subgoal-1/actions/reorder',
        reorderData
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('bulkUpdateActions', () => {
    it('should bulk update actions successfully', async () => {
      const bulkData = {
        updates: [
          { id: 'action-1', changes: { title: 'Updated 1' } },
          { id: 'action-2', changes: { title: 'Updated 2' } },
        ],
        deletes: ['action-3'],
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

      const result = await actionApiClient.bulkUpdateActions('goal-1', bulkData);

      expect(apiClient.post).toHaveBeenCalledWith('/goals/goal-1/actions/bulk-update', bulkData);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('Draft operations', () => {
    it('should save draft successfully', async () => {
      const draftData = {
        goalId: 'goal-1',
        actions: [{ title: 'Draft Action' }],
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

      const result = await actionApiClient.saveDraft(draftData);

      expect(apiClient.post).toHaveBeenCalledWith('/drafts/actions', draftData);
      expect(result).toEqual(mockResponse);
    });

    it('should get draft successfully', async () => {
      const mockResponse = {
        success: true,
        data: { actions: [mockAction] },
      };

      vi.mocked(apiClient.get).mockResolvedValueOnce({
        data: mockResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
      });

      const result = await actionApiClient.getDraft('goal-1');

      expect(apiClient.get).toHaveBeenCalledWith('/drafts/actions/goal-1');
      expect(result).toEqual(mockResponse);
    });

    it('should delete draft successfully', async () => {
      vi.mocked(apiClient.delete).mockResolvedValueOnce({
        data: { success: true },
        status: 200,
        statusText: 'OK',
        headers: {},
      });

      const result = await actionApiClient.deleteDraft('goal-1');

      expect(apiClient.delete).toHaveBeenCalledWith('/drafts/actions/goal-1');
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

      await expect(actionApiClient.getActions('goal-1')).rejects.toThrow('ネットワークエラー');
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

      await expect(actionApiClient.getActions('goal-1')).rejects.toThrow('Server error');
    });

    it('should handle unknown error', async () => {
      vi.mocked(apiClient.get).mockRejectedValueOnce(new Error('Unknown error'));

      await expect(actionApiClient.getActions('goal-1')).rejects.toThrow('Unknown error');
    });
  });
});
