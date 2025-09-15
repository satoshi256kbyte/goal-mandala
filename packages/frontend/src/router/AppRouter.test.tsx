import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { AppRouter } from './AppRouter';

// Amplifyのモック
vi.mock('aws-amplify', () => ({
  Amplify: {
    configure: vi.fn(),
  },
}));

vi.mock('aws-amplify/auth', () => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
  getCurrentUser: vi.fn(),
  fetchAuthSession: vi.fn(),
  resetPassword: vi.fn(),
  confirmResetPassword: vi.fn(),
}));

// 環境変数のモック
Object.defineProperty(import.meta, 'env', {
  value: {
    VITE_COGNITO_USER_POOL_ID: 'test-pool-id',
    VITE_COGNITO_USER_POOL_CLIENT_ID: 'test-client-id',
    VITE_AWS_REGION: 'ap-northeast-1',
  },
});

describe('AppRouter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('認証状態確認中にローディング画面を表示する', async () => {
    render(<AppRouter />);

    // ローディング画面が表示されることを確認
    expect(screen.getByText('認証状態を確認中...')).toBeInTheDocument();
  });

  it('未認証の場合にログイン画面にリダイレクトする', async () => {
    // getCurrentUserが失敗するようにモック
    const { getCurrentUser } = await import('aws-amplify/auth');
    vi.mocked(getCurrentUser).mockRejectedValue(new Error('Not authenticated'));

    render(<AppRouter />);

    // 最終的にログイン画面が表示されることを確認
    await screen.findByText('ログイン');
  });

  it('認証済みの場合にダッシュボード画面を表示する', async () => {
    // getCurrentUserが成功するようにモック
    const { getCurrentUser } = await import('aws-amplify/auth');
    vi.mocked(getCurrentUser).mockResolvedValue({
      username: 'test@example.com',
    });

    render(<AppRouter />);

    // ダッシュボード画面が表示されることを確認
    await screen.findByText('ダッシュボード');
  });
});
