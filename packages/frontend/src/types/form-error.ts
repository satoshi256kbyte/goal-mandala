/**
 * サブ目標・アクション入力フォーム用エラー型定義
 */

/**
 * フォームエラーの種類
 */
export enum FormErrorType {
  VALIDATION_ERROR = 'validation_error',
  NETWORK_ERROR = 'network_error',
  SERVER_ERROR = 'server_error',
  BUSINESS_LOGIC_ERROR = 'business_logic_error',
  DRAFT_SAVE_ERROR = 'draft_save_error',
  AUTHENTICATION_ERROR = 'authentication_error',
  AUTHORIZATION_ERROR = 'authorization_error',
  TIMEOUT_ERROR = 'timeout_error',
  RATE_LIMIT_ERROR = 'rate_limit_error',
}

/**
 * エラーの重要度
 */
export enum FormErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * エラー表示戦略
 */
export interface ErrorDisplayStrategy {
  inline: boolean; // フィールド横にエラー表示
  toast: boolean; // トースト通知
  modal: boolean; // モーダルダイアログ
  summary: boolean; // ページ上部にサマリー表示
}

/**
 * フォームエラー情報
 */
export interface FormError {
  type: FormErrorType;
  severity: FormErrorSeverity;
  field?: string;
  message: string;
  code?: string;
  details?: Record<string, unknown>;
  timestamp: Date;
  retryable: boolean;
  displayStrategy: ErrorDisplayStrategy;
}

/**
 * バリデーションエラー詳細
 */
export interface ValidationErrorDetail {
  field: string;
  rule: string;
  message: string;
  value?: unknown;
}

/**
 * ネットワークエラー詳細
 */
export interface NetworkErrorDetail {
  status?: number;
  statusText?: string;
  url?: string;
  method?: string;
  timeout?: boolean;
}

/**
 * エラー復旧オプション
 */
export interface ErrorRecoveryOptions {
  retry?: () => Promise<void>;
  fallback?: () => void;
  reload?: () => void;
  logout?: () => void;
}

/**
 * エラーコンテキスト情報
 */
export interface ErrorContext {
  component: string;
  action: string;
  formData?: Record<string, unknown>;
  userId?: string;
  timestamp: Date;
}
