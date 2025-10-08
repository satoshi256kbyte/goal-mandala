import { PrismaClient } from '@prisma/client';
import type { SubGoal } from '../generated/prisma-client';
import { SubGoalGenerationRequest } from '../types/subgoal-generation.types';

/**
 * データベースサービスインターフェース
 */
export interface IDatabaseService {
  /**
   * 目標を取得する
   */
  getGoal(goalId: string): Promise<{ id: string; userId: string } | null>;

  /**
   * 目標を作成する
   */
  createGoal(userId: string, goalData: SubGoalGenerationRequest): Promise<string>;

  /**
   * 目標を更新する
   */
  updateGoal(goalId: string, goalData: SubGoalGenerationRequest): Promise<void>;

  /**
   * 既存のサブ目標を削除する
   */
  deleteExistingSubGoals(goalId: string): Promise<void>;

  /**
   * サブ目標を作成する
   */
  createSubGoals(
    goalId: string,
    subGoals: Array<{
      title: string;
      description: string;
      background: string;
      position: number;
    }>
  ): Promise<SubGoal[]>;

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
}

/**
 * データベースサービス実装
 */
export class DatabaseService implements IDatabaseService {
  private prisma: PrismaClient;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || new PrismaClient();
  }

  /**
   * 目標を取得する
   */
  async getGoal(goalId: string): Promise<{ id: string; userId: string } | null> {
    const goal = await this.prisma.goal.findUnique({
      where: { id: goalId },
      select: { id: true, userId: true },
    });

    return goal;
  }

  /**
   * 目標を作成する
   */
  async createGoal(userId: string, goalData: SubGoalGenerationRequest): Promise<string> {
    const goal = await this.prisma.goal.create({
      data: {
        userId,
        title: goalData.title,
        description: goalData.description,
        deadline: new Date(goalData.deadline),
        background: goalData.background,
        constraints: goalData.constraints,
        status: 'ACTIVE',
        progress: 0,
      },
    });

    return goal.id;
  }

  /**
   * 目標を更新する
   */
  async updateGoal(goalId: string, goalData: SubGoalGenerationRequest): Promise<void> {
    await this.prisma.goal.update({
      where: { id: goalId },
      data: {
        title: goalData.title,
        description: goalData.description,
        deadline: new Date(goalData.deadline),
        background: goalData.background,
        constraints: goalData.constraints,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * 既存のサブ目標を削除する
   */
  async deleteExistingSubGoals(goalId: string): Promise<void> {
    await this.prisma.subGoal.deleteMany({
      where: { goalId },
    });
  }

  /**
   * サブ目標を作成する
   */
  async createSubGoals(
    goalId: string,
    subGoals: Array<{
      title: string;
      description: string;
      background: string;
      position: number;
    }>
  ): Promise<SubGoal[]> {
    const createdSubGoals = await Promise.all(
      subGoals.map(subGoal =>
        this.prisma.subGoal.create({
          data: {
            goalId,
            title: subGoal.title,
            description: subGoal.description,
            background: subGoal.background,
            position: subGoal.position,
            progress: 0,
          },
        })
      )
    );

    return createdSubGoals;
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
   * Prismaクライアントを閉じる
   */
  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}
