/**
 * タスク生成APIの型定義
 */

/**
 * タスク種別
 */
export enum TaskType {
  EXECUTION = 'execution', // 実行タスク（一度で完了）
  HABIT = 'habit', // 習慣タスク（継続的実施）
}

/**
 * タスク優先度
 */
export enum TaskPriority {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

/**
 * タスク生成リクエスト
 */
export interface TaskGenerationRequest {
  actionId: string; // アクションID（UUID、必須）
  regenerate?: boolean; // 既存のタスクを再生成する場合true（オプション、デフォルト: false）
}

/**
 * タスク出力形式
 */
export interface TaskOutput {
  id?: string; // UUID（保存後に付与）
  title: string; // タスクタイトル（50文字以内）
  description: string; // タスク説明（200文字以内）
  type: TaskType; // タスク種別（EXECUTION/HABIT）
  estimatedMinutes: number; // 推定所要時間（分単位、15-120分）
  priority: TaskPriority; // 優先度（HIGH/MEDIUM/LOW）
  dependencies?: string[]; // 依存タスクID配列
  position: number; // 位置（0から始まる連番）
  createdAt?: string; // 作成日時（ISO 8601形式）
  updatedAt?: string; // 更新日時（ISO 8601形式）
}

/**
 * タスク生成コンテキスト
 */
export interface TaskGenerationContext {
  action: {
    id: string;
    title: string;
    description: string;
    background: string;
    constraints?: string;
    type: 'execution' | 'habit';
  };
  subGoal: {
    id: string;
    title: string;
    description: string;
  };
  goal: {
    id: string;
    title: string;
    description: string;
    deadline: Date;
  };
  user: {
    preferences?: {
      workStyle?: string;
      timeAvailable?: number;
    };
  };
}

/**
 * アクションコンテキスト（メタデータ用）
 */
export interface ActionContext {
  goalTitle: string; // 目標タイトル
  subGoalTitle: string; // サブ目標タイトル
  actionTitle: string; // アクションタイトル
  actionType: 'execution' | 'habit'; // アクション種別
}

/**
 * タスク生成結果
 */
export interface TaskGenerationResult {
  actionId: string;
  tasks: TaskOutput[];
  metadata: {
    generatedAt: Date;
    tokensUsed: number;
    estimatedCost: number;
    actionContext: ActionContext;
    taskCount: number;
    totalEstimatedMinutes: number;
  };
}

/**
 * エラー詳細
 */
export interface ErrorDetail {
  field: string;
  message: string;
}

/**
 * タスク生成レスポンス
 */
export interface TaskGenerationResponse {
  success: boolean;
  data?: {
    actionId: string;
    tasks: TaskOutput[];
  };
  metadata?: {
    generatedAt: string;
    tokensUsed: number;
    estimatedCost: number;
    actionContext: ActionContext;
    taskCount: number;
    totalEstimatedMinutes: number;
  };
  error?: {
    code: string;
    message: string;
    retryable?: boolean;
    details?: ErrorDetail[] | unknown;
  };
}
