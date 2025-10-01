import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { GoalInputForm } from '../../components/forms/GoalInputForm';
import { GoalFormProvider } from '../../contexts/GoalFormContext';
import { DraftService } from '../../services/draftService';
import { PartialGoalFormData, GoalFormData } from '../../schemas/goal-form';

// DraftServiceをモック
vi.mock('../../services/draftService');
const mockDraftService = DraftService as any;

// LocalStorageをモック
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// テスト用のラッパーコンポーネント
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>
    <GoalFormProvider>{children}</GoalFormProvider>
  </BrowserRouter>
);

describe('下書き保存フロー統合テスト', () => {
  const partialFormData: PartialGoalFormData = {
    title: 'プログラミングスキル向上',
    description: 'フルスタック開発者として成長する',
    deadline: '2024-12-31',
    background: '現在のプロジェクトでより高度な技術が求められている',
  };

  const completeFormData: GoalFormData = {
    ...partialFormData,
    constraints: '平日は仕事があるため、主に週末と平日の夜に学習時間を確保する',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockLocalStorage.getItem.mockReturnValue(null);
    mockDraftService.saveDraft.mockResolvedValue();
    mockDraftService.loadDraft.mockResolvedValue(null);
    mockDraftService.clearDraft.mockResolvedValue();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('完全な下書き保存フロー', () => {
    it('フォーム入力から自動保存、手動保存、復元まで一連のフローが動作する', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      render(
        <TestWrapper>
          <GoalInputForm
            onSubmitSuccess={() => {}}
            onSubmitError={() => {}}
            enableDraftSave={true}
            autoSaveInterval={30}
          />
        </TestWrapper>
      );

      // 1. フォームに段階的に入力
      await user.type(screen.getByLabelText(/目標タイトル/), partialFormData.title!);

      // 自動保存が実行されるまで待機
      act(() => {
        vi.advanceTimersByTime(30000);
      });

      await waitFor(() => {
        expect(mockDraftService.saveDraft).toHaveBeenCalledWith({
          title: partialFormData.title,
        });
      });

      // 2. 追加入力
      await user.type(screen.getByLabelText(/目標説明/), partialFormData.description!);
      await user.type(screen.getByLabelText(/達成期限/), partialFormData.deadline!);

      // 再度自動保存
      act(() => {
        vi.advanceTimersByTime(30000);
      });

      await waitFor(() => {
        expect(mockDraftService.saveDraft).toHaveBeenCalledWith({
          title: partialFormData.title,
          description: partialFormData.description,
          deadline: partialFormData.deadline,
        });
      });

      // 3. 手動保存ボタンをクリック
      const draftSaveButton = screen.getByRole('button', { name: /下書き保存/ });
      await user.click(draftSaveButton);

      await waitFor(() => {
        expect(mockDraftService.saveDraft).toHaveBeenCalledTimes(3);
      });

      // 4. 保存成功メッセージが表示される
      await waitFor(() => {
        expect(screen.getByText(/保存しました/)).toBeInTheDocument();
      });
    });

    it('ページリロード後に下書きが復元される', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      // 下書きデータが存在する状態をモック
      const mockDraftData = {
        formData: partialFormData,
        savedAt: new Date().toISOString(),
        version: 1,
      };
      mockDraftService.loadDraft.mockResolvedValue(mockDraftData);

      render(
        <TestWrapper>
          <GoalInputForm
            onSubmitSuccess={() => {}}
            onSubmitError={() => {}}
            enableDraftSave={true}
            autoRestore={true}
          />
        </TestWrapper>
      );

      // 下書き復元通知が表示される
      await waitFor(() => {
        expect(screen.getByText(/下書きが見つかりました/)).toBeInTheDocument();
        expect(screen.getByText(partialFormData.title!)).toBeInTheDocument();
      });

      // 復元ボタンをクリック
      const restoreButton = screen.getByRole('button', { name: /復元する/ });
      await user.click(restoreButton);

      // フォームに下書きデータが復元される
      await waitFor(() => {
        expect(screen.getByDisplayValue(partialFormData.title!)).toBeInTheDocument();
        expect(screen.getByDisplayValue(partialFormData.description!)).toBeInTheDocument();
        expect(screen.getByDisplayValue(partialFormData.deadline!)).toBeInTheDocument();
      });

      // 復元通知が消える
      expect(screen.queryByText(/下書きが見つかりました/)).not.toBeInTheDocument();
    });

    it('下書き削除機能が正しく動作する', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      const mockDraftData = {
        formData: partialFormData,
        savedAt: new Date().toISOString(),
        version: 1,
      };
      mockDraftService.loadDraft.mockResolvedValue(mockDraftData);

      render(
        <TestWrapper>
          <GoalInputForm
            onSubmitSuccess={() => {}}
            onSubmitError={() => {}}
            enableDraftSave={true}
            autoRestore={true}
          />
        </TestWrapper>
      );

      // 下書き復元通知が表示される
      await waitFor(() => {
        expect(screen.getByText(/下書きが見つかりました/)).toBeInTheDocument();
      });

      // 削除ボタンをクリック
      const deleteButton = screen.getByRole('button', { name: /削除/ });
      await user.click(deleteButton);

      // 削除確認ダイアログが表示される
      await waitFor(() => {
        expect(screen.getByText(/下書きを削除しますか/)).toBeInTheDocument();
      });

      // 削除を確認
      const confirmDeleteButton = screen.getByRole('button', { name: /削除する/ });
      await user.click(confirmDeleteButton);

      // 下書きが削除される
      await waitFor(() => {
        expect(mockDraftService.clearDraft).toHaveBeenCalled();
      });

      // 復元通知が消える
      expect(screen.queryByText(/下書きが見つかりました/)).not.toBeInTheDocument();
    });
  });

  describe('複数タブでの下書き同期', () => {
    it('複数タブ間で下書きが同期される', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      // タブ1をレンダリング
      const { rerender } = render(
        <TestWrapper>
          <GoalInputForm
            onSubmitSuccess={() => {}}
            onSubmitError={() => {}}
            enableDraftSave={true}
            enableMultiTabSync={true}
          />
        </TestWrapper>
      );

      // タブ1でフォームに入力
      await user.type(screen.getByLabelText(/目標タイトル/), partialFormData.title!);

      // 自動保存が実行される
      act(() => {
        vi.advanceTimersByTime(30000);
      });

      await waitFor(() => {
        expect(mockDraftService.saveDraft).toHaveBeenCalled();
      });

      // 他のタブからの更新をシミュレート（storage イベント）
      const updatedDraftData = {
        formData: {
          ...partialFormData,
          description: '他のタブで更新された説明',
        },
        savedAt: new Date().toISOString(),
        version: 2,
      };

      mockDraftService.loadDraft.mockResolvedValue(updatedDraftData);

      // storage イベントを発火
      act(() => {
        window.dispatchEvent(
          new StorageEvent('storage', {
            key: 'goal-form-draft',
            newValue: JSON.stringify(updatedDraftData),
          })
        );
      });

      // 同期通知が表示される
      await waitFor(() => {
        expect(screen.getByText(/他のタブで下書きが更新されました/)).toBeInTheDocument();
      });

      // 同期ボタンをクリック
      const syncButton = screen.getByRole('button', { name: /同期する/ });
      await user.click(syncButton);

      // フォームが更新される
      await waitFor(() => {
        expect(screen.getByDisplayValue('他のタブで更新された説明')).toBeInTheDocument();
      });
    });

    it('競合する変更がある場合に適切に処理される', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      render(
        <TestWrapper>
          <GoalInputForm
            onSubmitSuccess={() => {}}
            onSubmitError={() => {}}
            enableDraftSave={true}
            enableMultiTabSync={true}
          />
        </TestWrapper>
      );

      // 現在のタブで入力
      await user.type(screen.getByLabelText(/目標タイトル/), 'ローカルタイトル');
      await user.type(screen.getByLabelText(/目標説明/), 'ローカル説明');

      // 他のタブからの競合する更新
      const conflictingDraftData = {
        formData: {
          title: 'リモートタイトル',
          description: 'リモート説明',
          deadline: '2024-06-30',
        },
        savedAt: new Date().toISOString(),
        version: 2,
      };

      mockDraftService.loadDraft.mkResolvedValue(conflictingDraftData);

      // storage イベントを発火
      act(() => {
        window.dispatchEvent(
          new StorageEvent('storage', {
            key: 'goal-form-draft',
            newValue: JSON.stringify(conflictingDraftData),
          })
        );
      });

      // 競合解決ダイアログが表示される
      await waitFor(() => {
        expect(screen.getByText(/下書きに競合があります/)).toBeInTheDocument();
      });

      // ローカル変更を保持を選択
      const keepLocalButton = screen.getByRole('button', { name: /ローカル変更を保持/ });
      await user.click(keepLocalButton);

      // ローカルの変更が保持される
      expect(screen.getByDisplayValue('ローカルタイトル')).toBeInTheDocument();
      expect(screen.getByDisplayValue('ローカル説明')).toBeInTheDocument();
    });
  });

  describe('下書き保存のエラーハンドリング', () => {
    it('自動保存エラー時に適切に処理される', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      const saveError = new Error('ネットワークエラー');
      mockDraftService.saveDraft.mockRejectedValue(saveError);

      render(
        <TestWrapper>
          <GoalInputForm
            onSubmitSuccess={() => {}}
            onSubmitError={() => {}}
            enableDraftSave={true}
          />
        </TestWrapper>
      );

      // フォームに入力
      await user.type(screen.getByLabelText(/目標タイトル/), partialFormData.title!);

      // 自動保存が実行される
      act(() => {
        vi.advanceTimersByTime(30000);
      });

      // エラーメッセージが表示される
      await waitFor(() => {
        expect(screen.getByText(/下書きの保存に失敗しました/)).toBeInTheDocument();
      });

      // 再試行ボタンが表示される
      expect(screen.getByRole('button', { name: /再試行/ })).toBeInTheDocument();
    });

    it('手動保存エラー時に適切に処理される', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      const saveError = new Error('サーバーエラー');
      mockDraftService.saveDraft.mockRejectedValue(saveError);

      render(
        <TestWrapper>
          <GoalInputForm
            onSubmitSuccess={() => {}}
            onSubmitError={() => {}}
            enableDraftSave={true}
          />
        </TestWrapper>
      );

      // フォームに入力
      await user.type(screen.getByLabelText(/目標タイトル/), partialFormData.title!);

      // 手動保存ボタンをクリック
      const draftSaveButton = screen.getByRole('button', { name: /下書き保存/ });
      await user.click(draftSaveButton);

      // エラーメッセージが表示される
      await waitFor(() => {
        expect(screen.getByText(/サーバーエラー/)).toBeInTheDocument();
      });

      // 保存ボタンが再度有効になる
      expect(draftSaveButton).not.toBeDisabled();
    });

    it('下書き読み込みエラー時に適切に処理される', async () => {
      const loadError = new Error('読み込みエラー');
      mockDraftService.loadDraft.mockRejectedValue(loadError);

      render(
        <TestWrapper>
          <GoalInputForm
            onSubmitSuccess={() => {}}
            onSubmitError={() => {}}
            enableDraftSave={true}
            autoRestore={true}
          />
        </TestWrapper>
      );

      // エラーメッセージが表示される
      await waitFor(() => {
        expect(screen.getByText(/下書きの読み込みに失敗しました/)).toBeInTheDocument();
      });

      // 再試行ボタンが表示される
      expect(screen.getByRole('button', { name: /再試行/ })).toBeInTheDocument();
    });
  });

  describe('下書き保存の最適化', () => {
    it('同じデータの重複保存が防止される', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      render(
        <TestWrapper>
          <GoalInputForm
            onSubmitSuccess={() => {}}
            onSubmitError={() => {}}
            enableDraftSave={true}
          />
        </TestWrapper>
      );

      // 初回入力
      await user.type(screen.getByLabelText(/目標タイトル/), partialFormData.title!);

      // 自動保存
      act(() => {
        vi.advanceTimersByTime(30000);
      });

      await waitFor(() => {
        expect(mockDraftService.saveDraft).toHaveBeenCalledTimes(1);
      });

      // 同じデータで再度自動保存タイミング
      act(() => {
        vi.advanceTimersByTime(30000);
      });

      // 重複保存されない
      expect(mockDraftService.saveDraft).toHaveBeenCalledTimes(1);

      // データを変更
      await user.type(screen.getByLabelText(/目標説明/), partialFormData.description!);

      // 自動保存
      act(() => {
        vi.advanceTimersByTime(30000);
      });

      // 新しいデータで保存される
      await waitFor(() => {
        expect(mockDraftService.saveDraft).toHaveBeenCalledTimes(2);
      });
    });

    it('保存中の重複リクエストが防止される', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      let resolvePromise: () => void;
      const savePromise = new Promise<void>(resolve => {
        resolvePromise = resolve;
      });

      mockDraftService.saveDraft.mockReturnValue(savePromise);

      render(
        <TestWrapper>
          <GoalInputForm
            onSubmitSuccess={() => {}}
            onSubmitError={() => {}}
            enableDraftSave={true}
          />
        </TestWrapper>
      );

      // フォームに入力
      await user.type(screen.getByLabelText(/目標タイトル/), partialFormData.title!);

      // 手動保存ボタンを連続クリック
      const draftSaveButton = screen.getByRole('button', { name: /下書き保存/ });
      await user.click(draftSaveButton);
      await user.click(draftSaveButton);
      await user.click(draftSaveButton);

      // 最初の保存のみが実行される
      expect(mockDraftService.saveDraft).toHaveBeenCalledTimes(1);

      // 保存ボタンが無効化される
      expect(draftSaveButton).toBeDisabled();

      // 保存完了
      act(() => {
        resolvePromise!();
      });

      // 保存ボタンが再度有効になる
      await waitFor(() => {
        expect(draftSaveButton).not.toBeDisabled();
      });
    });
  });

  describe('下書きバージョン管理', () => {
    it('下書きのバージョン管理が正しく動作する', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      render(
        <TestWrapper>
          <GoalInputForm
            onSubmitSuccess={() => {}}
            onSubmitError={() => {}}
            enableDraftSave={true}
            enableVersioning={true}
          />
        </TestWrapper>
      );

      // 初回保存
      await user.type(screen.getByLabelText(/目標タイトル/), 'バージョン1');

      act(() => {
        vi.advanceTimersByTime(30000);
      });

      await waitFor(() => {
        expect(mockDraftService.saveDraft).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'バージョン1',
          }),
          expect.objectContaining({
            version: 1,
          })
        );
      });

      // 2回目の保存
      await user.clear(screen.getByLabelText(/目標タイトル/));
      await user.type(screen.getByLabelText(/目標タイトル/), 'バージョン2');

      act(() => {
        vi.advanceTimersByTime(30000);
      });

      await waitFor(() => {
        expect(mockDraftService.saveDraft).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'バージョン2',
          }),
          expect.objectContaining({
            version: 2,
          })
        );
      });
    });
  });
});
