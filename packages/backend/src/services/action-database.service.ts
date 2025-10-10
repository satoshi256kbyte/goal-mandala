import { PrismaClient } from '@prisma/client';
import type { Action } from '../generated/prisma-client';
import { ActionOutput } from '../types/action-generation.types';

/**
 * アクションデータベースサービスインターフェース
 */
export interface IActionDatabaseService {
  /**
   * 既存のアクションを削除する
   */
  deleteExistingActions(subGoalId: string): Promise<void>;

  /**
   * アクションを作成する
   */
  createActions(subGoalId: string, actions: ActionOutput[]): Promise<Action[]>;

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
   * サブ目標と目標情報を取得する（認可チェック用）
   */
  getSubGoalWithGoal(subGoalId: string): Promise<{
    id: string;
    goal: {
      id: string;
      userId: string;
    };
  } | null>;
}

/**
 * アクションデータベースサービス実装
 */
export class ActionDatabaseService implements IActionDatabaseService {
  private prisma: PrismaClient;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || new PrismaClient();
  }

  /**
   * 既存のアクションを削除する
   */
  async deleteExistingActions(subGoalId: string): Promise<void> {
    await this.prisma.action.deleteMany({
      where: { subGoalId },
    });
  }

  /**
   * アクションを作成する
   */
  async createActions(subGoalId: string, actions: ActionOutput[]): Promise<Action[]> {
    const createdActions = await Promise.all(
      actions.map(action =>
        this.prisma.action.create({
          data: {
            subGoalId,
            title: action.title,
            description: action.description,
            background: action.background,
            type: action.type,
            position: action.position,
            progress: 0,
          },
        })
      )
    );

    return createdActions;
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
   * サブ目標と目標情報を取得する（認可チェック用）
   */
  async getSubGoalWithGoal(subGoalId: string): Promise<{
    id: string;
    goal: {
      id: string;
      userId: string;
    };
  } | null> {
    const subGoal = await this.prisma.subGoal.findUnique({
      where: { id: subGoalId },
      select: {
        id: true,
        goal: {
          select: {
            id: true,
            userId: true,
          },
        },
      },
    });

    return subGoal;
  }

  /**
   * Prismaクライアントを閉じる
   */
  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}
