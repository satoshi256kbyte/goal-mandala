/**
 * Reminder Test Handler
 *
 * Provides testing functionality for the reminder system.
 * Allows manual triggering and email preview for development and testing.
 *
 * Requirements: 10.1, 10.2
 */

import { Context } from 'hono';
import { PrismaClient, GoalStatus } from '../generated/prisma-client';
import { TaskSelectorService } from '../services/task-selector.service.js';
import { emailService, ReminderEmailData } from '../services/email.service.js';
import { z } from 'zod';

/**
 * Manual trigger request schema
 */
const ManualTriggerSchema = z.object({
  userId: z.string().uuid(),
  goalId: z.string().uuid().optional(),
});

/**
 * Email preview request schema
 */
const EmailPreviewSchema = z.object({
  userId: z.string().uuid().optional(),
  taskCount: z.number().int().min(1).max(10).default(3),
});

/**
 * Reminder Test Handler
 */
export class ReminderTestHandler {
  private prisma: PrismaClient;
  private taskSelector: TaskSelectorService;
  private readonly FRONTEND_URL: string;

  constructor() {
    this.prisma = new PrismaClient();
    this.taskSelector = new TaskSelectorService(this.prisma);
    this.FRONTEND_URL = process.env.FRONTEND_URL || 'https://goal-mandala.com';
  }

  /**
   * Manual trigger for specific user
   *
   * POST /api/reminders/test/trigger
   *
   * Requirements: 10.1
   */
  async manualTrigger(c: Context): Promise<Response> {
    try {
      // Parse and validate request body
      const body = await c.req.json();
      const { userId, goalId } = ManualTriggerSchema.parse(body);

      // Get user details
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          userReminderPreference: true,
        },
      });

      if (!user) {
        return c.json(
          {
            success: false,
            error: 'User not found',
          },
          404
        );
      }

      // Get user's active goals
      const goals = await this.prisma.goal.findMany({
        where: {
          userId,
          status: GoalStatus.ACTIVE,
          ...(goalId ? { id: goalId } : {}),
        },
      });

      if (goals.length === 0) {
        return c.json(
          {
            success: false,
            error: 'No active goals found for user',
          },
          404
        );
      }

      // Process each goal
      const results = [];
      for (const goal of goals) {
        // Get mood preference
        const moodPreference = user.userReminderPreference?.moodPreference || null;

        // Select tasks for reminder
        const tasks = await this.taskSelector.selectTasksForReminder(
          userId,
          goal.id,
          moodPreference
        );

        if (tasks.length === 0) {
          results.push({
            goalId: goal.id,
            goalTitle: goal.title,
            success: false,
            error: 'No tasks available for reminder',
          });
          continue;
        }

        // Send reminder email
        const emailData: ReminderEmailData = {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
          },
          tasks: tasks.map(task => ({
            id: task.id,
            title: task.title,
            estimatedMinutes: task.estimatedMinutes,
          })),
          goal: {
            id: goal.id,
            title: goal.title,
          },
          frontendUrl: this.FRONTEND_URL,
        };

        const result = await emailService.sendReminderEmail(emailData);

        // Log reminder
        await this.logReminder(
          userId,
          tasks.map(t => t.id),
          result
        );

        results.push({
          goalId: goal.id,
          goalTitle: goal.title,
          success: result.success,
          messageId: result.messageId,
          error: result.error,
          taskCount: tasks.length,
        });
      }

      return c.json({
        success: true,
        userId,
        results,
      });
    } catch (error) {
      console.error('Manual trigger failed', error);

      if (error instanceof z.ZodError) {
        return c.json(
          {
            success: false,
            error: 'Invalid request',
            details: error.errors,
          },
          400
        );
      }

      return c.json(
        {
          success: false,
          error: 'Internal server error',
        },
        500
      );
    }
  }

  /**
   * Email preview function
   *
   * POST /api/reminders/test/preview
   *
   * Requirements: 10.2
   */
  async emailPreview(c: Context): Promise<Response> {
    try {
      // Parse and validate request body
      const body = await c.req.json();
      const { userId, taskCount } = EmailPreviewSchema.parse(body);

      // Generate sample data
      const sampleData = await this.generateSampleData(userId, taskCount);

      // Generate email HTML
      const emailHtml = await emailService.generateEmailHtml(sampleData);

      return c.json({
        success: true,
        preview: {
          to: sampleData.user.email,
          subject: `今日のタスクリマインド - ${sampleData.goal.title}`,
          html: emailHtml,
          data: sampleData,
        },
      });
    } catch (error) {
      console.error('Email preview failed', error);

      if (error instanceof z.ZodError) {
        return c.json(
          {
            success: false,
            error: 'Invalid request',
            details: error.errors,
          },
          400
        );
      }

      return c.json(
        {
          success: false,
          error: 'Internal server error',
        },
        500
      );
    }
  }

  /**
   * Generate sample data for email preview
   */
  private async generateSampleData(
    userId: string | undefined,
    taskCount: number
  ): Promise<ReminderEmailData> {
    if (userId) {
      // Use real user data
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new Error('User not found');
      }

      const goal = await this.prisma.goal.findFirst({
        where: {
          userId,
          status: GoalStatus.ACTIVE,
        },
      });

      if (!goal) {
        throw new Error('No active goals found');
      }

      const tasks = await this.prisma.task.findMany({
        where: {
          action: {
            subGoal: {
              goalId: goal.id,
            },
          },
          status: 'NOT_STARTED',
        },
        take: taskCount,
      });

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
        tasks: tasks.map(task => ({
          id: task.id,
          title: task.title,
          estimatedMinutes: task.estimatedMinutes,
        })),
        goal: {
          id: goal.id,
          title: goal.title,
        },
        frontendUrl: this.FRONTEND_URL,
      };
    }

    // Generate sample data
    return {
      user: {
        id: 'sample-user-id',
        email: 'sample@example.com',
        name: 'サンプルユーザー',
      },
      tasks: Array.from({ length: taskCount }, (_, i) => ({
        id: `sample-task-${i + 1}`,
        title: `サンプルタスク ${i + 1}`,
        estimatedMinutes: 30 + i * 15,
      })),
      goal: {
        id: 'sample-goal-id',
        title: 'サンプル目標',
      },
      frontendUrl: this.FRONTEND_URL,
    };
  }

  /**
   * Log reminder delivery
   */
  private async logReminder(
    userId: string,
    taskIds: string[],
    result: { messageId: string; success: boolean; error?: string }
  ): Promise<void> {
    try {
      await this.prisma.reminderLog.create({
        data: {
          userId,
          sentAt: new Date(),
          taskIds,
          emailStatus: result.success ? 'sent' : 'failed',
          messageId: result.success ? result.messageId : undefined,
          errorMessage: result.error,
          retryCount: 0,
        },
      });
    } catch (error) {
      console.error('Failed to log reminder', { userId, error });
      // Don't throw - logging failure shouldn't stop processing
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    await this.prisma.$disconnect();
  }
}

// Export handler instance
export const reminderTestHandler = new ReminderTestHandler();
