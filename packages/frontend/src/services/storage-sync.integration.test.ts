/**
 * StorageSync 統合テスト
 *
 * 複数のStorageSyncインスタンス間での実際の同期動作をテストします。
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { StorageSync } from './storage-sync';

// 複数タブをシミュレートするためのヘルパー
class TabSimulator {
  private storageSync: StorageSync;
  private authStateHistory: (AuthState | null)[] = [];

  constructor(tabId: string) {
    this.storageSync = new StorageSync({
      storageKey: `test_sync_${tabId}`,
      syncInterval: 100, // テスト用に短い間隔
      maxRetries: 2,
    });

    // 認証状態変更を記録
    this.storageSync.onAuthStateChange(state => {
      this.authStateHistory.push(state);
    });
  }

  start() {
    this.storageSync.startSync();
  }

  stop() {
    this.storageSync.destroy();
  }

  login(user: any) {
    const authState: AuthState = {
      isAuthenticated: true,
      user,
      sessionId: `session_${Date.now()}_${Math.random()}`,
      lastActivity: new Date(),
    };
    this.storageSync.broadcastAuthStateChange(authState);
    return authState;
  }

  logout() {
    this.storageSync.broadcastAuthStateChange(null);
  }

  getAuthStateHistory() {
    return [...this.authStateHistory];
  }

  clearHistory() {
    this.authStateHistory = [];
  }
}

describe('StorageSync 統合テスト', () => {
  let tab1: TabSimulator;
  let tab2: TabSimulator;

  beforeEach(() => {
    // LocalStorageをクリア
    localStorage.clear();

    // タイマーモックを設定
    vi.useFakeTimers();

    // 複数のタブをシミュレート
    tab1 = new TabSimulator('tab1');
    tab2 = new TabSimulator('tab2');

    tab1.start();
    tab2.start();
  });

  afterEach(() => {
    tab1.stop();
    tab2.stop();
    vi.useRealTimers();
    localStorage.clear();
  });

  describe('基本的な同期機能', () => {
    test('定期チェックで他のタブでの変更を検出', async () => {
      // 初期状態：未認証
      tab1.clearHistory();
      tab2.clearHistory();

      // LocalStorageに直接トークンを設定（他のタブでのログインをシミュレート）
      const user = { id: '1', email: 'test@example.com' };
      localStorage.setItem('auth_access_token', 'new_token');
      localStorage.setItem('auth_user_data', JSON.stringify(user));
      localStorage.setItem('auth_session_id', 'session123');

      // 定期チェックを実行
      vi.advanceTimersByTime(100);

      // 認証状態変更が検出されることを確認
      expect(tab1.getAuthStateHistory()).toContainEqual(
        expect.objectContaining({
          isAuthenticated: true,
          user: user,
        })
      );
    });

    test('定期チェックでトークン削除を検出', async () => {
      // 初期状態：認証済み
      const user = { id: '1', email: 'test@example.com' };
      localStorage.setItem('auth_access_token', 'existing_token');
      localStorage.setItem('auth_user_data', JSON.stringify(user));
      localStorage.setItem('auth_session_id', 'session123');

      tab1.clearHistory();

      // トークンを削除
      localStorage.removeItem('auth_access_token');

      // 定期チェックを実行
      vi.advanceTimersByTime(100);

      // ログアウトが検出されることを確認
      expect(tab1.getAuthStateHistory()).toContain(null);
    });
  });

  describe('エラー処理と復旧', () => {
    test('最大リトライ回数到達時の安全側処理', async () => {
      // LocalStorageのgetItemで継続的にエラーを発生させる
      const originalGetItem = localStorage.getItem;
      localStorage.getItem = vi.fn().mockImplementation(() => {
        throw new Error('Persistent storage error');
      });

      tab1.clearHistory();

      // 最大リトライ回数分の定期チェックを実行
      vi.advanceTimersByTime(100); // 1回目：エラー
      vi.advanceTimersByTime(100); // 2回目：エラー（最大リトライ回数到達）

      // 安全側に倒してログアウト処理が実行されることを確認
      expect(tab1.getAuthStateHistory()).toContain(null);

      // モックを復元
      localStorage.getItem = originalGetItem;
    });
  });

  describe('パフォーマンスと安定性', () => {
    test('長時間実行での安定性', async () => {
      const user = { id: '1', email: 'test@example.com' };

      // 長時間の定期チェックをシミュレート
      for (let i = 0; i < 10; i++) {
        vi.advanceTimersByTime(100);
      }

      // 長時間実行後もログイン/ログアウトが正常に動作することを確認
      tab1.login(user);
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(tab2.getAuthStateHistory()).toContainEqual(
        expect.objectContaining({
          isAuthenticated: true,
          user: user,
        })
      );

      tab1.logout();
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(tab2.getAuthStateHistory()).toContain(null);
    });
  });
});
