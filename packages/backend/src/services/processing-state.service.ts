/**
 * ProcessingStateService
 * 非同期処理の状態管理を行うサービス
 */

import { PrismaClient, ProcessingType, ProcessingStatus } from '../generated/prisma-client';
import {
  ProcessingError,
  ProcessingHistoryRequest,
  ProcessingHistoryItem,
} from '../types/async-processing.types';

/**
 * ProcessingStateServiceインターフェース
 */
export interface IProcessingStateService {
  /**
   * 処理状態を作成
   */
  createProcessingState(params: {
    userId: string;
    type: ProcessingType;
    targetId?: string;
  }): Promise<{
    id: string;
    userId: string;
    type: ProcessingType;
    status: ProcessingStatus;
    progress: number;
    createdAt: Date;
  }>;

  /**
   * 処理状態を取得
   */
  getProcessingState(
    processId: string,
    userId: string
  ): Promise<{
    id: string;
    userId: string;
    type: ProcessingType;
    status: ProcessingStatus;
    targetId: string | null;
    progress: number;
    result: unknown;
    error: unknown;
    retryCount: number;
    createdAt: Date;
    updatedAt: Date;
    completedAt: Date | null;
  } | null>;

  /**
   * 処理ステータスを更新
   */
  updateProcessingStatus(processId: string, status: ProcessingStatus): Promise<void>;

  /**
   * 処理進捗を更新
   */
  updateProcessingProgress(processId: string, progress: number): Promise<void>;

  /**
   * 処理結果を更新
   */
  updateProcessingResult(processId: string, result: unknown): Promise<void>;

  /**
   * 処理エラーを更新
   */
  updateProcessingError(processId: string, error: ProcessingError): Promise<void>;

  /**
   * 処理履歴を取得
   */
  getProcessingHistory(
    userId: string,
    request: ProcessingHistoryRequest
  ): Promise<{
    processes: ProcessingHistoryItem[];
    pagination: {
      page: number;
      pageSize: number;
      totalCount: number;
      totalPages: number;
    };
  }>;
}

/**
 * ProcessingStateService実装
 */
export class ProcessingStateService implements IProcessingStateService {
  private prisma: PrismaClient;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || new PrismaClient();
  }

  /**
   * 処理状態を作成
   */
  async createProcessingState(params: {
    userId: string;
    type: ProcessingType;
    targetId?: string;
  }): Promise<{
    id: string;
    userId: string;
    type: ProcessingType;
    status: ProcessingStatus;
    progress: number;
    createdAt: Date;
  }> {
    const processingState = await this.prisma.processingState.create({
      data: {
        userId: params.userId,
        type: params.type,
        targetId: params.targetId,
        status: ProcessingStatus.PENDING,
        progress: 0,
      },
      select: {
        id: true,
        userId: true,
        type: true,
        status: true,
        progress: true,
        createdAt: true,
      },
    });

    return processingState;
  }

  /**
   * 処理状態を取得
   */
  async getProcessingState(
    processId: string,
    userId: string
  ): Promise<{
    id: string;
    userId: string;
    type: ProcessingType;
    status: ProcessingStatus;
    targetId: string | null;
    progress: number;
    result: unknown;
    error: unknown;
    retryCount: number;
    createdAt: Date;
    updatedAt: Date;
    completedAt: Date | null;
  } | null> {
    const processingState = await this.prisma.processingState.findUnique({
      where: {
        id: processId,
      },
    });

    // 処理が存在しない、または他のユーザーの処理の場合はnullを返す
    if (!processingState || processingState.userId !== userId) {
      return null;
    }

    return processingState;
  }

  /**
   * 処理ステータスを更新
   */
  async updateProcessingStatus(processId: string, status: ProcessingStatus): Promise<void> {
    const updateData: {
      status: ProcessingStatus;
      completedAt?: Date;
    } = {
      status,
    };

    // 完了、失敗、タイムアウト、キャンセルの場合はcompletedAtを設定
    if (
      status === ProcessingStatus.COMPLETED ||
      status === ProcessingStatus.FAILED ||
      status === ProcessingStatus.TIMEOUT ||
      status === ProcessingStatus.CANCELLED
    ) {
      updateData.completedAt = new Date();
    }

    await this.prisma.processingState.update({
      where: {
        id: processId,
      },
      data: updateData,
    });
  }

  /**
   * 処理進捗を更新
   */
  async updateProcessingProgress(processId: string, progress: number): Promise<void> {
    await this.prisma.processingState.update({
      where: {
        id: processId,
      },
      data: {
        progress,
      },
    });
  }

  /**
   * 処理結果を更新
   */
  async updateProcessingResult(processId: string, result: unknown): Promise<void> {
    await this.prisma.processingState.update({
      where: {
        id: processId,
      },
      data: {
        result,
        status: ProcessingStatus.COMPLETED,
        progress: 100,
        completedAt: new Date(),
      },
    });
  }

  /**
   * 処理エラーを更新
   */
  async updateProcessingError(processId: string, error: ProcessingError): Promise<void> {
    await this.prisma.processingState.update({
      where: {
        id: processId,
      },
      data: {
        error,
        status: ProcessingStatus.FAILED,
        completedAt: new Date(),
      },
    });
  }

  /**
   * 処理履歴を取得
   */
  async getProcessingHistory(
    userId: string,
    request: ProcessingHistoryRequest
  ): Promise<{
    processes: ProcessingHistoryItem[];
    pagination: {
      page: number;
      pageSize: number;
      totalCount: number;
      totalPages: number;
    };
  }> {
    const page = request.page || 1;
    const pageSize = request.pageSize || 20;
    const skip = (page - 1) * pageSize;

    // フィルター条件を構築
    const where: {
      userId: string;
      type?: ProcessingType;
      status?: ProcessingStatus;
      createdAt?: {
        gte?: Date;
        lte?: Date;
      };
    } = {
      userId,
    };

    if (request.type) {
      where.type = request.type;
    }

    if (request.status) {
      where.status = request.status;
    }

    if (request.startDate || request.endDate) {
      where.createdAt = {};
      if (request.startDate) {
        where.createdAt.gte = new Date(request.startDate);
      }
      if (request.endDate) {
        where.createdAt.lte = new Date(request.endDate);
      }
    }

    // 総件数を取得
    const totalCount = await this.prisma.processingState.count({
      where,
    });

    // 処理履歴を取得
    const processingStates = await this.prisma.processingState.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take: pageSize,
      select: {
        id: true,
        status: true,
        type: true,
        progress: true,
        createdAt: true,
        completedAt: true,
      },
    });

    // レスポンス形式に変換
    const processes: ProcessingHistoryItem[] = processingStates.map(state => ({
      processId: state.id,
      status: state.status,
      type: state.type,
      progress: state.progress,
      createdAt: state.createdAt.toISOString(),
      completedAt: state.completedAt?.toISOString(),
    }));

    const totalPages = Math.ceil(totalCount / pageSize);

    return {
      processes,
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages,
      },
    };
  }
}
