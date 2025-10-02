/**
 * バリデーション関連の型定義
 */

/**
 * バリデーションルールの基本型
 */
export interface BaseValidationRule {
  type: string;
  message: string;
}

/**
 * 必須バリデーションルール
 */
export interface RequiredValidationRule extends BaseValidationRule {
  type: 'required';
}

/**
 * 最小文字数バリデーションルール
 */
export interface MinLengthValidationRule extends BaseValidationRule {
  type: 'minLength';
  value: number;
}

/**
 * 最大文字数バリデーションルール
 */
export interface MaxLengthValidationRule extends BaseValidationRule {
  type: 'maxLength';
  value: number;
}

/**
 * パターンバリデーションルール
 */
export interface PatternValidationRule extends BaseValidationRule {
  type: 'pattern';
  value: RegExp;
}

/**
 * カスタムバリデーションルール
 */
export interface CustomValidationRule extends BaseValidationRule {
  type: 'custom';
  validator: (value: any, context?: any) => boolean;
}

/**
 * 全バリデーションルールの統合型
 */
export type ValidationRule =
  | RequiredValidationRule
  | MinLengthValidationRule
  | MaxLengthValidationRule
  | PatternValidationRule
  | CustomValidationRule;

/**
 * バリデーション結果
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

/**
 * フィールドバリデーション結果
 */
export interface FieldValidationResult {
  fieldName: string;
  isValid: boolean;
  error?: string;
  warning?: string;
}

/**
 * フォームバリデーション結果
 */
export interface FormValidationResult {
  isValid: boolean;
  fields: Record<string, FieldValidationResult>;
  globalErrors?: string[];
}

/**
 * バリデーションコンテキスト
 */
export interface ValidationContext {
  formData: Record<string, any>;
  fieldName: string;
  currentValue: any;
  previousValue?: any;
  isDirty: boolean;
  isTouched: boolean;
}

/**
 * バリデーション設定
 */
export interface ValidationConfig {
  /** リアルタイムバリデーションを有効にするか */
  enableRealtimeValidation: boolean;
  /** デバウンス時間（ミリ秒） */
  debounceMs: number;
  /** 警告しきい値（パーセンテージ） */
  warningThreshold: number;
  /** エラー表示方法 */
  errorDisplay: 'inline' | 'tooltip' | 'summary';
  /** 警告表示方法 */
  warningDisplay: 'inline' | 'tooltip' | 'none';
}

/**
 * デフォルトバリデーション設定
 */
export const DEFAULT_VALIDATION_CONFIG: ValidationConfig = {
  enableRealtimeValidation: true,
  debounceMs: 300,
  warningThreshold: 80,
  errorDisplay: 'inline',
  warningDisplay: 'inline',
};

/**
 * サブ目標・アクション固有のバリデーション型
 */
export interface SubGoalValidationRule extends BaseValidationRule {
  type: 'uniqueTitle' | 'completeSet' | 'validPosition';
  context?: {
    existingTitles?: string[];
    expectedCount?: number;
    validPositions?: number[];
  };
}

export interface ActionValidationRule extends BaseValidationRule {
  type: 'uniqueTitle' | 'completeSet' | 'validType' | 'validPosition';
  context?: {
    subGoalId?: string;
    existingTitles?: string[];
    expectedCount?: number;
    validTypes?: string[];
    validPositions?: number[];
  };
}

/**
 * ビジネスロジックバリデーションルール
 */
export type BusinessValidationRule = SubGoalValidationRule | ActionValidationRule;

/**
 * 統合バリデーションルール
 */
export type ExtendedValidationRule = ValidationRule | BusinessValidationRule;
