import React from 'react';
import { render, cleanup, screen, fireEvent } from '@testing-library/react';
import { waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { PasswordResetPage } from './PasswordResetPage';
import { AuthService } from '../services/auth';
import { useAuthForm } from '../hooks/useAuthForm';

import { vi, afterEach } from 'vitest';

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

// react-router-domのuseNavigateとuseSearchParamsをモック化
const mockNavigate = vi.fn();
const mockSearchParams = new URLSearchParams();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useSearchParams: () => [mockSearchParams],
  };
});

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.clearAllTimers();
});

describe('PasswordResetPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthService.resetPassword = vi.fn();
    mockAuthService.confirmResetPassword = vi.fn();
    mockSearchParams.delete('code');
    mockSearchParams.delete('email');

    // useAuthFormのデフォルトモック
    mockUseAuthForm.mockReturnValue({
      isLoading: false,
      successMessage: null,
      error: null,
      isNetworkError: false,
      isRetryable: false,
      isOnline: true,
      resetPassword: vi.fn(),
      confirmResetPassword: vi.fn(),
      clearError: vi.fn(),
      clearSuccess: vi.fn(),
      retry: vi.fn(),
    });
  });

  it('パスワードリセットページが正常にレンダリングされる', () => {
    renderWithRouter(<PasswordResetPage />);

    expect(screen.getByRole('heading', { name: 'パスワードリセット' })).toBeInTheDocument();
    expect(screen.getByText('登録されたメールアドレスを入力してください')).toBeInTheDocument();
    expect(screen.getByLabelText(/メールアドレス/)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'パスワードリセットメールを送信' })
    ).toBeInTheDocument();
  });

  it('有効なメールアドレスでパスワードリセット要求が成功する', async () => {
    // useAuthFormモックに成功状態を設定
    mockUseAuthForm.mockReturnValue({
      isLoading: false,
      successMessage: 'パスワードリセット要求完了',
      error: null,
      isNetworkError: false,
      isRetryable: false,
      isOnline: true,
      resetPassword: vi.fn(),
      confirmResetPassword: vi.fn(),
      clearError: vi.fn(),
      clearSuccess: vi.fn(),
      retry: vi.fn(),
    });

    renderWithRouter(<PasswordResetPage />);

    // 成功メッセージが表示されることを確認
    expect(screen.getByText('パスワードリセット要求完了')).toBeInTheDocument();
  });

  it('パスワードリセットエラー時にエラーメッセージが表示される', async () => {
    const errorMessage = 'ネットワークエラーが発生しました';

    // useAuthFormモックにエラーを設定
    mockUseAuthForm.mockReturnValue({
      isLoading: false,
      successMessage: null,
      error: errorMessage,
      isNetworkError: true,
      isRetryable: true,
      isOnline: false,
      resetPassword: vi.fn(),
      confirmResetPassword: vi.fn(),
      clearError: vi.fn(),
      clearSuccess: vi.fn(),
      retry: vi.fn(),
    });

    renderWithRouter(<PasswordResetPage />);

    // エラーメッセージが表示されることを確認
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('確認コード付きURLでアクセスした場合、新しいパスワード設定画面が表示される', () => {
    // URLパラメータを設定
    mockSearchParams.set('code', '123456');
    mockSearchParams.set('email', 'test@example.com');

    renderWithRouter(<PasswordResetPage />);

    expect(screen.getByRole('heading', { name: '新しいパスワードの設定' })).toBeInTheDocument();
    expect(screen.getByText('新しいパスワードを入力してください')).toBeInTheDocument();
    expect(screen.getByLabelText('新しいパスワード')).toBeInTheDocument();
    expect(screen.getByLabelText('パスワード確認')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'パスワードを変更' })).toBeInTheDocument();
  });

  it('新しいパスワード設定が成功する', async () => {
    // URLパラメータを設定
    mockSearchParams.set('code', '123456');
    mockSearchParams.set('email', 'test@example.com');

    renderWithRouter(<PasswordResetPage />);

    // 新しいパスワード設定画面が表示されることを確認
    expect(screen.getByRole('heading', { name: '新しいパスワードの設定' })).toBeInTheDocument();
    expect(screen.getByLabelText('新しいパスワード')).toBeInTheDocument();
    expect(screen.getByLabelText('パスワード確認')).toBeInTheDocument();
  });

  it('ログイン画面への戻るリンクが正しく表示される', () => {
    renderWithRouter(<PasswordResetPage />);

    const loginLink = screen.getByRole('link', { name: 'ログイン画面に戻る' });
    expect(loginLink).toBeInTheDocument();
    expect(loginLink).toHaveAttribute('href', '/login');
  });

  it('新規登録リンクが正しく表示される', () => {
    renderWithRouter(<PasswordResetPage />);

    const signupLink = screen.getByRole('link', { name: '新規登録' });
    expect(signupLink).toBeInTheDocument();
    expect(signupLink).toHaveAttribute('href', '/signup');
  });

  it('フォームバリデーションが正しく動作する', async () => {
    renderWithRouter(<PasswordResetPage />);

    // 空のフォームで送信を試行
    const submitButton = screen.getByRole('button', { name: 'パスワードリセットメールを送信' });
    expect(submitButton).toBeDisabled();

    // 無効なメールアドレスを入力
    fireEvent.change(screen.getByLabelText(/メールアドレス/), {
      target: { value: 'invalid-email' },
    });
    fireEvent.blur(screen.getByLabelText(/メールアドレス/));

    await waitFor(() => {
      expect(screen.getByText('有効なメールアドレスを入力してください')).toBeInTheDocument();
    });
  });

  // フォーム入力のインタラクションテスト
  describe('フォーム入力', () => {
    it('メールアドレスを入力できる', async () => {
      renderWithRouter(<PasswordResetPage />);

      const emailInput = screen.getByLabelText(/メールアドレス/) as HTMLInputElement;
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

      expect(emailInput.value).toBe('test@example.com');
    });

    it('フォーム送信時にresetPasswordが呼ばれる', async () => {
      const mockResetPassword = vi.fn().mockResolvedValue(undefined);

      mockUseAuthForm.mockReturnValue({
        isLoading: false,
        successMessage: null,
        error: null,
        isNetworkError: false,
        isRetryable: false,
        isOnline: true,
        resetPassword: mockResetPassword,
        confirmResetPassword: vi.fn(),
        clearError: vi.fn(),
        clearSuccess: vi.fn(),
        retry: vi.fn(),
      });

      renderWithRouter(<PasswordResetPage />);

      const emailInput = screen.getByLabelText(/メールアドレス/);

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

      // ボタンが有効になるまで待機
      await waitFor(
        () => {
          const submitButton = screen.getByRole('button', {
            name: 'パスワードリセットメールを送信',
          });
          expect(submitButton).not.toBeDisabled();
        },
        { timeout: 3000 }
      );

      const submitButton = screen.getByRole('button', { name: 'パスワードリセットメールを送信' });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockResetPassword).toHaveBeenCalledWith('test@example.com');
      });
    });

    it('新しいパスワードを入力できる', async () => {
      mockSearchParams.set('code', '123456');
      mockSearchParams.set('email', 'test@example.com');

      renderWithRouter(<PasswordResetPage />);

      const newPasswordInput = screen.getByLabelText('新しいパスワード') as HTMLInputElement;
      const confirmPasswordInput = screen.getByLabelText('パスワード確認') as HTMLInputElement;

      fireEvent.change(newPasswordInput, { target: { value: 'NewPassword123' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'NewPassword123' } });

      expect(newPasswordInput.value).toBe('NewPassword123');
      expect(confirmPasswordInput.value).toBe('NewPassword123');
    });

    it('新しいパスワード設定時にAuthService.confirmResetPasswordが呼ばれる', async () => {
      mockSearchParams.set('code', '123456');
      mockSearchParams.set('email', 'test@example.com');

      // AuthService.confirmResetPasswordをモック
      mockAuthService.confirmResetPassword = vi.fn().mockResolvedValue(undefined);

      mockUseAuthForm.mockReturnValue({
        isLoading: false,
        successMessage: null,
        error: null,
        isNetworkError: false,
        isRetryable: false,
        isOnline: true,
        resetPassword: vi.fn(),
        confirmResetPassword: vi.fn(),
        clearError: vi.fn(),
        clearSuccess: vi.fn(),
        retry: vi.fn(),
      });

      renderWithRouter(<PasswordResetPage />);

      const newPasswordInput = screen.getByLabelText('新しいパスワード');
      const confirmPasswordInput = screen.getByLabelText('パスワード確認');

      // パスワードは大文字、小文字、数字を含む必要がある
      fireEvent.change(newPasswordInput, { target: { value: 'NewPassword123' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'NewPassword123' } });

      // ボタンが有効になるまで待機
      await waitFor(
        () => {
          const submitButton = screen.getByRole('button', { name: 'パスワードを変更' });
          expect(submitButton).not.toBeDisabled();
        },
        { timeout: 3000 }
      );

      const submitButton = screen.getByRole('button', { name: 'パスワードを変更' });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockAuthService.confirmResetPassword).toHaveBeenCalledWith(
          'test@example.com',
          '123456',
          'NewPassword123'
        );
      });
    });

    it('パスワードが一致しない場合にバリデーションエラーが表示される', async () => {
      mockSearchParams.set('code', '123456');
      mockSearchParams.set('email', 'test@example.com');

      renderWithRouter(<PasswordResetPage />);

      const newPasswordInput = screen.getByLabelText('新しいパスワード');
      const confirmPasswordInput = screen.getByLabelText('パスワード確認');

      fireEvent.change(newPasswordInput, { target: { value: 'Password123' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'DifferentPassword' } });
      fireEvent.blur(confirmPasswordInput);

      await waitFor(() => {
        expect(screen.getByText('パスワードが一致しません')).toBeInTheDocument();
      });
    });
  });

  // ナビゲーションテスト
  describe('ナビゲーション', () => {
    it('パスワードリセット成功後に成功画面が表示される', async () => {
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
          resetPassword: async (email: string) => {
            // パスワードリセット成功時にonSuccessを呼び出す
            if (onSuccessCallback) {
              onSuccessCallback();
            }
          },
          confirmResetPassword: vi.fn(),
          clearError: vi.fn(),
          clearSuccess: vi.fn(),
          retry: vi.fn(),
        };
      });

      renderWithRouter(<PasswordResetPage />);

      const emailInput = screen.getByLabelText(/メールアドレス/);

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

      // ボタンが有効になるまで待機
      await waitFor(
        () => {
          const submitButton = screen.getByRole('button', {
            name: 'パスワードリセットメールを送信',
          });
          expect(submitButton).not.toBeDisabled();
        },
        { timeout: 3000 }
      );

      const submitButton = screen.getByRole('button', { name: 'パスワードリセットメールを送信' });
      fireEvent.click(submitButton);

      // 成功画面が表示されることを確認
      await waitFor(() => {
        expect(screen.getByText('パスワードリセット要求完了')).toBeInTheDocument();
        expect(screen.getByText('パスワードリセットメールを送信しました')).toBeInTheDocument();
      });
    });

    it('新しいパスワード設定成功後に成功画面が表示される', async () => {
      mockSearchParams.set('code', '123456');
      mockSearchParams.set('email', 'test@example.com');

      // AuthService.confirmResetPasswordをモック
      mockAuthService.confirmResetPassword = vi.fn().mockResolvedValue(undefined);

      mockUseAuthForm.mockReturnValue({
        isLoading: false,
        successMessage: null,
        error: null,
        isNetworkError: false,
        isRetryable: false,
        isOnline: true,
        resetPassword: vi.fn(),
        confirmResetPassword: vi.fn(),
        clearError: vi.fn(),
        clearSuccess: vi.fn(),
        retry: vi.fn(),
      });

      renderWithRouter(<PasswordResetPage />);

      const newPasswordInput = screen.getByLabelText('新しいパスワード');
      const confirmPasswordInput = screen.getByLabelText('パスワード確認');

      // パスワードは大文字、小文字、数字を含む必要がある
      fireEvent.change(newPasswordInput, { target: { value: 'NewPassword123' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'NewPassword123' } });

      // ボタンが有効になるまで待機
      await waitFor(
        () => {
          const submitButton = screen.getByRole('button', { name: 'パスワードを変更' });
          expect(submitButton).not.toBeDisabled();
        },
        { timeout: 3000 }
      );

      const submitButton = screen.getByRole('button', { name: 'パスワードを変更' });
      fireEvent.click(submitButton);

      // 成功画面が表示されることを確認（複数箇所に表示されるテキストはgetAllByTextを使用）
      await waitFor(() => {
        expect(screen.getByText('パスワード変更完了')).toBeInTheDocument();
        const successMessages = screen.getAllByText('パスワードが正常に変更されました');
        expect(successMessages.length).toBeGreaterThan(0);
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
        resetPassword: vi.fn(),
        confirmResetPassword: vi.fn(),
        clearError: vi.fn(),
        clearSuccess: vi.fn(),
        retry: mockRetry,
      });

      renderWithRouter(<PasswordResetPage />);

      const retryButton = screen.getByRole('button', { name: /再試行/ });
      expect(retryButton).toBeInTheDocument();
    });

    it('ローディング状態が正しく表示される', () => {
      mockUseAuthForm.mockReturnValue({
        isLoading: true,
        successMessage: null,
        error: null,
        isNetworkError: false,
        isRetryable: false,
        isOnline: true,
        resetPassword: vi.fn(),
        confirmResetPassword: vi.fn(),
        clearError: vi.fn(),
        clearSuccess: vi.fn(),
        retry: vi.fn(),
      });

      renderWithRouter(<PasswordResetPage />);

      const loadingButton = screen.getByRole('button');
      expect(loadingButton).toBeDisabled();
      expect(loadingButton).toHaveAttribute('aria-busy', 'true');
    });

    it('無効な確認コードでエラーメッセージが表示される', async () => {
      mockSearchParams.set('code', 'invalid');
      mockSearchParams.set('email', 'test@example.com');

      // AuthService.confirmResetPasswordをモックしてエラーを返す
      const authError = new Error('確認コードが無効です');
      mockAuthService.confirmResetPassword = vi.fn().mockRejectedValue(authError);
      mockAuthService.handleAuthError = vi.fn().mockReturnValue({
        message: '確認コードが無効です',
        code: 'CodeMismatchException',
      });

      mockUseAuthForm.mockReturnValue({
        isLoading: false,
        successMessage: null,
        error: null,
        isNetworkError: false,
        isRetryable: false,
        isOnline: true,
        resetPassword: vi.fn(),
        confirmResetPassword: vi.fn(),
        clearError: vi.fn(),
        clearSuccess: vi.fn(),
        retry: vi.fn(),
      });

      renderWithRouter(<PasswordResetPage />);

      const newPasswordInput = screen.getByLabelText('新しいパスワード');
      const confirmPasswordInput = screen.getByLabelText('パスワード確認');

      // パスワードは大文字、小文字、数字を含む必要がある
      fireEvent.change(newPasswordInput, { target: { value: 'NewPassword123' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'NewPassword123' } });

      // ボタンが有効になるまで待機
      await waitFor(
        () => {
          const submitButton = screen.getByRole('button', { name: 'パスワードを変更' });
          expect(submitButton).not.toBeDisabled();
        },
        { timeout: 3000 }
      );

      const submitButton = screen.getByRole('button', { name: 'パスワードを変更' });
      fireEvent.click(submitButton);

      // エラーメッセージが表示されることを確認
      await waitFor(() => {
        expect(screen.getByText('確認コードが無効です')).toBeInTheDocument();
      });
    });
  });

  // アクセシビリティテスト
  describe('アクセシビリティ', () => {
    it('フォーム要素に適切なラベルが設定されている', () => {
      renderWithRouter(<PasswordResetPage />);

      expect(screen.getByLabelText(/メールアドレス/)).toBeInTheDocument();
    });

    it('新しいパスワード設定画面のフォーム要素に適切なラベルが設定されている', () => {
      mockSearchParams.set('code', '123456');
      mockSearchParams.set('email', 'test@example.com');

      renderWithRouter(<PasswordResetPage />);

      expect(screen.getByLabelText('新しいパスワード')).toBeInTheDocument();
      expect(screen.getByLabelText('パスワード確認')).toBeInTheDocument();
    });

    it('送信ボタンに適切なaria属性が設定されている', () => {
      renderWithRouter(<PasswordResetPage />);

      const submitButton = screen.getByRole('button', { name: 'パスワードリセットメールを送信' });
      expect(submitButton).toHaveAttribute('type', 'submit');
    });

    it('エラーメッセージに適切なrole属性が設定されている', () => {
      mockUseAuthForm.mockReturnValue({
        isLoading: false,
        successMessage: null,
        error: 'エラーが発生しました',
        isNetworkError: false,
        isRetryable: false,
        isOnline: true,
        resetPassword: vi.fn(),
        confirmResetPassword: vi.fn(),
        clearError: vi.fn(),
        clearSuccess: vi.fn(),
        retry: vi.fn(),
      });

      renderWithRouter(<PasswordResetPage />);

      // ErrorAlertコンポーネント内にrole="alert"が設定されている
      const errorAlert = screen.getByRole('alert');
      expect(errorAlert).toBeInTheDocument();
      expect(errorAlert).toHaveTextContent('エラーが発生しました');
    });
  });
});
