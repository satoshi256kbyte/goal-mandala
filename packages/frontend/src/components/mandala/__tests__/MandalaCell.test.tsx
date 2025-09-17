import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import MandalaCell from '../MandalaCell';
import { CellData } from '../../../types';

describe('MandalaCell', () => {
  const mockCellData: CellData = {
    id: 'test-1',
    type: 'goal',
    title: 'テスト目標',
    description: 'テスト説明',
    progress: 50,
    position: { row: 4, col: 4 },
  };

  const defaultProps = {
    cellData: mockCellData,
    position: { row: 4, col: 4 },
    editable: false,
    onClick: vi.fn(),
    onEdit: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('正常にレンダリングされる', () => {
    render(<MandalaCell {...defaultProps} />);
    expect(screen.getByRole('gridcell')).toBeInTheDocument();
    expect(screen.getByText('テスト目標')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('適切なARIAラベルが設定される', () => {
    render(<MandalaCell {...defaultProps} />);
    expect(screen.getByRole('gridcell')).toHaveAttribute(
      'aria-label',
      '目標: テスト目標, 進捗: 50%'
    );
  });

  it('クリック時にコールバックが呼ばれる', () => {
    const onClick = vi.fn();
    render(<MandalaCell {...defaultProps} onClick={onClick} />);

    fireEvent.click(screen.getByRole('gridcell'));
    expect(onClick).toHaveBeenCalledWith(mockCellData);
  });

  it('ダブルクリック時に編集コールバックが呼ばれる（編集可能時）', () => {
    const onEdit = vi.fn();
    render(<MandalaCell {...defaultProps} editable={true} onEdit={onEdit} />);

    fireEvent.doubleClick(screen.getByRole('gridcell'));
    expect(onEdit).toHaveBeenCalledWith(mockCellData);
  });

  it('キーボード操作でクリックイベントが発火する', () => {
    const onClick = vi.fn();
    render(<MandalaCell {...defaultProps} onClick={onClick} />);

    const cell = screen.getByRole('gridcell');
    fireEvent.keyDown(cell, { key: 'Enter' });
    expect(onClick).toHaveBeenCalledWith(mockCellData);

    fireEvent.keyDown(cell, { key: ' ' });
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it('空のセルが正しく表示される', () => {
    const emptyCellData: CellData = {
      id: '',
      type: 'empty',
      title: '',
      progress: 0,
      position: { row: 0, col: 0 },
    };

    render(<MandalaCell {...defaultProps} cellData={emptyCellData} />);
    expect(screen.getByText('+')).toBeInTheDocument();
    expect(screen.getByRole('gridcell')).toHaveClass('empty');
  });

  it('アクションセルで種別が表示される', () => {
    const actionCellData: CellData = {
      id: 'action-1',
      type: 'action',
      title: 'テストアクション',
      progress: 75,
      status: 'execution',
      position: { row: 0, col: 0 },
    };

    render(<MandalaCell {...defaultProps} cellData={actionCellData} />);
    expect(screen.getByText('実行')).toBeInTheDocument();
  });

  it('進捗に応じた適切なCSSクラスが適用される', () => {
    const testCases = [
      { progress: 0, expectedClass: 'progress-0' },
      { progress: 25, expectedClass: 'progress-1-33' },
      { progress: 50, expectedClass: 'progress-34-66' },
      { progress: 80, expectedClass: 'progress-67-99' },
      { progress: 100, expectedClass: 'progress-100' },
    ];

    testCases.forEach(({ progress, expectedClass }) => {
      const cellData = { ...mockCellData, progress };
      const { rerender } = render(<MandalaCell {...defaultProps} cellData={cellData} />);

      expect(screen.getByRole('gridcell')).toHaveClass(expectedClass);

      rerender(<div />); // Clean up for next iteration
    });
  });
});
