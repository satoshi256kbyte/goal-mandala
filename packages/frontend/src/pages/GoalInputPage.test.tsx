import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { GoalInputPage } from './GoalInputPage';

// React Router のモック
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// 認証フックのモック
const mockUseAuth = {
  user: { id: 'user-1', name: 'テストユーザー', email: 'test@example.com' },
  isAuthenticated: true,
  isLoading: false,
};

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth,
}));

// GoalFormServiceのモック
vi.mock('../services/goalFormService', () => ({
  GoalFormService: {
    getDraft: vi.fn(),
    saveDraft: vi.fn(),
    deleteDraft: vi.fn(),
    createGoal: vi.fn(),
  },
  getErrorMessage: (error: Error) => error.message,
}));

// GoalFormProviderのモック
vi.mock('../contexts/GoalFormContext', () => ({
  GoalFormProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// GoalInputFormのモック
vi.mock('../components/forms/GoalInputForm', () => ({
  GoalInputForm: () => (
    <div data-testid="goal-input-form">
      <p>目標入力フォーム</p>
    </div>
  ),
}));

// テスト用のラッパーコンポーネント
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('GoalInputPage', () => {
  beforeEach(async () => {
    vi.clearAllMocks();

    // デフォルトのモック設定
    mockUseAuth.user = { id: 'user-1', name: 'テストユーザー', email: 'test@example.com' };
    mockUseAuth.isAuthenticated = true;
    mockUseAuth.isLoading = false;

    const { GoalFormService } = await import('../services/goalFormService');
    vi.mocked(GoalFormService.getDraft).mockResolvedValue({
      draftData: null,
    });
    vi.mocked(GoalFormService.saveDraft).mockResolvedValue({
      savedAt: new Date().toISOString(),
    });
    vi.mocked(GoalFormService.createGoal).mockResolvedValue({
      processingId: 'processing-123',
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.clearAllMocks();
  });

  describe('ページ表示', () => {
    it('ページが正しく表示される', async () => {
      await act(async () => {
        render(
          <TestWrapper>
            <GoalInputPage />
          </TestWrapper>
        );
      });

      await waitFor(
        () => {
          expect(screen.getByText('新しい目標を作成')).toBeInTheDocument();
          expect(screen.getByText('目標を入力してください')).toBeInTheDocument();
        },
        { timeout: 5000 }
      );
    });

    it('認証中はローディングが表示される', async () => {
      mockUseAuth.isLoading = true;
      mockUseAuth.isAuthenticated = false;

      await act(async () => {
        render(
          <TestWrapper>
            <GoalInputPage />
          </TestWrapper>
        );
      });

      expect(screen.getByText('認証状態を確認しています...')).toBeInTheDocument();
    });

    it('未認証の場合はリダイレクトメッセージが表示される', async () => {
      mockUseAuth.isLoading = false;
      mockUseAuth.isAuthenticated = false;

      await act(async () => {
        render(
          <TestWrapper>
            <GoalInputPage />
          </TestWrapper>
        );
      });

      expect(screen.getByText('ログインページに移動しています...')).toBeInTheDocument();
    });

    it('フォームが表示される', async () => {
      await act(async () => {
        render(
          <TestWrapper>
            <GoalInputPage />
          </TestWrapper>
        );
      });

      await waitFor(
        () => {
          expect(screen.getByTestId('goal-input-form')).toBeInTheDocument();
        },
        { timeout: 5000 }
      );
    });
  });

  describe('ナビゲーション', () => {
    it('ダッシュボードに戻るボタンが表示される', async () => {
      await act(async () => {
        render(
          <TestWrapper>
            <GoalInputPage />
          </TestWrapper>
        );
      });

      await waitFor(
        () => {
          expect(screen.getByRole('button', { name: 'ダッシュボードに戻る' })).toBeInTheDocument();
        },
        { timeout: 5000 }
      );
    });

    it('ダッシュボードに戻るボタンをクリックするとナビゲートされる', async () => {
      const user = userEvent.setup();

      await act(async () => {
        render(
          <TestWrapper>
            <GoalInputPage />
          </TestWrapper>
        );
      });

      await waitFor(
        () => {
          expect(screen.getByRole('button', { name: 'ダッシュボードに戻る' })).toBeInTheDocument();
        },
        { timeout: 5000 }
      );

      const dashboardButton = screen.getByRole('button', { name: 'ダッシュボードに戻る' });
      await act(async () => {
        await user.click(dashboardButton);
      });

      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });
});
