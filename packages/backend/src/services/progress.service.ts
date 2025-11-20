import { PrismaClient, TaskStatus, Task } from '../generated/prisma-client';

/**
 * 進捗サービスインターフェース
 */
export interface IProgressService {
  /**
   * アクション進捗を計算
   */
  calculateActionProgress(actionId: string): Promise<number>;

  /**
   * サブ目標進捗を計算
   */
  calculateSubGoalProgress(subGoalId: string): Promise<number>;

  /**
   * 目標進捗を計算
   */
  calculateGoalProgress(goalId: string): Promise<number>;

  /**
   * 進捗を更新（タスク→アクション→サブ目標→目標の連鎖更新）
   */
  updateProgress(taskId: string): Promise<void>;
}

/**
 * 進捗サービス実装
 */
export class ProgressService implements IProgressService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * アクション進捗を計算
   */
  async calculateActionProgress(actionId: string): Promise<number> {
    // アクション情報を取得
    const action = await this.prisma.action.findUnique({
      where: { id: actionId },
      include: {
        tasks: true,
      },
    });

    if (!action || !action.tasks || action.tasks.length === 0) {
      return 0;
    }

    const tasks = action.tasks;

    if (action.type === 'EXECUTION') {
      // 実行アクション: 完了したタスクの割合
      const completedTasks = tasks.filter((task: Task) => task.status === TaskStatus.COMPLETED);
      return Math.round((completedTasks.length / tasks.length) * 100);
    } else {
      // 習慣アクション: 継続日数の割合（目標期間の8割を継続すれば100%）
      const completedTasks = tasks.filter((task: Task) => task.status === TaskStatus.COMPLETED);
      const targetCompletionRate = 0.8; // 80%継続すれば達成とみなす
      const actualCompletionRate = completedTasks.length / tasks.length;

      return Math.min(Math.round((actualCompletionRate / targetCompletionRate) * 100), 100);
    }
  }

  /**
   * サブ目標進捗を計算
   */
  async calculateSubGoalProgress(subGoalId: string): Promise<number> {
    // サブ目標に関連するアクションを取得
    const actions = await this.prisma.action.findMany({
      where: { subGoalId },
    });

    if (!actions || actions.length === 0) {
      return 0;
    }

    // 各アクションの進捗を計算
    const progressPromises = actions.map((action: { id: string }) =>
      this.calculateActionProgress(action.id)
    );
    const actionProgresses = await Promise.all(progressPromises);

    // 平均進捗を計算
    const averageProgress =
      actionProgresses.reduce((sum, progress) => sum + progress, 0) / actions.length;
    return Math.round(averageProgress);
  }

  /**
   * 目標進捗を計算
   */
  async calculateGoalProgress(goalId: string): Promise<number> {
    // 目標に関連するサブ目標を取得
    const subGoals = await this.prisma.subGoal.findMany({
      where: { goalId },
    });

    if (!subGoals || subGoals.length === 0) {
      return 0;
    }

    // 各サブ目標の進捗を計算
    const progressPromises = subGoals.map((subGoal: { id: string }) =>
      this.calculateSubGoalProgress(subGoal.id)
    );
    const subGoalProgresses = await Promise.all(progressPromises);

    // 平均進捗を計算
    const averageProgress =
      subGoalProgresses.reduce((sum, progress) => sum + progress, 0) / subGoals.length;
    return Math.round(averageProgress);
  }

  /**
   * 進捗を更新（タスク→アクション→サブ目標→目標の連鎖更新）
   */
  async updateProgress(taskId: string): Promise<void> {
    // タスクから関連するアクション、サブ目標、目標を取得
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: {
        action: {
          include: {
            subGoal: {
              include: {
                goal: true,
              },
            },
          },
        },
      },
    });

    if (!task || !task.action) {
      return;
    }

    const action = task.action;
    const subGoal = action.subGoal;
    const goal = subGoal.goal;

    // トランザクション内で進捗を更新
    await this.prisma.$transaction(async (tx: PrismaClient) => {
      // 1. アクション進捗を計算・更新
      const actionProgress = await this.calculateActionProgress(action.id);
      await tx.action.update({
        where: { id: action.id },
        data: {
          progress: actionProgress,
          updatedAt: new Date(),
        },
      });

      // アクションが100%達成した場合、達成フラグを設定
      if (actionProgress >= 100) {
        await tx.action.update({
          where: { id: action.id },
          data: {
            status: 'ACHIEVED',
            updatedAt: new Date(),
          },
        });
      }

      // 2. サブ目標進捗を計算・更新
      const subGoalProgress = await this.calculateSubGoalProgress(subGoal.id);
      await tx.subGoal.update({
        where: { id: subGoal.id },
        data: {
          progress: subGoalProgress,
          updatedAt: new Date(),
        },
      });

      // サブ目標が100%達成した場合、達成フラグを設定
      if (subGoalProgress >= 100) {
        await tx.subGoal.update({
          where: { id: subGoal.id },
          data: {
            status: 'ACHIEVED',
            updatedAt: new Date(),
          },
        });
      }

      // 3. 目標進捗を計算・更新
      const goalProgress = await this.calculateGoalProgress(goal.id);
      await tx.goal.update({
        where: { id: goal.id },
        data: {
          progress: goalProgress,
          updatedAt: new Date(),
        },
      });

      // 目標が100%達成した場合、ステータスを完了に変更
      if (goalProgress >= 100) {
        await tx.goal.update({
          where: { id: goal.id },
          data: {
            status: 'COMPLETED',
            updatedAt: new Date(),
          },
        });
      }
    });
  }
}
