/**
 * アクションAPI クライアントのテスト
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { actionApiClient, actionApiService } from './action-api';
import { apiClient } from './api-client';
import type { Action, ActionType } from '../types/mandala';
import type {
  GetActionsResponse,
  UpdateActionRequest,
  UpdateActionResponse,
  ReorderActionsResponse,
  BulkUpdateActionsResponse,
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

describe('ActionApiClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('getActions', () => {
    it('アクション一覧を正常に取得できる', async () => {
      const goalId = 'goal-123';
      const mockResponse: GetActionsResponse = {
        actions: [
          {
            id: 'action-1',
            sub_goal_id: 'subgoal-1',
            title: 'アクション1',
            description: '説明1',
            background: '背景1',
            type: 'execution' as ActionType,
            position: 0,
            progress: 25,
          },
          {
            id: 'action-2',
            sub_goal_id: 'subgoal-1',
            title: 'アクション2',
            description: '説明2',
            background: '背景2',
            type: 'habit' as ActionType,
            position: 1,
            progress: 50,
          },
        ],
        total: 2,
        groupedBySubGoal: {
          'subgoal-1': [
            {
              id: 'action-1',
              sub_goal_id: 'subgoal-1',
              title: 'アクション1',
              description: '説明1',
              background: '背景1',
              type: 'execution' as ActionType,
              position: 0,
              progress: 25,
            },
            {
              id: 'action-2',
              sub_goal_id: 'subgoal-1',
              title: 'アクション2',
              description: '説明2',
              background: '背景2',
              type: 'habit' as ActionType,
              position: 1,
              progress: 50,
            },
          ],
        },
      };

      mockApiClient.get.mockResolvedValue({ data: mockResponse });

      const result = await actionApiClient.getActions(goalId);

      expect(mockApiClient.get).toHaveBeenCalledWith(`/goals/${goalId}/actions`);
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

      await expect(actionApiClient.getActions(goalId)).rejects.toThrow('目標が見つかりません');
    });
  });

  describe('getActionsBySubGoal', () => {
    it('サブ目標別アクション一覧を正常に取得できる', async () => {
      const subGoalId = 'subgoal-123';
      const mockActions: Action[] = [
        {
          id: 'action-1',
          sub_goal_id: subGoalId,
          title: 'アクション1',
          description: '説明1',
          background: '背景1',
          type: 'execution' as ActionType,
          position: 0,
          progress: 25,
        },
      ];

      mockApiClient.get.mockResolvedValue({ data: { actions: mockActions } });

      const result = await actionApiClient.getActionsBySubGoal(subGoalId);

      expect(mockApiClient.get).toHaveBeenCalledWith(`/subgoals/${subGoalId}/actions`);
      expect(result).toEqual(mockActions);
    });
  });

  describe('updateAction', () => {
    it('アクションを正常に更新できる', async () => {
      const actionId = 'action-123';
      const updateData: UpdateActionRequest = {
        title: '更新されたタイトル',
        description: '更新された説明',
        background: '更新された背景',
        type: 'execution' as ActionType,
        position: 0,
      };

      const mockResponse: UpdateActionResponse = {
        success: true,
        action: {
          id: actionId,
          sub_goal_id: 'subgoal-123',
          title: updateData.title,
          description: updateData.description,
          background: updateData.background,
          type: updateData.type,
          position: updateData.position,
          progress: 50,
        },
      };

      mockApiClient.put.mockResolvedValue({ data: mockResponse });

      const result = await actionApiClient.updateAction(actionId, updateData);

      expect(mockApiClient.put).toHaveBeenCalledWith(`/actions/${actionId}`, updateData);
      expect(result).toEqual(mockResponse);
    });

    it('バリデーションエラー時に適切なエラーメッセージを返す', async () => {
      const actionId = 'action-123';
      const updateData: UpdateActionRequest = {
        title: '',
        description: '説明',
        background: '背景',
        type: 'execution' as ActionType,
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

      await expect(actionApiClient.updateAction(actionId, updateData)).rejects.toThrow(
        '入力エラー: タイトルは必須です'
      );
    });
  });

  describe('reorderActions', () => {
    it('アクションの並び替えを正常に実行できる', async () => {
      const subGoalId = 'subgoal-123';
      const reorderData = {
        actions: [
          { id: 'action-1', position: 1 },
          { id: 'action-2', position: 0 },
        ],
      };

      const mockResponse: ReorderActionsResponse = {
        success: true,
        actions: [
          {
            id: 'action-2',
            sub_goal_id: subGoalId,
            title: 'アクション2',
            description: '説明2',
            background: '背景2',
            type: 'habit' as ActionType,
            position: 0,
            progress: 50,
          },
          {
            id: 'action-1',
            sub_goal_id: subGoalId,
            title: 'アクション1',
            description: '説明1',
            background: '背景1',
            type: 'execution' as ActionType,
            position: 1,
            progress: 25,
          },
        ],
      };

      mockApiClient.put.mockResolvedValue({ data: mockResponse });

      const result = await actionApiClient.reorderActions(subGoalId, reorderData);

      expect(mockApiClient.put).toHaveBeenCalledWith(
        `/subgoals/${subGoalId}/actions/reorder`,
        reorderData
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('bulkUpdateActions', () => {
    it('アクションの一括更新を正常に実行できる', async () => {
      const goalId = 'goal-123';
      const bulkUpdateData = {
        updates: [
          {
            id: 'action-1',
            changes: { title: '一括更新されたタイトル1' },
          },
          {
            id: 'action-2',
            changes: { title: '一括更新されたタイトル2' },
          },
        ],
        deletes: ['action-3'],
      };

      const mockResponse: BulkUpdateActionsResponse = {
        success: true,
        updated: [
          {
            id: 'action-1',
            sub_goal_id: 'subgoal-1',
            title: '一括更新されたタイトル1',
            description: '説明1',
            background: '背景1',
            type: 'execution' as ActionType,
            position: 0,
            progress: 25,
          },
          {
            id: 'action-2',
            sub_goal_id: 'subgoal-1',
            title: '一括更新されたタイトル2',
            description: '説明2',
            background: '背景2',
            type: 'habit' as ActionType,
            position: 1,
            progress: 50,
          },
        ],
        deleted: ['action-3'],
      };

      mockApiClient.post.mockResolvedValue({ data: mockResponse });

      const result = await actionApiClient.bulkUpdateActions(goalId, bulkUpdateData);

      expect(mockApiClient.post).toHaveBeenCalledWith(
        `/goals/${goalId}/actions/bulk-update`,
        bulkUpdateData
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('saveDraft', () => {
    it('下書きを正常に保存できる', async () => {
      const draftData = {
        goalId: 'goal-123',
        actions: [
          {
            id: 'action-1',
            title: '下書きタイトル',
            description: '下書き説明',
            type: 'execution' as ActionType,
          },
        ],
      };

      const mockResponse = {
        success: true,
        draftId: 'draft-123',
        savedAt: '2024-01-01T00:00:00Z',
      };

      mockApiClient.post.mockResolvedValue({ data: mockResponse });

      const result = await actionApiClient.saveDraft(draftData);

      expect(mockApiClient.post).toHaveBeenCalledWith('/drafts/actions', draftData);
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
            id: 'action-1',
            title: '下書きタイトル',
            description: '下書き説明',
            type: 'execution' as ActionType,
          },
        ],
        savedAt: '2024-01-01T00:00:00Z',
      };

      mockApiClient.get.mockResolvedValue({ data: mockResponse });

      const result = await actionApiClient.getDraft(goalId);

      expect(mockApiClient.get).toHaveBeenCalledWith(`/drafts/actions/${goalId}`);
      expect(result).toEqual(mockResponse);
    });
  });
});

describe('actionApiService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('reorderActions', () => {
    it('Action配列から適切なリクエストデータを生成する', async () => {
      const subGoalId = 'subgoal-123';
      const actions: Action[] = [
        {
          id: 'action-1',
          sub_goal_id: subGoalId,
          title: 'アクション1',
          description: '説明1',
          background: '背景1',
          type: 'execution' as ActionType,
          position: 1,
          progress: 25,
        },
        {
          id: 'action-2',
          sub_goal_id: subGoalId,
          title: 'アクション2',
          description: '説明2',
          background: '背景2',
          type: 'habit' as ActionType,
          position: 0,
          progress: 50,
        },
      ];

      const mockResponse: ReorderActionsResponse = {
        success: true,
        actions: actions,
      };

      mockApiClient.put.mockResolvedValue({ data: mockResponse });

      const result = await actionApiService.reorderActions(subGoalId, actions);

      expect(mockApiClient.put).toHaveBeenCalledWith(`/subgoals/${subGoalId}/actions/reorder`, {
        actions: [
          { id: 'action-1', position: 1 },
          { id: 'action-2', position: 0 },
        ],
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('bulkUpdateActions', () => {
    it('更新と削除のデータを適切に処理する', async () => {
      const goalId = 'goal-123';
      const updates = [{ id: 'action-1', changes: { title: '新しいタイトル' } }];
      const deletes = ['action-2'];

      const mockResponse: BulkUpdateActionsResponse = {
        success: true,
        updated: [],
        deleted: deletes,
      };

      mockApiClient.post.mockResolvedValue({ data: mockResponse });

      const result = await actionApiService.bulkUpdateActions(goalId, updates, deletes);

      expect(mockApiClient.post).toHaveBeenCalledWith(`/goals/${goalId}/actions/bulk-update`, {
        updates,
        deletes,
      });
      expect(result).toEqual(mockResponse);
    });
  });
});
