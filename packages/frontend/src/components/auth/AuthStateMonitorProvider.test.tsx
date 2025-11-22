/**
 * 認証状態監視プロバイダーのテスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import {
  AuthStateMonitorProvider,
  useAuthStateMonitorContext,
  useAuthMonitoringStats,
} from './AuthStateMonitorProvider';
import { useAuthContext } from '../../hooks/useAuth';
import { useAuthStateMonitor } from '../../hooks/useAuthStateMonitor';
import type { AuthState, AuthError } from '../../services/auth-state-monitor';

// モック
vi.mock('../../hooks/useAuth');
vi.mock('../../hooks/useAuthStateMonitor');

describe('AuthStateMonitorProvider', () => {
  const mockUseAuthContext = useAuthContext as Mock;
  const mockUseAuthStateMonitor = useAuthStateMonitor as Mock;

  const mockAuthContext = {
    isAuthenticated: false,
    isLoading: false,
    user: null,
    error: null,
    signOut: vi.fn().mockResolvedValue(undefined),
    getTokenExpirationTime: vi.fn(),
  };

  const mockMonitorHook = {
    currentState: null,
    isMonitoring: false,
    listenerCount: 0,
    lastError: null,
    startMonitoring: vi.fn(),
    stopMonitoring: vi.fn(),
    checkAuthState: vi.fn().mockResolvedValue(undefined),
    clearError: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Reset mocks to return Promises after clearAllMocks
    mockAuthContext.signOut = vi.fn().mockResolvedValue(undefined);
    mockMonitorHook.checkAuthState = vi.fn().mockResolvedValue(undefined);

    mockUseAuthContext.mockReturnValue(mockAuthContext);
    mockUseAuthStateMonitor.mockReturnValue(mockMonitorHook);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('基本機能', () => {
    it('プロバイダーが正しくレンダリングされる', () => {
      const TestComponent = () => {
        const context = useAuthStateMonitorContext();
        return (
          <div data-testid="test">{context.isMonitoring ? 'monitoring' : 'not monitoring'}</div>
        );
      };

      render(
        <AuthStateMonitorProvider>
          <TestComponent />
        </AuthStateMonitorProvider>
      );

      expect(screen.getByTestId('test')).toHaveTextContent('not monitoring');
    });

    it('コンテキストが正しく提供される', () => {
      const TestComponent = () => {
        const context = useAuthStateMonitorContext();
        return (
          <div>
            <div data-testid="monitoring">{context.isMonitoring.toString()}</div>
            <div data-testid="listener-count">{context.listenerCount}</div>
            <div data-testid="total-changes">{context.monitoringStats.totalStateChanges}</div>
          </div>
        );
      };

      render(
        <AuthStateMonitorProvider>
          <TestComponent />
        </AuthStateMonitorProvider>
      );

      expect(screen.getByTestId('monitoring')).toHaveTextContent('false');
      expect(screen.getByTestId('listener-count')).toHaveTextContent('0');
      expect(screen.getByTestId('total-changes')).toHaveTextContent('0');
    });

    it('プロバイダー外でコンテキストを使用するとエラーが発生する', () => {
      const TestComponent = () => {
        useAuthStateMonitorContext();
        return <div>test</div>;
      };

      // エラーログを抑制
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => render(<TestComponent />)).toThrow(
        'useAuthStateMonitorContext must be used within an AuthStateMonitorProvider'
      );

      consoleSpy.mockRestore();
    });
  });

  describe('設定とオプション', () => {
    it('autoStart=trueで監視フックが呼ばれる', () => {
      render(
        <AuthStateMonitorProvider autoStart={true}>
          <div>test</div>
        </AuthStateMonitorProvider>
      );

      expect(mockUseAuthStateMonitor).toHaveBeenCalledWith(
        expect.objectContaining({
          autoStart: true,
        })
      );
    });

    it('configが監視フックに渡される', () => {
      const config = {
        checkInterval: 30000,
        tokenRefreshBuffer: 10 * 60 * 1000,
      };

      render(
        <AuthStateMonitorProvider config={config}>
          <div>test</div>
        </AuthStateMonitorProvider>
      );

      expect(mockUseAuthStateMonitor).toHaveBeenCalledWith(
        expect.objectContaining({
          config,
        })
      );
    });

    it('認証済み状態で初期状態が設定される', () => {
      const authenticatedAuthContext = {
        ...mockAuthContext,
        isAuthenticated: true,
        user: { id: '1', email: 'test@example.com' },
        getTokenExpirationTime: vi.fn().mockReturnValue(new Date(Date.now() + 3600000)),
        signOut: vi.fn().mockResolvedValue(undefined), // Ensure signOut returns a Promise
      };

      mockUseAuthContext.mockReturnValue(authenticatedAuthContext);

      render(
        <AuthStateMonitorProvider>
          <div>test</div>
        </AuthStateMonitorProvider>
      );

      expect(mockUseAuthStateMonitor).toHaveBeenCalledWith(
        expect.objectContaining({
          initialState: expect.objectContaining({
            isAuthenticated: true,
            user: { id: '1', email: 'test@example.com' },
          }),
        })
      );
    });
  });

  describe('認証状態変更ハンドリング', () => {
    it('認証状態変更時に統計が更新される', () => {
      let onAuthStateChange: ((state: AuthState) => void) | undefined;

      mockUseAuthStateMonitor.mockImplementation(options => {
        onAuthStateChange = options.onAuthStateChange;
        return mockMonitorHook;
      });

      const TestComponent = () => {
        const context = useAuthStateMonitorContext();
        return <div data-testid="changes">{context.monitoringStats.totalStateChanges}</div>;
      };

      render(
        <AuthStateMonitorProvider>
          <TestComponent />
        </AuthStateMonitorProvider>
      );

      expect(screen.getByTestId('changes')).toHaveTextContent('0');

      // 認証状態変更をシミュレート
      const newState: AuthState = {
        isAuthenticated: true,
        isLoading: false,
        user: { id: '1', email: 'test@example.com' },
        error: null,
        tokenExpirationTime: new Date(),
        lastActivity: new Date(),
        sessionId: 'session-123',
      };

      act(() => {
        onAuthStateChange?.(newState);
      });

      expect(screen.getByTestId('changes')).toHaveTextContent('1');
    });

    it('デバッグモードで認証状態変更がログ出力される', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      let onAuthStateChange: ((state: AuthState) => void) | undefined;

      mockUseAuthStateMonitor.mockImplementation(options => {
        onAuthStateChange = options.onAuthStateChange;
        return mockMonitorHook;
      });

      render(
        <AuthStateMonitorProvider debug={true}>
          <div>test</div>
        </AuthStateMonitorProvider>
      );

      const newState: AuthState = {
        isAuthenticated: true,
        isLoading: false,
        user: { id: '1', email: 'test@example.com' },
        error: null,
        tokenExpirationTime: new Date(),
        lastActivity: new Date(),
        sessionId: 'session-123',
      };

      act(() => {
        onAuthStateChange?.(newState);
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        '認証状態が変更されました:',
        expect.objectContaining({
          isAuthenticated: true,
          user: 'test@example.com',
        })
      );

      consoleSpy.mockRestore();
    });
  });

  describe('トークン期限切れハンドリング', () => {
    it('トークン期限切れ時に自動ログアウトが実行される', () => {
      let onTokenExpired: (() => void) | undefined;

      mockUseAuthStateMonitor.mockImplementation(options => {
        onTokenExpired = options.onTokenExpired;
        return mockMonitorHook;
      });

      render(
        <AuthStateMonitorProvider>
          <div>test</div>
        </AuthStateMonitorProvider>
      );

      act(() => {
        onTokenExpired?.();
      });

      expect(mockAuthContext.signOut).toHaveBeenCalled();
    });

    it('デバッグモードでトークン期限切れがログ出力される', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      let onTokenExpired: (() => void) | undefined;

      mockUseAuthStateMonitor.mockImplementation(options => {
        onTokenExpired = options.onTokenExpired;
        return mockMonitorHook;
      });

      render(
        <AuthStateMonitorProvider debug={true}>
          <div>test</div>
        </AuthStateMonitorProvider>
      );

      act(() => {
        onTokenExpired?.();
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        'トークンが期限切れになりました:',
        expect.any(String)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('エラーハンドリング', () => {
    it('エラー発生時にエラー履歴が更新される', () => {
      let onError: ((error: AuthError) => void) | undefined;

      mockUseAuthStateMonitor.mockImplementation(options => {
        onError = options.onError;
        return mockMonitorHook;
      });

      const TestComponent = () => {
        const context = useAuthStateMonitorContext();
        return (
          <div>
            <div data-testid="error-count">{context.errorHistory.length}</div>
            <div data-testid="total-errors">{context.monitoringStats.totalErrors}</div>
          </div>
        );
      };

      render(
        <AuthStateMonitorProvider>
          <TestComponent />
        </AuthStateMonitorProvider>
      );

      expect(screen.getByTestId('error-count')).toHaveTextContent('0');
      expect(screen.getByTestId('total-errors')).toHaveTextContent('0');

      const error: AuthError = {
        code: 'TEST_ERROR',
        message: 'テストエラー',
        timestamp: new Date(),
        retryable: false,
      };

      act(() => {
        onError?.(error);
      });

      expect(screen.getByTestId('error-count')).toHaveTextContent('1');
      expect(screen.getByTestId('total-errors')).toHaveTextContent('1');
    });

    it('重大なエラー時に自動ログアウトが実行される', () => {
      let onError: ((error: AuthError) => void) | undefined;

      mockUseAuthStateMonitor.mockImplementation(options => {
        onError = options.onError;
        return mockMonitorHook;
      });

      render(
        <AuthStateMonitorProvider>
          <div>test</div>
        </AuthStateMonitorProvider>
      );

      const error: AuthError = {
        code: 'TOKEN_REFRESH_FAILED',
        message: 'トークンリフレッシュ失敗',
        timestamp: new Date(),
        retryable: false,
      };

      act(() => {
        onError?.(error);
      });

      expect(mockAuthContext.signOut).toHaveBeenCalled();
    });

    it('エラー履歴をクリアできる', () => {
      let onError: ((error: AuthError) => void) | undefined;

      mockUseAuthStateMonitor.mockImplementation(options => {
        onError = options.onError;
        return mockMonitorHook;
      });

      const TestComponent = () => {
        const context = useAuthStateMonitorContext();
        return (
          <div>
            <div data-testid="error-count">{context.errorHistory.length}</div>
            <button onClick={context.clearErrorHistory}>Clear</button>
          </div>
        );
      };

      render(
        <AuthStateMonitorProvider>
          <TestComponent />
        </AuthStateMonitorProvider>
      );

      // エラーを追加
      const error: AuthError = {
        code: 'TEST_ERROR',
        message: 'テストエラー',
        timestamp: new Date(),
        retryable: false,
      };

      act(() => {
        onError?.(error);
      });

      expect(screen.getByTestId('error-count')).toHaveTextContent('1');

      // エラー履歴をクリア
      act(() => {
        screen.getByText('Clear').click();
      });

      expect(screen.getByTestId('error-count')).toHaveTextContent('0');
    });
  });

  describe('統計情報', () => {
    it('監視統計が正しく計算される', () => {
      mockMonitorHook.isMonitoring = true;

      const TestComponent = () => {
        const stats = useAuthMonitoringStats();
        return (
          <div>
            <div data-testid="is-monitoring">{stats.isMonitoring.toString()}</div>
            <div data-testid="uptime">{stats.monitoringStats.uptime}</div>
          </div>
        );
      };

      render(
        <AuthStateMonitorProvider>
          <TestComponent />
        </AuthStateMonitorProvider>
      );

      expect(screen.getByTestId('is-monitoring')).toHaveTextContent('true');
      expect(screen.getByTestId('uptime')).toHaveTextContent('0');

      // 時間を進める
      act(() => {
        vi.advanceTimersByTime(5000); // 5秒
      });

      // 再レンダリングを強制
      act(() => {
        // 状態更新をトリガー
      });
    });

    it('デバッグモードで定期的に統計がログ出力される', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      mockMonitorHook.isMonitoring = true;

      render(
        <AuthStateMonitorProvider debug={true}>
          <div>test</div>
        </AuthStateMonitorProvider>
      );

      // 30秒進める
      act(() => {
        vi.advanceTimersByTime(30000);
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        '認証状態監視統計:',
        expect.objectContaining({
          isMonitoring: true,
        })
      );

      consoleSpy.mockRestore();
    });
  });

  describe('認証状態同期', () => {
    it('AuthContextの認証状態変更時に監視サービスと同期する', () => {
      const { rerender } = render(
        <AuthStateMonitorProvider>
          <div>test</div>
        </AuthStateMonitorProvider>
      );

      // AuthContextの状態を変更
      const authenticatedAuthContext = {
        ...mockAuthContext,
        isAuthenticated: true,
        user: { id: '1', email: 'test@example.com' },
        signOut: vi.fn().mockResolvedValue(undefined), // Ensure signOut returns a Promise
      };

      mockUseAuthContext.mockReturnValue(authenticatedAuthContext);

      rerender(
        <AuthStateMonitorProvider>
          <div>test</div>
        </AuthStateMonitorProvider>
      );

      expect(mockMonitorHook.checkAuthState).toHaveBeenCalled();
    });
  });
});
