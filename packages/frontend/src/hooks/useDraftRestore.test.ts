import { renderHook, act } from '@testing-library/react';
import { useDraftRestore, useDraftRestoreStatus } from './useDraftRestore';
import { DraftService, DraftData } from '../services/draftService';
import { PartialGoalFormData } from '../schemas/goal-form';

// DraftServiceのモック
jest.mock('../services/draftService');
const mockDraftService = DraftService as jest.Mocked<typeof DraftService>;

describe('useDraftRestore', () => {
  const mockFormData: PartialGoalFormData = {
    title: 'テスト目標',
    description: 'テスト説明',
    deadline: '2024-12-31',
    background: 'テスト背景',
    constraints: 'テスト制約',
  };

  const mockDraftData: DraftData = {
    formData: mockFormData,
    savedAt: new Date().toISOString(),
    version: 1,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('基本機能', () => {
    it('初期状態が正しく設定される', () => {
      const { result } = renderHook(() => useDraftRestore());

      expect(result.current.state.isLoading).toBe(false);
      expect(result.current.state.draftData).toBeNull();
      expect(result.current.state.error).toBeNull();
      expect(result.current.state.isRestored).toBe(false);
      expect(result.current.state.isRejected).toBe(false);
    });

    it('下書きデータを正常に読み込める', async () => {
      mockDraftService.loadDraft.mockResolvedValue(mockDraftData);

      const onDraftFound = jest.fn();
      const { result } = renderHook(() => useDraftRestore({ onDraftFound }));

      let loadedData: DraftData | null;
      await act(async () => {
        loadedData = await result.current.loadDraft();
      });

      expect(loadedData!).toEqual(mockDraftData);
      expect(result.current.state.draftData).toEqual(mockDraftData);
      expect(result.current.state.isLoading).toBe(false);
      expect(onDraftFound).toHaveBeenCalledWith(mockDraftData);
    });

    it('下書きが存在しない場合はnullを返す', async () => {
      mockDraftService.loadDraft.mockResolvedValue(null);

      const { result } = renderHook(() => useDraftRestore());

      let loadedData: DraftData | null;
      await act(async () => {
        loadedData = await result.current.loadDraft();
      });

      expect(loadedData).toBeNull();
      expect(result.current.state.draftData).toBeNull();
    });
  });

  describe('自動復元', () => {
    it('自動復元が有効な場合、初期化時に下書きを復元する', async () => {
      mockDraftService.loadDraft.mockResolvedValue(mockDraftData);

      const onRestoreSuccess = jest.fn();

      await act(async () => {
        renderHook(() =>
          useDraftRestore({
            autoRestore: true,
            onRestoreSuccess,
          })
        );
      });

      expect(onRestoreSuccess).toHaveBeenCalledWith(mockFormData, mockDraftData);
    });

    it('自動復元が無効な場合、初期化時に復元しない', async () => {
      mockDraftService.loadDraft.mockResolvedValue(mockDraftData);

      const onRestoreSuccess = jest.fn();

      await act(async () => {
        renderHook(() =>
          useDraftRestore({
            autoRestore: false,
            onRestoreSuccess,
          })
        );
      });

      expect(onRestoreSuccess).not.toHaveBeenCalled();
    });
  });

  describe('手動復元', () => {
    it('下書きを手動で復元できる', async () => {
      const onRestoreSuccess = jest.fn();
      const { result } = renderHook(() => useDraftRestore({ onRestoreSuccess }));

      // 下書きデータを設定
      act(() => {
        result.current.state.draftData = mockDraftData;
      });

      let restoredData: PartialGoalFormData | null;
      await act(async () => {
        restoredData = await result.current.restoreDraft();
      });

      expect(restoredData!).toEqual(mockFormData);
      expect(result.current.state.isRestored).toBe(true);
      expect(onRestoreSuccess).toHaveBeenCalledWith(mockFormData, mockDraftData);
    });

    it('下書きデータがない場合はエラーになる', async () => {
      const onRestoreError = jest.fn();
      const { result } = renderHook(() => useDraftRestore({ onRestoreError }));

      let restoredData: PartialGoalFormData | null;
      await act(async () => {
        restoredData = await result.current.restoreDraft();
      });

      expect(restoredData).toBeNull();
      expect(result.current.state.error).not.toBeNull();
      expect(onRestoreError).toHaveBeenCalled();
    });

    it('引数で指定した下書きデータを復元できる', async () => {
      const onRestoreSuccess = jest.fn();
      const { result } = renderHook(() => useDraftRestore({ onRestoreSuccess }));

      let restoredData: PartialGoalFormData | null;
      await act(async () => {
        restoredData = await result.current.restoreDraft(mockDraftData);
      });

      expect(restoredData!).toEqual(mockFormData);
      expect(onRestoreSuccess).toHaveBeenCalledWith(mockFormData, mockDraftData);
    });
  });

  describe('復元拒否', () => {
    it('復元を拒否できる', () => {
      const onRestoreRejected = jest.fn();
      const { result } = renderHook(() => useDraftRestore({ onRestoreRejected }));

      act(() => {
        result.current.rejectRestore();
      });

      expect(result.current.state.isRejected).toBe(true);
      expect(onRestoreRejected).toHaveBeenCalled();
    });
  });

  describe('下書き削除', () => {
    it('下書きを削除できる', async () => {
      mockDraftService.clearDraft.mockResolvedValue();

      const { result } = renderHook(() => useDraftRestore());

      // 下書きデータを設定
      act(() => {
        result.current.state.draftData = mockDraftData;
      });

      await act(async () => {
        await result.current.clearDraft();
      });

      expect(mockDraftService.clearDraft).toHaveBeenCalled();
      expect(result.current.state.draftData).toBeNull();
      expect(result.current.state.isRestored).toBe(false);
      expect(result.current.state.isRejected).toBe(false);
    });

    it('削除エラー時に適切に処理される', async () => {
      const clearError = new Error('削除エラー');
      mockDraftService.clearDraft.mockRejectedValue(clearError);

      const onRestoreError = jest.fn();
      const { result } = renderHook(() => useDraftRestore({ onRestoreError }));

      await act(async () => {
        await result.current.clearDraft();
      });

      expect(result.current.state.error).toBe(clearError);
      expect(onRestoreError).toHaveBeenCalledWith(clearError);
    });
  });

  describe('状態チェック', () => {
    it('下書きが存在するかを正しく判定する', async () => {
      const { result } = renderHook(() => useDraftRestore());

      // 初期状態では下書きなし
      expect(result.current.hasDraft()).toBe(false);

      // 下書きデータを設定
      act(() => {
        result.current.state.draftData = mockDraftData;
      });

      expect(result.current.hasDraft()).toBe(true);
    });

    it('復元可能かを正しく判定する', () => {
      const { result } = renderHook(() => useDraftRestore());

      // 初期状態では復元不可
      expect(result.current.canRestore()).toBe(false);

      // 下書きデータを設定
      act(() => {
        result.current.state.draftData = mockDraftData;
      });

      expect(result.current.canRestore()).toBe(true);

      // 復元済みの場合は復元不可
      act(() => {
        result.current.state.isRestored = true;
      });

      expect(result.current.canRestore()).toBe(false);

      // 拒否済みの場合は復元不可
      act(() => {
        result.current.state.isRestored = false;
        result.current.state.isRejected = true;
      });

      expect(result.current.canRestore()).toBe(false);
    });
  });

  describe('状態リセット', () => {
    it('状態を正しくリセットできる', async () => {
      const { result } = renderHook(() => useDraftRestore());

      // 状態を変更
      act(() => {
        result.current.state.draftData = mockDraftData;
        result.current.state.isRestored = true;
        result.current.state.isRejected = true;
        result.current.state.error = new Error('テストエラー');
      });

      // リセット
      act(() => {
        result.current.reset();
      });

      expect(result.current.state.isLoading).toBe(false);
      expect(result.current.state.draftData).toBeNull();
      expect(result.current.state.error).toBeNull();
      expect(result.current.state.isRestored).toBe(false);
      expect(result.current.state.isRejected).toBe(false);
    });
  });

  describe('エラーハンドリング', () => {
    it('読み込みエラー時に適切に処理される', async () => {
      const loadError = new Error('読み込みエラー');
      mockDraftService.loadDraft.mockRejectedValue(loadError);

      const onRestoreError = jest.fn();
      const { result } = renderHook(() => useDraftRestore({ onRestoreError }));

      let loadedData: DraftData | null;
      await act(async () => {
        loadedData = await result.current.loadDraft();
      });

      expect(loadedData).toBeNull();
      expect(result.current.state.error).toBe(loadError);
      expect(result.current.state.isLoading).toBe(false);
      expect(onRestoreError).toHaveBeenCalledWith(loadError);
    });
  });
});

describe('useDraftRestoreStatus', () => {
  it('下書き復元の状態を正しく返す', async () => {
    const mockDraftData: DraftData = {
      formData: { title: 'テスト目標' },
      savedAt: new Date().toISOString(),
      version: 1,
    };

    const { result } = renderHook(() => {
      const draftRestore = useDraftRestore();
      const status = useDraftRestoreStatus(draftRestore);

      return { draftRestore, status };
    });

    // 初期状態
    expect(result.current.status.isLoading).toBe(false);
    expect(result.current.status.hasDraft).toBe(false);
    expect(result.current.status.isRestored).toBe(false);
    expect(result.current.status.isRejected).toBe(false);
    expect(result.current.status.hasError).toBe(false);
    expect(result.current.status.canRestore).toBe(false);

    // 下書きデータを設定
    act(() => {
      result.current.draftRestore.state.draftData = mockDraftData;
    });

    expect(result.current.status.hasDraft).toBe(true);
    expect(result.current.status.canRestore).toBe(true);
    expect(result.current.status.draftSummary).toBe('テスト目標');
    expect(result.current.status.draftSavedAt).toBeInstanceOf(Date);
    expect(result.current.status.timeSinceSave).toBe('たった今');
  });
});
