/**
 * 非同期処理関連の型定義
 */

import { ProcessingType, ProcessingStatus } from '../generated/prisma-client';

// Prismaの型を再エクスポート
export { ProcessingType, ProcessingStatus };

/**
 * サブ目標生成パラメータ
 */
export interface SubGoalGenerationParams {
  goalId: string;
  title: string;
  description: string;
  deadline: string;
  background: string;
  constraints?: string;
}

/**
 * アクション生成パラメータ
 */
export interface ActionGenerationParams {
  subGoalId: string;
}

/**
 * タスク生成パラメータ
 */
export interface TaskGenerationParams {
  actionId: string;
}

/**
 * 処理パラメータの型
 */
export type ProcessingParams =
  | SubGoalGenerationParams
  | ActionGenerationParams
  | TaskGenerationParams;

/**
 * 非同期処理リクエスト
 */
export interface AsyncProcessingRequest {
  type: ProcessingType;
  params: ProcessingParams;
}

/**
 * 非同期処理レスポンス
 */
export interface AsyncProcessingResponse {
  success: boolean;
  data: {
    processId: string;
    status: ProcessingStatus;
    type: ProcessingType;
    createdAt: string;
    estimatedCompletionTime: string;
  };
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
}

/**
 * 処理状態レスポンス（処理中）
 */
export interface ProcessingStateResponse {
  success: boolean;
  data: {
    processId: string;
    status: ProcessingStatus;
    type: ProcessingType;
    progress: number;
    createdAt: string;
    updatedAt: string;
    estimatedCompletionTime: string;
    result?: unknown;
    completedAt?: string;
  };
  error?: ProcessingError;
}

/**
 * 処理エラー情報
 */
export interface ProcessingError {
  code: string;
  message: string;
  retryable: boolean;
  details?: unknown;
}

/**
 * 処理履歴リクエスト
 */
export interface ProcessingHistoryRequest {
  page?: number;
  pageSize?: number;
  type?: ProcessingType;
  status?: ProcessingStatus;
  startDate?: string;
  endDate?: string;
}

/**
 * 処理履歴アイテム
 */
export interface ProcessingHistoryItem {
  processId: string;
  status: ProcessingStatus;
  type: ProcessingType;
  progress: number;
  createdAt: string;
  completedAt?: string;
}

/**
 * 処理履歴レスポンス
 */
export interface ProcessingHistoryResponse {
  success: boolean;
  data: {
    processes: ProcessingHistoryItem[];
    pagination: {
      page: number;
      pageSize: number;
      totalCount: number;
      totalPages: number;
    };
  };
}

/**
 * リトライレスポンス
 */
export interface RetryResponse {
  success: boolean;
  data: {
    processId: string;
    status: ProcessingStatus;
    type: ProcessingType;
    createdAt: string;
    estimatedCompletionTime: string;
    retryCount: number;
  };
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
}

/**
 * キャンセルレスポンス
 */
export interface CancelResponse {
  success: boolean;
  data: {
    processId: string;
    status: ProcessingStatus;
    type: ProcessingType;
    createdAt: string;
    cancelledAt: string;
    message: string;
  };
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
}

/**
 * Step Functions実行入力
 */
export interface StepFunctionsExecutionInput {
  processId: string;
  userId: string;
  type: ProcessingType;
  params: ProcessingParams;
}

/**
 * Step Functions実行結果
 */
export interface StepFunctionsExecutionResult {
  processId: string;
  status: ProcessingStatus;
  result?: unknown;
  error?: ProcessingError;
}
