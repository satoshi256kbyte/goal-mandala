import { z } from 'zod';

/**
 * 日付バリデーション用のヘルパー関数
 */
const validateDate = {
  /**
   * 日付形式の検証
   */
  isValidFormat: (dateString: string): boolean => {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    return dateRegex.test(dateString);
  },

  /**
   * 有効な日付かどうかの検証
   */
  isValidDate: (dateString: string): boolean => {
    if (!validateDate.isValidFormat(dateString)) return false;
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime());
  },

  /**
   * 今日以降の日付かどうかの検証
   */
  isNotPast: (dateString: string): boolean => {
    if (!validateDate.isValidDate(dateString)) return false;

    // 文字列を直接比較（YYYY-MM-DD形式）
    const today = new Date();
    const todayString =
      today.getFullYear() +
      '-' +
      String(today.getMonth() + 1).padStart(2, '0') +
      '-' +
      String(today.getDate()).padStart(2, '0');

    return dateString >= todayString;
  },

  /**
   * 1年以内の日付かどうかの検証
   */
  isWithinOneYear: (dateString: string): boolean => {
    if (!validateDate.isValidDate(dateString)) return false;
    const selectedDate = new Date(dateString);
    const today = new Date();
    const oneYearLater = new Date();
    oneYearLater.setFullYear(today.getFullYear() + 1);
    return selectedDate <= oneYearLater;
  },
};

/**
 * 文字列バリデーション用のヘルパー関数
 */
const validateString = {
  /**
   * 空白文字のみでないかの検証
   */
  isNotOnlyWhitespace: (value: string): boolean => {
    return value.trim().length > 0;
  },

  /**
   * 危険な文字が含まれていないかの検証（XSS対策）
   */
  isSafe: (value: string): boolean => {
    const dangerousPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
    ];
    return !dangerousPatterns.some(pattern => pattern.test(value));
  },
};

/**
 * 目標入力フォームのバリデーションスキーマ
 */
export const goalFormSchema = z.object({
  title: z
    .string({ required_error: '目標タイトルは必須です' })
    .min(1, '目標タイトルは必須です')
    .max(100, '目標タイトルは100文字以内で入力してください')
    .refine(validateString.isNotOnlyWhitespace, '目標タイトルは空白のみでは入力できません')
    .refine(validateString.isSafe, '目標タイトルに不正な文字が含まれています')
    .transform(str => str.trim()),

  description: z
    .string({ required_error: '目標説明は必須です' })
    .min(1, '目標説明は必須です')
    .max(1000, '目標説明は1000文字以内で入力してください')
    .refine(validateString.isNotOnlyWhitespace, '目標説明は空白のみでは入力できません')
    .refine(validateString.isSafe, '目標説明に不正な文字が含まれています')
    .transform(str => str.trim()),

  deadline: z
    .string({ required_error: '達成期限は必須です' })
    .min(1, '達成期限は必須です')
    .refine(validateDate.isValidFormat, '日付は YYYY-MM-DD 形式で入力してください')
    .refine(validateDate.isValidDate, '有効な日付を入力してください')
    .refine(validateDate.isNotPast, '達成期限は今日以降の日付を選択してください')
    .refine(validateDate.isWithinOneYear, '達成期限は1年以内の日付を選択してください'),

  background: z
    .string({ required_error: '背景は必須です' })
    .min(1, '背景は必須です')
    .max(500, '背景は500文字以内で入力してください')
    .refine(validateString.isNotOnlyWhitespace, '背景は空白のみでは入力できません')
    .refine(validateString.isSafe, '背景に不正な文字が含まれています')
    .transform(str => str.trim()),

  constraints: z
    .string()
    .max(500, '制約事項は500文字以内で入力してください')
    .refine(validateString.isSafe, '制約事項に不正な文字が含まれています')
    .transform(str => str.trim())
    .optional()
    .or(z.literal('')), // 空文字列も許可
});

/**
 * 部分的なバリデーションスキーマ（下書き保存用）
 */
export const partialGoalFormSchema = z.object({
  title: z
    .string()
    .max(100, '目標タイトルは100文字以内で入力してください')
    .refine(
      value => !value || validateString.isSafe(value),
      '目標タイトルに不正な文字が含まれています'
    )
    .transform(str => str?.trim() || '')
    .optional(),

  description: z
    .string()
    .max(1000, '目標説明は1000文字以内で入力してください')
    .refine(value => !value || validateString.isSafe(value), '目標説明に不正な文字が含まれています')
    .transform(str => str?.trim() || '')
    .optional(),

  deadline: z
    .string()
    .refine(date => {
      if (!date) return true; // 空の場合はOK
      return validateDate.isValidFormat(date);
    }, '日付は YYYY-MM-DD 形式で入力してください')
    .refine(date => {
      if (!date) return true; // 空の場合はOK
      return validateDate.isValidDate(date);
    }, '有効な日付を入力してください')
    .refine(date => {
      if (!date) return true; // 空の場合はOK
      return validateDate.isNotPast(date);
    }, '達成期限は今日以降の日付を選択してください')
    .refine(date => {
      if (!date) return true; // 空の場合はOK
      return validateDate.isWithinOneYear(date);
    }, '達成期限は1年以内の日付を選択してください')
    .optional(),

  background: z
    .string()
    .max(500, '背景は500文字以内で入力してください')
    .refine(value => !value || validateString.isSafe(value), '背景に不正な文字が含まれています')
    .transform(str => str?.trim() || '')
    .optional(),

  constraints: z
    .string()
    .max(500, '制約事項は500文字以内で入力してください')
    .refine(value => !value || validateString.isSafe(value), '制約事項に不正な文字が含まれています')
    .transform(str => str?.trim() || '')
    .optional()
    .or(z.literal('')), // 空文字列も許可
});

/**
 * バリデーションスキーマから型を推論
 */
export type GoalFormData = z.infer<typeof goalFormSchema>;
export type PartialGoalFormData = z.infer<typeof partialGoalFormSchema>;

/**
 * 文字数制限の定数
 */
export const FIELD_LIMITS = {
  TITLE_MAX: 100,
  DESCRIPTION_MAX: 1000,
  BACKGROUND_MAX: 500,
  CONSTRAINTS_MAX: 500,
} as const;

/**
 * 文字数警告のしきい値（80%）
 */
export const WARNING_THRESHOLDS = {
  TITLE: Math.floor(FIELD_LIMITS.TITLE_MAX * 0.8),
  DESCRIPTION: Math.floor(FIELD_LIMITS.DESCRIPTION_MAX * 0.8),
  BACKGROUND: Math.floor(FIELD_LIMITS.BACKGROUND_MAX * 0.8),
  CONSTRAINTS: Math.floor(FIELD_LIMITS.CONSTRAINTS_MAX * 0.8),
} as const;

/**
 * 日付関連のユーティリティ関数
 */
export const dateUtils = {
  /**
   * 今日の日付を取得（時刻をリセット）
   */
  getToday: (): Date => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  },

  /**
   * 1年後の日付を取得
   */
  getOneYearLater: (): Date => {
    const oneYearLater = new Date();
    oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
    return oneYearLater;
  },

  /**
   * 日付をISO文字列に変換（日付部分のみ）
   */
  toISODateString: (date: Date): string => {
    return date.toISOString().split('T')[0];
  },

  /**
   * ISO文字列から日付オブジェクトに変換
   */
  fromISODateString: (dateString: string): Date => {
    return new Date(dateString + 'T00:00:00.000Z');
  },

  /**
   * 日付の最小値を取得（今日）
   */
  getMinDate: (): string => {
    return dateUtils.toISODateString(dateUtils.getToday());
  },

  /**
   * 日付の最大値を取得（1年後）
   */
  getMaxDate: (): string => {
    return dateUtils.toISODateString(dateUtils.getOneYearLater());
  },
} as const;

/**
 * バリデーションエラーの種類
 */
export enum ValidationErrorType {
  REQUIRED = 'required',
  MIN_LENGTH = 'min_length',
  MAX_LENGTH = 'max_length',
  INVALID_FORMAT = 'invalid_format',
  INVALID_DATE = 'invalid_date',
  DATE_TOO_EARLY = 'date_too_early',
  DATE_TOO_LATE = 'date_too_late',
  UNSAFE_CONTENT = 'unsafe_content',
  WHITESPACE_ONLY = 'whitespace_only',
}

/**
 * フィールド別のバリデーション関数
 */
export const fieldValidators = {
  /**
   * 目標タイトルのバリデーション
   */
  validateTitle: (value: string): { isValid: boolean; error?: string } => {
    try {
      goalFormSchema.shape.title.parse(value);
      return { isValid: true };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return { isValid: false, error: error.errors[0]?.message };
      }
      return { isValid: false, error: '不明なエラーが発生しました' };
    }
  },

  /**
   * 目標説明のバリデーション
   */
  validateDescription: (value: string): { isValid: boolean; error?: string } => {
    try {
      goalFormSchema.shape.description.parse(value);
      return { isValid: true };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return { isValid: false, error: error.errors[0]?.message };
      }
      return { isValid: false, error: '不明なエラーが発生しました' };
    }
  },

  /**
   * 達成期限のバリデーション
   */
  validateDeadline: (value: string): { isValid: boolean; error?: string } => {
    try {
      goalFormSchema.shape.deadline.parse(value);
      return { isValid: true };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return { isValid: false, error: error.errors[0]?.message };
      }
      return { isValid: false, error: '不明なエラーが発生しました' };
    }
  },

  /**
   * 背景のバリデーション
   */
  validateBackground: (value: string): { isValid: boolean; error?: string } => {
    try {
      goalFormSchema.shape.background.parse(value);
      return { isValid: true };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return { isValid: false, error: error.errors[0]?.message };
      }
      return { isValid: false, error: '不明なエラーが発生しました' };
    }
  },

  /**
   * 制約事項のバリデーション
   */
  validateConstraints: (value: string): { isValid: boolean; error?: string } => {
    try {
      goalFormSchema.shape.constraints.parse(value);
      return { isValid: true };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.errors[0];
        // ユニオンエラーの場合、実際のエラーメッセージを取得
        if (firstError?.code === 'invalid_union' && firstError.unionErrors) {
          const actualError = firstError.unionErrors[0]?.errors?.[0];
          return { isValid: false, error: actualError?.message || firstError.message };
        }
        return { isValid: false, error: firstError?.message };
      }
      return { isValid: false, error: '不明なエラーが発生しました' };
    }
  },
} as const;

/**
 * フォーム全体のバリデーション関数
 */
export const validateGoalForm = (
  data: unknown
): {
  isValid: boolean;
  errors?: Record<string, string>;
  data?: GoalFormData;
} => {
  try {
    const validatedData = goalFormSchema.parse(data);
    return { isValid: true, data: validatedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string> = {};
      error.errors.forEach(err => {
        const path = err.path.join('.');
        errors[path] = err.message;
      });
      return { isValid: false, errors };
    }
    return { isValid: false, errors: { general: '不明なエラーが発生しました' } };
  }
};

/**
 * 部分的なフォームのバリデーション関数（下書き保存用）
 */
export const validatePartialGoalForm = (
  data: unknown
): {
  isValid: boolean;
  errors?: Record<string, string>;
  data?: PartialGoalFormData;
} => {
  try {
    const validatedData = partialGoalFormSchema.parse(data);
    return { isValid: true, data: validatedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string> = {};
      error.errors.forEach(err => {
        const path = err.path.join('.');
        errors[path] = err.message;
      });
      return { isValid: false, errors };
    }
    return { isValid: false, errors: { general: '不明なエラーが発生しました' } };
  }
};
