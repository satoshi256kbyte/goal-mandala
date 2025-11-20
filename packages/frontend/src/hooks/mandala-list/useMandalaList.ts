/**
 * useMandalaList - マンダラチャート一覧管理フック
 *
 * マンダラチャート一覧の取得、検索、フィルター、ソート、ページネーション機能を提供します。
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import type {
  MandalaChartSummary,
  GoalStatus,
  SortOption,
  GoalsListParams,
} from '../../types/mandala-list';
import { PAGINATION } from '../../constants/mandala-list';
import { GoalsService } from '../../services/mandala-list/goals-api';
import { debounce } from '../../utils/debounce';

/**
 * useMandalaListフックのオプション
 */
export interface UseMandalaListOptions {
  /** 初期ページ番号 */
  initialPage?: number;
  /** 1ページあたりの件数 */
  itemsPerPage?: number;
}

/**
 * useMandalaListフックの戻り値
 */
export interface UseMandalaListReturn {
  // データ
  /** マンダラチャート一覧 */
  mandalas: MandalaChartSummary[];
  /** 総件数 */
  totalItems: number;
  /** 総ページ数 */
  totalPages: number;

  // 状態
  /** 初回ローディング中かどうか */
  isLoading: boolean;
  /** データ取得中かどうか */
  isFetching: boolean;
  /** エラーオブジェクト */
  error: unknown;

  // フィルター・検索・ソート
  /** 検索キーワード */
  searchKeyword: string;
  /** 状態フィルター */
  statusFilter: GoalStatus | 'all';
  /** ソート条件 */
  sortOption: SortOption;
  /** 現在のページ番号 */
  currentPage: number;

  // メソッド
  /** 検索キーワードを設定 */
  setSearchKeyword: (keyword: string) => void;
  /** 状態フィルターを設定 */
  setStatusFilter: (status: GoalStatus | 'all') => void;
  /** ソート条件を設定 */
  setSortOption: (option: SortOption) => void;
  /** ページ番号を設定 */
  setCurrentPage: (page: number) => void;
  /** データを再取得 */
  refetch: () => Promise<void>;
  /** フィルターをクリア */
  clearFilters: () => void;
}

/**
 * マンダラチャート一覧管理フック
 *
 * @param options - フックのオプション
 * @returns マンダラチャート一覧の状態と操作メソッド
 *
 * @example
 * ```tsx
 * const {
 *   mandalas,
 *   isLoading,
 *   searchKeyword,
 *   setSearchKeyword,
 *   statusFilter,
 *   setStatusFilter,
 * } = useMandalaList();
 * ```
 */
export function useMandalaList(options?: UseMandalaListOptions): UseMandalaListReturn {
  // オプションのデフォルト値
  const itemsPerPage = options?.itemsPerPage || PAGINATION.DEFAULT_ITEMS_PER_PAGE;
  const initialPage = options?.initialPage || PAGINATION.DEFAULT_PAGE;

  // フィルター・検索・ソート状態
  const [searchKeyword, setSearchKeyword] = useState('');
  const [debouncedSearchKeyword, setDebouncedSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<GoalStatus | 'all'>('all');
  const [sortOption, setSortOption] = useState<SortOption>('created_at_desc');
  const [currentPage, setCurrentPage] = useState(initialPage);

  // データ状態
  const [mandalas, setMandalas] = useState<MandalaChartSummary[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<unknown>(null);

  // 総ページ数を計算（メモ化）
  const totalPages = useMemo(
    () => Math.ceil(totalItems / itemsPerPage),
    [totalItems, itemsPerPage]
  );

  // デバウンス関数の参照を保持
  const debouncedSetSearchKeywordRef = useRef(
    debounce((keyword: string) => {
      setDebouncedSearchKeyword(keyword);
    }, 300)
  );

  // 検索キーワード設定（デバウンス付き）
  const handleSetSearchKeyword = useCallback((keyword: string) => {
    setSearchKeyword(keyword);
    debouncedSetSearchKeywordRef.current(keyword);
  }, []);

  // フィルタークリア
  const clearFilters = useCallback(() => {
    setSearchKeyword('');
    setDebouncedSearchKeyword('');
    setStatusFilter('all');
    setSortOption('created_at_desc');
    setCurrentPage(initialPage);
  }, [initialPage]);

  // データ取得関数
  const fetchMandalas = useCallback(async () => {
    setIsFetching(true);
    setError(null);

    try {
      // クエリパラメータを構築（デバウンスされた検索キーワードを使用）
      const params: GoalsListParams = {
        search: debouncedSearchKeyword || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        sort: sortOption,
        page: currentPage,
        limit: itemsPerPage,
      };

      // API呼び出し
      const response = await GoalsService.getGoals(params);

      // データを設定
      setMandalas(response.data);
      setTotalItems(response.total);
    } catch (err) {
      // エラーオブジェクトをそのまま保存（エラー分類は表示側で行う）
      setError(err);
      // エラー時はデータをクリア
      setMandalas([]);
      setTotalItems(0);
    } finally {
      setIsFetching(false);
      setIsLoading(false);
    }
  }, [debouncedSearchKeyword, statusFilter, sortOption, currentPage, itemsPerPage]);

  // 検索キーワード、フィルター、ソート変更時はページを1に戻す
  useEffect(() => {
    if (currentPage !== initialPage) {
      setCurrentPage(initialPage);
    }
  }, [debouncedSearchKeyword, statusFilter, sortOption]);

  // データ取得
  useEffect(() => {
    setIsLoading(true);
    fetchMandalas();
  }, [debouncedSearchKeyword, statusFilter, sortOption, currentPage, itemsPerPage]);

  return {
    // データ
    mandalas,
    totalItems,
    totalPages,

    // 状態
    isLoading,
    isFetching,
    error,

    // フィルター・検索・ソート
    searchKeyword,
    statusFilter,
    sortOption,
    currentPage,

    // メソッド
    setSearchKeyword: handleSetSearchKeyword,
    setStatusFilter,
    setSortOption,
    setCurrentPage,
    refetch: fetchMandalas,
    clearFilters,
  };
}
