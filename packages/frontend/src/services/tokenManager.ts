/**
 * TokenManager - JWT トークンの永続化、有効期限管理、自動リフレッシュ機能を提供
 */

import { AuthService } from './auth';

/**
 * ストレージキー定数
 */
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'auth_access_token',
  REFRESH_TOKEN: 'auth_refresh_token',
  USER_DATA: 'auth_user_data',
  SESSION_ID: 'auth_session_id',
  LAST_ACTIVITY: 'auth_last_activity',
  AUTH_STATE: 'auth_state',
} as const;

/**
 * トークン情報の型定義
 */
export interface TokenInfo {
  token: string;
  refreshToken?: string;
  expirationTime: Date;
  issuedAt: Date;
}

/**
 * TokenManagerクラス
 * JWT トークンの永続化、有効期限管理、自動リフレッシュ機能を実装
 */
export class TokenManager {
  private static instance: TokenManager;
  private refreshTimer: NodeJS.Timeout | null = null;
  private isRefreshing: boolean = false;
  private readonly REFRESH_BUFFER_TIME = 5 * 60 * 1000; // 5分前にリフレッシュ

  /**
   * シングルトンインスタンスを取得
   */
  static getInstance(): TokenManager {
    if (!TokenManager.instance) {
      TokenManager.instance = new TokenManager();
    }
    return TokenManager.instance;
  }

  /**
   * プライベートコンストラクタ（シングルトンパターン）
   */
  private constructor() {
    // ページロード時に既存のトークンをチェックして自動リフレッシュをスケジュール
    this.initializeTokenRefresh();
  }

  /**
   * トークンを安全に保存
   * @param token アクセストークン
   * @param refreshToken リフレッシュトークン（オプション）
   */
  saveToken(token: string, refreshToken?: string): void {
    try {
      // トークンの有効期限を取得
      const expirationTime = this.getTokenExpirationTime(token);

      if (!expirationTime) {
        throw new Error('Invalid token: Unable to parse expiration time');
      }

      // LocalStorageに保存
      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token);

      if (refreshToken) {
        localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
      }

      // 最終アクティビティ時刻を更新
      this.updateLastActivity();

      // セッションIDを生成・保存
      const sessionId = this.generateSessionId();
      localStorage.setItem(STORAGE_KEYS.SESSION_ID, sessionId);

      // 自動リフレッシュをスケジュール
      this.scheduleTokenRefresh();

      console.log('Token saved successfully');
    } catch (error) {
      console.error('Failed to save token:', error);
      throw new Error('Failed to save authentication token');
    }
  }

  /**
   * 保存されたアクセストークンを取得
   * @returns アクセストークンまたはnull
   */
  getToken(): string | null {
    try {
      const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);

      if (!token) {
        return null;
      }

      // トークンの有効性をチェック
      if (this.isTokenExpired(token)) {
        console.warn('Stored token is expired');
        this.removeTokens();
        return null;
      }

      return token;
    } catch (error) {
      console.error('Failed to get token:', error);
      return null;
    }
  }

  /**
   * 保存されたリフレッシュトークンを取得
   * @returns リフレッシュトークンまたはnull
   */
  getRefreshToken(): string | null {
    try {
      const token = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
      return token || null;
    } catch (error) {
      console.error('Failed to get refresh token:', error);
      return null;
    }
  }

  /**
   * 保存されたトークンを全て削除
   */
  removeTokens(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.USER_DATA);
      localStorage.removeItem(STORAGE_KEYS.SESSION_ID);
      localStorage.removeItem(STORAGE_KEYS.LAST_ACTIVITY);
      localStorage.removeItem(STORAGE_KEYS.AUTH_STATE);

      // 自動リフレッシュタイマーをクリア
      this.clearTokenRefreshSchedule();

      console.log('All tokens removed successfully');
    } catch (error) {
      console.error('Failed to remove tokens:', error);
    }
  }

  /**
   * トークンの有効期限をチェック
   * @param token チェックするトークン（省略時は保存されたトークンを使用）
   * @returns 期限切れの場合true
   */
  isTokenExpired(token?: string): boolean {
    try {
      const targetToken = token || localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);

      if (!targetToken) {
        return true;
      }

      const payload = this.parseJwtPayload(targetToken);
      if (!payload || typeof payload.exp !== 'number') {
        return true;
      }

      const currentTime = Math.floor(Date.now() / 1000);
      return payload.exp <= currentTime;
    } catch (error) {
      console.error('Failed to check token expiration:', error);
      return true;
    }
  }

  /**
   * トークンの有効期限時刻を取得
   * @param token 対象のトークン（省略時は保存されたトークンを使用）
   * @returns 有効期限のDateオブジェクトまたはnull
   */
  getTokenExpirationTime(token?: string): Date | null {
    try {
      const targetToken = token || localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);

      if (!targetToken) {
        return null;
      }

      const payload = this.parseJwtPayload(targetToken);
      if (!payload || typeof payload.exp !== 'number') {
        return null;
      }

      return new Date(payload.exp * 1000);
    } catch (error) {
      console.error('Failed to get token expiration time:', error);
      return null;
    }
  }

  /**
   * トークンをリフレッシュ
   * @returns 新しいアクセストークン
   */
  async refreshToken(): Promise<string> {
    try {
      const refreshToken = this.getRefreshToken();

      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      // Cognitoからの新しいトークンを取得
      // 注意: 実際のリフレッシュ実装はCognitoの仕様に依存
      // 現在のAmplifyライブラリでは自動的にリフレッシュされるため、
      // ここでは現在のセッションから新しいトークンを取得
      const session = await AuthService.getCurrentSessionTyped();

      if (!session || !session.tokens?.idToken) {
        throw new Error('Failed to refresh token: No valid session');
      }

      const newToken = session.tokens.idToken.toString();

      // 新しいトークンを保存（自動リフレッシュスケジュールは手動で設定）
      this.saveTokenWithoutScheduling(newToken, refreshToken);

      // リフレッシュ完了後に新しいスケジュールを設定
      this.scheduleTokenRefresh();

      console.log('Token refreshed successfully');
      return newToken;
    } catch (error) {
      console.error('Failed to refresh token:', error);
      // リフレッシュに失敗した場合はトークンを削除
      this.removeTokens();
      throw new Error('Token refresh failed');
    }
  }

  /**
   * トークンを安全に保存（自動リフレッシュスケジュールなし）
   * @param token アクセストークン
   * @param refreshToken リフレッシュトークン（オプション）
   * @private
   */
  private saveTokenWithoutScheduling(token: string, refreshToken?: string): void {
    try {
      // トークンの有効期限を取得
      const expirationTime = this.getTokenExpirationTime(token);

      if (!expirationTime) {
        throw new Error('Invalid token: Unable to parse expiration time');
      }

      // LocalStorageに保存
      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token);

      if (refreshToken) {
        localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
      }

      // 最終アクティビティ時刻を更新
      this.updateLastActivity();

      // セッションIDを生成・保存
      const sessionId = this.generateSessionId();
      localStorage.setItem(STORAGE_KEYS.SESSION_ID, sessionId);

      console.log('Token saved successfully');
    } catch (error) {
      console.error('Failed to save token:', error);
      throw new Error('Failed to save authentication token');
    }
  }

  /**
   * 自動トークンリフレッシュをスケジュール
   */
  scheduleTokenRefresh(): void {
    // 既存のタイマーをクリア
    this.clearTokenRefreshSchedule();

    const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    if (!token) {
      return;
    }

    const expirationTime = this.getTokenExpirationTime(token);
    if (!expirationTime) {
      return;
    }

    // リフレッシュ実行時刻を計算（有効期限の5分前）
    const refreshTime = expirationTime.getTime() - this.REFRESH_BUFFER_TIME;
    const currentTime = Date.now();
    const delay = refreshTime - currentTime;

    if (delay <= 0) {
      // 既に期限切れまたは間もなく期限切れの場合は即座にリフレッシュ
      this.performTokenRefresh();
      return;
    }

    // タイマーを設定
    this.refreshTimer = setTimeout(() => {
      this.performTokenRefresh();
    }, delay);

    console.log(`Token refresh scheduled in ${Math.round(delay / 1000)} seconds`);
  }

  /**
   * 自動トークンリフレッシュのスケジュールをクリア
   */
  clearTokenRefreshSchedule(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  /**
   * 最終アクティビティ時刻を更新
   */
  updateLastActivity(): void {
    try {
      const now = new Date().toISOString();
      localStorage.setItem(STORAGE_KEYS.LAST_ACTIVITY, now);
    } catch (error) {
      console.error('Failed to update last activity:', error);
    }
  }

  /**
   * 最終アクティビティ時刻を取得
   * @returns 最終アクティビティのDateオブジェクトまたはnull
   */
  getLastActivity(): Date | null {
    try {
      const lastActivity = localStorage.getItem(STORAGE_KEYS.LAST_ACTIVITY);
      return lastActivity ? new Date(lastActivity) : null;
    } catch (error) {
      console.error('Failed to get last activity:', error);
      return null;
    }
  }

  /**
   * セッションIDを取得
   * @returns セッションIDまたはnull
   */
  getSessionId(): string | null {
    try {
      const sessionId = localStorage.getItem(STORAGE_KEYS.SESSION_ID);
      return sessionId || null;
    } catch (error) {
      console.error('Failed to get session ID:', error);
      return null;
    }
  }

  /**
   * 初期化時のトークンリフレッシュ設定
   * @private
   */
  private initializeTokenRefresh(): void {
    try {
      const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      if (token && !this.isTokenExpired(token)) {
        this.scheduleTokenRefresh();
      }
    } catch (error) {
      console.error('Failed to initialize token refresh:', error);
    }
  }

  /**
   * 実際のトークンリフレッシュ処理を実行
   * @private
   */
  private async performTokenRefresh(): Promise<void> {
    try {
      // 無限ループを防ぐため、リフレッシュ中フラグをチェック
      if (this.isRefreshing) {
        return;
      }

      this.isRefreshing = true;
      await this.refreshToken();
    } catch (error) {
      console.error('Automatic token refresh failed:', error);
      // リフレッシュに失敗した場合は、認証状態をリセット
      this.removeTokens();

      // カスタムイベントを発火してアプリケーションに通知
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('auth:token-refresh-failed', {
            detail: { error },
          })
        );
      }
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * LocalStorageから直接トークンを取得（内部使用）
   * @private
   */
  private getStoredToken(): string | null {
    try {
      return localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    } catch (error) {
      console.error('Failed to get stored token:', error);
      return null;
    }
  }

  /**
   * JWTペイロードを解析
   * @private
   */
  private parseJwtPayload(token: string): Record<string, unknown> | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid JWT format');
      }

      const payload = parts[1];
      const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
      return JSON.parse(decoded);
    } catch (error) {
      console.error('Failed to parse JWT payload:', error);
      return null;
    }
  }

  /**
   * セッションIDを生成
   * @private
   */
  private generateSessionId(): string {
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substring(2);
    return `${timestamp}-${randomPart}`;
  }

  /**
   * LocalStorageが利用可能かチェック
   * @private
   */
  private isLocalStorageAvailable(): boolean {
    try {
      const testKey = '__localStorage_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }
}

// デフォルトエクスポート
export default TokenManager;

// シングルトンインスタンスをエクスポート
export const tokenManager = TokenManager.getInstance();
