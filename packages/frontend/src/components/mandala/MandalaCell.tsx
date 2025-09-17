import React from 'react';
import { CellData, Position } from '../../types';
import { sanitizeText } from '../../utils/security';

interface MandalaCellProps {
  cellData: CellData;
  position: Position;
  editable: boolean;
  onClick: (cellData: CellData) => void;
  onEdit: (cellData: CellData) => void;
  onDragStart?: (position: Position) => void;
  onDragEnd?: (position: Position) => void;
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
}) => {
  const handleClick = () => {
    onClick(cellData);
  };

  const handleDoubleClick = () => {
    if (editable) {
      onEdit(cellData);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick(cellData);
    }
  };

  const progressClass = getProgressClass(cellData.progress);
  const isEmpty = cellData.type === 'empty';

  return (
    <div
      className={`mandala-cell ${progressClass} ${isEmpty ? 'empty' : ''}`}
      role="gridcell"
      tabIndex={0}
      aria-label={getCellAriaLabel(cellData)}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onKeyDown={handleKeyDown}
      draggable={editable && !isEmpty}
      onDragStart={() => onDragStart?.(position)}
      onDragEnd={() => onDragEnd?.(position)}
    >
      {!isEmpty && (
        <>
          <div className="cell-title" title={sanitizeText(cellData.title)}>
            {sanitizeText(cellData.title)}
          </div>
          <div className="cell-progress">{cellData.progress}%</div>
          {cellData.type === 'action' && cellData.status && (
            <div className="cell-status">{cellData.status === 'execution' ? '実行' : '習慣'}</div>
          )}
        </>
      )}
      {isEmpty && <div className="cell-placeholder">+</div>}
    </div>
  );
};

export default MandalaCell;
