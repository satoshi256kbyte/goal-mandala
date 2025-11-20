import { PrismaClient, TaskStatus, Task, TaskNote, TaskHistory } from '../generated/prisma-client';

/**
 * タスクフィルター
 */
export interface TaskFilters {
  statuses?: TaskStatus[];
  deadlineRange?: 'today' | 'this_week' | 'overdue' | 'custom';
  customDeadlineStart?: Date;
  customDeadlineEnd?: Date;
  actionIds?: string[];
}

/**
 * タスクサービスインターフェース
 */
export interface ITaskService {
  /**
   * ユーザーのタスク一覧を取得
   */
  getTasks(userId: string, filters?: TaskFilters): Promise<Task[]>;

  /**
   * タスク詳細を取得
   */
  getTaskById(taskId: string): Promise<Task | null>;

  /**
   * タスク状態を更新
   */
  updateTaskStatus(taskId: string, status: TaskStatus, userId: string): Promise<Task>;

  /**
   * 一括状態更新
   */
  bulkUpdateStatus(taskIds: string[], status: TaskStatus, userId: string): Promise<void>;

  /**
   * 一括削除
   */
  bulkDelete(taskIds: string[], userId: string): Promise<void>;

  /**
   * ノートを追加
   */
  addNote(taskId: string, content: string, userId: string): Promise<TaskNote>;

  /**
   * ノートを更新
   */
  updateNote(noteId: string, content: string, userId: string): Promise<TaskNote>;

  /**
   * ノートを削除
   */
  deleteNote(noteId: string, userId: string): Promise<void>;

  /**
   * タスク履歴を取得
   */
  getTaskHistory(taskId: string): Promise<TaskHistory[]>;
}

/**
 * タスクサービス実装
 */
export class TaskService implements ITaskService {
  private prisma: PrismaClient;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || new PrismaClient();
  }

  /**
   * ユーザーのタスク一覧を取得
   */
  async getTasks(userId: string, filters?: TaskFilters): Promise<Task[]> {
    // フィルター条件を構築
    const where: {
      action: {
        subGoal: {
          goal: {
            userId: string;
          };
        };
      };
      status?: { in: TaskStatus[] };
      deadline?: { gte?: Date; lte?: Date; lt?: Date };
      actionId?: { in: string[] };
    } = {
      action: {
        subGoal: {
          goal: {
            userId,
          },
        },
      },
    };

    // 状態フィルター
    if (filters?.statuses && filters.statuses.length > 0) {
      where.status = { in: filters.statuses };
    }

    // 期限フィルター
    if (filters?.deadlineRange) {
      const now = new Date();

      switch (filters.deadlineRange) {
        case 'today': {
          const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
          where.deadline = {
            gte: startOfDay,
            lte: endOfDay,
          };
          break;
        }
        case 'this_week': {
          const startOfWeek = new Date(now);
          startOfWeek.setDate(now.getDate() - now.getDay());
          startOfWeek.setHours(0, 0, 0, 0);

          const endOfWeek = new Date(startOfWeek);
          endOfWeek.setDate(startOfWeek.getDate() + 6);
          endOfWeek.setHours(23, 59, 59, 999);

          where.deadline = {
            gte: startOfWeek,
            lte: endOfWeek,
          };
          break;
        }
        case 'overdue': {
          where.deadline = {
            lt: now,
          };
          where.status = {
            not: TaskStatus.COMPLETED,
          };
          break;
        }
        case 'custom': {
          if (filters.customDeadlineStart && filters.customDeadlineEnd) {
            where.deadline = {
              gte: filters.customDeadlineStart,
              lte: filters.customDeadlineEnd,
            };
          }
          break;
        }
      }
    }

    // アクションIDフィルター
    if (filters?.actionIds && filters.actionIds.length > 0) {
      where.actionId = { in: filters.actionIds };
    }

    // タスクを取得（関連データも含む）
    const tasks = await this.prisma.task.findMany({
      where,
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
      orderBy: [{ deadline: 'asc' }, { createdAt: 'asc' }],
    });

    return tasks;
  }

  /**
   * タスク詳細を取得
   */
  async getTaskById(taskId: string): Promise<Task | null> {
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
        notes: {
          orderBy: { createdAt: 'asc' },
        },
        history: {
          orderBy: { changedAt: 'desc' },
        },
      },
    });

    return task;
  }

  /**
   * タスク状態を更新
   */
  async updateTaskStatus(taskId: string, status: TaskStatus, userId: string): Promise<Task> {
    // 現在のタスク状態を取得
    const currentTask = await this.prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!currentTask) {
      throw new Error('Task not found');
    }

    // トランザクション内で更新
    return await this.prisma.$transaction(async tx => {
      // タスク状態を更新
      const updateData: {
        status: TaskStatus;
        updatedAt: Date;
        completedAt?: Date;
      } = {
        status,
        updatedAt: new Date(),
      };

      // 完了状態の場合、完了時刻を記録
      if (status === TaskStatus.COMPLETED && !currentTask.completedAt) {
        updateData.completedAt = new Date();
      }

      const updatedTask = await tx.task.update({
        where: { id: taskId },
        data: updateData,
      });

      // タスク履歴を記録
      await tx.taskHistory.create({
        data: {
          taskId,
          userId,
          oldStatus: currentTask.status,
          newStatus: status,
          changedAt: new Date(),
        },
      });

      return updatedTask;
    });
  }

  /**
   * 一括状態更新
   */
  async bulkUpdateStatus(taskIds: string[], status: TaskStatus, userId: string): Promise<void> {
    // 現在のタスク状態を取得
    const currentTasks = await this.prisma.task.findMany({
      where: { id: { in: taskIds } },
      select: { id: true, status: true, completedAt: true },
    });

    // トランザクション内で更新
    await this.prisma.$transaction(async tx => {
      // タスク状態を一括更新
      const updateData: {
        status: TaskStatus;
        updatedAt: Date;
        completedAt?: Date;
      } = {
        status,
        updatedAt: new Date(),
      };

      // 完了状態の場合、完了時刻を記録
      if (status === TaskStatus.COMPLETED) {
        updateData.completedAt = new Date();
      }

      await tx.task.updateMany({
        where: { id: { in: taskIds } },
        data: updateData,
      });

      // タスク履歴を一括作成
      const historyData = currentTasks.map(task => ({
        taskId: task.id,
        userId,
        oldStatus: task.status,
        newStatus: status,
        changedAt: new Date(),
      }));

      await tx.taskHistory.createMany({
        data: historyData,
      });
    });
  }

  /**
   * 一括削除
   */
  async bulkDelete(taskIds: string[], userId: string): Promise<void> {
    // タスクの所有者確認
    const tasks = await this.prisma.task.findMany({
      where: { id: { in: taskIds } },
      include: {
        action: {
          include: {
            subGoal: {
              include: {
                goal: {
                  select: { userId: true },
                },
              },
            },
          },
        },
      },
    });

    // 全てのタスクが指定ユーザーのものか確認
    const allOwnedByUser = tasks.every(task => task.action.subGoal.goal.userId === userId);

    if (!allOwnedByUser) {
      throw new Error('Unauthorized: Cannot delete tasks owned by other users');
    }

    // タスクを削除（カスケード削除により関連データも削除される）
    await this.prisma.task.deleteMany({
      where: { id: { in: taskIds } },
    });
  }

  /**
   * ノートを追加
   */
  async addNote(taskId: string, content: string, userId: string): Promise<TaskNote> {
    const note = await this.prisma.taskNote.create({
      data: {
        taskId,
        userId,
        content,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return note;
  }

  /**
   * ノートを更新
   */
  async updateNote(noteId: string, content: string, userId: string): Promise<TaskNote> {
    // ノートの所有者確認
    const existingNote = await this.prisma.taskNote.findUnique({
      where: { id: noteId },
    });

    if (!existingNote) {
      throw new Error('Note not found');
    }

    if (existingNote.userId !== userId) {
      throw new Error('Unauthorized: Cannot update note owned by other user');
    }

    const note = await this.prisma.taskNote.update({
      where: { id: noteId },
      data: {
        content,
        updatedAt: new Date(),
      },
    });

    return note;
  }

  /**
   * ノートを削除
   */
  async deleteNote(noteId: string, userId: string): Promise<void> {
    // ノートの所有者確認
    const existingNote = await this.prisma.taskNote.findUnique({
      where: { id: noteId },
    });

    if (!existingNote) {
      throw new Error('Note not found');
    }

    if (existingNote.userId !== userId) {
      throw new Error('Unauthorized: Cannot delete note owned by other user');
    }

    await this.prisma.taskNote.delete({
      where: { id: noteId },
    });
  }

  /**
   * タスク履歴を取得
   */
  async getTaskHistory(taskId: string): Promise<TaskHistory[]> {
    const history = await this.prisma.taskHistory.findMany({
      where: { taskId },
      orderBy: { changedAt: 'desc' },
    });

    return history;
  }

  /**
   * Prismaクライアントを閉じる
   */
  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}
