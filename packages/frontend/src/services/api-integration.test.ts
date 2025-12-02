/**
 * API統合テスト
 *
 * サブ目標・アクションAPIクライアントと下書き保存APIの統合動作をテスト
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { subGoalApiService } from './subgoal-api';
import { actionApiService } from './action-api';
import { draftApiClient } from './draft-api';
import { apiClient } from './api-client';
import type { SubGoal, Action, ActionType } from '../types/mandala';

// apiClientをモック
vi.mock('./api-client', () => ({
  apiClient: {
    get: vi.fn(),
    put: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('API統合テスト', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
    draftApiClient.cleanup();
  });

  describe('サブ目標APIの統合フロー', () => {
    const goalId = 'goal-123';
    const mockSubGoals: SubGoal[] = [
      {
        id: 'subgoal-1',
        goal_id: goalId,
        title: 'サブ目標1',
        description: '説明1',
        background: '背景1',
        position: 0,
        progress: 0,
      },
      {
        id: 'subgoal-2',
        goal_id: goalId,
        title: 'サブ目標2',
        description: '説明2',
        background: '背景2',
        position: 1,
        progress: 25,
      },
    ];

    it('サブ目標の取得→更新→並び替えの一連のフローが正常に動作する', async () => {
      // 1. サブ目標一覧を取得
      apiClient.get.mockResolvedValueOnce({
        data: {
          subGoals: mockSubGoals,
          total: 2,
        },
      });

      const subGoals = await subGoalApiService.getSubGoals(goalId);
      expect(subGoals.subGoals).toHaveLength(2);
      expect(apiClient.get).toHaveBeenCalledWith(`/goals/${goalId}/subgoals`);

      // 2. サブ目標を更新
      const updatedSubGoal = { ...mockSubGoals[0], title: '更新されたタイトル' };
      apiClient.put.mockResolvedValueOnce({
        data: {
          success: true,
          subGoal: updatedSubGoal,
        },
      });

      const updateResult = await subGoalApiService.updateSubGoal(mockSubGoals[0].id, {
        title: '更新されたタイトル',
        description: mockSubGoals[0].description,
        background: mockSubGoals[0].background,
        position: mockSubGoals[0].position,
      });

      expect(updateResult.success).toBe(true);
      expect(updateResult.subGoal.title).toBe('更新されたタイトル');
      expect(apiClient.put).toHaveBeenCalledWith(`/subgoals/${mockSubGoals[0].id}`, {
        title: '更新されたタイトル',
        description: mockSubGoals[0].description,
        background: mockSubGoals[0].background,
        position: mockSubGoals[0].position,
      });

      // 3. サブ目標を並び替え
      const reorderedSubGoals = [
        { ...mockSubGoals[1], position: 0 },
        { ...mockSubGoals[0], position: 1 },
      ];

      apiClient.put.mockResolvedValueOnce({
        data: {
          success: true,
          subGoals: reorderedSubGoals,
        },
      });

      const reorderResult = await subGoalApiService.reorderSubGoals(goalId, reorderedSubGoals);
      expect(reorderResult.success).toBe(true);
      expect(reorderResult.subGoals[0].position).toBe(0);
      expect(reorderResult.subGoals[1].position).toBe(1);
    });

    it('サブ目標の一括更新が正常に動作する', async () => {
      const updates = [
        { id: 'subgoal-1', changes: { title: '一括更新1' } },
        { id: 'subgoal-2', changes: { title: '一括更新2' } },
      ];
      const deletes = ['subgoal-3'];

      apiClient.post.mockResolvedValueOnce({
        data: {
          success: true,
          updated: [
            { ...mockSubGoals[0], title: '一括更新1' },
            { ...mockSubGoals[1], title: '一括更新2' },
          ],
          deleted: deletes,
        },
      });

      const result = await subGoalApiService.bulkUpdateSubGoals(goalId, updates, deletes);

      expect(result.success).toBe(true);
      expect(result.updated).toHaveLength(2);
      expect(result.deleted).toEqual(deletes);
      expect(apiClient.post).toHaveBeenCalledWith(`/goals/${goalId}/subgoals/bulk-update`, {
        updates,
        deletes,
      });
    });
  });

  describe('アクションAPIの統合フロー', () => {
    const goalId = 'goal-123';
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
        progress: 0,
      },
      {
        id: 'action-2',
        sub_goal_id: subGoalId,
        title: 'アクション2',
        description: '説明2',
        background: '背景2',
        type: 'habit' as ActionType,
        position: 1,
        progress: 50,
      },
    ];

    it('アクションの取得→更新→並び替えの一連のフローが正常に動作する', async () => {
      // 1. アクション一覧を取得
      apiClient.get.mockResolvedValueOnce({
        data: {
          actions: mockActions,
          total: 2,
          groupedBySubGoal: {
            [subGoalId]: mockActions,
          },
        },
      });

      const actions = await actionApiService.getActions(goalId);
      expect(actions.actions).toHaveLength(2);
      expect(actions.groupedBySubGoal[subGoalId]).toHaveLength(2);

      // 2. アクションを更新
      const updatedAction = { ...mockActions[0], title: '更新されたアクション' };
      apiClient.put.mockResolvedValueOnce({
        data: {
          success: true,
          action: updatedAction,
        },
      });

      const updateResult = await actionApiService.updateAction(mockActions[0].id, {
        title: '更新されたアクション',
        description: mockActions[0].description,
        background: mockActions[0].background,
        type: mockActions[0].type,
        position: mockActions[0].position,
      });

      expect(updateResult.success).toBe(true);
      expect(updateResult.action.title).toBe('更新されたアクション');

      // 3. アクションを並び替え
      const reorderedActions = [
        { ...mockActions[1], position: 0 },
        { ...mockActions[0], position: 1 },
      ];

      apiClient.put.mockResolvedValueOnce({
        data: {
          success: true,
          actions: reorderedActions,
        },
      });

      const reorderResult = await actionApiService.reorderActions(subGoalId, reorderedActions);
      expect(reorderResult.success).toBe(true);
      expect(reorderResult.actions[0].position).toBe(0);
      expect(reorderResult.actions[1].position).toBe(1);
    });

    it('サブ目標別アクション取得が正常に動作する', async () => {
      apiClient.get.mockResolvedValueOnce({
        data: {
          actions: mockActions,
        },
      });

      const actions = await actionApiService.getActionsBySubGoal(subGoalId);
      expect(actions).toHaveLength(2);
      expect(apiClient.get).toHaveBeenCalledWith(`/subgoals/${subGoalId}/actions`);
    });
  });

  describe('下書き保存APIの統合フロー', () => {
    const goalId = 'goal-123';

    it('サブ目標の下書き保存→取得→削除の一連のフローが正常に動作する', async () => {
      const draftSubGoals: Partial<SubGoal>[] = [
        {
          id: 'subgoal-1',
          title: '下書きサブ目標1',
          description: '下書き説明1',
          background: '下書き背景1',
        },
      ];

      // 1. 下書きを保存
      apiClient.post.mockResolvedValueOnce({
        data: {
          success: true,
          draftId: 'draft-123',
          savedAt: '2024-01-01T00:00:00Z',
        },
      });

      await draftApiClient.saveSubGoalDraft(goalId, draftSubGoals);
      expect(apiClient.post).toHaveBeenCalledWith('/drafts/subgoals', {
        goalId,
        subGoals: draftSubGoals,
      });

      // 2. 下書きを取得
      apiClient.get.mockResolvedValueOnce({
        data: {
          success: true,
          draftData: draftSubGoals,
          savedAt: '2024-01-01T00:00:00Z',
        },
      });

      const retrievedDraft = await draftApiClient.getSubGoalDraft(goalId);
      expect(retrievedDraft).toEqual(draftSubGoals);
      expect(apiClient.get).toHaveBeenCalledWith(`/drafts/subgoals/${goalId}`);

      // 3. 下書きを削除
      apiClient.delete.mockResolvedValueOnce({
        data: { success: true },
      });

      await draftApiClient.deleteDraft(goalId, 'subgoals');
      expect(apiClient.delete).toHaveBeenCalledWith(`/drafts/subgoals/${goalId}`);
    });

    it('アクションの下書き保存→取得→削除の一連のフローが正常に動作する', async () => {
      const draftActions: Partial<Action>[] = [
        {
          id: 'action-1',
          title: '下書きアクション1',
          description: '下書き説明1',
          background: '下書き背景1',
          type: 'execution' as ActionType,
        },
      ];

      // 1. 下書きを保存
      apiClient.post.mockResolvedValueOnce({
        data: {
          success: true,
          draftId: 'draft-456',
          savedAt: '2024-01-01T00:00:00Z',
        },
      });

      await draftApiClient.saveActionDraft(goalId, draftActions);
      expect(apiClient.post).toHaveBeenCalledWith('/drafts/actions', {
        goalId,
        actions: draftActions,
      });

      // 2. 下書きを取得
      apiClient.get.mockResolvedValueOnce({
        data: {
          success: true,
          draftData: draftActions,
          savedAt: '2024-01-01T00:00:00Z',
        },
      });

      const retrievedDraft = await draftApiClient.getActionDraft(goalId);
      expect(retrievedDraft).toEqual(draftActions);

      // 3. 下書きを削除
      apiClient.delete.mockResolvedValueOnce({
        data: { success: true },
      });

      await draftApiClient.deleteDraft(goalId, 'actions');
      expect(apiClient.delete).toHaveBeenCalledWith(`/drafts/actions/${goalId}`);
    });
  });

  describe('エラーハンドリングの統合テスト', () => {
    it('ネットワークエラー時に適切なエラーメッセージを返す', async () => {
      const goalId = 'goal-123';

      // ネットワークエラーをモック
      apiClient.get.mockRejectedValueOnce({
        code: 'TIMEOUT',
        retryable: true,
        message: 'タイムアウト',
      });

      await expect(subGoalApiService.getSubGoals(goalId)).rejects.toThrow(
        'ネットワークエラー: タイムアウト'
      );
      expect(apiClient.get).toHaveBeenCalledTimes(1);
    });

    it('バリデーションエラー時に適切なエラーメッセージを返す', async () => {
      const subGoalId = 'subgoal-123';
      const invalidData = {
        title: '', // 必須フィールドが空
        description: '説明',
        background: '背景',
        position: 0,
      };

      apiClient.put.mockRejectedValueOnce({
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
      });

      await expect(subGoalApiService.updateSubGoal(subGoalId, invalidData)).rejects.toThrow(
        '入力エラー: タイトルは必須です'
      );
    });

    it('サーバーエラー時に適切なエラーメッセージを返す', async () => {
      const goalId = 'goal-123';

      apiClient.get.mockRejectedValueOnce({
        response: {
          data: {
            success: false,
            error: {
              code: 'INTERNAL_SERVER_ERROR',
              message: 'サーバー内部エラーが発生しました',
            },
          },
        },
      });

      await expect(subGoalApiService.getSubGoals(goalId)).rejects.toThrow(
        'サーバー内部エラーが発生しました'
      );
    });
  });

  describe('自動保存機能の統合テスト', () => {
    it('自動保存が正常に動作する', async () => {
      const goalId = 'goal-123';
      let currentData: Partial<SubGoal>[] = [{ id: 'subgoal-1', title: '初期タイトル' }];

      const getData = () => currentData;

      // 自動保存のモック
      apiClient.post.mockResolvedValue({
        data: {
          success: true,
          draftId: 'draft-123',
          savedAt: '2024-01-01T00:00:00Z',
        },
      });

      // 自動保存を開始（短い間隔でテスト）
      draftApiClient.startAutoSave(goalId, 'subgoals', getData, { intervalMs: 50 });

      // データを変更
      currentData = [{ id: 'subgoal-1', title: '変更されたタイトル' }];

      // 少し待って自動保存が実行されるのを待つ
      await new Promise(resolve => setTimeout(resolve, 100));

      // 自動保存を停止
      draftApiClient.stopAutoSave(goalId, 'subgoals');

      // 自動保存が実行されたことを確認
      expect(apiClient.post).toHaveBeenCalledWith('/drafts/subgoals', {
        goalId,
        subGoals: currentData,
      });
    });

    it('データに変更がない場合は自動保存しない', async () => {
      const goalId = 'goal-123';
      const currentData: Partial<SubGoal>[] = [{ id: 'subgoal-1', title: '固定タイトル' }];

      const getData = () => currentData;

      // 自動保存を開始
      draftApiClient.startAutoSave(goalId, 'subgoals', getData, { intervalMs: 50 });

      // 少し待つ（データは変更しない）
      await new Promise(resolve => setTimeout(resolve, 100));

      // 自動保存を停止
      draftApiClient.stopAutoSave(goalId, 'subgoals');

      // 初回は保存されるが、その後は変更がないので保存されない
      expect(apiClient.post).toHaveBeenCalledTimes(1);
    });
  });
});
