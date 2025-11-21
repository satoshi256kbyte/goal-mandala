import { z } from 'zod';

/**
 * タスク管理機能用の入力検証スキーマ
 */

// 基本的な文字列検証（XSS対策）
const sanitizedString = (maxLength: number = 255) =>
  z
    .string()
    .trim()
    .max(maxLength, `最大${maxLength}文字まで入力可能です`)
    .refine(
      value => !/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi.test(value),
      'スクリプトタグは使用できません'
    )
    .refine(value => !/javascript:/gi.test(value), 'JavaScriptプロトコルは使用できません')
    .refine(value => !/on\w+\s*=/gi.test(value), 'イベントハンドラーは使用できません');

// UUID検証
const uuidSchema = z.string().uuid('有効なUUID形式で入力してください');

// タスク状態の検証
const taskStatusSchema = z.enum(['not_started', 'in_progress', 'completed', 'skipped'], {
  errorMap: () => ({ message: '有効なタスク状態を選択してください' }),
});

// 日付検証
const dateSchema = z
  .string()
  .datetime('有効な日時形式で入力してください')
  .or(z.date())
  .transform(val => (typeof val === 'string' ? new Date(val) : val))
  .refine(date => date > new Date('1900-01-01'), '1900年以降の日付を入力してください')
  .refine(date => date < new Date('2100-01-01'), '2100年以前の日付を入力してください');

// タスク一覧取得のクエリパラメータ検証
export const getTasksQuerySchema = z
  .object({
    status: z
      .string()
      .optional()
      .transform(val => val?.split(','))
      .pipe(z.array(taskStatusSchema).optional()),
    deadlineRange: z.enum(['today', 'this_week', 'overdue', 'custom']).optional(),
    customDeadlineStart: dateSchema.optional(),
    customDeadlineEnd: dateSchema.optional(),
    actionIds: z
      .string()
      .optional()
      .transform(val => val?.split(','))
      .pipe(z.array(uuidSchema).optional()),
    search: sanitizedString(100).optional(),
    page: z
      .string()
      .optional()
      .transform(val => (val ? parseInt(val, 10) : 1))
      .pipe(z.number().int().min(1).max(1000)),
    pageSize: z
      .string()
      .optional()
      .transform(val => (val ? parseInt(val, 10) : 20))
      .pipe(z.number().int().min(1).max(100)),
  })
  .refine(
    data => {
      if (data.deadlineRange === 'custom') {
        return data.customDeadlineStart && data.customDeadlineEnd;
      }
      return true;
    },
    {
      message: 'カスタム期間を選択した場合は開始日と終了日を指定してください',
      path: ['deadlineRange'],
    }
  );

// タスク詳細取得のパラメータ検証
export const getTaskByIdParamsSchema = z.object({
  id: uuidSchema,
});

// タスク状態更新のリクエストボディ検証
export const updateTaskStatusBodySchema = z.object({
  status: taskStatusSchema,
});

// タスクノート追加のリクエストボディ検証
export const addTaskNoteBodySchema = z.object({
  content: sanitizedString(5000)
    .min(1, 'ノート内容を入力してください')
    .refine(value => value.trim().length > 0, 'ノート内容を入力してください'),
});

// タスクノート更新のリクエストボディ検証
export const updateTaskNoteBodySchema = z.object({
  content: sanitizedString(5000)
    .min(1, 'ノート内容を入力してください')
    .refine(value => value.trim().length > 0, 'ノート内容を入力してください'),
});

// タスクノート削除のパラメータ検証
export const deleteTaskNoteParamsSchema = z.object({
  id: uuidSchema,
  noteId: uuidSchema,
});

// 一括状態更新のリクエストボディ検証
export const bulkUpdateStatusBodySchema = z.object({
  taskIds: z
    .array(uuidSchema)
    .min(1, '最低1つのタスクを選択してください')
    .max(100, '一度に更新できるタスクは100個までです'),
  status: taskStatusSchema,
});

// 一括削除のリクエストボディ検証
export const bulkDeleteBodySchema = z.object({
  taskIds: z
    .array(uuidSchema)
    .min(1, '最低1つのタスクを選択してください')
    .max(100, '一度に削除できるタスクは100個までです'),
});

// 保存済みビュー作成のリクエストボディ検証
export const createSavedViewBodySchema = z.object({
  name: sanitizedString(100)
    .min(1, 'ビュー名を入力してください')
    .refine(value => value.trim().length > 0, 'ビュー名を入力してください'),
  filters: z.object({
    statuses: z.array(taskStatusSchema).optional(),
    deadlineRange: z.enum(['today', 'this_week', 'overdue', 'custom']).optional(),
    customDeadlineStart: dateSchema.optional(),
    customDeadlineEnd: dateSchema.optional(),
    actionIds: z.array(uuidSchema).optional(),
  }),
  searchQuery: sanitizedString(100).optional(),
});

// 保存済みビュー削除のパラメータ検証
export const deleteSavedViewParamsSchema = z.object({
  id: uuidSchema,
});

// セキュリティ関連の検証ヘルパー
export const securityValidation = {
  /**
   * SQLインジェクション対策の検証
   */
  validateSqlInjection: (value: string): boolean => {
    const sqlInjectionPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
      /(--|\/\*|\*\/|;|'|")/g,
      /(\b(OR|AND)\b.*=.*)/gi,
    ];

    return !sqlInjectionPatterns.some(pattern => pattern.test(value));
  },

  /**
   * XSS対策の検証
   */
  validateXSS: (value: string): boolean => {
    const xssPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
      /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
      /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi,
    ];

    return !xssPatterns.some(pattern => pattern.test(value));
  },

  /**
   * パストラバーサル対策の検証
   */
  validatePathTraversal: (value: string): boolean => {
    const pathTraversalPatterns = [/\.\./g, /\.\\/g, /\.\/\./g, /\\\.\./g];

    return !pathTraversalPatterns.some(pattern => pattern.test(value));
  },

  /**
   * コマンドインジェクション対策の検証
   */
  validateCommandInjection: (value: string): boolean => {
    const commandInjectionPatterns = [
      /[;&|`$(){}[\]]/g,
      /\b(cat|ls|pwd|whoami|id|uname|ps|netstat|ifconfig|ping|curl|wget)\b/gi,
    ];

    return !commandInjectionPatterns.some(pattern => pattern.test(value));
  },
};

// 包括的なセキュリティ検証
export const comprehensiveSecurityValidation = z
  .string()
  .refine(
    value => securityValidation.validateSqlInjection(value),
    'SQLインジェクションの可能性がある文字列は使用できません'
  )
  .refine(value => securityValidation.validateXSS(value), 'XSSの可能性がある文字列は使用できません')
  .refine(
    value => securityValidation.validatePathTraversal(value),
    'パストラバーサルの可能性がある文字列は使用できません'
  )
  .refine(
    value => securityValidation.validateCommandInjection(value),
    'コマンドインジェクションの可能性がある文字列は使用できません'
  );

// レート制限用の検証
export const rateLimitValidation = {
  /**
   * リクエスト頻度の検証
   */
  validateRequestFrequency: (
    requests: number,
    timeWindow: number,
    maxRequests: number
  ): boolean => {
    return requests <= maxRequests;
  },

  /**
   * 同時リクエスト数の検証
   */
  validateConcurrentRequests: (currentRequests: number, maxConcurrentRequests: number): boolean => {
    return currentRequests <= maxConcurrentRequests;
  },
};

// CSRF対策用のトークン検証
export const csrfTokenSchema = z
  .string()
  .min(32, 'CSRFトークンが無効です')
  .max(128, 'CSRFトークンが無効です')
  .regex(/^[a-zA-Z0-9+/=]+$/, 'CSRFトークンの形式が無効です');

// 型定義のエクスポート
export type GetTasksQuery = z.infer<typeof getTasksQuerySchema>;
export type GetTaskByIdParams = z.infer<typeof getTaskByIdParamsSchema>;
export type UpdateTaskStatusBody = z.infer<typeof updateTaskStatusBodySchema>;
export type AddTaskNoteBody = z.infer<typeof addTaskNoteBodySchema>;
export type UpdateTaskNoteBody = z.infer<typeof updateTaskNoteBodySchema>;
export type DeleteTaskNoteParams = z.infer<typeof deleteTaskNoteParamsSchema>;
export type BulkUpdateStatusBody = z.infer<typeof bulkUpdateStatusBodySchema>;
export type BulkDeleteBody = z.infer<typeof bulkDeleteBodySchema>;
export type CreateSavedViewBody = z.infer<typeof createSavedViewBodySchema>;
export type DeleteSavedViewParams = z.infer<typeof deleteSavedViewParamsSchema>;
