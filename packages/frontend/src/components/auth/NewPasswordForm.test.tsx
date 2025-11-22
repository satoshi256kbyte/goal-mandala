import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { NewPasswordForm } from './NewPasswordForm';
import type { NewPasswordFormData } from '../../utils/validation';

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

import { vi } from 'vitest';

describe('NewPasswordForm', () => {
  const mockOnSubmit = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('新しいパスワード設定フォームが正常にレンダリングされる（確認コード表示あり）', () => {
    renderWithRouter(
      <NewPasswordForm
        onSubmit={mockOnSubmit}
        showConfirmationCode={true}
        email="test@example.com"
      />
    );

    expect(screen.getByLabelText('確認コード')).toBeInTheDocument();
    expect(screen.getByLabelText('新しいパスワード')).toBeInTheDocument();
    expect(screen.getByLabelText('パスワード確認')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'パスワードを変更' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'ログイン画面に戻る' })).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });

  it('新しいパスワード設定フォームが正常にレンダリングされる（確認コード表示なし）', () => {
    renderWithRouter(
      <NewPasswordForm
        onSubmit={mockOnSubmit}
        showConfirmationCode={false}
        confirmationCode="123456"
      />
    );

    expect(screen.queryByLabelText('確認コード')).not.toBeInTheDocument();
    expect(screen.getByLabelText('新しいパスワード')).toBeInTheDocument();
    expect(screen.getByLabelText('パスワード確認')).toBeInTheDocument();
  });

  it('有効な情報でフォーム送信が成功する', async () => {
    mockOnSubmit.mockResolvedValue();
    renderWithRouter(<NewPasswordForm onSubmit={mockOnSubmit} showConfirmationCode={true} />);

    const formData: NewPasswordFormData = {
      password: 'NewPassword123',
      confirmPassword: 'NewPassword123',
      confirmationCode: '123456',
    };

    // フォームに入力
    fireEvent.change(screen.getByLabelText('確認コード'), {
      target: { value: formData.confirmationCode },
    });
    fireEvent.change(screen.getByLabelText('新しいパスワード'), {
      target: { value: formData.password },
    });
    fireEvent.change(screen.getByLabelText('パスワード確認'), {
      target: { value: formData.confirmPassword },
    });

    // フォームを送信
    const form = screen.getByRole('button', { name: 'パスワードを変更' }).closest('form');
    expect(form).toBeTruthy();
    fireEvent.submit(form!);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(formData);
    });
  });

  it('必須フィールドが空の場合、送信ボタンが無効になる', () => {
    renderWithRouter(<NewPasswordForm onSubmit={mockOnSubmit} />);

    const submitButton = screen.getByRole('button', { name: 'パスワードを変更' });
    expect(submitButton).toBeDisabled();
  });

  it('パスワードが一致しない場合、エラーメッセージが表示される', async () => {
    renderWithRouter(<NewPasswordForm onSubmit={mockOnSubmit} />);

    fireEvent.change(screen.getByLabelText('新しいパスワード'), {
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
    renderWithRouter(<NewPasswordForm onSubmit={mockOnSubmit} />);

    const passwordInput = screen.getByLabelText('新しいパスワード');

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
    renderWithRouter(<NewPasswordForm onSubmit={mockOnSubmit} />);

    const passwordInput = screen.getByLabelText('新しいパスワード');
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
    renderWithRouter(<NewPasswordForm onSubmit={mockOnSubmit} />);

    const passwordInput = screen.getByLabelText('新しいパスワード');
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
    const errorMessage = '確認コードが正しくありません';
    renderWithRouter(<NewPasswordForm onSubmit={mockOnSubmit} error={errorMessage} />);

    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('ローディング状態が正しく表示される', () => {
    renderWithRouter(<NewPasswordForm onSubmit={mockOnSubmit} isLoading={true} />);

    expect(screen.getByText('パスワード変更中...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /パスワード変更中/ })).toBeDisabled();
  });

  it('ログイン画面への戻るリンクが正しく設定されている', () => {
    renderWithRouter(<NewPasswordForm onSubmit={mockOnSubmit} />);

    const loginLink = screen.getByRole('link', { name: 'ログイン画面に戻る' });
    expect(loginLink).toHaveAttribute('href', '/login');
  });

  it('事前設定された確認コードが正しく表示される', () => {
    renderWithRouter(
      <NewPasswordForm
        onSubmit={mockOnSubmit}
        confirmationCode="123456"
        showConfirmationCode={true}
      />
    );

    const confirmationCodeInput = screen.getByLabelText('確認コード');
    expect(confirmationCodeInput).toHaveValue('123456');
  });

  it('メールアドレスが正しく表示される', () => {
    renderWithRouter(<NewPasswordForm onSubmit={mockOnSubmit} email="test@example.com" />);

    expect(screen.getByText('アカウント:')).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });
});
