import React, { useState } from 'react';
import { CellData } from '../../types';
import { sanitizeText } from '../../utils/security';
import { InlineEditor } from './InlineEditor';

interface MandalaCellProps {
  cellData: CellData;
  position: Position;
  editable: boolean;
  onClick: (cellData: CellData) => void;
  onEdit: (cellData: CellData) => void;
  onDragStart?: (position: Position) => void;
  onDragEnd?: (position: Position) => void;
  // InlineEditor統合用
  isInlineEditing?: boolean;
  onStartInlineEdit?: (cellData: CellData) => void;
  onSaveInlineEdit?: (value: string) => Promise<void>;
  onCancelInlineEdit?: () => void;
  onEndInlineEdit?: () => void;
  // 編集ボタン表示用
  showEditButton?: boolean;
  // 権限制御用
  canEdit?: boolean;
  readOnly?: boolean;
}

const getCellAriaLabel = (cellData: CellData): string => {
  const { type, title, progress } = cellData;

  switch (type) {
    case 'goal':
      return `目標: ${title}, 進捗: ${progress}%`;
    case 'subgoal':
      return `サブ目標: ${title}, 進捗: ${progress}%`;
    case 'action':
      return `アクション: ${title}, 進捗: ${progress}%`;
    default:
      return '空のセル';
  }
};

const getProgressClass = (progress: number): string => {
  if (progress === 0) return 'progress-0';
  if (progress <= 33) return 'progress-1-33';
  if (progress <= 66) return 'progress-34-66';
  if (progress <= 99) return 'progress-67-99';
  return 'progress-100';
};

const MandalaCell: React.FC<MandalaCellProps> = ({
  cellData,
  position,
  editable,
  onClick,
  onEdit,
  onDragStart,
  onDragEnd,
  isInlineEditing = false,
  onStartInlineEdit,
  onSaveInlineEdit,
  onCancelInlineEdit,
  onEndInlineEdit,
  showEditButton = false,
  canEdit = true,
  readOnly = false,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const isEmpty = cellData.type === 'empty';
  const isEditable = editable && canEdit && !readOnly && !isEmpty;

  const handleClick = () => {
    // インライン編集中はクリックイベントを無視
    if (isInlineEditing) {
      return;
    }

    // 編集可能な場合、クリックでインライン編集を開始
    if (isEditable && onStartInlineEdit) {
      onStartInlineEdit(cellData);
    } else {
      onClick(cellData);
    }
  };

  const handleDoubleClick = () => {
    // インライン編集中はダブルクリックイベントを無視
    if (isInlineEditing) {
      return;
    }

    // 編集可能な場合、ダブルクリックでインライン編集を開始
    if (isEditable && onStartInlineEdit) {
      onStartInlineEdit(cellData);
    } else if (editable) {
      onEdit(cellData);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick(cellData);
    }
  };

  const handleEditButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit(cellData);
  };

  const handleInlineSave = async (value: string) => {
    if (onSaveInlineEdit) {
      await onSaveInlineEdit(value);
    }
    if (onEndInlineEdit) {
      onEndInlineEdit();
    }
  };

  const handleInlineCancel = () => {
    if (onCancelInlineEdit) {
      onCancelInlineEdit();
    }
    if (onEndInlineEdit) {
      onEndInlineEdit();
    }
  };

  const progressClass = getProgressClass(cellData.progress);

  return (
    <div
      className={`mandala-cell ${progressClass} ${isEmpty ? 'empty' : ''} ${isInlineEditing ? 'editing' : ''}`}
      role="gridcell"
      tabIndex={0}
      aria-label={getCellAriaLabel(cellData)}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      draggable={isEditable && !isEmpty && !isInlineEditing}
      onDragStart={() => onDragStart?.(position)}
      onDragEnd={() => onDragEnd?.(position)}
    >
      {!isEmpty && !isInlineEditing && (
        <>
          <div className="cell-title" title={sanitizeText(cellData.title)}>
            {sanitizeText(cellData.title)}
          </div>
          <div className="cell-progress">{cellData.progress}%</div>
          {cellData.type === 'action' && cellData.status && (
            <div className="cell-status">{cellData.status === 'execution' ? '実行' : '習慣'}</div>
          )}
          {isEditable && showEditButton && isHovered && (
            <button
              className="cell-edit-button"
              onClick={handleEditButtonClick}
              aria-label="編集"
              type="button"
            >
              編集
            </button>
          )}
        </>
      )}
      {!isEmpty && isInlineEditing && onSaveInlineEdit && (
        <InlineEditor
          value={cellData.title}
          maxLength={100}
          onSave={handleInlineSave}
          onCancel={handleInlineCancel}
          placeholder="タイトルを入力"
        />
      )}
      {isEmpty && <div className="cell-placeholder">+</div>}
    </div>
  );
};

export { MandalaCell };
export default MandalaCell;
