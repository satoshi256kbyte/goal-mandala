/**
 * タスク生成APIのバリデーションスキーマと定数
 */

import { z } from 'zod';

/**
 * タスク生成リクエストのZodスキーマ
 */
export const TaskGenerationRequestSchema = z.object({
  actionId: z.string().uuid({
    message: 'アクションIDは有効なUUID形式である必要があります',
  }),
  regenerate: z.boolean().optional().default(false),
});

/**
 * タスク品質基準
 */
export const QUALITY_CRITERIA = {
  minCount: 1, // 最低1個以上
  titleMaxLength: 50, // タイトル最大文字数
  descriptionMinLength: 20, // 説明最小文字数（警告レベル）
  descriptionMaxLength: 200, // 説明最大文字数
  estimatedMinutesMin: 15, // 推定時間最小値（分）
  estimatedMinutesMax: 120, // 推定時間最大値（分）
  allowDuplicateTitles: false, // タイトル重複を許可しない
  similarityThreshold: 0.8, // 類似度80%以上で重複とみなす
  abstractnessKeywords: [
    // 抽象的すぎるタスクを検出するキーワード
    '検討する',
    '考える',
    '理解する',
    '把握する',
    '確認する',
  ],
} as const;

/**
 * タスク優先度判定ルール
 */
export const PRIORITY_RULES = {
  highPriorityKeywords: [
    // 優先度HIGHを示すキーワード
    '前提',
    '必須',
    '重要',
    '基礎',
    '基本',
    '最初',
    '初期',
  ],
  lowPriorityKeywords: [
    // 優先度LOWを示すキーワード
    '補助',
    '追加',
    'オプション',
    '任意',
    '余裕があれば',
  ],
  defaultPriority: 'MEDIUM' as const,
} as const;

/**
 * タスク粒度設定
 */
export const TASK_GRANULARITY = {
  targetMinutesMin: 30, // 目標所要時間最小値（分）
  targetMinutesMax: 60, // 目標所要時間最大値（分）
  defaultEstimatedMinutes: 45, // デフォルト推定時間（分）
} as const;
