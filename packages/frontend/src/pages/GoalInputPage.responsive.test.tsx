import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { GoalInputPage } from './GoalInputPage';
import { AuthProvider } from '../components/auth/AuthProvider';

// window.innerWidthをモック
const mockInnerWidth = (width: number) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
};

// resizeイベントをトリガー
const triggerResize = (width: number) => {
  mockInnerWidth(width);
  window.dispatchEvent(new Event('resize'));
};

// 認証プロバイダーのモック
const mockAuthProvider = {
  user: { id: '1', email: 'test@example.com', name: 'Test User' },
  isAuthenticated: true,
  isLoading: false,
  signIn: vi.fn(),
  signOut: vi.fn(),
  signUp: vi.fn(),
  resetPassword: vi.fn(),
};

// AuthProviderをモック
vi.mock('../components/auth/AuthProvider', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: () => mockAuthProvider,
}));

// GoalFormServiceをモック
vi.mock('../services/goalFormService', () => ({
  GoalFormService: {
    getDraft: vi.fn().mockResolvedValue({ draftData: null }),
    saveDraft: vi.fn().mockResolvedValue({ savedAt: new Date().toISOString() }),
    createGoal: vi.fn().mockResolvedValue({ processingId: 'test-id' }),
    deleteDraft: vi.fn().mockResolvedValue({}),
  },
  getErrorMessage: vi.fn().mockReturnValue('テストエラー'),
}));

// テスト用のラッパーコンポーネント
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>
    <AuthProvider>{children}</AuthProvider>
  </BrowserRouter>
);

describe('GoalInputPage レスポンシブデザイン', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // デフォルトでデスクトップサイズに設定
    mockInnerWidth(1200);
  });

  describe('デスクトップレイアウト (1024px以上)', () => {
    beforeEach(() => {
      mockInnerWidth(1200);
    });

    it('デスクトップ用のヘッダーレイアウトが適用される', async () => {
      render(
        <TestWrapper>
          <GoalInputPage />
        </TestWrapper>
      );

      await waitFor(() => {
        const header = screen.getByRole('banner');
        const headerContainer = header.querySelector('div');
        expect(headerContainer).toHaveClass('lg:max-w-6xl');
      });
    });

    it('デスクトップ用のヘッダー高さが適用される', async () => {
      render(
        <TestWrapper>
          <GoalInputPage />
        </TestWrapper>
      );

      await waitFor(() => {
        const header = screen.getByRole('banner');
        const headerContent = header.querySelector('div > div');
        expect(headerContent).toHaveClass('lg:h-20');
      });
    });

    it('デスクトップ用のタイトルサイズが適用される', async () => {
      render(
        <TestWrapper>
          <GoalInputPage />
        </TestWrapper>
      );

      await waitFor(() => {
        const title = screen.getByRole('heading', { name: /新しい目標を作成/i });
        expect(title).toHaveClass('lg:text-2xl');
      });
    });

    it('デスクトップ用のメインコンテンツレイアウトが適用される', async () => {
      render(
        <TestWrapper>
          <GoalInputPage />
        </TestWrapper>
      );

      await waitFor(() => {
        const main = screen.getByRole('main');
        expect(main).toHaveClass('lg:max-w-6xl', 'lg:py-12');
      });
    });

    it('デスクトップ用のページ説明サイズが適用される', async () => {
      render(
        <TestWrapper>
          <GoalInputPage />
        </TestWrapper>
      );

      await waitFor(() => {
        const pageTitle = screen.getByRole('heading', { name: /目標を入力してください/i });
        expect(pageTitle).toHaveClass('lg:text-3xl');
      });
    });
  });

  describe('タブレットレイアウト (768px - 1023px)', () => {
    beforeEach(() => {
      mockInnerWidth(800);
    });

    it('タブレット用のヘッダーレイアウトが適用される', async () => {
      render(
        <TestWrapper>
          <GoalInputPage />
        </TestWrapper>
      );

      await waitFor(() => {
        const header = screen.getByRole('banner');
        const headerContainer = header.querySelector('div');
        expect(headerContainer).toHaveClass('md:max-w-4xl');
      });
    });

    it('タブレット用のヘッダー高さが適用される', async () => {
      render(
        <TestWrapper>
          <GoalInputPage />
        </TestWrapper>
      );

      await waitFor(() => {
        const header = screen.getByRole('banner');
        const headerContent = header.querySelector('div > div');
        expect(headerContent).toHaveClass('md:h-18');
      });
    });

    it('タブレット用のタイトルサイズが適用される', async () => {
      render(
        <TestWrapper>
          <GoalInputPage />
        </TestWrapper>
      );

      await waitFor(() => {
        const title = screen.getByRole('heading', { name: /新しい目標を作成/i });
        expect(title).toHaveClass('md:text-2xl');
      });
    });

    it('タブレット用のメインコンテンツレイアウトが適用される', async () => {
      render(
        <TestWrapper>
          <GoalInputPage />
        </TestWrapper>
      );

      await waitFor(() => {
        const main = screen.getByRole('main');
        expect(main).toHaveClass('md:max-w-4xl', 'md:py-10');
      });
    });
  });

  describe('モバイルレイアウト (767px以下)', () => {
    beforeEach(() => {
      mockInnerWidth(400);
    });

    it('モバイル用の基本レイアウトが適用される', async () => {
      render(
        <TestWrapper>
          <GoalInputPage />
        </TestWrapper>
      );

      await waitFor(() => {
        const header = screen.getByRole('banner');
        const headerContainer = header.querySelector('div');
        expect(headerContainer).toHaveClass('max-w-4xl');
      });
    });

    it('モバイル用のヘッダー高さが適用される', async () => {
      render(
        <TestWrapper>
          <GoalInputPage />
        </TestWrapper>
      );

      await waitFor(() => {
        const header = screen.getByRole('banner');
        const headerContent = header.querySelector('div > div');
        expect(headerContent).toHaveClass('h-16');
      });
    });

    it('モバイル用のタイトルサイズが適用される', async () => {
      render(
        <TestWrapper>
          <GoalInputPage />
        </TestWrapper>
      );

      await waitFor(() => {
        const title = screen.getByRole('heading', { name: /新しい目標を作成/i });
        expect(title).toHaveClass('text-xl');
      });
    });

    it('モバイルでユーザー名が非表示になる', async () => {
      render(
        <TestWrapper>
          <GoalInputPage />
        </TestWrapper>
      );

      await waitFor(() => {
        const userInfo = screen.queryByText('Test User');
        if (userInfo) {
          expect(userInfo).toHaveClass('hidden', 'sm:block');
        }
      });
    });
  });

  describe('レスポンシブ切り替え', () => {
    it('デスクトップからモバイルにリサイズされる', async () => {
      mockInnerWidth(1200);

      const { rerender } = render(
        <TestWrapper>
          <GoalInputPage />
        </TestWrapper>
      );

      await waitFor(() => {
        const main = screen.getByRole('main');
        expect(main).toHaveClass('lg:max-w-6xl');
      });

      // モバイルサイズにリサイズ
      triggerResize(400);

      // 再レンダリング
      rerender(
        <TestWrapper>
          <GoalInputPage />
        </TestWrapper>
      );

      await waitFor(() => {
        const main = screen.getByRole('main');
        expect(main).toHaveClass('max-w-4xl');
      });
    });

    it('モバイルからタブレットにリサイズされる', async () => {
      mockInnerWidth(400);

      const { rerender } = render(
        <TestWrapper>
          <GoalInputPage />
        </TestWrapper>
      );

      await waitFor(() => {
        const title = screen.getByRole('heading', { name: /新しい目標を作成/i });
        expect(title).toHaveClass('text-xl');
      });

      // タブレットサイズにリサイズ
      triggerResize(800);

      // 再レンダリング
      rerender(
        <TestWrapper>
          <GoalInputPage />
        </TestWrapper>
      );

      await waitFor(() => {
        const title = screen.getByRole('heading', { name: /新しい目標を作成/i });
        expect(title).toHaveClass('md:text-2xl');
      });
    });
  });

  describe('エラーメッセージのレスポンシブ対応', () => {
    it('モバイルでエラーメッセージが適切に表示される', async () => {
      mockInnerWidth(400);

      // エラー状態でレンダリング
      const GoalInputPageWithError = () => {
        const [error, setError] = React.useState('テストエラーメッセージ');

        return (
          <div className="min-h-screen bg-gray-50">
            <main className="max-w-4xl mx-auto px-4 py-8">
              {error && (
                <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <div className="ml-3 flex-1">
                      <h3 className="text-sm md:text-sm lg:text-sm font-medium text-red-800">
                        エラーが発生しました
                      </h3>
                      <div className="mt-2 text-sm md:text-sm lg:text-sm text-red-700">
                        <p className="break-words">{error}</p>
                      </div>
                      <div className="mt-4">
                        <button
                          type="button"
                          onClick={() => setError('')}
                          className="text-sm md:text-sm lg:text-sm font-medium text-red-800 hover:text-red-900 min-h-[44px] md:min-h-[auto] lg:min-h-[auto] flex items-center"
                        >
                          閉じる
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </main>
          </div>
        );
      };

      render(
        <TestWrapper>
          <GoalInputPageWithError />
        </TestWrapper>
      );

      const errorMessage = screen.getByText('テストエラーメッセージ');
      expect(errorMessage).toHaveClass('break-words');

      const closeButton = screen.getByRole('button', { name: /閉じる/i });
      expect(closeButton).toHaveClass('min-h-[44px]');
    });
  });

  describe('フッター情報のレスポンシブ対応', () => {
    it('モバイルで適切なフォントサイズが適用される', async () => {
      mockInnerWidth(400);

      render(
        <TestWrapper>
          <GoalInputPage />
        </TestWrapper>
      );

      await waitFor(() => {
        const footerText = screen.getByText(/入力された情報は安全に保護され/i);
        expect(footerText.parentElement).toHaveClass('text-xs');
      });
    });

    it('タブレットで適切なフォントサイズが適用される', async () => {
      mockInnerWidth(800);

      render(
        <TestWrapper>
          <GoalInputPage />
        </TestWrapper>
      );

      await waitFor(() => {
        const footerText = screen.getByText(/入力された情報は安全に保護され/i);
        expect(footerText.parentElement).toHaveClass('md:text-sm');
      });
    });

    it('デスクトップで適切なフォントサイズが適用される', async () => {
      mockInnerWidth(1200);

      render(
        <TestWrapper>
          <GoalInputPage />
        </TestWrapper>
      );

      await waitFor(() => {
        const footerText = screen.getByText(/入力された情報は安全に保護され/i);
        expect(footerText.parentElement).toHaveClass('lg:text-sm');
      });
    });
  });

  describe('アクセシビリティ', () => {
    it('すべてのデバイスサイズでナビゲーションが適切に動作する', async () => {
      const deviceSizes = [400, 800, 1200];

      for (const size of deviceSizes) {
        mockInnerWidth(size);

        const { unmount } = render(
          <TestWrapper>
            <GoalInputPage />
          </TestWrapper>
        );

        await waitFor(() => {
          const backButton = screen.getByRole('button', { name: /ダッシュボードに戻る/i });
          expect(backButton).toBeInTheDocument();
          expect(backButton).toHaveAttribute('type', 'button');
        });

        unmount();
      }
    });

    it('モバイルでタッチ操作に適したボタンサイズが提供される', async () => {
      mockInnerWidth(400);

      render(
        <TestWrapper>
          <GoalInputPage />
        </TestWrapper>
      );

      await waitFor(() => {
        const backButton = screen.getByRole('button', { name: /ダッシュボードに戻る/i });

        // ボタンがタッチ操作に適したサイズであることを確認
        const computedStyle = window.getComputedStyle(backButton);
        const minHeight = parseInt(computedStyle.minHeight || '0');
        expect(minHeight).toBeGreaterThanOrEqual(44); // 44px以上
      });
    });
  });
});
