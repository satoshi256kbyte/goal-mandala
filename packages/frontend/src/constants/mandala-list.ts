/**
 * マンダラチャート一覧画面の定数定義
 */

import { GoalStatus, SortOption } from '../types/mandala-list';

/**
 * ページネーション設定
 */
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_ITEMS_PER_PAGE: 20,
  MAX_ITEMS_PER_PAGE: 100,
} as const;

/**
 * ソート選択肢
 */
export const SORT_OPTIONS: Array<{ value: SortOption; label: string }> = [
  { value: 'created_at_desc', label: '作成日時（新しい順）' },
  { value: 'created_at_asc', label: '作成日時（古い順）' },
  { value: 'updated_at_desc', label: '更新日時（新しい順）' },
  { value: 'updated_at_asc', label: '更新日時（古い順）' },
  { value: 'deadline_asc', label: '達成期限（近い順）' },
  { value: 'deadline_desc', label: '達成期限（遠い順）' },
  { value: 'progress_desc', label: '進捗率（高い順）' },
  { value: 'progress_asc', label: '進捗率（低い順）' },
];

/**
 * フィルター選択肢
 */
export const FILTER_OPTIONS: Array<{ value: GoalStatus | 'all'; label: string }> = [
  { value: 'all', label: '全て' },
  { value: GoalStatus.DRAFT, label: '下書き' },
  { value: GoalStatus.ACTIVE, label: '活動中' },
  { value: GoalStatus.COMPLETED, label: '完了' },
  { value: GoalStatus.PAUSED, label: '一時停止' },
  { value: GoalStatus.CANCELLED, label: '中止' },
];

/**
 * 状態バッジの設定
 */
export const STATUS_BADGE_CONFIG: Record<
  GoalStatus,
  {
    label: string;
    className: string;
  }
> = {
  [GoalStatus.DRAFT]: {
    label: '下書き',
    className: 'bg-gray-100 text-gray-800',
  },
  [GoalStatus.ACTIVE]: {
    label: '活動中',
    className: 'bg-blue-100 text-blue-800',
  },
  [GoalStatus.COMPLETED]: {
    label: '完了',
    className: 'bg-green-100 text-green-800',
  },
  [GoalStatus.PAUSED]: {
    label: '一時停止',
    className: 'bg-orange-100 text-orange-800',
  },
  [GoalStatus.CANCELLED]: {
    label: '中止',
    className: 'bg-red-100 text-red-800',
  },
};

/**
 * 進捗率の色分け設定
 */
export const PROGRESS_COLOR_CONFIG = {
  LOW: {
    threshold: 30,
    className: 'stroke-red-500',
    label: '低',
  },
  MEDIUM: {
    threshold: 70,
    className: 'stroke-yellow-500',
    label: '中',
  },
  HIGH: {
    threshold: 100,
    className: 'stroke-green-500',
    label: '高',
  },
} as const;

/**
 * 進捗率の色を取得
 */
export const getProgressColor = (progress: number): string => {
  if (progress <= PROGRESS_COLOR_CONFIG.LOW.threshold) {
    return PROGRESS_COLOR_CONFIG.LOW.className;
  }
  if (progress <= PROGRESS_COLOR_CONFIG.MEDIUM.threshold) {
    return PROGRESS_COLOR_CONFIG.MEDIUM.className;
  }
  return PROGRESS_COLOR_CONFIG.HIGH.className;
};

/**
 * エラーメッセージ
 */
export const MANDALA_LIST_ERROR_MESSAGES = {
  FETCH_ERROR: 'データの取得に失敗しました。もう一度お試しください。',
  NETWORK_ERROR: 'ネットワークエラーが発生しました。接続を確認してください。',
  UNAUTHORIZED: '認証エラーが発生しました。再度ログインしてください。',
  NO_RESULTS: '該当するマンダラチャートが見つかりませんでした。',
  UNKNOWN_ERROR: '予期しないエラーが発生しました。',
} as const;

/**
 * 空状態メッセージ
 */
export const EMPTY_STATE_MESSAGES = {
  NO_MANDALAS: {
    title: 'まだマンダラチャートがありません',
    description: '新しい目標を作成して、マンダラチャートを始めましょう',
    actionLabel: '新規作成',
  },
  NO_SEARCH_RESULTS: {
    title: '該当するマンダラチャートが見つかりませんでした',
    description: '検索条件を変更してもう一度お試しください',
    actionLabel: '検索をクリア',
  },
} as const;

/**
 * プレースホルダー
 */
export const MANDALA_LIST_PLACEHOLDERS = {
  SEARCH: '目標を検索...',
} as const;

/**
 * レスポンシブブレークポイント
 */
export const MANDALA_LIST_BREAKPOINTS = {
  MOBILE: 768, // < 768px
  TABLET: 1024, // 768px - 1024px
  DESKTOP: 1024, // > 1024px
} as const;

/**
 * デバウンス時間（ミリ秒）
 */
export const DEBOUNCE_DELAY = {
  SEARCH: 300,
  FILTER: 100,
} as const;

/**
 * アニメーション設定
 */
export const MANDALA_LIST_ANIMATION = {
  TRANSITION_DURATION: 200, // ミリ秒
  HOVER_SCALE: 1.02,
} as const;

/**
 * アクセシビリティ設定
 */
export const ACCESSIBILITY = {
  MIN_TOUCH_TARGET_SIZE: 44, // px
  FOCUS_RING_WIDTH: 2, // px
} as const;

/**
 * API設定
 */
export const API = {
  GOALS_ENDPOINT: '/api/goals',
  REQUEST_TIMEOUT: 30000, // 30秒
} as const;

/**
 * パフォーマンス設定
 */
export const PERFORMANCE = {
  MAX_LOAD_TIME: 3000, // 3秒
  MAX_SEARCH_TIME: 500, // 500ms
  MAX_PAGINATION_TIME: 1000, // 1秒
} as const;
