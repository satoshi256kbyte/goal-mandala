import React from 'react';
import { render, cleanup, screen, fireEvent } from '@testing-library/react';
import { waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { SignupPage } from './SignupPage';
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

// react-router-domのuseNavigateをモック化
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
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

describe('SignupPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthService.signUp = vi.fn();

    // useAuthFormのデフォルトモック
    mockUseAuthForm.mockReturnValue({
      isLoading: false,
      successMessage: null,
      error: null,
      isNetworkError: false,
      isRetryable: false,
      isOnline: true,
      signUp: vi.fn(),
      clearError: vi.fn(),
      clearSuccess: vi.fn(),
      retry: vi.fn(),
    });
  });

  it('サインアップページが正常にレンダリングされる', () => {
    renderWithRouter(<SignupPage />);

    expect(screen.getByRole('heading', { name: '新規登録' })).toBeInTheDocument();
    expect(screen.getByText('アカウントを作成してください')).toBeInTheDocument();
    expect(screen.getByLabelText(/名前/)).toBeInTheDocument();
    expect(screen.getByLabelText(/メールアドレス/)).toBeInTheDocument();
    expect(screen.getByLabelText('パスワード', { selector: '#password' })).toBeInTheDocument();
    expect(screen.getByLabelText('パスワード確認')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'アカウント作成' })).toBeInTheDocument();
  });

  it('有効な情報でサインアップが成功する', async () => {
    // useAuthFormモックに成功状態を設定
    mockUseAuthForm.mockReturnValue({
      isLoading: false,
      successMessage: 'アカウント作成完了',
      error: null,
      isNetworkError: false,
      isRetryable: false,
      isOnline: true,
      signUp: vi.fn(),
      clearError: vi.fn(),
      clearSuccess: vi.fn(),
      retry: vi.fn(),
    });

    renderWithRouter(<SignupPage />);

    // 成功メッセージが表示されることを確認
    expect(screen.getByText('アカウント作成完了')).toBeInTheDocument();
  });

  it('サインアップエラー時にエラーメッセージが表示される', async () => {
    const errorMessage = 'このメールアドレスは既に登録されています';

    // useAuthFormモックにエラーを設定
    mockUseAuthForm.mockReturnValue({
      isLoading: false,
      successMessage: null,
      error: errorMessage,
      isNetworkError: false,
      isRetryable: true,
      isOnline: true,
      signUp: vi.fn(),
      clearError: vi.fn(),
      clearSuccess: vi.fn(),
      retry: vi.fn(),
    });

    renderWithRouter(<SignupPage />);

    // エラーメッセージが表示されることを確認
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('ログインリンクが正しく表示される', () => {
    renderWithRouter(<SignupPage />);

    const loginLink = screen.getByRole('link', { name: 'ログイン' });
    expect(loginLink).toBeInTheDocument();
    expect(loginLink).toHaveAttribute('href', '/login');
  });

  it('フォームバリデーションが正しく動作する', async () => {
    renderWithRouter(<SignupPage />);

    // 空のフォームで送信を試行
    const submitButton = screen.getByRole('button', { name: 'アカウント作成' });
    expect(submitButton).toBeDisabled();

    // 無効なメールアドレスを入力
    fireEvent.change(screen.getByLabelText(/メールアドレス/), {
      target: { value: 'invalid-email' },
    });
    fireEvent.blur(screen.getByLabelText(/メールアドレス/));

    await waitFor(() => {
      expect(screen.getByText('有効なメールアドレスを入力してください')).toBeInTheDocument();
    });

    // パスワードが一致しない場合
    fireEvent.change(screen.getByLabelText('パスワード', { selector: '#password' }), {
      target: { value: 'Password123' },
    });
    fireEvent.change(screen.getByLabelText('パスワード確認'), {
      target: { value: 'DifferentPassword' },
    });

    await waitFor(() => {
      expect(screen.getByText('パスワードが一致しません')).toBeInTheDocument();
    });
  });

  // フォーム入力のインタラクションテスト
  describe('フォーム入力', () => {
    it('全てのフィールドに入力できる', async () => {
      renderWithRouter(<SignupPage />);

      const nameInput = screen.getByLabelText(/名前/) as HTMLInputElement;
      const emailInput = screen.getByLabelText(/メールアドレス/) as HTMLInputElement;
      const passwordInput = screen.getByLabelText('パスワード', {
        selector: '#password',
      }) as HTMLInputElement;
      const confirmPasswordInput = screen.getByLabelText('パスワード確認') as HTMLInputElement;

      fireEvent.change(nameInput, { target: { value: 'テストユーザー' } });
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'Password123' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'Password123' } });

      expect(nameInput.value).toBe('テストユーザー');
      expect(emailInput.value).toBe('test@example.com');
      expect(passwordInput.value).toBe('Password123');
      expect(confirmPasswordInput.value).toBe('Password123');
    });

    it('フォーム送信時にsignUpが呼ばれる', async () => {
      const mockSignUp = vi.fn().mockResolvedValue(undefined);

      mockUseAuthForm.mockReturnValue({
        isLoading: false,
        successMessage: null,
        error: null,
        isNetworkError: false,
        isRetryable: false,
        isOnline: true,
        signUp: mockSignUp,
        clearError: vi.fn(),
        clearSuccess: vi.fn(),
        retry: vi.fn(),
      });

      renderWithRouter(<SignupPage />);

      const nameInput = screen.getByLabelText(/名前/);
      const emailInput = screen.getByLabelText(/メールアドレス/);
      const passwordInput = screen.getByLabelText('パスワード', { selector: '#password' });
      const confirmPasswordInput = screen.getByLabelText('パスワード確認');

      // フォームに入力
      fireEvent.change(nameInput, { target: { value: 'テストユーザー' } });
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'Password123' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'Password123' } });

      // ボタンが有効になるまで待機
      await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: 'アカウント作成' });
        expect(submitButton).not.toBeDisabled();
      });

      const submitButton = screen.getByRole('button', { name: 'アカウント作成' });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockSignUp).toHaveBeenCalledWith(
          'test@example.com',
          'Password123',
          'テストユーザー'
        );
      });
    });

    it('空の名前でバリデーションエラーが表示される', async () => {
      renderWithRouter(<SignupPage />);

      const nameInput = screen.getByLabelText(/名前/);
      fireEvent.change(nameInput, { target: { value: '' } });
      fireEvent.blur(nameInput);

      await waitFor(() => {
        // エラーメッセージがaria-liveリージョンまたはエラー要素に表示されることを確認
        const errorElements = screen.queryAllByText(/名前を入力してください/);
        expect(errorElements.length).toBeGreaterThan(0);
      });
    });

    it('短いパスワードでバリデーションエラーが表示される', async () => {
      renderWithRouter(<SignupPage />);

      const passwordInput = screen.getByLabelText('パスワード', { selector: '#password' });
      fireEvent.change(passwordInput, { target: { value: '123' } });
      fireEvent.blur(passwordInput);

      await waitFor(() => {
        expect(screen.getByText(/パスワードは8文字以上で入力してください/)).toBeInTheDocument();
      });
    });
  });

  // ナビゲーションテスト
  describe('ナビゲーション', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it.skip('サインアップ成功後にログイン画面にリダイレクトされる', async () => {
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
          signUp: async () => {
            // サインアップ成功時にonSuccessを呼び出す
            if (onSuccessCallback) {
              onSuccessCallback();
            }
          },
          clearError: vi.fn(),
          clearSuccess: vi.fn(),
          retry: vi.fn(),
        };
      });

      renderWithRouter(<SignupPage />);

      const nameInput = screen.getByLabelText(/名前/);
      const emailInput = screen.getByLabelText(/メールアドレス/);
      const passwordInput = screen.getByLabelText('パスワード', { selector: '#password' });
      const confirmPasswordInput = screen.getByLabelText('パスワード確認');

      fireEvent.change(nameInput, { target: { value: 'テストユーザー' } });
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'Password123' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'Password123' } });

      // ボタンが有効になるまで待機
      await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: 'アカウント作成' });
        expect(submitButton).not.toBeDisabled();
      });

      const submitButton = screen.getByRole('button', { name: 'アカウント作成' });
      fireEvent.click(submitButton);

      // タイマーを3秒進める
      await vi.advanceTimersByTimeAsync(3000);

      await waitFor(
        () => {
          expect(mockNavigate).toHaveBeenCalledWith('/login', {
            replace: true,
            state: { message: 'アカウントが作成されました。確認メールをご確認ください。' },
          });
        },
        { timeout: 5000 }
      );
    }, 10000);
  });

  // エラーハンドリングテスト
  describe('エラーハンドリング', () => {
    it('ネットワークエラー時に適切なエラーメッセージが表示される', () => {
      const errorMessage = 'ネットワークエラーが発生しました';

      mockUseAuthForm.mockReturnValue({
        isLoading: false,
        successMessage: null,
        error: errorMessage,
        isNetworkError: true,
        isRetryable: true,
        isOnline: false,
        signUp: vi.fn(),
        clearError: vi.fn(),
        clearSuccess: vi.fn(),
        retry: vi.fn(),
      });

      renderWithRouter(<SignupPage />);

      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    it('リトライ可能なエラーの場合、再試行ボタンが表示される', () => {
      const mockRetry = vi.fn();

      mockUseAuthForm.mockReturnValue({
        isLoading: false,
        successMessage: null,
        error: 'ネットワークエラー',
        isNetworkError: true,
        isRetryable: true,
        isOnline: false,
        signUp: vi.fn(),
        clearError: vi.fn(),
        clearSuccess: vi.fn(),
        retry: mockRetry,
      });

      renderWithRouter(<SignupPage />);

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
        signUp: vi.fn(),
        clearError: vi.fn(),
        clearSuccess: vi.fn(),
        retry: vi.fn(),
      });

      renderWithRouter(<SignupPage />);

      // 送信ボタンを名前で特定
      const loadingButton = screen.getByRole('button', { name: /作成中/ });
      expect(loadingButton).toBeDisabled();
      expect(loadingButton).toHaveAttribute('aria-busy', 'true');
      expect(loadingButton).toHaveTextContent('作成中...');
    });
  });

  // アクセシビリティテスト
  describe('アクセシビリティ', () => {
    it('フォーム要素に適切なラベルが設定されている', () => {
      renderWithRouter(<SignupPage />);

      expect(screen.getByLabelText(/名前/)).toBeInTheDocument();
      expect(screen.getByLabelText(/メールアドレス/)).toBeInTheDocument();
      expect(screen.getByLabelText('パスワード', { selector: '#password' })).toBeInTheDocument();
      expect(screen.getByLabelText('パスワード確認')).toBeInTheDocument();
    });

    it('送信ボタンに適切なaria属性が設定されている', () => {
      renderWithRouter(<SignupPage />);

      const submitButton = screen.getByRole('button', { name: 'アカウント作成' });
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
        signUp: vi.fn(),
        clearError: vi.fn(),
        clearSuccess: vi.fn(),
        retry: vi.fn(),
      });

      renderWithRouter(<SignupPage />);

      // ErrorAlertコンポーネント内にrole="alert"が設定されている
      const errorAlert = screen.getByRole('alert');
      expect(errorAlert).toBeInTheDocument();
      expect(errorAlert).toHaveTextContent('エラーが発生しました');
    });
  });
});
