/**
 * 目標入力フォーム関連の型定義
 */

import { UseFormRegister, UseFormSetValue } from 'react-hook-form';

// スキーマファイルから型をインポート
export type { GoalFormData, PartialGoalFormData } from '../schemas/goal-form';
import type { GoalFormData } from '../schemas/goal-form';

/**
 * フォームフィールドのプロパティ
 */
export interface FormFieldProps {
  /** フィールドラベル */
  label: string;
  /** 必須フィールドかどうか */
  required?: boolean;
  /** エラーメッセージ */
  error?: string;
  /** ヘルプテキスト */
  helpText?: string;
  /** 子要素 */
  children: React.ReactNode;
}

/**
 * テキスト入力フィールドのプロパティ
 */
export interface TextInputProps {
  /** フィールド名 */
  name: keyof GoalFormData;
  /** プレースホルダー */
  placeholder?: string;
  /** 最大文字数 */
  maxLength?: number;
  /** 文字数カウンターを表示するか */
  showCounter?: boolean;
  /** 複数行入力かどうか */
  multiline?: boolean;
  /** 行数（multilineがtrueの場合） */
  rows?: number;
  /** React Hook Formのregister関数 */
  register: UseFormRegister<GoalFormData>;
  /** エラー情報 */
  error?: FieldError;
}

/**
 * 日付ピッカーのプロパティ
 */
export interface DatePickerProps {
  /** フィールド名 */
  name: keyof GoalFormData;
  /** 最小日付 */
  minDate?: Date;
  /** 最大日付 */
  maxDate?: Date;
  /** React Hook Formのregister関数 */
  register: UseFormRegister<GoalFormData>;
  /** エラー情報 */
  error?: FieldError;
  /** React Hook FormのsetValue関数 */
  setValue: UseFormSetValue<GoalFormData>;
}

/**
 * 文字数カウンターのプロパティ
 */
export interface CharacterCounterProps {
  /** 現在の文字数 */
  current: number;
  /** 最大文字数 */
  max: number;
  /** 警告しきい値（デフォルト: 80%） */
  warningThreshold?: number;
}

/**
 * バリデーションメッセージのプロパティ
 */
export interface ValidationMessageProps {
  /** エラーメッセージ */
  message?: string;
  /** エラータイプ */
  type?: 'error' | 'warning' | 'info';
}

/**
 * 目標入力フォームのプロパティ
 */
export interface GoalInputFormProps {
  /** 初期データ */
  initialData?: Partial<GoalFormData>;
  /** フォーム送信時のコールバック */
  onSubmit: (data: GoalFormData) => Promise<void>;
  /** 下書き保存時のコールバック */
  onDraftSave: (data: Partial<GoalFormData>) => Promise<void>;
  /** 送信中かどうか */
  isSubmitting: boolean;
  /** 下書き保存中かどうか */
  isDraftSaving?: boolean;
}

/**
 * フォームアクションのプロパティ
 */
export interface FormActionsProps {
  /** 送信ボタンが有効かどうか */
  canSubmit: boolean;
  /** 送信中かどうか */
  isSubmitting: boolean;
  /** 下書き保存中かどうか */
  isDraftSaving: boolean;
  /** 下書き保存ハンドラー */
  onDraftSave: () => void;
  /** フォーム送信ハンドラー */
  onSubmit: () => void;
}

/**
 * API レスポンス型定義
 */

/**
 * 下書き保存リクエスト
 */
export interface DraftSaveRequest {
  formData: Partial<GoalFormData>;
}

/**
 * 下書き保存レスポンス
 */
export interface DraftSaveResponse {
  success: boolean;
  draftId: string;
  savedAt: string;
}

/**
 * 目標作成リクエスト
 */
export interface GoalCreateRequest {
  formData: GoalFormData;
}

/**
 * 目標作成レスポンス
 */
export interface GoalCreateResponse {
  success: boolean;
  goalId: string;
  processingId: string; // AI処理のトラッキングID
}

/**
 * 下書き取得レスポンス
 */
export interface DraftGetResponse {
  success: boolean;
  draftData: Partial<GoalFormData> | null;
  savedAt: string | null;
}
