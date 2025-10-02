import { z } from 'zod';

/**
 * サブ目標フォームのスキーマ
 */
export const subGoalFormSchema = z.object({
  title: z
    .string()
    .min(1, 'タイトルは必須です')
    .max(100, 'タイトルは100文字以内で入力してください'),
  description: z
    .string()
    .min(10, '説明は10文字以上で入力してください')
    .max(500, '説明は500文字以内で入力してください'),
  background: z
    .string()
    .min(10, '背景は10文字以上で入力してください')
    .max(500, '背景は500文字以内で入力してください'),
  constraints: z
    .string()
    .max(300, '制約事項は300文字以内で入力してください')
    .optional()
    .or(z.literal('')),
});

/**
 * サブ目標フォームデータの型
 */
export type SubGoalFormData = z.infer<typeof subGoalFormSchema>;

/**
 * 部分的なサブ目標フォームデータの型
 */
export type PartialSubGoalFormData = Partial<SubGoalFormData>;

/**
 * サブ目標フォームのバリデーション関数
 */
export const validateSubGoalForm = (data: PartialSubGoalFormData) => {
  try {
    subGoalFormSchema.parse(data);
    return { isValid: true, errors: {} };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string> = {};
      error.errors.forEach(err => {
        if (err.path.length > 0) {
          errors[err.path[0] as string] = err.message;
        }
      });
      return { isValid: false, errors };
    }
    return { isValid: false, errors: { general: 'バリデーションエラーが発生しました' } };
  }
};

/**
 * 部分的なサブ目標フォームのバリデーション関数
 */
export const validatePartialSubGoalForm = (data: PartialSubGoalFormData) => {
  const errors: Record<string, string> = {};

  // タイトルのバリデーション
  if (data.title !== undefined) {
    if (data.title.length === 0) {
      errors.title = 'タイトルは必須です';
    } else if (data.title.length > 100) {
      errors.title = 'タイトルは100文字以内で入力してください';
    }
  }

  // 説明のバリデーション
  if (data.description !== undefined) {
    if (data.description.length > 0 && data.description.length < 10) {
      errors.description = '説明は10文字以上で入力してください';
    } else if (data.description.length > 500) {
      errors.description = '説明は500文字以内で入力してください';
    }
  }

  // 背景のバリデーション
  if (data.background !== undefined) {
    if (data.background.length > 0 && data.background.length < 10) {
      errors.background = '背景は10文字以上で入力してください';
    } else if (data.background.length > 500) {
      errors.background = '背景は500文字以内で入力してください';
    }
  }

  // 制約事項のバリデーション
  if (data.constraints !== undefined && data.constraints.length > 300) {
    errors.constraints = '制約事項は300文字以内で入力してください';
  }

  return { isValid: Object.keys(errors).length === 0, errors };
};
