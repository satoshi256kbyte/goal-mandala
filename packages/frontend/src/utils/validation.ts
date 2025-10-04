import {
  ValidationRule,
  FieldValidationResult,
  FormValidationResult,
  ValidationContext,
  BusinessValidationRule,
} from '../types/validation';
import { z } from 'zod';

// 認証フォーム用の型定義
export interface LoginFormData {
  email: string;
  password: string;
}

export interface SignupFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface PasswordResetFormData {
  email: string;
}

export interface NewPasswordFormData {
  newPassword: string;
  confirmPassword: string;
  confirmationCode?: string;
}

// Zodスキーマ（React Hook Form用）
export const loginZodSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
  password: z.string().min(8, 'パスワードは8文字以上で入力してください'),
});

export const signupZodSchema = z
  .object({
    name: z.string().min(1, '名前を入力してください').max(50, '名前は50文字以内で入力してください'),
    email: z.string().email('有効なメールアドレスを入力してください'),
    password: z
      .string()
      .min(8, 'パスワードは8文字以上で入力してください')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'パスワードは大文字、小文字、数字を含む必要があります'
      ),
    confirmPassword: z.string(),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: 'パスワードが一致しません',
    path: ['confirmPassword'],
  });

export const passwordResetZodSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
});

export const newPasswordZodSchema = z
  .object({
    newPassword: z
      .string()
      .min(8, 'パスワードは8文字以上で入力してください')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'パスワードは大文字、小文字、数字を含む必要があります'
      ),
    confirmPassword: z.string(),
    confirmationCode: z.string().optional(),
  })
  .refine(data => data.newPassword === data.confirmPassword, {
    message: 'パスワードが一致しません',
    path: ['confirmPassword'],
  });

/**
 * バリデーションルールのプリセット
 */
export const ValidationRulePresets = {
  // 基本ルール
  required: (message = 'この項目は必須です'): ValidationRule => ({
    type: 'required',
    message,
  }),

  minLength: (length: number, message?: string): ValidationRule => ({
    type: 'minLength',
    value: length,
    message: message || `${length}文字以上で入力してください`,
  }),

  maxLength: (length: number, message?: string): ValidationRule => ({
    type: 'maxLength',
    value: length,
    message: message || `${length}文字以内で入力してください`,
  }),

  pattern: (pattern: RegExp, message: string): ValidationRule => ({
    type: 'pattern',
    value: pattern,
    message,
  }),

  custom: (validator: (value: any, context?: any) => boolean, message: string): ValidationRule => ({
    type: 'custom',
    validator,
    message,
  }),
};

// 認証フォーム用のバリデーションスキーマ
export const loginSchema = {
  email: [
    ValidationRulePresets.required('メールアドレスは必須です'),
    ValidationRulePresets.pattern(
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      '有効なメールアドレスを入力してください'
    ),
  ],
  password: [
    ValidationRulePresets.required('パスワードは必須です'),
    ValidationRulePresets.minLength(8, 'パスワードは8文字以上で入力してください'),
  ],
};

export const signupSchema = {
  name: [
    ValidationRulePresets.required('名前は必須です'),
    ValidationRulePresets.minLength(1, '名前を入力してください'),
    ValidationRulePresets.maxLength(50, '名前は50文字以内で入力してください'),
  ],
  email: [
    ValidationRulePresets.required('メールアドレスは必須です'),
    ValidationRulePresets.pattern(
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      '有効なメールアドレスを入力してください'
    ),
  ],
  password: [
    ValidationRulePresets.required('パスワードは必須です'),
    ValidationRulePresets.minLength(8, 'パスワードは8文字以上で入力してください'),
    ValidationRulePresets.pattern(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'パスワードは大文字、小文字、数字を含む必要があります'
    ),
  ],
  confirmPassword: [
    ValidationRulePresets.required('パスワード確認は必須です'),
    ValidationRulePresets.custom(
      (value, context) => value === context?.formData?.password,
      'パスワードが一致しません'
    ),
  ],
};

export const passwordResetSchema = {
  email: [
    ValidationRulePresets.required('メールアドレスは必須です'),
    ValidationRulePresets.pattern(
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      '有効なメールアドレスを入力してください'
    ),
  ],
};

export const newPasswordSchema = {
  newPassword: [
    ValidationRulePresets.required('新しいパスワードは必須です'),
    ValidationRulePresets.minLength(8, 'パスワードは8文字以上で入力してください'),
    ValidationRulePresets.pattern(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'パスワードは大文字、小文字、数字を含む必要があります'
    ),
  ],
  confirmPassword: [
    ValidationRulePresets.required('パスワード確認は必須です'),
    ValidationRulePresets.custom(
      (value, context) => value === context?.formData?.newPassword,
      'パスワードが一致しません'
    ),
  ],
};

/**
 * 単一フィールドのバリデーションを実行
 */
export const validateField = (
  value: any,
  rules: ValidationRule[],
  context?: Partial<ValidationContext>
): FieldValidationResult => {
  const fieldName = context?.fieldName || 'unknown';
  const errors: string[] = [];

  for (const rule of rules) {
    const error = validateSingleRule(value, rule, context);
    if (error) {
      errors.push(error);
    }
  }

  return {
    fieldName,
    isValid: errors.length === 0,
    error: errors[0], // 最初のエラーのみ表示
  };
};

/**
 * 単一ルールのバリデーションを実行
 */
export const validateSingleRule = (
  value: any,
  rule: ValidationRule,
  context?: Partial<ValidationContext>
): string | null => {
  switch (rule.type) {
    case 'required':
      return validateRequired(value) ? null : rule.message;

    case 'minLength':
      return validateMinLength(value, rule.value) ? null : rule.message;

    case 'maxLength':
      return validateMaxLength(value, rule.value) ? null : rule.message;

    case 'pattern':
      return validatePattern(value, rule.value) ? null : rule.message;

    case 'custom':
      return rule.validator(value, context) ? null : rule.message;

    default:
      console.warn(`Unknown validation rule type: ${(rule as any).type}`);
      return null;
  }
};

/**
 * 必須バリデーション
 */
export const validateRequired = (value: any): boolean => {
  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value === 'string') {
    return value.trim().length > 0;
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  return true;
};

/**
 * 最小文字数バリデーション
 */
export const validateMinLength = (value: any, minLength: number): boolean => {
  if (typeof value !== 'string') {
    return true; // 文字列以外は対象外
  }

  return value.length >= minLength;
};

/**
 * 最大文字数バリデーション
 */
export const validateMaxLength = (value: any, maxLength: number): boolean => {
  if (typeof value !== 'string') {
    return true; // 文字列以外は対象外
  }

  return value.length <= maxLength;
};

/**
 * パターンバリデーション
 */
export const validatePattern = (value: any, pattern: RegExp): boolean => {
  if (typeof value !== 'string') {
    return true; // 文字列以外は対象外
  }

  return pattern.test(value);
};

/**
 * フォーム全体のバリデーションを実行
 */
export const validateForm = (
  formData: Record<string, any>,
  fieldRules: Record<string, ValidationRule[]>,
  businessRules: BusinessValidationRule[] = []
): FormValidationResult => {
  const fields: Record<string, FieldValidationResult> = {};
  let isFormValid = true;
  const globalErrors: string[] = [];

  // フィールドレベルのバリデーション
  for (const [fieldName, rules] of Object.entries(fieldRules)) {
    const value = formData[fieldName];
    const context: Partial<ValidationContext> = {
      formData,
      fieldName,
      currentValue: value,
      isDirty: true,
      isTouched: true,
    };

    const result = validateField(value, rules, context);
    fields[fieldName] = result;

    if (!result.isValid) {
      isFormValid = false;
    }
  }

  // ビジネスロジックレベルのバリデーション
  for (const rule of businessRules) {
    const error = validateBusinessRule(formData, rule);
    if (error) {
      globalErrors.push(error);
      isFormValid = false;
    }
  }

  return {
    isValid: isFormValid,
    fields,
    globalErrors: globalErrors.length > 0 ? globalErrors : undefined,
  };
};

/**
 * ビジネスルールのバリデーションを実行
 */
export const validateBusinessRule = (
  formData: Record<string, any>,
  rule: BusinessValidationRule
): string | null => {
  switch (rule.type) {
    case 'uniqueTitle':
      return validateUniqueTitle(formData, rule);

    case 'completeSet':
      return validateCompleteSet(formData, rule);

    case 'validPosition':
      return validateValidPosition(formData, rule);

    case 'validType':
      return validateValidType(formData, rule);

    default:
      console.warn(`Unknown business rule type: ${(rule as any).type}`);
      return null;
  }
};

/**
 * タイトル重複チェック
 */
export const validateUniqueTitle = (
  formData: Record<string, any>,
  rule: BusinessValidationRule
): string | null => {
  const { existingTitles = [] } = rule.context || {};
  const currentTitle = formData.title?.toLowerCase().trim();

  if (!currentTitle) {
    return null; // 空の場合は重複チェック対象外
  }

  const isDuplicate = existingTitles
    .map(title => title.toLowerCase().trim())
    .includes(currentTitle);

  return isDuplicate ? rule.message : null;
};

/**
 * 完全セットチェック（8個のサブ目標/アクション）
 */
export const validateCompleteSet = (
  formData: Record<string, any>,
  rule: BusinessValidationRule
): string | null => {
  const { expectedCount = 8 } = rule.context || {};
  const items = formData.items || [];

  return items.length === expectedCount ? null : rule.message;
};

/**
 * 有効な位置チェック
 */
export const validateValidPosition = (
  formData: Record<string, any>,
  rule: BusinessValidationRule
): string | null => {
  const { validPositions = [0, 1, 2, 3, 4, 5, 6, 7] } = rule.context || {};
  const position = formData.position;

  if (position === null || position === undefined) {
    return null; // 位置が設定されていない場合は対象外
  }

  return validPositions.includes(position) ? null : rule.message;
};

/**
 * 有効なタイプチェック
 */
export const validateValidType = (
  formData: Record<string, any>,
  rule: BusinessValidationRule
): string | null => {
  const context = rule.context || {};
  const validTypes = (context as any).validTypes || ['execution', 'habit'];
  const type = formData.type;

  if (!type) {
    return null; // タイプが設定されていない場合は対象外
  }

  return validTypes.includes(type) ? null : rule.message;
};

/**
 * ビジネスルールのプリセット
 */
export const BusinessRulePresets = {
  uniqueSubGoalTitles: (existingTitles: string[]): BusinessValidationRule => ({
    type: 'uniqueTitle',
    message: 'サブ目標のタイトルは重複できません',
    context: { existingTitles },
  }),

  completeSubGoalSet: (): BusinessValidationRule => ({
    type: 'completeSet',
    message: 'サブ目標は8個必要です',
    context: { expectedCount: 8 },
  }),

  uniqueActionTitles: (subGoalId: string, existingTitles: string[]): BusinessValidationRule => ({
    type: 'uniqueTitle',
    message: 'アクションのタイトルは重複できません',
    context: { subGoalId, existingTitles },
  }),

  completeActionSet: (subGoalId: string): BusinessValidationRule => ({
    type: 'completeSet',
    message: '各サブ目標にはアクションが8個必要です',
    context: { subGoalId, expectedCount: 8 },
  }),

  validActionType: (): BusinessValidationRule => ({
    type: 'validType',
    message: '有効なアクション種別を選択してください',
    context: { validTypes: ['execution', 'habit'] },
  }),

  validPosition: (validPositions: number[]): BusinessValidationRule => ({
    type: 'validPosition',
    message: '有効な位置を指定してください',
    context: { validPositions },
  }),
};

/**
 * デバウンス付きバリデーション実行
 */
export const createDebouncedValidator = (
  validator: (value: any) => FieldValidationResult,
  delay: number = 300
) => {
  let timeoutId: NodeJS.Timeout;

  return (value: any, callback: (result: FieldValidationResult) => void) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      const result = validator(value);
      callback(result);
    }, delay);
  };
};

/**
 * 文字数警告チェック
 */
export const checkCharacterWarning = (
  currentLength: number,
  maxLength: number,
  threshold: number = 80
): { isWarning: boolean; isError: boolean; message?: string } => {
  const percentage = (currentLength / maxLength) * 100;

  if (currentLength > maxLength) {
    return {
      isWarning: false,
      isError: true,
      message: `文字数が制限を超えています（${currentLength}/${maxLength}）`,
    };
  }

  if (percentage >= threshold) {
    return {
      isWarning: true,
      isError: false,
      message: `文字数が制限に近づいています（${currentLength}/${maxLength}）`,
    };
  }

  return {
    isWarning: false,
    isError: false,
  };
};
