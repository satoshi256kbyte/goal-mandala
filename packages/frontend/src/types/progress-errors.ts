/**
 * 進捗計算エラーの定義
 * 要件: 全要件 - エラーハンドリング
 */

/**
 * 進捗計算エラーの種類
 */
export enum ProgressCalculationError {
  /** 無効なエンティティID */
  INVALID_ENTITY = 'INVALID_ENTITY',
  /** 循環依存の検出 */
  CIRCULAR_DEPENDENCY = 'CIRCULAR_DEPENDENCY',
  /** 計算タイムアウト */
  CALCULATION_TIMEOUT = 'CALCULATION_TIMEOUT',
  /** データ不整合 */
  DATA_INCONSISTENCY = 'DATA_INCONSISTENCY',
  /** ネットワークエラー */
  NETWORK_ERROR = 'NETWORK_ERROR',
  /** 認証エラー */
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  /** 権限エラー */
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  /** データ取得エラー */
  DATA_FETCH_ERROR = 'DATA_FETCH_ERROR',
  /** キャッシュエラー */
  CACHE_ERROR = 'CACHE_ERROR',
  /** 不明なエラー */
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * エラー処理戦略
 */
export interface ErrorHandlingStrategy {
  /** リトライ回数 */
  retryCount: number;
  /** フォールバック値 */
  fallbackValue: number;
  /** 通知が必要かどうか */
  notificationRequired: boolean;
  /** ログレベル */
  logLevel: 'error' | 'warn' | 'info';
  /** ユーザーに表示するメッセージ */
  userMessage?: string;
  /** 自動復旧を試行するかどうか */
  autoRecover?: boolean;
}

/**
 * 進捗計算エラーの詳細情報
 */
export interface ProgressCalculationErrorDetails {
  /** エラーの種類 */
  type: ProgressCalculationError;
  /** エラーメッセージ */
  message: string;
  /** エラーが発生したエンティティID */
  entityId?: string;
  /** エラーが発生したエンティティタイプ */
  entityType?: 'task' | 'action' | 'subgoal' | 'goal';
  /** エラーの詳細情報 */
  details?: Record<string, any>;
  /** エラー発生時刻 */
  timestamp: Date;
  /** スタックトレース */
  stack?: string;
  /** リトライ回数 */
  retryCount?: number;
  /** 関連するエラー */
  cause?: Error;
}

/**
 * エラー通知の設定
 */
export interface ErrorNotificationConfig {
  /** 通知の種類 */
  type: 'toast' | 'modal' | 'inline' | 'log';
  /** 通知の重要度 */
  severity: 'error' | 'warning' | 'info';
  /** 通知メッセージ */
  message: string;
  /** 自動で閉じるまでの時間（ミリ秒） */
  autoCloseDelay?: number;
  /** アクションボタン */
  actions?: Array<{
    label: string;
    action: () => void;
    variant?: 'primary' | 'secondary' | 'danger';
  }>;
}

/**
 * フォールバック値の設定
 */
export interface FallbackValueConfig {
  /** デフォルトの進捗値 */
  defaultProgress: number;
  /** 計算中を示す値 */
  calculatingProgress: number;
  /** エラー時を示す値 */
  errorProgress: number;
  /** データなし時を示す値 */
  noDataProgress: number;
}

/**
 * エラーログの設定
 */
export interface ErrorLogConfig {
  /** ログレベル */
  level: 'error' | 'warn' | 'info' | 'debug';
  /** ログメッセージ */
  message: string;
  /** 追加のメタデータ */
  metadata?: Record<string, any>;
  /** ユーザーID */
  userId?: string;
  /** セッションID */
  sessionId?: string;
  /** リクエストID */
  requestId?: string;
}

/**
 * エラー処理の結果
 */
export interface ErrorHandlingResult {
  /** 処理が成功したかどうか */
  success: boolean;
  /** 結果の値（成功時またはフォールバック値） */
  value: number;
  /** エラーの詳細（失敗時） */
  error?: ProgressCalculationErrorDetails;
  /** 適用されたフォールバック値かどうか */
  isFallback: boolean;
  /** リトライが実行されたかどうか */
  wasRetried: boolean;
  /** 通知が送信されたかどうか */
  wasNotified: boolean;
}

/**
 * エラー統計情報
 */
export interface ErrorStatistics {
  /** 総エラー数 */
  totalErrors: number;
  /** エラータイプ別の統計 */
  errorsByType: Record<string, number>;
  /** 最後のエラー発生時刻 */
  lastErrorTime?: Date;
  /** 最も頻繁に発生するエラー */
  mostFrequentError?: ProgressCalculationError;
  /** エラー率（%） */
  errorRate: number;
  /** 復旧成功率（%） */
  recoveryRate: number;
}
