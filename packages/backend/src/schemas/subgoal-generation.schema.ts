/**
 * サブ目標生成APIのバリデーションスキーマ
 */

import { z } from 'zod';

/**
 * サブ目標生成リクエストのZodスキーマ
 */
export const SubGoalGenerationRequestSchema = z.object({
  goalId: z.string().uuid().optional(),
  title: z
    .string()
    .min(1, '目標タイトルは必須です')
    .max(200, '目標タイトルは200文字以内である必要があります'),
  description: z
    .string()
    .min(1, '目標説明は必須です')
    .max(2000, '目標説明は2000文字以内である必要があります'),
  deadline: z
    .string()
    .datetime({ message: '達成期限は有効な日時形式である必要があります' })
    .refine(date => new Date(date) > new Date(), {
      message: '達成期限は未来の日付である必要があります',
    }),
  background: z
    .string()
    .min(1, '背景情報は必須です')
    .max(1000, '背景情報は1000文字以内である必要があります'),
  constraints: z.string().max(1000, '制約事項は1000文字以内である必要があります').optional(),
});

/**
 * サブ目標出力のZodスキーマ
 */
export const SubGoalOutputSchema = z.object({
  id: z.string().uuid(),
  title: z.string().max(30, 'サブ目標タイトルは30文字以内である必要があります'),
  description: z
    .string()
    .min(50, 'サブ目標説明は50文字以上である必要があります')
    .max(200, 'サブ目標説明は200文字以内である必要があります'),
  background: z.string().max(100, 'サブ目標背景は100文字以内である必要があります'),
  position: z.number().int().min(0).max(7),
  progress: z.number().int().min(0).max(100),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

/**
 * サブ目標配列のZodスキーマ（必ず8個）
 */
export const SubGoalsArraySchema = z
  .array(SubGoalOutputSchema)
  .length(8, 'サブ目標は必ず8個である必要があります');

/**
 * バリデーション定数
 */
export const VALIDATION_RULES = {
  title: {
    required: true,
    minLength: 1,
    maxLength: 200,
  },
  description: {
    required: true,
    minLength: 1,
    maxLength: 2000,
  },
  deadline: {
    required: true,
    format: 'ISO8601',
    minDate: 'now',
  },
  background: {
    required: true,
    minLength: 1,
    maxLength: 1000,
  },
  constraints: {
    required: false,
    maxLength: 1000,
  },
} as const;

/**
 * 品質基準定数
 */
export const QUALITY_CRITERIA = {
  count: 8, // 必ず8個
  titleMaxLength: 30,
  descriptionMinLength: 50,
  descriptionMaxLength: 200,
  backgroundMaxLength: 100,
  allowDuplicateTitles: false,
} as const;
