import { useCallback, useEffect } from 'react';
import { UseFormReturn } from 'react-hook-form';
import {
  getCSRFTokenForRequest,
  validateCSRFTokenForSubmission,
  initializeCSRFToken,
} from '../utils/csrf-protection';

/**
 * CSRF対策が適用されたフォーム送信のためのカスタムフック
 */
export const useSecureForm = <T extends Record<string, unknown>>(form: UseFormReturn<T>) => {
  const [csrfToken, setCsrfToken] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // CSRFトークンの初期化
  useEffect(() => {
    const token = getCSRFTokenForRequest();
    setCsrfToken(token);
  }, []);

  /**
   * 安全なフォーム送信
   */
  const submitSecurely = useCallback(
    async (
      onSubmit: (data: T, csrfToken: string) => Promise<void>,
      onError?: (error: Error) => void
    ) => {
      if (isSubmitting) return;

      setIsSubmitting(true);

      try {
        // フォームバリデーション
        const isValid = await form.trigger();
        if (!isValid) {
          throw new Error('Form validation failed');
        }

        // CSRFトークンの検証
        if (!validateCSRFTokenForSubmission(csrfToken)) {
          // トークンが無効な場合は新しく生成
          const newToken = initializeCSRFToken();
          setCsrfToken(newToken);
          throw new Error('CSRF token validation failed');
        }

        // フォームデータの取得
        const formData = form.getValues();

        // 送信実行
        await onSubmit(formData, csrfToken);

        // 送信成功後は新しいトークンを生成
        const newToken = initializeCSRFToken();
        setCsrfToken(newToken);
      } catch (error) {
        console.error('Secure form submission failed:', error);
        if (onError) {
          onError(error as Error);
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [form, csrfToken, isSubmitting]
  );

  /**
   * CSRFトークンの手動更新
   */
  const refreshCSRFToken = useCallback(() => {
    const newToken = initializeCSRFToken();
    setCsrfToken(newToken);
  }, []);

  return {
    csrfToken,
    isSubmitting,
    submitSecurely,
    refreshCSRFToken,
  };
};

/**
 * フォームにCSRFトークンを隠しフィールドとして追加するためのヘルパー
 */
export const useCSRFHiddenField = () => {
  const [csrfToken, setCsrfToken] = useState<string>('');

  useEffect(() => {
    const token = getCSRFTokenForRequest();
    setCsrfToken(token);
  }, []);

  return {
    name: '_csrf_token',
    value: csrfToken,
    type: 'hidden' as const,
  };
};
