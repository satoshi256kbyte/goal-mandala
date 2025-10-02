import React, { useCallback, useState } from 'react';
import { DraggableItem as DraggableItemType, useDragDrop } from './DragDropProvider';

/**
 * ドラッグハンドルのプロパティ
 */
export interface DragHandleProps {
  className?: string;
  /** ドラッグ中かどうか */
  isDragging?: boolean;
  /** ドラッグ可能かどうか */
  disabled?: boolean;
}

/**
 * ドラッグハンドルコンポーネント
 */
export const DragHandle: React.FC<DragHandleProps> = ({
  className = '',
  isDragging = false,
  disabled = false,
}) => {
  return (
    <div
      className={`
        flex items-center justify-center w-6 h-6 rounded cursor-grab
        ${disabled ? 'cursor-not-allowed opacity-50' : 'hover:bg-gray-100'}
        ${isDragging ? 'cursor-grabbing' : ''}
        ${className}
      `}
      title={disabled ? 'ドラッグできません' : 'ドラッグして並び替え'}
    >
      <svg
        className="w-4 h-4 text-gray-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
      </svg>
    </div>
  );
};

/**
 * ドラッグ可能カードのプロパティ
 */
export interface DraggableCardProps {
  item: DraggableItemType;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  /** ドラッグハンドルを表示するか */
  showDragHandle?: boolean;
  /** ホバー効果を有効にするか */
  enableHover?: boolean;
  /** 選択状態 */
  selected?: boolean;
  /** クリック時のコールバック */
  onClick?: (item: DraggableItemType) => void;
  /** ダブルクリック時のコールバック */
  onDoubleClick?: (item: DraggableItemType) => void;
}

/**
 * ドラッグ可能カードコンポーネント
 *
 * 要件4の受入基準に対応:
 * - ドラッグ可能な視覚的フィードバック提供
 * - ドラッグ状態の視覚的表示
 * - アニメーション効果
 */
export const DraggableCard: React.FC<DraggableCardProps> = ({
  item,
  children,
  className = '',
  disabled = false,
  showDragHandle = true,
  enableHover = true,
  selected = false,
  onClick,
  onDoubleClick,
}) => {
  const { dragState, startDrag, endDrag, getDragStyles } = useDragDrop();
  const [isHovered, setIsHovered] = useState(false);

  const isDragging = dragState.isDragging && dragState.dragItem?.id === item.id;
  const dragStyles = getDragStyles(item);

  // ドラッグ開始ハンドラー
  const handleDragStart = useCallback(
    (event: React.DragEvent) => {
      if (disabled) {
        event.preventDefault();
        return;
      }
      startDrag(item, event);
    },
    [item, disabled, startDrag]
  );

  // ドラッグ終了ハンドラー
  const handleDragEnd = useCallback(() => {
    if (!disabled) {
      endDrag();
    }
  }, [disabled, endDrag]);

  // クリックハンドラー
  const handleClick = useCallback(() => {
    if (!disabled && onClick) {
      onClick(item);
    }
  }, [item, disabled, onClick]);

  // ダブルクリックハンドラー
  const handleDoubleClick = useCallback(() => {
    if (!disabled && onDoubleClick) {
      onDoubleClick(item);
    }
  }, [item, disabled, onDoubleClick]);

  // マウスイベントハンドラー
  const handleMouseEnter = useCallback(() => {
    if (enableHover && !disabled) {
      setIsHovered(true);
    }
  }, [enableHover, disabled]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
  }, []);

  // カードのスタイルクラスを生成
  const getCardClassName = () => {
    const baseClasses = `
      relative bg-white border rounded-lg shadow-sm transition-all duration-200
      ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      ${selected ? 'ring-2 ring-blue-500 border-blue-500' : 'border-gray-200'}
      ${isHovered && !disabled ? 'shadow-md border-gray-300' : ''}
      ${isDragging ? 'shadow-lg' : ''}
    `;

    return `${baseClasses} ${className}`.trim();
  };

  return (
    <div
      draggable={!disabled}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={getCardClassName()}
      style={dragStyles}
      role="option"
      tabIndex={disabled ? -1 : 0}
      aria-label={`${item.type === 'subgoal' ? 'サブ目標' : 'アクション'}: ${item.id}`}
      aria-selected={selected}
      aria-disabled={disabled}
    >
      {/* ドラッグハンドル */}
      {showDragHandle && (
        <div className="absolute top-2 right-2">
          <DragHandle isDragging={isDragging} disabled={disabled} />
        </div>
      )}

      {/* 選択インジケーター */}
      {selected && (
        <div className="absolute top-2 left-2">
          <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
            <svg
              className="w-3 h-3 text-white"
              fill="currentColor"
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        </div>
      )}

      {/* ドラッグ中のオーバーレイ */}
      {isDragging && (
        <div className="absolute inset-0 bg-blue-500 bg-opacity-10 rounded-lg pointer-events-none" />
      )}

      {/* コンテンツ */}
      <div className={`p-4 ${showDragHandle ? 'pr-10' : ''} ${selected ? 'pl-10' : ''}`}>
        {children}
      </div>

      {/* ドラッグ中のラベル */}
      {isDragging && (
        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap pointer-events-none">
          移動中...
        </div>
      )}
    </div>
  );
};

/**
 * ドラッグ可能リストアイテムのプロパティ
 */
export interface DraggableListItemProps {
  item: DraggableItemType;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  selected?: boolean;
  /** 位置番号を表示するか */
  showPosition?: boolean;
  /** クリック時のコールバック */
  onClick?: (item: DraggableItemType) => void;
}

/**
 * ドラッグ可能リストアイテムコンポーネント
 */
export const DraggableListItem: React.FC<DraggableListItemProps> = ({
  item,
  children,
  className = '',
  disabled = false,
  selected = false,
  showPosition = true,
  onClick,
}) => {
  const { dragState, startDrag, endDrag, getDragStyles } = useDragDrop();

  const isDragging = dragState.isDragging && dragState.dragItem?.id === item.id;
  const dragStyles = getDragStyles(item);

  // ドラッグ開始ハンドラー
  const handleDragStart = useCallback(
    (event: React.DragEvent) => {
      if (disabled) {
        event.preventDefault();
        return;
      }
      startDrag(item, event);
    },
    [item, disabled, startDrag]
  );

  // ドラッグ終了ハンドラー
  const handleDragEnd = useCallback(() => {
    if (!disabled) {
      endDrag();
    }
  }, [disabled, endDrag]);

  // クリックハンドラー
  const handleClick = useCallback(() => {
    if (!disabled && onClick) {
      onClick(item);
    }
  }, [item, disabled, onClick]);

  return (
    <div
      draggable={!disabled}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={handleClick}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      className={`
        flex items-center space-x-3 p-3 rounded-lg border transition-all duration-200
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50'}
        ${selected ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'}
        ${isDragging ? 'shadow-lg' : 'hover:shadow-sm'}
        ${className}
      `}
      style={dragStyles}
      role="option"
      tabIndex={disabled ? -1 : 0}
      aria-label={`${item.type === 'subgoal' ? 'サブ目標' : 'アクション'}: ${item.id}`}
      aria-selected={selected}
      aria-disabled={disabled}
    >
      {/* ドラッグハンドル */}
      <DragHandle isDragging={isDragging} disabled={disabled} className="flex-shrink-0" />

      {/* 位置番号 */}
      {showPosition && (
        <div className="flex-shrink-0 w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-xs font-medium text-gray-600">
          {item.position + 1}
        </div>
      )}

      {/* 選択チェックボックス */}
      {selected && (
        <div className="flex-shrink-0">
          <div className="w-4 h-4 bg-blue-500 rounded flex items-center justify-center">
            <svg
              className="w-3 h-3 text-white"
              fill="currentColor"
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        </div>
      )}

      {/* コンテンツ */}
      <div className="flex-1 min-w-0">{children}</div>

      {/* ドラッグ中インジケーター */}
      {isDragging && (
        <div className="flex-shrink-0 text-blue-500">
          <svg
            className="w-4 h-4 animate-pulse"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
            />
          </svg>
        </div>
      )}
    </div>
  );
};

/**
 * ドロップゾーンインジケーターのプロパティ
 */
export interface DropZoneIndicatorProps {
  isActive: boolean;
  isValid: boolean;
  message?: string;
  className?: string;
}

/**
 * ドロップゾーンインジケーターコンポーネント
 */
export const DropZoneIndicator: React.FC<DropZoneIndicatorProps> = ({
  isActive,
  isValid,
  message,
  className = '',
}) => {
  if (!isActive) return null;

  return (
    <div
      className={`
        flex items-center justify-center p-4 border-2 border-dashed rounded-lg transition-all duration-200
        ${
          isValid
            ? 'border-blue-400 bg-blue-50 text-blue-700'
            : 'border-red-400 bg-red-50 text-red-700'
        }
        ${className}
      `}
    >
      <div className="flex items-center space-x-2">
        {isValid ? (
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        ) : (
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        )}
        <span className="text-sm font-medium">
          {message || (isValid ? 'ここにドロップできます' : 'ここにはドロップできません')}
        </span>
      </div>
    </div>
  );
};
