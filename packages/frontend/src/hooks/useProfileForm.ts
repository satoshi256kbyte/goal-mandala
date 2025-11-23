import { useState, useCallback, useMemo } from 'react';
import { ProfileFormData, UseProfileFormOptions } from '../types/profile';
import { updateProfile } from '../services/profileService';
import { debounce } from '../utils/debounce';

// TODO: UseProfileFormReturn型を適切な場所に移動
interface UseProfileFormReturn {
  formData: ProfileFormData;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
  successMessage: string | null;
  setFieldValue: (field: keyof ProfileFormData, value: string) => void;
  setFieldTouched: (field: keyof ProfileFormData, isTouched: boolean) => void;
  validateField: (field: string) => string | undefined;
  validateForm: () => boolean;
  handleSubmit: () => Promise<void>;
  resetForm: () => void;
  clearError: () => void;
  clearSuccess: () => void;
}

/**
 * プロフィールフォーム管理カスタムフック
 *
 * フォーム状態の管理、バリデーション、API通信を行います。
 *
 * @param options - フックのオプション
 * @returns フォーム状態とメソッド
 */
export function useProfileForm(options?: UseProfileFormOptions): UseProfileFormReturn {
  // フォームデータの状態
  const [formData, setFormData] = useState<ProfileFormData>({
    industry: '',
    companySize: '',
    jobTitle: '',
    position: '',
  });

  // エラー情報の状態
  const [errors, setErrors] = useState<Record<string, string>>({});

  // タッチ状態の管理
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // ローディング状態（データ取得など）
  const [isLoading, _setIsLoading] = useState(false);

  // 送信中状態
  const [isSubmitting, setIsSubmitting] = useState(false);

  // エラーメッセージ
  const [error, setError] = useState<string | null>(null);

  // 成功メッセージ
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  /**
   * フィールド単位のバリデーション
   * 要件: 11.2 - コールバックのメモ化
   *
   * @param field - バリデーション対象のフィールド名
   * @returns エラーメッセージ（エラーがない場合はundefined）
   */
  const validateField = useCallback(
    (field: string): string | undefined => {
      const value = formData[field as keyof ProfileFormData];

      switch (field) {
        case 'industry':
          if (!value) return '業種を選択してください';
          break;
        case 'companySize':
          if (!value) return '組織規模を選択してください';
          break;
        case 'jobTitle':
          if (!value) return '職種を入力してください';
          if (value.length > 100) return '職種は100文字以内で入力してください';
          break;
        case 'position':
          if (value && value.length > 100) return '役職は100文字以内で入力してください';
          break;
      }

      return undefined;
    },
    [formData]
  );

  /**
   * デバウンスされたバリデーション
   * 要件: 11.3 - バリデーションのデバウンス
   */
  const debouncedValidateField = useMemo(
    () =>
      debounce((field: string) => {
        const fieldError = validateField(field);
        if (fieldError) {
          setErrors(prev => ({ ...prev, [field]: fieldError }));
        } else {
          setErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors[field];
            return newErrors;
          });
        }
      }, 300),
    [validateField]
  );

  /**
   * フォーム全体のバリデーション
   * 要件: 11.2 - コールバックのメモ化
   *
   * @returns バリデーション成功の場合true
   */
  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    ['industry', 'companySize', 'jobTitle', 'position'].forEach(field => {
      const fieldError = validateField(field);
      if (fieldError) {
        newErrors[field] = fieldError;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [validateField]);

  /**
   * フィールド値の設定
   * 要件: 11.2 - コールバックのメモ化
   * 要件: 11.3 - バリデーションのデバウンス
   *
   * @param field - フィールド名
   * @param value - 設定する値
   */
  const setFieldValue = useCallback(
    (field: string, value: string) => {
      setFormData(prev => ({ ...prev, [field]: value }));

      // タッチされている場合はデバウンスされたバリデーションを実行
      if (touched[field]) {
        debouncedValidateField(field);
      }
    },
    [touched, debouncedValidateField]
  );

  /**
   * フィールドのタッチ状態を設定
   * 要件: 11.2 - コールバックのメモ化
   *
   * @param field - フィールド名
   * @param isTouched - タッチ状態
   */
  const setFieldTouched = useCallback(
    (field: string, isTouched: boolean) => {
      setTouched(prev => ({ ...prev, [field]: isTouched }));

      // タッチされた場合はバリデーション実行
      if (isTouched) {
        const fieldError = validateField(field);
        if (fieldError) {
          setErrors(prev => ({ ...prev, [field]: fieldError }));
        }
      }
    },
    [validateField]
  );

  /**
   * フォーム送信処理
   * 要件: 11.2 - コールバックのメモ化
   */
  const handleSubmit = useCallback(async () => {
    // 全フィールドをタッチ済みにする
    setTouched({
      industry: true,
      companySize: true,
      jobTitle: true,
      position: true,
    });

    // バリデーション実行
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // API呼び出し
      await updateProfile(formData);

      setSuccessMessage('プロフィールを保存しました');

      // 成功コールバック実行
      if (options?.onSuccess) {
        options.onSuccess();
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '予期しないエラーが発生しました';
      setError(errorMessage);

      // エラーコールバック実行
      if (options?.onError) {
        options.onError(err as Error);
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, validateForm, options]);

  /**
   * フォームリセット
   * 要件: 11.2 - コールバックのメモ化
   */
  const resetForm = useCallback(() => {
    setFormData({
      industry: '',
      companySize: '',
      jobTitle: '',
      position: '',
    });
    setErrors({});
    setTouched({});
    setError(null);
    setSuccessMessage(null);
  }, []);

  /**
   * エラークリア
   * 要件: 11.2 - コールバックのメモ化
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * 成功メッセージクリア
   * 要件: 11.2 - コールバックのメモ化
   */
  const clearSuccess = useCallback(() => {
    setSuccessMessage(null);
  }, []);

  return {
    formData,
    errors,
    touched,
    isLoading,
    isSubmitting,
    error,
    successMessage,
    setFieldValue,
    setFieldTouched,
    validateField,
    validateForm,
    handleSubmit,
    resetForm,
    clearError,
    clearSuccess,
  };
}
