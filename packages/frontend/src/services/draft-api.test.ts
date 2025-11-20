/**
 * 下書き保存API統合のテスト
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DraftApiClient } from './draft-api';
import { subGoalApiService } from './subgoal-api';
import { actionApiService } from './action-api';
import type { SubGoal, Action, ActionType } from '../types/mandala';

// APIサービスをモック
vi.mock('./subgoal-api', () => ({
  subGoalApiService: {
    saveDraft: vi.fn(),
    getDraft: vi.fn(),
    deleteDraft: vi.fn(),
  },
}));

vi.mock('./action-api', () => ({
  actionApiService: {
    saveDraft: vi.fn(),
    getDraft: vi.fn(),
    deleteDraft: vi.fn(),
  },
}));

const mockSubGoalApiService = vi.mocked(subGoalApiService);
const mockActionApiService = vi.mocked(actionApiService);

describe('DraftApiClient', () => {
  let client: DraftApiClient;

  beforeEach(() => {
    client = new DraftApiClient();
    vi.clearAllMocks();
  });

  afterEach(() => {
    client.cleanup();
    vi.resetAllMocks();
  });

  describe('saveSubGoalDraft', () => {
    it('サブ目標の下書きを正常に保存できる', async () => {
      const goalId = 'goal-123';
      const subGoals: Partial<SubGoal>[] = [
        {
          id: 'subgoal-1',
          title: 'サブ目標1',
          description: '説明1',
          background: '背景1',
        },
      ];

      const mockResponse = {
        success: true,
        draftId: 'draft-123',
        savedAt: '2024-01-01T00:00:00Z',
      };

      mockSubGoalApiService.saveDraft.mockResolvedValue(mockResponse);

      await client.saveSubGoalDraft(goalId, subGoals);

      expect(mockSubGoalApiService.saveDraft).toHaveBeenCalledWith(goalId, subGoals);
    });

    it('API エラー時に適切なエラーを投げる', async () => {
      const goalId = 'goal-123';
      const subGoals: Partial<SubGoal>[] = [];

      mockSubGoalApiService.saveDraft.mockRejectedValue(new Error('API Error'));

      await expect(client.saveSubGoalDraft(goalId, subGoals)).rejects.toThrow(
        'サブ目標の下書き保存に失敗しました'
      );
    });
  });

  describe('getSubGoalDraft', () => {
    it('サブ目標の下書きを正常に取得できる', async () => {
      const goalId = 'goal-123';
      const draftData: Partial<SubGoal>[] = [
        {
          id: 'subgoal-1',
          title: '下書きタイトル',
          description: '下書き説明',
        },
      ];

      const mockResponse = {
        success: true,
        draftData,
        savedAt: '2024-01-01T00:00:00Z',
      };

      mockSubGoalApiService.getDraft.mockResolvedValue(mockResponse);

      const result = await client.getSubGoalDraft(goalId);

      expect(mockSubGoalApiService.getDraft).toHaveBeenCalledWith(goalId);
      expect(result).toEqual(draftData);
    });

    it('下書きが存在しない場合はnullを返す', async () => {
      const goalId = 'goal-123';

      const mockResponse = {
        success: true,
        draftData: null,
        savedAt: null,
      };

      mockSubGoalApiService.getDraft.mockResolvedValue(mockResponse);

      const result = await client.getSubGoalDraft(goalId);

      expect(result).toBeNull();
    });

    it('API エラー時はnullを返す', async () => {
      const goalId = 'goal-123';

      mockSubGoalApiService.getDraft.mockRejectedValue(new Error('API Error'));

      const result = await client.getSubGoalDraft(goalId);

      expect(result).toBeNull();
    });
  });

  describe('saveActionDraft', () => {
    it('アクションの下書きを正常に保存できる', async () => {
      const goalId = 'goal-123';
      const actions: Partial<Action>[] = [
        {
          id: 'action-1',
          title: 'アクション1',
          description: '説明1',
          background: '背景1',
          type: 'execution' as ActionType,
        },
      ];

      const mockResponse = {
        success: true,
        draftId: 'draft-123',
        savedAt: '2024-01-01T00:00:00Z',
      };

      mockActionApiService.saveDraft.mockResolvedValue(mockResponse);

      await client.saveActionDraft(goalId, actions);

      expect(mockActionApiService.saveDraft).toHaveBeenCalledWith(goalId, actions);
    });
  });

  describe('getActionDraft', () => {
    it('アクションの下書きを正常に取得できる', async () => {
      const goalId = 'goal-123';
      const draftData: Partial<Action>[] = [
        {
          id: 'action-1',
          title: '下書きタイトル',
          description: '下書き説明',
          type: 'execution' as ActionType,
        },
      ];

      const mockResponse = {
        success: true,
        draftData,
        savedAt: '2024-01-01T00:00:00Z',
      };

      mockActionApiService.getDraft.mockResolvedValue(mockResponse);

      const result = await client.getActionDraft(goalId);

      expect(mockActionApiService.getDraft).toHaveBeenCalledWith(goalId);
      expect(result).toEqual(draftData);
    });
  });

  describe('detectChanges', () => {
    it('初回データの場合は変更ありと判定する', () => {
      const key = 'test-key';
      const currentData = [{ title: 'テスト' }];

      const diff = client.detectChanges(key, currentData);

      expect(diff.hasChanges).toBe(true);
      expect(diff.addedItems).toBe(1);
    });

    it('データに変更がない場合は変更なしと判定する', () => {
      const key = 'test-key';
      const data = [{ title: 'テスト' }];

      // 最初にデータを設定（内部キャッシュに保存）
      client['lastSavedData'].set(key, data);

      // 同じデータで再度チェック
      const diff = client.detectChanges(key, data);

      expect(diff.hasChanges).toBe(false);
    });

    it('データに変更がある場合は変更ありと判定する', () => {
      const key = 'test-key';
      const originalData = [{ title: 'テスト1' }];
      const modifiedData = [{ title: 'テスト2' }];

      // 最初にデータを設定
      client.detectChanges(key, originalData);

      // 変更されたデータでチェック
      const diff = client.detectChanges(key, modifiedData);

      expect(diff.hasChanges).toBe(true);
    });
  });

  describe('autoSave', () => {
    it('自動保存を開始・停止できる', () => {
      const goalId = 'goal-123';
      const getData = vi.fn().mockReturnValue([]);

      // 自動保存を開始
      client.startAutoSave(goalId, 'subgoals', getData, { intervalMs: 100 });

      // タイマーが設定されていることを確認
      expect(client['autoSaveTimers'].has('subgoals-goal-123')).toBe(true);

      // 自動保存を停止
      client.stopAutoSave(goalId, 'subgoals');

      // タイマーが削除されていることを確認
      expect(client['autoSaveTimers'].has('subgoals-goal-123')).toBe(false);
    });

    it('全ての自動保存を停止できる', () => {
      const goalId1 = 'goal-123';
      const goalId2 = 'goal-456';
      const getData = vi.fn().mockReturnValue([]);

      // 複数の自動保存を開始
      client.startAutoSave(goalId1, 'subgoals', getData);
      client.startAutoSave(goalId2, 'actions', getData);

      expect(client['autoSaveTimers'].size).toBe(2);

      // 全ての自動保存を停止
      client.stopAllAutoSave();

      expect(client['autoSaveTimers'].size).toBe(0);
    });
  });

  describe('hasDraft', () => {
    it('下書きが存在する場合はtrueを返す', async () => {
      const goalId = 'goal-123';

      mockSubGoalApiService.getDraft.mockResolvedValue({
        success: true,
        draftData: [{ title: 'テスト' }],
        savedAt: '2024-01-01T00:00:00Z',
      });

      const result = await client.hasDraft(goalId, 'subgoals');

      expect(result).toBe(true);
    });

    it('下書きが存在しない場合はfalseを返す', async () => {
      const goalId = 'goal-123';

      mockSubGoalApiService.getDraft.mockResolvedValue({
        success: true,
        draftData: null,
        savedAt: null,
      });

      const result = await client.hasDraft(goalId, 'subgoals');

      expect(result).toBe(false);
    });
  });

  describe('deleteDraft', () => {
    it('サブ目標の下書きを削除できる', async () => {
      const goalId = 'goal-123';

      mockSubGoalApiService.deleteDraft.mockResolvedValue({ success: true });

      await client.deleteDraft(goalId, 'subgoals');

      expect(mockSubGoalApiService.deleteDraft).toHaveBeenCalledWith(goalId);
    });

    it('アクションの下書きを削除できる', async () => {
      const goalId = 'goal-123';

      mockActionApiService.deleteDraft.mockResolvedValue({ success: true });

      await client.deleteDraft(goalId, 'actions');

      expect(mockActionApiService.deleteDraft).toHaveBeenCalledWith(goalId);
    });
  });
});

describe('draftApiUtils', () => {
  describe('isWorthSaving', () => {
    it('空の配列は保存する価値がない', () => {
      const result = draftApiUtils.isWorthSaving([]);
      expect(result).toBe(false);
    });

    it('内容のないアイテムは保存する価値がない', () => {
      const data = [{ id: 'test' }, { title: '', description: '' }];
      const result = draftApiUtils.isWorthSaving(data);
      expect(result).toBe(false);
    });

    it('内容のあるアイテムは保存する価値がある', () => {
      const data = [{ title: 'テストタイトル' }];
      const result = draftApiUtils.isWorthSaving(data);
      expect(result).toBe(true);
    });
  });

  describe('getDraftSummary', () => {
    it('空の配列の場合は適切なメッセージを返す', () => {
      const result = draftApiUtils.getDraftSummary([]);
      expect(result).toBe('空の下書き');
    });

    it('未入力の場合は適切なメッセージを返す', () => {
      const data = [{ id: 'test' }, { title: '', description: '' }];
      const result = draftApiUtils.getDraftSummary(data);
      expect(result).toBe('未入力の下書き');
    });

    it('内容がある場合は適切な概要を返す', () => {
      const data = [{ title: 'テストタイトル' }, { title: 'テストタイトル2' }];
      const result = draftApiUtils.getDraftSummary(data);
      expect(result).toBe('テストタイトル 他1件');
    });

    it('長いタイトルは省略される', () => {
      const longTitle =
        'これは非常に長いタイトルでテストのために作成されました。この文字列は30文字を超えています。';
      const data = [{ title: longTitle }];
      const result = draftApiUtils.getDraftSummary(data);
      expect(result).toContain('...');
    });
  });

  describe('calculateCompleteness', () => {
    it('空の配列は0%', () => {
      const result = draftApiUtils.calculateCompleteness([]);
      expect(result).toBe(0);
    });

    it('全て入力済みの場合は100%', () => {
      const data = [
        {
          title: 'タイトル',
          description: '説明',
          background: '背景',
        },
      ];
      const result = draftApiUtils.calculateCompleteness(data);
      expect(result).toBe(100);
    });

    it('半分入力済みの場合は適切な割合', () => {
      const data = [
        {
          title: 'タイトル',
          description: '説明',
          background: '', // 空
        },
      ];
      const result = draftApiUtils.calculateCompleteness(data);
      expect(result).toBe(67); // 2/3 = 66.67% -> 67%
    });
  });
});
