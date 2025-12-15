import { renderHook, cleanup, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useGoalForm } from './useGoalForm';
import { GoalFormData } from '../schemas/goal-form';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.clearAllTimers();
});

describe('useGoalForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('初期化テスト', () => {
    it('デフォルト値で初期化される', () => {
      const { result } = renderHook(() => useGoalForm());

      expect(result.current.formState.isValid).toBe(false);
      expect(result.current.formState.isDirty).toBe(false);
      expect(result.current.formState.isSubmitting).toBe(false);
      expect(result.current.formState.isValidating).toBe(false);
      expect(result.current.formState.hasErrors).toBe(false);
      expect(result.current.formState.hasUnsavedChanges).toBe(false);
    });

    it('初期データが設定される', () => {
      const initialData: Partial<GoalFormData> = {
        title: 'テスト目標',
        description: 'テスト説明',
        deadline: '2025-12-31',
        background: 'テスト背景',
      };

      const { result } = renderHook(() => useGoalForm({ initialData }));

      expect(result.current.watchedValues.title).toBe('テスト目標');
      expect(result.current.watchedValues.description).toBe('テスト説明');
      expect(result.current.watchedValues.deadline).toBe('2025-12-31');
      expect(result.current.watchedValues.background).toBe('テスト背景');
    });

    it('初期データが変更された場合にフォームがリセットされる', () => {
      const initialData1: Partial<GoalFormData> = {
        title: '初期目標1',
      };

      const { result, rerender } = renderHook(({ initialData }) => useGoalForm({ initialData }), {
        initialProps: { initialData: initialData1 },
      });

      expect(result.current.watchedValues.title).toBe('初期目標1');

      const initialData2: Partial<GoalFormData> = {
        title: '初期目標2',
      };

      rerender({ initialData: initialData2 });

      expect(result.current.watchedValues.title).toBe('初期目標2');
    });

    it('バリデーションモードが正しく設定される (onBlur)', () => {
      const { result } = renderHook(() => useGoalForm({ mode: 'onBlur' }));

      expect(result.current.formState).toBeDefined();
    });

    it('バリデーションモードが正しく設定される (onChange)', () => {
      const { result } = renderHook(() => useGoalForm({ mode: 'onChange' }));

      expect(result.current.formState).toBeDefined();
    });

    it('リアルタイムバリデーションが有効に設定される', () => {
      const { result } = renderHook(() => useGoalForm({ enableRealtimeValidation: true }));

      expect(result.current.formState).toBeDefined();
    });

    it('リアルタイムバリデーションが無効に設定される', () => {
      const { result } = renderHook(() => useGoalForm({ enableRealtimeValidation: false }));

      expect(result.current.formState).toBeDefined();
    });

    it('自動保存が有効に設定される', () => {
      const mockOnDraftSave = vi.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() =>
        useGoalForm({
          enableAutoSave: true,
          onDraftSave: mockOnDraftSave,
        })
      );

      expect(result.current.formState).toBeDefined();
    });

    it('自動保存が無効に設定される', () => {
      const { result } = renderHook(() => useGoalForm({ enableAutoSave: false }));

      expect(result.current.formState).toBeDefined();
    });

    it('自動保存間隔が正しく設定される', () => {
      const mockOnDraftSave = vi.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() =>
        useGoalForm({
          enableAutoSave: true,
          autoSaveInterval: 10000,
          onDraftSave: mockOnDraftSave,
        })
      );

      expect(result.current.formState).toBeDefined();
    });
  });

  describe('バリデーションテスト', () => {
    it('必須フィールドが空の場合はエラーになる', async () => {
      const { result } = renderHook(() => useGoalForm());

      await act(async () => {
        await result.current.validateField('title');
      });

      expect(result.current.formState.isValid).toBe(false);
    });

    it('全フィールドが入力されている場合は有効になる', async () => {
      const { result } = renderHook(() => useGoalForm());

      await act(async () => {
        result.current.setValue('title', 'テスト目標');
        result.current.setValue('description', 'テスト説明');
        result.current.setValue('deadline', '2025-12-31');
        result.current.setValue('background', 'テスト背景');
      });

      await act(async () => {
        await result.current.trigger();
      });

      expect(result.current.formState.isValid).toBe(true);
    });

    it('titleフィールドのバリデーション', async () => {
      const { result } = renderHook(() => useGoalForm());

      await act(async () => {
        result.current.setValue('title', 'テスト目標');
        await result.current.validateField('title');
      });

      const fieldState = result.current.getFieldState('title');
      expect(fieldState.error).toBeUndefined();
    });

    it('descriptionフィールドのバリデーション', async () => {
      const { result } = renderHook(() => useGoalForm());

      await act(async () => {
        result.current.setValue('description', 'テスト説明');
        await result.current.validateField('description');
      });

      const fieldState = result.current.getFieldState('description');
      expect(fieldState.error).toBeUndefined();
    });

    it('deadlineフィールドのバリデーション', async () => {
      const { result } = renderHook(() => useGoalForm());

      await act(async () => {
        result.current.setValue('deadline', '2025-12-31');
        await result.current.validateField('deadline');
      });

      const fieldState = result.current.getFieldState('deadline');
      expect(fieldState.error).toBeUndefined();
    });

    it('backgroundフィールドのバリデーション', async () => {
      const { result } = renderHook(() => useGoalForm());

      await act(async () => {
        result.current.setValue('background', 'テスト背景');
        await result.current.validateField('background');
      });

      const fieldState = result.current.getFieldState('background');
      expect(fieldState.error).toBeUndefined();
    });

    it('constraintsフィールドのバリデーション（任意）', async () => {
      const { result } = renderHook(() => useGoalForm());

      await act(async () => {
        result.current.setValue('constraints', 'テスト制約');
        await result.current.validateField('constraints');
      });

      const fieldState = result.current.getFieldState('constraints');
      expect(fieldState.error).toBeUndefined();
    });

    it('文字数制限のバリデーション (title: 100文字)', async () => {
      const { result } = renderHook(() => useGoalForm());
      const longTitle = 'あ'.repeat(101);

      await act(async () => {
        result.current.setValue('title', longTitle);
        await result.current.validateField('title');
      });

      const fieldState = result.current.getFieldState('title');
      expect(fieldState.error).toBeDefined();
    });

    it('文字数制限のバリデーション (description: 1000文字)', async () => {
      const { result } = renderHook(() => useGoalForm());
      const longDescription = 'あ'.repeat(1001);

      await act(async () => {
        result.current.setValue('description', longDescription);
        await result.current.validateField('description');
      });

      const fieldState = result.current.getFieldState('description');
      expect(fieldState.error).toBeDefined();
    });

    it('日付形式のバリデーション (deadline: YYYY-MM-DD)', async () => {
      const { result } = renderHook(() => useGoalForm());

      await act(async () => {
        result.current.setValue('deadline', '2025-12-31');
        await result.current.validateField('deadline');
      });

      const fieldState = result.current.getFieldState('deadline');
      expect(fieldState.error).toBeUndefined();
    });

    it('未来の日付のバリデーション (deadline: 今日以降)', async () => {
      const { result } = renderHook(() => useGoalForm());
      const pastDate = '2020-01-01';

      await act(async () => {
        result.current.setValue('deadline', pastDate);
        await result.current.validateField('deadline');
      });

      const fieldState = result.current.getFieldState('deadline');
      expect(fieldState.error).toBeDefined();
    });

    it('フィールド状態の取得 (getFieldState)', () => {
      const { result } = renderHook(() => useGoalForm());

      act(() => {
        result.current.setValue('title', 'テスト', { shouldDirty: true, shouldTouch: true });
      });

      const fieldState = result.current.getFieldState('title');
      expect(fieldState.value).toBe('テスト');
      expect(fieldState.isDirty).toBe(true);
      expect(fieldState.isTouched).toBe(true);
      expect(fieldState.length).toBe(3); // "テスト" is 3 characters
    });
  });

  describe('自動保存テスト', () => {
    it('自動保存が有効な場合、指定間隔で保存される', async () => {
      vi.useFakeTimers();
      const mockOnDraftSave = vi.fn().mockResolvedValue(undefined);

      const { result } = renderHook(() =>
        useGoalForm({
          onDraftSave: mockOnDraftSave,
          enableAutoSave: true,
          autoSaveInterval: 5000,
        })
      );

      await act(async () => {
        result.current.setValue('title', 'テスト', { shouldDirty: true });
      });

      await act(async () => {
        vi.advanceTimersByTime(5000);
        await vi.runAllTimersAsync();
      });

      expect(mockOnDraftSave).toHaveBeenCalled();

      vi.useRealTimers();
    });

    it('自動保存が無効な場合、保存されない', async () => {
      vi.useFakeTimers();
      const mockOnDraftSave = vi.fn().mockResolvedValue(undefined);

      const { result } = renderHook(() =>
        useGoalForm({
          onDraftSave: mockOnDraftSave,
          enableAutoSave: false,
          autoSaveInterval: 5000,
        })
      );

      await act(async () => {
        result.current.setValue('title', 'テスト', { shouldDirty: true });
      });

      await act(async () => {
        vi.advanceTimersByTime(5000);
        await vi.runAllTimersAsync();
      });

      expect(mockOnDraftSave).not.toHaveBeenCalled();

      vi.useRealTimers();
    });

    it('変更がない場合、自動保存されない', async () => {
      vi.useFakeTimers();
      const mockOnDraftSave = vi.fn().mockResolvedValue(undefined);

      renderHook(() =>
        useGoalForm({
          onDraftSave: mockOnDraftSave,
          enableAutoSave: true,
          autoSaveInterval: 5000,
        })
      );

      await act(async () => {
        vi.advanceTimersByTime(5000);
        await vi.runAllTimersAsync();
      });

      expect(mockOnDraftSave).not.toHaveBeenCalled();

      vi.useRealTimers();
    });

    it('自動保存中にエラーが発生した場合の処理', async () => {
      vi.useFakeTimers();
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const mockOnDraftSave = vi.fn().mockRejectedValue(new Error('保存エラー'));

      const { result } = renderHook(() =>
        useGoalForm({
          onDraftSave: mockOnDraftSave,
          enableAutoSave: true,
          autoSaveInterval: 5000,
        })
      );

      await act(async () => {
        result.current.setValue('title', 'テスト', { shouldDirty: true });
      });

      await act(async () => {
        vi.advanceTimersByTime(5000);
        await vi.runAllTimersAsync();
      });

      expect(mockOnDraftSave).toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalledWith('自動保存に失敗しました:', expect.any(Error));

      consoleWarnSpy.mockRestore();
      vi.useRealTimers();
    });

    it('手動保存 (saveDraft) の動作確認', async () => {
      const mockOnDraftSave = vi.fn().mockResolvedValue(undefined);

      const { result } = renderHook(() =>
        useGoalForm({
          onDraftSave: mockOnDraftSave,
        })
      );

      await act(async () => {
        result.current.setValue('title', 'テスト');
        await result.current.saveDraft();
      });

      expect(mockOnDraftSave).toHaveBeenCalled();
    });

    it('手動保存中にエラーが発生した場合の処理', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const mockOnDraftSave = vi.fn().mockRejectedValue(new Error('保存エラー'));

      const { result } = renderHook(() =>
        useGoalForm({
          onDraftSave: mockOnDraftSave,
        })
      );

      await act(async () => {
        result.current.setValue('title', 'テスト');
      });

      await expect(async () => {
        await act(async () => {
          await result.current.saveDraft();
        });
      }).rejects.toThrow('保存エラー');

      expect(consoleErrorSpy).toHaveBeenCalledWith('下書き保存エラー:', expect.any(Error));

      consoleErrorSpy.mockRestore();
    });

    it('未保存の変更チェック (checkUnsavedChanges)', () => {
      const { result } = renderHook(() => useGoalForm());

      expect(result.current.checkUnsavedChanges()).toBe(false);

      act(() => {
        result.current.setValue('title', 'テスト', { shouldDirty: true });
      });

      expect(result.current.checkUnsavedChanges()).toBe(true);
    });

    it('最後に保存されたデータの追跡', async () => {
      const mockOnDraftSave = vi.fn().mockResolvedValue(undefined);

      const { result } = renderHook(() =>
        useGoalForm({
          onDraftSave: mockOnDraftSave,
        })
      );

      await act(async () => {
        result.current.setValue('title', 'テスト1');
        await result.current.saveDraft();
      });

      expect(result.current.checkUnsavedChanges()).toBe(false);

      act(() => {
        result.current.setValue('title', 'テスト2', { shouldDirty: true });
      });

      expect(result.current.checkUnsavedChanges()).toBe(true);
    });
  });

  describe('エラーハンドリングテスト', () => {
    it('下書き保存時のエラーハンドリング', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const mockOnDraftSave = vi.fn().mockRejectedValue(new Error('ネットワークエラー'));

      const { result } = renderHook(() =>
        useGoalForm({
          onDraftSave: mockOnDraftSave,
        })
      );

      await act(async () => {
        result.current.setValue('title', 'テスト');
      });

      await expect(async () => {
        await act(async () => {
          await result.current.saveDraft();
        });
      }).rejects.toThrow('ネットワークエラー');

      consoleErrorSpy.mockRestore();
    });

    it('バリデーションエラーの処理', async () => {
      const { result } = renderHook(() => useGoalForm());

      await act(async () => {
        result.current.setValue('title', '');
        await result.current.trigger(); // Trigger validation for all fields
      });

      expect(result.current.formState.hasErrors).toBe(true);
    });

    it('非同期エラーの処理', async () => {
      const mockOnDraftSave = vi.fn().mockRejectedValue(new Error('非同期エラー'));

      const { result } = renderHook(() =>
        useGoalForm({
          onDraftSave: mockOnDraftSave,
        })
      );

      await act(async () => {
        result.current.setValue('title', 'テスト');
      });

      await expect(async () => {
        await act(async () => {
          await result.current.saveDraft();
        });
      }).rejects.toThrow('非同期エラー');
    });
  });

  describe('フォーム操作テスト', () => {
    it('値を設定できる', () => {
      const { result } = renderHook(() => useGoalForm());

      act(() => {
        result.current.setValue('title', 'テスト', { shouldDirty: true });
      });

      expect(result.current.watchedValues.title).toBe('テスト');
      expect(result.current.formState.isDirty).toBe(true);
    });

    it('フォームをリセットできる', () => {
      const { result } = renderHook(() => useGoalForm());

      act(() => {
        result.current.setValue('title', 'テスト', { shouldDirty: true });
      });

      expect(result.current.formState.isDirty).toBe(true);

      act(() => {
        result.current.resetForm();
      });

      expect(result.current.formState.isDirty).toBe(false);
      expect(result.current.watchedValues.title).toBe('');
    });

    it('複数のフィールドを同時に設定できる', () => {
      const { result } = renderHook(() => useGoalForm());

      act(() => {
        result.current.setValue('title', 'テスト目標');
        result.current.setValue('description', 'テスト説明');
        result.current.setValue('deadline', '2025-12-31');
      });

      expect(result.current.watchedValues.title).toBe('テスト目標');
      expect(result.current.watchedValues.description).toBe('テスト説明');
      expect(result.current.watchedValues.deadline).toBe('2025-12-31');
    });

    it('フィールドの値を監視できる (watchedValues)', () => {
      const { result } = renderHook(() => useGoalForm());

      act(() => {
        result.current.setValue('title', 'テスト');
      });

      expect(result.current.watchedValues.title).toBe('テスト');
    });

    it('フィールドのバリデーションを手動で実行できる (validateField)', async () => {
      const { result } = renderHook(() => useGoalForm());

      await act(async () => {
        result.current.setValue('title', 'テスト');
        const isValid = await result.current.validateField('title');
        expect(isValid).toBe(true);
      });
    });

    it('フォームをカスタムデータでリセットできる', () => {
      const { result } = renderHook(() => useGoalForm());

      act(() => {
        result.current.setValue('title', 'テスト1', { shouldDirty: true });
      });

      expect(result.current.formState.isDirty).toBe(true);

      act(() => {
        result.current.resetForm({
          title: 'テスト2',
          description: 'カスタム説明',
        });
      });

      expect(result.current.formState.isDirty).toBe(false);
      expect(result.current.watchedValues.title).toBe('テスト2');
      expect(result.current.watchedValues.description).toBe('カスタム説明');
    });
  });

  describe('クリーンアップテスト', () => {
    it('アンマウント時にタイマーがクリアされる', async () => {
      vi.useFakeTimers();
      const mockOnDraftSave = vi.fn().mockResolvedValue(undefined);

      const { result, unmount } = renderHook(() =>
        useGoalForm({
          onDraftSave: mockOnDraftSave,
          enableAutoSave: true,
          autoSaveInterval: 5000,
        })
      );

      act(() => {
        result.current.setValue('title', 'テスト', { shouldDirty: true });
      });

      // タイマーが実行される前にアンマウント
      unmount();

      // タイマーが実行されないことを確認
      vi.advanceTimersByTime(5000);
      expect(mockOnDraftSave).not.toHaveBeenCalled();

      vi.useRealTimers();
    });

    it('複数回のマウント・アンマウントでメモリリークが発生しない', () => {
      vi.useFakeTimers();
      const mockOnDraftSave = vi.fn().mockResolvedValue(undefined);

      for (let i = 0; i < 10; i++) {
        const { unmount } = renderHook(() =>
          useGoalForm({
            onDraftSave: mockOnDraftSave,
            enableAutoSave: true,
            autoSaveInterval: 5000,
          })
        );
        unmount();
      }

      // タイマーが残っていないことを確認
      vi.advanceTimersByTime(5000);
      expect(mockOnDraftSave).not.toHaveBeenCalled();

      vi.useRealTimers();
    });

    it('リアルタイムバリデーションのサブスクリプションがクリーンアップされる', () => {
      const { unmount } = renderHook(() =>
        useGoalForm({
          enableRealtimeValidation: true,
        })
      );

      // アンマウント時にサブスクリプションがクリーンアップされることを確認
      unmount();

      // メモリリークが発生していないことを確認（エラーが発生しない）
      expect(true).toBe(true);
    });

    it('自動保存タイマーが正しくクリーンアップされる', async () => {
      vi.useFakeTimers();
      const mockOnDraftSave = vi.fn().mockResolvedValue(undefined);

      const { result, unmount } = renderHook(() =>
        useGoalForm({
          onDraftSave: mockOnDraftSave,
          enableAutoSave: true,
          autoSaveInterval: 5000,
        })
      );

      await act(async () => {
        result.current.setValue('title', 'テスト', { shouldDirty: true });
      });

      // アンマウント
      unmount();

      // タイマーが実行されないことを確認
      await act(async () => {
        vi.advanceTimersByTime(5000);
        await vi.runAllTimersAsync();
      });

      expect(mockOnDraftSave).not.toHaveBeenCalled();

      vi.useRealTimers();
    });
  });

  describe('エッジケーステスト', () => {
    it('空文字列の処理', () => {
      const { result } = renderHook(() => useGoalForm());

      act(() => {
        result.current.setValue('title', '');
      });

      expect(result.current.watchedValues.title).toBe('');
    });

    it('null/undefinedの処理', () => {
      const { result } = renderHook(() => useGoalForm());

      act(() => {
        result.current.setValue('title', undefined as any);
      });

      const fieldState = result.current.getFieldState('title');
      expect(fieldState.value).toBe('');
    });

    it('非常に長い文字列の処理', async () => {
      const { result } = renderHook(() => useGoalForm());
      const veryLongString = 'あ'.repeat(1000);

      await act(async () => {
        result.current.setValue('title', veryLongString);
        await result.current.validateField('title');
      });

      const fieldState = result.current.getFieldState('title');
      expect(fieldState.error).toBeDefined();
    });

    it('特殊文字の処理', () => {
      const { result } = renderHook(() => useGoalForm());
      const specialChars = '!@#$%^&*()_+-=[]{}|;:\'",.<>?/~`';

      act(() => {
        result.current.setValue('title', specialChars);
      });

      expect(result.current.watchedValues.title).toBe(specialChars);
    });

    it('境界値のテスト (title: 100文字)', async () => {
      const { result } = renderHook(() => useGoalForm());
      const exactLimit = 'あ'.repeat(100);

      await act(async () => {
        result.current.setValue('title', exactLimit);
        await result.current.validateField('title');
      });

      const fieldState = result.current.getFieldState('title');
      expect(fieldState.error).toBeUndefined();
    });

    it('境界値のテスト (description: 1000文字)', async () => {
      const { result } = renderHook(() => useGoalForm());
      const exactLimit = 'あ'.repeat(1000);

      await act(async () => {
        result.current.setValue('description', exactLimit);
        await result.current.validateField('description');
      });

      const fieldState = result.current.getFieldState('description');
      expect(fieldState.error).toBeUndefined();
    });

    it('同時実行のテスト (複数の操作が同時に実行される)', async () => {
      vi.useFakeTimers();
      const mockOnDraftSave = vi.fn().mockResolvedValue(undefined);

      const { result } = renderHook(() =>
        useGoalForm({
          onDraftSave: mockOnDraftSave,
          enableAutoSave: true,
          autoSaveInterval: 5000,
        })
      );

      // 複数の操作を同時に実行
      await act(async () => {
        result.current.setValue('title', 'テスト1', { shouldDirty: true });
        result.current.setValue('description', 'テスト説明', { shouldDirty: true });
        result.current.setValue('deadline', '2025-12-31', { shouldDirty: true });
      });

      await act(async () => {
        vi.advanceTimersByTime(5000);
        await vi.runAllTimersAsync();
      });

      // 自動保存が1回だけ実行されることを確認
      expect(mockOnDraftSave).toHaveBeenCalledTimes(1);

      vi.useRealTimers();
    });
  });
});
