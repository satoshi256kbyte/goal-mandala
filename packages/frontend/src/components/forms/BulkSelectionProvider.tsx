import React, { createContext, useContext, useCallback, useState, useMemo } from 'react';

/**
 * 選択可能なアイテムの型定義
 */
export interface SelectableItem {
  id: string;
  [key: string]: unknown;
}

/**
 * 一括選択の状態
 */
export interface BulkSelectionState {
  /** 選択されたアイテムのID */
  selectedIds: Set<string>;
  /** 全選択状態かどうか */
  isAllSelected: boolean;
  /** 部分選択状態かどうか */
  isPartiallySelected: boolean;
  /** 選択モードかどうか */
  isSelectionMode: boolean;
}

/**
 * 一括選択コンテキストの型定義
 */
export interface BulkSelectionContextValue {
  // 状態
  selectionState: BulkSelectionState;
  selectedItems: SelectableItem[];

  // アクション
  toggleItem: (item: SelectableItem) => void;
  toggleAll: (items: SelectableItem[]) => void;
  selectAll: (items: SelectableItem[]) => void;
  clearSelection: () => void;
  enterSelectionMode: () => void;
  exitSelectionMode: () => void;

  // ユーティリティ
  isSelected: (itemId: string) => boolean;
  getSelectedCount: () => number;
  canSelectAll: (items: SelectableItem[]) => boolean;
}

/**
 * BulkSelectionProviderのプロパティ
 */
export interface BulkSelectionProviderProps {
  children: React.ReactNode;
  /** 選択変更時のコールバック */
  onSelectionChange?: (selectedItems: SelectableItem[]) => void;
  /** 選択モード変更時のコールバック */
  onSelectionModeChange?: (isSelectionMode: boolean) => void;
  /** 最大選択数 */
  maxSelection?: number;
  /** 最小選択数 */
  minSelection?: number;
}

// デフォルト状態（将来使用予定）
// const DEFAULT_SELECTION_STATE: BulkSelectionState = {
//   selectedIds: new Set(),
//   isAllSelected: false,
//   isPartiallySelected: false,
//   isSelectionMode: false,
// };

// コンテキスト作成
const BulkSelectionContext = createContext<BulkSelectionContextValue | null>(null);

/**
 * 一括選択プロバイダーコンポーネント
 *
 * 要件5の受入基準に対応:
 * - 複数項目選択時の選択状態の視覚的表示
 * - 全選択・全解除機能
 * - 選択状態の視覚的表示
 * - 選択項目数の表示
 */
export const BulkSelectionProvider: React.FC<BulkSelectionProviderProps> = ({
  children,
  onSelectionChange,
  onSelectionModeChange,
  maxSelection,
  minSelection = 0, // eslint-disable-line @typescript-eslint/no-unused-vars
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [allItems, setAllItems] = useState<SelectableItem[]>([]);

  // 選択状態の計算
  const selectionState = useMemo((): BulkSelectionState => {
    const totalItems = allItems.length;
    const selectedCount = selectedIds.size;

    return {
      selectedIds,
      isAllSelected: totalItems > 0 && selectedCount === totalItems,
      isPartiallySelected: selectedCount > 0 && selectedCount < totalItems && totalItems > 0,
      isSelectionMode,
    };
  }, [selectedIds, allItems.length, isSelectionMode]);

  // 選択されたアイテムを取得
  const selectedItems = useMemo(() => {
    return allItems.filter(item => selectedIds.has(item.id));
  }, [allItems, selectedIds]);

  // アイテムの選択/選択解除を切り替え
  const toggleItem = useCallback(
    (item: SelectableItem) => {
      setSelectedIds(prev => {
        const newSelectedIds = new Set(prev);

        if (newSelectedIds.has(item.id)) {
          // 選択解除
          newSelectedIds.delete(item.id);
        } else {
          // 選択
          if (maxSelection && newSelectedIds.size >= maxSelection) {
            // 最大選択数に達している場合は何もしない
            return prev;
          }
          newSelectedIds.add(item.id);
        }

        return newSelectedIds;
      });

      // 選択モードに入る
      if (!isSelectionMode) {
        setIsSelectionMode(true);
      }
    },
    [maxSelection, isSelectionMode]
  );

  // 全選択/全解除の切り替え
  const toggleAll = useCallback(
    (items: SelectableItem[]) => {
      setAllItems(items);

      setSelectedIds(prev => {
        const totalItems = items.length;
        const selectedCount = prev.size;

        if (selectedCount === totalItems) {
          // 全選択状態なら全解除
          return new Set();
        } else {
          // 部分選択または未選択なら全選択
          const itemsToSelect = maxSelection ? items.slice(0, maxSelection) : items;
          return new Set(itemsToSelect.map(item => item.id));
        }
      });

      // 選択モードに入る
      if (!isSelectionMode) {
        setIsSelectionMode(true);
      }
    },
    [maxSelection, isSelectionMode]
  );

  // 全選択
  const selectAll = useCallback(
    (items: SelectableItem[]) => {
      setAllItems(items);

      const itemsToSelect = maxSelection ? items.slice(0, maxSelection) : items;

      setSelectedIds(new Set(itemsToSelect.map(item => item.id)));

      // 選択モードに入る
      if (!isSelectionMode) {
        setIsSelectionMode(true);
      }
    },
    [maxSelection, isSelectionMode]
  );

  // 選択をクリア
  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // 選択モードに入る
  const enterSelectionMode = useCallback(() => {
    setIsSelectionMode(true);
  }, []);

  // 選択モードを終了
  const exitSelectionMode = useCallback(() => {
    setIsSelectionMode(false);
    setSelectedIds(new Set());
  }, []);

  // アイテムが選択されているかチェック
  const isSelected = useCallback(
    (itemId: string): boolean => {
      return selectedIds.has(itemId);
    },
    [selectedIds]
  );

  // 選択数を取得
  const getSelectedCount = useCallback((): number => {
    return selectedIds.size;
  }, [selectedIds]);

  // 全選択可能かチェック
  const canSelectAll = useCallback(
    (items: SelectableItem[]): boolean => {
      if (maxSelection) {
        return items.length <= maxSelection;
      }
      return true;
    },
    [maxSelection]
  );

  // 選択変更時のコールバック実行
  React.useEffect(() => {
    onSelectionChange?.(selectedItems);
  }, [selectedItems, onSelectionChange]);

  // 選択モード変更時のコールバック実行
  React.useEffect(() => {
    onSelectionModeChange?.(isSelectionMode);
  }, [isSelectionMode, onSelectionModeChange]);

  const contextValue: BulkSelectionContextValue = {
    selectionState,
    selectedItems,
    toggleItem,
    toggleAll,
    selectAll,
    clearSelection,
    enterSelectionMode,
    exitSelectionMode,
    isSelected,
    getSelectedCount,
    canSelectAll,
  };

  return (
    <BulkSelectionContext.Provider value={contextValue}>{children}</BulkSelectionContext.Provider>
  );
};

/**
 * 一括選択コンテキストを使用するフック
 */
export const useBulkSelection = (): BulkSelectionContextValue => {
  const context = useContext(BulkSelectionContext);
  if (!context) {
    throw new Error('useBulkSelection must be used within a BulkSelectionProvider');
  }
  return context;
};

/**
 * 選択可能アイテムのプロパティ
 */
export interface SelectableItemProps {
  item: SelectableItem;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  /** 選択時の追加スタイル */
  selectedClassName?: string;
  /** 選択モード時の追加スタイル */
  selectionModeClassName?: string;
}

/**
 * 選択可能アイテムコンポーネント
 */
export const SelectableItem: React.FC<SelectableItemProps> = ({
  item,
  children,
  className = '',
  disabled = false,
  selectedClassName = 'ring-2 ring-blue-500 bg-blue-50',
  selectionModeClassName = 'cursor-pointer hover:bg-gray-50',
}) => {
  const { selectionState, toggleItem, isSelected } = useBulkSelection();

  const handleClick = useCallback(
    (event: React.MouseEvent) => {
      if (disabled) return;

      // 選択モードの場合は選択を切り替え
      if (selectionState.isSelectionMode) {
        event.preventDefault();
        event.stopPropagation();
        toggleItem(item);
      }
    },
    [disabled, selectionState.isSelectionMode, toggleItem, item]
  );

  const isItemSelected = isSelected(item.id);

  const computedClassName = [
    className,
    selectionState.isSelectionMode ? selectionModeClassName : '',
    isItemSelected ? selectedClassName : '',
    disabled ? 'opacity-50 cursor-not-allowed' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={computedClassName}
      onClick={handleClick}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick(e as any);
        }
      }}
      role="button"
      tabIndex={0}
      data-selected={isItemSelected}
      data-selection-mode={selectionState.isSelectionMode}
    >
      {/* 選択チェックボックス */}
      {selectionState.isSelectionMode && (
        <div className="absolute top-2 left-2 z-10">
          <input
            type="checkbox"
            checked={isItemSelected}
            onChange={() => toggleItem(item)}
            disabled={disabled}
            className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            aria-label={`${item.id}を選択`}
          />
        </div>
      )}

      {children}
    </div>
  );
};

/**
 * 一括選択コントロールのプロパティ
 */
export interface BulkSelectionControlsProps {
  items: SelectableItem[];
  className?: string;
  /** カスタムアクションボタン */
  customActions?: React.ReactNode;
}

/**
 * 一括選択コントロールコンポーネント
 */
export const BulkSelectionControls: React.FC<BulkSelectionControlsProps> = ({
  items,
  className = '',
  customActions,
}) => {
  const {
    selectionState,
    toggleAll,
    clearSelection,
    enterSelectionMode,
    exitSelectionMode,
    getSelectedCount,
    canSelectAll,
  } = useBulkSelection();

  const selectedCount = getSelectedCount();

  if (!selectionState.isSelectionMode) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <button
          onClick={enterSelectionMode}
          className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          選択モード
        </button>
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-between ${className}`}>
      <div className="flex items-center space-x-4">
        {/* 選択数表示 */}
        <span className="text-sm font-medium text-gray-700">{selectedCount}個選択中</span>

        {/* 全選択/全解除ボタン */}
        <button
          onClick={() => toggleAll(items)}
          disabled={!canSelectAll(items)}
          className="px-3 py-2 text-sm font-medium text-blue-700 bg-blue-100 border border-blue-300 rounded-md hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {selectionState.isAllSelected ? '全解除' : '全選択'}
        </button>

        {/* 選択クリアボタン */}
        {selectedCount > 0 && (
          <button
            onClick={clearSelection}
            className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            選択クリア
          </button>
        )}
      </div>

      <div className="flex items-center space-x-2">
        {/* カスタムアクション */}
        {customActions}

        {/* 選択モード終了ボタン */}
        <button
          onClick={exitSelectionMode}
          className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          選択モード終了
        </button>
      </div>
    </div>
  );
};

/**
 * 選択状態インジケーターのプロパティ
 */
export interface SelectionIndicatorProps {
  className?: string;
  showCount?: boolean;
  showMode?: boolean;
}

/**
 * 選択状態インジケーターコンポーネント
 */
export const SelectionIndicator: React.FC<SelectionIndicatorProps> = ({
  className = '',
  showCount = true,
  showMode = true,
}) => {
  const { selectionState, getSelectedCount } = useBulkSelection();

  if (!selectionState.isSelectionMode && !selectionState.selectedIds.size) {
    return null;
  }

  const selectedCount = getSelectedCount();

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {/* 選択モード表示 */}
      {showMode && selectionState.isSelectionMode && (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          選択モード
        </span>
      )}

      {/* 選択数表示 */}
      {showCount && selectedCount > 0 && (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          {selectedCount}個選択
        </span>
      )}

      {/* 全選択インジケーター */}
      {selectionState.isAllSelected && (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
          全選択
        </span>
      )}

      {/* 部分選択インジケーター */}
      {selectionState.isPartiallySelected && (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          部分選択
        </span>
      )}
    </div>
  );
};
