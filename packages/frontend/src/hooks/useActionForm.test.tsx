import { renderHook, act } from '@testing-library/react';
import { vi } from 'vitest';
import React from 'react';
import { useActionForm, useActionFieldValidation, useActionFormSubmission } from './useActionForm';
import { ActionProvider } from '../contexts/ActionContext';
import { ActionType, Action } from '../types/mandala';
import { ActionFormData } from '../schemas/action-form';

// テスト用のアクションデータ
const mockActions: Action[] = [
  {
    id: 'action-1',
    sub_goal_id: 'subgoal-1',
    title: '既存のアクション',
    description: '既存のアクションの説明',
    type: ActionType.EXECUTION,
    position: 0,
    progress: 0,
  },
];

// テスト用のプロバイダーラッパー
const createWrapper = (initialActions: Action[] = []) => {
  const TestWrapper = ({ children }: { children: React.ReactNode }) => (
    <ActionProvider initialActions={initialActions} goalId="goal-1">
      {children}
    </ActionProvider>
  );
  TestWrapper.displayName = 'TestWrapper';
  return TestWrapper;
};

describe('useActionForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('基本機能', () => {
    it('初期状態が正しく設定される', () => {
      const { result } = renderHook(
        () =>
          useActionForm({
            actionId: 'action-1',
            subGoalId: 'subgoal-1',
          }),
        { wrapper: createWrapper() }
      );

      expect(result.current.formState.isDirty).toBe(false);
      expect(result.current.formState.isSubmitting).toBe(false);
      expect(result.current.watchedValues.type).toBe(ActionType.EXECUTION);
    });

    it('初期データが設定される', () => {
      const initialData: Partial<ActionFormData> = {
        title: 'テストアクション',
        type: ActionType.HABIT,
      };

      const { result } = renderHook(
        () =>
          useActionForm({
            actionId: 'action-1',
            subGoalId: 'subgoal-1',
            initialData,
          }),
        { wrapper: createWrapper() }
      );

      expect(result.current.watchedValues.title).toBe('テストアクション');
      expect(result.current.watchedValues.type).toBe(ActionType.HABIT);
    });
  });

  describe('フィールド状態管理', () => {
    it('フィールド状態を正しく取得できる', () => {
      const { result } = renderHook(
        () =>
          useActionForm({
            actionId: 'action-1',
            subGoalId: 'subgoal-1',
            initialData: { title: 'テスト' },
          }),
        { wrapper: createWrapper() }
      );

      const titleState = result.current.getFieldState('title');
      expect(titleState.value).toBe('テスト');
      expect(titleState.length).toBe(4);
    });

    it('フォームデータを更新できる', () => {
      const { result } = renderHook(
        () =>
          useActionForm({
            actionId: 'action-1',
            subGoalId: 'subgoal-1',
          }),
        { wrapper: createWrapper() }
      );

      act(() => {
        result.current.updateFormData({
          title: '更新されたタイトル',
        });
      });

      expect(result.current.watchedValues.title).toBe('更新されたタイトル');
    });
  });

  describe('アクション種別変更', () => {
    it('アクション種別を変更できる', () => {
      const { result } = renderHook(
        () =>
          useActionForm({
            actionId: 'action-1',
            subGoalId: 'subgoal-1',
          }),
        { wrapper: createWrapper() }
      );

      act(() => {
        result.current.changeActionType(ActionType.HABIT);
      });

      expect(result.current.watchedValues.type).toBe(ActionType.HABIT);
    });
  });
});

describe('useActionFieldValidation', () => {
  it('フィールドバリデーションが動作する', async () => {
    const { result } = renderHook(() => useActionFieldValidation('title'));

    // 有効な値でテスト
    await act(async () => {
      await result.current.validateField('有効なタイトル');
    });

    expect(result.current.validationState.isValid).toBe(true);
  });
});

describe('useActionFormSubmission', () => {
  it('フォーム送信が成功する', async () => {
    const { result } = renderHook(() => useActionFormSubmission(), {
      wrapper: createWrapper(),
    });

    const mockSubmitFn = vi.fn().mockResolvedValue(undefined);

    await act(async () => {
      await result.current.submitForm(mockSubmitFn);
    });

    expect(result.current.submissionState.success).toBe(true);
    expect(mockSubmitFn).toHaveBeenCalled();
  });
});
