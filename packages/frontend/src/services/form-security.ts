/**
 * サブ目標・アクション入力フォーム専用セキュリティサービス
 *
 * 機能:
 * - XSS 攻撃対策実装
 * - CSRF 攻撃対策実装
 * - 入力値サニタイズ実装
 * - 認証・認可チェック実装
 *
 * 要件: 要件1, 要件2
 */

import { detectXSSAttempt, logXSSAttempt } from '../utils/xss-protection';
import {
  generateCSRFToken,
  getCSRFTokenForRequest,
  validateCSRFTokenForSubmission,
  detectCSRFAttempt,
  logCSRFAttempt,
} from '../utils/csrf-protection';
import {
  sanitizeText,
  sanitizeGoalTitle,
  sanitizeDescription,
  sanitizeBackground,
  sanitizeConstraints,
} from '../utils/input-sanitizer';

/**
 * フォームデータの型定義
 */
export interface SubGoalFormData {
  id?: string;
  title: string;
  description: string;
  background: string;
  constraints?: string;
  position: number;
}

export interface ActionFormData {
  id?: string;
  subGoalId: string;
  title: string;
  description: string;
  background: string;
  constraints?: string;
  type: 'execution' | 'habit';
  position: number;
}

/**
 * セキュリティ検証結果
 */
export interface SecurityValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  sanitizedData?: unknown;
}

/**
 * 認証コンテキスト
 */
export interface AuthContext {
  userId?: string;
  token?: string;
  permissions?: string[];
  sessionId?: string;
}

/**
 * フォームセキュリティクラス
 */
export class FormSecurity {
  private csrfToken: string;
  private authContext: AuthContext | null = null;

  constructor() {
    this.csrfToken = getCSRFTokenForRequest();
  }

  /**
   * 認証コンテキストを設定
   * 要件1, 要件2: 認証・認可チェック実装
   */
  setAuthContext(context: AuthContext): void {
    this.authContext = context;
  }

  /**
   * 認証状態をチェック
   */
  isAuthenticated(): boolean {
    return !!(this.authContext?.userId && this.authContext?.token);
  }

  /**
   * 権限をチェック
   */
  hasPermission(permission: string): boolean {
    if (!this.authContext?.permissions) {
      return false;
    }
    return this.authContext.permissions.includes(permission);
  }

  /**
   * サブ目標データのセキュリティ検証
   * 要件1: XSS攻撃対策、入力値サニタイズ実装
   */
  validateSubGoalData(data: Partial<SubGoalFormData>): SecurityValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 認証チェック
    if (!this.isAuthenticated()) {
      errors.push('認証が必要です');
      return { isValid: false, errors, warnings };
    }

    // 権限チェック
    if (!this.hasPermission('subgoal:edit')) {
      errors.push('サブ目標の編集権限がありません');
      return { isValid: false, errors, warnings };
    }

    // XSS攻撃の検出
    const fieldsToCheck = ['title', 'description', 'background', 'constraints'];
    for (const field of fieldsToCheck) {
      const value = data[field as keyof SubGoalFormData];
      if (typeof value === 'string' && detectXSSAttempt(value)) {
        errors.push(`${field}にXSS攻撃の可能性があります`);
        logXSSAttempt(value, `subgoal-${field}`);
      }
    }

    // データサニタイゼーション
    const sanitizedData: SubGoalFormData = {
      id: data.id,
      title: sanitizeGoalTitle(data.title || ''),
      description: sanitizeDescription(data.description || ''),
      background: sanitizeBackground(data.background || ''),
      constraints: data.constraints ? sanitizeConstraints(data.constraints) : undefined,
      position: typeof data.position === 'number' ? data.position : 0,
    };

    // バリデーション
    if (!sanitizedData.title.trim()) {
      errors.push('タイトルは必須です');
    }

    if (!sanitizedData.description.trim()) {
      errors.push('説明は必須です');
    }

    if (!sanitizedData.background.trim()) {
      errors.push('背景は必須です');
    }

    if (sanitizedData.position < 0 || sanitizedData.position > 7) {
      errors.push('位置は0-7の範囲で指定してください');
    }

    // 長さチェック
    if (sanitizedData.title.length > 100) {
      errors.push('タイトルは100文字以内で入力してください');
    }

    if (sanitizedData.description.length > 500) {
      errors.push('説明は500文字以内で入力してください');
    }

    if (sanitizedData.background.length > 500) {
      errors.push('背景は500文字以内で入力してください');
    }

    if (sanitizedData.constraints && sanitizedData.constraints.length > 300) {
      errors.push('制約事項は300文字以内で入力してください');
    }

    // 危険な文字列パターンのチェック
    const dangerousPatterns = [
      /javascript:/gi,
      /vbscript:/gi,
      /data:text\/html/gi,
      /<script/gi,
      /<iframe/gi,
      /<object/gi,
      /<embed/gi,
    ];

    for (const field of fieldsToCheck) {
      const value = sanitizedData[field as keyof SubGoalFormData];
      if (typeof value === 'string') {
        for (const pattern of dangerousPatterns) {
          if (pattern.test(value)) {
            warnings.push(`${field}に危険な可能性のある文字列が含まれています`);
            break;
          }
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      sanitizedData,
    };
  }

  /**
   * アクションデータのセキュリティ検証
   * 要件2: XSS攻撃対策、入力値サニタイズ実装
   */
  validateActionData(data: Partial<ActionFormData>): SecurityValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 認証チェック
    if (!this.isAuthenticated()) {
      errors.push('認証が必要です');
      return { isValid: false, errors, warnings };
    }

    // 権限チェック
    if (!this.hasPermission('action:edit')) {
      errors.push('アクションの編集権限がありません');
      return { isValid: false, errors, warnings };
    }

    // XSS攻撃の検出
    const fieldsToCheck = ['title', 'description', 'background', 'constraints'];
    for (const field of fieldsToCheck) {
      const value = data[field as keyof ActionFormData];
      if (typeof value === 'string' && detectXSSAttempt(value)) {
        errors.push(`${field}にXSS攻撃の可能性があります`);
        logXSSAttempt(value, `action-${field}`);
      }
    }

    // データサニタイゼーション
    const sanitizedData: ActionFormData = {
      id: data.id,
      subGoalId: sanitizeText(data.subGoalId || ''),
      title: sanitizeGoalTitle(data.title || ''),
      description: sanitizeDescription(data.description || ''),
      background: sanitizeBackground(data.background || ''),
      constraints: data.constraints ? sanitizeConstraints(data.constraints) : undefined,
      type: data.type === 'habit' ? 'habit' : 'execution',
      position: typeof data.position === 'number' ? data.position : 0,
    };

    // バリデーション
    if (!sanitizedData.subGoalId.trim()) {
      errors.push('サブ目標IDは必須です');
    }

    if (!sanitizedData.title.trim()) {
      errors.push('タイトルは必須です');
    }

    if (!sanitizedData.description.trim()) {
      errors.push('説明は必須です');
    }

    if (!sanitizedData.background.trim()) {
      errors.push('背景は必須です');
    }

    if (sanitizedData.position < 0 || sanitizedData.position > 7) {
      errors.push('位置は0-7の範囲で指定してください');
    }

    // 長さチェック
    if (sanitizedData.title.length > 100) {
      errors.push('タイトルは100文字以内で入力してください');
    }

    if (sanitizedData.description.length > 500) {
      errors.push('説明は500文字以内で入力してください');
    }

    if (sanitizedData.background.length > 500) {
      errors.push('背景は500文字以内で入力してください');
    }

    if (sanitizedData.constraints && sanitizedData.constraints.length > 300) {
      errors.push('制約事項は300文字以内で入力してください');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      sanitizedData,
    };
  }

  /**
   * CSRF攻撃対策
   * 要件1, 要件2: CSRF攻撃対策実装
   */
  validateCSRFToken(submittedToken: string): boolean {
    return validateCSRFTokenForSubmission(submittedToken);
  }

  /**
   * リクエストのセキュリティ検証
   */
  validateRequest(request: {
    method: string;
    url: string;
    headers?: Record<string, string>;
    body?: unknown;
  }): SecurityValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // CSRF攻撃の検出
    const csrfCheck = detectCSRFAttempt({
      method: request.method,
      origin: request.headers?.['origin'],
      referrer: request.headers?.['referer'],
      token: request.headers?.['x-csrf-token'],
    });

    if (csrfCheck) {
      errors.push('CSRF攻撃の可能性があります');
      logCSRFAttempt({
        method: request.method,
        url: request.url,
        origin: request.headers?.['origin'],
        referrer: request.headers?.['referer'],
      });
    }

    // Content-Typeの検証
    if (request.method === 'POST' || request.method === 'PUT') {
      const contentType = request.headers?.['content-type'];
      if (!contentType || !contentType.includes('application/json')) {
        warnings.push('Content-Typeが適切に設定されていません');
      }
    }

    // User-Agentの検証
    const userAgent = request.headers?.['user-agent'];
    if (!userAgent) {
      warnings.push('User-Agentが設定されていません');
    } else if (userAgent.length > 500) {
      warnings.push('User-Agentが異常に長いです');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * セキュアなHTTPヘッダーを生成
   */
  generateSecureHeaders(): Record<string, string> {
    return {
      'X-CSRF-Token': this.csrfToken,
      'X-Requested-With': 'XMLHttpRequest',
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    };
  }

  /**
   * セキュリティログを記録
   */
  logSecurityEvent(event: {
    type: 'xss_attempt' | 'csrf_attempt' | 'auth_failure' | 'permission_denied';
    details: Record<string, unknown>;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event: event.type,
      severity: event.severity,
      details: event.details,
      userId: this.authContext?.userId,
      sessionId: this.authContext?.sessionId,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
    };

    console.warn('🔒 SECURITY EVENT:', JSON.stringify(logEntry, null, 2));

    // 本番環境では外部セキュリティログサービスに送信
    if (process.env.NODE_ENV === 'production') {
      this.sendSecurityLog(logEntry);
    }
  }

  /**
   * セキュリティログを外部サービスに送信
   */
  private async sendSecurityLog(logEntry: unknown): Promise<void> {
    try {
      // 実際の実装では外部セキュリティログサービスに送信
      console.log('Sending security log to external service:', logEntry);
    } catch (error) {
      console.error('Failed to send security log:', error);
    }
  }

  /**
   * CSRFトークンを更新
   */
  refreshCSRFToken(): string {
    this.csrfToken = generateCSRFToken();
    return this.csrfToken;
  }

  /**
   * 現在のCSRFトークンを取得
   */
  getCSRFToken(): string {
    return this.csrfToken;
  }

  /**
   * セキュリティ設定をクリア
   */
  clear(): void {
    this.authContext = null;
    this.csrfToken = generateCSRFToken();
  }
}

/**
 * デフォルトのフォームセキュリティインスタンス
 */
export const formSecurity = new FormSecurity();

export default FormSecurity;
