import { z } from 'zod';
import { ActionType } from '../types/mandala';

/**
 * アクションフォームのバリデーションスキーマ
 */
export const actionFormSchema = z.object({
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
  constraints: z.string().max(300, '制約事項は300文字以内で入力してください').optional(),
  type: z.nativeEnum(ActionType, {
    errorMap: () => ({ message: 'アクション種別を選択してください' }),
  }),
});

/**
 * 部分的なアクションフォームのバリデーションスキーマ
 */
export const partialActionFormSchema = z.object({
  title: z.string().max(100, 'タイトルは100文字以内で入力してください').optional(),
  description: z.string().max(500, '説明は500文字以内で入力してください').optional(),
  background: z.string().max(500, '背景は500文字以内で入力してください').optional(),
  constraints: z.string().max(300, '制約事項は300文字以内で入力してください').optional(),
  type: z.nativeEnum(ActionType).optional(),
});

/**
 * アクションフォームデータの型
 */
export type ActionFormData = z.infer<typeof actionFormSchema>;

/**
 * 部分的なアクションフォームデータの型
 */
export type PartialActionFormData = z.infer<typeof partialActionFormSchema>;

/**
 * バリデーション結果の型
 */
export interface ActionValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

/**
 * 部分的なアクションフォームデータのバリデーション
 */
export const validatePartialActionForm = (data: PartialActionFormData): ActionValidationResult => {
  try {
    partialActionFormSchema.parse(data);
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
 * 完全なアクションフォームデータのバリデーション
 */
export const validateActionForm = (data: ActionFormData): ActionValidationResult => {
  try {
    actionFormSchema.parse(data);
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
 * アクション種別のバリデーション
 */
export const validateActionType = (type: string): ActionValidationResult => {
  if (!Object.values(ActionType).includes(type as ActionType)) {
    return {
      isValid: false,
      errors: { type: '有効なアクション種別を選択してください' },
    };
  }
  return { isValid: true, errors: {} };
};

/**
 * サブ目標間制約チェック
 * 同一サブ目標内でのアクションタイトルの重複をチェック
 */
export const validateActionConstraints = (
  actionData: ActionFormData,
  existingActions: Array<{ title: string; id: string }>,
  currentActionId?: string
): ActionValidationResult => {
  const errors: Record<string, string> = {};

  // タイトルの重複チェック
  const duplicateAction = existingActions.find(
    action =>
      action.title.toLowerCase() === actionData.title.toLowerCase() && action.id !== currentActionId
  );

  if (duplicateAction) {
    errors.title = 'このタイトルは既に使用されています';
  }

  // アクション種別の制約チェック
  if (actionData.type === ActionType.HABIT) {
    // 習慣アクションの場合の特別な制約があれば追加
    if (actionData.description.length < 20) {
      errors.description = '習慣アクションの説明は20文字以上で入力してください';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * アクションフォームの初期データを生成
 */
export const createInitialActionFormData = (
  subGoalId: string,
  position: number,
  type: ActionType = ActionType.EXECUTION
): Partial<ActionFormData> => {
  return {
    title: '',
    description: '',
    background: '',
    constraints: '',
    type,
  };
};

/**
 * アクションフォームデータをAPIリクエスト形式に変換
 */
export const transformActionFormDataForAPI = (
  formData: ActionFormData,
  subGoalId: string,
  position: number
) => {
  return {
    sub_goal_id: subGoalId,
    title: formData.title.trim(),
    description: formData.description.trim(),
    background: formData.background.trim(),
    constraints: formData.constraints?.trim() || null,
    type: formData.type,
    position,
    progress: 0,
  };
};

/**
 * APIレスポンスからアクションフォームデータに変換
 */
export const transformAPIResponseToActionFormData = (apiData: {
  title: string;
  description: string;
  background: string;
  constraints?: string | null;
  type: ActionType;
}): ActionFormData => {
  return {
    title: apiData.title,
    description: apiData.description,
    background: apiData.background,
    constraints: apiData.constraints || '',
    type: apiData.type,
  };
};
