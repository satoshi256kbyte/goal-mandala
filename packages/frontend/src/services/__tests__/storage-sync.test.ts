import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { StorageSync } from '../storage-sync';
import type { AuthState } from '../storage-sync';

// localStorageのモック
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

// StorageEventのモック
class MockStorageEvent extends Event {
  key: string | null;
  newValue: string | null;
  oldValue: string | null;
  storageArea: Storage | null;

  constructor(type: string, init?: StorageEventInit) {
    super(type);
    this.key = init?.key || null;
    this.newValue = init?.newValue || null;
    this.oldValue = init?.oldValue || null;
    this.storageArea = init?.storageArea || null;
  }
}

describe('StorageSync', () => {
  let storageSync: StorageSync;

  beforeEach(() => {
    vi.clearAllMocks();
    storageSync = new StorageSync({
      storageKey: 'test_auth_state_sync',
      syncInterval: 100,
      maxRetries: 3,
    });
  });

  afterEach(() => {
    storageSync.destroy();
    vi.restoreAllMocks();
  });

  describe('startSync', () => {
    it('同期機能を開始できる', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');

      storageSync.startSync();

      expect(addEventListenerSpy).toHaveBeenCalledWith('storage', expect.any(Function));
    });

    it('既に開始している場合、何もしない', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');

      storageSync.startSync();
      storageSync.startSync();

      expect(addEventListenerSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('stopSync', () => {
    it('同期機能を停止できる', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      storageSync.startSync();
      storageSync.stopSync();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('storage', expect.any(Function));
    });

    it('開始していない場合、何もしない', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      storageSync.stopSync();

      expect(removeEventListenerSpy).not.toHaveBeenCalled();
    });
  });

  describe('broadcastAuthStateChange', () => {
    it('ログイン状態をブロードキャストできる', () => {
      const authState: AuthState = {
        isAuthenticated: true,
        user: {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
        },
        sessionId: 'session-123',
        lastActivity: new Date(),
      };

      storageSync.broadcastAuthStateChange(authState);

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'test_auth_state_sync',
        expect.stringContaining('"action":"login"')
      );
    });

    it('ログアウト状態をブロードキャストできる', () => {
      storageSync.broadcastAuthStateChange(null);

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'test_auth_state_sync',
        expect.stringContaining('"action":"logout"')
      );
    });

    it('ブロードキャスト後、同期キーを削除する', async () => {
      vi.useFakeTimers();

      storageSync.broadcastAuthStateChange(null);

      vi.advanceTimersByTime(150);

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('test_auth_state_sync');

      vi.useRealTimers();
    });
  });

  describe('onStorageChange', () => {
    it('StorageEventリスナーを追加できる', () => {
      const callback = vi.fn();

      storageSync.onStorageChange(callback);
      storageSync.startSync();

      const event = new MockStorageEvent('storage', {
        key: 'auth_access_token',
        newValue: 'new-token',
        oldValue: 'old-token',
        storageArea: localStorage,
      });

      window.dispatchEvent(event);

      expect(callback).toHaveBeenCalledWith(event);
    });

    it('複数のリスナーを追加できる', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      storageSync.onStorageChange(callback1);
      storageSync.onStorageChange(callback2);
      storageSync.startSync();

      const event = new MockStorageEvent('storage', {
        key: 'auth_access_token',
        newValue: 'new-token',
        storageArea: localStorage,
      });

      window.dispatchEvent(event);

      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });
  });

  describe('removeStorageListener', () => {
    it('StorageEventリスナーを削除できる', () => {
      const callback = vi.fn();

      storageSync.onStorageChange(callback);
      storageSync.removeStorageListener(callback);
      storageSync.startSync();

      const event = new MockStorageEvent('storage', {
        key: 'auth_access_token',
        newValue: 'new-token',
        storageArea: localStorage,
      });

      window.dispatchEvent(event);

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('onAuthStateChange', () => {
    it('認証状態変更リスナーを追加できる', () => {
      const callback = vi.fn();

      storageSync.onAuthStateChange(callback);
      storageSync.startSync();

      mockLocalStorage.getItem.mockReturnValue('test-token');

      const event = new MockStorageEvent('storage', {
        key: 'auth_access_token',
        newValue: 'new-token',
        oldValue: null,
        storageArea: localStorage,
      });

      window.dispatchEvent(event);

      expect(callback).toHaveBeenCalled();
    });
  });

  describe('removeAuthStateListener', () => {
    it('認証状態変更リスナーを削除できる', () => {
      const callback = vi.fn();

      storageSync.onAuthStateChange(callback);
      storageSync.removeAuthStateListener(callback);
      storageSync.startSync();

      const event = new MockStorageEvent('storage', {
        key: 'auth_access_token',
        newValue: 'new-token',
        oldValue: null,
        storageArea: localStorage,
      });

      window.dispatchEvent(event);

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('handleStorageEvent', () => {
    beforeEach(() => {
      storageSync.startSync();
    });

    it('認証トークンが削除された場合、ログアウト処理を実行する', () => {
      const callback = vi.fn();
      storageSync.onAuthStateChange(callback);

      const event = new MockStorageEvent('storage', {
        key: 'auth_access_token',
        newValue: null,
        oldValue: 'old-token',
        storageArea: localStorage,
      });

      window.dispatchEvent(event);

      expect(callback).toHaveBeenCalledWith(null);
    });

    it('認証トークンが追加された場合、ログイン処理を実行する', () => {
      const callback = vi.fn();
      storageSync.onAuthStateChange(callback);

      mockLocalStorage.getItem.mockImplementation((key: string) => {
        if (key === 'auth_access_token') return 'new-token';
        if (key === 'auth_user_data')
          return JSON.stringify({ id: 'user-123', email: 'test@example.com' });
        return null;
      });

      const event = new MockStorageEvent('storage', {
        key: 'auth_access_token',
        newValue: 'new-token',
        oldValue: null,
        storageArea: localStorage,
      });

      window.dispatchEvent(event);

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          isAuthenticated: true,
        })
      );
    });

    it('同期キーの変更を処理する', () => {
      const callback = vi.fn();
      storageSync.onAuthStateChange(callback);

      const syncData = {
        timestamp: Date.now(),
        sessionId: 'other-session',
        authState: null,
        action: 'logout',
      };

      const event = new MockStorageEvent('storage', {
        key: 'test_auth_state_sync',
        newValue: JSON.stringify(syncData),
        oldValue: null,
        storageArea: localStorage,
      });

      window.dispatchEvent(event);

      expect(callback).toHaveBeenCalledWith(null);
    });

    it('自分のセッションからのメッセージは無視する', () => {
      const callback = vi.fn();
      storageSync.onAuthStateChange(callback);

      mockLocalStorage.getItem.mockImplementation((key: string) => {
        if (key === 'auth_session_id') return 'current-session';
        return null;
      });

      const syncData = {
        timestamp: Date.now(),
        sessionId: 'current-session',
        authState: null,
        action: 'logout',
      };

      const event = new MockStorageEvent('storage', {
        key: 'test_auth_state_sync',
        newValue: JSON.stringify(syncData),
        oldValue: null,
        storageArea: localStorage,
      });

      window.dispatchEvent(event);

      expect(callback).not.toHaveBeenCalled();
    });

    it('認証関連以外のキーの変更は無視する', () => {
      const callback = vi.fn();
      storageSync.onAuthStateChange(callback);

      const event = new MockStorageEvent('storage', {
        key: 'other_key',
        newValue: 'value',
        oldValue: null,
        storageArea: localStorage,
      });

      window.dispatchEvent(event);

      expect(callback).not.toHaveBeenCalled();
    });

    it('sessionStorageの変更は無視する', () => {
      const callback = vi.fn();
      storageSync.onAuthStateChange(callback);

      const event = new MockStorageEvent('storage', {
        key: 'auth_access_token',
        newValue: 'new-token',
        oldValue: null,
        storageArea: sessionStorage,
      });

      window.dispatchEvent(event);

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('checkAuthStateSync', () => {
    it('トークンが削除された場合、ログアウト通知を送る', async () => {
      vi.useFakeTimers();

      const callback = vi.fn();
      storageSync.onAuthStateChange(callback);

      // 初回チェック時はトークンあり
      mockLocalStorage.getItem.mockReturnValueOnce('test-token');
      storageSync.startSync();

      vi.advanceTimersByTime(100);

      // 2回目チェック時はトークンなし
      mockLocalStorage.getItem.mockReturnValueOnce(null);
      vi.advanceTimersByTime(100);

      expect(callback).toHaveBeenCalledWith(null);

      vi.useRealTimers();
    });

    it('トークンが追加された場合、ログイン通知を送る', async () => {
      vi.useFakeTimers();

      const callback = vi.fn();
      storageSync.onAuthStateChange(callback);

      // 初回チェック時はトークンなし
      mockLocalStorage.getItem.mockReturnValueOnce(null);
      storageSync.startSync();

      vi.advanceTimersByTime(100);

      // 2回目チェック時はトークンあり
      mockLocalStorage.getItem.mockImplementation((key: string) => {
        if (key === 'auth_access_token') return 'new-token';
        if (key === 'auth_user_data')
          return JSON.stringify({ id: 'user-123', email: 'test@example.com' });
        return null;
      });
      vi.advanceTimersByTime(100);

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          isAuthenticated: true,
        })
      );

      vi.useRealTimers();
    });
  });

  describe('エラーハンドリング', () => {
    it('同期エラー時、最大リトライ回数まで再試行する', async () => {
      vi.useFakeTimers();

      const callback = vi.fn();
      storageSync.onAuthStateChange(callback);

      // エラーを発生させる
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error('Storage error');
      });

      storageSync.startSync();

      // 3回のリトライ
      for (let i = 0; i < 3; i++) {
        vi.advanceTimersByTime(100);
      }

      // 最大リトライ回数に達したら、安全側に倒してログアウト
      expect(callback).toHaveBeenCalledWith(null);

      vi.useRealTimers();
    });

    it('リスナーエラーは他のリスナーに影響しない', () => {
      const callback1 = vi.fn().mockImplementation(() => {
        throw new Error('Listener error');
      });
      const callback2 = vi.fn();

      storageSync.onAuthStateChange(callback1);
      storageSync.onAuthStateChange(callback2);
      storageSync.startSync();

      const event = new MockStorageEvent('storage', {
        key: 'auth_access_token',
        newValue: null,
        oldValue: 'old-token',
        storageArea: localStorage,
      });

      window.dispatchEvent(event);

      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });
  });

  describe('destroy', () => {
    it('全てのリソースをクリーンアップする', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      storageSync.onStorageChange(callback1);
      storageSync.onAuthStateChange(callback2);
      storageSync.startSync();

      storageSync.destroy();

      expect(removeEventListenerSpy).toHaveBeenCalled();

      // リスナーがクリアされていることを確認
      const event = new MockStorageEvent('storage', {
        key: 'auth_access_token',
        newValue: 'new-token',
        storageArea: localStorage,
      });

      window.dispatchEvent(event);

      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).not.toHaveBeenCalled();
    });
  });
});

describe('StorageSync - Edge Cases', () => {
  let storageSync: StorageSync;

  beforeEach(() => {
    vi.clearAllMocks();
    storageSync = new StorageSync({
      storageKey: 'test_auth_state_sync',
      syncInterval: 100,
      maxRetries: 3,
    });
  });

  afterEach(() => {
    storageSync.destroy();
    vi.restoreAllMocks();
  });

  describe('境界値テスト', () => {
    it('syncIntervalが0の場合でも動作する', () => {
      const sync = new StorageSync({ syncInterval: 0 });
      expect(() => sync.startSync()).not.toThrow();
      sync.destroy();
    });

    it('maxRetriesが1の場合、1回のエラーでログアウト処理を実行する', async () => {
      vi.useFakeTimers();

      const sync = new StorageSync({ maxRetries: 1, syncInterval: 100 });
      const callback = vi.fn();
      sync.onAuthStateChange(callback);

      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error('Storage error');
      });

      sync.startSync();

      // 初回チェックでエラー
      vi.advanceTimersByTime(100);

      expect(callback).toHaveBeenCalledWith(null);

      sync.destroy();
      vi.useRealTimers();
    });

    it('非常に長いstorageKeyでも動作する', () => {
      const longKey = 'a'.repeat(1000);
      const sync = new StorageSync({ storageKey: longKey });

      expect(() => sync.startSync()).not.toThrow();
      sync.destroy();
    });
  });

  describe('エラーケーステスト', () => {
    it('ブロードキャスト時にlocalStorageエラーが発生しても処理を続行する', () => {
      mockLocalStorage.setItem.mockImplementationOnce(() => {
        throw new Error('Storage error');
      });

      const authState: AuthState = {
        isAuthenticated: true,
        user: {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
        },
        sessionId: 'session-123',
        lastActivity: new Date(),
      };

      expect(() => storageSync.broadcastAuthStateChange(authState)).not.toThrow();
    });

    it('無効なJSON形式の同期メッセージを受信しても処理を続行する', () => {
      storageSync.startSync();

      const event = new MockStorageEvent('storage', {
        key: 'test_auth_state_sync',
        newValue: '{invalid json}',
        oldValue: null,
        storageArea: localStorage,
      });

      expect(() => window.dispatchEvent(event)).not.toThrow();
    });

    it('nullのStorageEventを処理できる', () => {
      storageSync.startSync();

      const event = new MockStorageEvent('storage', {
        key: null,
        newValue: null,
        oldValue: null,
        storageArea: localStorage,
      });

      expect(() => window.dispatchEvent(event)).not.toThrow();
    });
  });

  describe('並行処理テスト', () => {
    it('複数のタブから同時にブロードキャストしても正常に動作する', () => {
      const authState1: AuthState = {
        isAuthenticated: true,
        user: { id: 'user-1', email: 'test1@example.com', name: 'User 1' },
        sessionId: 'session-1',
        lastActivity: new Date(),
      };

      const authState2: AuthState = {
        isAuthenticated: true,
        user: { id: 'user-2', email: 'test2@example.com', name: 'User 2' },
        sessionId: 'session-2',
        lastActivity: new Date(),
      };

      expect(() => {
        storageSync.broadcastAuthStateChange(authState1);
        storageSync.broadcastAuthStateChange(authState2);
      }).not.toThrow();
    });

    it('startSyncとstopSyncを連続して呼び出しても正常に動作する', () => {
      expect(() => {
        storageSync.startSync();
        storageSync.stopSync();
        storageSync.startSync();
        storageSync.stopSync();
      }).not.toThrow();
    });

    it('複数のリスナーを追加・削除しても正常に動作する', () => {
      const callbacks = Array.from({ length: 10 }, () => vi.fn());

      callbacks.forEach(cb => storageSync.onAuthStateChange(cb));
      callbacks.forEach(cb => storageSync.removeAuthStateListener(cb));

      storageSync.startSync();

      const event = new MockStorageEvent('storage', {
        key: 'auth_access_token',
        newValue: null,
        oldValue: 'old-token',
        storageArea: localStorage,
      });

      window.dispatchEvent(event);

      callbacks.forEach(cb => expect(cb).not.toHaveBeenCalled());
    });
  });

  describe('データ変換テスト', () => {
    it('特殊文字を含むユーザーデータをブロードキャストできる', () => {
      const authState: AuthState = {
        isAuthenticated: true,
        user: {
          id: 'user-123',
          email: 'test+special@example.com',
          name: 'Test <User> & "Name"',
        },
        sessionId: 'session-123',
        lastActivity: new Date(),
      };

      expect(() => storageSync.broadcastAuthStateChange(authState)).not.toThrow();
    });

    it('非常に大きなユーザーデータをブロードキャストできる', () => {
      const authState: AuthState = {
        isAuthenticated: true,
        user: {
          id: 'user-123',
          email: 'test@example.com',
          name: 'A'.repeat(1000),
        },
        sessionId: 'session-123',
        lastActivity: new Date(),
      };

      expect(() => storageSync.broadcastAuthStateChange(authState)).not.toThrow();
    });

    it('lastActivityが古い日付でも正常に処理できる', () => {
      const authState: AuthState = {
        isAuthenticated: true,
        user: {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
        },
        sessionId: 'session-123',
        lastActivity: new Date('2020-01-01'),
      };

      expect(() => storageSync.broadcastAuthStateChange(authState)).not.toThrow();
    });
  });

  describe('タイミングテスト', () => {
    it('startSync直後にイベントを受信しても正常に処理できる', () => {
      const callback = vi.fn();
      storageSync.onAuthStateChange(callback);
      storageSync.startSync();

      const event = new MockStorageEvent('storage', {
        key: 'auth_access_token',
        newValue: null,
        oldValue: 'old-token',
        storageArea: localStorage,
      });

      window.dispatchEvent(event);

      expect(callback).toHaveBeenCalled();
    });

    it('stopSync直後にイベントを受信しても処理されない', () => {
      const callback = vi.fn();
      storageSync.onAuthStateChange(callback);
      storageSync.startSync();
      storageSync.stopSync();

      const event = new MockStorageEvent('storage', {
        key: 'auth_access_token',
        newValue: null,
        oldValue: 'old-token',
        storageArea: localStorage,
      });

      window.dispatchEvent(event);

      expect(callback).not.toHaveBeenCalled();
    });

    it('destroy後にイベントを受信しても処理されない', () => {
      const callback = vi.fn();
      storageSync.onAuthStateChange(callback);
      storageSync.startSync();
      storageSync.destroy();

      const event = new MockStorageEvent('storage', {
        key: 'auth_access_token',
        newValue: null,
        oldValue: 'old-token',
        storageArea: localStorage,
      });

      window.dispatchEvent(event);

      expect(callback).not.toHaveBeenCalled();
    });
  });
});
