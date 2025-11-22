import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { LoginForm } from './LoginForm';
import type { LoginFormData } from '../../utils/validation';

// テスト用のラッパーコンポーネント
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('LoginForm', () => {
  const mockOnSubmit = vi.fn<[LoginFormData], Promise<void>>();

  beforeEach(() => {
    mockOnSubmit.mockClear();
  });

  it('正常にレンダリングされる', () => {
    render(
      <TestWrapper>
        <LoginForm onSubmit={mockOnSubmit} />
      </TestWrapper>
    );

    expect(screen.getByLabelText(/メールアドレス/)).toBeInTheDocument();
    expect(screen.getByLabelText(/パスワード/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ログインボタン' })).toBeInTheDocument();
    expect(screen.getByText('パスワードを忘れた場合')).toBeInTheDocument();
    expect(screen.getByText('新規登録')).toBeInTheDocument();
  });

  it('有効な認証情報でログインが成功する', async () => {
    const user = userEvent.setup();
    mockOnSubmit.mockResolvedValue();

    render(
      <TestWrapper>
        <LoginForm onSubmit={mockOnSubmit} />
      </TestWrapper>
    );

    const emailInput = screen.getByLabelText(/メールアドレス/);
    const passwordInput = screen.getByLabelText(/パスワード/);
    const submitButton = screen.getByRole('button', { name: 'ログインボタン' });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');

    // フォームが有効になるまで待機
    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });

    await user.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });
  });

  it('無効なメールアドレスでバリデーションエラーが表示される', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <LoginForm onSubmit={mockOnSubmit} />
      </TestWrapper>
    );

    const emailInput = screen.getByLabelText(/メールアドレス/);

    await user.type(emailInput, 'invalid-email');
    await user.tab(); // フォーカスを外す

    await waitFor(() => {
      expect(screen.getAllByText('有効なメールアドレスを入力してください')).toHaveLength(2);
    });
  });

  it('空のメールアドレスでバリデーションエラーが表示される', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <LoginForm onSubmit={mockOnSubmit} />
      </TestWrapper>
    );

    const emailInput = screen.getByLabelText(/メールアドレス/);

    // 何か入力してから削除することで、バリデーションをトリガー
    await user.type(emailInput, 'a');
    await user.clear(emailInput);

    await waitFor(() => {
      expect(screen.getByText('メールアドレスは必須です')).toBeInTheDocument();
    });
  });

  it('空のパスワードでバリデーションエラーが表示される', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <LoginForm onSubmit={mockOnSubmit} />
      </TestWrapper>
    );

    const passwordInput = screen.getByLabelText(/パスワード/);

    // 何か入力してから削除することで、バリデーションをトリガー
    await user.type(passwordInput, 'a');
    await user.clear(passwordInput);

    await waitFor(() => {
      expect(screen.getByText('パスワードは必須です')).toBeInTheDocument();
    });
  });

  it('バリデーションエラーがある場合はログインボタンが無効になる', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <LoginForm onSubmit={mockOnSubmit} />
      </TestWrapper>
    );

    const emailInput = screen.getByLabelText(/メールアドレス/);
    const submitButton = screen.getByRole('button', { name: 'ログインボタン' });

    await user.type(emailInput, 'invalid-email');

    await waitFor(() => {
      expect(submitButton).toBeDisabled();
    });
  });

  it('ローディング状態が正しく表示される', () => {
    render(
      <TestWrapper>
        <LoginForm onSubmit={mockOnSubmit} isLoading={true} />
      </TestWrapper>
    );

    const submitButton = screen.getByRole('button');
    expect(submitButton).toBeDisabled();
    expect(submitButton).toHaveAttribute('aria-busy', 'true');
    expect(submitButton).toHaveTextContent('ログイン中...');
  });

  it('エラーメッセージが正しく表示される', () => {
    const errorMessage = 'ログインに失敗しました';

    render(
      <TestWrapper>
        <LoginForm onSubmit={mockOnSubmit} error={errorMessage} />
      </TestWrapper>
    );

    expect(screen.getByText(errorMessage)).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('リアルタイムバリデーションが動作する', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <LoginForm onSubmit={mockOnSubmit} />
      </TestWrapper>
    );

    const emailInput = screen.getByLabelText(/メールアドレス/);
    const passwordInput = screen.getByLabelText(/パスワード/);

    // 無効なメールアドレスを入力
    await user.type(emailInput, 'invalid');
    await user.tab(); // フォーカスを外してバリデーションをトリガー

    await waitFor(() => {
      expect(screen.getAllByText('有効なメールアドレスを入力してください')).toHaveLength(2);
    });

    // 有効なメールアドレスに修正し、パスワードも入力
    await user.clear(emailInput);
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');

    await waitFor(() => {
      // エラーメッセージのrole="alert"要素が1つ以下になることを確認（ヘルプテキストは残る）
      const alerts = screen.queryAllByRole('alert');
      expect(alerts.length).toBeLessThanOrEqual(1);
    });
  });

  it('アクセシビリティ属性が正しく設定される', () => {
    render(
      <TestWrapper>
        <LoginForm onSubmit={mockOnSubmit} />
      </TestWrapper>
    );

    const emailInput = screen.getByLabelText(/メールアドレス/);
    const passwordInput = screen.getByLabelText(/パスワード/);

    expect(emailInput).toHaveAttribute('type', 'email');
    expect(emailInput).toHaveAttribute('autoComplete', 'email');
    expect(emailInput).toHaveAttribute('aria-label', 'メールアドレス（必須）');

    expect(passwordInput).toHaveAttribute('type', 'password');
    expect(passwordInput).toHaveAttribute('autoComplete', 'current-password');
    expect(passwordInput).toHaveAttribute('aria-label', 'パスワード（必須）');
  });

  it('フォーム送信時にエラーが発生してもクラッシュしない', async () => {
    const user = userEvent.setup();
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockOnSubmit.mockRejectedValue(new Error('Network error'));

    render(
      <TestWrapper>
        <LoginForm onSubmit={mockOnSubmit} />
      </TestWrapper>
    );

    const emailInput = screen.getByLabelText(/メールアドレス/);
    const passwordInput = screen.getByLabelText(/パスワード/);
    const submitButton = screen.getByRole('button', { name: 'ログインボタン' });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');

    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });

    await user.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalled();
    });

    // エラーログが出力されることを確認（開発環境でのみ）
    if (process.env.NODE_ENV === 'development') {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Login form submission error:',
        expect.any(Error)
      );
    }

    consoleErrorSpy.mockRestore();
  });
});
