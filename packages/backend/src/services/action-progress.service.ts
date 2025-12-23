import { PrismaClient } from '@prisma/client';

/**
 * アクション進捗情報
 */
export interface ActionProgress {
  id: string;
  title: string;
  progress: number;
  subGoalTitle: string;
}

/**
 * 分類されたアクション
 */
export interface CategorizedActions {
  regretful: ActionProgress[]; // 進捗80%以上
  slowProgress: ActionProgress[]; // 進捗20%以下
  untouched: ActionProgress[]; // 進捗0%
}

/**
 * アクション進捗サービス
 *
 * 目標に紐づくアクションの進捗状況を取得し、分類する
 */
export class ActionProgressService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * 目標に紐づくアクションの進捗状況を取得
   *
   * @param goalId - 目標ID
   * @param userId - ユーザーID
   * @returns アクション進捗情報の配列
   */
  async getActionProgress(goalId: string, userId: string): Promise<ActionProgress[]> {
    // 目標の存在確認とユーザーID検証
    const goal = await this.prisma.goal.findFirst({
      where: {
        id: goalId,
        userId,
      },
    });

    if (!goal) {
      throw new Error('目標が見つかりません');
    }

    // 目標に紐づくサブ目標とアクションを取得
    const subGoals = await this.prisma.subGoal.findMany({
      where: {
        goalId,
      },
      include: {
        actions: true,
      },
    });

    // アクション進捗情報を整形
    const actionProgress: ActionProgress[] = [];

    for (const subGoal of subGoals) {
      for (const action of subGoal.actions) {
        actionProgress.push({
          id: action.id,
          title: action.title,
          progress: action.progress,
          subGoalTitle: subGoal.title,
        });
      }
    }

    return actionProgress;
  }

  /**
   * 進捗状況に基づいてアクションを分類
   *
   * @param actions - アクション進捗情報の配列
   * @returns 分類されたアクション
   */
  categorizeActions(actions: ActionProgress[]): CategorizedActions {
    const regretful: ActionProgress[] = [];
    const slowProgress: ActionProgress[] = [];
    const untouched: ActionProgress[] = [];

    for (const action of actions) {
      if (action.progress === 0) {
        // 進捗0%: 未着手
        untouched.push(action);
      } else if (action.progress <= 20) {
        // 進捗20%以下: 進まなかった
        slowProgress.push(action);
      } else if (action.progress >= 80) {
        // 進捗80%以上: 惜しかった
        regretful.push(action);
      }
    }

    return {
      regretful,
      slowProgress,
      untouched,
    };
  }
}
