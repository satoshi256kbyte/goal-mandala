/**
 * AI生成関連の型定義
 */

/**
 * 生成タイプ
 */
export type GenerationType = 'subgoal' | 'action' | 'task';

/**
 * 目標入力（サブ目標生成用）
 */
export interface GoalInput {
  title: string;
  description: string;
  deadline: string;
  background: string;
  constraints?: string;
}

/**
 * サブ目標入力（アクション生成用）
 */
export interface SubGoalInput {
  goalTitle: string;
  goalDescription: string;
  subGoalTitle: string;
  subGoalDescription: string;
  background: string;
  constraints?: string;
}

/**
 * アクション入力（タスク生成用）
 */
export interface ActionInput {
  actionTitle: string;
  actionDescription: string;
  actionType: 'execution' | 'habit';
  background: string;
  constraints?: string;
}

/**
 * サブ目標出力
 */
export interface SubGoalOutput {
  title: string;
  description: string;
  background: string;
  position: number;
}

/**
 * アクション出力
 */
export interface ActionOutput {
  title: string;
  description: string;
  type: 'execution' | 'habit';
  background: string;
  position: number;
}

/**
 * タスク出力
 */
export interface TaskOutput {
  title: string;
  description: string;
  type: 'execution' | 'habit';
  estimatedMinutes: number;
}

/**
 * 生成リクエスト
 */
export interface GenerateRequest {
  type: GenerationType;
  input: GoalInput | SubGoalInput | ActionInput;
  userId: string;
}

/**
 * エラー詳細
 */
export interface ErrorDetail {
  code: string;
  message: string;
  details?: unknown;
  retryable: boolean;
}

/**
 * 生成レスポンス
 */
export interface GenerateResponse {
  success: boolean;
  data?: SubGoalOutput[] | ActionOutput[] | TaskOutput[];
  error?: ErrorDetail;
}

/**
 * ログエントリ
 */
export interface LogEntry {
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR';
  requestId: string;
  userId?: string;
  action: string;
  duration?: number;
  error?: {
    code: string;
    message: string;
  };
  metadata?: Record<string, unknown>;
}
