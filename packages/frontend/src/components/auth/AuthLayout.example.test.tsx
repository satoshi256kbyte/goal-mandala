import { render } from '@testing-library/react';
import { describe, it } from 'vitest';
import AuthLayoutExample from './AuthLayout.example';

describe('AuthLayoutExample', () => {
  it('完全なログインフォームが正しく表示される', () => {
    render(<AuthLayoutExample />);

    // タイトルとサブタイトルの確認
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('ログイン');
    expect(screen.getByText('アカウントにサインインしてください')).toBeInTheDocument();

    // フォーム要素の確認
    expect(screen.getByLabelText('メールアドレス')).toBeInTheDocument();
    expect(screen.getByLabelText('パスワード')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ログイン' })).toBeInTheDocument();
  });

  it('フォーム要素が適切なアクセシビリティ属性を持つ', () => {
    render(<AuthLayoutExample />);

    const emailInput = screen.getByLabelText('メールアドレス');
    const passwordInput = screen.getByLabelText('パスワード');

    // 適切なtype属性
    expect(emailInput).toHaveAttribute('type', 'email');
    expect(passwordInput).toHaveAttribute('type', 'password');

    // 適切なautoComplete属性
    expect(emailInput).toHaveAttribute('autoComplete', 'email');
    expect(passwordInput).toHaveAttribute('autoComplete', 'current-password');

    // required属性
    expect(emailInput).toBeRequired();
    expect(passwordInput).toBeRequired();
  });

  it('レスポンシブデザインが適用されている', () => {
    const { container } = render(<AuthLayoutExample />);

    // AuthLayoutのレスポンシブクラスが適用されていることを確認
    const layoutContainer = container.querySelector('.min-h-screen');
    expect(layoutContainer).toBeInTheDocument();
    expect(layoutContainer).toHaveClass('flex', 'items-center', 'justify-center');
  });
});
