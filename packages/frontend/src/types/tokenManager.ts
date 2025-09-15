/**
 * TokenManager関連の型定義
 */

/**
 * トークン情報の型定義
 */
export interface TokenInfo {
  /** アクセストークン */
  token: string;
  /** リフレッシュトークン（オプション） */
  refreshToken?: string;
  /** トークンの有効期限 */
  expirationTime: Date;
  /** トークンの発行時刻 */
  issuedAt: Date;
}

/**
 * JWTペイロードの型定義
 */
export interface JwtPayload {
  /** サブジェクト（ユーザーID） */
  sub: string;
  /** メールアドレス */
  email?: string;
  /** 名前 */
  name?: string;
  /** 有効期限（Unix timestamp） */
  exp: number;
  /** 発行時刻（Unix timestamp） */
  iat: number;
  /** 発行者 */
  iss?: string;
  /** オーディエンス */
  aud?: string;
  /** その他のカスタムクレーム */
  [key: string]: unknown;
}

/**
 * トークンリフレッシュイベントの型定義
 */
export interface TokenRefreshEvent {
  /** イベントタイプ */
  type: 'token-refresh-success' | 'token-refresh-failed' | 'token-expired';
  /** イベントの詳細情報 */
  detail?: {
    /** 新しいトークン（成功時） */
    newToken?: string;
    /** エラー情報（失敗時） */
    error?: Error;
    /** 期限切れ時刻（期限切れ時） */
    expiredAt?: Date;
  };
}

/**
 * TokenManagerの設定オプション
 */
export interface TokenManagerOptions {
  /** リフレッシュバッファ時間（ミリ秒）- デフォルト: 5分 */
  refreshBufferTime?: number;
  /** 自動リフレッシュを有効にするか - デフォルト: true */
  enableAutoRefresh?: boolean;
  /** デバッグログを有効にするか - デフォルト: false */
  enableDebugLog?: boolean;
  /** カスタムストレージキープレフィックス */
  storageKeyPrefix?: string;
}

/**
 * ストレージキーの型定義
 */
export interface StorageKeys {
  readonly ACCESS_TOKEN: string;
  readonly REFRESH_TOKEN: string;
  readonly USER_DATA: string;
  readonly SESSION_ID: string;
  readonly LAST_ACTIVITY: string;
  readonly AUTH_STATE: string;
}

/**
 * TokenManagerインターフェース
 */
export interface ITokenManager {
  /**
   * トークンを安全に保存
   */
  saveToken(token: string, refreshToken?: string): void;

  /**
   * 保存されたアクセストークンを取得
   */
  getToken(): string | null;

  /**
   * 保存されたリフレッシュトークンを取得
   */
  getRefreshToken(): string | null;

  /**
   * 保存されたトークンを全て削除
   */
  removeTokens(): void;

  /**
   * トークンの有効期限をチェック
   */
  isTokenExpired(token?: string): boolean;

  /**
   * トークンの有効期限時刻を取得
   */
  getTokenExpirationTime(token?: string): Date | null;

  /**
   * トークンをリフレッシュ
   */
  refreshToken(): Promise<string>;

  /**
   * 自動トークンリフレッシュをスケジュール
   */
  scheduleTokenRefresh(): void;

  /**
   * 自動トークンリフレッシュのスケジュールをクリア
   */
  clearTokenRefreshSchedule(): void;

  /**
   * 最終アクティビティ時刻を更新
   */
  updateLastActivity(): void;

  /**
   * 最終アクティビティ時刻を取得
   */
  getLastActivity(): Date | null;

  /**
   * セッションIDを取得
   */
  getSessionId(): string | null;
}

/**
 * トークンストレージエラーの型定義
 */
export class TokenStorageError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'TokenStorageError';
  }
}

/**
 * トークンリフレッシュエラーの型定義
 */
export class TokenRefreshError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'TokenRefreshError';
  }
}

/**
 * トークン検証エラーの型定義
 */
export class TokenValidationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly token?: string
  ) {
    super(message);
    this.name = 'TokenValidationError';
  }
}
