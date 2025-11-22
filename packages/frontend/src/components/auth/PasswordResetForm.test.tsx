import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { PasswordResetForm } from './PasswordResetForm';
import type { PasswordResetFormData } from '../../utils/validation';

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

import { vi } from 'vitest';

describe('PasswordResetForm', () => {
  const mockOnSubmit = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('パスワードリセットフォームが正常にレンダリングされる', () => {
    renderWithRouter(<PasswordResetForm onSubmit={mockOnSubmit} />);

    expect(screen.getByLabelText('メールアドレス')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'パスワードリセットメールを送信' })
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'ログイン画面に戻る' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '新規登録' })).toBeInTheDocument();
    expect(screen.getByText('パスワードリセットについて')).toBeInTheDocument();
  });

  it('有効なメールアドレスでフォーム送信が成功する', async () => {
    mockOnSubmit.mockResolvedValue();
    renderWithRouter(<PasswordResetForm onSubmit={mockOnSubmit} />);

    const formData: PasswordResetFormData = {
      email: 'test@example.com',
    };

    // メールアドレスを入力
    fireEvent.change(screen.getByLabelText('メールアドレス'), {
      target: { value: formData.email },
    });

    // フォームを送信
    const form = screen
      .getByRole('button', { name: 'パスワードリセットメールを送信' })
      .closest('form');
    expect(form).toBeTruthy();
    fireEvent.submit(form!);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(formData);
    });
  });

  it('必須フィールドが空の場合、送信ボタンが無効になる', () => {
    renderWithRouter(<PasswordResetForm onSubmit={mockOnSubmit} />);

    const submitButton = screen.getByRole('button', { name: 'パスワードリセットメールを送信' });
    expect(submitButton).toBeDisabled();
  });

  it('無効なメールアドレスでバリデーションエラーが表示される', async () => {
    renderWithRouter(<PasswordResetForm onSubmit={mockOnSubmit} />);

    fireEvent.change(screen.getByLabelText('メールアドレス'), {
      target: { value: 'invalid-email' },
    });
    fireEvent.blur(screen.getByLabelText('メールアドレス'));

    await waitFor(() => {
      expect(screen.getByText('有効なメールアドレスを入力してください')).toBeInTheDocument();
    });
  });

  it('エラーメッセージが正しく表示される', () => {
    const errorMessage = 'ネットワークエラーが発生しました';
    renderWithRouter(<PasswordResetForm onSubmit={mockOnSubmit} error={errorMessage} />);

    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('ローディング状態が正しく表示される', () => {
    renderWithRouter(<PasswordResetForm onSubmit={mockOnSubmit} isLoading={true} />);

    expect(screen.getByText('送信中...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /送信中/ })).toBeDisabled();
  });

  it('ログイン画面への戻るリンクが正しく設定されている', () => {
    renderWithRouter(<PasswordResetForm onSubmit={mockOnSubmit} />);

    const loginLink = screen.getByRole('link', { name: 'ログイン画面に戻る' });
    expect(loginLink).toHaveAttribute('href', '/login');
  });

  it('新規登録リンクが正しく設定されている', () => {
    renderWithRouter(<PasswordResetForm onSubmit={mockOnSubmit} />);

    const signupLink = screen.getByRole('link', { name: '新規登録' });
    expect(signupLink).toHaveAttribute('href', '/signup');
  });

  it('セキュリティに関する注意事項が表示される', () => {
    renderWithRouter(<PasswordResetForm onSubmit={mockOnSubmit} />);

    expect(screen.getByText('セキュリティについて')).toBeInTheDocument();
    expect(screen.getByText(/登録されていないメールアドレスでも/)).toBeInTheDocument();
    expect(screen.getByText(/パスワードリセットリンクの有効期限は24時間です/)).toBeInTheDocument();
    expect(screen.getByText(/リンクは一度のみ使用可能です/)).toBeInTheDocument();
  });

  it('説明文が正しく表示される', () => {
    renderWithRouter(<PasswordResetForm onSubmit={mockOnSubmit} />);

    expect(screen.getByText(/登録されたメールアドレスを入力してください/)).toBeInTheDocument();
    expect(screen.getByText(/パスワードリセット用のリンクをお送りします/)).toBeInTheDocument();
    expect(
      screen.getByText('アカウント登録時に使用したメールアドレスを入力してください')
    ).toBeInTheDocument();
  });
});
