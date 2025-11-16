import { act, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { renderHookWithProviders } from '../test/test-utils';
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
      const { result } = renderHookWithProviders(() => useGoalForm());

      expect(result.current.formState.isValid).toBe(false);
      expect(result.current.formState.isDirty).toBe(false);
      expect(result.current.formState.hasErrors).toBe(false);
      expect(result.current.watchedValues.title).toBe('');
    });

    it('初期データが正しく設定される', () => {
      const { result } = renderHookWithProviders(() =>
        useGoalForm({ initialData: sampleFormData })
      );

      expect(result.current.watchedValues.title).toBe(sampleFormData.title);
      expect(result.current.watchedValues.description).toBe(sampleFormData.description);
      expect(result.current.watchedValues.deadline).toBe(sampleFormData.deadline);
      expect(result.current.watchedValues.background).toBe(sampleFormData.background);
      expect(result.current.watchedValues.constraints).toBe(sampleFormData.constraints);
    });
  });

  describe('フィールド状態管理', () => {
    it('フィールドの状態を正しく取得できる', () => {
      const { result } = renderHookWithProviders(() =>
        useGoalForm({ initialData: { title: 'テスト' } })
      );

      const fieldState = result.current.getFieldState('title');

      expect(fieldState.value).toBe('テスト');
      expect(fieldState.length).toBe(3);
      expect(fieldState.isDirty).toBe(false);
      expect(fieldState.isTouched).toBe(false);
    });

    it('フィールドのバリデーションが実行される', async () => {
      const { result } = renderHookWithProviders(() => useGoalForm());

      act(() => {
        result.current.setValue('title', 'テスト目標');
      });

      const isValid = await act(async () => {
        return await result.current.validateField('title');
      });

      expect(isValid).toBe(true);
    });

    it('無効な値でバリデーションが失敗する', async () => {
      const { result } = renderHookWithProviders(() => useGoalForm());

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
      const { result } = renderHookWithProviders(() =>
        useGoalForm({ onDraftSave: mockOnDraftSave, enableAutoSave: false })
      );

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
      const { result } = renderHookWithProviders(() =>
        useGoalForm({ onDraftSave: mockOnDraftSave, enableAutoSave: false })
      );

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
      const { result, unmount } = renderHookWithProviders(() =>
        useGoalForm({
          onDraftSave: mockOnDraftSave,
          enableAutoSave: true,
          autoSaveInterval: 5000,
        })
      );

      // フォームの値を変更してdirtyにする
      await act(async () => {
        result.current.setValue('title', 'テスト', { shouldDirty: true });
        await Promise.resolve();
      });

      // isDirtyがtrueになっていることを確認
      expect(result.current.formState.isDirty).toBe(true);

      // 5秒経過をシミュレート
      await act(async () => {
        vi.advanceTimersByTime(5000);
        // タイマーのコールバックが実行されるまで待つ
        await vi.runAllTimersAsync();
      });

      // 自動保存が呼ばれたことを確認
      expect(mockOnDraftSave).toHaveBeenCalled();

      // クリーンアップ
      unmount();

      // アンマウント後にタイマーがクリアされていることを確認
      mockOnDraftSave.mockClear();
      vi.advanceTimersByTime(5000);
      expect(mockOnDraftSave).not.toHaveBeenCalled();
    });

    it('自動保存が無効な場合、保存されない', async () => {
      const mockOnDraftSave = vi.fn().mockResolvedValue(undefined);
      const { result, unmount } = renderHookWithProviders(() =>
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

      // クリーンアップ
      unmount();
    });
  });

  describe('フォームリセット', () => {
    it('フォームが正しくリセットされる', () => {
      const { result } = renderHookWithProviders(() =>
        useGoalForm({ initialData: sampleFormData, enableAutoSave: false })
      );

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
      const { result } = renderHookWithProviders(() => useGoalForm({ enableAutoSave: false }));

      act(() => {
        result.current.resetForm(samplePartialData);
      });

      expect(result.current.watchedValues.title).toBe(samplePartialData.title);
    });
  });

  describe('未保存変更の検出', () => {
    it('変更がない場合はfalseを返す', () => {
      const { result } = renderHookWithProviders(() =>
        useGoalForm({ initialData: sampleFormData, enableAutoSave: false })
      );

      expect(result.current.checkUnsavedChanges()).toBe(false);
    });

    it('変更がある場合はtrueを返す', async () => {
      const { result } = renderHookWithProviders(() =>
        useGoalForm({ initialData: sampleFormData, enableAutoSave: false })
      );

      await act(async () => {
        result.current.setValue('title', '変更されたタイトル', { shouldDirty: true });
        await Promise.resolve(); // 状態更新を待つ
      });

      // isDirtyがtrueになっていることを確認
      expect(result.current.formState.isDirty).toBe(true);
      expect(result.current.formState.hasUnsavedChanges).toBe(true);
    });
  });
});

describe('useFieldValidation', () => {
  it('有効な値でバリデーションが成功する', async () => {
    const { result } = renderHookWithProviders(() => useFieldValidation('title'));

    await act(async () => {
      const isValid = await result.current.validateField('有効なタイトル');
      expect(isValid).toBe(true);
    });

    expect(result.current.validationState.isValid).toBe(true);
    expect(result.current.validationState.error).toBeUndefined();
    expect(result.current.validationState.isValidating).toBe(false);
  });

  it('無効な値でバリデーションが失敗する', async () => {
    const { result } = renderHookWithProviders(() => useFieldValidation('title'));

    await act(async () => {
      const isValid = await result.current.validateField('a'.repeat(101)); // 100文字制限を超える
      expect(isValid).toBe(false);
    });

    expect(result.current.validationState.isValid).toBe(false);
    expect(result.current.validationState.error).toBeDefined();
    expect(result.current.validationState.isValidating).toBe(false);
  });

  it('バリデーション中の状態が正しく管理される', async () => {
    const { result } = renderHookWithProviders(() => useFieldValidation('title'));

    // バリデーション開始前
    expect(result.current.validationState.isValidating).toBe(false);

    // バリデーション実行
    const validatePromise = act(async () => {
      return result.current.validateField('テスト');
    });

    // バリデーション完了後
    await validatePromise;
    expect(result.current.validationState.isValidating).toBe(false);
  });
});

describe('useFormSubmission', () => {
  it('送信が成功する', async () => {
    const { result } = renderHookWithProviders(() => useFormSubmission());

    const mockSubmitFn = vi.fn().mockResolvedValue(undefined);

    await act(async () => {
      await result.current.submitForm(mockSubmitFn);
    });

    expect(mockSubmitFn).toHaveBeenCalledTimes(1);
    expect(result.current.submissionState.isSubmitting).toBe(false);
    expect(result.current.submissionState.success).toBe(true);
    expect(result.current.submissionState.error).toBeUndefined();
  });

  it('送信エラーが適切に処理される', async () => {
    const { result } = renderHookWithProviders(() => useFormSubmission());

    const mockSubmitFn = vi.fn().mockRejectedValue(new Error('送信エラー'));

    let thrownError: Error | null = null;

    await act(async () => {
      try {
        await result.current.submitForm(mockSubmitFn);
      } catch (error) {
        thrownError = error as Error;
      }
    });

    // エラーがスローされたことを確認
    expect(thrownError).toBeInstanceOf(Error);
    expect(thrownError?.message).toBe('送信エラー');

    // 状態が正しく更新されていることを確認
    expect(result.current.submissionState.isSubmitting).toBe(false);
    expect(result.current.submissionState.success).toBe(false);
    expect(result.current.submissionState.error).toBe('送信エラー');
  });

  it('送信中の状態が正しく管理される', async () => {
    const { result } = renderHookWithProviders(() => useFormSubmission());

    const mockSubmitFn = vi
      .fn()
      .mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

    // 送信開始前
    expect(result.current.submissionState.isSubmitting).toBe(false);

    // 送信開始
    const submitPromise = act(async () => {
      return result.current.submitForm(mockSubmitFn);
    });

    // 送信完了後
    await submitPromise;
    expect(result.current.submissionState.isSubmitting).toBe(false);
    expect(result.current.submissionState.success).toBe(true);
  });

  it('送信状態がリセットされる', () => {
    const { result } = renderHookWithProviders(() => useFormSubmission());

    // 初期状態
    expect(result.current.submissionState.isSubmitting).toBe(false);
    expect(result.current.submissionState.success).toBe(false);

    // リセット実行
    act(() => {
      result.current.resetSubmissionState();
    });

    // リセット後
    expect(result.current.submissionState.isSubmitting).toBe(false);
    expect(result.current.submissionState.success).toBe(false);
    expect(result.current.submissionState.error).toBeUndefined();
  });
});
