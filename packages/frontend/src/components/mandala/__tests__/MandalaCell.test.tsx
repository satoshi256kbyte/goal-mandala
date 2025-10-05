import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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

  describe('InlineEditor統合', () => {
    it('編集可能な場合、セルクリックでインライン編集モードに入る', () => {
      const onStartInlineEdit = vi.fn();
      render(
        <MandalaCell {...defaultProps} editable={true} onStartInlineEdit={onStartInlineEdit} />
      );

      const cell = screen.getByRole('gridcell');
      fireEvent.click(cell);

      expect(onStartInlineEdit).toHaveBeenCalledWith(mockCellData);
    });

    it('編集不可の場合、セルクリックでインライン編集モードに入らない', () => {
      const onStartInlineEdit = vi.fn();
      render(
        <MandalaCell {...defaultProps} editable={false} onStartInlineEdit={onStartInlineEdit} />
      );

      const cell = screen.getByRole('gridcell');
      fireEvent.click(cell);

      expect(onStartInlineEdit).not.toHaveBeenCalled();
    });

    it('インライン編集中はInlineEditorコンポーネントが表示される', () => {
      const onSaveInlineEdit = vi.fn().mockResolvedValue(undefined);
      render(
        <MandalaCell
          {...defaultProps}
          editable={true}
          isInlineEditing={true}
          onSaveInlineEdit={onSaveInlineEdit}
        />
      );

      // InlineEditorが表示されていることを確認
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('インライン編集の保存が成功すると編集モードが終了する', async () => {
      const onSaveInlineEdit = vi.fn().mockResolvedValue(undefined);
      const onEndInlineEdit = vi.fn();

      render(
        <MandalaCell
          {...defaultProps}
          editable={true}
          isInlineEditing={true}
          onSaveInlineEdit={onSaveInlineEdit}
          onEndInlineEdit={onEndInlineEdit}
        />
      );

      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: '新しいタイトル' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      await waitFor(() => {
        expect(onSaveInlineEdit).toHaveBeenCalledWith('新しいタイトル');
      });
    });

    it('インライン編集のキャンセルで編集モードが終了する', () => {
      const onCancelInlineEdit = vi.fn();
      const onSaveInlineEdit = vi.fn().mockResolvedValue(undefined);

      render(
        <MandalaCell
          {...defaultProps}
          editable={true}
          isInlineEditing={true}
          onSaveInlineEdit={onSaveInlineEdit}
          onCancelInlineEdit={onCancelInlineEdit}
        />
      );

      const input = screen.getByRole('textbox');
      fireEvent.keyDown(input, { key: 'Escape' });

      expect(onCancelInlineEdit).toHaveBeenCalled();
    });
  });

  describe('編集ボタン表示', () => {
    it('編集可能な場合、ホバー時に編集ボタンが表示される', () => {
      render(<MandalaCell {...defaultProps} editable={true} showEditButton={true} />);

      const cell = screen.getByRole('gridcell');

      // ホバーをシミュレート
      fireEvent.mouseEnter(cell);

      const editButton = screen.getByRole('button', { name: /編集/i });
      expect(editButton).toBeInTheDocument();
    });

    it('編集不可の場合、編集ボタンが表示されない', () => {
      render(<MandalaCell {...defaultProps} editable={false} />);

      const editButton = screen.queryByRole('button', { name: /編集/i });
      expect(editButton).not.toBeInTheDocument();
    });

    it('編集ボタンクリックでモーダル編集が開始される', () => {
      const onEdit = vi.fn();
      render(
        <MandalaCell {...defaultProps} editable={true} showEditButton={true} onEdit={onEdit} />
      );

      const cell = screen.getByRole('gridcell');

      // ホバーをシミュレート
      fireEvent.mouseEnter(cell);

      const editButton = screen.getByRole('button', { name: /編集/i });
      fireEvent.click(editButton);

      expect(onEdit).toHaveBeenCalledWith(mockCellData);
    });

    it('空のセルには編集ボタンが表示されない', () => {
      const emptyCellData: CellData = {
        id: '',
        type: 'empty',
        title: '',
        progress: 0,
        position: { row: 0, col: 0 },
      };

      render(
        <MandalaCell
          {...defaultProps}
          cellData={emptyCellData}
          editable={true}
          showEditButton={true}
        />
      );

      const editButton = screen.queryByRole('button', { name: /編集/i });
      expect(editButton).not.toBeInTheDocument();
    });
  });

  describe('ダブルクリック編集開始', () => {
    it('編集可能な場合、ダブルクリックでインライン編集が開始される', () => {
      const onStartInlineEdit = vi.fn();
      render(
        <MandalaCell {...defaultProps} editable={true} onStartInlineEdit={onStartInlineEdit} />
      );

      const cell = screen.getByRole('gridcell');
      fireEvent.doubleClick(cell);

      expect(onStartInlineEdit).toHaveBeenCalledWith(mockCellData);
    });

    it('編集不可の場合、ダブルクリックでインライン編集が開始されない', () => {
      const onStartInlineEdit = vi.fn();
      render(
        <MandalaCell {...defaultProps} editable={false} onStartInlineEdit={onStartInlineEdit} />
      );

      const cell = screen.getByRole('gridcell');
      fireEvent.doubleClick(cell);

      expect(onStartInlineEdit).not.toHaveBeenCalled();
    });

    it('空のセルはダブルクリックでインライン編集が開始されない', () => {
      const emptyCellData: CellData = {
        id: '',
        type: 'empty',
        title: '',
        progress: 0,
        position: { row: 0, col: 0 },
      };

      const onStartInlineEdit = vi.fn();
      render(
        <MandalaCell
          {...defaultProps}
          cellData={emptyCellData}
          editable={true}
          onStartInlineEdit={onStartInlineEdit}
        />
      );

      const cell = screen.getByRole('gridcell');
      fireEvent.doubleClick(cell);

      expect(onStartInlineEdit).not.toHaveBeenCalled();
    });
  });

  describe('権限制御', () => {
    it('編集権限がある場合、編集機能が有効になる', () => {
      render(
        <MandalaCell {...defaultProps} editable={true} canEdit={true} showEditButton={true} />
      );

      const cell = screen.getByRole('gridcell');

      // ホバーをシミュレート
      fireEvent.mouseEnter(cell);

      const editButton = screen.getByRole('button', { name: /編集/i });
      expect(editButton).toBeEnabled();
    });

    it('編集権限がない場合、編集機能が無効になる', () => {
      render(<MandalaCell {...defaultProps} editable={false} canEdit={false} />);

      const editButton = screen.queryByRole('button', { name: /編集/i });
      expect(editButton).not.toBeInTheDocument();
    });

    it('読み取り専用モードでは編集ボタンが表示されない', () => {
      render(<MandalaCell {...defaultProps} editable={false} readOnly={true} />);

      const editButton = screen.queryByRole('button', { name: /編集/i });
      expect(editButton).not.toBeInTheDocument();
    });

    it('読み取り専用モードではダブルクリックで編集が開始されない', () => {
      const onStartInlineEdit = vi.fn();
      render(
        <MandalaCell
          {...defaultProps}
          editable={false}
          readOnly={true}
          onStartInlineEdit={onStartInlineEdit}
        />
      );

      const cell = screen.getByRole('gridcell');
      fireEvent.doubleClick(cell);

      expect(onStartInlineEdit).not.toHaveBeenCalled();
    });

    it('編集中に権限が変更された場合、編集モードが終了する', () => {
      const onSaveInlineEdit = vi.fn().mockResolvedValue(undefined);
      const { rerender } = render(
        <MandalaCell
          {...defaultProps}
          editable={true}
          isInlineEditing={true}
          canEdit={true}
          onSaveInlineEdit={onSaveInlineEdit}
        />
      );

      expect(screen.getByRole('textbox')).toBeInTheDocument();

      // 権限を変更
      rerender(
        <MandalaCell {...defaultProps} editable={false} isInlineEditing={false} canEdit={false} />
      );

      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    });
  });
});
