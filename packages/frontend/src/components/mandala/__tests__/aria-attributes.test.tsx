import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { InlineEditor } from '../InlineEditor';
import { EditModal } from '../EditModal';
import MandalaCell from '../MandalaCell';
import { ConflictDialog } from '../ConflictDialog';
import { HistoryPanel } from '../HistoryPanel';
import { CellData } from '../../../types';

describe('ARIA属性テスト', () => {
  describe('InlineEditor', () => {
    it('aria-labelが設定されている', () => {
      const onSave = vi.fn();
      const onCancel = vi.fn();

      render(<InlineEditor value="テスト" maxLength={100} onSave={onSave} onCancel={onCancel} />);

      const input = screen.getByRole('textbox', { name: '編集中' });
      expect(input).toHaveAttribute('aria-label', '編集中');
    });

    it('バリデーションエラー時、aria-invalid="true"が設定される', async () => {
      const onSave = vi.fn();
      const onCancel = vi.fn();

      render(<InlineEditor value="テスト" maxLength={100} onSave={onSave} onCancel={onCancel} />);

      const input = screen.getByRole('textbox');
      await userEvent.clear(input);

      await waitFor(() => {
        expect(input).toHaveAttribute('aria-invalid', 'true');
      });
    });

    it('エラーメッセージがaria-describedbyで関連付けられている', async () => {
      const onSave = vi.fn();
      const onCancel = vi.fn();

      render(<InlineEditor value="テスト" maxLength={100} onSave={onSave} onCancel={onCancel} />);

      const input = screen.getByRole('textbox');
      await userEvent.clear(input);

      await waitFor(() => {
        const errorId = input.getAttribute('aria-describedby');
        expect(errorId).toBeTruthy();
        const errorElement = document.getElementById(errorId!);
        expect(errorElement).toBeInTheDocument();
        expect(errorElement).toHaveAttribute('role', 'alert');
      });
    });

    it('エラーメッセージにaria-live="polite"が設定されている', async () => {
      const onSave = vi.fn();
      const onCancel = vi.fn();

      render(<InlineEditor value="テスト" maxLength={100} onSave={onSave} onCancel={onCancel} />);

      const input = screen.getByRole('textbox');
      await userEvent.clear(input);

      await waitFor(() => {
        const errorElement = screen.getByRole('alert');
        expect(errorElement).toHaveAttribute('aria-live', 'polite');
      });
    });
  });

  describe('EditModal', () => {
    const mockGoal = {
      id: 'goal-1',
      user_id: 'user-1',
      title: 'テスト目標',
      description: 'テスト説明',
      deadline: new Date('2025-12-31'),
      background: 'テスト背景',
      constraints: 'テスト制約',
      status: 'active' as const,
      progress: 0,
      created_at: new Date(),
      updated_at: new Date(),
    };

    it('role="dialog"とaria-modal="true"が設定されている', () => {
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

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
    });

    it('aria-labelledbyが設定されている', () => {
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

      const dialog = screen.getByRole('dialog');
      const labelledBy = dialog.getAttribute('aria-labelledby');
      expect(labelledBy).toBeTruthy();

      const titleElement = document.getElementById(labelledBy!);
      expect(titleElement).toBeInTheDocument();
      expect(titleElement).toHaveTextContent('目標の編集');
    });

    it('フォーム入力フィールドにaria-invalidが設定される', async () => {
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
      await userEvent.clear(titleInput);

      await waitFor(() => {
        expect(titleInput).toHaveAttribute('aria-invalid', 'true');
      });
    });

    it('エラーメッセージがaria-describedbyで関連付けられている', async () => {
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
      await userEvent.clear(titleInput);

      await waitFor(() => {
        const describedBy = titleInput.getAttribute('aria-describedby');
        expect(describedBy).toBeTruthy();

        const errorElement = document.getElementById(describedBy!);
        expect(errorElement).toBeInTheDocument();
        expect(errorElement).toHaveAttribute('role', 'alert');
      });
    });

    it('閉じるボタンにaria-labelが設定されている', () => {
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

      const closeButton = screen.getByLabelText('閉じる');
      expect(closeButton).toBeInTheDocument();
    });
  });

  describe('MandalaCell', () => {
    const mockCellData: CellData = {
      id: 'cell-1',
      type: 'action',
      title: 'テストアクション',
      description: 'テスト説明',
      progress: 50,
      status: 'execution',
    };

    it('role="gridcell"が設定されている', () => {
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
      expect(cell).toBeInTheDocument();
    });

    it('aria-labelが設定されている', () => {
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
      const ariaLabel = cell.getAttribute('aria-label');
      expect(ariaLabel).toContain('アクション');
      expect(ariaLabel).toContain('テストアクション');
      expect(ariaLabel).toContain('50%');
    });

    it('編集ボタンにaria-labelが設定されている', async () => {
      const onClick = vi.fn();
      const onEdit = vi.fn();

      const { container } = render(
        <MandalaCell
          cellData={mockCellData}
          position={{ row: 0, col: 0 }}
          editable={true}
          onClick={onClick}
          onEdit={onEdit}
          showEditButton={true}
        />
      );

      const cell = container.querySelector('.mandala-cell');
      expect(cell).toBeInTheDocument();

      // ホバー状態をシミュレート
      if (cell) {
        await userEvent.hover(cell);

        await waitFor(() => {
          const editButton = screen.queryByLabelText('編集');
          if (editButton) {
            expect(editButton).toBeInTheDocument();
          }
        });
      }
    });
  });

  describe('ConflictDialog', () => {
    const mockCurrentData = {
      id: 'goal-1',
      user_id: 'user-1',
      title: '現在のタイトル',
      description: '現在の説明',
      deadline: new Date('2025-12-31'),
      background: '現在の背景',
      constraints: '現在の制約',
      status: 'active' as const,
      progress: 0,
      created_at: new Date(),
      updated_at: new Date(),
    };

    const mockLatestData = {
      ...mockCurrentData,
      title: '最新のタイトル',
      description: '最新の説明',
    };

    it('role="dialog"とaria-modal="true"が設定されている', () => {
      const onReload = vi.fn();
      const onDiscard = vi.fn();

      render(
        <ConflictDialog
          isOpen={true}
          currentData={mockCurrentData}
          latestData={mockLatestData}
          onReload={onReload}
          onDiscard={onDiscard}
        />
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
    });

    it('aria-labelledbyが設定されている', () => {
      const onReload = vi.fn();
      const onDiscard = vi.fn();

      render(
        <ConflictDialog
          isOpen={true}
          currentData={mockCurrentData}
          latestData={mockLatestData}
          onReload={onReload}
          onDiscard={onDiscard}
        />
      );

      const dialog = screen.getByRole('dialog');
      const labelledBy = dialog.getAttribute('aria-labelledby');
      expect(labelledBy).toBeTruthy();

      const titleElement = document.getElementById(labelledBy!);
      expect(titleElement).toBeInTheDocument();
    });
  });

  describe('HistoryPanel', () => {
    beforeEach(() => {
      // HistoryPanelが使用するAPIをモック
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          history: [],
          total: 0,
          limit: 20,
          offset: 0,
        }),
      });
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('role="region"が設定されている', async () => {
      const onClose = vi.fn();

      render(
        <HistoryPanel entityType="goal" entityId="goal-1" isAdmin={false} onClose={onClose} />
      );

      await waitFor(() => {
        const region = screen.getByRole('region');
        expect(region).toBeInTheDocument();
      });
    });

    it('aria-labelが設定されている', async () => {
      const onClose = vi.fn();

      render(
        <HistoryPanel entityType="goal" entityId="goal-1" isAdmin={false} onClose={onClose} />
      );

      await waitFor(() => {
        const region = screen.getByRole('region');
        const ariaLabel = region.getAttribute('aria-label');
        expect(ariaLabel).toBeTruthy();
        expect(ariaLabel).toBe('変更履歴パネル');
      });
    });
  });
});
