import { renderHook } from '@testing-library/react';
import { act } from '@testing-library/react';
import { vi, beforeEach } from 'vitest';
import { useDraftAutoSave } from './useDraftAutoSave';
import { DraftService } from '../services/draftService';
import { PartialGoalFormData } from '../schemas/goal-form';

// DraftServiceのモック
vi.mock('../services/draftService');
const mockDraftService = DraftService as unknown as any;

describe('useDraftAutoSave', () => {
  const mockFormData: PartialGoalFormData = {
    title: 'テスト目標',
    description: 'テスト説明',
    deadline: '2024-12-31',
    background: 'テスト背景',
    constraints: 'テスト制約',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockDraftService.saveDraft.mockResolvedValue();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  describe('基本機能', () => {
    it('自動保存が有効な場合、指定間隔で保存が実行される', async () => {
      const onSaveSuccess = vi.fn();

      renderHook(() =>
        useDraftAutoSave({
          formData: mockFormData,
          enabled: true,
          intervalSeconds: 30,
          onSaveSuccess,
        })
      );

      // 30秒経過
      act(() => {
        vi.advanceTimersByTime(30000);
      });

      await act(async () => {
        await Promise.resolve();
      });

      expect(mockDraftService.saveDraft).toHaveBeenCalledWith(mockFormData);
      expect(onSaveSuccess).toHaveBeenCalledWith(mockFormData);
    });

    it('自動保存が無効な場合、保存が実行されない', async () => {
      renderHook(() =>
        useDraftAutoSave({
          formData: mockFormData,
          enabled: false,
          intervalSeconds: 30,
        })
      );

      // 30秒経過
      act(() => {
        vi.advanceTimersByTime(30000);
      });

      await act(async () => {
        await Promise.resolve();
      });

      expect(mockDraftService.saveDraft).not.toHaveBeenCalled();
    });

    it('空のフォームデータの場合、保存が実行されない', async () => {
      const emptyFormData: PartialGoalFormData = {
        title: '',
        description: '',
        deadline: '',
        background: '',
        constraints: '',
      };

      renderHook(() =>
        useDraftAutoSave({
          formData: emptyFormData,
          enabled: true,
          intervalSeconds: 30,
        })
      );

      // 30秒経過
      act(() => {
        vi.advanceTimersByTime(30000);
      });

      await act(async () => {
        await Promise.resolve();
      });

      expect(mockDraftService.saveDraft).not.toHaveBeenCalled();
    });
  });

  describe('手動保存', () => {
    it('saveNowで手動保存が実行される', async () => {
      const onSaveSuccess = vi.fn();

      const { result } = renderHook(() =>
        useDraftAutoSave({
          formData: mockFormData,
          enabled: true,
          intervalSeconds: 30,
          onSaveSuccess,
        })
      );

      await act(async () => {
        await result.current.saveNow();
      });

      expect(mockDraftService.saveDraft).toHaveBeenCalledWith(mockFormData);
      expect(onSaveSuccess).toHaveBeenCalledWith(mockFormData);
    });
  });

  describe('エラーハンドリング', () => {
    it('保存エラー時にonSaveErrorが呼ばれる', async () => {
      const saveError = new Error('保存エラー');
      mockDraftService.saveDraft.mockRejectedValue(saveError);

      const onSaveError = vi.fn();

      const { result } = renderHook(() =>
        useDraftAutoSave({
          formData: mockFormData,
          enabled: true,
          intervalSeconds: 30,
          onSaveError,
        })
      );

      await act(async () => {
        await result.current.saveNow();
      });

      expect(onSaveError).toHaveBeenCalledWith(saveError);
      expect(result.current.state.lastError).toBe(saveError);
    });
  });

  describe('重複保存の防止', () => {
    it('保存中は新しい保存をスキップする', async () => {
      let resolvePromise: () => void;
      const savePromise = new Promise<void>(resolve => {
        resolvePromise = resolve;
      });

      mockDraftService.saveDraft.mockReturnValue(savePromise);

      const { result } = renderHook(() =>
        useDraftAutoSave({
          formData: mockFormData,
          enabled: true,
          intervalSeconds: 30,
        })
      );

      // 最初の保存を開始
      act(() => {
        result.current.saveNow();
      });

      expect(result.current.state.isSaving).toBe(true);

      // 2回目の保存を試行（スキップされるはず）
      act(() => {
        result.current.saveNow();
      });

      // 最初の保存のみが呼ばれる
      expect(mockDraftService.saveDraft).toHaveBeenCalledTimes(1);

      // 最初の保存を完了
      act(() => {
        resolvePromise!();
      });

      await act(async () => {
        await Promise.resolve();
      });

      expect(result.current.state.isSaving).toBe(false);
    });

    it('同じデータの場合は保存をスキップする', async () => {
      const { result, rerender } = renderHook(
        ({ formData }) =>
          useDraftAutoSave({
            formData,
            enabled: true,
            intervalSeconds: 30,
          }),
        { initialProps: { formData: mockFormData } }
      );

      // 最初の保存
      await act(async () => {
        await result.current.saveNow();
      });

      expect(mockDraftService.saveDraft).toHaveBeenCalledTimes(1);

      // 同じデータで再度保存を試行
      rerender({ formData: mockFormData });

      await act(async () => {
        await result.current.saveNow();
      });

      // 2回目は呼ばれない
      expect(mockDraftService.saveDraft).toHaveBeenCalledTimes(1);
    });

    it('最小間隔内の保存はスキップされる', async () => {
      const { result } = renderHook(() =>
        useDraftAutoSave({
          formData: mockFormData,
          enabled: true,
          intervalSeconds: 30,
        })
      );

      // 最初の保存
      await act(async () => {
        await result.current.saveNow();
      });

      expect(mockDraftService.saveDraft).toHaveBeenCalledTimes(1);

      // 3秒後に保存を試行（最小間隔5秒未満なのでスキップ）
      act(() => {
        vi.advanceTimersByTime(3000);
      });

      await act(async () => {
        await result.current.saveNow();
      });

      expect(mockDraftService.saveDraft).toHaveBeenCalledTimes(1);

      // 6秒後に保存を試行（最小間隔を超えているので実行）
      act(() => {
        vi.advanceTimersByTime(3000);
      });

      await act(async () => {
        await result.current.saveNow();
      });

      expect(mockDraftService.saveDraft).toHaveBeenCalledTimes(2);
    });
  });

  describe('有効/無効の切り替え', () => {
    it('setEnabledで自動保存の有効/無効を切り替えられる', async () => {
      const { result } = renderHook(() =>
        useDraftAutoSave({
          formData: mockFormData,
          enabled: true,
          intervalSeconds: 30,
        })
      );

      // 無効にする
      act(() => {
        result.current.setEnabled(false);
      });

      // 30秒経過しても保存されない
      act(() => {
        vi.advanceTimersByTime(30000);
      });

      await act(async () => {
        await Promise.resolve();
      });

      expect(mockDraftService.saveDraft).not.toHaveBeenCalled();

      // 有効にする
      act(() => {
        result.current.setEnabled(true);
      });

      // 30秒経過すると保存される
      act(() => {
        vi.advanceTimersByTime(30000);
      });

      await act(async () => {
        await Promise.resolve();
      });

      expect(mockDraftService.saveDraft).toHaveBeenCalledTimes(1);
    });
  });

  describe('コールバック', () => {
    it('保存の各段階でコールバックが呼ばれる', async () => {
      const onSaveStart = vi.fn();
      const onSaveSuccess = vi.fn();
      const onSaveComplete = vi.fn();

      const { result } = renderHook(() =>
        useDraftAutoSave({
          formData: mockFormData,
          enabled: true,
          intervalSeconds: 30,
          onSaveStart,
          onSaveSuccess,
          onSaveComplete,
        })
      );

      await act(async () => {
        await result.current.saveNow();
      });

      expect(onSaveStart).toHaveBeenCalled();
      expect(onSaveSuccess).toHaveBeenCalledWith(mockFormData);
      expect(onSaveComplete).toHaveBeenCalled();
    });
  });
});

describe('useAutoSaveStatus', () => {
  it('自動保存の状態を正しく返す', async () => {
    const { result } = renderHook(() => {
      const autoSave = useDraftAutoSave({
        formData: {
          title: 'テスト目標',
          description: 'テスト説明',
        },
        enabled: true,
        intervalSeconds: 30,
      });

      const status = useAutoSaveStatus(autoSave);

      return { autoSave, status };
    });

    // 初期状態
    expect(result.current.status.isSaving).toBe(false);
    expect(result.current.status.lastSaveTime).toBeNull();
    expect(result.current.status.saveCount).toBe(0);
    expect(result.current.status.timeSinceLastSave).toBeNull();

    // 保存実行
    await act(async () => {
      await result.current.autoSave.saveNow();
    });

    expect(result.current.status.isSaving).toBe(false);
    expect(result.current.status.lastSaveTime).not.toBeNull();
    expect(result.current.status.saveCount).toBe(1);
    expect(result.current.status.timeSinceLastSave).toBe(0);
  });
});
