/**
 * セキュアフォームラッパーコンポーネント
 *
 * 機能:
 * - フォーム全体のセキュリティ保護
 * - CSRF攻撃対策
 * - XSS攻撃対策
 * - 認証・認可チェック
 *
 * 要件: 要件1, 要件2
 */

import React, { useEffect, useState } from 'react';
import { useFormSecurity } from '../../hooks/useFormSecurity';
import { AuthContext } from '../../services/form-security';
import { ErrorDisplay } from './ErrorDisplay';
import { FormError, FormErrorType, FormErrorSeverity } from '../../types/form-error';

/**
 * セキュアフォームラッパーのProps
 */
export interface SecureFormWrapperProps {
  /** 子コンポーネント */
  children: React.ReactNode;
  /** 認証コンテキスト */
  authContext?: AuthContext;
  /** 必要な権限 */
  requiredPermissions?: string[];
  /** セキュリティエラー時のコールバック */
  onSecurityError?: (errors: string[]) => void;
  /** セキュリティ警告時のコールバック */
  onSecurityWarning?: (warnings: string[]) => void;
  /** フォーム送信時のセキュリティ検証 */
  onSubmitValidation?: (data: unknown) => Promise<boolean>;
  /** カスタムクラス名 */
  className?: string;
}

/**
 * セキュアフォームラッパーコンポーネント
 */
export const SecureFormWrapper: React.FC<SecureFormWrapperProps> = ({
  children,
  authContext,
  requiredPermissions = [],
  onSecurityError,
  onSecurityWarning,
  onSubmitValidation,
  className = '',
}) => {
  const {
    isAuthenticated,
    isValidating,
    securityErrors,
    securityWarnings,
    setAuthContext,
    hasPermission,
    validateRequest,
    generateSecureHeaders,
    getCSRFToken,
    clearSecurityErrors,
  } = useFormSecurity();

  const [permissionErrors, setPermissionErrors] = useState<string[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // 認証コンテキストの設定
  useEffect(() => {
    if (authContext) {
      setAuthContext(authContext);
      setIsInitialized(true);
    }
  }, [authContext, setAuthContext]);

  // 権限チェック
  useEffect(() => {
    if (!isInitialized) return;

    const errors: string[] = [];

    if (!isAuthenticated) {
      errors.push('認証が必要です');
    } else {
      for (const permission of requiredPermissions) {
        if (!hasPermission(permission)) {
          errors.push(`権限が不足しています: ${permission}`);
        }
      }
    }

    setPermissionErrors(errors);
  }, [isAuthenticated, requiredPermissions, hasPermission, isInitialized]);

  // セキュリティエラーのコールバック
  useEffect(() => {
    if (securityErrors.length > 0 && onSecurityError) {
      onSecurityError(securityErrors);
    }
  }, [securityErrors, onSecurityError]);

  // セキュリティ警告のコールバック
  useEffect(() => {
    if (securityWarnings.length > 0 && onSecurityWarning) {
      onSecurityWarning(securityWarnings);
    }
  }, [securityWarnings, onSecurityWarning]);

  // フォーム送信の監視とセキュリティ検証
  useEffect(() => {
    const handleFormSubmit = async (event: Event) => {
      const form = event.target as HTMLFormElement;
      if (!form || form.tagName !== 'FORM') return;

      // CSRF トークンの検証
      const csrfToken = getCSRFToken();
      const formData = new FormData(form);
      const submittedToken = formData.get('_csrf_token') as string;

      if (!submittedToken || submittedToken !== csrfToken) {
        event.preventDefault();
        console.error('CSRF token validation failed');

        const csrfError: FormError = {
          type: FormErrorType.AUTHENTICATION_ERROR,
          severity: FormErrorSeverity.CRITICAL,
          message: 'セキュリティトークンが無効です。ページを再読み込みしてください。',
          code: 'CSRF_TOKEN_INVALID',
          timestamp: new Date(),
          retryable: false,
          displayStrategy: {
            inline: false,
            toast: false,
            modal: true,
            summary: false,
          },
        };

        // エラー表示のためのカスタムイベントを発火
        window.dispatchEvent(
          new CustomEvent('form:security:error', {
            detail: { error: csrfError },
          })
        );

        return;
      }

      // カスタムバリデーション
      if (onSubmitValidation) {
        const formDataObj = Object.fromEntries(formData.entries());
        const isValid = await onSubmitValidation(formDataObj);

        if (!isValid) {
          event.preventDefault();
          return;
        }
      }

      // リクエストの検証
      const validation = validateRequest({
        method: 'POST',
        url: form.action || window.location.href,
        headers: generateSecureHeaders(),
        body: Object.fromEntries(formData.entries()),
      });

      if (!validation.isValid) {
        event.preventDefault();
        console.error('Request validation failed:', validation.errors);
      }
    };

    // フォーム送信イベントリスナーを追加
    document.addEventListener('submit', handleFormSubmit);

    return () => {
      document.removeEventListener('submit', handleFormSubmit);
    };
  }, [getCSRFToken, onSubmitValidation, validateRequest, generateSecureHeaders]);

  // セキュリティエラーがある場合の表示
  if (permissionErrors.length > 0) {
    const permissionError: FormError = {
      type: FormErrorType.AUTHORIZATION_ERROR,
      severity: FormErrorSeverity.HIGH,
      message: permissionErrors.join(', '),
      code: 'INSUFFICIENT_PERMISSIONS',
      timestamp: new Date(),
      retryable: false,
      displayStrategy: {
        inline: false,
        toast: false,
        modal: true,
        summary: false,
      },
    };

    return (
      <div className={`secure-form-wrapper ${className}`}>
        <ErrorDisplay error={permissionError} displayType="modal" showRecoveryOptions={false} />
      </div>
    );
  }

  // 初期化中の表示
  if (!isInitialized) {
    return (
      <div className={`secure-form-wrapper ${className}`}>
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">セキュリティ検証中...</span>
        </div>
      </div>
    );
  }

  // セキュリティ検証中の表示
  if (isValidating) {
    return (
      <div className={`secure-form-wrapper ${className}`}>
        <div className="relative">
          <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">検証中...</span>
            </div>
          </div>
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className={`secure-form-wrapper ${className}`}>
      {/* セキュリティエラーの表示 */}
      {securityErrors.length > 0 && (
        <div className="mb-4">
          {securityErrors.map((error, index) => {
            const securityError: FormError = {
              type: FormErrorType.VALIDATION_ERROR,
              severity: FormErrorSeverity.HIGH,
              message: error,
              code: 'SECURITY_VALIDATION_ERROR',
              timestamp: new Date(),
              retryable: false,
              displayStrategy: {
                inline: true,
                toast: false,
                modal: false,
                summary: true,
              },
            };

            return (
              <ErrorDisplay
                key={index}
                error={securityError}
                displayType="summary"
                onDismiss={clearSecurityErrors}
              />
            );
          })}
        </div>
      )}

      {/* セキュリティ警告の表示 */}
      {securityWarnings.length > 0 && (
        <div className="mb-4">
          {securityWarnings.map((warning, index) => {
            const securityWarning: FormError = {
              type: FormErrorType.VALIDATION_ERROR,
              severity: FormErrorSeverity.MEDIUM,
              message: warning,
              code: 'SECURITY_WARNING',
              timestamp: new Date(),
              retryable: false,
              displayStrategy: {
                inline: true,
                toast: false,
                modal: false,
                summary: true,
              },
            };

            return (
              <ErrorDisplay
                key={index}
                error={securityWarning}
                displayType="inline"
                onDismiss={clearSecurityErrors}
              />
            );
          })}
        </div>
      )}

      {/* CSRF トークンを隠しフィールドとして追加 */}
      <input type="hidden" name="_csrf_token" value={getCSRFToken()} />

      {/* セキュリティヘッダーをメタタグとして追加 */}
      <div style={{ display: 'none' }}>
        {Object.entries(generateSecureHeaders()).map(([key, value]) => (
          <meta key={key} name={`security-${key}`} content={value} />
        ))}
      </div>

      {children}
    </div>
  );
};

export default SecureFormWrapper;
