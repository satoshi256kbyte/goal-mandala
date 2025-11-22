import { useState, useCallback, useRef, useEffect } from 'react';
import { fieldValidators } from '../schemas/goal-form';

/**
 * バリデーション結果の型定義
 */
export interface ValidationResult {
  isValid: boolean;
  error?: string;
  errorType?: ValidationErrorType;
}

/**
 * フィールド名の型定義
 */
export type FieldName = 'title' | 'description' | 'deadline' | 'background' | 'constraints';

/**
 * バリデーション状態の型定義
 */
export interface ValidationState {
  [key: string]: ValidationResult;
}

/**
 * リアルタイムバリデーションのオプション
 */
export interface RealtimeValidationOptions {
  /** バリデーションの遅延時間（ミリ秒） */
  debounceMs?: number;
  /** 初期値でのバリデーション実行フラグ */
  validateOnMount?: boolean;
  /** フォーカス時のバリデーション実行フラグ */
  validateOnFocus?: boolean;
  /** ブラー時のバリデーション実行フラグ */
  validateOnBlur?: boolean;
  /** 変更時のバリデーション実行フラグ */
  validateOnChange?: boolean;
}

/**
 * リアルタイムバリデーションフック
 */
export const useRealtimeValidation = (options: RealtimeValidationOptions = {}) => {
  const {
    debounceMs = 300,

    validateOnFocus = false,
    validateOnBlur = true,
    validateOnChange = true,
  } = options;

  const [validationState, setValidationState] = useState<ValidationState>({});
  const [isValidating, setIsValidating] = useState(false);
  const debounceTimers = useRef<Record<string, NodeJS.Timeout>>({});

  /**
   * 単一フィールドのバリデーション実行
   */
  const validateField = useCallback((fieldName: FieldName, value: string): ValidationResult => {
    const validator =
      fieldValidators[
        `validate${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}` as keyof typeof fieldValidators
      ];

    if (!validator) {
      return { isValid: true };
    }

    return validator(value);
  }, []);

  /**
   * デバウンス付きバリデーション実行
   */
  const debouncedValidate = useCallback(
    (fieldName: FieldName, value: string) => {
      // 既存のタイマーをクリア
      if (debounceTimers.current[fieldName]) {
        clearTimeout(debounceTimers.current[fieldName]);
      }

      setIsValidating(true);

      // 新しいタイマーを設定
      debounceTimers.current[fieldName] = setTimeout(() => {
        const result = validateField(fieldName, value);

        setValidationState(prev => ({
          ...prev,
          [fieldName]: result,
        }));

        setIsValidating(false);
      }, debounceMs);
    },
    [validateField, debounceMs]
  );

  /**
   * 即座にバリデーション実行
   */
  const validateImmediately = useCallback(
    (fieldName: FieldName, value: string) => {
      // デバウンスタイマーをクリア
      if (debounceTimers.current[fieldName]) {
        clearTimeout(debounceTimers.current[fieldName]);
      }

      const result = validateField(fieldName, value);

      setValidationState(prev => ({
        ...prev,
        [fieldName]: result,
      }));
    },
    [validateField]
  );

  /**
   * フィールドのバリデーション状態をクリア
   */
  const clearValidation = useCallback((fieldName: FieldName) => {
    if (debounceTimers.current[fieldName]) {
      clearTimeout(debounceTimers.current[fieldName]);
    }

    setValidationState(prev => {
      const newState = { ...prev };
      delete newState[fieldName];
      return newState;
    });
  }, []);

  /**
   * 全てのバリデーション状態をクリア
   */
  const clearAllValidation = useCallback(() => {
    Object.values(debounceTimers.current).forEach(timer => {
      if (timer) clearTimeout(timer);
    });
    debounceTimers.current = {};
    setValidationState({});
    setIsValidating(false);
  }, []);

  /**
   * フィールドのイベントハンドラーを生成
   */
  const getFieldHandlers = useCallback(
    (fieldName: FieldName) => {
      return {
        onFocus: validateOnFocus
          ? (value: string) => validateImmediately(fieldName, value)
          : undefined,

        onBlur: validateOnBlur
          ? (value: string) => validateImmediately(fieldName, value)
          : undefined,

        onChange: validateOnChange
          ? (value: string) => debouncedValidate(fieldName, value)
          : undefined,
      };
    },
    [validateOnFocus, validateOnBlur, validateOnChange, validateImmediately, debouncedValidate]
  );

  /**
   * 特定フィールドのバリデーション結果を取得
   */
  const getFieldValidation = useCallback(
    (fieldName: FieldName): ValidationResult => {
      return validationState[fieldName] || { isValid: true };
    },
    [validationState]
  );

  /**
   * 全フィールドが有効かどうかを判定
   */
  const isAllValid = useCallback((): boolean => {
    return Object.values(validationState).every(result => result.isValid);
  }, [validationState]);

  /**
   * バリデーションエラーがあるかどうかを判定
   */
  const hasErrors = useCallback((): boolean => {
    return Object.values(validationState).some(result => !result.isValid);
  }, [validationState]);

  /**
   * エラーメッセージの一覧を取得
   */
  const getErrorMessages = useCallback((): string[] => {
    return Object.values(validationState)
      .filter(result => !result.isValid && result.error)
      .map(result => result.error || '');
  }, [validationState]);

  // コンポーネントのアンマウント時にタイマーをクリーンアップ
  useEffect(() => {
    return () => {
      Object.values(debounceTimers.current).forEach(timer => {
        if (timer) clearTimeout(timer);
      });
    };
  }, []);

  return {
    // 状態
    validationState,
    isValidating,

    // バリデーション実行関数
    validateField: validateImmediately,
    debouncedValidate,

    // 状態管理関数
    clearValidation,
    clearAllValidation,

    // ヘルパー関数
    getFieldHandlers,
    getFieldValidation,
    isAllValid,
    hasErrors,
    getErrorMessages,
  };
};

/**
 * 単一フィールド用のリアルタイムバリデーションフック
 */
export const useFieldValidation = (
  fieldName: FieldName,
  options: RealtimeValidationOptions = {}
) => {
  const validation = useRealtimeValidation(options);

  return {
    validationResult: validation.getFieldValidation(fieldName),
    isValidating: validation.isValidating,
    validate: (value: string) => validation.validateField(fieldName, value),
    debouncedValidate: (value: string) => validation.debouncedValidate(fieldName, value),
    clear: () => validation.clearValidation(fieldName),
    handlers: validation.getFieldHandlers(fieldName),
  };
};

/**
 * フォーム全体のリアルタイムバリデーションフック
 */
export const useFormValidation = (options: RealtimeValidationOptions = {}) => {
  const validation = useRealtimeValidation(options);

  return {
    ...validation,

    /**
     * 複数フィールドを一括でバリデーション
     */
    validateFields: (fields: Record<FieldName, string>) => {
      Object.entries(fields).forEach(([fieldName, value]) => {
        validation.validateField(fieldName as FieldName, value);
      });
    },

    /**
     * フォームの送信可能状態を判定
     */
    canSubmit: () => validation.isAllValid() && !validation.isValidating,
  };
};
