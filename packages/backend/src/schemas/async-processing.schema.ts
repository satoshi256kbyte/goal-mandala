/**
 * 非同期処理APIのバリデーションスキーマ
 */

import { z } from 'zod';

/**
 * 処理タイプのZodスキーマ
 */
export const ProcessingTypeSchema = z.enum([
  'SUBGOAL_GENERATION',
  'ACTION_GENERATION',
  'TASK_GENERATION',
]);

/**
 * 処理ステータスのZodスキーマ
 */
export const ProcessingStatusSchema = z.enum([
  'PENDING',
  'PROCESSING',
  'COMPLETED',
  'FAILED',
  'TIMEOUT',
  'CANCELLED',
]);

/**
 * サブ目標生成パラメータのZodスキーマ
 */
export const SubGoalGenerationParamsSchema = z.object({
  goalId: z.string().uuid(),
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
 * アクション生成パラメータのZodスキーマ
 */
export const ActionGenerationParamsSchema = z.object({
  subGoalId: z.string().uuid(),
});

/**
 * タスク生成パラメータのZodスキーマ
 */
export const TaskGenerationParamsSchema = z.object({
  actionId: z.string().uuid(),
});

/**
 * 非同期処理リクエストのZodスキーマ
 */
export const AsyncProcessingRequestSchema = z.object({
  type: ProcessingTypeSchema,
  params: z.union([
    SubGoalGenerationParamsSchema,
    ActionGenerationParamsSchema,
    TaskGenerationParamsSchema,
  ]),
});

/**
 * 処理ID検証スキーマ
 */
export const ProcessIdSchema = z.string().uuid('処理IDは有効なUUID形式である必要があります');

/**
 * 処理履歴リクエストのZodスキーマ
 */
export const ProcessingHistoryRequestSchema = z.object({
  page: z.number().int().min(1).default(1).optional(),
  pageSize: z.number().int().min(1).max(100).default(20).optional(),
  type: ProcessingTypeSchema.optional(),
  status: ProcessingStatusSchema.optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

/**
 * バリデーション定数
 */
export const VALIDATION_RULES = {
  processId: {
    format: 'UUID',
  },
  pagination: {
    minPage: 1,
    minPageSize: 1,
    maxPageSize: 100,
    defaultPageSize: 20,
  },
  retry: {
    maxRetryCount: 3,
  },
  timeout: {
    defaultSeconds: 300, // 5分
    maxSeconds: 900, // 15分
  },
} as const;

/**
 * 処理タイプ別の推定完了時間（秒）
 */
export const ESTIMATED_COMPLETION_TIME = {
  SUBGOAL_GENERATION: 60, // 1分
  ACTION_GENERATION: 180, // 3分
  TASK_GENERATION: 120, // 2分
} as const;

/**
 * エラーコード定数
 */
export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  PROCESSING_NOT_FOUND: 'PROCESSING_NOT_FOUND',
  PROCESSING_CANCELLED: 'PROCESSING_CANCELLED',
  PROCESSING_ALREADY_COMPLETED: 'PROCESSING_ALREADY_COMPLETED',
  RETRY_LIMIT_EXCEEDED: 'RETRY_LIMIT_EXCEEDED',
  CANNOT_CANCEL: 'CANNOT_CANCEL',
  CANNOT_RETRY: 'CANNOT_RETRY',
  AI_ERROR: 'AI_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  STEP_FUNCTIONS_ERROR: 'STEP_FUNCTIONS_ERROR',
} as const;
