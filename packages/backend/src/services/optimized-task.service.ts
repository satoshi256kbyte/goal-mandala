import { PrismaClient, Task, TaskStatus } from '../generated/prisma-client';
import { TaskFilters } from './task.service';
import { cacheService, CacheService } from './cache.service';

export class OptimizedTaskService {
  constructor(private prisma: PrismaClient) {}

  async getTasks(userId: string, filters?: TaskFilters): Promise<Task[]> {
    const cacheKey = CacheService.keys.tasks(userId, JSON.stringify(filters));
    const cached = cacheService.get<Task[]>(cacheKey);
    if (cached) return cached;

    const where = this.buildWhereClause(userId, filters);

    const tasks = await this.prisma.task.findMany({
      where,
      include: {
        action: {
          select: { id: true, title: true, subGoal: { select: { id: true, title: true } } },
        },
      },
      orderBy: [{ status: 'asc' }, { deadline: 'asc' }, { createdAt: 'desc' }],
    });

    cacheService.set(cacheKey, tasks, 300); // 5 minutes
    return tasks;
  }

  async updateTaskStatus(taskId: string, status: TaskStatus): Promise<Task> {
    const result = await this.prisma.$transaction(async tx => {
      const task = await tx.task.update({
        where: { id: taskId },
        data: {
          status,
          completedAt: status === 'completed' ? new Date() : undefined,
          updatedAt: new Date(),
        },
        include: {
          action: {
            include: {
              subGoal: {
                include: { goal: true },
              },
            },
          },
        },
      });

      // Record history
      await tx.taskHistory.create({
        data: {
          taskId,
          oldStatus: task.status,
          newStatus: status,
          userId: task.action.subGoal.goal.userId,
        },
      });

      return task;
    });

    // Invalidate related caches
    this.invalidateTaskCaches(result.action.subGoal.goal.userId);

    return result;
  }

  async bulkUpdateStatus(taskIds: string[], status: TaskStatus): Promise<void> {
    await this.prisma.$transaction(async tx => {
      // Get tasks for history
      const tasks = await tx.task.findMany({
        where: { id: { in: taskIds } },
        include: {
          action: {
            include: {
              subGoal: { include: { goal: true } },
            },
          },
        },
      });

      // Update tasks
      await tx.task.updateMany({
        where: { id: { in: taskIds } },
        data: {
          status,
          completedAt: status === 'completed' ? new Date() : undefined,
          updatedAt: new Date(),
        },
      });

      // Create history entries
      await tx.taskHistory.createMany({
        data: tasks.map(task => ({
          taskId: task.id,
          oldStatus: task.status,
          newStatus: status,
          userId: task.action.subGoal.goal.userId,
        })),
      });

      // Invalidate caches for all affected users
      const userIds = [...new Set(tasks.map(t => t.action.subGoal.goal.userId))];
      userIds.forEach(userId => this.invalidateTaskCaches(userId));
    });
  }

  private buildWhereClause(userId: string, filters?: TaskFilters) {
    const where: {
      action: {
        subGoal: {
          goal: { userId: string };
        };
      };
      status?: { in: TaskStatus[] } | { not: TaskStatus };
      actionId?: { in: string[] };
      deadline?: { gte?: Date; lt?: Date; lte?: Date };
    } = {
      action: {
        subGoal: {
          goal: { userId },
        },
      },
    };

    if (filters?.statuses?.length) {
      where.status = { in: filters.statuses };
    }

    if (filters?.actionIds?.length) {
      where.actionId = { in: filters.actionIds };
    }

    if (filters?.deadlineRange) {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      switch (filters.deadlineRange) {
        case 'today':
          where.deadline = {
            gte: today,
            lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
          };
          break;
        case 'this_week':
          where.deadline = {
            gte: today,
            lte: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000),
          };
          break;
        case 'overdue':
          where.deadline = { lt: now };
          where.status = { not: 'completed' };
          break;
      }
    }

    return where;
  }

  private invalidateTaskCaches(userId: string): void {
    // Clear all task-related caches for user
    const patterns = [CacheService.keys.tasks(userId), CacheService.keys.savedViews(userId)];

    patterns.forEach(pattern => {
      cacheService.delete(pattern);
    });
  }
}
