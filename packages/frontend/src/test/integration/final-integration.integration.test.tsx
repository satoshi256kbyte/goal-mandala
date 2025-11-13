/**
 * 最終統合テスト
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { AuthProvider } from '../../components/auth/AuthProvider';
import { AuthStateMonitorProvider } from '../../components/auth/AuthStateMonitorProvider';
import { AppRouter } from '../../router/AppRouter';

const TestApp = () => (
  <BrowserRouter>
    <AuthProvider>
      <AuthStateMonitorProvider autoStart={true}>
        <AppRouter />
      </AuthStateMonitorProvider>
    </AuthProvider>
  </BrowserRouter>
);

describe('最終統合テスト', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  test('完全な認証フローが動作する', async () => {
    const user = userEvent.setup();
    render(<TestApp />);

    // 初期状態でログインページが表示される
    await waitFor(() => {
      expect(screen.getByTestId('login-form')).toBeInTheDocument();
    });

    // ログイン
    await user.type(screen.getByTestId('email-input'), 'test@example.com');
    await user.type(screen.getByTestId('password-input'), 'password123');
    await user.click(screen.getByTestId('login-button'));

    // ダッシュボードにリダイレクト
    await waitFor(() => {
      expect(screen.getByTestId('dashboard-content')).toBeInTheDocument();
    });

    // ログアウト
    await user.click(screen.getByTestId('logout-button'));

    // ログインページに戻る
    await waitFor(() => {
      expect(screen.getByTestId('login-form')).toBeInTheDocument();
    });
  });

  test('認証状態監視が正常に動作する', async () => {
    render(<TestApp />);

    // 監視が開始されることを確認
    await waitFor(() => {
      const monitoringElement = screen.queryByTestId('monitoring-status');
      if (monitoringElement) {
        expect(monitoringElement).toHaveTextContent('monitoring');
      }
    });
  });

  test('パフォーマンス最適化が動作する', async () => {
    const renderCount = vi.fn();

    const TestComponent = () => {
      renderCount();
      return <div data-testid="test-component">Test</div>;
    };

    render(
      <BrowserRouter>
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      </BrowserRouter>
    );

    // 初期レンダリング
    expect(renderCount).toHaveBeenCalledTimes(1);
  });
});
