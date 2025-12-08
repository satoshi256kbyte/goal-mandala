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

  describe('初期化', () => {
    it('デフォルト値で初期化される', () => {
      const { result } = renderHook(() => useGoalForm());

      expect(result.current.formState.isValid).toBe(false);
      expect(result.current.formState.isDirty).toBe(false);
      expect(result.current.formState.isSubmitting).toBe(false);
    });

    it('初期データが設定される', () => {
      const initialData: Partial<GoalFormData> = {
        title: 'テスト目標',
        description: 'テスト説明',
      };

      const { result } = renderHook(() => useGoalForm({ initialData }));

      expect(result.current.watchedValues.title).toBe('テスト目標');
      expect(result.current.watchedValues.description).toBe('テスト説明');
    });
  });

  describe('フォーム操作', () => {
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
    });
  });

  describe('バリデーション', () => {
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
        await result.current.validateField('title');
      });

      expect(result.current.formState.isValid).toBe(true);
    });
  });

  describe('自動保存', () => {
    it('自動保存が有効な場合、指定間隔で保存される', async () => {
      vi.useFakeTimers();
      const mockOnDraftSave = vi
        .fn<[data: Partial<GoalFormData>], Promise<void>>()
        .mockResolvedValue(undefined);

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
  });

  describe('クリーンアップ', () => {
    it('アンマウント時にタイマーがクリアされる', async () => {
      vi.useFakeTimers();
      const mockOnDraftSave = vi
        .fn<[data: Partial<GoalFormData>], Promise<void>>()
        .mockResolvedValue(undefined);

      const { result, unmount } = renderHook(() =>
        useGoalForm({
          onDraftSave: mockOnDraftSave,
          enableAutoSave: true,
          autoSaveInterval: 5000,
        })
      );

      act(() => {
        result.current.setValue('title', 'テスト');
      });

      // タイマーが実行される前にアンマウント
      unmount();

      // タイマーが実行されないことを確認
      vi.advanceTimersByTime(5000);
      expect(mockOnDraftSave).not.toHaveBeenCalled();

      vi.useRealTimers();
    });
  });
});
