/**
 * サブ目標生成APIの型定義
 */

/**
 * サブ目標生成リクエスト
 */
export interface SubGoalGenerationRequest {
  /** 既存の目標を更新する場合のID（オプション） */
  goalId?: string;
  /** 目標タイトル（1-200文字） */
  title: string;
  /** 目標説明（1-2000文字） */
  description: string;
  /** 達成期限（ISO 8601形式、未来の日付） */
  deadline: string;
  /** 背景情報（1-1000文字） */
  background: string;
  /** 制約事項（0-1000文字、オプション） */
  constraints?: string;
}

/**
 * サブ目標出力
 */
export interface SubGoalOutput {
  /** UUID */
  id: string;
  /** サブ目標タイトル（30文字以内） */
  title: string;
  /** サブ目標説明（50-200文字） */
  description: string;
  /** 背景（100文字以内） */
  background: string;
  /** 位置（0-7） */
  position: number;
  /** 進捗率（初期値: 0） */
  progress: number;
  /** 作成日時（ISO 8601形式） */
  createdAt: string;
  /** 更新日時（ISO 8601形式） */
  updatedAt: string;
}

/**
 * サブ目標生成レスポンス
 */
export interface SubGoalGenerationResponse {
  /** 成功フラグ */
  success: boolean;
  /** データ（成功時） */
  data?: {
    /** 目標ID */
    goalId: string;
    /** サブ目標配列 */
    subGoals: SubGoalOutput[];
  };
  /** メタデータ（成功時） */
  metadata?: {
    /** 生成日時 */
    generatedAt: string;
    /** 使用トークン数 */
    tokensUsed: number;
    /** 推定コスト */
    estimatedCost: number;
  };
  /** エラー情報（失敗時） */
  error?: ErrorDetail;
}

/**
 * エラー詳細
 */
export interface ErrorDetail {
  /** エラーコード */
  code: string;
  /** エラーメッセージ */
  message: string;
  /** 再試行可能フラグ */
  retryable?: boolean;
  /** 詳細情報 */
  details?: ValidationErrorDetail[];
}

/**
 * バリデーションエラー詳細
 */
export interface ValidationErrorDetail {
  /** フィールド名 */
  field: string;
  /** エラーメッセージ */
  message: string;
}

/**
 * サブ目標生成結果
 */
export interface SubGoalGenerationResult {
  /** 目標ID */
  goalId: string;
  /** サブ目標配列 */
  subGoals: SubGoalOutput[];
  /** メタデータ */
  metadata: {
    /** 生成日時 */
    generatedAt: Date;
    /** 使用トークン数 */
    tokensUsed: number;
    /** 推定コスト */
    estimatedCost: number;
  };
}

/**
 * バリデーション結果
 */
export interface ValidationResult {
  /** 有効フラグ */
  isValid: boolean;
  /** エラー配列 */
  errors: ValidationErrorDetail[];
}

/**
 * 品質検証結果
 */
export interface QualityValidationResult {
  /** 有効フラグ */
  isValid: boolean;
  /** エラー配列 */
  errors: ValidationErrorDetail[];
  /** 警告配列 */
  warnings: string[];
}

/**
 * 目標入力データ
 */
export interface GoalInput {
  /** 目標タイトル */
  title: string;
  /** 目標説明 */
  description: string;
  /** 達成期限 */
  deadline: string;
  /** 背景情報 */
  background: string;
  /** 制約事項 */
  constraints?: string;
}

/**
 * ユーザー情報
 */
export interface UserInfo {
  /** 業種 */
  industry?: string;
  /** 職種 */
  jobType?: string;
}

/**
 * バリデーションルール
 */
export interface ValidationRules {
  /** タイトルのルール */
  title: {
    required: boolean;
    minLength: number;
    maxLength: number;
  };
  /** 説明のルール */
  description: {
    required: boolean;
    minLength: number;
    maxLength: number;
  };
  /** 期限のルール */
  deadline: {
    required: boolean;
    format: string;
    minDate: string;
  };
  /** 背景のルール */
  background: {
    required: boolean;
    minLength: number;
    maxLength: number;
  };
  /** 制約事項のルール */
  constraints: {
    required: boolean;
    maxLength: number;
  };
}

/**
 * 品質基準
 */
export interface QualityCriteria {
  /** サブ目標の個数 */
  count: number;
  /** タイトルの最大文字数 */
  titleMaxLength: number;
  /** 説明の最小文字数 */
  descriptionMinLength: number;
  /** 説明の最大文字数 */
  descriptionMaxLength: number;
  /** 背景の最大文字数 */
  backgroundMaxLength: number;
  /** タイトルの重複を許可するか */
  allowDuplicateTitles: boolean;
}

/**
 * サブ目標生成サービスのインターフェース
 */
export interface ISubGoalGenerationService {
  /**
   * サブ目標を生成して保存する
   * @param userId ユーザーID
   * @param request リクエストデータ
   * @returns 生成結果
   */
  generateAndSaveSubGoals(
    userId: string,
    request: SubGoalGenerationRequest
  ): Promise<SubGoalGenerationResult>;
}

/**
 * 入力検証サービスのインターフェース
 */
export interface IInputValidationService {
  /**
   * サブ目標生成リクエストを検証する
   * @param request リクエストデータ
   * @returns 検証結果
   */
  validateSubGoalGenerationRequest(request: unknown): ValidationResult;

  /**
   * 入力をサニタイズする
   * @param input 入力文字列
   * @returns サニタイズされた文字列
   */
  sanitizeInput(input: string): string;
}

/**
 * サブ目標品質検証サービスのインターフェース
 */
export interface ISubGoalQualityValidator {
  /**
   * サブ目標の品質を検証する
   * @param subGoals サブ目標配列
   * @returns 検証結果
   */
  validateQuality(subGoals: SubGoalOutput[]): QualityValidationResult;
}

/**
 * データベースサービスのインターフェース
 */
export interface IDatabaseService {
  /**
   * 目標を作成する
   * @param userId ユーザーID
   * @param goalData 目標データ
   * @returns 目標ID
   */
  createGoal(userId: string, goalData: GoalInput): Promise<string>;

  /**
   * 目標を更新する
   * @param goalId 目標ID
   * @param goalData 目標データ
   */
  updateGoal(goalId: string, goalData: GoalInput): Promise<void>;

  /**
   * 既存のサブ目標を削除する
   * @param goalId 目標ID
   */
  deleteExistingSubGoals(goalId: string): Promise<void>;

  /**
   * サブ目標を作成する
   * @param goalId 目標ID
   * @param subGoals サブ目標配列
   * @returns 作成されたサブ目標配列
   */
  createSubGoals(goalId: string, subGoals: SubGoalOutput[]): Promise<SubGoalOutput[]>;

  /**
   * トランザクション内で処理を実行する
   * @param fn 実行する関数
   * @returns 実行結果
   */
  executeInTransaction<T>(fn: () => Promise<T>): Promise<T>;
}

/**
 * ログエントリ
 */
export interface LogEntry {
  /** タイムスタンプ */
  timestamp: string;
  /** ログレベル */
  level: 'INFO' | 'WARN' | 'ERROR';
  /** リクエストID */
  requestId: string;
  /** ユーザーID */
  userId?: string;
  /** アクション */
  action: string;
  /** 処理時間（ミリ秒） */
  duration?: number;
  /** メタデータ */
  metadata?: Record<string, unknown>;
  /** エラー情報 */
  error?: {
    code: string;
    message: string;
    stack?: string;
  };
}

/**
 * メトリクス情報
 */
export interface MetricsData {
  /** 成功フラグ */
  success: boolean;
  /** 処理時間（ミリ秒） */
  duration: number;
  /** 使用トークン数 */
  tokensUsed: number;
  /** コスト */
  cost: number;
}
