import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { vi } from 'vitest';
import {
  GoalFormProvider,
  useGoalFormContext,
  useGoalFormState,
  useGoalFormActions,
  useGoalFormField,
  useGoalFormSubmission,
  useGoalFormDraftSave,
} from './GoalFormContext';
import { GoalFormData, PartialGoalFormData } from '../schemas/goal-form';

// テスト用のサンプルデータ
const sampleFormData: GoalFormData = {
  title: 'プログラミングスキル向上',
  description: 'React、TypeScript、Node.jsを習得してWebアプリケーションを開発できるようになる',
  deadline: '2024-06-30',
  background: '現在の職場でWebアプリケーション開発の需要が高まっており、スキルアップが必要',
  constraints: '平日は仕事があるため学習時間は限られる',
};

const samplePartialData: PartialGoalFormData = {
  title: 'プログラミング',
  description: '',
  deadline: '',
  background: '',
  constraints: '',
};

// テスト用のラッパーコンポーネント
const createWrapper = (initialData?: Partial<GoalFormData>, autoSaveEnabled = true) => {
  return ({ children }: { children: React.ReactNode }) => (
    <GoalFormProvider initialData={initialData} autoSaveEnabled={autoSaveEnabled}>
      {children}
    </GoalFormProvider>
  );
};

describe('GoalFormContext', () => {
  describe('GoalFormProvider', () => {
    it('初期状態が正しく設定される', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useGoalFormState(), { wrapper });

      expect(result.current.formData.title).toBe('');
      expect(result.current.formData.description).toBe('');
      expect(result.current.formData.deadline).toBe('');
      expect(result.current.formData.background).toBe('');
      expect(result.current.formData.constraints).toBe('');
      expect(result.current.lastSavedData).toBeNull();
      expect(result.current.isSubmitting).toBe(false);
      expect(result.current.isDraftSaving).toBe(false);
      expect(result.current.autoSaveEnabled).toBe(true);
      expect(result.current.hasUnsavedChanges).toBe(false);
      expect(result.current.errors).toEqual({});
      expect(result.current.success).toBe(false);
      expect(result.current.isInitialized).toBe(true);
    });

    it('初期データが正しく設定される', () => {
      const wrapper = createWrapper(sampleFormData);
      const { result } = renderHook(() => useGoalFormState(), { wrapper });

      expect(result.current.formData.title).toBe(sampleFormData.title);
      expect(result.current.formData.description).toBe(sampleFormData.description);
      expect(result.current.formData.deadline).toBe(sampleFormData.deadline);
      expect(result.current.formData.background).toBe(sampleFormData.background);
      expect(result.current.formData.constraints).toBe(sampleFormData.constraints);
      expect(result.current.lastSavedData).toEqual(sampleFormData);
      expect(result.current.hasUnsavedChanges).toBe(false);
    });

    it('自動保存の初期設定が反映される', () => {
      const wrapper = createWrapper(undefined, false);
      const { result } = renderHook(() => useGoalFormState(), { wrapper });

      expect(result.current.autoSaveEnabled).toBe(false);
    });
  });

  describe('useGoalFormContext', () => {
    it('プロバイダー外で使用するとエラーが発生する', () => {
      // コンソールエラーを抑制
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useGoalFormContext());
      }).toThrow('useGoalFormContext must be used within a GoalFormProvider');

      consoleSpy.mockRestore();
    });

    it('プロバイダー内で正しく動作する', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useGoalFormContext(), { wrapper });

      expect(result.current.state).toBeDefined();
      expect(result.current.initializeForm).toBeDefined();
      expect(result.current.updateField).toBeDefined();
      expect(result.current.updateFormData).toBeDefined();
    });
  });

  describe('useGoalFormActions', () => {
    it('フィールドの更新が正しく動作する', () => {
      const wrapper = createWrapper();
      const { result: stateResult } = renderHook(() => useGoalFormState(), { wrapper });
      const { result: actionsResult } = renderHook(() => useGoalFormActions(), { wrapper });

      act(() => {
        actionsResult.current.updateField('title', 'テストタイトル');
      });

      expect(stateResult.current.formData.title).toBe('テストタイトル');
      expect(stateResult.current.hasUnsavedChanges).toBe(true);
    });

    it('フォームデータの更新が正しく動作する', () => {
      const wrapper = createWrapper();
      const { result: stateResult } = renderHook(() => useGoalFormState(), { wrapper });
      const { result: actionsResult } = renderHook(() => useGoalFormActions(), { wrapper });

      act(() => {
        actionsResult.current.updateFormData(samplePartialData);
      });

      expect(stateResult.current.formData.title).toBe(samplePartialData.title);
      expect(stateResult.current.hasUnsavedChanges).toBe(true);
    });

    it('送信状態の設定が正しく動作する', () => {
      const wrapper = createWrapper();
      const { result: stateResult } = renderHook(() => useGoalFormState(), { wrapper });
      const { result: actionsResult } = renderHook(() => useGoalFormActions(), { wrapper });

      act(() => {
        actionsResult.current.setSubmitting(true);
      });

      expect(stateResult.current.isSubmitting).toBe(true);

      act(() => {
        actionsResult.current.setSubmitting(false);
      });

      expect(stateResult.current.isSubmitting).toBe(false);
    });

    it('下書き保存状態の設定が正しく動作する', () => {
      const wrapper = createWrapper();
      const { result: stateResult } = renderHook(() => useGoalFormState(), { wrapper });
      const { result: actionsResult } = renderHook(() => useGoalFormActions(), { wrapper });

      act(() => {
        actionsResult.current.setDraftSaving(true);
      });

      expect(stateResult.current.isDraftSaving).toBe(true);

      act(() => {
        actionsResult.current.setDraftSaving(false);
      });

      expect(stateResult.current.isDraftSaving).toBe(false);
    });

    it('エラーの設定とクリアが正しく動作する', () => {
      const wrapper = createWrapper();
      const { result: stateResult } = renderHook(() => useGoalFormState(), { wrapper });
      const { result: actionsResult } = renderHook(() => useGoalFormActions(), { wrapper });

      const errors = { title: 'タイトルエラー', description: '説明エラー' };

      act(() => {
        actionsResult.current.setErrors(errors);
      });

      expect(stateResult.current.errors).toEqual(errors);
      expect(stateResult.current.success).toBe(false);

      act(() => {
        actionsResult.current.clearErrors();
      });

      expect(stateResult.current.errors).toEqual({});
    });

    it('成功状態の設定が正しく動作する', () => {
      const wrapper = createWrapper();
      const { result: stateResult } = renderHook(() => useGoalFormState(), { wrapper });
      const { result: actionsResult } = renderHook(() => useGoalFormActions(), { wrapper });

      act(() => {
        actionsResult.current.setSuccess(true);
      });

      expect(stateResult.current.success).toBe(true);

      act(() => {
        actionsResult.current.setSuccess(false);
      });

      expect(stateResult.current.success).toBe(false);
    });

    it('下書き保存成功が正しく動作する', () => {
      const wrapper = createWrapper();
      const { result: stateResult } = renderHook(() => useGoalFormState(), { wrapper });
      const { result: actionsResult } = renderHook(() => useGoalFormActions(), { wrapper });

      // まず変更を作成
      act(() => {
        actionsResult.current.updateField('title', 'テスト');
      });

      expect(stateResult.current.hasUnsavedChanges).toBe(true);

      // 下書き保存成功
      act(() => {
        actionsResult.current.saveDraftSuccess(samplePartialData);
      });

      expect(stateResult.current.lastSavedData).toEqual(samplePartialData);
      expect(stateResult.current.hasUnsavedChanges).toBe(false);
      expect(stateResult.current.isDraftSaving).toBe(false);
      expect(stateResult.current.errors).toEqual({});
    });

    it('送信成功が正しく動作する', () => {
      const wrapper = createWrapper();
      const { result: stateResult } = renderHook(() => useGoalFormState(), { wrapper });
      const { result: actionsResult } = renderHook(() => useGoalFormActions(), { wrapper });

      // まず変更を作成
      act(() => {
        actionsResult.current.updateFormData(sampleFormData);
      });

      // 送信成功
      act(() => {
        actionsResult.current.submitSuccess();
      });

      expect(stateResult.current.lastSavedData).toEqual(sampleFormData);
      expect(stateResult.current.hasUnsavedChanges).toBe(false);
      expect(stateResult.current.isSubmitting).toBe(false);
      expect(stateResult.current.success).toBe(true);
      expect(stateResult.current.errors).toEqual({});
    });

    it('フォームリセットが正しく動作する', () => {
      const wrapper = createWrapper(sampleFormData);
      const { result: stateResult } = renderHook(() => useGoalFormState(), { wrapper });
      const { result: actionsResult } = renderHook(() => useGoalFormActions(), { wrapper });

      // 変更を作成
      act(() => {
        actionsResult.current.updateField('title', '変更されたタイトル');
      });

      expect(stateResult.current.formData.title).toBe('変更されたタイトル');

      // リセット
      act(() => {
        actionsResult.current.resetForm();
      });

      expect(stateResult.current.formData.title).toBe('');
      expect(stateResult.current.lastSavedData.title).toBe('');
      expect(stateResult.current.hasUnsavedChanges).toBe(false);
      expect(stateResult.current.errors).toEqual({});
      expect(stateResult.current.success).toBe(false);
    });

    it('指定データでのフォームリセットが正しく動作する', () => {
      const wrapper = createWrapper();
      const { result: stateResult } = renderHook(() => useGoalFormState(), { wrapper });
      const { result: actionsResult } = renderHook(() => useGoalFormActions(), { wrapper });

      act(() => {
        actionsResult.current.resetForm(samplePartialData);
      });

      expect(stateResult.current.formData).toEqual(samplePartialData);
      expect(stateResult.current.lastSavedData).toEqual(samplePartialData);
    });
  });

  describe('useGoalFormField', () => {
    it('フィールドの値と更新が正しく動作する', () => {
      const wrapper = createWrapper(sampleFormData);
      const { result } = renderHook(() => useGoalFormField('title'), { wrapper });

      expect(result.current.value).toBe(sampleFormData.title);
      expect(result.current.hasError).toBe(false);

      act(() => {
        result.current.updateValue('新しいタイトル');
      });

      expect(result.current.value).toBe('新しいタイトル');
    });

    it('フィールドエラーが正しく表示される', () => {
      const wrapper = createWrapper();
      const { result: fieldResult } = renderHook(() => useGoalFormField('title'), { wrapper });
      const { result: actionsResult } = renderHook(() => useGoalFormActions(), { wrapper });

      act(() => {
        actionsResult.current.setErrors({ title: 'タイトルエラー' });
      });

      expect(fieldResult.current.error).toBe('タイトルエラー');
      expect(fieldResult.current.hasError).toBe(true);
    });
  });

  describe('useGoalFormSubmission', () => {
    it('送信処理が正しく動作する', async () => {
      const mockSubmitFn = vi.fn().mockResolvedValue(undefined);
      const wrapper = createWrapper(sampleFormData);
      const { result } = renderHook(() => useGoalFormSubmission(), { wrapper });

      await act(async () => {
        await result.current.handleSubmit(mockSubmitFn);
      });

      expect(mockSubmitFn).toHaveBeenCalledWith(sampleFormData);
      expect(result.current.success).toBe(true);
      expect(result.current.isSubmitting).toBe(false);
    });

    it('送信エラーが正しく処理される', async () => {
      const mockSubmitFn = vi.fn().mockRejectedValue(new Error('送信エラー'));
      const wrapper = createWrapper(sampleFormData);
      const { result } = renderHook(() => useGoalFormSubmission(), { wrapper });

      await act(async () => {
        await result.current.handleSubmit(mockSubmitFn);
      });

      expect(result.current.success).toBe(false);
      expect(result.current.isSubmitting).toBe(false);
      expect(result.current.errors.submit).toBe('送信エラー');
    });
  });

  describe('useGoalFormDraftSave', () => {
    it('下書き保存処理が正しく動作する', async () => {
      const mockSaveFn = vi.fn().mockResolvedValue(undefined);
      const wrapper = createWrapper(samplePartialData);
      const { result } = renderHook(() => useGoalFormDraftSave(), { wrapper });

      await act(async () => {
        await result.current.handleDraftSave(mockSaveFn);
      });

      expect(mockSaveFn).toHaveBeenCalledWith(samplePartialData);
      expect(result.current.isDraftSaving).toBe(false);
    });

    it('下書き保存エラーが正しく処理される', async () => {
      const mockSaveFn = vi.fn().mockRejectedValue(new Error('保存エラー'));
      const wrapper = createWrapper(samplePartialData);
      const { result: draftResult } = renderHook(() => useGoalFormDraftSave(), { wrapper });
      const { result: stateResult } = renderHook(() => useGoalFormState(), { wrapper });

      await act(async () => {
        await draftResult.current.handleDraftSave(mockSaveFn);
      });

      expect(draftResult.current.isDraftSaving).toBe(false);
      expect(stateResult.current.errors.draftSave).toBe('保存エラー');
    });

    it('未保存の変更が正しく検出される', () => {
      const wrapper = createWrapper(sampleFormData);
      const { result: draftResult } = renderHook(() => useGoalFormDraftSave(), { wrapper });
      const { result: actionsResult } = renderHook(() => useGoalFormActions(), { wrapper });

      // 初期状態では未保存の変更なし
      expect(draftResult.current.hasUnsavedChanges).toBe(false);

      // 変更を作成
      act(() => {
        actionsResult.current.updateField('title', '変更されたタイトル');
      });

      expect(draftResult.current.hasUnsavedChanges).toBe(true);
    });
  });

  describe('未保存変更の検出', () => {
    it('初期データがない場合の変更検出', () => {
      const wrapper = createWrapper();
      const { result: stateResult } = renderHook(() => useGoalFormState(), { wrapper });
      const { result: actionsResult } = renderHook(() => useGoalFormActions(), { wrapper });

      // 初期状態では変更なし
      expect(stateResult.current.hasUnsavedChanges).toBe(false);

      // 空でない値を入力すると変更あり
      act(() => {
        actionsResult.current.updateField('title', 'テスト');
      });

      expect(stateResult.current.hasUnsavedChanges).toBe(true);
    });

    it('初期データがある場合の変更検出', () => {
      const wrapper = createWrapper(sampleFormData);
      const { result: stateResult } = renderHook(() => useGoalFormState(), { wrapper });
      const { result: actionsResult } = renderHook(() => useGoalFormActions(), { wrapper });

      // 初期状態では変更なし
      expect(stateResult.current.hasUnsavedChanges).toBe(false);

      // 値を変更すると変更あり
      act(() => {
        actionsResult.current.updateField('title', '変更されたタイトル');
      });

      expect(stateResult.current.hasUnsavedChanges).toBe(true);

      // 元の値に戻すと変更なし
      act(() => {
        actionsResult.current.updateField('title', sampleFormData.title);
      });

      expect(stateResult.current.hasUnsavedChanges).toBe(false);
    });
  });
});
