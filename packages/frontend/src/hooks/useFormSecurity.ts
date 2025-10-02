/**
 * フォームセキュリティフック
 *
 * 機能:
 * - セキュリティ検証の統合
 * - 認証・認可チェック
 * - セキュリティイベントの監視
 *
 * 要件: 要件1, 要件2
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  FormSecurity,
  SubGoalFormData,
  ActionFormData,
  SecurityValidationResult,
  AuthContext,
} from '../services/form-security';

/**
 * フォームセキュリティフックの戻り値
 */
export interface UseFormSecurityReturn {
  /** 認証状態 */
  isAuthenticated: boolean;
  /** セキュリティ検証中かどうか */
  isValidating: boolean;
  /** セキュリティエラー */
  securityErrors: string[];
  /** セキュリティ警告 */
  securityWarnings: string[];

  /** 認証コンテキストを設定 */
  setAuthContext: (context: AuthContext) => void;
  /** 権限をチェック */
  hasPermission: (permission: string) => boolean;
  /** サブ目標データを検証 */
  validateSubGoalData: (data: Partial<SubGoalFormData>) => Promise<SecurityValidationResult>;
  /** アクションデータを検証 */
  validateActionData: (data: Partial<ActionFormData>) => Promise<SecurityValidationResult>;
  /** リクエストを検証 */
  validateRequest: (request: {
    method: string;
    url: string;
    headers?: Record<string, string>;
    body?: unknown;
  }) => SecurityValidationResult;
  /** セキュアなヘッダーを生成 */
  generateSecureHeaders: () => Record<string, string>;
  /** CSRFトークンを取得 */
  getCSRFToken: () => string;
  /** セキュリティエラーをクリア */
  clearSecurityErrors: () => void;
}

/**
 * フォームセキュリティフック
 */
export const useFormSecurity = (): UseFormSecurityReturn => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [securityErrors, setSecurityErrors] = useState<string[]>([]);
  const [securityWarnings, setSecurityWarnings] = useState<string[]>([]);

  const securityRef = useRef<FormSecurity>();

  // セキュリティインスタンスの初期化
  useEffect(() => {
    securityRef.current = new FormSecurity();
  }, []);

  /**
   * 認証コンテキストを設定
   */
  const setAuthContext = useCallback((context: AuthContext) => {
    if (!securityRef.current) return;

    securityRef.current.setAuthContext(context);
    setIsAuthenticated(securityRef.current.isAuthenticated());
  }, []);

  /**
   * 権限をチェック
   */
  const hasPermission = useCallback((permission: string): boolean => {
    if (!securityRef.current) return false;
    return securityRef.current.hasPermission(permission);
  }, []);

  /**
   * サブ目標データを検証
   */
  const validateSubGoalData = useCallback(
    async (data: Partial<SubGoalFormData>): Promise<SecurityValidationResult> => {
      if (!securityRef.current) {
        return {
          isValid: false,
          errors: ['セキュリティサービスが初期化されていません'],
          warnings: [],
        };
      }

      setIsValidating(true);

      try {
        const result = securityRef.current.validateSubGoalData(data);

        setSecurityErrors(result.errors);
        setSecurityWarnings(result.warnings);

        // セキュリティイベントをログ
        if (result.errors.length > 0) {
          securityRef.current.logSecurityEvent({
            type: 'xss_attempt',
            details: {
              component: 'subgoal-form',
              errors: result.errors,
              data: data,
            },
            severity: 'high',
          });
        }

        return result;
      } finally {
        setIsValidating(false);
      }
    },
    []
  );

  /**
   * アクションデータを検証
   */
  const validateActionData = useCallback(
    async (data: Partial<ActionFormData>): Promise<SecurityValidationResult> => {
      if (!securityRef.current) {
        return {
          isValid: false,
          errors: ['セキュリティサービスが初期化されていません'],
          warnings: [],
        };
      }

      setIsValidating(true);

      try {
        const result = securityRef.current.validateActionData(data);

        setSecurityErrors(result.errors);
        setSecurityWarnings(result.warnings);

        // セキュリティイベントをログ
        if (result.errors.length > 0) {
          securityRef.current.logSecurityEvent({
            type: 'xss_attempt',
            details: {
              component: 'action-form',
              errors: result.errors,
              data: data,
            },
            severity: 'high',
          });
        }

        return result;
      } finally {
        setIsValidating(false);
      }
    },
    []
  );

  /**
   * リクエストを検証
   */
  const validateRequest = useCallback(
    (request: {
      method: string;
      url: string;
      headers?: Record<string, string>;
      body?: unknown;
    }): SecurityValidationResult => {
      if (!securityRef.current) {
        return {
          isValid: false,
          errors: ['セキュリティサービスが初期化されていません'],
          warnings: [],
        };
      }

      const result = securityRef.current.validateRequest(request);

      // CSRF攻撃の検出時はログ
      if (result.errors.some(error => error.includes('CSRF'))) {
        securityRef.current.logSecurityEvent({
          type: 'csrf_attempt',
          details: {
            request: {
              method: request.method,
              url: request.url,
              headers: request.headers,
            },
            errors: result.errors,
          },
          severity: 'critical',
        });
      }

      return result;
    },
    []
  );

  /**
   * セキュアなヘッダーを生成
   */
  const generateSecureHeaders = useCallback((): Record<string, string> => {
    if (!securityRef.current) return {};
    return securityRef.current.generateSecureHeaders();
  }, []);

  /**
   * CSRFトークンを取得
   */
  const getCSRFToken = useCallback((): string => {
    if (!securityRef.current) return '';
    return securityRef.current.getCSRFToken();
  }, []);

  /**
   * セキュリティエラーをクリア
   */
  const clearSecurityErrors = useCallback(() => {
    setSecurityErrors([]);
    setSecurityWarnings([]);
  }, []);

  return {
    isAuthenticated,
    isValidating,
    securityErrors,
    securityWarnings,
    setAuthContext,
    hasPermission,
    validateSubGoalData,
    validateActionData,
    validateRequest,
    generateSecureHeaders,
    getCSRFToken,
    clearSecurityErrors,
  };
};

export default useFormSecurity;
