import { z } from 'zod';

/**
 * 振り返りフォームのバリデーションスキーマ
 */
export const reflectionFormSchema = z.object({
  summary: z
    .string()
    .min(1, '総括を入力してください')
    .max(5000, '総括は5000文字以内で入力してください'),
  regretfulActions: z
    .string()
    .max(2000, '惜しかったアクションは2000文字以内で入力してください')
    .optional(),
  slowProgressActions: z
    .string()
    .max(2000, '進まなかったアクションは2000文字以内で入力してください')
    .optional(),
  untouchedActions: z
    .string()
    .max(2000, '未着手アクションは2000文字以内で入力してください')
    .optional(),
});

export type ReflectionFormData = z.infer<typeof reflectionFormSchema>;
