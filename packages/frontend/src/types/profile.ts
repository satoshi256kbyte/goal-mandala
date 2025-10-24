/**
 * プロフィール入力画面の型定義
 */

/**
 * プロフィールフォームデータ
 */
export interface ProfileFormData {
  /** 業種 */
  industry: string;
  /** 組織規模 */
  companySize: string;
  /** 職種 */
  jobTitle: string;
  /** 役職（任意） */
  position: string;
}

/**
 * プロフィールフォームエラー
 */
export interface ProfileFormErrors {
  /** 業種のエラーメッセージ */
  industry?: string;
  /** 組織規模のエラーメッセージ */
  companySize?: string;
  /** 職種のエラーメッセージ */
  jobTitle?: string;
  /** 役職のエラーメッセージ */
  position?: string;
}

/**
 * バリデーション結果
 */
export interface ValidationResult {
  /** バリデーション成功フラグ */
  isValid: boolean;
  /** エラー情報 */
  errors: ProfileFormErrors;
}

/**
 * プロフィールフォームのタッチ状態
 */
export interface ProfileFormTouched {
  /** 業種フィールドがタッチされたか */
  industry: boolean;
  /** 組織規模フィールドがタッチされたか */
  companySize: boolean;
  /** 職種フィールドがタッチされたか */
  jobTitle: boolean;
  /** 役職フィールドがタッチされたか */
  position: boolean;
}

/**
 * 選択肢の型
 */
export interface SelectOption {
  /** 選択肢の値 */
  value: string;
  /** 選択肢のラベル */
  label: string;
}

/**
 * プロフィール更新APIリクエスト
 */
export interface UpdateProfileRequest {
  /** 業種 */
  industry: string;
  /** 組織規模 */
  company_size: string;
  /** 職種 */
  job_title: string;
  /** 役職（任意） */
  position?: string;
}

/**
 * プロフィール更新APIレスポンス（成功）
 */
export interface UpdateProfileResponse {
  /** 成功フラグ */
  success: true;
  /** プロフィールデータ */
  data: {
    /** ユーザーID */
    id: string;
    /** メールアドレス */
    email: string;
    /** 名前 */
    name: string;
    /** 業種 */
    industry: string;
    /** 組織規模 */
    company_size: string;
    /** 職種 */
    job_title: string;
    /** 役職 */
    position: string | null;
    /** 作成日時 */
    created_at: string;
    /** 更新日時 */
    updated_at: string;
  };
}

/**
 * APIエラーレスポンス
 */
export interface ErrorResponse {
  /** 成功フラグ */
  success: false;
  /** エラー情報 */
  error: {
    /** エラーコード */
    code: string;
    /** エラーメッセージ */
    message: string;
  };
}

/**
 * useProfileFormフックのオプション
 */
export interface UseProfileFormOptions {
  /** 成功時のコールバック */
  onSuccess?: () => void;
  /** エラー時のコールバック */
  onError?: (error: Error) => void;
}

/**
 * useProfileFormフックの戻り値
 */
export interface UseProfileFormReturn {
  // 状態
  /** フォームデータ */
  formData: ProfileFormData;
  /** エラー情報 */
  errors: Record<string, string>;
  /** タッチ状態 */
  touched: Record<string, boolean>;
  /** ローディング状態 */
  isLoading: boolean;
  /** 送信中状態 */
  isSubmitting: boolean;
  /** エラーメッセージ */
  error: string | null;
  /** 成功メッセージ */
  successMessage: string | null;

  // メソッド
  /** フィールド値を設定 */
  setFieldValue: (field: string, value: string) => void;
  /** フィールドのタッチ状態を設定 */
  setFieldTouched: (field: string, touched: boolean) => void;
  /** フィールドのバリデーション */
  validateField: (field: string) => string | undefined;
  /** フォーム全体のバリデーション */
  validateForm: () => boolean;
  /** フォーム送信 */
  handleSubmit: () => Promise<void>;
  /** フォームリセット */
  resetForm: () => void;
  /** エラークリア */
  clearError: () => void;
  /** 成功メッセージクリア */
  clearSuccess: () => void;
}

/**
 * IndustrySelectコンポーネントのProps
 */
export interface IndustrySelectProps {
  /** 選択値 */
  value: string;
  /** 変更時のコールバック */
  onChange: (value: string) => void;
  /** フォーカス離脱時のコールバック */
  onBlur: () => void;
  /** エラーメッセージ */
  error?: string;
  /** 無効化フラグ */
  disabled?: boolean;
  /** 必須フラグ */
  required?: boolean;
}

/**
 * CompanySizeSelectコンポーネントのProps
 */
export interface CompanySizeSelectProps {
  /** 選択値 */
  value: string;
  /** 変更時のコールバック */
  onChange: (value: string) => void;
  /** フォーカス離脱時のコールバック */
  onBlur: () => void;
  /** エラーメッセージ */
  error?: string;
  /** 無効化フラグ */
  disabled?: boolean;
  /** 必須フラグ */
  required?: boolean;
}

/**
 * JobTitleInputコンポーネントのProps
 */
export interface JobTitleInputProps {
  /** 入力値 */
  value: string;
  /** 変更時のコールバック */
  onChange: (value: string) => void;
  /** フォーカス離脱時のコールバック */
  onBlur: () => void;
  /** エラーメッセージ */
  error?: string;
  /** 無効化フラグ */
  disabled?: boolean;
  /** 必須フラグ */
  required?: boolean;
  /** 最大文字数 */
  maxLength?: number;
}

/**
 * PositionInputコンポーネントのProps
 */
export interface PositionInputProps {
  /** 入力値 */
  value: string;
  /** 変更時のコールバック */
  onChange: (value: string) => void;
  /** フォーカス離脱時のコールバック */
  onBlur: () => void;
  /** エラーメッセージ */
  error?: string;
  /** 無効化フラグ */
  disabled?: boolean;
  /** 必須フラグ */
  required?: boolean;
  /** 最大文字数 */
  maxLength?: number;
}

/**
 * ProfileSetupFormコンポーネントのProps
 */
export interface ProfileSetupFormProps {
  /** 送信時のコールバック */
  onSubmit: (data: ProfileFormData) => Promise<void>;
  /** ローディング状態 */
  isLoading?: boolean;
  /** エラーメッセージ */
  error?: string | null;
  /** CSSクラス名 */
  className?: string;
}

/**
 * ProfileSetupPageコンポーネントのProps
 */
export interface ProfileSetupPageProps {
  /** CSSクラス名 */
  className?: string;
}

/**
 * ページの状態
 */
export interface PageState {
  /** ローディング状態 */
  isLoading: boolean;
  /** エラーメッセージ */
  error: string | null;
  /** 成功メッセージ */
  successMessage: string | null;
  /** 初期化完了フラグ */
  isInitialized: boolean;
}
