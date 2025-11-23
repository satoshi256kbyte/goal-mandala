/**
 * 認証状態監視サービスの統合テスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
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

describe('AuthStateMonitor Integration Tests', () => {
  let monitor: AuthStateMonitor;
  let mockListener1: AuthStateListener;
  let mockListener2: AuthStateListener;

  beforeEach(() => {
    monitor = new AuthStateMonitor();

    mockListener1 = {
      id: 'listener-1',
      onAuthStateChange: vi.fn(),
      onTokenExpired: vi.fn(),
      onError: vi.fn(),
    };

    mockListener2 = {
      id: 'listener-2',
      onAuthStateChange: vi.fn(),
      onTokenExpired: vi.fn(),
      onError: vi.fn(),
    };

    // タイマーのモック
    vi.useFakeTimers();

    // モックのリセット
    vi.clearAllMocks();

    // デフォルトのモック設定
    (tokenManager.getToken as any).mockReturnValue('valid-token');
    (tokenManager.isTokenExpired as any).mockReturnValue(false);
    (tokenManager.getTokenExpirationTime as any).mockReturnValue(new Date(Date.now() + 3600000));
    (tokenManager.getLastActivity as any).mockReturnValue(new Date());
    (tokenManager.getSessionId as any).mockReturnValue('session-123');
    (tokenManager.refreshToken as any).mockResolvedValue(undefined);
    (tokenManager.updateLastActivity as any).mockImplementation(() => {});
    (AuthService.checkAuthState as any).mockResolvedValue(true);
    (AuthService.getCurrentUser as any).mockResolvedValue({
      id: '1',
      email: 'test@example.com',
    });
    (storageSync.startSync as any).mockImplementation(() => {});
    (storageSync.stopSync as any).mockImplementation(() => {});
    (storageSync.onAuthStateChange as any).mockImplementation(() => {});
    (storageSync.removeAuthStateListener as any).mockImplementation(() => {});
  });

  afterEach(() => {
    monitor.stopMonitoring();
    vi.useRealTimers();
  });

  describe('完全な監視フロー', () => {
    it('監視開始から停止までの完全なフローが正常に動作する', async () => {
      // リスナーを追加
      const removeListener1 = monitor.addListener(mockListener1);
      const removeListener2 = monitor.addListener(mockListener2);

      expect(monitor.getListenerCount()).toBe(2);

      // 監視を開始
      monitor.startMonitoring();
      expect(monitor.isActive()).toBe(true);

      // 認証状態をチェック
      const state = await monitor.checkAuthState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.user).toEqual({ id: '1', email: 'test@example.com' });

      // 両方のリスナーに通知されることを確認
      expect(mockListener1.onAuthStateChange).toHaveBeenCalledWith(state);
      expect(mockListener2.onAuthStateChange).toHaveBeenCalledWith(state);

      // 一つのリスナーを削除
      removeListener1();
      expect(monitor.getListenerCount()).toBe(1);

      // 状態を更新
      const newState: AuthState = {
        ...state,
        user: { id: '1', email: 'updated@example.com' },
      };
      monitor.updateAuthState(newState);

      // 残りのリスナーのみに通知されることを確認
      expect(mockListener2.onAuthStateChange).toHaveBeenLastCalledWith(newState);
      expect(mockListener1.onAuthStateChange).toHaveBeenCalledTimes(1); // 初回のみ

      // 監視を停止
      monitor.stopMonitoring();
      expect(monitor.isActive()).toBe(false);

      // 残りのリスナーを削除
      removeListener2();
      expect(monitor.getListenerCount()).toBe(0);
    });

    it('複数のエラーが発生した場合の処理が正常に動作する', async () => {
      monitor.addListener(mockListener1);
      monitor.startMonitoring();

      // 最初のエラー
      const error1: AuthError = {
        code: 'NETWORK_ERROR',
        message: 'ネットワークエラー',
        timestamp: new Date(),
        retryable: true,
      };

      monitor.notifyError(error1);
      expect(mockListener1.onError).toHaveBeenCalledWith(error1);

      // 2番目のエラー（リトライ不可）
      const error2: AuthError = {
        code: 'TOKEN_INVALID',
        message: 'トークンが無効です',
        timestamp: new Date(),
        retryable: false,
      };

      monitor.notifyError(error2);
      expect(mockListener1.onError).toHaveBeenCalledWith(error2);

      // トークン期限切れ
      monitor.notifyTokenExpired();
      expect(mockListener1.onTokenExpired).toHaveBeenCalled();

      expect(mockListener1.onError).toHaveBeenCalledTimes(2);
    });
  });

  describe('定期チェックとタイマー機能', () => {
    it('定期的な認証状態チェックが正常に動作する', async () => {
      monitor.addListener(mockListener1);
      monitor.startMonitoring();

      // 初回チェックが実行されることを確認
      await monitor.checkAuthState();
      expect(AuthService.checkAuthState).toHaveBeenCalled();

      // 1分後の定期チェック
      vi.advanceTimersByTime(60000);

      // 定期チェックが実行されることを確認（初回 + 定期）
      expect(AuthService.checkAuthState).toHaveBeenCalledTimes(2);
    });

    it('トークンリフレッシュのスケジューリングが正常に動作する', async () => {
      const expirationTime = new Date(Date.now() + 10 * 60 * 1000); // 10分後
      (tokenManager.getTokenExpirationTime as any).mockReturnValue(expirationTime);

      monitor.addListener(mockListener1);

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
      await vi.runAllTimersAsync();

      expect(tokenManager.refreshToken).toHaveBeenCalled();
    });

    it('非アクティブタイマーが正常に動作する', async () => {
      monitor.addListener(mockListener1);

      const state: AuthState = {
        isAuthenticated: true,
        isLoading: false,
        user: { id: '1', email: 'test@example.com' },
        error: null,
        tokenExpirationTime: new Date(Date.now() + 3600000),
        lastActivity: new Date(),
        sessionId: 'session-123',
      };

      monitor.updateAuthState(state);

      // 30分後（デフォルトの非アクティブタイムアウト）
      vi.advanceTimersByTime(30 * 60 * 1000);

      expect(mockListener1.onError).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'INACTIVITY_TIMEOUT',
          message: '長時間非アクティブのため自動ログアウトしました',
        })
      );
    });
  });

  describe('エラー処理とリトライ', () => {
    it('リトライ可能なエラーで自動リトライが実行される', async () => {
      monitor.addListener(mockListener1);
      monitor.startMonitoring();

      const error: AuthError = {
        code: 'NETWORK_ERROR',
        message: 'ネットワークエラー',
        timestamp: new Date(),
        retryable: true,
      };

      // 初回チェック
      await monitor.checkAuthState();
      const initialCallCount = (AuthService.checkAuthState as any).mock.calls.length;

      monitor.notifyError(error);

      // リトライが実行されることを確認（指数バックオフ）
      vi.advanceTimersByTime(1000); // 1秒後

      // リトライが実行されることを確認
      expect(AuthService.checkAuthState).toHaveBeenCalledTimes(initialCallCount + 1);
    });

    it('最大リトライ回数に達した場合はリトライを停止する', async () => {
      // 最大リトライ回数を1に設定
      monitor.updateConfig({ maxRetryAttempts: 1 });
      monitor.addListener(mockListener1);
      monitor.startMonitoring();

      const error: AuthError = {
        code: 'NETWORK_ERROR',
        message: 'ネットワークエラー',
        timestamp: new Date(),
        retryable: true,
      };

      // 初回チェック
      await monitor.checkAuthState();
      const initialCallCount = (AuthService.checkAuthState as any).mock.calls.length;

      // 1回目のエラー
      monitor.notifyError(error);
      vi.advanceTimersByTime(1000);

      // 2回目のエラー（最大回数に達する）
      monitor.notifyError(error);
      vi.advanceTimersByTime(2000);

      // 3回目のエラー（リトライされない）
      monitor.notifyError(error);
      vi.advanceTimersByTime(4000);

      // リトライが最大回数で停止することを確認
      expect(mockListener1.onError).toHaveBeenCalledTimes(3);
      // リトライは最大1回まで
      expect(AuthService.checkAuthState).toHaveBeenCalledTimes(initialCallCount + 1);
    });
  });

  describe('設定の動的変更', () => {
    it('監視中に設定を変更すると再起動される', () => {
      monitor.startMonitoring();
      expect(monitor.isActive()).toBe(true);

      const newConfig = {
        checkInterval: 30000, // 30秒
        tokenRefreshBuffer: 10 * 60 * 1000, // 10分
      };

      monitor.updateConfig(newConfig);

      // 監視が継続されることを確認
      expect(monitor.isActive()).toBe(true);
    });

    it('新しい設定が適用されることを確認', async () => {
      monitor.addListener(mockListener1);

      // 短い間隔に設定
      monitor.updateConfig({ checkInterval: 5000 }); // 5秒
      monitor.startMonitoring();

      // 初回チェック
      await monitor.checkAuthState();
      const initialCallCount = (AuthService.checkAuthState as any).mock.calls.length;

      // 5秒後に定期チェックが実行されることを確認
      vi.advanceTimersByTime(5000);

      expect(AuthService.checkAuthState).toHaveBeenCalledTimes(initialCallCount + 1);
    });
  });

  describe('StorageSync統合', () => {
    it('StorageSyncからの認証状態変更を正しく処理する', () => {
      monitor.addListener(mockListener1);
      monitor.startMonitoring();

      // StorageSyncの初期化が呼ばれることを確認
      expect(storageSync.startSync).toHaveBeenCalled();
      expect(storageSync.onAuthStateChange).toHaveBeenCalled();

      // 監視停止時にStorageSyncも停止されることを確認
      monitor.stopMonitoring();
      expect(storageSync.stopSync).toHaveBeenCalled();
    });
  });

  describe('メモリリークの防止', () => {
    it('監視停止時に全てのリソースがクリーンアップされる', () => {
      monitor.addListener(mockListener1);
      monitor.addListener(mockListener2);
      monitor.startMonitoring();

      expect(monitor.getListenerCount()).toBe(2);
      expect(monitor.isActive()).toBe(true);

      // 監視を停止
      monitor.stopMonitoring();

      expect(monitor.isActive()).toBe(false);
      // リスナーは手動で削除する必要があるため、カウントは変わらない
      expect(monitor.getListenerCount()).toBe(2);

      // 全リスナーを削除
      monitor.removeAllListeners();
      expect(monitor.getListenerCount()).toBe(0);
    });

    it('大量のリスナー追加・削除が正常に動作する', () => {
      const listeners: AuthStateListener[] = [];

      // 100個のリスナーを追加
      for (let i = 0; i < 100; i++) {
        const listener: AuthStateListener = {
          id: `listener-${i}`,
          onAuthStateChange: vi.fn(),
          onTokenExpired: vi.fn(),
          onError: vi.fn(),
        };
        listeners.push(listener);
        monitor.addListener(listener);
      }

      expect(monitor.getListenerCount()).toBe(100);

      // 半分のリスナーを削除
      for (let i = 0; i < 50; i++) {
        monitor.removeListener(listeners[i].id);
      }

      expect(monitor.getListenerCount()).toBe(50);

      // 残りを全削除
      monitor.removeAllListeners();
      expect(monitor.getListenerCount()).toBe(0);
    });
  });
});
