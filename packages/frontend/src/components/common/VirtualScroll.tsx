import React, { useCallback, useMemo, useState, useRef } from 'react';
import {
  useVirtualScroll,
  useStableCallback,
  usePerformanceMeasure,
} from '../../utils/performance';

/**
 * 仮想スクロールアイテムの型定義
 */
export interface VirtualScrollItem {
  id: string;
  data: unknown;
}

/**
 * 仮想スクロールのプロパティ
 */
export interface VirtualScrollProps<T extends VirtualScrollItem> {
  /** 表示するアイテムの配列 */
  items: T[];
  /** 各アイテムの高さ（px） */
  itemHeight: number;
  /** コンテナの高さ（px） */
  height: number;
  /** アイテムをレンダリングする関数 */
  renderItem: (item: T, index: number) => React.ReactNode;
  /** オーバースキャンするアイテム数 */
  overscan?: number;
  /** カスタムクラス名 */
  className?: string;
  /** スクロール時のコールバック */
  onScroll?: (scrollTop: number) => void;
  /** アイテムクリック時のコールバック */
  onItemClick?: (item: T, index: number) => void;
  /** ローディング状態 */
  loading?: boolean;
  /** エラー状態 */
  error?: string;
  /** 空の状態のメッセージ */
  emptyMessage?: string;
}

/**
 * 仮想スクロールコンポーネント
 *
 * 大量のアイテム（64個のアクション表示など）を効率的に表示するために、
 * 画面に見える部分のみをレンダリングする仮想スクロール機能を提供します。
 *
 * 要件2: アクション一覧表示（8×8=64個）のパフォーマンス最適化
 */
export const VirtualScroll = <T extends VirtualScrollItem>({
  items,
  itemHeight,
  height,
  renderItem,
  overscan = 5,
  className = '',
  onScroll,
  onItemClick,
  loading = false,
  error,
  emptyMessage = 'アイテムがありません',
}: VirtualScrollProps<T>) => {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const { start: measureStart, end: measureEnd } = usePerformanceMeasure('VirtualScroll');

  // 仮想スクロールの計算
  const virtualScrollResult = useVirtualScroll(items.length, scrollTop, {
    itemHeight,
    containerHeight: height,
    overscan,
  });

  // 表示するアイテムを計算
  const visibleItems = useMemo(() => {
    measureStart();
    const result = items.slice(virtualScrollResult.startIndex, virtualScrollResult.endIndex + 1);
    measureEnd();
    return result;
  }, [
    items,
    virtualScrollResult.startIndex,
    virtualScrollResult.endIndex,
    measureStart,
    measureEnd,
  ]);

  // スクロールハンドラー
  const handleScroll = useStableCallback((event: React.UIEvent<HTMLDivElement>) => {
    const newScrollTop = event.currentTarget.scrollTop;
    setScrollTop(newScrollTop);
    onScroll?.(newScrollTop);
  });

  // アイテムクリックハンドラー
  const handleItemClick = useStableCallback((item: T, index: number) => {
    onItemClick?.(item, virtualScrollResult.startIndex + index);
  });

  // キーボードナビゲーション
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (!containerRef.current) return;

      const container = containerRef.current;
      const currentScrollTop = container.scrollTop;

      switch (event.key) {
        case 'ArrowUp':
          event.preventDefault();
          container.scrollTop = Math.max(0, currentScrollTop - itemHeight);
          break;
        case 'ArrowDown':
          event.preventDefault();
          container.scrollTop = Math.min(
            virtualScrollResult.totalHeight - height,
            currentScrollTop + itemHeight
          );
          break;
        case 'PageUp':
          event.preventDefault();
          container.scrollTop = Math.max(0, currentScrollTop - height);
          break;
        case 'PageDown':
          event.preventDefault();
          container.scrollTop = Math.min(
            virtualScrollResult.totalHeight - height,
            currentScrollTop + height
          );
          break;
        case 'Home':
          event.preventDefault();
          container.scrollTop = 0;
          break;
        case 'End':
          event.preventDefault();
          container.scrollTop = virtualScrollResult.totalHeight - height;
          break;
      }
    },
    [itemHeight, height, virtualScrollResult.totalHeight]
  );

  // ローディング状態
  if (loading) {
    return (
      <div
        className={`flex items-center justify-center ${className}`}
        style={{ height }}
        role="status"
        aria-label="読み込み中"
      >
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">読み込み中...</span>
      </div>
    );
  }

  // エラー状態
  if (error) {
    return (
      <div
        className={`flex items-center justify-center ${className}`}
        style={{ height }}
        role="alert"
        aria-label="エラー"
      >
        <div className="text-center">
          <div className="text-red-600 mb-2">
            <svg className="h-8 w-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  // 空の状態
  if (items.length === 0) {
    return (
      <div
        className={`flex items-center justify-center ${className}`}
        style={{ height }}
        role="status"
        aria-label="空の状態"
      >
        <div className="text-center">
          <div className="text-gray-400 mb-2">
            <svg className="h-8 w-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2 2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-2.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 009.586 13H7"
              />
            </svg>
          </div>
          <p className="text-gray-600">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`overflow-auto ${className}`}
      style={{ height }}
      onScroll={handleScroll}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="listbox"
      aria-label="仮想スクロールリスト"
    >
      {/* 仮想スクロールコンテナ */}
      <div
        style={{
          height: virtualScrollResult.totalHeight,
          position: 'relative',
        }}
      >
        {/* 表示されるアイテム */}
        <div
          style={{
            transform: `translateY(${virtualScrollResult.offsetY}px)`,
          }}
        >
          {visibleItems.map((item, index) => (
            <div
              key={item.id}
              style={{
                height: itemHeight,
                display: 'flex',
                alignItems: 'center',
              }}
              onClick={() => handleItemClick(item, index)}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleItemClick(item, virtualScrollResult.startIndex + index);
                }
              }}
              role="button"
              tabIndex={0}
            >
              {renderItem(item, virtualScrollResult.startIndex + index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/**
 * メモ化された仮想スクロールコンポーネント
 */
export const MemoizedVirtualScroll = React.memo(VirtualScroll) as typeof VirtualScroll;

/**
 * グリッド表示用の仮想スクロールコンポーネント
 */
export interface VirtualGridProps<T extends VirtualScrollItem> {
  /** 表示するアイテムの配列 */
  items: T[];
  /** 1行あたりのアイテム数 */
  itemsPerRow: number;
  /** 各アイテムの高さ（px） */
  itemHeight: number;
  /** コンテナの高さ（px） */
  height: number;
  /** アイテムをレンダリングする関数 */
  renderItem: (item: T, index: number) => React.ReactNode;
  /** オーバースキャンする行数 */
  overscan?: number;
  /** カスタムクラス名 */
  className?: string;
  /** スクロール時のコールバック */
  onScroll?: (scrollTop: number) => void;
  /** アイテムクリック時のコールバック */
  onItemClick?: (item: T, index: number) => void;
  /** ローディング状態 */
  loading?: boolean;
  /** エラー状態 */
  error?: string;
  /** 空の状態のメッセージ */
  emptyMessage?: string;
}

/**
 * グリッド表示用の仮想スクロールコンポーネント
 *
 * アクション一覧（8×8グリッド）などのグリッド表示に最適化された仮想スクロール
 */
export const VirtualGrid = <T extends VirtualScrollItem>({
  items,
  itemsPerRow,
  itemHeight,
  height,
  renderItem,
  overscan = 2,
  className = '',
  onScroll,
  onItemClick,
  loading = false,
  error,
  emptyMessage = 'アイテムがありません',
}: VirtualGridProps<T>) => {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // 行数を計算
  const rowCount = Math.ceil(items.length / itemsPerRow);

  // 仮想スクロールの計算（行ベース）
  const virtualScrollResult = useVirtualScroll(rowCount, scrollTop, {
    itemHeight,
    containerHeight: height,
    overscan,
  });

  // 表示する行のアイテムを計算
  const visibleItems = useMemo(() => {
    const startItemIndex = virtualScrollResult.startIndex * itemsPerRow;
    const endItemIndex = Math.min((virtualScrollResult.endIndex + 1) * itemsPerRow, items.length);
    return items.slice(startItemIndex, endItemIndex);
  }, [items, virtualScrollResult.startIndex, virtualScrollResult.endIndex, itemsPerRow]);

  // 表示する行を計算
  const visibleRows = useMemo(() => {
    const rows: T[][] = [];
    for (let i = 0; i < visibleItems.length; i += itemsPerRow) {
      rows.push(visibleItems.slice(i, i + itemsPerRow));
    }
    return rows;
  }, [visibleItems, itemsPerRow]);

  // スクロールハンドラー
  const handleScroll = useStableCallback((event: React.UIEvent<HTMLDivElement>) => {
    const newScrollTop = event.currentTarget.scrollTop;
    setScrollTop(newScrollTop);
    onScroll?.(newScrollTop);
  });

  // アイテムクリックハンドラー
  const handleItemClick = useStableCallback((item: T, rowIndex: number, itemIndex: number) => {
    const globalIndex = (virtualScrollResult.startIndex + rowIndex) * itemsPerRow + itemIndex;
    onItemClick?.(item, globalIndex);
  });

  // ローディング、エラー、空の状態は VirtualScroll と同じ
  if (loading) {
    return (
      <div
        className={`flex items-center justify-center ${className}`}
        style={{ height }}
        role="status"
        aria-label="読み込み中"
      >
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">読み込み中...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`flex items-center justify-center ${className}`}
        style={{ height }}
        role="alert"
        aria-label="エラー"
      >
        <div className="text-center">
          <div className="text-red-600 mb-2">
            <svg className="h-8 w-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div
        className={`flex items-center justify-center ${className}`}
        style={{ height }}
        role="status"
        aria-label="空の状態"
      >
        <div className="text-center">
          <div className="text-gray-400 mb-2">
            <svg className="h-8 w-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2 2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-2.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 009.586 13H7"
              />
            </svg>
          </div>
          <p className="text-gray-600">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`overflow-auto ${className}`}
      style={{ height }}
      onScroll={handleScroll}
      tabIndex={0}
      role="grid"
      aria-label="仮想スクロールグリッド"
      aria-rowcount={rowCount}
      aria-colcount={itemsPerRow}
    >
      {/* 仮想スクロールコンテナ */}
      <div
        style={{
          height: rowCount * itemHeight,
          position: 'relative',
        }}
      >
        {/* 表示される行 */}
        <div
          style={{
            transform: `translateY(${virtualScrollResult.offsetY}px)`,
          }}
        >
          {visibleRows.map((row, rowIndex) => (
            <div
              key={`row-${virtualScrollResult.startIndex + rowIndex}`}
              style={{
                height: itemHeight,
                display: 'flex',
              }}
              role="row"
              aria-rowindex={virtualScrollResult.startIndex + rowIndex + 1}
            >
              {row.map((item, itemIndex) => (
                <div
                  key={item.id}
                  style={{
                    flex: `0 0 ${100 / itemsPerRow}%`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  onClick={() => handleItemClick(item, rowIndex, itemIndex)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleItemClick(item, rowIndex, itemIndex);
                    }
                  }}
                  role="gridcell"
                  aria-selected="false"
                  tabIndex={0}
                >
                  {renderItem(
                    item,
                    (virtualScrollResult.startIndex + rowIndex) * itemsPerRow + itemIndex
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/**
 * メモ化されたグリッド仮想スクロールコンポーネント
 */
export const MemoizedVirtualGrid = React.memo(VirtualGrid) as typeof VirtualGrid;
