import { renderHook, act, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { useGoalForm, useFieldValidation, useFormSubmission } from './useGoalForm';
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

describe('useGoalForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('基本機能', () => {
    it('初期状態が正しく設定される', () => {
      const { result } = renderHook(() => useGoalForm());

      expect(result.current.formState.isValid).toBe(false);
      expect(result.current.formState.isDirty).toBe(false);
      expect(result.current.formState.hasErrors).toBe(false);
      expect(result.current.formState.hasUnsavedChanges).toBe(false);
      expect(result.current.watchedValues.title).toBe('');
    });

    it('初期データが正しく設定される', () => {
      const { result } = renderHook(() => useGoalForm({ initialData: sampleFormData }));

      expect(result.current.watchedValues.title).toBe(sampleFormData.title);
      expect(result.current.watchedValues.description).toBe(sampleFormData.description);
      expect(result.current.watchedValues.deadline).toBe(sampleFormData.deadline);
      expect(result.current.watchedValues.background).toBe(sampleFormData.background);
      expect(result.current.watchedValues.constraints).toBe(sampleFormData.constraints);
    });
  });

  describe('フィールド状態管理', () => {
    it('フィールドの状態を正しく取得できる', () => {
      const { result } = renderHook(() => useGoalForm({ initialData: { title: 'テスト' } }));

      const fieldState = result.current.getFieldState('title');

      expect(fieldState.value).toBe('テスト');
      expect(fieldState.length).toBe(3);
      expect(fieldState.isDirty).toBe(false);
      expect(fieldState.isTouched).toBe(false);
    });

    it('フィールドのバリデーションが実行される', async () => {
      const { result } = renderHook(() => useGoalForm());

      act(() => {
        result.current.setValue('title', 'テスト目標');
      });

      const isValid = await act(async () => {
        return await result.current.validateField('title');
      });

      expect(isValid).toBe(true);
    });

    it('無効な値でバリデーションが失敗する', async () => {
      const { result } = renderHook(() => useGoalForm());

      act(() => {
        result.current.setValue('title', 'a'.repeat(101)); // 100文字制限を超える
      });

      const isValid = await act(async () => {
        return await result.current.validateField('title');
      });

      expect(isValid).toBe(false);
    });
  });

  describe('下書き保存', () => {
    it('下書き保存が正しく実行される', async () => {
      const mockOnDraftSave = vi.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() => useGoalForm({ onDraftSave: mockOnDraftSave }));

      act(() => {
        result.current.setValue('title', 'テスト');
      });

      await act(async () => {
        await result.current.saveDraft();
      });

      expect(mockOnDraftSave).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'テスト',
        })
      );
    });

    it('下書き保存エラーが適切に処理される', async () => {
      const mockOnDraftSave = vi.fn().mockRejectedValue(new Error('保存エラー'));
      const { result } = renderHook(() => useGoalForm({ onDraftSave: mockOnDraftSave }));

      act(() => {
        result.current.setValue('title', 'テスト');
      });

      await expect(
        act(async () => {
          await result.current.saveDraft();
        })
      ).rejects.toThrow('保存エラー');
    });
  });

  describe('自動保存', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('自動保存が有効な場合、指定間隔で保存される', async () => {
      const mockOnDraftSave = vi.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() =>
        useGoalForm({
          onDraftSave: mockOnDraftSave,
          enableAutoSave: true,
          autoSaveInterval: 5000,
        })
      );

      act(() => {
        result.current.setValue('title', 'テスト');
      });

      // 5秒経過をシミュレート
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        expect(mockOnDraftSave).toHaveBeenCalled();
      });
    });

    it('自動保存が無効な場合、保存されない', async () => {
      const mockOnDraftSave = vi.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() =>
        useGoalForm({
          onDraftSave: mockOnDraftSave,
          enableAutoSave: false,
        })
      );

      act(() => {
        result.current.setValue('title', 'テスト');
      });

      act(() => {
        vi.advanceTimersByTime(30000);
      });

      expect(mockOnDraftSave).not.toHaveBeenCalled();
    });
  });

  describe('フォームリセット', () => {
    it('フォームが正しくリセットされる', () => {
      const { result } = renderHook(() => useGoalForm({ initialData: sampleFormData }));

      act(() => {
        result.current.setValue('title', '変更されたタイトル');
      });

      expect(result.current.watchedValues.title).toBe('変更されたタイトル');

      act(() => {
        result.current.resetForm();
      });

      expect(result.current.watchedValues.title).toBe('');
    });

    it('指定されたデータでリセットされる', () => {
      const { result } = renderHook(() => useGoalForm());

      act(() => {
        result.current.resetForm(samplePartialData);
      });

      expect(result.current.watchedValues.title).toBe(samplePartialData.title);
    });
  });

  describe('未保存変更の検出', () => {
    it('変更がない場合はfalseを返す', () => {
      const { result } = renderHook(() => useGoalForm({ initialData: sampleFormData }));

      expect(result.current.checkUnsavedChanges()).toBe(false);
    });

    it('変更がある場合はtrueを返す', () => {
      const { result } = renderHook(() => useGoalForm({ initialData: sampleFormData }));

      act(() => {
        result.current.setValue('title', '変更されたタイトル');
      });

      expect(result.current.checkUnsavedChanges()).toBe(true);
    });
  });
});

describe('useFieldValidation', () => {
  it('有効な値でバリデーションが成功する', async () => {
    const { result } = renderHook(() => useFieldValidation('title'));

    const isValid = await act(async () => {
      return await result.current.validateField('有効なタイトル');
    });

    expect(isValid).toBe(true);
    expect(result.current.validationState.isValid).toBe(true);
    expect(result.current.validationState.error).toBeUndefined();
  });

  it('無効な値でバリデーションが失敗する', async () => {
    const { result } = renderHook(() => useFieldValidation('title'));

    const isValid = await act(async () => {
      return await result.current.validateField('a'.repeat(101));
    });

    expect(isValid).toBe(false);
    expect(result.current.validationState.isValid).toBe(false);
    expect(result.current.validationState.error).toBeDefined();
  });

  it('バリデーション中の状態が正しく管理される', async () => {
    const { result } = renderHook(() => useFieldValidation('title'));

    const validationPromise = act(async () => {
      return result.current.validateField('テスト');
    });

    // バリデーション中の状態を確認
    expect(result.current.validationState.isValidating).toBe(true);

    await validationPromise;

    // バリデーション完了後の状態を確認
    expect(result.current.validationState.isValidating).toBe(false);
  });
});

describe('useFormSubmission', () => {
  it('送信が成功する', async () => {
    const mockSubmitFn = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useFormSubmission());

    await act(async () => {
      await result.current.submitForm(mockSubmitFn);
    });

    expect(mockSubmitFn).toHaveBeenCalled();
    expect(result.current.submissionState.success).toBe(true);
    expect(result.current.submissionState.isSubmitting).toBe(false);
  });

  it('送信エラーが適切に処理される', async () => {
    const mockSubmitFn = vi.fn().mockRejectedValue(new Error('送信エラー'));
    const { result } = renderHook(() => useFormSubmission());

    await expect(
      act(async () => {
        await result.current.submitForm(mockSubmitFn);
      })
    ).rejects.toThrow('送信エラー');

    expect(result.current.submissionState.success).toBe(false);
    expect(result.current.submissionState.isSubmitting).toBe(false);
    expect(result.current.submissionState.error).toBe('送信エラー');
  });

  it('送信中の状態が正しく管理される', async () => {
    const mockSubmitFn = vi
      .fn()
      .mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
    const { result } = renderHook(() => useFormSubmission());

    const submissionPromise = act(async () => {
      return result.current.submitForm(mockSubmitFn);
    });

    // 送信中の状態を確認
    expect(result.current.submissionState.isSubmitting).toBe(true);

    await submissionPromise;

    // 送信完了後の状態を確認
    expect(result.current.submissionState.isSubmitting).toBe(false);
  });

  it('送信状態がリセットされる', () => {
    const { result } = renderHook(() => useFormSubmission());

    act(() => {
      result.current.resetSubmissionState();
    });

    expect(result.current.submissionState.isSubmitting).toBe(false);
    expect(result.current.submissionState.success).toBe(false);
    expect(result.current.submissionState.error).toBeUndefined();
  });
});
