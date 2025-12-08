/**
 * Task Selector Service
 *
 * リマインド対象のタスクを選択するサービス
 * Requirements: 4.1-4.5, 5.1-5.5
 */

import { PrismaClient, TaskStatus, TaskType } from '../generated/prisma-client';
import { MoodPreference } from '@goal-mandala/shared';

export interface TaskWithAction {
  id: string;
  actionId: string;
  title: string;
  type: TaskType;
  status: TaskStatus;
  estimatedMinutes: number;
  createdAt: Date;
  action: {
    id: string;
    subGoalId: string;
    position: number;
    subGoal: {
      id: string;
      goalId: string;
      position: number;
    };
  };
}

export interface TaskSelectionCriteria {
  maxExecutionTasks: number; // 3
  habitTaskFrequency: 'weekly'; // Once per week
  moodPreference: MoodPreference | null;
}

export class TaskSelectorService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * リマインド対象のタスクを選択する
   *
   * @param userId ユーザーID
   * @param goalId 目標ID
   * @param moodPreference 気分選択（オプション）
   * @returns 選択されたタスクの配列
   */
  async selectTasksForReminder(
    userId: string,
    goalId: string,
    moodPreference: MoodPreference | null = null
  ): Promise<TaskWithAction[]> {
    // 1. 未完了タスクを取得
    const incompleteTasks = await this.getIncompleteTasks(userId, goalId);

    if (incompleteTasks.length === 0) {
      return [];
    }

    // 2. 実行タスクと習慣タスクを分離
    const { executionTasks, habitTasks } = this.separateTasksByType(incompleteTasks);

    // 3. 習慣タスクの週次リマインド処理
    const selectedHabitTasks = await this.selectHabitTasks(habitTasks);

    // 4. 実行タスクの選択（最大3つ）
    const selectedExecutionTasks = await this.selectExecutionTasks(
      executionTasks,
      moodPreference,
      3 - selectedHabitTasks.length // 残りスロット
    );

    // 5. 選択されたタスクを結合して返す
    return [...selectedHabitTasks, ...selectedExecutionTasks];
  }

  /**
   * 未完了タスクを取得する
   *
   * @param userId ユーザーID
   * @param goalId 目標ID
   * @returns 未完了タスクの配列
   */
  private async getIncompleteTasks(userId: string, goalId: string): Promise<TaskWithAction[]> {
    return this.prisma.task.findMany({
      where: {
        action: {
          subGoal: {
            goal: {
              userId,
              id: goalId,
              status: 'ACTIVE',
            },
          },
        },
        status: {
          in: [TaskStatus.NOT_STARTED, TaskStatus.IN_PROGRESS],
        },
      },
      include: {
        action: {
          include: {
            subGoal: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    }) as Promise<TaskWithAction[]>;
  }

  /**
   * 実行タスクと習慣タスクを分離する
   *
   * @param tasks タスクの配列
   * @returns 実行タスクと習慣タスクの配列
   */
  private separateTasksByType(tasks: TaskWithAction[]): {
    executionTasks: TaskWithAction[];
    habitTasks: TaskWithAction[];
  } {
    const executionTasks = tasks.filter(task => task.type === TaskType.EXECUTION);
    const habitTasks = tasks.filter(task => task.type === TaskType.HABIT);

    return { executionTasks, habitTasks };
  }

  /**
   * 習慣タスクを選択する
   *
   * 週1回必ずリマインドし、平日に均等分散する
   * 7日間リマインドなしの場合は優先的に選択する
   *
   * @param habitTasks 習慣タスクの配列
   * @returns 選択された習慣タスクの配列
   */
  private async selectHabitTasks(habitTasks: TaskWithAction[]): Promise<TaskWithAction[]> {
    if (habitTasks.length === 0) {
      return [];
    }

    // 習慣タスクのリマインド履歴を取得
    const taskIds = habitTasks.map(task => task.id);
    const reminderTracking = await this.prisma.habitTaskReminderTracking.findMany({
      where: {
        taskId: {
          in: taskIds,
        },
      },
    });

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const currentWeekNumber = this.getISOWeekNumber(now);

    // 7日間リマインドなしのタスクを優先（最優先）
    const priorityTasks = habitTasks.filter(task => {
      const tracking = reminderTracking.find(t => t.taskId === task.id);
      if (!tracking) {
        return true; // 初回リマインド
      }
      return tracking.lastRemindedAt < sevenDaysAgo;
    });

    if (priorityTasks.length > 0) {
      // 優先タスクからランダムに1つ選択
      const randomIndex = Math.floor(Math.random() * priorityTasks.length);
      return [priorityTasks[randomIndex]];
    }

    // 今週まだリマインドされていないタスクを選択（週次リマインド保証）
    const notRemindedThisWeek = habitTasks.filter(task => {
      const tracking = reminderTracking.find(t => t.taskId === task.id);
      if (!tracking) {
        return true; // 初回リマインド
      }
      return tracking.weekNumber !== currentWeekNumber;
    });

    if (notRemindedThisWeek.length > 0) {
      // 平日への均等分散を考慮
      // 各タスクの今週のリマインド回数を計算
      const taskReminderCounts = notRemindedThisWeek.map(task => {
        const tracking = reminderTracking.find(t => t.taskId === task.id);
        return {
          task,
          reminderCount: tracking?.reminderCount || 0,
        };
      });

      // リマインド回数が少ないタスクを優先
      taskReminderCounts.sort((a, b) => a.reminderCount - b.reminderCount);

      // 最もリマインド回数が少ないタスクの中からランダムに選択
      const minReminderCount = taskReminderCounts[0].reminderCount;
      const leastRemindedTasks = taskReminderCounts
        .filter(t => t.reminderCount === minReminderCount)
        .map(t => t.task);

      const randomIndex = Math.floor(Math.random() * leastRemindedTasks.length);
      return [leastRemindedTasks[randomIndex]];
    }

    // 全てのタスクが今週リマインド済みの場合は、ランダムに1つ選択
    const randomIndex = Math.floor(Math.random() * habitTasks.length);
    return [habitTasks[randomIndex]];
  }

  /**
   * ISO週番号を取得する
   *
   * @param date 日付
   * @returns ISO週番号
   */
  private getISOWeekNumber(date: Date): number {
    const target = new Date(date.valueOf());
    const dayNumber = (date.getDay() + 6) % 7;
    target.setDate(target.getDate() - dayNumber + 3);
    const firstThursday = target.valueOf();
    target.setMonth(0, 1);
    if (target.getDay() !== 4) {
      target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
    }
    return 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
  }

  /**
   * 実行タスクを選択する
   *
   * 気分選択に基づいてタスクを選択する
   * - stay_on_track: 2/3を同じ・隣接アクションから、1/3を古い10件からランダム
   * - change_pace: 全て古い10件からランダム
   * - null (初回): 完全ランダム
   *
   * @param executionTasks 実行タスクの配列
   * @param moodPreference 気分選択
   * @param maxTasks 最大タスク数
   * @returns 選択された実行タスクの配列
   */
  private async selectExecutionTasks(
    executionTasks: TaskWithAction[],
    moodPreference: MoodPreference | null,
    maxTasks: number
  ): Promise<TaskWithAction[]> {
    if (executionTasks.length === 0 || maxTasks <= 0) {
      return [];
    }

    // 最大タスク数を実際のタスク数に制限
    const actualMaxTasks = Math.min(maxTasks, executionTasks.length);

    // 気分選択に基づいてタスクを選択
    if (moodPreference === null) {
      // 初回: 完全ランダム
      return this.selectRandomTasks(executionTasks, actualMaxTasks);
    } else if (moodPreference === MoodPreference.STAY_ON_TRACK) {
      // このまま行く: 2/3を同じ・隣接アクションから、1/3を古い10件からランダム
      return this.selectStayOnTrackTasks(executionTasks, actualMaxTasks);
    } else if (moodPreference === MoodPreference.CHANGE_PACE) {
      // 気分を変える: 全て古い10件からランダム
      return this.selectChangePaceTasks(executionTasks, actualMaxTasks);
    }

    return [];
  }

  /**
   * ランダムにタスクを選択する
   *
   * @param tasks タスクの配列
   * @param count 選択するタスク数
   * @returns 選択されたタスクの配列
   */
  private selectRandomTasks(tasks: TaskWithAction[], count: number): TaskWithAction[] {
    const shuffled = [...tasks].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }

  /**
   * 「このまま行く」モードでタスクを選択する
   *
   * 2/3を同じ・隣接アクションから、1/3を古い10件からランダム
   *
   * @param tasks タスクの配列
   * @param count 選択するタスク数
   * @returns 選択されたタスクの配列
   */
  private selectStayOnTrackTasks(tasks: TaskWithAction[], count: number): TaskWithAction[] {
    if (tasks.length === 0 || count === 0) {
      return [];
    }

    // 最近完了したタスクのアクションIDを取得（同じ・隣接アクションの判定に使用）
    // 簡略化のため、最初のタスクのアクションを基準とする
    const recentActionId = tasks[0].actionId;
    const recentSubGoalId = tasks[0].action.subGoalId;
    const recentPosition = tasks[0].action.position;

    // 同じ・隣接アクションのタスクを抽出
    const sameOrAdjacentTasks = tasks.filter(task => {
      // 同じアクション
      if (task.actionId === recentActionId) {
        return true;
      }
      // 同じサブ目標内の隣接アクション（position ± 1）
      if (task.action.subGoalId === recentSubGoalId) {
        const positionDiff = Math.abs(task.action.position - recentPosition);
        return positionDiff === 1;
      }
      return false;
    });

    // 古い10件を取得（createdAtでソート済み）
    const oldest10 = tasks.slice(0, Math.min(10, tasks.length));

    // 2/3を同じ・隣接アクションから選択
    const twoThirds = Math.ceil((count * 2) / 3);
    const oneThird = count - twoThirds;

    const selectedFromSameOrAdjacent = this.selectRandomTasks(
      sameOrAdjacentTasks.length > 0 ? sameOrAdjacentTasks : oldest10,
      twoThirds
    );

    // 1/3を古い10件からランダム選択（既に選択されたタスクを除外）
    const selectedIds = new Set(selectedFromSameOrAdjacent.map(t => t.id));
    const remainingOldest10 = oldest10.filter(t => !selectedIds.has(t.id));
    const selectedFromOldest = this.selectRandomTasks(remainingOldest10, oneThird);

    return [...selectedFromSameOrAdjacent, ...selectedFromOldest];
  }

  /**
   * 「気分を変える」モードでタスクを選択する
   *
   * 全て古い10件からランダム
   *
   * @param tasks タスクの配列
   * @param count 選択するタスク数
   * @returns 選択されたタスクの配列
   */
  private selectChangePaceTasks(tasks: TaskWithAction[], count: number): TaskWithAction[] {
    if (tasks.length === 0 || count === 0) {
      return [];
    }

    // 古い10件を取得（createdAtでソート済み）
    const oldest10 = tasks.slice(0, Math.min(10, tasks.length));

    // 古い10件からランダムに選択
    return this.selectRandomTasks(oldest10, count);
  }
}
