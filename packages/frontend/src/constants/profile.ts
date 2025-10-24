/**
 * プロフィール入力画面の定数定義
 */

import type { SelectOption } from '../types/profile';

/**
 * 業種の選択肢
 */
export const INDUSTRY_OPTIONS: readonly SelectOption[] = [
  { value: '', label: '業種を選択してください' },
  { value: 'it-communication', label: 'IT・通信' },
  { value: 'manufacturing', label: '製造業' },
  { value: 'finance-insurance', label: '金融・保険' },
  { value: 'retail-wholesale', label: '小売・卸売' },
  { value: 'service', label: 'サービス業' },
  { value: 'medical-welfare', label: '医療・福祉' },
  { value: 'education', label: '教育' },
  { value: 'construction-real-estate', label: '建設・不動産' },
  { value: 'transportation-logistics', label: '運輸・物流' },
  { value: 'other', label: 'その他' },
] as const;

/**
 * 業種の選択肢（バリデーション用）
 */
export const INDUSTRIES = [
  { value: 'technology', label: 'IT・テクノロジー' },
  { value: 'finance', label: '金融・保険' },
  { value: 'healthcare', label: '医療・ヘルスケア' },
  { value: 'education', label: '教育・研修' },
  { value: 'manufacturing', label: '製造業' },
  { value: 'retail', label: '小売・流通' },
  { value: 'consulting', label: 'コンサルティング' },
  { value: 'media', label: 'メディア・広告' },
  { value: 'real_estate', label: '不動産' },
  { value: 'transportation', label: '運輸・物流' },
  { value: 'energy', label: 'エネルギー・インフラ' },
  { value: 'government', label: '公共・行政' },
  { value: 'nonprofit', label: '非営利団体' },
  { value: 'other', label: 'その他' },
] as const;

/**
 * 組織規模の選択肢
 */
export const COMPANY_SIZE_OPTIONS: readonly SelectOption[] = [
  { value: '', label: '組織規模を選択してください' },
  { value: '1-10', label: '1-10人' },
  { value: '11-50', label: '11-50人' },
  { value: '51-200', label: '51-200人' },
  { value: '201-500', label: '201-500人' },
  { value: '501-1000', label: '501-1000人' },
  { value: '1001+', label: '1001人以上' },
  { value: 'individual', label: '個人事業主' },
] as const;

/**
 * 組織規模の選択肢（バリデーション用）
 */
export const COMPANY_SIZES = [
  { value: 'startup', label: 'スタートアップ（1-10名）' },
  { value: 'small', label: '小規模企業（11-50名）' },
  { value: 'medium', label: '中規模企業（51-300名）' },
  { value: 'large', label: '大企業（301-1000名）' },
  { value: 'enterprise', label: '大手企業（1000名以上）' },
  { value: 'freelance', label: 'フリーランス・個人事業主' },
] as const;

/**
 * エラーメッセージ
 */
export const ERROR_MESSAGES = {
  /** 業種が未選択 */
  REQUIRED_INDUSTRY: '業種を選択してください',
  /** 組織規模が未選択 */
  REQUIRED_COMPANY_SIZE: '組織規模を選択してください',
  /** 職種が未入力 */
  REQUIRED_JOB_TITLE: '職種を入力してください',
  /** 職種が最大文字数を超過 */
  MAX_LENGTH_JOB_TITLE: '職種は100文字以内で入力してください',
  /** 役職が最大文字数を超過 */
  MAX_LENGTH_POSITION: '役職は100文字以内で入力してください',
  /** API エラー */
  API_ERROR: 'プロフィールの保存に失敗しました。もう一度お試しください。',
  /** ネットワークエラー */
  NETWORK_ERROR: 'ネットワークエラーが発生しました。接続を確認してください。',
  /** 認証エラー */
  UNAUTHORIZED: '認証エラーが発生しました。再度ログインしてください。',
  /** 予期しないエラー */
  UNKNOWN_ERROR: '予期しないエラーが発生しました。',
} as const;

/**
 * 成功メッセージ
 */
export const SUCCESS_MESSAGES = {
  /** プロフィール保存成功 */
  PROFILE_SAVED: 'プロフィールを保存しました',
} as const;

/**
 * プレースホルダー
 */
export const PLACEHOLDERS = {
  /** 職種のプレースホルダー */
  JOB_TITLE: '例：ソフトウェアエンジニア',
  /** 役職のプレースホルダー */
  POSITION: '例：マネージャー（任意）',
} as const;

/**
 * フィールドの最大文字数
 */
export const MAX_LENGTH = {
  /** 職種の最大文字数 */
  JOB_TITLE: 100,
  /** 役職の最大文字数 */
  POSITION: 100,
} as const;

/**
 * レスポンシブブレークポイント
 */
export const BREAKPOINTS = {
  /** モバイル */
  MOBILE: 768,
  /** タブレット */
  TABLET: 1024,
} as const;

/**
 * アニメーション設定
 */
export const ANIMATION = {
  /** エラーメッセージの自動非表示時間（ミリ秒） */
  ERROR_AUTO_HIDE_DELAY: 5000,
  /** 成功メッセージ表示後のリダイレクト遅延（ミリ秒） */
  SUCCESS_REDIRECT_DELAY: 1000,
} as const;

/**
 * APIエンドポイント
 */
export const API_ENDPOINTS = {
  /** プロフィール更新 */
  UPDATE_PROFILE: '/api/profile',
  /** プロフィール取得 */
  GET_PROFILE: '/api/profile',
} as const;

/**
 * ルートパス
 */
export const ROUTES = {
  /** ログイン画面 */
  LOGIN: '/login',
  /** TOP画面 */
  TOP: '/',
  /** プロフィール設定画面 */
  PROFILE_SETUP: '/profile/setup',
} as const;

/**
 * フォームフィールド名
 */
export const FORM_FIELDS = {
  /** 業種 */
  INDUSTRY: 'industry',
  /** 組織規模 */
  COMPANY_SIZE: 'companySize',
  /** 職種 */
  JOB_TITLE: 'jobTitle',
  /** 役職 */
  POSITION: 'position',
} as const;

/**
 * ARIA ラベル
 */
export const ARIA_LABELS = {
  /** 業種選択 */
  INDUSTRY_SELECT: '業種を選択',
  /** 組織規模選択 */
  COMPANY_SIZE_SELECT: '組織規模を選択',
  /** 職種入力 */
  JOB_TITLE_INPUT: '職種を入力',
  /** 役職入力 */
  POSITION_INPUT: '役職を入力（任意）',
  /** 送信ボタン */
  SUBMIT_BUTTON: 'プロフィールを保存して次へ',
  /** エラーメッセージ */
  ERROR_MESSAGE: 'エラーメッセージ',
  /** 成功メッセージ */
  SUCCESS_MESSAGE: '成功メッセージ',
} as const;

/**
 * テストID
 */
export const TEST_IDS = {
  /** プロフィール設定フォーム */
  PROFILE_SETUP_FORM: 'profile-setup-form',
  /** 業種選択 */
  INDUSTRY_SELECT: 'industry-select',
  /** 組織規模選択 */
  COMPANY_SIZE_SELECT: 'company-size-select',
  /** 職種入力 */
  JOB_TITLE_INPUT: 'job-title-input',
  /** 役職入力 */
  POSITION_INPUT: 'position-input',
  /** 送信ボタン */
  SUBMIT_BUTTON: 'submit-button',
  /** エラーメッセージ */
  ERROR_MESSAGE: 'error-message',
  /** 成功メッセージ */
  SUCCESS_MESSAGE: 'success-message',
  /** ローディングスピナー */
  LOADING_SPINNER: 'loading-spinner',
} as const;
