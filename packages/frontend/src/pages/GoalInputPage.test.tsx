import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { GoalInputPage } from './GoalInputPage';
import { GoalFormService } from '../services/goalFormService';
import { useAuth } from '../components/auth';

// モック設定
vi.mock('../services/goalFormService');
vi.mock('../components/auth', () => ({
  useAuth: vi.fn(),
}));
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

// テスト用のモックデータ
const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  name: 'テストユーザー',
  profileComplete: true,
};

const mockDraftData = {
  title: '下書きタイトル',
  description: '下書き説明',
  deadline: '2024-12-31',
  background: '下書き背景',
  constraints: '下書き制約',
};

const mockCreateGoalResponse = {
  goalId: 'goal-123',
  processingId: 'processing-123',
  status: 'processing' as const,
  message: 'AI生成を開始しました',
};

const mockSaveDraftResponse = {
  draftId: 'draft-123',
  savedAt: '2024-01-01T10:00:00Z',
  message: '下書きが保存されました',
};

// テスト用のラッパーコンポーネント
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('GoalInputPage', () => {
  const mockNavigate = vi.fn();
  const mockUseAuth = vi.mocked(useAuth);
  const mockGoalFormService = vi.mocked(GoalFormService);

  beforeEach(() => {
    vi.clearAllMocks();

    // デフォルトの認証状態
    mockUseAuth.mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      isLoading: false,
    } as any);

    // React Router のモック
    vi.doMock('react-router-dom', async () => {
      const actual = await vi.importActual('react-router-dom');
      return {
        ...actual,
        useNavigate: () => mockNavigate,
      };
    });

    // GoalFormService のモック
    mockGoalFormService.getDraft.mockResolvedValue({
      draftData: null,
      savedAt: null,
      message: '下書きはありません',
    });
    mockGoalFormService.createGoal.mockResolvedValue(mockCreateGoalResponse);
    mockGoalFormService.saveDraft.mockResolvedValue(mockSaveDraftResponse);
    mockGoalFormService.deleteDraft.mockResolvedValue();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('認証状態の処理', () => {
    it('認証チェック中はローディング画面を表示する', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: true,
      } as any);

      render(
        <TestWrapper>
          <GoalInputPage />
        </TestWrapper>
      );

      expect(screen.getByText('認証状態を確認しています...')).toBeInTheDocument();
    });

    it('未認証の場合はリダイレクト画面を表示する', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      } as any);

      render(
        <TestWrapper>
          <GoalInputPage />
        </TestWrapper>
      );

      expect(screen.getByText('ログインページに移動しています...')).toBeInTheDocument();
    });

    it('認証済みの場合はページを表示する', async () => {
      render(
        <TestWrapper>
          <GoalInputPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('新しい目標を作成')).toBeInTheDocument();
      });
    });
  });

  describe('ページの初期化', () => {
    it('ページ読み込み中はローディング画面を表示する', () => {
      mockGoalFormService.getDraft.mockImplementation(
        () => new Promise(() => {}) // 永続的に pending 状態
      );

      render(
        <TestWrapper>
          <GoalInputPage />
        </TestWrapper>
      );

      expect(screen.getByText('ページを読み込んでいます...')).toBeInTheDocument();
    });

    it('下書きデータがない場合は空のフォームを表示する', async () => {
      render(
        <TestWrapper>
          <GoalInputPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/目標タイトル/)).toBeInTheDocument();
      });

      expect(screen.getByLabelText(/目標タイトル/)).toHaveValue('');
    });

    it('下書きデータがある場合は復元メッセージを表示する', async () => {
      mockGoalFormService.getDraft.mockResolvedValue({
        draftData: mockDraftData,
        savedAt: '2024-01-01T10:00:00Z',
        message: '下書きが復元されました',
      });

      render(
        <TestWrapper>
          <GoalInputPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('下書きが復元されました')).toBeInTheDocument();
      });
    });

    it('下書き取得エラーは無視して新規作成として続行する', async () => {
      mockGoalFormService.getDraft.mockRejectedValue(new Error('下書き取得エラー'));

      render(
        <TestWrapper>
          <GoalInputPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('新しい目標を作成')).toBeInTheDocument();
      });

      // エラーメッセージは表示されない
      expect(screen.queryByText('下書き取得エラー')).not.toBeInTheDocument();
    });
  });

  describe('ヘッダーの表示', () => {
    it('ページタイトルが表示される', async () => {
      render(
        <TestWrapper>
          <GoalInputPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('新しい目標を作成')).toBeInTheDocument();
      });
    });

    it('ユーザー名が表示される', async () => {
      render(
        <TestWrapper>
          <GoalInputPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('テストユーザー')).toBeInTheDocument();
      });
    });

    it('ダッシュボードに戻るリンクが表示される', async () => {
      render(
        <TestWrapper>
          <GoalInputPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('ダッシュボードに戻る')).toBeInTheDocument();
      });
    });
  });

  describe('フォーム送信処理', () => {
    it('有効なデータでフォーム送信が成功する', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <GoalInputPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/目標タイトル/)).toBeInTheDocument();
      });

      // フォームに入力
      await user.type(screen.getByLabelText(/目標タイトル/), 'テスト目標');
      await user.type(screen.getByLabelText(/目標説明/), 'テスト説明');
      await user.type(screen.getByLabelText(/達成期限/), '2024-12-31');
      await user.type(screen.getByLabelText(/背景/), 'テスト背景');

      // フォーム送信
      await user.click(screen.getByRole('button', { name: /AI生成開始/ }));

      await waitFor(() => {
        expect(mockGoalFormService.createGoal).toHaveBeenCalledWith({
          title: 'テスト目標',
          description: 'テスト説明',
          deadline: '2024-12-31',
          background: 'テスト背景',
          constraints: '',
        });
      });

      // 成功メッセージが表示される
      expect(screen.getByText(/AI生成を開始しました/)).toBeInTheDocument();

      // 下書きが削除される
      await waitFor(() => {
        expect(mockGoalFormService.deleteDraft).toHaveBeenCalled();
      });
    });

    it('フォーム送信エラー時はエラーメッセージを表示する', async () => {
      const user = userEvent.setup();
      const errorMessage = 'サーバーエラーが発生しました';

      mockGoalFormService.createGoal.mockRejectedValue(new Error(errorMessage));

      render(
        <TestWrapper>
          <GoalInputPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/目標タイトル/)).toBeInTheDocument();
      });

      // フォームに入力
      await user.type(screen.getByLabelText(/目標タイトル/), 'テスト目標');
      await user.type(screen.getByLabelText(/目標説明/), 'テスト説明');
      await user.type(screen.getByLabelText(/達成期限/), '2024-12-31');
      await user.type(screen.getByLabelText(/背景/), 'テスト背景');

      // フォーム送信
      await user.click(screen.getByRole('button', { name: /AI生成開始/ }));

      await waitFor(() => {
        expect(screen.getByText('エラーが発生しました')).toBeInTheDocument();
      });
    });
  });

  describe('下書き保存処理', () => {
    it('下書き保存が成功する', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <GoalInputPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/目標タイトル/)).toBeInTheDocument();
      });

      // フォームに部分的に入力
      await user.type(screen.getByLabelText(/目標タイトル/), 'テスト目標');

      // 下書き保存ボタンをクリック
      await user.click(screen.getByRole('button', { name: /下書き保存/ }));

      await waitFor(() => {
        expect(mockGoalFormService.saveDraft).toHaveBeenCalled();
      });

      // 成功メッセージが表示される
      expect(screen.getByText(/に保存しました/)).toBeInTheDocument();
    });

    it('下書き保存エラー時はエラーメッセージを表示する', async () => {
      const user = userEvent.setup();
      const errorMessage = '下書き保存に失敗しました';

      mockGoalFormService.saveDraft.mockRejectedValue(new Error(errorMessage));

      render(
        <TestWrapper>
          <GoalInputPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/目標タイトル/)).toBeInTheDocument();
      });

      // フォームに部分的に入力
      await user.type(screen.getByLabelText(/目標タイトル/), 'テスト目標');

      // 下書き保存ボタンをクリック
      await user.click(screen.getByRole('button', { name: /下書き保存/ }));

      await waitFor(() => {
        expect(screen.getByText('エラーが発生しました')).toBeInTheDocument();
      });
    });
  });

  describe('メッセージ表示機能', () => {
    it('エラーメッセージを閉じることができる', async () => {
      const user = userEvent.setup();

      mockGoalFormService.createGoal.mockRejectedValue(new Error('テストエラー'));

      render(
        <TestWrapper>
          <GoalInputPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/目標タイトル/)).toBeInTheDocument();
      });

      // エラーを発生させる
      await user.type(screen.getByLabelText(/目標タイトル/), 'テスト目標');
      await user.type(screen.getByLabelText(/目標説明/), 'テスト説明');
      await user.type(screen.getByLabelText(/達成期限/), '2024-12-31');
      await user.type(screen.getByLabelText(/背景/), 'テスト背景');
      await user.click(screen.getByRole('button', { name: /AI生成開始/ }));

      await waitFor(() => {
        expect(screen.getByText('エラーが発生しました')).toBeInTheDocument();
      });

      // エラーメッセージを閉じる
      await user.click(screen.getByText('閉じる'));

      expect(screen.queryByText('エラーが発生しました')).not.toBeInTheDocument();
    });

    it('成功メッセージを閉じることができる', async () => {
      mockGoalFormService.getDraft.mockResolvedValue({
        draftData: mockDraftData,
        savedAt: '2024-01-01T10:00:00Z',
        message: '下書きが復元されました',
      });

      const user = userEvent.setup();

      render(
        <TestWrapper>
          <GoalInputPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('下書きが復元されました')).toBeInTheDocument();
      });

      // 成功メッセージを閉じる
      await user.click(screen.getByText('閉じる'));

      expect(screen.queryByText('下書きが復元されました')).not.toBeInTheDocument();
    });

    it('成功メッセージは3秒後に自動で消える', async () => {
      vi.useFakeTimers();

      mockGoalFormService.getDraft.mockResolvedValue({
        draftData: mockDraftData,
        savedAt: '2024-01-01T10:00:00Z',
        message: '下書きが復元されました',
      });

      render(
        <TestWrapper>
          <GoalInputPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('下書きが復元されました')).toBeInTheDocument();
      });

      // 3秒経過
      vi.advanceTimersByTime(3000);

      await waitFor(() => {
        expect(screen.queryByText('下書きが復元されました')).not.toBeInTheDocument();
      });

      vi.useRealTimers();
    });
  });

  describe('ナビゲーション', () => {
    it('フォーム送信成功後に処理中画面に遷移する', async () => {
      vi.useFakeTimers();
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      render(
        <TestWrapper>
          <GoalInputPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/目標タイトル/)).toBeInTheDocument();
      });

      // フォームに入力
      await user.type(screen.getByLabelText(/目標タイトル/), 'テスト目標');
      await user.type(screen.getByLabelText(/目標説明/), 'テスト説明');
      await user.type(screen.getByLabelText(/達成期限/), '2024-12-31');
      await user.type(screen.getByLabelText(/背景/), 'テスト背景');

      // フォーム送信
      await user.click(screen.getByRole('button', { name: /AI生成開始/ }));

      // 2秒経過
      vi.advanceTimersByTime(2000);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(
          `/mandala/create/processing?processingId=${mockCreateGoalResponse.processingId}`,
          { replace: true }
        );
      });

      vi.useRealTimers();
    });

    it('ダッシュボードに戻るボタンが機能する', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <GoalInputPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('ダッシュボードに戻る')).toBeInTheDocument();
      });

      await user.click(screen.getByText('ダッシュボードに戻る'));

      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  describe('アクセシビリティ', () => {
    it('適切なARIA属性が設定されている', async () => {
      render(
        <TestWrapper>
          <GoalInputPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByRole('main')).toBeInTheDocument();
      });

      expect(screen.getByRole('banner')).toBeInTheDocument(); // header
      expect(screen.getByRole('main')).toBeInTheDocument(); // main
    });

    it('エラーメッセージが適切にアナウンスされる', async () => {
      const user = userEvent.setup();

      mockGoalFormService.createGoal.mockRejectedValue(new Error('テストエラー'));

      render(
        <TestWrapper>
          <GoalInputPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/目標タイトル/)).toBeInTheDocument();
      });

      // エラーを発生させる
      await user.type(screen.getByLabelText(/目標タイトル/), 'テスト目標');
      await user.type(screen.getByLabelText(/目標説明/), 'テスト説明');
      await user.type(screen.getByLabelText(/達成期限/), '2024-12-31');
      await user.type(screen.getByLabelText(/背景/), 'テスト背景');
      await user.click(screen.getByRole('button', { name: /AI生成開始/ }));

      await waitFor(() => {
        const errorAlert = screen.getByRole('alert', { hidden: true });
        expect(errorAlert).toBeInTheDocument();
      });
    });
  });

  describe('カスタムプロパティ', () => {
    it('カスタムクラス名が適用される', async () => {
      const { container } = render(
        <TestWrapper>
          <GoalInputPage className="custom-class" />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(container.firstChild).toHaveClass('custom-class');
      });
    });
  });
});
