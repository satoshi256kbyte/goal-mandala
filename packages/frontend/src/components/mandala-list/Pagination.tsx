import React from 'react';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  disabled = false,
}) => {
  // ページ番号の配列を生成（最大7ページ表示）
  const getPageNumbers = (): (number | string)[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages: (number | string)[] = [];

    // 常に最初のページを表示
    pages.push(1);

    if (currentPage > 3) {
      pages.push('...');
    }

    // 現在のページの前後を表示
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (currentPage < totalPages - 2) {
      pages.push('...');
    }

    // 常に最後のページを表示
    if (totalPages > 1) {
      pages.push(totalPages);
    }

    return pages;
  };

  const handlePrevious = () => {
    if (currentPage > 1 && !disabled) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages && !disabled) {
      onPageChange(currentPage + 1);
    }
  };

  const handlePageClick = (page: number) => {
    if (!disabled && page !== currentPage) {
      onPageChange(page);
    }
  };

  // ページネーションが不要な場合は表示しない
  if (totalPages <= 1) {
    return null;
  }

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <nav className="flex items-center justify-center gap-2 mt-8" aria-label="ページネーション">
      {/* 前へボタン */}
      <button
        onClick={handlePrevious}
        disabled={currentPage === 1 || disabled}
        aria-label="前のページ"
        aria-disabled={currentPage === 1 || disabled}
        className="px-4 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
      >
        前へ
      </button>

      {/* ページ番号ボタン */}
      <div className="flex items-center gap-2">
        {getPageNumbers().map((page, index) => {
          if (page === '...') {
            return (
              <span key={`ellipsis-${index}`} className="px-2 text-gray-500" aria-hidden="true">
                ...
              </span>
            );
          }

          const pageNumber = page as number;
          const isActive = pageNumber === currentPage;

          return (
            <button
              key={pageNumber}
              onClick={() => handlePageClick(pageNumber)}
              disabled={disabled}
              aria-label={`ページ${pageNumber}`}
              aria-current={isActive ? 'page' : undefined}
              className={`
                px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200
                ${
                  isActive
                    ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'
                    : 'bg-white border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed'
                }
              `}
            >
              {pageNumber}
            </button>
          );
        })}
      </div>

      {/* 次へボタン */}
      <button
        onClick={handleNext}
        disabled={currentPage === totalPages || disabled}
        aria-label="次のページ"
        aria-disabled={currentPage === totalPages || disabled}
        className="px-4 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
      >
        次へ
      </button>

      {/* ページ情報表示 */}
      <div className="ml-4 text-sm text-gray-600" aria-live="polite">
        {startItem}-{endItem} / {totalItems}件
      </div>
    </nav>
  );
};
