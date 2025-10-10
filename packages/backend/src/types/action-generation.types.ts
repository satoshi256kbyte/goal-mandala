/**
 * アクション生成APIの型定義
 */

/**
 * アクション種別
 */
export enum ActionType {
  EXECUTION = 'execution', // 実行アクション（一度で完了）
  HABIT = 'habit', // 習慣アクション（継続的実施）
}

/**
 * アクション生成リクエスト
 */
export interface ActionGenerationRequest {
  subGoalId: string; // サブ目標ID（UUID、必須）
  regenerate?: boolean; // 既存のアクションを再生成する場合true（オプション、デフォルト: false）
}

/**
 * アクション出力形式
 */
export interface ActionOutput {
  id?: string; // UUID（保存後に付与）
  title: string; // アクションタイトル（50文字以内）
  description: string; // アクション説明（100-200文字）
  background: string; // 背景（100文字以内）
  type: ActionType; // アクション種別（EXECUTION/HABIT）
  position: number; // 位置（0-7）
  progress?: number; // 進捗率（初期値: 0）
  createdAt?: string; // 作成日時（ISO 8601形式）
  updatedAt?: string; // 更新日時（ISO 8601形式）
}

/**
 * 目標コンテキスト（メタデータ用）
 */
export interface GoalContext {
  goalTitle: string; // 目標タイトル
  subGoalTitle: string; // サブ目標タイトル
}

/**
 * アクション生成コンテキスト
 */
export interface GenerationContext {
  goal: {
    id: string;
    title: string;
    description: string;
    deadline: Date;
    background: string;
    constraints?: string;
  };
  subGoal: {
    id: string;
    title: string;
    description: string;
    background: string;
    position: number;
  };
  relatedSubGoals: Array<{
    title: string;
    description: string;
    position: number;
  }>;
  user: {
    industry?: string;
    jobType?: string;
  };
}

/**
 * アクション生成結果
 */
export interface ActionGenerationResult {
  subGoalId: string;
  actions: ActionOutput[];
  metadata: {
    generatedAt: Date;
    tokensUsed: number;
    estimatedCost: number;
    goalContext: GoalContext;
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
 * アクション生成レスポンス
 */
export interface ActionGenerationResponse {
  success: boolean;
  data?: {
    subGoalId: string;
    actions: ActionOutput[];
  };
  metadata?: {
    generatedAt: string;
    tokensUsed: number;
    estimatedCost: number;
    goalContext: GoalContext;
  };
  error?: {
    code: string;
    message: string;
    retryable?: boolean;
    details?: ErrorDetail[] | unknown;
  };
}
