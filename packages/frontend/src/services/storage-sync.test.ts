/**
 * StorageSync ユニットテスト
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { AuthState } from '../types/storage-sync';
import { StorageSync } from './storage-sync';

describe('StorageSync', () => {
  let storageSync: StorageSync;
  let mockAuthStateListener: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // LocalStorageをクリア
    localStorage.clear();

    // タイマーモックを設定
    vi.useFakeTimers();

    storageSync = new StorageSync({
      storageKey: 'test_auth_sync',
      syncInterval: 1000,
      maxRetries: 3,
    });

    mockAuthStateListener = vi.fn();

    // リスナーを登録
    storageSync.onAuthStateChange(mockAuthStateListener);

    // モックをリセット
    vi.clearAllMocks();
  });

  afterEach(() => {
    storageSync.destroy();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('基本機能', () => {
    test('同期機能の開始と停止', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      // 同期開始
      storageSync.startSync();
      expect(addEventListenerSpy).toHaveBeenCalledWith('storage', expect.any(Function));

      // 同期停止
      storageSync.stopSync();
      expect(removeEventListenerSpy).toHaveBeenCalledWith('storage', expect.any(Function));

      addEventListenerSpy.mockRestore();
      removeEventListenerSpy.mockRestore();
    });

    test('重複した同期開始は無視される', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');

      storageSync.startSync();
      storageSync.startSync(); // 2回目は無視される

      expect(addEventListenerSpy).toHaveBeenCalledTimes(1);
      addEventListenerSpy.mockRestore();
    });
  });

  describe('認証状態ブロードキャスト', () => {
    test('ログイン状態のブロードキャスト', () => {
      const authState: AuthState = {
        isAuthenticated: true,
        user: { id: '1', email: 'test@example.com' },
        sessionId: 'session123',
        lastActivity: new Date(),
      };

      storageSync.broadcastAuthStateChange(authState);

      // LocalStorageに同期データが設定されることを確認
      const syncData = localStorage.getItem('test_auth_sync');
      expect(syncData).toBeTruthy();

      if (syncData) {
        const parsedData = JSON.parse(syncData);
        expect(parsedData.action).toBe('login');
        expect(parsedData.authState).toMatchObject({
          isAuthenticated: true,
          user: { id: '1', email: 'test@example.com' },
        });
      }
    });

    test('ログアウト状態のブロードキャスト', () => {
      storageSync.broadcastAuthStateChange(null);

      // LocalStorageに同期データが設定されることを確認
      const syncData = localStorage.getItem('test_auth_sync');
      expect(syncData).toBeTruthy();

      if (syncData) {
        const parsedData = JSON.parse(syncData);
        expect(parsedData.action).toBe('logout');
        expect(parsedData.authState).toBeNull();
      }
    });

    test('ブロードキャスト後の自動削除', () => {
      storageSync.broadcastAuthStateChange(null);

      // 初期状態では同期データが存在
      expect(localStorage.getItem('test_auth_sync')).toBeTruthy();

      // タイマーを進める
      vi.advanceTimersByTime(150);

      // 自動削除されることを確認
      expect(localStorage.getItem('test_auth_sync')).toBeNull();
    });
  });

  describe('定期同期チェック', () => {
    beforeEach(() => {
      storageSync.startSync();
    });

    test('他のタブでのログアウト検出', () => {
      // 初期状態：認証済み
      localStorage.setItem('auth_user_data', JSON.stringify({ id: '1' }));
      localStorage.setItem('auth_session_id', 'session123');

      // 定期チェック実行前にトークンを削除（他のタブでのログアウトをシミュレート）
      localStorage.removeItem('auth_access_token');

      // 定期チェックを実行
      vi.advanceTimersByTime(1000);

      expect(mockAuthStateListener).toHaveBeenCalledWith(null);
    });

    test('他のタブでのログイン検出', () => {
      // 初期状態：未認証
      // 定期チェック実行前にトークンを追加（他のタブでのログインをシミュレート）
      localStorage.setItem('auth_access_token', 'new_token');
      localStorage.setItem(
        'auth_user_data',
        JSON.stringify({ id: '1', email: 'test@example.com' })
      );

      // 定期チェックを実行
      vi.advanceTimersByTime(1000);

      expect(mockAuthStateListener).toHaveBeenCalledWith(
        expect.objectContaining({
          isAuthenticated: true,
          user: { id: '1', email: 'test@example.com' },
        })
      );
    });
  });

  describe('エラーハンドリング', () => {
    beforeEach(() => {
      storageSync.startSync();
    });

    test('同期エラー時のリトライ処理', () => {
      // LocalStorageのgetItemでエラーを発生させる
      const originalGetItem = localStorage.getItem;
      localStorage.getItem = vi.fn().mockImplementation(() => {
        throw new Error('Storage error');
      });

      // 定期チェックを3回実行（最大リトライ回数）
      vi.advanceTimersByTime(1000);
      vi.advanceTimersByTime(1000);
      vi.advanceTimersByTime(1000);

      // 最大リトライ回数に達した後、安全側に倒してログアウト処理
      expect(mockAuthStateListener).toHaveBeenCalledWith(null);

      // モックを復元
      localStorage.getItem = originalGetItem;
    });
  });

  describe('リスナー管理', () => {
    test('認証状態変更リスナーの追加と削除', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      storageSync.onAuthStateChange(listener1);
      storageSync.onAuthStateChange(listener2);

      // 内部的に認証状態変更を通知
      storageSync['notifyAuthStateChange'](null);

      // 両方のリスナーが呼ばれることを確認
      expect(listener1).toHaveBeenCalledWith(null);
      expect(listener2).toHaveBeenCalledWith(null);

      // リスナーを削除
      storageSync.removeAuthStateListener(listener1);

      // 再度通知
      listener1.mockClear();
      listener2.mockClear();
      storageSync['notifyAuthStateChange'](null);

      // listener1は呼ばれず、listener2のみ呼ばれる
      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).toHaveBeenCalledWith(null);
    });
  });

  describe('クリーンアップ', () => {
    test('destroyメソッドによるクリーンアップ', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      storageSync.startSync();
      storageSync.onAuthStateChange(mockAuthStateListener);

      storageSync.destroy();

      // イベントリスナーが削除される
      expect(removeEventListenerSpy).toHaveBeenCalledWith('storage', expect.any(Function));

      // リスナーがクリアされる
      storageSync['notifyAuthStateChange'](null);
      expect(mockAuthStateListener).not.toHaveBeenCalled();

      removeEventListenerSpy.mockRestore();
    });
  });
});
