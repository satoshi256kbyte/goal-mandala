import React, { useCallback } from 'react';
import { GridData, CellData } from '../../types';
import MandalaCell from './MandalaCell';

interface MandalaGridProps {
  gridData: GridData;
  editable: boolean;
  onCellClick: (cellData: CellData) => void;
  onCellEdit: (cellData: CellData) => void;
  onCellDrag?: (from: Position, to: Position) => void;
}

const MandalaGrid: React.FC<MandalaGridProps> = ({
  gridData,
  editable,
  onCellClick,
  onCellEdit,
  onCellDrag,
}) => {
  const [dragFrom, setDragFrom] = React.useState<Position | null>(null);

  const handleDragStart = useCallback((position: Position) => {
    setDragFrom(position);
  }, []);

  const handleDragEnd = useCallback(
    (position: Position) => {
      if (dragFrom && onCellDrag) {
        onCellDrag(dragFrom, position);
      }
      setDragFrom(null);
    },
    [dragFrom, onCellDrag]
  );

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  const handleDrop = (event: React.DragEvent, position: Position) => {
    event.preventDefault();
    if (dragFrom && onCellDrag) {
      onCellDrag(dragFrom, position);
    }
    setDragFrom(null);
  };

  return (
    <div className="mandala-grid" role="grid" aria-label="マンダラチャート">
      {gridData.cells.map((row, rowIndex) => (
        <div key={rowIndex} className="mandala-row" role="row">
          {row.map((cellData, colIndex) => (
            <div
              key={`${rowIndex}-${colIndex}`}
              onDragOver={handleDragOver}
              onDrop={e => handleDrop(e, { row: rowIndex, col: colIndex })}
            >
              <MandalaCell
                cellData={cellData}
                position={{ row: rowIndex, col: colIndex }}
                editable={editable}
                onClick={onCellClick}
                onEdit={onCellEdit}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export default MandalaGrid;
