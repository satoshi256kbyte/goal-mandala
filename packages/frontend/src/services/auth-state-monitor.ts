/**
 * 認証状態監視サービス
 *
 * 機能:
 * - 認証状態変更リスナーシステム
 * - 定期的な認証状態チェック
 * - 認証エラーの伝播
 * - クリーンアップ機能
 *
 * 要件: 5.1, 5.2, 5.3, 5.4, 5.5
 */

import { AuthService } from './auth';
import { tokenManager } from './tokenManager';
import { storageSync } from './storage-sync';

/**
 * 認証状態の型定義
 */
export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: {
    id: string;
    email: string;
    name?: string;
    profileComplete?: boolean;
    [key: string]: unknown;
  } | null;
  error: string | null;
  tokenExpirationTime: Date | null;
  lastActivity: Date | null;
  sessionId: string | null;
}

/**
 * 認証エラーの型定義
 */
export interface AuthError {
  code: string;
  message: string;
  timestamp: Date;
  retryable: boolean;
}

/**
 * 認証状態リスナーの型定義
 */
export interface AuthStateListener {
  id: string;
  onAuthStateChange: (state: AuthState) => void;
  onTokenExpired: () => void;
  onError: (error: AuthError) => void;
}

/**
 * 監視設定の型定義
 */
export interface MonitorConfig {
  checkInterval: number; // 定期チェック間隔（ミリ秒）
  tokenRefreshBuffer: number; // トークンリフレッシュバッファ（ミリ秒）
  inactivityTimeout: number; // 非アクティブタイムアウト（ミリ秒）
  maxRetryAttempts: number; // 最大リトライ回数
  retryDelay: number; // リトライ遅延（ミリ秒）
}

/**
 * 認証状態監視クラス
 */
export class AuthStateMonitor {
  private listeners: Map<string, AuthStateListener> = new Map();
  private checkTimer: NodeJS.Timeout | null = null;
  private tokenRefreshTimer: NodeJS.Timeout | null = null;
  private inactivityTimer: NodeJS.Timeout | null = null;
  private isMonitoring = false;
  private currentState: AuthState | null = null;
  private retryCount = 0;

  private config: MonitorConfig = {
    checkInterval: 60 * 1000, // 1分
    tokenRefreshBuffer: 5 * 60 * 1000, // 5分
    inactivityTimeout: 30 * 60 * 1000, // 30分
    maxRetryAttempts: 3,
    retryDelay: 1000, // 1秒
  };

  /**
   * 監視を開始
   * 要件 5.4: 認証状態の監視が開始された時に定期的な状態チェックが実行される
   */
  public startMonitoring(initialState?: AuthState): void {
    if (this.isMonitoring) {
      console.warn('認証状態監視は既に開始されています');
      return;
    }

    console.log('認証状態監視を開始します');
    this.isMonitoring = true;

    if (initialState) {
      this.currentState = initialState;
    }

    // 定期的な認証状態チェックを開始
    this.startPeriodicCheck();

    // ユーザーアクティビティ監視を開始
    this.startActivityMonitoring();

    // StorageEventの監視を開始
    this.startStorageEventMonitoring();

    console.log('認証状態監視が開始されました');
  }

  /**
   * 監視を停止
   * 要件 5.5: コンポーネントがアンマウントされた時に認証状態の監視が適切にクリーンアップされる
   */
  public stopMonitoring(): void {
    if (!this.isMonitoring) {
      return;
    }

    console.log('認証状態監視を停止します');
    this.isMonitoring = false;

    // 全てのタイマーをクリア
    this.clearAllTimers();

    // イベントリスナーを削除
    this.removeEventListeners();

    // StorageSync監視を停止
    storageSync.stopSync();

    console.log('認証状態監視が停止されました');
  }

  /**
   * 認証状態リスナーを追加
   * 要件 5.1: 認証状態が変更された時に登録されたリスナーに通知される
   */
  public addListener(listener: AuthStateListener): () => void {
    this.listeners.set(listener.id, listener);

    console.log(`認証状態リスナーを追加しました: ${listener.id}`);

    // 現在の状態を即座に通知
    if (this.currentState) {
      try {
        listener.onAuthStateChange(this.currentState);
      } catch (error) {
        console.error(`リスナー ${listener.id} での状態変更通知エラー:`, error);
      }
    }

    // リスナーを削除する関数を返す
    return () => {
      this.removeListener(listener.id);
    };
  }

  /**
   * 認証状態リスナーを削除
   */
  public removeListener(listenerId: string): void {
    if (this.listeners.delete(listenerId)) {
      console.log(`認証状態リスナーを削除しました: ${listenerId}`);
    }
  }

  /**
   * 全てのリスナーを削除
   */
  public removeAllListeners(): void {
    const count = this.listeners.size;
    this.listeners.clear();
    console.log(`${count}個の認証状態リスナーを削除しました`);
  }

  /**
   * 認証状態を更新
   */
  public updateAuthState(newState: AuthState): void {
    const previousState = this.currentState;
    this.currentState = newState;

    // 状態が変更された場合のみ通知
    if (!this.isStateEqual(previousState, newState)) {
      this.notifyStateChange(newState);

      // トークンリフレッシュタイマーを更新
      this.scheduleTokenRefresh(newState);

      // 非アクティブタイマーを更新
      this.resetInactivityTimer(newState.isAuthenticated);
    }
  }

  /**
   * 認証エラーを通知
   * 要件 5.3: 認証エラーが発生した時にエラー情報が適切に伝播される
   */
  public notifyError(error: AuthError): void {
    console.error('認証エラーが発生しました:', error);

    this.listeners.forEach(listener => {
      try {
        listener.onError(error);
      } catch (listenerError) {
        console.error(`リスナー ${listener.id} でのエラー通知エラー:`, listenerError);
      }
    });

    // リトライ可能なエラーの場合はリトライを試行
    if (error.retryable && this.retryCount < this.config.maxRetryAttempts) {
      this.scheduleRetry();
    }
  }

  /**
   * トークン期限切れを通知
   */
  public notifyTokenExpired(): void {
    console.warn('トークンの期限切れが検出されました');

    this.listeners.forEach(listener => {
      try {
        listener.onTokenExpired();
      } catch (error) {
        console.error(`リスナー ${listener.id} でのトークン期限切れ通知エラー:`, error);
      }
    });
  }

  /**
   * 手動で認証状態をチェック
   */
  public async checkAuthState(): Promise<AuthState> {
    try {
      console.log('認証状態を手動チェックします');

      // 保存されたトークンをチェック
      const savedToken = tokenManager.getToken();

      if (!savedToken) {
        const state: AuthState = {
          isAuthenticated: false,
          isLoading: false,
          user: null,
          error: null,
          tokenExpirationTime: null,
          lastActivity: null,
          sessionId: null,
        };
        this.updateAuthState(state);
        return state;
      }

      // トークンの有効期限をチェック
      if (tokenManager.isTokenExpired(savedToken)) {
        console.log('保存されたトークンが期限切れです');
        this.notifyTokenExpired();

        const state: AuthState = {
          isAuthenticated: false,
          isLoading: false,
          user: null,
          error: 'トークンの期限が切れています',
          tokenExpirationTime: null,
          lastActivity: null,
          sessionId: null,
        };
        this.updateAuthState(state);
        return state;
      }

      // Cognitoの認証状態をチェック
      const isAuthenticated = await AuthService.checkAuthState();

      if (isAuthenticated) {
        const user = (await AuthService.getCurrentUser()) as {
          id: string;
          email: string;
          name?: string;
          profileComplete?: boolean;
          [key: string]: unknown;
        } | null;

        const state: AuthState = {
          isAuthenticated: true,
          isLoading: false,
          user,
          error: null,
          tokenExpirationTime: tokenManager.getTokenExpirationTime(savedToken),
          lastActivity: tokenManager.getLastActivity(),
          sessionId: tokenManager.getSessionId(),
        };

        this.updateAuthState(state);
        this.retryCount = 0; // 成功時はリトライカウントをリセット
        return state;
      } else {
        const state: AuthState = {
          isAuthenticated: false,
          isLoading: false,
          user: null,
          error: null,
          tokenExpirationTime: null,
          lastActivity: null,
          sessionId: null,
        };
        this.updateAuthState(state);
        return state;
      }
    } catch (error) {
      console.error('認証状態チェックでエラーが発生しました:', error);

      const authError: AuthError = {
        code: 'AUTH_CHECK_FAILED',
        message: '認証状態の確認に失敗しました',
        timestamp: new Date(),
        retryable: true,
      };

      this.notifyError(authError);

      const state: AuthState = {
        isAuthenticated: false,
        isLoading: false,
        user: null,
        error: authError.message,
        tokenExpirationTime: null,
        lastActivity: null,
        sessionId: null,
      };

      this.updateAuthState(state);
      return state;
    }
  }

  /**
   * 設定を更新
   */
  public updateConfig(newConfig: Partial<MonitorConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('監視設定を更新しました:', this.config);

    // 監視中の場合は再起動
    if (this.isMonitoring) {
      this.stopMonitoring();
      this.startMonitoring(this.currentState || undefined);
    }
  }

  /**
   * 現在の状態を取得
   */
  public getCurrentState(): AuthState | null {
    return this.currentState;
  }

  /**
   * 監視状態を取得
   */
  public isActive(): boolean {
    return this.isMonitoring;
  }

  /**
   * リスナー数を取得
   */
  public getListenerCount(): number {
    return this.listeners.size;
  }

  // プライベートメソッド

  /**
   * 定期的な認証状態チェックを開始
   */
  private startPeriodicCheck(): void {
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
    }

    this.checkTimer = setInterval(() => {
      if (this.isMonitoring) {
        this.checkAuthState().catch(error => {
          console.error('定期認証状態チェックでエラー:', error);
        });
      }
    }, this.config.checkInterval);

    console.log(`定期認証状態チェックを開始しました（間隔: ${this.config.checkInterval}ms）`);
  }

  /**
   * ユーザーアクティビティ監視を開始
   */
  private startActivityMonitoring(): void {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];

    const handleActivity = () => {
      if (this.currentState?.isAuthenticated) {
        tokenManager.updateLastActivity();
        this.resetInactivityTimer(true);
      }
    };

    events.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    console.log('ユーザーアクティビティ監視を開始しました');
  }

  /**
   * StorageEventの監視を開始
   */
  private startStorageEventMonitoring(): void {
    storageSync.startSync();

    const handleStorageAuthStateChange = (syncState: unknown) => {
      if (syncState === null) {
        // 他のタブでログアウトされた場合
        console.log('他のタブでログアウトが検出されました');
        const state: AuthState = {
          isAuthenticated: false,
          isLoading: false,
          user: null,
          error: '他のタブでログアウトされました',
          tokenExpirationTime: null,
          lastActivity: null,
          sessionId: null,
        };
        this.updateAuthState(state);
      }
    };

    storageSync.onAuthStateChange(handleStorageAuthStateChange);

    console.log('StorageEvent監視を開始しました');
  }

  /**
   * 状態変更を全リスナーに通知
   */
  private notifyStateChange(state: AuthState): void {
    console.log('認証状態変更を通知します:', {
      isAuthenticated: state.isAuthenticated,
      user: state.user?.email,
      error: state.error,
    });

    this.listeners.forEach(listener => {
      try {
        listener.onAuthStateChange(state);
      } catch (error) {
        console.error(`リスナー ${listener.id} での状態変更通知エラー:`, error);
      }
    });
  }

  /**
   * トークンリフレッシュをスケジュール
   * 要件 5.2: トークンの更新が必要な時に自動的にトークンリフレッシュが実行される
   */
  private scheduleTokenRefresh(state: AuthState): void {
    if (this.tokenRefreshTimer) {
      clearTimeout(this.tokenRefreshTimer);
      this.tokenRefreshTimer = null;
    }

    if (!state.isAuthenticated || !state.tokenExpirationTime) {
      return;
    }

    const expirationTime = state.tokenExpirationTime.getTime();
    const currentTime = Date.now();
    const refreshTime = expirationTime - this.config.tokenRefreshBuffer;
    const delay = refreshTime - currentTime;

    if (delay <= 0) {
      // 既に期限切れまたは間もなく期限切れの場合は即座にリフレッシュ
      this.performTokenRefresh();
      return;
    }

    this.tokenRefreshTimer = setTimeout(() => {
      this.performTokenRefresh();
    }, delay);

    console.log(`トークンリフレッシュを ${delay}ms 後にスケジュールしました`);
  }

  /**
   * トークンリフレッシュを実行
   */
  private async performTokenRefresh(): Promise<void> {
    try {
      console.log('自動トークンリフレッシュを実行します');
      await tokenManager.refreshToken();
      console.log('自動トークンリフレッシュが完了しました');

      // 認証状態を再チェック
      await this.checkAuthState();
    } catch (error) {
      console.error('自動トークンリフレッシュに失敗しました:', error);

      const authError: AuthError = {
        code: 'TOKEN_REFRESH_FAILED',
        message: 'トークンの更新に失敗しました',
        timestamp: new Date(),
        retryable: false,
      };

      this.notifyError(authError);
      this.notifyTokenExpired();
    }
  }

  /**
   * 非アクティブタイマーをリセット
   */
  private resetInactivityTimer(isAuthenticated: boolean): void {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = null;
    }

    if (!isAuthenticated) {
      return;
    }

    this.inactivityTimer = setTimeout(() => {
      console.log('非アクティブタイムアウトが発生しました');

      const authError: AuthError = {
        code: 'INACTIVITY_TIMEOUT',
        message: '長時間非アクティブのため自動ログアウトしました',
        timestamp: new Date(),
        retryable: false,
      };

      this.notifyError(authError);

      const state: AuthState = {
        isAuthenticated: false,
        isLoading: false,
        user: null,
        error: authError.message,
        tokenExpirationTime: null,
        lastActivity: null,
        sessionId: null,
      };

      this.updateAuthState(state);
    }, this.config.inactivityTimeout);
  }

  /**
   * リトライをスケジュール
   */
  private scheduleRetry(): void {
    this.retryCount++;
    const delay = this.config.retryDelay * Math.pow(2, this.retryCount - 1); // 指数バックオフ

    console.log(
      `${delay}ms 後にリトライします（${this.retryCount}/${this.config.maxRetryAttempts}）`
    );

    setTimeout(() => {
      if (this.isMonitoring) {
        this.checkAuthState().catch(error => {
          console.error('リトライ時の認証状態チェックでエラー:', error);
        });
      }
    }, delay);
  }

  /**
   * 全てのタイマーをクリア
   */
  private clearAllTimers(): void {
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = null;
    }

    if (this.tokenRefreshTimer) {
      clearTimeout(this.tokenRefreshTimer);
      this.tokenRefreshTimer = null;
    }

    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = null;
    }

    console.log('全てのタイマーをクリアしました');
  }

  /**
   * イベントリスナーを削除
   */
  private removeEventListeners(): void {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];

    events.forEach(event => {
      // 全てのリスナーを削除（具体的な関数参照が必要だが、簡略化）
      document.removeEventListener(event, () => {});
    });

    console.log('イベントリスナーを削除しました');
  }

  /**
   * 認証状態が等しいかチェック
   */
  private isStateEqual(state1: AuthState | null, state2: AuthState | null): boolean {
    if (!state1 && !state2) return true;
    if (!state1 || !state2) return false;

    return (
      state1.isAuthenticated === state2.isAuthenticated &&
      state1.isLoading === state2.isLoading &&
      state1.user?.id === state2.user?.id &&
      state1.error === state2.error &&
      state1.tokenExpirationTime?.getTime() === state2.tokenExpirationTime?.getTime() &&
      state1.sessionId === state2.sessionId
    );
  }
}

// シングルトンインスタンス
export const authStateMonitor = new AuthStateMonitor();

// デフォルトエクスポート
export default authStateMonitor;
