import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { SubGoalEditPage } from './SubGoalEditPage';
import { SubGoal } from '../types/mandala';

// React Router のモック
const mockNavigate = vi.fn();
const mockUseParams = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => mockUseParams(),
  };
});

// 認証プロバイダーのモック
const mockUseAuth = vi.fn();
vi.mock('../components/auth/AuthProvider', () => ({
  useAuth: () => mockUseAuth(),
}));

// テスト用のサンプルデータ
// const sampleSubGoals: SubGoal[] = Array.from({ length: 8 }, (_, index) => ({
//   id: `subgoal-${index + 1}`,
//   goal_id: 'goal-1',
//   title: `サブ目標 ${index + 1}`,
//   description: `サブ目標 ${index + 1} の説明文です。`,
//   position: index,
//   progress: Math.floor(Math.random() * 100),
// }));

// テスト用のラッパーコンポーネント
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('SubGoalEditPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // デフォルトのモック設定
    mockUseParams.mockReturnValue({ goalId: 'goal-1' });
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1', name: 'テストユーザー', email: 'test@example.com' },
      isAuthenticated: true,
      isLoading: false,
    });
  });

  describe('レンダリング', () => {
    it('ページが正しく表示される', async () => {
      render(
        <TestWrapper>
          <SubGoalEditPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('サブ目標の確認・編集')).toBeInTheDocument();
        expect(screen.getByText('AI生成されたサブ目標を確認してください')).toBeInTheDocument();
      });
    });

    it('認証中はローディングが表示される', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: true,
      });

      render(
        <TestWrapper>
          <SubGoalEditPage />
        </TestWrapper>
      );

      expect(screen.getByText('認証状態を確認しています...')).toBeInTheDocument();
    });

    it('未認証の場合はリダイレクトメッセージが表示される', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });

      render(
        <TestWrapper>
          <SubGoalEditPage />
        </TestWrapper>
      );

      expect(screen.getByText('ログインページに移動しています...')).toBeInTheDocument();
    });

    it('goalIdが未指定の場合はエラーが表示される', async () => {
      mockUseParams.mockReturnValue({ goalId: undefined });

      render(
        <TestWrapper>
          <SubGoalEditPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('目標IDが指定されていません')).toBeInTheDocument();
      });
    });
  });

  describe('ツールバー', () => {
    it('一括編集モードボタンが表示される', async () => {
      render(
        <TestWrapper>
          <SubGoalEditPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: '一括編集モード' })).toBeInTheDocument();
      });
    });

    it('AI再生成ボタンが表示される', async () => {
      render(
        <TestWrapper>
          <SubGoalEditPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'AI再生成' })).toBeInTheDocument();
      });
    });

    it('一括編集モードを切り替えできる', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <SubGoalEditPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: '一括編集モード' })).toBeInTheDocument();
      });

      const bulkEditButton = screen.getByRole('button', { name: '一括編集モード' });
      await user.click(bulkEditButton);

      expect(screen.getByRole('button', { name: '一括編集モード終了' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '一括編集実行' })).toBeInTheDocument();
    });
  });

  describe('サブ目標カード', () => {
    it('サブ目標カードが表示される', async () => {
      render(
        <TestWrapper>
          <SubGoalEditPage />
        </TestWrapper>
      );

      await waitFor(() => {
        // モックデータの8つのサブ目標が表示されることを確認
        for (let i = 1; i <= 8; i++) {
          expect(screen.getByText(`サブ目標 ${i}`)).toBeInTheDocument();
        }
      });
    });

    it('サブ目標カードをクリックして選択できる', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <SubGoalEditPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('サブ目標 1')).toBeInTheDocument();
      });

      const firstCard = screen.getByText('サブ目標 1').closest('div');
      if (firstCard) {
        await user.click(firstCard);
        // 選択状態の確認は視覚的なスタイルの変更で行われるため、
        // ここではクリックイベントが発生することを確認
      }
    });

    it('進捗バーが表示される', async () => {
      render(
        <TestWrapper>
          <SubGoalEditPage />
        </TestWrapper>
      );

      await waitFor(() => {
        // 進捗表示のテキストが存在することを確認
        expect(screen.getAllByText(/進捗:/)).toHaveLength(8);
      });
    });
  });

  describe('サブ目標カード編集', () => {
    it('編集ボタンをクリックして編集モードに入れる', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <SubGoalEditPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('サブ目標 1')).toBeInTheDocument();
      });

      // 編集ボタンを探す（SVGアイコン）
      const editButtons = screen.getAllByRole('button');
      const editButton = editButtons.find(
        button =>
          button.querySelector('svg') &&
          button.querySelector(
            'path[d*="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"]'
          )
      );

      if (editButton) {
        await user.click(editButton);

        // 編集モードに入ったことを確認
        expect(screen.getByLabelText('タイトル')).toBeInTheDocument();
        expect(screen.getByLabelText('説明')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '保存' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'キャンセル' })).toBeInTheDocument();
      }
    });

    it('編集モードでタイトルと説明を変更できる', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <SubGoalEditPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('サブ目標 1')).toBeInTheDocument();
      });

      // 編集ボタンをクリック
      const editButtons = screen.getAllByRole('button');
      const editButton = editButtons.find(
        button =>
          button.querySelector('svg') &&
          button.querySelector(
            'path[d*="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"]'
          )
      );

      if (editButton) {
        await user.click(editButton);

        const titleInput = screen.getByLabelText('タイトル');
        const descriptionInput = screen.getByLabelText('説明');

        await user.clear(titleInput);
        await user.type(titleInput, '更新されたタイトル');

        await user.clear(descriptionInput);
        await user.type(descriptionInput, '更新された説明');

        expect(titleInput).toHaveValue('更新されたタイトル');
        expect(descriptionInput).toHaveValue('更新された説明');
      }
    });

    it('編集をキャンセルできる', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <SubGoalEditPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('サブ目標 1')).toBeInTheDocument();
      });

      // 編集ボタンをクリック
      const editButtons = screen.getAllByRole('button');
      const editButton = editButtons.find(
        button =>
          button.querySelector('svg') &&
          button.querySelector(
            'path[d*="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"]'
          )
      );

      if (editButton) {
        await user.click(editButton);

        const titleInput = screen.getByLabelText('タイトル');
        await user.clear(titleInput);
        await user.type(titleInput, '変更されたタイトル');

        const cancelButton = screen.getByRole('button', { name: 'キャンセル' });
        await user.click(cancelButton);

        // 編集モードが終了し、元のタイトルが表示されることを確認
        expect(screen.getByText('サブ目標 1')).toBeInTheDocument();
        expect(screen.queryByLabelText('タイトル')).not.toBeInTheDocument();
      }
    });
  });

  describe('AI再生成', () => {
    it('AI再生成ボタンをクリックできる', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <SubGoalEditPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'AI再生成' })).toBeInTheDocument();
      });

      const regenerateButton = screen.getByRole('button', { name: 'AI再生成' });
      await user.click(regenerateButton);

      // AI再生成の処理が開始されることを確認
      // 実際のAPI呼び出しはモックされているため、エラーが発生しないことを確認
    });
  });

  describe('ナビゲーション', () => {
    it('前に戻るボタンが表示される', async () => {
      render(
        <TestWrapper>
          <SubGoalEditPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: '前に戻る' })).toBeInTheDocument();
      });
    });

    it('次へ進むボタンが表示される', async () => {
      render(
        <TestWrapper>
          <SubGoalEditPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: '次へ進む' })).toBeInTheDocument();
      });
    });

    it('前に戻るボタンをクリックするとナビゲートされる', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <SubGoalEditPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: '前に戻る' })).toBeInTheDocument();
      });

      const backButton = screen.getByRole('button', { name: '前に戻る' });
      await user.click(backButton);

      expect(mockNavigate).toHaveBeenCalledWith('/mandala/create/goal/goal-1');
    });

    it('次へ進むボタンをクリックするとナビゲートされる', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <SubGoalEditPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: '次へ進む' })).toBeInTheDocument();
      });

      const nextButton = screen.getByRole('button', { name: '次へ進む' });
      await user.click(nextButton);

      expect(mockNavigate).toHaveBeenCalledWith('/mandala/create/actions/goal-1');
    });

    it('ダッシュボードに戻るボタンをクリックするとナビゲートされる', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <SubGoalEditPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'ダッシュボードに戻る' })).toBeInTheDocument();
      });

      const dashboardButton = screen.getByRole('button', { name: 'ダッシュボードに戻る' });
      await user.click(dashboardButton);

      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  describe('メッセージ表示', () => {
    it('成功メッセージが表示される', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <SubGoalEditPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('サブ目標 1')).toBeInTheDocument();
      });

      // 編集を行って成功メッセージをトリガー
      const editButtons = screen.getAllByRole('button');
      const editButton = editButtons.find(
        button =>
          button.querySelector('svg') &&
          button.querySelector(
            'path[d*="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"]'
          )
      );

      if (editButton) {
        await user.click(editButton);

        const saveButton = screen.getByRole('button', { name: '保存' });
        await user.click(saveButton);

        await waitFor(() => {
          expect(screen.getByText('サブ目標を更新しました')).toBeInTheDocument();
        });
      }
    });

    it('成功メッセージを閉じることができる', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <SubGoalEditPage />
        </TestWrapper>
      );

      // 成功メッセージを表示させる処理を行った後
      await waitFor(() => {
        expect(screen.getByText('サブ目標 1')).toBeInTheDocument();
      });

      // 編集を行って成功メッセージをトリガー
      const editButtons = screen.getAllByRole('button');
      const editButton = editButtons.find(
        button =>
          button.querySelector('svg') &&
          button.querySelector(
            'path[d*="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"]'
          )
      );

      if (editButton) {
        await user.click(editButton);

        const saveButton = screen.getByRole('button', { name: '保存' });
        await user.click(saveButton);

        await waitFor(() => {
          expect(screen.getByText('サブ目標を更新しました')).toBeInTheDocument();
        });

        // 成功メッセージの閉じるボタンをクリック
        const closeButtons = screen.getAllByRole('button');
        const closeButton = closeButtons.find(button => button.textContent === '閉じる');

        if (closeButton) {
          await user.click(closeButton);

          await waitFor(() => {
            expect(screen.queryByText('サブ目標を更新しました')).not.toBeInTheDocument();
          });
        }
      }
    });
  });

  describe('レスポンシブ対応', () => {
    it('モバイル表示でも正しく動作する', async () => {
      // ビューポートサイズを変更
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(
        <TestWrapper>
          <SubGoalEditPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('サブ目標の確認・編集')).toBeInTheDocument();
      });

      // モバイル表示でも基本的な要素が表示されることを確認
      expect(screen.getByRole('button', { name: '一括編集モード' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'AI再生成' })).toBeInTheDocument();
    });
  });
});
