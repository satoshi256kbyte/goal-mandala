/**
 * サブ目標API クライアントのテスト
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { subGoalApiClient } from './subgoal-api';
import { apiClient } from './api-client';
import type { SubGoal } from '../types/mandala';
import type {
  GetSubGoalsResponse,
  UpdateSubGoalRequest,
  UpdateSubGoalResponse,
  ReorderSubGoalsResponse,
  BulkUpdateSubGoalsResponse,
} from '../types/subgoal-action-api';

// apiClientをモック
vi.mock('./api-client', () => ({
  apiClient: {
    get: vi.fn(),
    put: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockApiClient = vi.mocked(apiClient);

describe('SubGoalApiClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('getSubGoals', () => {
    it('サブ目標一覧を正常に取得できる', async () => {
      const goalId = 'goal-123';
      const mockResponse: GetSubGoalsResponse = {
        subGoals: [
          {
            id: 'subgoal-1',
            goal_id: goalId,
            title: 'サブ目標1',
            description: '説明1',
            background: '背景1',
            position: 0,
            progress: 50,
          },
          {
            id: 'subgoal-2',
            goal_id: goalId,
            title: 'サブ目標2',
            description: '説明2',
            background: '背景2',
            position: 1,
            progress: 75,
          },
        ],
        total: 2,
      };

      mockApiClient.get.mockResolvedValue({ data: mockResponse });

      const result = await subGoalApiClient.getSubGoals(goalId);

      expect(mockApiClient.get).toHaveBeenCalledWith(`/goals/${goalId}/subgoals`);
      expect(result).toEqual(mockResponse);
    });

    it('APIエラー時に適切なエラーを投げる', async () => {
      const goalId = 'goal-123';
      const mockError = {
        response: {
          data: {
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: '目標が見つかりません',
            },
          },
        },
      };

      mockApiClient.get.mockRejectedValue(mockError);

      await expect(subGoalApiClient.getSubGoals(goalId)).rejects.toThrow('目標が見つかりません');
    });
  });

  describe('updateSubGoal', () => {
    it('サブ目標を正常に更新できる', async () => {
      const subGoalId = 'subgoal-123';
      const updateData: UpdateSubGoalRequest = {
        title: '更新されたタイトル',
        description: '更新された説明',
        background: '更新された背景',
        position: 0,
      };

      const mockResponse: UpdateSubGoalResponse = {
        success: true,
        subGoal: {
          id: subGoalId,
          goal_id: 'goal-123',
          title: updateData.title,
          description: updateData.description,
          background: updateData.background,
          position: updateData.position,
          progress: 50,
        },
      };

      mockApiClient.put.mockResolvedValue({ data: mockResponse });

      const result = await subGoalApiClient.updateSubGoal(subGoalId, updateData);

      expect(mockApiClient.put).toHaveBeenCalledWith(`/subgoals/${subGoalId}`, updateData);
      expect(result).toEqual(mockResponse);
    });

    it('バリデーションエラー時に適切なエラーメッセージを返す', async () => {
      const subGoalId = 'subgoal-123';
      const updateData: UpdateSubGoalRequest = {
        title: '',
        description: '説明',
        background: '背景',
        position: 0,
      };

      const mockError = {
        response: {
          data: {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'バリデーションエラー',
              details: {
                validationErrors: [
                  {
                    field: 'title',
                    message: 'タイトルは必須です',
                    code: 'REQUIRED',
                  },
                ],
              },
            },
          },
        },
      };

      mockApiClient.put.mockRejectedValue(mockError);

      await expect(subGoalApiClient.updateSubGoal(subGoalId, updateData)).rejects.toThrow(
        '入力エラー: タイトルは必須です'
      );
    });
  });

  describe('reorderSubGoals', () => {
    it('サブ目標の並び替えを正常に実行できる', async () => {
      const goalId = 'goal-123';
      const reorderData = {
        subGoals: [
          { id: 'subgoal-1', position: 1 },
          { id: 'subgoal-2', position: 0 },
        ],
      };

      const mockResponse: ReorderSubGoalsResponse = {
        success: true,
        subGoals: [
          {
            id: 'subgoal-2',
            goal_id: goalId,
            title: 'サブ目標2',
            description: '説明2',
            background: '背景2',
            position: 0,
            progress: 75,
          },
          {
            id: 'subgoal-1',
            goal_id: goalId,
            title: 'サブ目標1',
            description: '説明1',
            background: '背景1',
            position: 1,
            progress: 50,
          },
        ],
      };

      mockApiClient.put.mockResolvedValue({ data: mockResponse });

      const result = await subGoalApiClient.reorderSubGoals(goalId, reorderData);

      expect(mockApiClient.put).toHaveBeenCalledWith(
        `/goals/${goalId}/subgoals/reorder`,
        reorderData
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('bulkUpdateSubGoals', () => {
    it('サブ目標の一括更新を正常に実行できる', async () => {
      const goalId = 'goal-123';
      const bulkUpdateData = {
        updates: [
          {
            id: 'subgoal-1',
            changes: { title: '一括更新されたタイトル1' },
          },
          {
            id: 'subgoal-2',
            changes: { title: '一括更新されたタイトル2' },
          },
        ],
        deletes: ['subgoal-3'],
      };

      const mockResponse: BulkUpdateSubGoalsResponse = {
        success: true,
        updated: [
          {
            id: 'subgoal-1',
            goal_id: goalId,
            title: '一括更新されたタイトル1',
            description: '説明1',
            background: '背景1',
            position: 0,
            progress: 50,
          },
          {
            id: 'subgoal-2',
            goal_id: goalId,
            title: '一括更新されたタイトル2',
            description: '説明2',
            background: '背景2',
            position: 1,
            progress: 75,
          },
        ],
        deleted: ['subgoal-3'],
      };

      mockApiClient.post.mockResolvedValue({ data: mockResponse });

      const result = await subGoalApiClient.bulkUpdateSubGoals(goalId, bulkUpdateData);

      expect(mockApiClient.post).toHaveBeenCalledWith(
        `/goals/${goalId}/subgoals/bulk-update`,
        bulkUpdateData
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('saveDraft', () => {
    it('下書きを正常に保存できる', async () => {
      const draftData = {
        goalId: 'goal-123',
        subGoals: [
          {
            id: 'subgoal-1',
            title: '下書きタイトル',
            description: '下書き説明',
          },
        ],
      };

      const mockResponse = {
        success: true,
        draftId: 'draft-123',
        savedAt: '2024-01-01T00:00:00Z',
      };

      mockApiClient.post.mockResolvedValue({ data: mockResponse });

      const result = await subGoalApiClient.saveDraft(draftData);

      expect(mockApiClient.post).toHaveBeenCalledWith('/drafts/subgoals', draftData);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getDraft', () => {
    it('下書きを正常に取得できる', async () => {
      const goalId = 'goal-123';
      const mockResponse = {
        success: true,
        draftData: [
          {
            id: 'subgoal-1',
            title: '下書きタイトル',
            description: '下書き説明',
          },
        ],
        savedAt: '2024-01-01T00:00:00Z',
      };

      mockApiClient.get.mockResolvedValue({ data: mockResponse });

      const result = await subGoalApiClient.getDraft(goalId);

      expect(mockApiClient.get).toHaveBeenCalledWith(`/drafts/subgoals/${goalId}`);
      expect(result).toEqual(mockResponse);
    });
  });
});

describe('subGoalApiService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('reorderSubGoals', () => {
    it('SubGoal配列から適切なリクエストデータを生成する', async () => {
      const goalId = 'goal-123';
      const subGoals: SubGoal[] = [
        {
          id: 'subgoal-1',
          goal_id: goalId,
          title: 'サブ目標1',
          description: '説明1',
          background: '背景1',
          position: 1,
          progress: 50,
        },
        {
          id: 'subgoal-2',
          goal_id: goalId,
          title: 'サブ目標2',
          description: '説明2',
          background: '背景2',
          position: 0,
          progress: 75,
        },
      ];

      const mockResponse: ReorderSubGoalsResponse = {
        success: true,
        subGoals: subGoals,
      };

      mockApiClient.put.mockResolvedValue({ data: mockResponse });

      const result = await subGoalApiService.reorderSubGoals(goalId, subGoals);

      expect(mockApiClient.put).toHaveBeenCalledWith(`/goals/${goalId}/subgoals/reorder`, {
        subGoals: [
          { id: 'subgoal-1', position: 1 },
          { id: 'subgoal-2', position: 0 },
        ],
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('bulkUpdateSubGoals', () => {
    it('更新と削除のデータを適切に処理する', async () => {
      const goalId = 'goal-123';
      const updates = [{ id: 'subgoal-1', changes: { title: '新しいタイトル' } }];
      const deletes = ['subgoal-2'];

      const mockResponse: BulkUpdateSubGoalsResponse = {
        success: true,
        updated: [],
        deleted: deletes,
      };

      mockApiClient.post.mockResolvedValue({ data: mockResponse });

      const result = await subGoalApiService.bulkUpdateSubGoals(goalId, updates, deletes);

      expect(mockApiClient.post).toHaveBeenCalledWith(`/goals/${goalId}/subgoals/bulk-update`, {
        updates,
        deletes,
      });
      expect(result).toEqual(mockResponse);
    });
  });
});
