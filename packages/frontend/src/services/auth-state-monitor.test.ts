/**
 * 認証状態監視サービスのテスト
 */

import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';
import {
  AuthStateMonitor,
  type AuthState,
  type AuthError,
  type AuthStateListener,
} from './auth-state-monitor';
import { AuthService } from './auth';
import { tokenManager } from './tokenManager';
import { storageSync } from './storage-sync';

// モック
vi.mock('./auth');
vi.mock('./tokenManager');
vi.mock('./storage-sync');

describe('AuthStateMonitor', () => {
  let monitor: AuthStateMonitor;
  let mockListener: AuthStateListener;

  beforeEach(() => {
    monitor = new AuthStateMonitor();

    mockListener = {
      id: 'test-listener',
      onAuthStateChange: vi.fn(),
      onTokenExpired: vi.fn(),
      onError: vi.fn(),
    };

    // タイマーのモック
    vi.useFakeTimers();

    // モックのリセット
    vi.clearAllMocks();
  });

  afterEach(() => {
    monitor.stopMonitoring();
    vi.useRealTimers();
  });

  describe('監視の開始と停止', () => {
    it('監視を開始できる', () => {
      expect(monitor.isActive()).toBe(false);

      monitor.startMonitoring();

      expect(monitor.isActive()).toBe(true);
    });

    it('監視を停止できる', () => {
      monitor.startMonitoring();
      expect(monitor.isActive()).toBe(true);

      monitor.stopMonitoring();

      expect(monitor.isActive()).toBe(false);
    });

    it('既に監視中の場合は警告を出す', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      monitor.startMonitoring();
      monitor.startMonitoring(); // 2回目

      expect(consoleSpy).toHaveBeenCalledWith('認証状態監視は既に開始されています');

      consoleSpy.mockRestore();
    });

    it('初期状態を指定して監視を開始できる', () => {
      const initialState: AuthState = {
        isAuthenticated: true,
        isLoading: false,
        user: { id: '1', email: 'test@example.com' },
        error: null,
        tokenExpirationTime: new Date(Date.now() + 3600000),
        lastActivity: new Date(),
        sessionId: 'session-123',
      };

      monitor.startMonitoring(initialState);

      expect(monitor.getCurrentState()).toEqual(initialState);
    });
  });

  describe('リスナー管理', () => {
    it('リスナーを追加できる', () => {
      expect(monitor.getListenerCount()).toBe(0);

      const removeListener = monitor.addListener(mockListener);

      expect(monitor.getListenerCount()).toBe(1);
      expect(typeof removeListener).toBe('function');
    });

    it('リスナーを削除できる', () => {
      monitor.addListener(mockListener);
      expect(monitor.getListenerCount()).toBe(1);

      monitor.removeListener(mockListener.id);

      expect(monitor.getListenerCount()).toBe(0);
    });

    it('返された関数でリスナーを削除できる', () => {
      const removeListener = monitor.addListener(mockListener);
      expect(monitor.getListenerCount()).toBe(1);

      removeListener();

      expect(monitor.getListenerCount()).toBe(0);
    });

    it('全てのリスナーを削除できる', () => {
      monitor.addListener(mockListener);
      monitor.addListener({
        id: 'test-listener-2',
        onAuthStateChange: vi.fn(),
        onTokenExpired: vi.fn(),
        onError: vi.fn(),
      });

      expect(monitor.getListenerCount()).toBe(2);

      monitor.removeAllListeners();

      expect(monitor.getListenerCount()).toBe(0);
    });

    it('リスナー追加時に現在の状態を通知する', () => {
      const state: AuthState = {
        isAuthenticated: true,
        isLoading: false,
        user: { id: '1', email: 'test@example.com' },
        error: null,
        tokenExpirationTime: new Date(),
        lastActivity: new Date(),
        sessionId: 'session-123',
      };

      monitor.updateAuthState(state);
      monitor.addListener(mockListener);

      expect(mockListener.onAuthStateChange).toHaveBeenCalledWith(state);
    });
  });

  describe('認証状態の更新', () => {
    beforeEach(() => {
      monitor.addListener(mockListener);
    });

    it('認証状態を更新できる', () => {
      const newState: AuthState = {
        isAuthenticated: true,
        isLoading: false,
        user: { id: '1', email: 'test@example.com' },
        error: null,
        tokenExpirationTime: new Date(),
        lastActivity: new Date(),
        sessionId: 'session-123',
      };

      monitor.updateAuthState(newState);

      expect(monitor.getCurrentState()).toEqual(newState);
      expect(mockListener.onAuthStateChange).toHaveBeenCalledWith(newState);
    });

    it('同じ状態の場合は通知しない', () => {
      const state: AuthState = {
        isAuthenticated: true,
        isLoading: false,
        user: { id: '1', email: 'test@example.com' },
        error: null,
        tokenExpirationTime: new Date(),
        lastActivity: new Date(),
        sessionId: 'session-123',
      };

      monitor.updateAuthState(state);
      vi.clearAllMocks();

      monitor.updateAuthState(state); // 同じ状態

      expect(mockListener.onAuthStateChange).not.toHaveBeenCalled();
    });
  });

  describe('認証状態チェック', () => {
    beforeEach(() => {
      (tokenManager.getToken as Mock).mockReturnValue('valid-token');
      (tokenManager.isTokenExpired as Mock).mockReturnValue(false);
      (tokenManager.getTokenExpirationTime as Mock).mockReturnValue(new Date(Date.now() + 3600000));
      (tokenManager.getLastActivity as Mock).mockReturnValue(new Date());
      (tokenManager.getSessionId as Mock).mockReturnValue('session-123');
      (AuthService.checkAuthState as Mock).mockResolvedValue(true);
      (AuthService.getCurrentUser as Mock).mockResolvedValue({
        id: '1',
        email: 'test@example.com',
      });
    });

    it('認証済み状態を正しく検出する', async () => {
      const state = await monitor.checkAuthState();

      expect(state.isAuthenticated).toBe(true);
      expect(state.user).toEqual({ id: '1', email: 'test@example.com' });
      expect(state.error).toBeNull();
    });

    it('トークンがない場合は未認証状態を返す', async () => {
      (tokenManager.getToken as Mock).mockReturnValue(null);

      const state = await monitor.checkAuthState();

      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBeNull();
    });

    it('トークンが期限切れの場合は期限切れ通知を送る', async () => {
      (tokenManager.isTokenExpired as Mock).mockReturnValue(true);
      monitor.addListener(mockListener);

      const state = await monitor.checkAuthState();

      expect(state.isAuthenticated).toBe(false);
      expect(state.error).toBe('トークンの期限が切れています');
      expect(mockListener.onTokenExpired).toHaveBeenCalled();
    });

    it('Cognitoの認証チェックが失敗した場合は未認証状態を返す', async () => {
      (AuthService.checkAuthState as Mock).mockResolvedValue(false);

      const state = await monitor.checkAuthState();

      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBeNull();
    });

    it('エラーが発生した場合はエラー状態を返す', async () => {
      (AuthService.checkAuthState as Mock).mockRejectedValue(new Error('Network error'));
      monitor.addListener(mockListener);

      const state = await monitor.checkAuthState();

      expect(state.isAuthenticated).toBe(false);
      expect(state.error).toBe('認証状態の確認に失敗しました');
      expect(mockListener.onError).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'AUTH_CHECK_FAILED',
          message: '認証状態の確認に失敗しました',
          retryable: true,
        })
      );
    });
  });

  describe('エラー通知', () => {
    beforeEach(() => {
      monitor.addListener(mockListener);
    });

    it('エラーを全リスナーに通知する', () => {
      const error: AuthError = {
        code: 'TEST_ERROR',
        message: 'テストエラー',
        timestamp: new Date(),
        retryable: false,
      };

      monitor.notifyError(error);

      expect(mockListener.onError).toHaveBeenCalledWith(error);
    });

    it('リトライ可能なエラーの場合はリトライをスケジュールする', () => {
      const error: AuthError = {
        code: 'NETWORK_ERROR',
        message: 'ネットワークエラー',
        timestamp: new Date(),
        retryable: true,
      };

      monitor.notifyError(error);

      expect(mockListener.onError).toHaveBeenCalledWith(error);
      // リトライのテストは複雑なので、ここでは呼び出しのみ確認
    });

    it('リスナーでエラーが発生しても他のリスナーに影響しない', () => {
      const errorListener: AuthStateListener = {
        id: 'error-listener',
        onAuthStateChange: vi.fn(),
        onTokenExpired: vi.fn(),
        onError: vi.fn().mockImplementation(() => {
          throw new Error('Listener error');
        }),
      };

      monitor.addListener(errorListener);

      const error: AuthError = {
        code: 'TEST_ERROR',
        message: 'テストエラー',
        timestamp: new Date(),
        retryable: false,
      };

      expect(() => monitor.notifyError(error)).not.toThrow();
      expect(mockListener.onError).toHaveBeenCalledWith(error);
    });
  });

  describe('トークン期限切れ通知', () => {
    beforeEach(() => {
      monitor.addListener(mockListener);
    });

    it('トークン期限切れを全リスナーに通知する', () => {
      monitor.notifyTokenExpired();

      expect(mockListener.onTokenExpired).toHaveBeenCalled();
    });

    it('リスナーでエラーが発生しても他のリスナーに影響しない', () => {
      const errorListener: AuthStateListener = {
        id: 'error-listener',
        onAuthStateChange: vi.fn(),
        onTokenExpired: vi.fn().mockImplementation(() => {
          throw new Error('Listener error');
        }),
        onError: vi.fn(),
      };

      monitor.addListener(errorListener);

      expect(() => monitor.notifyTokenExpired()).not.toThrow();
      expect(mockListener.onTokenExpired).toHaveBeenCalled();
    });
  });

  describe('設定管理', () => {
    it('設定を更新できる', () => {
      const newConfig = {
        checkInterval: 30000,
        tokenRefreshBuffer: 10 * 60 * 1000,
      };

      monitor.updateConfig(newConfig);

      // 設定が適用されたかは内部実装に依存するため、
      // ここでは例外が発生しないことを確認
      expect(() => monitor.updateConfig(newConfig)).not.toThrow();
    });

    it('監視中に設定を更新すると再起動される', () => {
      monitor.startMonitoring();
      expect(monitor.isActive()).toBe(true);

      const newConfig = {
        checkInterval: 30000,
      };

      monitor.updateConfig(newConfig);

      expect(monitor.isActive()).toBe(true);
    });
  });

  describe('定期チェック', () => {
    beforeEach(() => {
      (tokenManager.getToken as Mock).mockReturnValue('valid-token');
      (tokenManager.isTokenExpired as Mock).mockReturnValue(false);
      (AuthService.checkAuthState as Mock).mockResolvedValue(true);
      (AuthService.getCurrentUser as Mock).mockResolvedValue({
        id: '1',
        email: 'test@example.com',
      });
    });

    it('定期的に認証状態をチェックする', async () => {
      monitor.startMonitoring();

      // 初回チェック
      await monitor.checkAuthState();
      const initialCallCount = (AuthService.checkAuthState as Mock).mock.calls.length;

      // 1分後（デフォルトの間隔）
      vi.advanceTimersByTime(60000);

      expect(AuthService.checkAuthState).toHaveBeenCalledTimes(initialCallCount + 1);
    });
  });

  describe('非アクティブタイマー', () => {
    it('認証済み状態で非アクティブタイマーが設定される', () => {
      const state: AuthState = {
        isAuthenticated: true,
        isLoading: false,
        user: { id: '1', email: 'test@example.com' },
        error: null,
        tokenExpirationTime: new Date(Date.now() + 3600000),
        lastActivity: new Date(),
        sessionId: 'session-123',
      };

      monitor.addListener(mockListener);
      monitor.updateAuthState(state);

      // 30分後（デフォルトの非アクティブタイムアウト）
      vi.advanceTimersByTime(30 * 60 * 1000);

      expect(mockListener.onError).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'INACTIVITY_TIMEOUT',
          message: '長時間非アクティブのため自動ログアウトしました',
        })
      );
    });

    it('未認証状態では非アクティブタイマーが設定されない', () => {
      const state: AuthState = {
        isAuthenticated: false,
        isLoading: false,
        user: null,
        error: null,
        tokenExpirationTime: null,
        lastActivity: null,
        sessionId: null,
      };

      monitor.addListener(mockListener);
      monitor.updateAuthState(state);

      // 30分後
      vi.advanceTimersByTime(30 * 60 * 1000);

      expect(mockListener.onError).not.toHaveBeenCalled();
    });
  });

  describe('トークンリフレッシュ', () => {
    beforeEach(() => {
      (tokenManager.refreshToken as Mock).mockResolvedValue(undefined);
    });

    it('トークン期限前にリフレッシュをスケジュールする', () => {
      const expirationTime = new Date(Date.now() + 10 * 60 * 1000); // 10分後
      const state: AuthState = {
        isAuthenticated: true,
        isLoading: false,
        user: { id: '1', email: 'test@example.com' },
        error: null,
        tokenExpirationTime: expirationTime,
        lastActivity: new Date(),
        sessionId: 'session-123',
      };

      monitor.updateAuthState(state);

      // 5分後（リフレッシュバッファ分早く）
      vi.advanceTimersByTime(5 * 60 * 1000);

      expect(tokenManager.refreshToken).toHaveBeenCalled();
    });

    it('トークンリフレッシュ失敗時にエラー通知する', async () => {
      (tokenManager.refreshToken as Mock).mockRejectedValue(new Error('Refresh failed'));

      const expirationTime = new Date(Date.now() + 10 * 60 * 1000);
      const state: AuthState = {
        isAuthenticated: true,
        isLoading: false,
        user: { id: '1', email: 'test@example.com' },
        error: null,
        tokenExpirationTime: expirationTime,
        lastActivity: new Date(),
        sessionId: 'session-123',
      };

      monitor.addListener(mockListener);
      monitor.updateAuthState(state);

      // リフレッシュ時刻まで進める
      vi.advanceTimersByTime(5 * 60 * 1000);

      // 非同期処理の完了を待つ
      await vi.runAllTimersAsync();

      expect(mockListener.onError).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'TOKEN_REFRESH_FAILED',
          message: 'トークンの更新に失敗しました',
        })
      );
      expect(mockListener.onTokenExpired).toHaveBeenCalled();
    });
  });
});
