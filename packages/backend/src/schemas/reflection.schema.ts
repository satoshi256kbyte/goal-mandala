import { z } from 'zod';

/**
 * 振り返り作成スキーマ
 *
 * 新しい振り返りを作成する際の入力データを検証します。
 */
export const createReflectionSchema = z.object({
  goalId: z
    .string({ required_error: '目標IDは必須です' })
    .uuid({ message: '目標IDの形式が正しくありません' }),

  summary: z
    .string({ required_error: '総括は必須です' })
    .min(1, { message: '総括は必須です' })
    .max(5000, { message: '総括は5000文字以内で入力してください' }),

  regretfulActions: z
    .string()
    .max(2000, { message: '惜しかったアクションは2000文字以内で入力してください' })
    .optional(),

  slowProgressActions: z
    .string()
    .max(2000, { message: '進まなかったアクションは2000文字以内で入力してください' })
    .optional(),

  untouchedActions: z
    .string()
    .max(2000, { message: '未着手アクションは2000文字以内で入力してください' })
    .optional(),
});

/**
 * 振り返り更新スキーマ
 *
 * 既存の振り返りを更新する際の入力データを検証します。
 * 全てのフィールドがオプショナルです。
 */
export const updateReflectionSchema = z
  .object({
    summary: z
      .string()
      .min(1, { message: '総括は必須です' })
      .max(5000, { message: '総括は5000文字以内で入力してください' })
      .optional(),

    regretfulActions: z
      .string()
      .max(2000, { message: '惜しかったアクションは2000文字以内で入力してください' })
      .optional(),

    slowProgressActions: z
      .string()
      .max(2000, { message: '進まなかったアクションは2000文字以内で入力してください' })
      .optional(),

    untouchedActions: z
      .string()
      .max(2000, { message: '未着手アクションは2000文字以内で入力してください' })
      .optional(),
  })
  .refine(data => Object.keys(data).length > 0, {
    message: '少なくとも1つのフィールドを更新してください',
  });

/**
 * 型定義
 */
export type CreateReflectionInput = z.infer<typeof createReflectionSchema>;
export type UpdateReflectionInput = z.infer<typeof updateReflectionSchema>;
