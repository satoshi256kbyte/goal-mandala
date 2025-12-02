/**
 * StorageSync - 複数タブ・デバイス間での認証状態同期機能
 *
 * 要件:
 * - 6.1: 他のデバイスでログアウトした時に現在のデバイスでも認証状態が無効化される
 * - 6.2: 認証トークンが他の場所で無効化された時に現在のセッションも無効化される
 * - 6.3: ブラウザの複数タブで同じアプリケーションを使用している時に認証状態が同期される
 * - 6.4: StorageEventが発生した時に認証状態が適切に更新される
 */

import { User, AuthState } from '../types/storage-sync';

export type { User, AuthState };

export interface StorageSyncOptions {
  storageKey?: string;
  syncInterval?: number;
  maxRetries?: number;
}

export type StorageChangeCallback = (event: StorageEvent) => void;
export type AuthStateChangeCallback = (state: AuthState | null) => void;

/**
 * StorageSync - 複数タブ間での認証状態同期を管理するクラス
 */
export class StorageSync {
  private readonly storageKey: string;
  private readonly syncInterval: number;
  private readonly maxRetries: number;
  private storageListeners: Set<StorageChangeCallback> = new Set();
  private authStateListeners: Set<AuthStateChangeCallback> = new Set();
  private syncTimer: NodeJS.Timeout | null = null;
  private isActive = false;
  private retryCount = 0;
  private lastAuthState: { isAuthenticated: boolean; hasToken: boolean } | null = null;

  constructor(options: StorageSyncOptions = {}) {
    this.storageKey = options.storageKey || 'auth_state_sync';
    this.syncInterval = options.syncInterval || 1000; // 1秒間隔でチェック
    this.maxRetries = options.maxRetries || 3;
  }

  /**
   * 同期機能を開始
   * 要件 6.3, 6.4: StorageEventリスナーを設定し、タブ間同期を開始
   */
  startSync(): void {
    if (this.isActive) {
      return;
    }

    this.isActive = true;
    this.retryCount = 0;

    // StorageEventリスナーを設定
    window.addEventListener('storage', this.handleStorageEvent);

    // 初期状態を記録
    this.checkAuthStateSync();

    // 定期的な同期チェックを開始
    this.syncTimer = setInterval(() => {
      this.checkAuthStateSync();
    }, this.syncInterval);

    console.log('[StorageSync] 同期機能を開始しました');
  }

  /**
   * 同期機能を停止
   */
  stopSync(): void {
    if (!this.isActive) {
      return;
    }

    this.isActive = false;

    // StorageEventリスナーを削除
    window.removeEventListener('storage', this.handleStorageEvent);

    // 定期同期タイマーを停止
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }

    console.log('[StorageSync] 同期機能を停止しました');
  }

  /**
   * 認証状態の変更をブロードキャスト
   * 要件 6.1, 6.2: 認証状態の変更を他のタブに通知
   */
  broadcastAuthStateChange(state: AuthState | null): void {
    try {
      const syncData = {
        timestamp: Date.now(),
        sessionId: this.generateSessionId(),
        authState: state,
        action: state ? 'login' : 'logout',
      };

      localStorage.setItem(this.storageKey, JSON.stringify(syncData));

      // 即座に削除して StorageEvent を確実に発火させる
      setTimeout(() => {
        localStorage.removeItem(this.storageKey);
      }, 100);

      console.log('[StorageSync] 認証状態変更をブロードキャストしました:', syncData.action);
    } catch (error) {
      console.error('[StorageSync] ブロードキャストエラー:', error);
      this.handleSyncError(error);
    }
  }

  /**
   * StorageEventリスナーを追加
   */
  onStorageChange(callback: StorageChangeCallback): void {
    this.storageListeners.add(callback);
  }

  /**
   * StorageEventリスナーを削除
   */
  removeStorageListener(callback: StorageChangeCallback): void {
    this.storageListeners.delete(callback);
  }

  /**
   * 認証状態変更リスナーを追加
   */
  onAuthStateChange(callback: AuthStateChangeCallback): void {
    this.authStateListeners.add(callback);
  }

  /**
   * 認証状態変更リスナーを削除
   */
  removeAuthStateListener(callback: AuthStateChangeCallback): void {
    this.authStateListeners.delete(callback);
  }

  /**
   * StorageEventハンドラー
   * 要件 6.4: StorageEventが発生した時に認証状態を適切に更新
   */
  private handleStorageEvent = (event: StorageEvent): void => {
    try {
      // 自分のタブからの変更は無視
      if (event.storageArea !== localStorage) {
        return;
      }

      // 認証関連のキーの変更をチェック
      if (this.isAuthRelatedKey(event.key)) {
        this.processStorageChange(event);
      }

      // 同期キーの変更をチェック
      if (event.key === this.storageKey && event.newValue) {
        this.processSyncMessage(event.newValue);
      }

      // 登録されたリスナーに通知
      this.storageListeners.forEach(listener => {
        try {
          listener(event);
        } catch (error) {
          console.error('[StorageSync] リスナーエラー:', error);
        }
      });
    } catch (error) {
      console.error('[StorageSync] StorageEventハンドラーエラー:', error);
      this.handleSyncError(error);
    }
  };

  /**
   * 認証状態の定期同期チェック
   */
  private checkAuthStateSync(): void {
    try {
      const currentTokens = this.getCurrentTokens();
      const hasToken = !!currentTokens.accessToken;

      // 前回の状態を取得（初回はnull）
      const previousState = this.lastAuthState;

      // 現在の状態を記録
      this.lastAuthState = { isAuthenticated: hasToken, hasToken };

      // 初回チェックの場合はスキップ
      if (!previousState) {
        return;
      }

      // トークンが削除されている場合（他のタブでログアウト）
      if (previousState.hasToken && !hasToken) {
        console.log('[StorageSync] 他のタブでログアウトが検出されました');
        this.notifyAuthStateChange(null);
      }

      // トークンが追加されている場合（他のタブでログイン）
      if (!previousState.hasToken && hasToken) {
        console.log('[StorageSync] 他のタブでログインが検出されました');
        const authState = this.buildAuthStateFromTokens(currentTokens);
        this.notifyAuthStateChange(authState);
      }

      this.retryCount = 0; // 成功時はリトライカウントをリセット
    } catch (error) {
      console.error('[StorageSync] 同期チェックエラー:', error);
      this.handleSyncError(error);
    }
  }

  /**
   * 同期メッセージを処理
   */
  private processSyncMessage(messageData: string): void {
    try {
      const syncData = JSON.parse(messageData);

      // 自分のセッションからのメッセージは無視
      if (syncData.sessionId === this.getCurrentSessionId()) {
        return;
      }

      console.log('[StorageSync] 同期メッセージを受信:', syncData);

      // 認証状態変更を通知
      this.notifyAuthStateChange(syncData.authState);
    } catch (error) {
      console.error('[StorageSync] 同期メッセージ処理エラー:', error);
    }
  }

  /**
   * ストレージ変更を処理
   */
  private processStorageChange(event: StorageEvent): void {
    const key = event.key;
    const newValue = event.newValue;
    const oldValue = event.oldValue;

    console.log('[StorageSync] 認証関連ストレージ変更:', {
      key,
      hasNewValue: !!newValue,
      hasOldValue: !!oldValue,
    });

    // トークンが削除された場合（ログアウト）
    if (this.isTokenKey(key) && oldValue && !newValue) {
      console.log('[StorageSync] トークン削除を検出 - ログアウト処理');
      this.notifyAuthStateChange(null);
    }

    // トークンが追加/更新された場合（ログイン）
    if (this.isTokenKey(key) && newValue && newValue !== oldValue) {
      console.log('[StorageSync] トークン更新を検出 - ログイン処理');
      const currentTokens = this.getCurrentTokens();
      if (currentTokens.accessToken) {
        const authState = this.buildAuthStateFromTokens(currentTokens);
        this.notifyAuthStateChange(authState);
      }
    }
  }

  /**
   * 認証状態変更を通知
   */
  private notifyAuthStateChange(authState: AuthState | null): void {
    this.authStateListeners.forEach(listener => {
      try {
        listener(authState);
      } catch (error) {
        console.error('[StorageSync] 認証状態変更リスナーエラー:', error);
      }
    });
  }

  /**
   * 同期エラーを処理
   * 要件 6.5: 同期エラー時の安全側処理
   */
  private handleSyncError(error: unknown): void {
    this.retryCount++;

    if (this.retryCount >= this.maxRetries) {
      console.error(
        '[StorageSync] 最大リトライ回数に達しました。安全側に倒してログアウト処理を実行します。'
      );
      // 安全側に倒してログアウト処理
      this.notifyAuthStateChange(null);
      this.retryCount = 0;
    } else {
      console.warn(`[StorageSync] 同期エラー (${this.retryCount}/${this.maxRetries}):`, error);
    }
  }

  /**
   * 認証関連のキーかどうかを判定
   */
  private isAuthRelatedKey(key: string | null): boolean {
    if (!key) return false;

    const authKeys = [
      'auth_access_token',
      'auth_refresh_token',
      'auth_user_data',
      'auth_session_id',
      'auth_last_activity',
    ];

    return authKeys.includes(key);
  }

  /**
   * トークンキーかどうかを判定
   */
  private isTokenKey(key: string | null): boolean {
    if (!key) return false;
    return key === 'auth_access_token' || key === 'auth_refresh_token';
  }

  /**
   * 現在のトークンを取得
   */
  private getCurrentTokens(): { accessToken: string | null; refreshToken: string | null } {
    return {
      accessToken: localStorage.getItem('auth_access_token'),
      refreshToken: localStorage.getItem('auth_refresh_token'),
    };
  }

  /**
   * 最後の同期状態を取得
   */
  private getLastSyncState(): AuthState | null {
    try {
      const userData = localStorage.getItem('auth_user_data');
      if (!userData) return null;

      const user = JSON.parse(userData);
      const sessionId = localStorage.getItem('auth_session_id') || '';
      const lastActivity = localStorage.getItem('auth_last_activity');

      return {
        isAuthenticated: true,
        user,
        sessionId,
        lastActivity: lastActivity ? new Date(lastActivity) : new Date(),
      };
    } catch {
      return null;
    }
  }

  /**
   * トークンから認証状態を構築
   */
  private buildAuthStateFromTokens(tokens: {
    accessToken: string | null;
    refreshToken: string | null;
  }): AuthState | null {
    if (!tokens.accessToken) return null;

    try {
      const userData = localStorage.getItem('auth_user_data');
      const user = userData ? JSON.parse(userData) : null;
      const sessionId = localStorage.getItem('auth_session_id') || this.generateSessionId();

      return {
        isAuthenticated: true,
        user,
        sessionId,
        lastActivity: new Date(),
      };
    } catch {
      return null;
    }
  }

  /**
   * 現在のセッションIDを取得
   */
  private getCurrentSessionId(): string {
    return localStorage.getItem('auth_session_id') || '';
  }

  /**
   * セッションIDを生成
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * クリーンアップ処理
   */
  destroy(): void {
    this.stopSync();
    this.storageListeners.clear();
    this.authStateListeners.clear();
  }
}

// デフォルトインスタンスをエクスポート
export const storageSync = new StorageSync();
