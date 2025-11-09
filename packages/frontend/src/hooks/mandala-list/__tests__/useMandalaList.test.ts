/**
 * useMandalaList フックのユニットテスト
 */

import { renderHook, waitFor } from '@testing-library/react';
import { act } from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useMandalaList } from '../useMandalaList';
import { GoalsService, GoalsApiError } from '../../../services/mandala-list/goals-api';
import { GoalStatus } from '../../../types/mandala-list';
import type { GoalsListResponse } from '../../../types/mandala-list';

// GoalsServiceをモック
vi.mock('../../../services/mandala-list/goals-api');

describe('useMandalaList', () => {
  // テスト用のモックデータ
  const mockMandalas: GoalsListResponse = {
    success: true,
    data: [
      {
        id: '1',
        title: 'テスト目標1',
        description: 'テスト説明1',
        deadline: new Date('2024-12-31'),
        status: GoalStatus.ACTIVE,
        progress: 50,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-15'),
      },
      {
        id: '2',
        title: 'テスト目標2',
        description: 'テスト説明2',
        deadline: new Date('2024-11-30'),
        status: GoalStatus.DRAFT,
        progress: 0,
        createdAt: new Date('2024-01-02'),
        updatedAt: new Date('2024-01-16'),
      },
    ],
    total: 2,
    page: 1,
    limit: 20,
    totalPages: 1,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(GoalsService.getGoals).mockResolvedValue(mockMandalas);
  });

  describe('初期化', () => {
    it('初期状態が正しく設定される', () => {
      const { result } = renderHook(() => useMandalaList());

      expect(result.current.mandalas).toEqual([]);
      expect(result.current.totalItems).toBe(0);
      expect(result.current.totalPages).toBe(0);
      expect(result.current.isLoading).toBe(true);
      expect(result.current.isFetching).toBe(true);
      expect(result.current.error).toBeNull();
      expect(result.current.searchKeyword).toBe('');
      expect(result.current.statusFilter).toBe('all');
      expect(result.current.sortOption).toBe('created_at_desc');
      expect(result.current.currentPage).toBe(1);
    });

    it('カスタムオプションで初期化できる', () => {
      const { result } = renderHook(() =>
        useMandalaList({
          initialPage: 2,
          itemsPerPage: 10,
        })
      );

      expect(result.current.currentPage).toBe(2);
    });
  });

  describe('データ取得', () => {
    it('初回マウント時にデータを取得する', async () => {
      const { result } = renderHook(() => useMandalaList());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(vi.mocked(GoalsService.getGoals)).toHaveBeenCalledTimes(1);
      expect(vi.mocked(GoalsService.getGoals)).toHaveBeenCalledWith({
        search: undefined,
        status: undefined,
        sort: 'created_at_desc',
        page: 1,
        limit: 20,
      });
      expect(result.current.mandalas).toEqual(mockMandalas.data);
      expect(result.current.totalItems).toBe(2);
      expect(result.current.totalPages).toBe(1);
    });

    it('refetchでデータを再取得できる', async () => {
      const { result } = renderHook(() => useMandalaList());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(vi.mocked(GoalsService.getGoals)).toHaveBeenCalledTimes(1);

      await act(async () => {
        await result.current.refetch();
      });

      expect(vi.mocked(GoalsService.getGoals)).toHaveBeenCalledTimes(2);
    });
  });

  describe('検索機能', () => {
    it('検索キーワードを設定できる', async () => {
      const { result } = renderHook(() => useMandalaList());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.setSearchKeyword('プログラミング');
      });

      expect(result.current.searchKeyword).toBe('プログラミング');

      await waitFor(() => {
        expect(vi.mocked(GoalsService.getGoals)).toHaveBeenCalledWith(
          expect.objectContaining({
            search: 'プログラミング',
          })
        );
      });
    });

    it('検索キーワード変更時にページが1にリセットされる', async () => {
      const { result } = renderHook(() => useMandalaList());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.setCurrentPage(3);
      });

      expect(result.current.currentPage).toBe(3);

      act(() => {
        result.current.setSearchKeyword('テスト');
      });

      await waitFor(() => {
        expect(result.current.currentPage).toBe(1);
      });
    });
  });

  describe('フィルター機能', () => {
    it('状態フィルターを設定できる', async () => {
      const { result } = renderHook(() => useMandalaList());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.setStatusFilter(GoalStatus.ACTIVE);
      });

      expect(result.current.statusFilter).toBe(GoalStatus.ACTIVE);

      await waitFor(() => {
        expect(vi.mocked(GoalsService.getGoals)).toHaveBeenCalledWith(
          expect.objectContaining({
            status: GoalStatus.ACTIVE,
          })
        );
      });
    });

    it('フィルター変更時にページが1にリセットされる', async () => {
      const { result } = renderHook(() => useMandalaList());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.setCurrentPage(2);
      });

      expect(result.current.currentPage).toBe(2);

      act(() => {
        result.current.setStatusFilter(GoalStatus.COMPLETED);
      });

      await waitFor(() => {
        expect(result.current.currentPage).toBe(1);
      });
    });

    it('フィルタークリアで初期状態に戻る', async () => {
      const { result } = renderHook(() => useMandalaList());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // ページを先に設定してから、検索・フィルター・ソートを設定
      act(() => {
        result.current.setCurrentPage(3);
      });

      await waitFor(() => {
        expect(result.current.currentPage).toBe(3);
      });

      act(() => {
        result.current.setSearchKeyword('テスト');
      });

      // 検索キーワード変更でページが1にリセットされる
      await waitFor(() => {
        expect(result.current.currentPage).toBe(1);
      });

      expect(result.current.searchKeyword).toBe('テスト');

      act(() => {
        result.current.clearFilters();
      });

      expect(result.current.searchKeyword).toBe('');
      expect(result.current.statusFilter).toBe('all');
      expect(result.current.sortOption).toBe('created_at_desc');
      expect(result.current.currentPage).toBe(1);
    });
  });

  describe('ソート機能', () => {
    it('ソート条件を設定できる', async () => {
      const { result } = renderHook(() => useMandalaList());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.setSortOption('deadline_asc');
      });

      expect(result.current.sortOption).toBe('deadline_asc');

      await waitFor(() => {
        expect(vi.mocked(GoalsService.getGoals)).toHaveBeenCalledWith(
          expect.objectContaining({
            sort: 'deadline_asc',
          })
        );
      });
    });

    it('ソート変更時にページが1にリセットされる', async () => {
      const { result } = renderHook(() => useMandalaList());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.setCurrentPage(2);
      });

      expect(result.current.currentPage).toBe(2);

      act(() => {
        result.current.setSortOption('progress_desc');
      });

      await waitFor(() => {
        expect(result.current.currentPage).toBe(1);
      });
    });
  });

  describe('ページネーション機能', () => {
    it('ページ番号を設定できる', async () => {
      const { result } = renderHook(() => useMandalaList());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.setCurrentPage(2);
      });

      expect(result.current.currentPage).toBe(2);

      await waitFor(() => {
        expect(vi.mocked(GoalsService.getGoals)).toHaveBeenCalledWith(
          expect.objectContaining({
            page: 2,
          })
        );
      });
    });

    it('総ページ数が正しく計算される', async () => {
      const mockManyMandalas: GoalsListResponse = {
        ...mockMandalas,
        total: 45,
        totalPages: 3,
      };

      vi.mocked(GoalsService.getGoals).mockResolvedValue(mockManyMandalas);

      const { result } = renderHook(() => useMandalaList());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.totalPages).toBe(3);
    });
  });

  describe('エラーハンドリング', () => {
    it('API エラー時にエラーメッセージを設定する', async () => {
      const errorMessage = 'データの取得に失敗しました';

      // 新しいモックを設定（beforeEachのモックを上書き）
      vi.mocked(GoalsService.getGoals).mockReset();
      vi.mocked(GoalsService.getGoals).mockRejectedValue(
        new GoalsApiError(errorMessage, 500, 'SERVER_ERROR')
      );

      const { result } = renderHook(() => useMandalaList());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe(errorMessage);
      expect(result.current.mandalas).toEqual([]);
      expect(result.current.totalItems).toBe(0);
    });

    it('ネットワークエラー時にエラーメッセージを設定する', async () => {
      vi.mocked(GoalsService.getGoals).mockReset();
      vi.mocked(GoalsService.getGoals).mockRejectedValue(new TypeError('Network error'));

      const { result } = renderHook(() => useMandalaList());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Network error');
      expect(result.current.mandalas).toEqual([]);
    });

    it('エラー後にrefetchで再試行できる', async () => {
      vi.mocked(GoalsService.getGoals).mockReset();
      vi.mocked(GoalsService.getGoals).mockRejectedValueOnce(
        new GoalsApiError('エラー', 500, 'ERROR')
      );

      const { result } = renderHook(() => useMandalaList());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // エラーが設定されていることを確認
      expect(result.current.error).not.toBeNull();

      vi.mocked(GoalsService.getGoals).mockResolvedValue(mockMandalas);

      await act(async () => {
        await result.current.refetch();
      });

      await waitFor(() => {
        expect(result.current.error).toBeNull();
        expect(result.current.mandalas).toEqual(mockMandalas.data);
      });
    });
  });

  describe('ローディング状態', () => {
    it('データ取得中はisFetchingがtrueになる', async () => {
      let resolvePromise: (value: GoalsListResponse) => void;
      const promise = new Promise<GoalsListResponse>(resolve => {
        resolvePromise = resolve;
      });

      vi.mocked(GoalsService.getGoals).mockReturnValue(promise);

      const { result } = renderHook(() => useMandalaList());

      expect(result.current.isFetching).toBe(true);

      await act(async () => {
        resolvePromise!(mockMandalas);
        await promise;
      });

      await waitFor(() => {
        expect(result.current.isFetching).toBe(false);
      });
    });

    it('初回ロード時はisLoadingがtrueになる', () => {
      const { result } = renderHook(() => useMandalaList());

      expect(result.current.isLoading).toBe(true);
    });
  });
});
