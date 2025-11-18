import { z } from 'zod';

// 目標フォームのZodスキーマ
export const goalFormSchema = z.object({
  title: z
    .string()
    .min(1, '目標タイトルは必須です')
    .max(100, '目標タイトルは100文字以内で入力してください'),
  description: z
    .string()
    .min(1, '目標説明は必須です')
    .max(1000, '目標説明は1000文字以内で入力してください'),
  deadline: z
    .date({
      required_error: '達成期限は必須です',
      invalid_type_error: '有効な日付を入力してください',
    })
    .refine(date => date > new Date(), {
      message: '達成期限は未来の日付を設定してください',
    }),
  background: z
    .string()
    .min(1, '背景・理由は必須です')
    .max(1000, '背景・理由は1000文字以内で入力してください'),
  constraints: z.string().max(1000, '制約事項は1000文字以内で入力してください').optional(),
});

// 部分的な目標フォームのスキーマ（下書き保存用）
export const partialGoalFormSchema = goalFormSchema.partial();

// 型定義
export type GoalFormData = z.infer<typeof goalFormSchema>;
export type PartialGoalFormData = z.infer<typeof partialGoalFormSchema>;

// バリデーション関数
export const validateGoalForm = (data: unknown): GoalFormData => {
  return goalFormSchema.parse(data);
};

export const validatePartialGoalForm = (data: unknown): PartialGoalFormData => {
  return partialGoalFormSchema.parse(data);
};
