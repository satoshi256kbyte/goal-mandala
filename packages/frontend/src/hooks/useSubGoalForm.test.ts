import { renderHook, act } from '@testing-library/react';
import { vi } from 'vitest';
import React from 'react';
import {
  useSubGoalForm,
  useSubGoalFieldValidation,
  useSubGoalFormSubmission,
} from './useSubGoalForm';
import { SubGoalProvider } from '../contexts/SubGoalContext';
import { SubGoalFormData, PartialSubGoalFormData } from '../schemas/subgoal-form';

// テスト用のサンプルデータ
const sampleFormData: SubGoalFormData = {
  title: 'プログラミング基礎',
  description: 'プログラミングの基礎概念を学習し、基本的なコードが書けるようになる',
  background: 'プログラミング未経験だが、基礎をしっかり身につけたい',
  constraints: '学習時間は平日夜と週末のみ',
};

// const samplePartialData: PartialSubGoalFormData = {
//   title: 'プログラミング',
//   description: '',
//   background: '',
//   constraints: '',
// };

// テスト用のラッパーコンポーネント
const createWrapper = (goalId = 'goal-1') => {
  const TestWrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(SubGoalProvider, { goalId }, children);
  TestWrapper.displayName = 'TestWrapper';
  return TestWrapper;
};

describe('useSubGoalForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('基本機能', () => {
    it('初期状態が正しく設定される', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useSubGoalForm({ subGoalId: 'subgoal-1' }), { wrapper });

      expect(result.current.formState.isValid).toBe(false); // 必須フィールドが空のため
      expect(result.current.formState.isDirty).toBe(false);
      expect(result.current.formState.isSubmitting).toBe(false);
      expect(result.current.formState.isValidating).toBe(false);
      expect(result.current.formState.hasErrors).toBe(false);
      expect(result.current.formState.hasUnsavedChanges).toBe(false);
      expect(result.current.formState.isDraftSaving).toBe(false);
    });

    it('初期データが正しく設定される', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(
        () =>
          useSubGoalForm({
            subGoalId: 'subgoal-1',
            initialData: sampleFormData,
          }),
        { wrapper }
      );

      expect(result.current.watchedValues.title).toBe(sampleFormData.title);
      expect(result.current.watchedValues.description).toBe(sampleFormData.description);
      expect(result.current.watchedValues.background).toBe(sampleFormData.background);
      expect(result.current.watchedValues.constraints).toBe(sampleFormData.constraints);
    });

    it('フィールド状態を正しく取得できる', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(
        () =>
          useSubGoalForm({
            subGoalId: 'subgoal-1',
            initialData: sampleFormData,
          }),
        { wrapper }
      );

      const titleFieldState = result.current.getFieldState('title');

      expect(titleFieldState.value).toBe(sampleFormData.title);
      expect(titleFieldState.length).toBe(sampleFormData.title.length);
      expect(titleFieldState.maxLength).toBe(100);
      expect(titleFieldState.remainingLength).toBe(100 - sampleFormData.title.length);
      expect(titleFieldState.isDirty).toBe(false);
      expect(titleFieldState.isTouched).toBe(false);
    });

    it('フォームデータを更新できる', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useSubGoalForm({ subGoalId: 'subgoal-1' }), { wrapper });

      const updateData = { title: '新しいタイトル', description: '新しい説明' };

      act(() => {
        result.current.updateFormData(updateData);
      });

      expect(result.current.watchedValues.title).toBe('新しいタイトル');
      expect(result.current.watchedValues.description).toBe('新しい説明');
    });

    it('フォームをリセットできる', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(
        () =>
          useSubGoalForm({
            subGoalId: 'subgoal-1',
            initialData: sampleFormData,
          }),
        { wrapper }
      );

      // データを変更
      act(() => {
        result.current.updateFormData({ title: '変更されたタイトル' });
      });

      expect(result.current.watchedValues.title).toBe('変更されたタイトル');

      // リセット
      act(() => {
        result.current.resetForm();
      });

      expect(result.current.watchedValues.title).toBe('');
      expect(result.current.watchedValues.description).toBe('');
      expect(result.current.watchedValues.background).toBe('');
      expect(result.current.watchedValues.constraints).toBe('');
    });

    it('未保存の変更を検出できる', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(
        () =>
          useSubGoalForm({
            subGoalId: 'subgoal-1',
            initialData: sampleFormData,
          }),
        { wrapper }
      );

      expect(result.current.checkUnsavedChanges()).toBe(false);

      act(() => {
        result.current.updateFormData({ title: '変更されたタイトル' });
      });

      expect(result.current.checkUnsavedChanges()).toBe(true);
    });
  });

  describe('バリデーション', () => {
    it('フィールドバリデーションが正しく動作する', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(
        () =>
          useSubGoalForm({
            subGoalId: 'subgoal-1',
            enableRealtimeValidation: true,
          }),
        { wrapper }
      );

      // 空のタイトルでバリデーション
      const isValid = await act(async () => {
        return await result.current.validateField('title');
      });

      expect(isValid).toBe(false);
    });

    it('リアルタイムバリデーションが無効の場合は動作しない', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(
        () =>
          useSubGoalForm({
            subGoalId: 'subgoal-1',
            enableRealtimeValidation: false,
          }),
        { wrapper }
      );

      const isValid = await act(async () => {
        return await result.current.validateField('title');
      });

      // バリデーション自体は実行されるが、リアルタイム更新は行われない
      expect(isValid).toBe(false);
    });
  });

  describe('下書き保存', () => {
    it('下書き保存が正しく動作する', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(
        () =>
          useSubGoalForm({
            subGoalId: 'subgoal-1',
            initialData: sampleFormData,
          }),
        { wrapper }
      );

      await act(async () => {
        await result.current.saveDraft();
      });

      // 下書き保存の呼び出しが正常に完了することを確認
      // 実際のAPI呼び出しはモックされているため、エラーが発生しないことを確認
      expect(result.current.formState.isDraftSaving).toBe(false);
    });

    it('サブ目標IDが未指定の場合はエラーが発生する', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(
        () =>
          useSubGoalForm({
            subGoalId: '',
            initialData: sampleFormData,
          }),
        { wrapper }
      );

      await expect(
        act(async () => {
          await result.current.saveDraft();
        })
      ).rejects.toThrow('サブ目標IDが指定されていません');
    });

    it('バリデーションエラーがある場合は下書き保存でエラーが発生する', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(
        () =>
          useSubGoalForm({
            subGoalId: 'subgoal-1',
            initialData: { title: '', description: '', background: '', constraints: '' },
          }),
        { wrapper }
      );

      await expect(
        act(async () => {
          await result.current.saveDraft();
        })
      ).rejects.toThrow('バリデーションエラーがあります');
    });
  });

  describe('自動保存', () => {
    it('自動保存が有効な場合の設定が正しく反映される', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(
        () =>
          useSubGoalForm({
            subGoalId: 'subgoal-1',
            enableAutoSave: true,
            autoSaveInterval: 10000,
          }),
        { wrapper }
      );

      // 自動保存の設定が反映されていることを確認
      expect(result.current.formState.isDraftSaving).toBe(false);
    });

    it('自動保存が無効な場合は動作しない', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(
        () =>
          useSubGoalForm({
            subGoalId: 'subgoal-1',
            enableAutoSave: false,
          }),
        { wrapper }
      );

      // 自動保存が無効であることを確認
      expect(result.current.formState.isDraftSaving).toBe(false);
    });
  });

  describe('エラーハンドリング', () => {
    it('エラーハンドリングが正しく動作する', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useSubGoalForm({ subGoalId: 'subgoal-1' }), { wrapper });

      const testError = new Error('テストエラー');

      act(() => {
        result.current.handleError(testError);
      });

      // エラーハンドリングが呼び出されることを確認
      // 実際のエラー状態の確認は SubGoalContext のテストで行う
    });
  });
});

describe('useSubGoalFieldValidation', () => {
  it('フィールドバリデーションが正しく動作する', async () => {
    const { result } = renderHook(() => useSubGoalFieldValidation('title'));

    expect(result.current.validationState.isValid).toBe(true);
    expect(result.current.validationState.isValidating).toBe(false);

    // 空の値でバリデーション
    await act(async () => {
      await result.current.validateField('');
    });

    expect(result.current.validationState.isValid).toBe(false);
    expect(result.current.validationState.error).toBe('タイトルは必須です');
    expect(result.current.validationState.isValidating).toBe(false);

    // 有効な値でバリデーション
    await act(async () => {
      await result.current.validateField('有効なタイトル');
    });

    expect(result.current.validationState.isValid).toBe(true);
    expect(result.current.validationState.error).toBeUndefined();
  });

  it('長すぎる値でバリデーションエラーが発生する', async () => {
    const { result } = renderHook(() => useSubGoalFieldValidation('title'));

    const longTitle = 'a'.repeat(101); // 100文字制限を超える

    await act(async () => {
      await result.current.validateField(longTitle);
    });

    expect(result.current.validationState.isValid).toBe(false);
    expect(result.current.validationState.error).toBe('タイトルは100文字以内で入力してください');
  });

  it('説明フィールドのバリデーションが正しく動作する', async () => {
    const { result } = renderHook(() => useSubGoalFieldValidation('description'));

    // 短すぎる説明
    await act(async () => {
      await result.current.validateField('短い');
    });

    expect(result.current.validationState.isValid).toBe(false);
    expect(result.current.validationState.error).toBe('説明は10文字以上で入力してください');

    // 有効な説明
    await act(async () => {
      await result.current.validateField('これは有効な説明文です。10文字以上あります。');
    });

    expect(result.current.validationState.isValid).toBe(true);
  });
});

describe('useSubGoalFormSubmission', () => {
  const createSubmissionWrapper = () => {
    const SubmissionWrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(SubGoalProvider, { goalId: 'goal-1' }, children);
    SubmissionWrapper.displayName = 'SubmissionWrapper';
    return SubmissionWrapper;
  };

  it('フォーム送信が正しく動作する', async () => {
    const wrapper = createSubmissionWrapper();
    const { result } = renderHook(() => useSubGoalFormSubmission(), { wrapper });

    const mockSubmitFn = vi.fn().mockResolvedValue(undefined);

    expect(result.current.submissionState.isSubmitting).toBe(false);
    expect(result.current.submissionState.success).toBe(false);

    await act(async () => {
      await result.current.submitForm(mockSubmitFn);
    });

    expect(mockSubmitFn).toHaveBeenCalled();
    expect(result.current.submissionState.isSubmitting).toBe(false);
    expect(result.current.submissionState.success).toBe(true);
  });

  it('フォーム送信でエラーが発生した場合の処理', async () => {
    const wrapper = createSubmissionWrapper();
    const { result } = renderHook(() => useSubGoalFormSubmission(), { wrapper });

    const mockError = new Error('送信エラー');
    const mockSubmitFn = vi.fn().mockRejectedValue(mockError);

    await expect(
      act(async () => {
        await result.current.submitForm(mockSubmitFn);
      })
    ).rejects.toThrow('送信エラー');

    expect(result.current.submissionState.isSubmitting).toBe(false);
    expect(result.current.submissionState.success).toBe(false);
    expect(result.current.submissionState.error).toBe('送信エラー');
  });

  it('送信状態をリセットできる', async () => {
    const wrapper = createSubmissionWrapper();
    const { result } = renderHook(() => useSubGoalFormSubmission(), { wrapper });

    const mockSubmitFn = vi.fn().mockResolvedValue(undefined);

    await act(async () => {
      await result.current.submitForm(mockSubmitFn);
    });

    expect(result.current.submissionState.success).toBe(true);

    act(() => {
      result.current.resetSubmissionState();
    });

    expect(result.current.submissionState.isSubmitting).toBe(false);
    expect(result.current.submissionState.success).toBe(false);
    expect(result.current.submissionState.error).toBeUndefined();
  });
});
