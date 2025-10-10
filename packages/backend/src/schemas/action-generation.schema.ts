/**
 * アクション生成APIのバリデーションスキーマと定数
 */

import { z } from 'zod';

/**
 * アクション生成リクエストのZodスキーマ
 */
export const ActionGenerationRequestSchema = z.object({
  subGoalId: z.string().uuid({
    message: 'サブ目標IDは有効なUUID形式である必要があります',
  }),
  regenerate: z.boolean().optional().default(false),
});

/**
 * アクション品質基準
 */
export const QUALITY_CRITERIA = {
  count: 8, // 必ず8個
  titleMaxLength: 50, // タイトル最大文字数
  descriptionMinLength: 100, // 説明最小文字数
  descriptionMaxLength: 200, // 説明最大文字数
  backgroundMaxLength: 100, // 背景最大文字数
  allowDuplicateTitles: false, // タイトル重複を許可しない
  similarityThreshold: 0.8, // 類似度80%以上で重複とみなす
} as const;

/**
 * アクション種別判定ルール
 */
export const CLASSIFICATION_RULES = {
  habitKeywords: [
    '毎日',
    '毎週',
    '継続',
    '習慣',
    '定期的',
    '日々',
    '常に',
    'ルーティン',
    '繰り返し',
  ],
  executionKeywords: ['作成', '実装', '完成', '達成', '登壇', '発表', '提出', '公開', 'リリース'],
  defaultType: 'execution' as const,
} as const;
