import React from 'react';
import { render, cleanup, screen, fireEvent, act } from '@testing-library/react';
import { waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { SignupForm } from './SignupForm';
import type { SignupFormData } from '../../utils/validation';

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

import { vi, afterEach } from 'vitest';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.clearAllTimers();
});

describe('SignupForm', () => {
  const mockOnSubmit = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('サインアップフォームが正常にレンダリングされる', () => {
    renderWithRouter(<SignupForm onSubmit={mockOnSubmit} />);

    expect(screen.getByLabelText('名前')).toBeInTheDocument();
    expect(screen.getByLabelText('メールアドレス')).toBeInTheDocument();
    expect(screen.getByLabelText('パスワード')).toBeInTheDocument();
    expect(screen.getByLabelText('パスワード確認')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'アカウント作成' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'ログイン' })).toBeInTheDocument();
  });

  it('有効な情報でフォーム送信が成功する', async () => {
    mockOnSubmit.mockResolvedValue(undefined);
    renderWithRouter(<SignupForm onSubmit={mockOnSubmit} />);

    const formData: SignupFormData = {
      name: 'テストユーザー',
      email: 'test@example.com',
      password: 'Password123',
      confirmPassword: 'Password123',
    };

    // フォームに入力
    fireEvent.change(screen.getByLabelText('名前'), {
      target: { value: formData.name },
    });
    fireEvent.change(screen.getByLabelText('メールアドレス'), {
      target: { value: formData.email },
    });
    fireEvent.change(screen.getByLabelText('パスワード'), {
      target: { value: formData.password },
    });
    fireEvent.change(screen.getByLabelText('パスワード確認'), {
      target: { value: formData.confirmPassword },
    });

    // フォームを送信
    const form = screen.getByRole('button', { name: 'アカウント作成' }).closest('form');
    expect(form).toBeTruthy();
    fireEvent.submit(form!);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(formData);
    });
  });

  it('必須フィールドが空の場合、送信ボタンが無効になる', () => {
    renderWithRouter(<SignupForm onSubmit={mockOnSubmit} />);

    const submitButton = screen.getByRole('button', { name: 'アカウント作成' });
    expect(submitButton).toBeDisabled();
  });

  it('無効なメールアドレスでバリデーションエラーが表示される', async () => {
    renderWithRouter(<SignupForm onSubmit={mockOnSubmit} />);

    fireEvent.change(screen.getByLabelText('メールアドレス'), {
      target: { value: 'invalid-email' },
    });
    fireEvent.blur(screen.getByLabelText('メールアドレス'));

    await waitFor(() => {
      expect(screen.getByText('有効なメールアドレスを入力してください')).toBeInTheDocument();
    });
  });

  it('パスワードが一致しない場合、エラーメッセージが表示される', async () => {
    renderWithRouter(<SignupForm onSubmit={mockOnSubmit} />);

    fireEvent.change(screen.getByLabelText('パスワード'), {
      target: { value: 'Password123' },
    });
    fireEvent.change(screen.getByLabelText('パスワード確認'), {
      target: { value: 'DifferentPassword' },
    });

    await waitFor(() => {
      expect(screen.getByText('パスワードが一致しません')).toBeInTheDocument();
    });
  });

  it('パスワード強度インジケーターが正しく動作する', async () => {
    renderWithRouter(<SignupForm onSubmit={mockOnSubmit} />);

    const passwordInput = screen.getByLabelText('パスワード');

    // 弱いパスワード
    fireEvent.change(passwordInput, { target: { value: 'weak' } });
    await waitFor(() => {
      expect(screen.getByText('弱い')).toBeInTheDocument();
    });

    // 強いパスワード
    fireEvent.change(passwordInput, { target: { value: 'StrongPassword123' } });
    await waitFor(() => {
      expect(screen.getByText('強い')).toBeInTheDocument();
    });
  });

  it('パスワード表示/非表示ボタンが正しく動作する', () => {
    renderWithRouter(<SignupForm onSubmit={mockOnSubmit} />);

    const passwordInput = screen.getByLabelText('パスワード');
    const toggleButton = screen.getByLabelText('パスワードを表示');

    // 初期状態ではパスワードが隠されている
    expect(passwordInput).toHaveAttribute('type', 'password');

    // ボタンをクリックしてパスワードを表示
    fireEvent.click(toggleButton);
    expect(passwordInput).toHaveAttribute('type', 'text');

    // 再度クリックしてパスワードを隠す
    fireEvent.click(screen.getByLabelText('パスワードを隠す'));
    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  it('パスワード一致状況が正しく表示される', async () => {
    renderWithRouter(<SignupForm onSubmit={mockOnSubmit} />);

    const passwordInput = screen.getByLabelText('パスワード');
    const confirmPasswordInput = screen.getByLabelText('パスワード確認');

    // パスワードを入力
    fireEvent.change(passwordInput, { target: { value: 'Password123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'Password123' } });

    await waitFor(() => {
      expect(screen.getByText('✓ パスワードが一致しています')).toBeInTheDocument();
    });

    // 異なるパスワードを入力
    fireEvent.change(confirmPasswordInput, { target: { value: 'DifferentPassword' } });

    await waitFor(() => {
      expect(screen.getByText('✗ パスワードが一致しません')).toBeInTheDocument();
    });
  });

  it('エラーメッセージが正しく表示される', () => {
    const errorMessage = 'このメールアドレスは既に登録されています';
    renderWithRouter(<SignupForm onSubmit={mockOnSubmit} error={errorMessage} />);

    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('ローディング状態が正しく表示される', () => {
    renderWithRouter(<SignupForm onSubmit={mockOnSubmit} isLoading={true} />);

    expect(screen.getByText('アカウント作成中...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /アカウント作成中/ })).toBeDisabled();
  });

  it('ログインリンクが正しく設定されている', () => {
    renderWithRouter(<SignupForm onSubmit={mockOnSubmit} />);

    const loginLink = screen.getByRole('link', { name: 'ログイン' });
    expect(loginLink).toHaveAttribute('href', '/login');
  });
});
