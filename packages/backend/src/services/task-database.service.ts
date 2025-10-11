import { PrismaClient } from '@prisma/client';
import type { Task } from '../generated/prisma-client';
import { TaskOutput } from '../types/task-generation.types';

/**
 * タスクデータベースサービスインターフェース
 */
export interface ITaskDatabaseService {
  /**
   * 既存のタスクを削除する
   */
  deleteExistingTasks(actionId: string): Promise<void>;

  /**
   * タスクを作成する
   */
  createTasks(actionId: string, tasks: TaskOutput[]): Promise<Task[]>;

  /**
   * トランザクション内で処理を実行する
   */
  executeInTransaction<T>(
    fn: (
      tx: Omit<
        PrismaClient,
        '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
      >
    ) => Promise<T>
  ): Promise<T>;

  /**
   * アクションとサブ目標、目標情報を取得する（認可チェック用）
   */
  getActionWithSubGoalAndGoal(actionId: string): Promise<{
    id: string;
    subGoal: {
      id: string;
      goal: {
        id: string;
        userId: string;
      };
    };
  } | null>;
}

/**
 * タスクデータベースサービス実装
 */
export class TaskDatabaseService implements ITaskDatabaseService {
  private prisma: PrismaClient;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || new PrismaClient();
  }

  /**
   * 既存のタスクを削除する
   */
  async deleteExistingTasks(actionId: string): Promise<void> {
    await this.prisma.task.deleteMany({
      where: { actionId },
    });
  }

  /**
   * タスクを作成する（バルクインサートで最適化）
   */
  async createTasks(actionId: string, tasks: TaskOutput[]): Promise<Task[]> {
    // バルクインサートで一度に全タスクを作成（パフォーマンス最適化）
    await this.prisma.task.createMany({
      data: tasks.map(task => ({
        actionId,
        title: task.title,
        description: task.description,
        type: 'ACTION', // MVP版では全てACTIONタスク
        status: 'PENDING', // 初期状態はPENDING
        estimatedTime: task.estimatedMinutes,
      })),
    });

    // 作成されたタスクを取得して返す
    const createdTasks = await this.prisma.task.findMany({
      where: { actionId },
      orderBy: { createdAt: 'asc' },
    });

    return createdTasks;
  }

  /**
   * トランザクション内で処理を実行する
   */
  async executeInTransaction<T>(
    fn: (
      tx: Omit<
        PrismaClient,
        '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
      >
    ) => Promise<T>
  ): Promise<T> {
    return await this.prisma.$transaction(
      async (
        tx: Omit<
          PrismaClient,
          '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
        >
      ) => {
        return await fn(tx);
      }
    );
  }

  /**
   * アクションとサブ目標、目標情報を取得する（認可チェック用）
   */
  async getActionWithSubGoalAndGoal(actionId: string): Promise<{
    id: string;
    subGoal: {
      id: string;
      goal: {
        id: string;
        userId: string;
      };
    };
  } | null> {
    const action = await this.prisma.action.findUnique({
      where: { id: actionId },
      select: {
        id: true,
        subGoal: {
          select: {
            id: true,
            goal: {
              select: {
                id: true,
                userId: true,
              },
            },
          },
        },
      },
    });

    return action;
  }

  /**
   * Prismaクライアントを閉じる
   */
  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}
