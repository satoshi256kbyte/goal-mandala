import React, { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MandalaCard } from './MandalaCard';
import { SearchBar } from './SearchBar';
import { StatusFilter } from './StatusFilter';
import { SortDropdown } from './SortDropdown';
import { Pagination } from './Pagination';
import { EmptyState } from './EmptyState';
import { ErrorDisplay } from './ErrorDisplay';
import { useMandalaList } from '../../hooks/mandala-list/useMandalaList';
import { classifyError } from '../../utils/error-classifier';

export interface MandalaListContainerProps {
  className?: string;
}

/**
 * MandalaListContainer - マンダラチャート一覧コンテナコンポーネント
 *
 * マンダラチャート一覧の表示、検索、フィルター、ソート、ページネーション機能を統合します。
 *
 * @param className - 追加のCSSクラス
 *
 * 要件:
 * - 1.1-1.8: マンダラチャート一覧表示
 * - 5.1-5.7: 検索機能
 * - 6.1-6.6: フィルター機能
 * - 7.1-7.6: ソート機能
 * - 8.1-8.9: ページネーション機能
 * - 9.1-9.5: 空状態表示
 * - 11.1-11.7: データ取得機能
 * - 15.1-15.5: パフォーマンス最適化（メモ化）
 */
export const MandalaListContainer: React.FC<MandalaListContainerProps> = ({ className = '' }) => {
  const navigate = useNavigate();

  // マンダラチャート一覧管理フック
  const {
    mandalas,
    totalItems,
    totalPages,
    isLoading,
    isFetching,
    error,
    searchKeyword,
    statusFilter,
    sortOption,
    currentPage,
    setSearchKeyword,
    setStatusFilter,
    setSortOption,
    setCurrentPage,
    refetch,
    clearFilters,
  } = useMandalaList();

  // マンダラカードクリック時の処理（メモ化）
  const handleCardClick = useCallback(
    (id: string) => {
      navigate(`/mandala/${id}`);
    },
    [navigate]
  );

  // 新規作成ボタンクリック時の処理（メモ化）
  const handleCreateClick = useCallback(() => {
    navigate('/mandala/create/goal');
  }, [navigate]);

  // 検索クリア時の処理（メモ化）
  const handleSearchClear = useCallback(() => {
    setSearchKeyword('');
  }, [setSearchKeyword]);

  // 空状態の判定（メモ化）
  const isEmpty = useMemo(() => !isLoading && mandalas.length === 0, [isLoading, mandalas.length]);
  const isFiltered = useMemo(
    () => searchKeyword !== '' || statusFilter !== 'all',
    [searchKeyword, statusFilter]
  );

  // エラー分類（メモ化）
  const classifiedError = useMemo(() => {
    if (!error) return null;
    return classifyError(error);
  }, [error]);

  return (
    <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 ${className}`}>
      {/* フィルターバー - モバイル: 縦配置、タブレット以上: 横配置 */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 sm:gap-4 mb-6">
        {/* 検索バー - モバイル: 全幅、タブレット以上: flex-1 */}
        <div className="w-full sm:flex-1 sm:min-w-[200px]">
          <SearchBar
            value={searchKeyword}
            onChange={setSearchKeyword}
            onClear={handleSearchClear}
            disabled={isFetching}
          />
        </div>

        {/* フィルター・ソート行 - モバイル: 横並び、タブレット以上: そのまま */}
        <div className="flex gap-3 sm:gap-4">
          {/* 状態フィルター */}
          <div className="flex-1 sm:flex-none">
            <StatusFilter value={statusFilter} onChange={setStatusFilter} disabled={isFetching} />
          </div>

          {/* ソートドロップダウン */}
          <div className="flex-1 sm:flex-none">
            <SortDropdown value={sortOption} onChange={setSortOption} disabled={isFetching} />
          </div>
        </div>

        {/* 新規作成ボタン - モバイル: 全幅、タブレット以上: ml-auto */}
        <button
          onClick={handleCreateClick}
          className="w-full sm:w-auto sm:ml-auto px-6 py-3 sm:py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200 min-h-[44px] touch-manipulation"
          aria-label="新規マンダラチャートを作成"
        >
          新規作成
        </button>
      </div>

      {/* エラー表示 */}
      {classifiedError && (
        <ErrorDisplay
          message={classifiedError.message}
          type={classifiedError.type}
          onRetry={refetch}
          className="mb-6"
        />
      )}

      {/* ローディング状態 */}
      {isLoading && (
        <div role="status" aria-live="polite" aria-busy="true" className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
          <p className="mt-4 text-gray-600">データを読み込んでいます...</p>
        </div>
      )}

      {/* 空状態表示 */}
      {isEmpty && !error && (
        <EmptyState
          title={
            isFiltered
              ? '該当するマンダラチャートが見つかりませんでした'
              : 'まだマンダラチャートがありません'
          }
          description={
            isFiltered
              ? '検索条件を変更するか、フィルターをクリアしてください。'
              : '新しい目標を作成して、マンダラチャートを始めましょう。'
          }
          actionLabel={isFiltered ? 'フィルターをクリア' : '新規作成'}
          onAction={isFiltered ? clearFilters : handleCreateClick}
          icon={
            <svg
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          }
        />
      )}

      {/* マンダラグリッド */}
      {!isLoading && !isEmpty && (
        <>
          <div
            className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
            role="list"
            aria-label="マンダラチャート一覧"
          >
            {mandalas.map(mandala => (
              <div key={mandala.id} role="listitem">
                <MandalaCard mandala={mandala} onClick={handleCardClick} />
              </div>
            ))}
          </div>

          {/* ページネーション */}
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            itemsPerPage={20}
            onPageChange={setCurrentPage}
            disabled={isFetching}
          />
        </>
      )}

      {/* データ取得中のオーバーレイ */}
      {isFetching && !isLoading && (
        <div
          role="status"
          aria-live="polite"
          aria-busy="true"
          className="fixed bottom-4 right-4 bg-white shadow-lg rounded-lg px-4 py-2 flex items-center space-x-2"
        >
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
          <span className="text-sm text-gray-600">更新中...</span>
        </div>
      )}
    </div>
  );
};

MandalaListContainer.displayName = 'MandalaListContainer';
