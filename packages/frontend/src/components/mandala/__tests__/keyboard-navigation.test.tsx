import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { InlineEditor } from '../InlineEditor';
import { EditModal } from '../EditModal';
import MandalaCell from '../MandalaCell';
import { CellData, Goal, GoalStatus } from '../../../types';

describe('キーボード操作テスト', () => {
  describe('InlineEditor', () => {
    it('Enterキーで保存される', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      const onCancel = vi.fn();

      render(<InlineEditor value="テスト" maxLength={100} onSave={onSave} onCancel={onCancel} />);

      const input = screen.getByRole('textbox', { name: '編集中' });
      await userEvent.clear(input);
      await userEvent.type(input, '新しいテキスト');
      await userEvent.keyboard('{Enter}');

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith('新しいテキスト');
      });
    });

    it('Escキーでキャンセルされる', async () => {
      const onSave = vi.fn();
      const onCancel = vi.fn();

      render(<InlineEditor value="テスト" maxLength={100} onSave={onSave} onCancel={onCancel} />);

      const input = screen.getByRole('textbox', { name: '編集中' });
      await userEvent.type(input, '新しいテキスト');
      await userEvent.keyboard('{Escape}');

      expect(onCancel).toHaveBeenCalled();
      expect(onSave).not.toHaveBeenCalled();
    });

    it('multilineモードでCtrl+Enterで保存される', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      const onCancel = vi.fn();

      render(
        <InlineEditor
          value="テスト"
          maxLength={500}
          onSave={onSave}
          onCancel={onCancel}
          multiline={true}
        />
      );

      const textarea = screen.getByRole('textbox', { name: '編集中' });
      await userEvent.clear(textarea);
      await userEvent.type(textarea, '新しいテキスト');
      await userEvent.keyboard('{Control>}{Enter}{/Control}');

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith('新しいテキスト');
      });
    });
  });

  describe('EditModal', () => {
    const mockGoal = {
      id: 'goal-1',

      title: 'テスト目標',
      description: 'テスト説明',
      deadline: new Date('2025-12-31'),
      background: 'テスト背景',
      constraints: 'テスト制約',
      status: GoalStatus.ACTIVE,
      progress: 0,
    };

    it('Escキーでモーダルが閉じる', async () => {
      const onSave = vi.fn();
      const onClose = vi.fn();

      render(
        <EditModal
          isOpen={true}
          entityType="goal"
          entityId="goal-1"
          initialData={mockGoal}
          onSave={onSave}
          onClose={onClose}
        />
      );

      await userEvent.keyboard('{Escape}');

      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
      });
    });

    it.skip('Tabキーでフォーカスが移動する', async () => {
      const onSave = vi.fn();
      const onClose = vi.fn();

      render(
        <EditModal
          isOpen={true}
          entityType="goal"
          entityId="goal-1"
          initialData={mockGoal}
          onSave={onSave}
          onClose={onClose}
        />
      );

      const titleInput = screen.getByLabelText(/タイトル/);

      titleInput.focus();
      expect(document.activeElement).toBe(titleInput);

      await userEvent.tab();

      // 次のフォーカス可能要素に移動することを確認
      expect(document.activeElement).not.toBe(titleInput);
    });

    it('Shift+Tabキーで逆方向にフォーカスが移動する', async () => {
      const onSave = vi.fn();
      const onClose = vi.fn();

      render(
        <EditModal
          isOpen={true}
          entityType="goal"
          entityId="goal-1"
          initialData={mockGoal}
          onSave={onSave}
          onClose={onClose}
        />
      );

      const titleInput = screen.getByLabelText(/タイトル/);
      const descriptionInput = screen.getByLabelText(/説明/);

      descriptionInput.focus();
      expect(document.activeElement).toBe(descriptionInput);

      await userEvent.tab({ shift: true });
      expect(document.activeElement).toBe(titleInput);
    });

    it('モーダル内でフォーカスが管理される', async () => {
      const onSave = vi.fn();
      const onClose = vi.fn();

      render(
        <EditModal
          isOpen={true}
          entityType="goal"
          entityId="goal-1"
          initialData={mockGoal}
          onSave={onSave}
          onClose={onClose}
        />
      );

      // モーダルが開いたときに最初の入力フィールドにフォーカスが当たる
      await waitFor(() => {
        const titleInput = screen.getByLabelText(/タイトル/);
        expect(document.activeElement).toBe(titleInput);
      });
    });
  });

  describe('MandalaCell', () => {
    const mockCellData: CellData = {
      id: 'cell-1',
      type: 'action',
      position: { row: 0, col: 0 },
      title: 'テストアクション',
      description: 'テスト説明',
      progress: 50,
      status: 'execution',
    };

    it('Enterキーでセルがクリックされる', () => {
      const onClick = vi.fn();
      const onEdit = vi.fn();

      render(
        <MandalaCell
          cellData={mockCellData}
          position={{ row: 0, col: 0 }}
          editable={true}
          onClick={onClick}
          onEdit={onEdit}
        />
      );

      const cell = screen.getByRole('gridcell');
      fireEvent.keyDown(cell, { key: 'Enter' });

      expect(onClick).toHaveBeenCalledWith(mockCellData);
    });

    it('Spaceキーでセルがクリックされる', () => {
      const onClick = vi.fn();
      const onEdit = vi.fn();

      render(
        <MandalaCell
          cellData={mockCellData}
          position={{ row: 0, col: 0 }}
          editable={true}
          onClick={onClick}
          onEdit={onEdit}
        />
      );

      const cell = screen.getByRole('gridcell');
      fireEvent.keyDown(cell, { key: ' ' });

      expect(onClick).toHaveBeenCalledWith(mockCellData);
    });

    it.skip('Tabキーでフォーカスが移動する', () => {
      const onClick = vi.fn();
      const onEdit = vi.fn();

      const { container } = render(
        <>
          <MandalaCell
            cellData={mockCellData}
            position={{ row: 0, col: 0 }}
            editable={true}
            onClick={onClick}
            onEdit={onEdit}
          />
          <MandalaCell
            cellData={{ ...mockCellData, id: 'cell-2' }}
            position={{ row: 0, col: 1 }}
            editable={true}
            onClick={onClick}
            onEdit={onEdit}
          />
        </>
      );

      const cells = container.querySelectorAll('[role="gridcell"]');
      const firstCell = cells[0] as HTMLElement;
      const secondCell = cells[1] as HTMLElement;

      firstCell.focus();
      expect(document.activeElement).toBe(firstCell);

      // Tabキーを押下
      fireEvent.keyDown(firstCell, { key: 'Tab' });

      // 次のセルにフォーカスが移動（ブラウザのデフォルト動作）
      secondCell.focus();
      expect(document.activeElement).toBe(secondCell);
    });
  });

  describe('統合テスト', () => {
    it('複数のコンポーネント間でTabキーによるフォーカス移動が機能する', async () => {
      const mockCellData: CellData = {
        id: 'cell-1',
        type: 'action',
        position: { row: 0, col: 0 },
        title: 'テストアクション',
        description: 'テスト説明',
        progress: 50,
        status: 'execution',
      };

      const onClick = vi.fn();
      const onEdit = vi.fn();

      render(
        <div>
          <MandalaCell
            cellData={mockCellData}
            position={{ row: 0, col: 0 }}
            editable={true}
            onClick={onClick}
            onEdit={onEdit}
          />
          <button>テストボタン</button>
        </div>
      );

      const cell = screen.getByRole('gridcell');
      const button = screen.getByRole('button', { name: 'テストボタン' });

      cell.focus();
      expect(document.activeElement).toBe(cell);

      await userEvent.tab();
      expect(document.activeElement).toBe(button);

      await userEvent.tab({ shift: true });
      expect(document.activeElement).toBe(cell);
    });
  });
});
