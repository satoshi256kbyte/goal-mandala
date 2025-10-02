import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { vi } from 'vitest';
import {
  SubGoalProvider,
  useSubGoalContext,
  useSubGoalState,
  useSubGoalActions,
} from './SubGoalContext';
import { SubGoal } from '../types/mandala';
import { PartialSubGoalFormData } from '../schemas/subgoal-form';

// テスト用のサンプルデータ
const sampleSubGoals: SubGoal[] = [
  {
    id: 'subgoal-1',
    goal_id: 'goal-1',
    title: 'サブ目標1',
    description: 'サブ目標1の説明',
    position: 0,
    progress: 25,
  },
  {
    id: 'subgoal-2',
    goal_id: 'goal-1',
    title: 'サブ目標2',
    description: 'サブ目標2の説明',
    position: 1,
    progress: 50,
  },
];

const sampleDraftData: PartialSubGoalFormData = {
  title: '更新されたタイトル',
  description: '更新された説明',
  background: '更新された背景',
  constraints: '更新された制約',
};

// テスト用のラッパーコンポーネント
const createWrapper = (
  goalId = 'goal-1',
  initialSubGoals: SubGoal[] = [],
  autoSaveEnabled = true
) => {
  return ({ children }: { children: React.ReactNode }) => (
    <SubGoalProvider
      goalId={goalId}
      initialSubGoals={initialSubGoals}
      autoSaveEnabled={autoSaveEnabled}
    >
      {children}
    </SubGoalProvider>
  );
};

describe('SubGoalContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('SubGoalProvider', () => {
    it('初期状態が正しく設定される', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useSubGoalState(), { wrapper });

      expect(result.current.subGoals).toEqual([]);
      expect(result.current.selectedSubGoal).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isDirty).toBe(false);
      expect(result.current.validationErrors).toEqual({});
      expect(result.current.isDraftSaving).toBe(false);
      expect(result.current.autoSaveEnabled).toBe(true);
      expect(result.current.lastSavedData).toEqual({});
      expect(result.current.errors).toEqual({});
      expect(result.current.success).toBe(false);
      expect(result.current.isInitialized).toBe(true);
    });

    it('初期サブ目標データが正しく設定される', () => {
      const wrapper = createWrapper('goal-1', sampleSubGoals);
      const { result } = renderHook(() => useSubGoalState(), { wrapper });

      expect(result.current.subGoals).toEqual(sampleSubGoals);
      expect(result.current.isInitialized).toBe(true);
    });

    it('自動保存の初期設定が反映される', () => {
      const wrapper = createWrapper('goal-1', [], false);
      const { result } = renderHook(() => useSubGoalState(), { wrapper });

      expect(result.current.autoSaveEnabled).toBe(false);
    });
  });

  describe('useSubGoalContext', () => {
    it('プロバイダー外で使用するとエラーが発生する', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useSubGoalContext());
      }).toThrow('useSubGoalContext must be used within a SubGoalProvider');

      consoleSpy.mockRestore();
    });

    it('プロバイダー内で正しく動作する', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useSubGoalContext(), { wrapper });

      expect(result.current.state).toBeDefined();
      expect(result.current.loadSubGoals).toBeDefined();
      expect(result.current.selectSubGoal).toBeDefined();
      expect(result.current.updateSubGoal).toBeDefined();
      expect(result.current.reorderSubGoals).toBeDefined();
      expect(result.current.bulkUpdateSubGoals).toBeDefined();
      expect(result.current.regenerateSubGoals).toBeDefined();
      expect(result.current.saveDraft).toBeDefined();
      expect(result.current.restoreDraft).toBeDefined();
    });
  });

  describe('useSubGoalActions', () => {
    it('サブ目標を選択できる', () => {
      const wrapper = createWrapper('goal-1', sampleSubGoals);
      const { result } = renderHook(() => useSubGoalActions(), { wrapper });
      const { result: stateResult } = renderHook(() => useSubGoalState(), { wrapper });

      act(() => {
        result.current.selectSubGoal(sampleSubGoals[0]);
      });

      expect(stateResult.current.selectedSubGoal).toEqual(sampleSubGoals[0]);
    });

    it('サブ目標を更新できる', () => {
      const wrapper = createWrapper('goal-1', sampleSubGoals);
      const { result } = renderHook(() => useSubGoalActions(), { wrapper });
      const { result: stateResult } = renderHook(() => useSubGoalState(), { wrapper });

      const updateData = { title: '更新されたタイトル', progress: 75 };

      act(() => {
        result.current.updateSubGoal('subgoal-1', updateData);
      });

      const updatedSubGoal = stateResult.current.subGoals.find(sg => sg.id === 'subgoal-1');
      expect(updatedSubGoal?.title).toBe('更新されたタイトル');
      expect(updatedSubGoal?.progress).toBe(75);
      expect(stateResult.current.isDirty).toBe(true);
    });

    it('サブ目標を並び替えできる', () => {
      const wrapper = createWrapper('goal-1', sampleSubGoals);
      const { result } = renderHook(() => useSubGoalActions(), { wrapper });
      const { result: stateResult } = renderHook(() => useSubGoalState(), { wrapper });

      const reorderedSubGoals = [sampleSubGoals[1], sampleSubGoals[0]];

      act(() => {
        result.current.reorderSubGoals(reorderedSubGoals);
      });

      expect(stateResult.current.subGoals).toEqual(reorderedSubGoals);
      expect(stateResult.current.isDirty).toBe(true);
    });

    it('サブ目標を一括更新できる', () => {
      const wrapper = createWrapper('goal-1', sampleSubGoals);
      const { result } = renderHook(() => useSubGoalActions(), { wrapper });
      const { result: stateResult } = renderHook(() => useSubGoalState(), { wrapper });

      const updates = [
        { id: 'subgoal-1', changes: { title: '一括更新1' } },
        { id: 'subgoal-2', changes: { title: '一括更新2' } },
      ];
      const deletes: string[] = [];

      act(() => {
        result.current.bulkUpdateSubGoals(updates, deletes);
      });

      const updatedSubGoal1 = stateResult.current.subGoals.find(sg => sg.id === 'subgoal-1');
      const updatedSubGoal2 = stateResult.current.subGoals.find(sg => sg.id === 'subgoal-2');

      expect(updatedSubGoal1?.title).toBe('一括更新1');
      expect(updatedSubGoal2?.title).toBe('一括更新2');
      expect(stateResult.current.isDirty).toBe(true);
    });

    it('サブ目標を一括削除できる', () => {
      const wrapper = createWrapper('goal-1', sampleSubGoals);
      const { result } = renderHook(() => useSubGoalActions(), { wrapper });
      const { result: stateResult } = renderHook(() => useSubGoalState(), { wrapper });

      const updates: Array<{ id: string; changes: Partial<SubGoal> }> = [];
      const deletes = ['subgoal-1'];

      act(() => {
        result.current.bulkUpdateSubGoals(updates, deletes);
      });

      expect(stateResult.current.subGoals).toHaveLength(1);
      expect(stateResult.current.subGoals[0].id).toBe('subgoal-2');
      expect(stateResult.current.isDirty).toBe(true);
    });

    it('選択されたサブ目標が削除された場合、選択が解除される', () => {
      const wrapper = createWrapper('goal-1', sampleSubGoals);
      const { result } = renderHook(() => useSubGoalActions(), { wrapper });
      const { result: stateResult } = renderHook(() => useSubGoalState(), { wrapper });

      // まずサブ目標を選択
      act(() => {
        result.current.selectSubGoal(sampleSubGoals[0]);
      });

      expect(stateResult.current.selectedSubGoal?.id).toBe('subgoal-1');

      // 選択されたサブ目標を削除
      const updates: Array<{ id: string; changes: Partial<SubGoal> }> = [];
      const deletes = ['subgoal-1'];

      act(() => {
        result.current.bulkUpdateSubGoals(updates, deletes);
      });

      expect(stateResult.current.selectedSubGoal).toBeNull();
    });

    it('バリデーションエラーを設定・クリアできる', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useSubGoalActions(), { wrapper });
      const { result: stateResult } = renderHook(() => useSubGoalState(), { wrapper });

      const errors = { title: 'タイトルは必須です', description: '説明が短すぎます' };

      act(() => {
        result.current.setValidationErrors(errors);
      });

      expect(stateResult.current.validationErrors).toEqual(errors);

      act(() => {
        result.current.clearValidationErrors();
      });

      expect(stateResult.current.validationErrors).toEqual({});
    });

    it('エラーを設定・クリアできる', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useSubGoalActions(), { wrapper });
      const { result: stateResult } = renderHook(() => useSubGoalState(), { wrapper });

      const errors = { load: 'データの読み込みに失敗しました' };

      act(() => {
        result.current.setErrors(errors);
      });

      expect(stateResult.current.errors).toEqual(errors);
      expect(stateResult.current.success).toBe(false);

      act(() => {
        result.current.clearErrors();
      });

      expect(stateResult.current.errors).toEqual({});
    });

    it('成功状態を設定できる', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useSubGoalActions(), { wrapper });
      const { result: stateResult } = renderHook(() => useSubGoalState(), { wrapper });

      act(() => {
        result.current.setSuccess(true);
      });

      expect(stateResult.current.success).toBe(true);
      expect(stateResult.current.errors).toEqual({});
      expect(stateResult.current.isDirty).toBe(false);

      act(() => {
        result.current.setSuccess(false);
      });

      expect(stateResult.current.success).toBe(false);
    });

    it('ダーティ状態を設定できる', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useSubGoalActions(), { wrapper });
      const { result: stateResult } = renderHook(() => useSubGoalState(), { wrapper });

      act(() => {
        result.current.setDirty(true);
      });

      expect(stateResult.current.isDirty).toBe(true);

      act(() => {
        result.current.setDirty(false);
      });

      expect(stateResult.current.isDirty).toBe(false);
    });

    it('自動保存の有効/無効を設定できる', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useSubGoalActions(), { wrapper });
      const { result: stateResult } = renderHook(() => useSubGoalState(), { wrapper });

      act(() => {
        result.current.setAutoSaveEnabled(false);
      });

      expect(stateResult.current.autoSaveEnabled).toBe(false);

      act(() => {
        result.current.setAutoSaveEnabled(true);
      });

      expect(stateResult.current.autoSaveEnabled).toBe(true);
    });
  });

  describe('非同期アクション', () => {
    it('loadSubGoals が正しく呼び出される', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useSubGoalActions(), { wrapper });

      // コンソールログをモック
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await act(async () => {
        await result.current.loadSubGoals('goal-1');
      });

      expect(consoleSpy).toHaveBeenCalledWith('Loading subgoals for goal:', 'goal-1');
      consoleSpy.mockRestore();
    });

    it('regenerateSubGoals が正しく呼び出される', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useSubGoalActions(), { wrapper });

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await act(async () => {
        await result.current.regenerateSubGoals('goal-1');
      });

      expect(consoleSpy).toHaveBeenCalledWith('Regenerating subgoals for goal:', 'goal-1');
      consoleSpy.mockRestore();
    });

    it('saveDraft が正しく呼び出される', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useSubGoalActions(), { wrapper });

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await act(async () => {
        await result.current.saveDraft('subgoal-1', sampleDraftData);
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        'Saving draft for subgoal:',
        'subgoal-1',
        sampleDraftData
      );
      consoleSpy.mockRestore();
    });

    it('restoreDraft が正しく呼び出される', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useSubGoalActions(), { wrapper });

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await act(async () => {
        await result.current.restoreDraft();
      });

      expect(consoleSpy).toHaveBeenCalledWith('Restoring draft');
      consoleSpy.mockRestore();
    });
  });

  describe('状態の整合性', () => {
    it('lastActionTimestamp が更新される', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useSubGoalState(), { wrapper });
      const { result: actionsResult } = renderHook(() => useSubGoalActions(), { wrapper });

      const initialTimestamp = result.current.lastActionTimestamp;

      act(() => {
        actionsResult.current.setDirty(true);
      });

      expect(result.current.lastActionTimestamp).toBeGreaterThan(initialTimestamp);
    });

    it('複数の状態変更が正しく反映される', () => {
      const wrapper = createWrapper('goal-1', sampleSubGoals);
      const { result } = renderHook(() => useSubGoalActions(), { wrapper });
      const { result: stateResult } = renderHook(() => useSubGoalState(), { wrapper });

      act(() => {
        result.current.selectSubGoal(sampleSubGoals[0]);
        result.current.updateSubGoal('subgoal-1', { title: '新しいタイトル' });
        result.current.setValidationErrors({ title: 'エラーメッセージ' });
      });

      expect(stateResult.current.selectedSubGoal?.id).toBe('subgoal-1');
      expect(stateResult.current.subGoals[0].title).toBe('新しいタイトル');
      expect(stateResult.current.validationErrors.title).toBe('エラーメッセージ');
      expect(stateResult.current.isDirty).toBe(true);
    });
  });
});
