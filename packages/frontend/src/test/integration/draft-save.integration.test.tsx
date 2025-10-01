import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { GoalFormProvider } from '../../contexts/GoalFormContext';
import { DraftSaveButton } from '../../components/forms/DraftSaveButton';
import { DraftRestoreNotification } from '../../components/forms/DraftRestoreNotification';
import { useDraftAutoSave } from '../../hooks/useDraftAutoSave';
import { useDraftManualSave } from '../../hooks/useDraftManualSave';
import { useDraftRestore } from '../../hooks/useDraftRestore';
import { DraftService } from '../../services/draftService';
import { PartialGoalFormData } from '../../schemas/goal-form';

// DraftServiceのモック
vi.mock('../../services/draftService');
const mockDraftService = DraftService as any;

// タイマーのモック
vi.useFakeTimers();

// テスト用コンポーネント
const TestAutoSaveComponent: React.FC<{ formData: PartialGoalFormData }> = ({ formData }) => {
  const autoSave = useDraftAutoSave({
    formData,
    enabled: true,
    intervalSeconds: 30,
  });

  return (
    <div>
      <div data-testid="auto-save-status">{autoSave.state.isSaving ? '自動保存中' : '待機中'}</div>
      <div data-testid="save-count">{autoSave.state.saveCount}</div>
      <button onClick={autoSave.saveNow}>手動保存</button>
    </div>
  );
};

const TestManualSaveComponent: React.FC<{ formData: PartialGoalFormData }> = ({ formData }) => {
  const manualSave = useDraftManualSave();

  return (
    <div>
      <DraftSaveButton
        formData={formData}
        isSaving={manualSave.state.isSaving}
        onSaveSuccess={() => console.log('保存成功')}
        onSaveError={error => console.error('保存エラー:', error)}
      />
      <div data-testid="manual-save-count">{manualSave.state.saveCount}</div>
    </div>
  );
};

const TestRestoreComponent: React.FC = () => {
  const draftRestore = useDraftRestore();

  return (
    <div>
      {draftRestore.state.draftData && (
        <DraftRestoreNotification
          draftData={draftRestore.state.draftData}
          onRestore={() => draftRestore.restoreDraft()}
          onReject={() => draftRestore.rejectRestore()}
          onDelete={() => draftRestore.clearDraft()}
        />
      )}
      <div data-testid="restore-status">
        {draftRestore.state.isRestored ? '復元済み' : '未復元'}
      </div>
      <button onClick={() => draftRestore.loadDraft()}>下書き読み込み</button>
    </div>
  );
};

describe('下書き保存機能 統合テスト', () => {
  const mockFormData: PartialGoalFormData = {
    title: 'テスト目標',
    description: 'テスト説明',
    deadline: '2024-12-31',
    background: 'テスト背景',
    constraints: 'テスト制約',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    jest.clearAllTimers();
    mockDraftService.saveDraft.mockResolvedValue();
    mockDraftService.loadDraft.mockResolvedValue(null);
    mockDraftService.clearDraft.mockResolvedValue();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.useFakeTimers();
  });

  describe('自動保存機能', () => {
    it('30秒間隔で自動保存が実行される', async () => {
      render(<TestAutoSaveComponent formData={mockFormData} />);

      expect(screen.getByTestId('auto-save-status')).toHaveTextContent('待機中');
      expect(screen.getByTestId('save-count')).toHaveTextContent('0');

      // 30秒経過
      act(() => {
        vi.advanceTimersByTime(30000);
      });

      await waitFor(() => {
        expect(mockDraftService.saveDraft).toHaveBeenCalledWith(mockFormData);
        expect(screen.getByTestId('save-count')).toHaveTextContent('1');
      });

      // さらに30秒経過
      act(() => {
        vi.advanceTimersByTime(30000);
      });

      await waitFor(() => {
        expect(mockDraftService.saveDraft).toHaveBeenCalledTimes(2);
        expect(screen.getByTestId('save-count')).toHaveTextContent('2');
      });
    });

    it('手動保存ボタンで即座に保存される', async () => {
      render(<TestAutoSaveComponent formData={mockFormData} />);

      fireEvent.click(screen.getByText('手動保存'));

      await waitFor(() => {
        expect(mockDraftService.saveDraft).toHaveBeenCalledWith(mockFormData);
        expect(screen.getByTestId('save-count')).toHaveTextContent('1');
      });
    });
  });

  describe('手動保存機能', () => {
    it('下書き保存ボタンで保存される', async () => {
      render(<TestManualSaveComponent formData={mockFormData} />);

      const saveButton = screen.getByRole('button', { name: /フォームの内容を下書きとして保存/ });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockDraftService.saveDraft).toHaveBeenCalledWith(mockFormData);
        expect(screen.getByTestId('manual-save-count')).toHaveTextContent('1');
      });
    });

    it('保存成功時にメッセージが表示される', async () => {
      render(<TestManualSaveComponent formData={mockFormData} />);

      const saveButton = screen.getByRole('button', { name: /フォームの内容を下書きとして保存/ });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/に保存しました/)).toBeInTheDocument();
      });
    });
  });

  describe('下書き復元機能', () => {
    it('下書きが存在する場合に復元通知が表示される', async () => {
      const mockDraftData = {
        formData: mockFormData,
        savedAt: new Date().toISOString(),
        version: 1,
      };

      mockDraftService.loadDraft.mockResolvedValue(mockDraftData);

      render(<TestRestoreComponent />);

      fireEvent.click(screen.getByText('下書き読み込み'));

      await waitFor(() => {
        expect(screen.getByText('下書きが見つかりました')).toBeInTheDocument();
        expect(screen.getByText('テスト目標')).toBeInTheDocument();
      });
    });

    it('復元ボタンで下書きが復元される', async () => {
      const mockDraftData = {
        formData: mockFormData,
        savedAt: new Date().toISOString(),
        version: 1,
      };

      mockDraftService.loadDraft.mockResolvedValue(mockDraftData);

      render(<TestRestoreComponent />);

      // 下書き読み込み
      fireEvent.click(screen.getByText('下書き読み込み'));

      await waitFor(() => {
        expect(screen.getByText('下書きが見つかりました')).toBeInTheDocument();
      });

      // 復元実行
      fireEvent.click(screen.getByRole('button', { name: '復元する' }));

      await waitFor(() => {
        expect(screen.getByTestId('restore-status')).toHaveTextContent('復元済み');
      });
    });

    it('削除ボタンで下書きが削除される', async () => {
      const mockDraftData = {
        formData: mockFormData,
        savedAt: new Date().toISOString(),
        version: 1,
      };

      mockDraftService.loadDraft.mockResolvedValue(mockDraftData);

      render(<TestRestoreComponent />);

      // 下書き読み込み
      fireEvent.click(screen.getByText('下書き読み込み'));

      await waitFor(() => {
        expect(screen.getByText('下書きが見つかりました')).toBeInTheDocument();
      });

      // 削除実行
      fireEvent.click(screen.getByRole('button', { name: '削除' }));

      await waitFor(() => {
        expect(mockDraftService.clearDraft).toHaveBeenCalled();
        expect(screen.queryByText('下書きが見つかりました')).not.toBeInTheDocument();
      });
    });
  });

  describe('GoalFormContextとの統合', () => {
    const TestFormWithContext: React.FC = () => {
      return (
        <GoalFormProvider>
          <TestAutoSaveComponent formData={mockFormData} />
          <TestManualSaveComponent formData={mockFormData} />
        </GoalFormProvider>
      );
    };

    it('GoalFormContextと連携して動作する', async () => {
      render(<TestFormWithContext />);

      // 手動保存
      const saveButton = screen.getByRole('button', { name: /フォームの内容を下書きとして保存/ });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockDraftService.saveDraft).toHaveBeenCalledWith(mockFormData);
      });

      // 自動保存
      act(() => {
        vi.advanceTimersByTime(30000);
      });

      await waitFor(() => {
        expect(mockDraftService.saveDraft).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('エラーハンドリング', () => {
    it('保存エラー時に適切に処理される', async () => {
      const saveError = new Error('保存エラー');
      mockDraftService.saveDraft.mockRejectedValue(saveError);

      render(<TestManualSaveComponent formData={mockFormData} />);

      const saveButton = screen.getByRole('button', { name: /フォームの内容を下書きとして保存/ });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('保存エラー')).toBeInTheDocument();
      });
    });

    it('読み込みエラー時に適切に処理される', async () => {
      const loadError = new Error('読み込みエラー');
      mockDraftService.loadDraft.mockRejectedValue(loadError);

      render(<TestRestoreComponent />);

      fireEvent.click(screen.getByText('下書き読み込み'));

      await waitFor(() => {
        expect(screen.queryByText('下書きが見つかりました')).not.toBeInTheDocument();
      });
    });
  });

  describe('パフォーマンス', () => {
    it('重複保存が防止される', async () => {
      let resolvePromise: () => void;
      const savePromise = new Promise<void>(resolve => {
        resolvePromise = resolve;
      });

      mockDraftService.saveDraft.mockReturnValue(savePromise);

      render(<TestManualSaveComponent formData={mockFormData} />);

      const saveButton = screen.getByRole('button', { name: /フォームの内容を下書きとして保存/ });

      // 連続クリック
      fireEvent.click(saveButton);
      fireEvent.click(saveButton);
      fireEvent.click(saveButton);

      // 最初の保存のみが呼ばれる
      expect(mockDraftService.saveDraft).toHaveBeenCalledTimes(1);

      // 最初の保存を完了
      act(() => {
        resolvePromise!();
      });

      await waitFor(() => {
        expect(screen.getByTestId('manual-save-count')).toHaveTextContent('1');
      });
    });

    it('同じデータの自動保存はスキップされる', async () => {
      const { rerender } = render(<TestAutoSaveComponent formData={mockFormData} />);

      // 最初の自動保存
      act(() => {
        vi.advanceTimersByTime(30000);
      });

      await waitFor(() => {
        expect(mockDraftService.saveDraft).toHaveBeenCalledTimes(1);
      });

      // 同じデータで再レンダリング
      rerender(<TestAutoSaveComponent formData={mockFormData} />);

      // 次の自動保存（スキップされるはず）
      act(() => {
        vi.advanceTimersByTime(30000);
      });

      await waitFor(() => {
        // 同じデータなので保存されない
        expect(mockDraftService.saveDraft).toHaveBeenCalledTimes(1);
      });
    });
  });
});
