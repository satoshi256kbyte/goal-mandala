import { renderHook } from '@testing-library/react';
import { act } from '@testing-library/react';
import { vi } from 'vitest';
import { useDraftManualSave } from './useDraftManualSave';
import { DraftService } from '../services/draftService';
import { PartialGoalFormData } from '../schemas/goal-form';

// DraftServiceのモック
vi.mock('../services/draftService');
const mockDraftService = DraftService as unknown as any;

describe('useDraftManualSave', () => {
  const mockFormData: PartialGoalFormData = {
    title: 'テスト目標',
    description: 'テスト説明',
    deadline: '2024-12-31',
    background: 'テスト背景',
    constraints: 'テスト制約',
  };

  const emptyFormData: PartialGoalFormData = {
    title: '',
    description: '',
    deadline: '',
    background: '',
    constraints: '',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockDraftService.saveDraft.mockResolvedValue();
  });

  describe('基本機能', () => {
    it('初期状態が正しく設定される', () => {
      const { result } = renderHook(() => useDraftManualSave());

      expect(result.current.state.isSaving).toBe(false);
      expect(result.current.state.lastSaveTime).toBeNull();
      expect(result.current.state.lastError).toBeNull();
      expect(result.current.state.saveCount).toBe(0);
      expect(result.current.state.lastSavedData).toBeNull();
    });

    it('手動保存が正常に実行される', async () => {
      const onSaveSuccess = vi.fn();
      const { result } = renderHook(() => useDraftManualSave({ onSaveSuccess }));

      let saveResult: boolean;
      await act(async () => {
        saveResult = await result.current.saveDraft(mockFormData);
      });

      expect(saveResult!).toBe(true);
      expect(mockDraftService.saveDraft).toHaveBeenCalledWith(mockFormData);
      expect(onSaveSuccess).toHaveBeenCalledWith(mockFormData);
      expect(result.current.state.saveCount).toBe(1);
      expect(result.current.state.lastSaveTime).not.toBeNull();
      expect(result.current.state.lastSavedData).toEqual(mockFormData);
    });

    it('空のデータの場合は保存されない', async () => {
      const onSaveError = vi.fn();
      const { result } = renderHook(() => useDraftManualSave({ onSaveError }));

      let saveResult: boolean;
      await act(async () => {
        saveResult = await result.current.saveDraft(emptyFormData);
      });

      expect(saveResult!).toBe(false);
      expect(mockDraftService.saveDraft).not.toHaveBeenCalled();
      expect(onSaveError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: '保存するデータがありません',
        })
      );
      expect(result.current.state.lastError).not.toBeNull();
    });
  });

  describe('エラーハンドリング', () => {
    it('保存エラー時に適切に処理される', async () => {
      const saveError = new Error('保存エラー');
      mockDraftService.saveDraft.mockRejectedValue(saveError);

      const onSaveError = vi.fn();
      const { result } = renderHook(() => useDraftManualSave({ onSaveError }));

      let saveResult: boolean;
      await act(async () => {
        saveResult = await result.current.saveDraft(mockFormData);
      });

      expect(saveResult!).toBe(false);
      expect(onSaveError).toHaveBeenCalledWith(saveError);
      expect(result.current.state.lastError).toBe(saveError);
      expect(result.current.state.isSaving).toBe(false);
    });

    it('エラーをクリアできる', async () => {
      const saveError = new Error('保存エラー');
      mockDraftService.saveDraft.mockRejectedValue(saveError);

      const { result } = renderHook(() => useDraftManualSave());

      // エラーを発生させる
      await act(async () => {
        await result.current.saveDraft(mockFormData);
      });

      expect(result.current.state.lastError).not.toBeNull();

      // エラーをクリア
      act(() => {
        result.current.clearError();
      });

      expect(result.current.state.lastError).toBeNull();
    });
  });

  describe('重複保存の防止', () => {
    it('保存中は新しい保存をスキップする', async () => {
      let resolvePromise: () => void;
      const savePromise = new Promise<void>(resolve => {
        resolvePromise = resolve;
      });

      mockDraftService.saveDraft.mockReturnValue(savePromise);

      const { result } = renderHook(() => useDraftManualSave());

      // 最初の保存を開始
      let firstSavePromise: Promise<boolean>;
      act(() => {
        firstSavePromise = result.current.saveDraft(mockFormData);
      });

      expect(result.current.state.isSaving).toBe(true);

      // 2回目の保存を試行（スキップされるはず）
      let secondSaveResult: boolean;
      await act(async () => {
        secondSaveResult = await result.current.saveDraft(mockFormData);
      });

      expect(secondSaveResult!).toBe(false);
      expect(mockDraftService.saveDraft).toHaveBeenCalledTimes(1);

      // 最初の保存を完了
      act(() => {
        resolvePromise!();
      });

      await act(async () => {
        await firstSavePromise!;
      });

      expect(result.current.state.isSaving).toBe(false);
    });
  });

  describe('変更検知', () => {
    it('データが変更されているかを正しく判定する', async () => {
      const { result } = renderHook(() => useDraftManualSave());

      // 初期状態では変更あり
      expect(result.current.hasChanges(mockFormData)).toBe(true);

      // 保存後は変更なし
      await act(async () => {
        await result.current.saveDraft(mockFormData);
      });

      expect(result.current.hasChanges(mockFormData)).toBe(false);

      // データを変更すると変更あり
      const modifiedData = { ...mockFormData, title: '変更されたタイトル' };
      expect(result.current.hasChanges(modifiedData)).toBe(true);
    });

    it('保存が必要かを正しく判定する', async () => {
      const { result } = renderHook(() => useDraftManualSave());

      // 初期状態では保存が必要
      expect(result.current.needsSave(mockFormData)).toBe(true);

      // 保存後は保存不要
      await act(async () => {
        await result.current.saveDraft(mockFormData);
      });

      expect(result.current.needsSave(mockFormData)).toBe(false);

      // 空のデータは保存不要
      expect(result.current.needsSave(emptyFormData)).toBe(false);
    });
  });

  describe('状態のリセット', () => {
    it('状態を正しくリセットできる', async () => {
      const { result } = renderHook(() => useDraftManualSave());

      // 保存を実行
      await act(async () => {
        await result.current.saveDraft(mockFormData);
      });

      expect(result.current.state.saveCount).toBe(1);
      expect(result.current.state.lastSaveTime).not.toBeNull();

      // リセット
      act(() => {
        result.current.reset();
      });

      expect(result.current.state.isSaving).toBe(false);
      expect(result.current.state.lastSaveTime).toBeNull();
      expect(result.current.state.lastError).toBeNull();
      expect(result.current.state.saveCount).toBe(0);
      expect(result.current.state.lastSavedData).toBeNull();
    });
  });

  describe('コールバック', () => {
    it('保存の各段階でコールバックが呼ばれる', async () => {
      const onSaveStart = vi.fn();
      const onSaveSuccess = vi.fn();
      const onSaveComplete = vi.fn();

      const { result } = renderHook(() =>
        useDraftManualSave({
          onSaveStart,
          onSaveSuccess,
          onSaveComplete,
        })
      );

      await act(async () => {
        await result.current.saveDraft(mockFormData);
      });

      expect(onSaveStart).toHaveBeenCalled();
      expect(onSaveSuccess).toHaveBeenCalledWith(mockFormData);
      expect(onSaveComplete).toHaveBeenCalled();
    });
  });
});

describe('useManualSaveStatus', () => {
  it('手動保存の状態を正しく返す', async () => {
    const { result } = renderHook(() => {
      const manualSave = useDraftManualSave();
      const status = useManualSaveStatus(manualSave);

      return { manualSave, status };
    });

    // 初期状態
    expect(result.current.status.isSaving).toBe(false);
    expect(result.current.status.lastSaveTime).toBeNull();
    expect(result.current.status.saveCount).toBe(0);
    expect(result.current.status.timeSinceLastSave).toBeNull();
    expect(result.current.status.hasError).toBe(false);
    expect(result.current.status.hasSaved).toBe(false);

    // 保存実行
    await act(async () => {
      await result.current.manualSave.saveDraft({
        title: 'テスト目標',
        description: 'テスト説明',
      });
    });

    expect(result.current.status.isSaving).toBe(false);
    expect(result.current.status.lastSaveTime).not.toBeNull();
    expect(result.current.status.saveCount).toBe(1);
    expect(result.current.status.timeSinceLastSave).toBe(0);
    expect(result.current.status.hasError).toBe(false);
    expect(result.current.status.hasSaved).toBe(true);
  });
});
