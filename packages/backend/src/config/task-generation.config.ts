/**
 * タスク生成API設定
 */

/**
 * タスク生成設定
 */
export const TASK_GENERATION_CONFIG = {
  // 推定時間範囲（分）
  estimatedTime: {
    min: 15, // 最小推定時間
    max: 120, // 最大推定時間
    targetMin: 30, // 目標最小時間
    targetMax: 60, // 目標最大時間
    default: 45, // デフォルト推定時間
  },

  // タスク数制限
  taskCount: {
    min: 1, // 最低タスク数
    max: 20, // 最大タスク数（1アクションあたり）
    recommended: 5, // 推奨タスク数
  },

  // 優先度閾値
  priority: {
    highThreshold: 0.7, // HIGH判定の閾値（0-1）
    lowThreshold: 0.3, // LOW判定の閾値（0-1）
    defaultPriority: 'MEDIUM' as const,
  },

  // 品質基準
  quality: {
    titleMaxLength: 50, // タイトル最大文字数
    descriptionMinLength: 20, // 説明最小文字数（警告）
    descriptionMaxLength: 200, // 説明最大文字数
    similarityThreshold: 0.8, // 重複判定の類似度閾値
  },

  // 依存関係設定
  dependencies: {
    maxDependencies: 3, // 1タスクあたりの最大依存数
    allowCircular: false, // 循環依存を許可しない
  },

  // レート制限
  rateLimit: {
    maxRequestsPerDay: 10, // 1日あたりの最大リクエスト数
    maxRequestsPerHour: 5, // 1時間あたりの最大リクエスト数
  },

  // タイムアウト設定
  timeout: {
    aiGeneration: 30000, // AI生成タイムアウト（ミリ秒）
    database: 10000, // データベース操作タイムアウト（ミリ秒）
    total: 60000, // 全体処理タイムアウト（ミリ秒）
  },

  // リトライ設定
  retry: {
    maxRetries: 3, // 最大リトライ回数
    baseDelay: 1000, // 基本遅延時間（ミリ秒）
    maxDelay: 10000, // 最大遅延時間（ミリ秒）
    backoffMultiplier: 2, // バックオフ乗数
  },
} as const;

/**
 * Lambda関数設定
 */
export const LAMBDA_CONFIG = {
  memorySize: 1024, // メモリサイズ（MB）
  timeout: 60, // タイムアウト（秒）
  reservedConcurrency: 10, // 予約済み同時実行数
} as const;

/**
 * CloudWatchアラーム設定
 */
export const ALARM_CONFIG = {
  errorRateThreshold: 0.05, // エラー率閾値（5%）
  processingTimeThreshold: 30, // 処理時間閾値（秒）
  evaluationPeriods: 2, // 評価期間
} as const;

/**
 * ログ設定
 */
export const LOG_CONFIG = {
  level: process.env.LOG_LEVEL || 'info',
  structuredLogging: true,
  includeRequestId: true,
  includeUserId: true,
  includeActionId: true,
  includeProcessingTime: true,
} as const;
