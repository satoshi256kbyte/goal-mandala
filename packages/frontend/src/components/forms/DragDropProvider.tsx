import React, { createContext, useContext, useCallback, useState, useRef, useMemo } from 'react';

/**
 * ドラッグ可能アイテムの型定義
 */
export interface DraggableItem {
  id: string;
  position: number;
  type: 'subgoal' | 'action';
  parentId?: string; // アクションの場合はサブ目標ID
  data?: unknown; // 追加データ
}

/**
 * ドラッグ制約の型定義
 */
export interface DragConstraints {
  /** グループ間の移動を許可するか */
  allowCrossGroup: boolean;
  /** 最大アイテム数 */
  maxItems?: number;
  /** 最小アイテム数 */
  minItems?: number;
  /** 許可される移動先のタイプ */
  allowedDropTypes?: string[];
  /** カスタム制約チェック関数 */
  customConstraint?: (dragItem: DraggableItem, dropTarget: DraggableItem) => boolean;
}

/**
 * ドラッグ状態の型定義
 */
export interface DragState {
  isDragging: boolean;
  dragItem: DraggableItem | null;
  dragOverItem: DraggableItem | null;
  dragStartPosition: { x: number; y: number } | null;
  dragCurrentPosition: { x: number; y: number } | null;
}

/**
 * ドラッグ&ドロップコンテキストの型定義
 */
export interface DragDropContextValue {
  // 状態
  dragState: DragState;

  // アクション
  startDrag: (item: DraggableItem, event: React.DragEvent) => void;
  endDrag: () => void;
  dragOver: (item: DraggableItem, event: React.DragEvent) => void;
  drop: (targetItem: DraggableItem, event: React.DragEvent) => void;

  // 制約チェック
  canDrop: (dragItem: DraggableItem, dropTarget: DraggableItem) => boolean;

  // 視覚的フィードバック
  getDragStyles: (item: DraggableItem) => React.CSSProperties;
  getDropZoneStyles: (item: DraggableItem) => React.CSSProperties;
}

/**
 * DragDropProviderのプロパティ
 */
export interface DragDropProviderProps {
  items: DraggableItem[];
  onReorder: (newOrder: DraggableItem[]) => void;
  constraints?: DragConstraints;
  children: React.ReactNode;
  /** ドラッグ開始時のコールバック */
  onDragStart?: (item: DraggableItem) => void;
  /** ドラッグ終了時のコールバック */
  onDragEnd?: (item: DraggableItem) => void;
  /** ドロップ時のコールバック */
  onDrop?: (dragItem: DraggableItem, dropTarget: DraggableItem) => void;
  /** 無効なドロップ時のコールバック */
  onInvalidDrop?: (dragItem: DraggableItem, dropTarget: DraggableItem) => void;
}

// デフォルト制約
const DEFAULT_CONSTRAINTS: DragConstraints = {
  allowCrossGroup: false,
  maxItems: undefined,
  minItems: undefined,
  allowedDropTypes: undefined,
};

// デフォルト状態
const DEFAULT_DRAG_STATE: DragState = {
  isDragging: false,
  dragItem: null,
  dragOverItem: null,
  dragStartPosition: null,
  dragCurrentPosition: null,
};

// コンテキスト作成
const DragDropContext = createContext<DragDropContextValue | null>(null);

/**
 * ドラッグ&ドロッププロバイダーコンポーネント
 *
 * 要件4の受入基準に対応:
 * - ドラッグ時の視覚的フィードバック提供
 * - ドロップ時の新しい位置への項目移動
 * - 同一サブ目標内でのアクション移動制限
 * - 新しい順序のデータベース保存
 * - 無効な位置へのドロップ時の元位置復帰
 */
export const DragDropProvider: React.FC<DragDropProviderProps> = ({
  items,
  onReorder,
  constraints = DEFAULT_CONSTRAINTS,
  children,
  onDragStart,
  onDragEnd,
  onDrop,
  onInvalidDrop,
}) => {
  const [dragState, setDragState] = useState<DragState>(DEFAULT_DRAG_STATE);
  const dragImageRef = useRef<HTMLDivElement>(null);
  const mergedConstraints = useMemo(
    () => ({ ...DEFAULT_CONSTRAINTS, ...constraints }),
    [constraints]
  );

  // ドラッグ開始
  const startDrag = useCallback(
    (item: DraggableItem, event: React.DragEvent) => {
      const rect = event.currentTarget.getBoundingClientRect();
      const startPosition = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };

      setDragState({
        isDragging: true,
        dragItem: item,
        dragOverItem: null,
        dragStartPosition: startPosition,
        dragCurrentPosition: startPosition,
      });

      // カスタムドラッグイメージを設定
      if (dragImageRef.current) {
        event.dataTransfer.setDragImage(dragImageRef.current, startPosition.x, startPosition.y);
      }

      // データ転送設定
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('application/json', JSON.stringify(item));

      onDragStart?.(item);
    },
    [onDragStart]
  );

  // ドラッグ終了
  const endDrag = useCallback(() => {
    const currentDragItem = dragState.dragItem;

    setDragState(DEFAULT_DRAG_STATE);

    if (currentDragItem) {
      onDragEnd?.(currentDragItem);
    }
  }, [dragState.dragItem, onDragEnd]);

  // ドロップ可能性チェック
  const canDrop = useCallback(
    (dragItem: DraggableItem, dropTarget: DraggableItem): boolean => {
      // 自分自身にはドロップできない
      if (dragItem.id === dropTarget.id) {
        return false;
      }

      // タイプ制約チェック
      if (mergedConstraints.allowedDropTypes && mergedConstraints.allowedDropTypes.length > 0) {
        if (!mergedConstraints.allowedDropTypes.includes(dropTarget.type)) {
          return false;
        }
      }

      // カスタムバリデーション
      if (mergedConstraints.customConstraint) {
        return mergedConstraints.customConstraint(dragItem, dropTarget);
      }

      return true;
    },
    [mergedConstraints]
  );

  // ドラッグオーバー
  const dragOver = useCallback(
    (item: DraggableItem, event: React.DragEvent) => {
      event.preventDefault();

      const currentPosition = {
        x: event.clientX,
        y: event.clientY,
      };

      setDragState(prev => ({
        ...prev,
        dragOverItem: item,
        dragCurrentPosition: currentPosition,
      }));

      // ドロップ可能かチェック
      if (dragState.dragItem && canDrop(dragState.dragItem, item)) {
        event.dataTransfer.dropEffect = 'move';
      } else {
        event.dataTransfer.dropEffect = 'none';
      }
    },
    [dragState.dragItem, canDrop]
  );

  // ドロップ
  const drop = useCallback(
    (targetItem: DraggableItem, event: React.DragEvent) => {
      event.preventDefault();

      const dragItemData = event.dataTransfer.getData('application/json');
      if (!dragItemData) return;

      let dragItem: DraggableItem;
      try {
        dragItem = JSON.parse(dragItemData);
      } catch (error) {
        console.error('Invalid drag data:', error);
        endDrag();
        return;
      }

      // 制約チェック
      if (!canDrop(dragItem, targetItem)) {
        onInvalidDrop?.(dragItem, targetItem);
        endDrag();
        return;
      }

      // 並び替え実行
      const newOrder = reorderItems(items, dragItem, targetItem);
      onReorder(newOrder);
      onDrop?.(dragItem, targetItem);

      endDrag();
    },
    [items, onReorder, onDrop, onInvalidDrop, endDrag, canDrop]
  );

  // ドラッグスタイル取得
  const getDragStyles = useCallback(
    (item: DraggableItem): React.CSSProperties => {
      if (!dragState.isDragging || dragState.dragItem?.id !== item.id) {
        return {};
      }

      return {
        opacity: 0.5,
        transform: 'rotate(5deg)',
        zIndex: 1000,
        cursor: 'grabbing',
      };
    },
    [dragState]
  );

  // ドロップゾーンスタイル取得
  const getDropZoneStyles = useCallback(
    (item: DraggableItem): React.CSSProperties => {
      if (!dragState.isDragging || !dragState.dragItem) {
        return {};
      }

      const isValidDropTarget = canDrop(dragState.dragItem, item);
      const isDragOver = dragState.dragOverItem?.id === item.id;

      if (isDragOver) {
        return {
          backgroundColor: isValidDropTarget ? 'rgba(59, 130, 246, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          borderColor: isValidDropTarget ? '#3b82f6' : '#ef4444',
          borderWidth: '2px',
          borderStyle: 'dashed',
        };
      }

      if (isValidDropTarget) {
        return {
          backgroundColor: 'rgba(59, 130, 246, 0.05)',
          borderColor: '#3b82f6',
          borderWidth: '1px',
          borderStyle: 'dashed',
        };
      }

      return {
        opacity: 0.6,
      };
    },
    [dragState, canDrop]
  );

  // アイテム並び替えロジック
  const reorderItems = (
    currentItems: DraggableItem[],
    dragItem: DraggableItem,
    dropTarget: DraggableItem
  ): DraggableItem[] => {
    const newItems = [...currentItems];

    // ドラッグアイテムを削除
    const dragIndex = newItems.findIndex(item => item.id === dragItem.id);
    if (dragIndex === -1) return currentItems;

    const [removed] = newItems.splice(dragIndex, 1);

    // ドロップターゲットの位置を取得
    const dropIndex = newItems.findIndex(item => item.id === dropTarget.id);
    if (dropIndex === -1) return currentItems;

    // 新しい位置に挿入
    newItems.splice(dropIndex, 0, {
      ...removed,
      position: dropTarget.position,
    });

    // 位置を再計算
    return newItems.map((item, index) => ({
      ...item,
      position: index,
    }));
  };

  const contextValue: DragDropContextValue = {
    dragState,
    startDrag,
    endDrag,
    dragOver,
    drop,
    canDrop,
    getDragStyles,
    getDropZoneStyles,
  };

  return (
    <DragDropContext.Provider value={contextValue}>
      {children}

      {/* カスタムドラッグイメージ */}
      <div
        ref={dragImageRef}
        className="fixed -top-96 -left-96 pointer-events-none z-50 opacity-80"
        style={{
          width: '200px',
          height: '60px',
          backgroundColor: '#3b82f6',
          color: 'white',
          padding: '12px',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '14px',
          fontWeight: '500',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
        }}
      >
        {dragState.dragItem ? `移動中: ${dragState.dragItem.id}` : ''}
      </div>
    </DragDropContext.Provider>
  );
};

/**
 * ドラッグ&ドロップコンテキストを使用するフック
 */
export const useDragDrop = (): DragDropContextValue => {
  const context = useContext(DragDropContext);
  if (!context) {
    throw new Error('useDragDrop must be used within a DragDropProvider');
  }
  return context;
};

/**
 * ドラッグ可能要素のプロパティ
 */
export interface DraggableProps {
  item: DraggableItem;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  /** ドラッグハンドルのセレクター */
  dragHandle?: string;
}

/**
 * ドラッグ可能要素コンポーネント
 */
export const Draggable: React.FC<DraggableProps> = ({
  item,
  children,
  className = '',
  disabled = false,
  dragHandle,
}) => {
  const { startDrag, endDrag, getDragStyles } = useDragDrop();
  const elementRef = useRef<HTMLDivElement>(null);

  const handleDragStart = useCallback(
    (event: React.DragEvent) => {
      if (disabled) {
        event.preventDefault();
        return;
      }

      // ドラッグハンドルが指定されている場合のチェック
      if (dragHandle) {
        const target = event.target as HTMLElement;
        const handle = elementRef.current?.querySelector(dragHandle);
        if (!handle?.contains(target)) {
          event.preventDefault();
          return;
        }
      }

      startDrag(item, event);
    },
    [item, disabled, dragHandle, startDrag]
  );

  const handleDragEnd = useCallback(() => {
    if (!disabled) {
      endDrag();
    }
  }, [disabled, endDrag]);

  const dragStyles = getDragStyles(item);

  return (
    <div
      ref={elementRef}
      draggable={!disabled}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={`${className} ${disabled ? 'cursor-not-allowed' : 'cursor-grab'}`}
      style={dragStyles}
    >
      {children}
    </div>
  );
};

/**
 * ドロップゾーンのプロパティ
 */
export interface DroppableProps {
  item: DraggableItem;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

/**
 * ドロップゾーンコンポーネント
 */
export const Droppable: React.FC<DroppableProps> = ({
  item,
  children,
  className = '',
  disabled = false,
}) => {
  const { dragOver, drop, getDropZoneStyles } = useDragDrop();

  const handleDragOver = useCallback(
    (event: React.DragEvent) => {
      if (!disabled) {
        dragOver(item, event);
      }
    },
    [item, disabled, dragOver]
  );

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      if (!disabled) {
        drop(item, event);
      }
    },
    [item, disabled, drop]
  );

  const dropZoneStyles = getDropZoneStyles(item);

  return (
    <div
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={className}
      style={dropZoneStyles}
    >
      {children}
    </div>
  );
};

/**
 * ドラッグ&ドロップ統合コンポーネント
 */
export interface DragDropItemProps extends DraggableProps, DroppableProps {
  // DraggablePropsとDroppablePropsの統合
}

export const DragDropItem: React.FC<DragDropItemProps> = ({
  item,
  children,
  className = '',
  disabled = false,
  dragHandle,
}) => {
  return (
    <Draggable item={item} className={className} disabled={disabled} dragHandle={dragHandle}>
      <Droppable item={item} disabled={disabled}>
        {children}
      </Droppable>
    </Draggable>
  );
};
