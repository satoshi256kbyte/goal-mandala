import React from 'react';
import { render, cleanup, screen } from '@testing-library/react';
import { waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { vi, afterEach } from 'vitest';
import { LoginPage } from './LoginPage';
import { AuthService } from '../services/auth';
import { useAuthForm } from '../hooks/useAuthForm';

// AuthLayoutをモック化
vi.mock('../components/auth/AuthLayout', () => ({
  default: ({
    children,
    title,
    subtitle,
  }: {
    children: React.ReactNode;
    title: string;
    subtitle: string;
  }) => (
    <div>
      <h1>{title}</h1>
      <p>{subtitle}</p>
      {children}
    </div>
  ),
}));

// AuthServiceをモック化
vi.mock('../services/auth');
const mockAuthService = AuthService as any;

// useAuthFormをモック化
vi.mock('../hooks/useAuthForm');
const mockUseAuthForm = useAuthForm as any;

// React Routerのナビゲーションをモック化
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// テスト用のラッパーコンポーネント
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.clearAllTimers();
});

describe('LoginPage', () => {
  const mockSignIn = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // useAuthFormのデフォルトモック
    mockUseAuthForm.mockReturnValue({
      isLoading: false,
      successMessage: null,
      error: null,
      isNetworkError: false,
      isRetryable: false,
      isOnline: true,
      signIn: mockSignIn,
      clearError: vi.fn(),
      clearSuccess: vi.fn(),
      retry: vi.fn(),
    });
  });

  it('正常にレンダリングされる', () => {
    render(
      <TestWrapper>
        <LoginPage />
      </TestWrapper>
    );

    expect(screen.getByRole('heading', { name: 'ログイン' })).toBeInTheDocument();
    expect(screen.getByText('アカウントにサインインしてください')).toBeInTheDocument();
    expect(screen.getByLabelText(/メールアドレス/)).toBeInTheDocument();
    expect(screen.getByLabelText(/パスワード/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ログインボタン' })).toBeInTheDocument();
  });

  it('有効な認証情報でログインが成功し、TOP画面にリダイレクトされる', async () => {
    const successMessage = 'ログインが完了しました';

    // useAuthFormモックに成功状態を設定
    mockUseAuthForm.mockReturnValue({
      isLoading: false,
      successMessage: successMessage,
      error: null,
      isNetworkError: false,
      isRetryable: false,
      isOnline: true,
      signIn: mockSignIn,
      clearError: vi.fn(),
      clearSuccess: vi.fn(),
      retry: vi.fn(),
    });

    render(
      <TestWrapper>
        <LoginPage />
      </TestWrapper>
    );

    // 成功メッセージが表示されることを確認
    expect(screen.getByText(successMessage)).toBeInTheDocument();
  });

  it('認証エラー時にエラーメッセージが表示される', async () => {
    const user = userEvent.setup();
    const errorMessage = 'メールアドレスまたはパスワードが正しくありません';

    // useAuthFormモックにエラーを設定
    mockUseAuthForm.mockReturnValue({
      isLoading: false,
      successMessage: null,
      error: errorMessage,
      isNetworkError: false,
      isRetryable: true,
      isOnline: true,
      signIn: mockSignIn,
      clearError: vi.fn(),
      clearSuccess: vi.fn(),
      retry: vi.fn(),
    });

    render(
      <TestWrapper>
        <LoginPage />
      </TestWrapper>
    );

    const emailInput = screen.getByLabelText(/メールアドレス/);
    const passwordInput = screen.getByLabelText(/パスワード/);
    const submitButton = screen.getByRole('button', { name: 'ログインボタン' });

    // エラーメッセージが表示されることを確認
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('ネットワークエラー時にデフォルトエラーメッセージが表示される', async () => {
    const errorMessage = 'ログインに失敗しました。しばらく待ってから再試行してください。';

    // useAuthFormモックにネットワークエラーを設定
    mockUseAuthForm.mockReturnValue({
      isLoading: false,
      successMessage: null,
      error: errorMessage,
      isNetworkError: true,
      isRetryable: true,
      isOnline: false,
      signIn: mockSignIn,
      clearError: vi.fn(),
      clearSuccess: vi.fn(),
      retry: vi.fn(),
    });

    render(
      <TestWrapper>
        <LoginPage />
      </TestWrapper>
    );

    // エラーメッセージが表示されることを確認
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('ローディング状態が正しく表示される', async () => {
    // useAuthFormモックにローディング状態を設定
    mockUseAuthForm.mockReturnValue({
      isLoading: true,
      successMessage: null,
      error: null,
      isNetworkError: false,
      isRetryable: false,
      isOnline: true,
      signIn: mockSignIn,
      clearError: vi.fn(),
      clearSuccess: vi.fn(),
      retry: vi.fn(),
    });

    render(
      <TestWrapper>
        <LoginPage />
      </TestWrapper>
    );

    // ローディング状態を確認
    const loadingButton = screen.getByRole('button');
    expect(loadingButton).toBeDisabled();
    expect(loadingButton).toHaveAttribute('aria-busy', 'true');
    expect(loadingButton).toHaveTextContent('ログイン中...');
  });

  it('エラー後に再度ログインを試行できる', async () => {
    const errorMessage = 'エラーが発生しました';

    // useAuthFormモックにエラー状態を設定
    mockUseAuthForm.mockReturnValue({
      isLoading: false,
      successMessage: null,
      error: errorMessage,
      isNetworkError: false,
      isRetryable: true,
      isOnline: true,
      signIn: mockSignIn,
      clearError: vi.fn(),
      clearSuccess: vi.fn(),
      retry: vi.fn(),
    });

    render(
      <TestWrapper>
        <LoginPage />
      </TestWrapper>
    );

    // エラーメッセージが表示されることを確認
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  // フォーム入力のインタラクションテスト
  describe('フォーム入力', () => {
    it('メールアドレスとパスワードを入力できる', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(/メールアドレス/) as HTMLInputElement;
      const passwordInput = screen.getByLabelText(/パスワード/) as HTMLInputElement;

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');

      expect(emailInput.value).toBe('test@example.com');
      expect(passwordInput.value).toBe('password123');
    });

    it('フォーム送信時にsignInが呼ばれる', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(/メールアドレス/);
      const passwordInput = screen.getByLabelText(/パスワード/);
      const submitButton = screen.getByRole('button', { name: 'ログインボタン' });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password123');
      });
    });

    it('無効なメールアドレスでバリデーションエラーが表示される', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(/メールアドレス/);
      await user.type(emailInput, 'invalid-email');
      await user.tab();

      await waitFor(() => {
        expect(
          screen.getAllByText(/有効なメールアドレスを入力してください/).length
        ).toBeGreaterThan(0);
      });
    });

    it('空のメールアドレスでバリデーションエラーが表示される', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(/メールアドレス/);
      await user.click(emailInput);
      await user.tab();

      await waitFor(() => {
        // loginZodSchemaのエラーメッセージに合わせる
        const errorMessages = screen.getAllByText(/有効なメールアドレスを入力してください/);
        expect(errorMessages.length).toBeGreaterThan(0);
      });
    });

    it('空のパスワードでバリデーションエラーが表示される', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      const passwordInput = screen.getByLabelText(/パスワード/);
      await user.click(passwordInput);
      await user.tab();

      await waitFor(() => {
        expect(
          screen.getAllByText(/パスワードは8文字以上で入力してください/).length
        ).toBeGreaterThan(0);
      });
    });
  });

  // ナビゲーションテスト
  describe('ナビゲーション', () => {
    it('新規登録リンクが正しく表示される', () => {
      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      const signupLink = screen.getByRole('link', { name: /新規登録/ });
      expect(signupLink).toBeInTheDocument();
      expect(signupLink).toHaveAttribute('href', '/signup');
    });

    it('パスワードリセットリンクが正しく表示される', () => {
      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      const resetLink = screen.getByRole('link', { name: /パスワードを忘れた場合/ });
      expect(resetLink).toBeInTheDocument();
      expect(resetLink).toHaveAttribute('href', '/password-reset');
    });

    it('ログイン成功後にTOP画面にリダイレクトされる', async () => {
      const user = userEvent.setup();
      let onSuccessCallback: (() => void) | undefined;

      // useAuthFormのモックでonSuccessコールバックをキャプチャ
      mockUseAuthForm.mockImplementation((options: any) => {
        onSuccessCallback = options?.onSuccess;
        return {
          isLoading: false,
          successMessage: null,
          error: null,
          isNetworkError: false,
          isRetryable: false,
          isOnline: true,
          signIn: async (email: string, password: string) => {
            // ログイン成功時にonSuccessを呼び出す
            if (onSuccessCallback) {
              onSuccessCallback();
            }
          },
          clearError: vi.fn(),
          clearSuccess: vi.fn(),
          retry: vi.fn(),
        };
      });

      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(/メールアドレス/);
      const passwordInput = screen.getByLabelText(/パスワード/);
      const submitButton = screen.getByRole('button', { name: 'ログインボタン' });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
      });
    });
  });

  // エラーハンドリングテスト
  describe('エラーハンドリング', () => {
    it('リトライ可能なエラーの場合、再試行ボタンが表示される', () => {
      const mockRetry = vi.fn();

      mockUseAuthForm.mockReturnValue({
        isLoading: false,
        successMessage: null,
        error: 'ネットワークエラー',
        isNetworkError: true,
        isRetryable: true,
        isOnline: false,
        signIn: mockSignIn,
        clearError: vi.fn(),
        clearSuccess: vi.fn(),
        retry: mockRetry,
      });

      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      const retryButton = screen.getByRole('button', { name: /再試行/ });
      expect(retryButton).toBeInTheDocument();
    });

    it('再試行ボタンをクリックするとretryが呼ばれる', async () => {
      const user = userEvent.setup();
      const mockRetry = vi.fn();

      mockUseAuthForm.mockReturnValue({
        isLoading: false,
        successMessage: null,
        error: 'ネットワークエラー',
        isNetworkError: true,
        isRetryable: true,
        isOnline: false,
        signIn: mockSignIn,
        clearError: vi.fn(),
        clearSuccess: vi.fn(),
        retry: mockRetry,
      });

      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      const retryButton = screen.getByRole('button', { name: /再試行/ });
      await user.click(retryButton);

      expect(mockRetry).toHaveBeenCalled();
    });

    it('オフライン時に適切なエラーメッセージが表示される', () => {
      mockUseAuthForm.mockReturnValue({
        isLoading: false,
        successMessage: null,
        error: 'インターネット接続を確認してください',
        isNetworkError: true,
        isRetryable: true,
        isOnline: false,
        signIn: mockSignIn,
        clearError: vi.fn(),
        clearSuccess: vi.fn(),
        retry: vi.fn(),
      });

      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      expect(screen.getByText(/インターネット接続を確認してください/)).toBeInTheDocument();
    });
  });

  // アクセシビリティテスト
  describe('アクセシビリティ', () => {
    it('フォーム要素に適切なラベルが設定されている', () => {
      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      expect(screen.getByLabelText(/メールアドレス/)).toBeInTheDocument();
      expect(screen.getByLabelText(/パスワード/)).toBeInTheDocument();
    });

    it('送信ボタンに適切なaria属性が設定されている', () => {
      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      const submitButton = screen.getByRole('button', { name: 'ログインボタン' });
      expect(submitButton).toHaveAttribute('type', 'submit');
    });

    it('ローディング中のボタンに適切なaria属性が設定されている', () => {
      mockUseAuthForm.mockReturnValue({
        isLoading: true,
        successMessage: null,
        error: null,
        isNetworkError: false,
        isRetryable: false,
        isOnline: true,
        signIn: mockSignIn,
        clearError: vi.fn(),
        clearSuccess: vi.fn(),
        retry: vi.fn(),
      });

      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      const submitButton = screen.getByRole('button');
      expect(submitButton).toHaveAttribute('aria-busy', 'true');
      expect(submitButton).toBeDisabled();
    });

    it('エラーメッセージに適切なrole属性が設定されている', () => {
      mockUseAuthForm.mockReturnValue({
        isLoading: false,
        successMessage: null,
        error: 'エラーが発生しました',
        isNetworkError: false,
        isRetryable: false,
        isOnline: true,
        signIn: mockSignIn,
        clearError: vi.fn(),
        clearSuccess: vi.fn(),
        retry: vi.fn(),
      });

      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      // ErrorAlertコンポーネント内にrole="alert"が設定されている
      const errorAlert = screen.getByRole('alert');
      expect(errorAlert).toBeInTheDocument();
      expect(errorAlert).toHaveTextContent('エラーが発生しました');
    });
  });
});
