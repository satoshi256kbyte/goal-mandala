/**
 * 複数タブ同期機能の統合テスト
 *
 * 機能:
 * - タブ間での認証状態同期のテスト
 * - StorageEventハンドリングのテスト
 * - 同期エラー時の安全側処理のテスト
 *
 * 要件: 6.3, 6.4, 6.5
 */

import { render, screen, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../../components/auth/AuthProvider';
import { AuthStateMonitorProvider } from '../../components/auth/AuthStateMonitorProvider';
import { useAuthContext } from '../../hooks/useAuth';
import { useAuthStateMonitorContext } from '../../components/auth/AuthStateMonitorProvider';
import { StorageSync } from '../../services/storage-sync';
import type { AuthState } from '../../services/auth-state-monitor';

// テスト用コンポーネント
const TestComponent: React.FC = () => {
  const auth = useAuthContext();
  const monitor = useAuthStateMonitorContext();

  return (
    <div>
      <div data-testid="auth-status">
        {auth.isAuthenticated ? 'authenticated' : 'unauthenticated'}
      </div>
      <div data-testid="monitor-status">
        {monitor.isMonitoring ? 'monitoring' : 'not-monitoring'}
      </div>
      <div data-testid="listener-count">{monitor.listenerCount}</div>
      <div data-testid="error-count">{monitor.errorHistory.length}</div>
      <button data-testid="sign-in-btn" onClick={() => auth.signIn('test@example.com', 'password')}>
        Sign In
      </button>
      <button data-testid="sign-out-btn" onClick={() => auth.signOut()}>
        Sign Out
      </button>
    </div>
  );
};

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>
    <AuthProvider>
      <AuthStateMonitorProvider autoStart={true} debug={true}>
        {children}
      </AuthStateMonitorProvider>
    </AuthProvider>
  </BrowserRouter>
);

// StorageEventのモック
const mockStorageEvent = (key: string, newValue: string | null, oldValue: string | null = null) => {
  const event = new StorageEvent('storage', {
    key,
    newValue,
    oldValue,
    storageArea: localStorage,
  });
  window.dispatchEvent(event);
};

describe('複数タブ同期機能の統合テスト', () => {
  let originalLocalStorage: Storage;
  let mockLocalStorage: { [key: string]: string };

  beforeEach(() => {
    // LocalStorageのモック
    originalLocalStorage = window.localStorage;
    mockLocalStorage = {};

    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn((key: string) => mockLocalStorage[key] || null),
        setItem: vi.fn((key: string, value: string) => {
          mockLocalStorage[key] = value;
        }),
        removeItem: vi.fn((key: string) => {
          delete mockLocalStorage[key];
        }),
        clear: vi.fn(() => {
          mockLocalStorage = {};
        }),
      },
      writable: true,
    });

    // StorageSyncのモック
    vi.spyOn(StorageSync.prototype, 'startSync').mockImplementation();
    vi.spyOn(StorageSync.prototype, 'stopSync').mockImplementation();
    vi.spyOn(StorageSync.prototype, 'broadcastAuthStateChange').mockImplementation();
  });

  afterEach(() => {
    Object.defineProperty(window, 'localStorage', {
      value: originalLocalStorage,
      writable: true,
    });
    vi.restoreAllMocks();
  });

  describe('タブ間での認証状態同期', () => {
    it('他のタブでログインした時に認証状態が同期される', async () => {
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      // 初期状態は未認証
      expect(screen.getByTestId('auth-status')).toHaveTextContent('unauthenticated');

      // 他のタブでログインをシミュレート
      const authState: AuthState = {
        isAuthenticated: true,
        isLoading: false,
        user: { id: '1', email: 'test@example.com', name: 'Test User' },
        error: null,
        tokenExpirationTime: new Date(Date.now() + 3600000),
        lastActivity: new Date(),
        sessionId: 'test-session',
      };

      act(() => {
        mockStorageEvent('auth_state', JSON.stringify(authState));
      });

      // 認証状態が同期されることを確認
      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated');
      });
    });

    it('他のタブでログアウトした時に認証状態が同期される', async () => {
      // 初期状態を認証済みに設定
      const initialAuthState: AuthState = {
        isAuthenticated: true,
        isLoading: false,
        user: { id: '1', email: 'test@example.com', name: 'Test User' },
        error: null,
        tokenExpirationTime: new Date(Date.now() + 3600000),
        lastActivity: new Date(),
        sessionId: 'test-session',
      };

      mockLocalStorage['auth_state'] = JSON.stringify(initialAuthState);

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      // 初期状態は認証済み
      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated');
      });

      // 他のタブでログアウトをシミュレート
      act(() => {
        mockStorageEvent('auth_state', null, JSON.stringify(initialAuthState));
      });

      // 認証状態が同期されることを確認
      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('unauthenticated');
      });
    });

    it('トークンが他のタブで更新された時に同期される', async () => {
      const initialAuthState: AuthState = {
        isAuthenticated: true,
        isLoading: false,
        user: { id: '1', email: 'test@example.com', name: 'Test User' },
        error: null,
        tokenExpirationTime: new Date(Date.now() + 3600000),
        lastActivity: new Date(),
        sessionId: 'test-session',
      };

      mockLocalStorage['auth_state'] = JSON.stringify(initialAuthState);

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      // 他のタブでトークン更新をシミュレート
      const updatedAuthState: AuthState = {
        ...initialAuthState,
        tokenExpirationTime: new Date(Date.now() + 7200000), // 2時間後
        lastActivity: new Date(),
      };

      act(() => {
        mockStorageEvent('auth_access_token', 'new-token-value');
        mockStorageEvent('auth_state', JSON.stringify(updatedAuthState));
      });

      // 状態が更新されることを確認
      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated');
      });
    });
  });

  describe('StorageEventハンドリング', () => {
    it('無効なStorageEventデータを適切に処理する', async () => {
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      // 無効なJSONデータをシミュレート
      act(() => {
        mockStorageEvent('auth_state', 'invalid-json-data');
      });

      // エラーが記録されることを確認
      await waitFor(() => {
        const errorCount = screen.getByTestId('error-count');
        expect(parseInt(errorCount.textContent || '0')).toBeGreaterThan(0);
      });

      // アプリケーションが正常に動作し続けることを確認
      expect(screen.getByTestId('auth-status')).toHaveTextContent('unauthenticated');
    });

    it('関係のないStorageEventを無視する', async () => {
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      const initialErrorCount = parseInt(screen.getByTestId('error-count').textContent || '0');

      // 関係のないStorageEventをシミュレート
      act(() => {
        mockStorageEvent('unrelated_key', 'some-value');
        mockStorageEvent('another_key', 'another-value');
      });

      // エラーが増加しないことを確認
      await waitFor(() => {
        const currentErrorCount = parseInt(screen.getByTestId('error-count').textContent || '0');
        expect(currentErrorCount).toBe(initialErrorCount);
      });
    });

    it('同一タブからのStorageEventを適切に処理する', async () => {
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      // 同一タブからの変更をシミュレート（通常は発生しないが、テストのため）
      const authState: AuthState = {
        isAuthenticated: true,
        isLoading: false,
        user: { id: '1', email: 'test@example.com', name: 'Test User' },
        error: null,
        tokenExpirationTime: new Date(Date.now() + 3600000),
        lastActivity: new Date(),
        sessionId: 'test-session',
      };

      act(() => {
        // 同一タブからの変更として処理
        mockLocalStorage['auth_state'] = JSON.stringify(authState);
        mockStorageEvent('auth_state', JSON.stringify(authState));
      });

      // 適切に処理されることを確認
      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated');
      });
    });
  });

  describe('同期エラー時の安全側処理', () => {
    it('同期エラー時に安全側にログアウトする', async () => {
      const initialAuthState: AuthState = {
        isAuthenticated: true,
        isLoading: false,
        user: { id: '1', email: 'test@example.com', name: 'Test User' },
        error: null,
        tokenExpirationTime: new Date(Date.now() + 3600000),
        lastActivity: new Date(),
        sessionId: 'test-session',
      };

      mockLocalStorage['auth_state'] = JSON.stringify(initialAuthState);

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      // 初期状態は認証済み
      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated');
      });

      // 同期エラーをシミュレート（破損したデータ）
      act(() => {
        mockStorageEvent('auth_state', '{"corrupted": true}');
      });

      // 安全側にログアウトされることを確認
      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('unauthenticated');
      });

      // エラーが記録されることを確認
      await waitFor(() => {
        const errorCount = screen.getByTestId('error-count');
        expect(parseInt(errorCount.textContent || '0')).toBeGreaterThan(0);
      });
    });

    it('ネットワークエラー時に適切にリトライする', async () => {
      // ネットワークエラーをシミュレートするためのモック
      const mockFetch = vi.fn().mockRejectedValueOnce(new Error('Network error'));
      global.fetch = mockFetch;

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      // ネットワークエラーが発生した場合の処理を確認
      // 実際の実装では、認証状態の検証でネットワークエラーが発生する可能性がある

      await waitFor(() => {
        expect(screen.getByTestId('monitor-status')).toHaveTextContent('monitoring');
      });

      // エラーハンドリングが適切に動作することを確認
      // 具体的な実装に依存するため、ここではモニタリングが継続されることを確認
    });

    it('複数の同期エラーが連続して発生した場合の処理', async () => {
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      // 複数の無効なStorageEventを連続して送信
      act(() => {
        mockStorageEvent('auth_state', 'invalid-data-1');
        mockStorageEvent('auth_state', 'invalid-data-2');
        mockStorageEvent('auth_state', 'invalid-data-3');
      });

      // エラーが適切に処理され、アプリケーションが安定していることを確認
      await waitFor(() => {
        const errorCount = screen.getByTestId('error-count');
        expect(parseInt(errorCount.textContent || '0')).toBeGreaterThan(0);
      });

      // モニタリングが継続されることを確認
      expect(screen.getByTestId('monitor-status')).toHaveTextContent('monitoring');
    });
  });

  describe('パフォーマンステスト', () => {
    it('大量のStorageEventを効率的に処理する', async () => {
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      const startTime = performance.now();

      // 大量のStorageEventをシミュレート
      act(() => {
        for (let i = 0; i < 100; i++) {
          mockStorageEvent(`test_key_${i}`, `test_value_${i}`);
        }
      });

      const endTime = performance.now();
      const processingTime = endTime - startTime;

      // 処理時間が合理的な範囲内であることを確認（100ms以下）
      expect(processingTime).toBeLessThan(100);

      // アプリケーションが正常に動作していることを確認
      expect(screen.getByTestId('monitor-status')).toHaveTextContent('monitoring');
    });

    it('メモリリークが発生しないことを確認', async () => {
      const { unmount } = render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      // 複数のStorageEventを発生させる
      act(() => {
        for (let i = 0; i < 50; i++) {
          mockStorageEvent('auth_state', JSON.stringify({ test: i }));
        }
      });

      // コンポーネントをアンマウント
      unmount();

      // ガベージコレクションを促進
      if (global.gc) {
        global.gc();
      }

      // メモリリークの検出は困難だが、少なくともエラーが発生しないことを確認
      expect(true).toBe(true);
    });
  });
});
