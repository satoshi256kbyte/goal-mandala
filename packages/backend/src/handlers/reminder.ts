/**
 * Reminder Lambda Function
 *
 * Orchestrates the reminder process for all users.
 * Triggered by EventBridge at 10:00 AM JST on weekdays.
 *
 * Requirements: 1.1-1.5, 6.1, 6.4, 7.1-7.5, 8.1-8.4
 */

import { EventBridgeEvent } from 'aws-lambda';
import { PrismaClient, GoalStatus } from '../generated/prisma-client';
import { TaskSelectorService } from '../services/task-selector.service.js';
import { emailService, ReminderEmailData } from '../services/email.service.js';
import { CloudWatchClient, PutMetricDataCommand } from '@aws-sdk/client-cloudwatch';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';

/**
 * Reminder Lambda result
 */
export interface ReminderResult {
  totalUsers: number;
  emailsSent: number;
  emailsFailed: number;
  processingTimeMs: number;
}

/**
 * Error types for classification
 */
enum ErrorType {
  TRANSIENT = 'TRANSIENT',
  PERMANENT = 'PERMANENT',
  CRITICAL = 'CRITICAL',
}

/**
 * Reminder Lambda Handler
 */
export class ReminderLambdaHandler {
  private prisma: PrismaClient;
  private taskSelector: TaskSelectorService;
  private cloudWatch: CloudWatchClient;
  private sns: SNSClient;
  private readonly BATCH_SIZE = 100;
  private readonly FRONTEND_URL: string;
  private readonly SNS_TOPIC_ARN: string;
  private readonly AWS_REGION: string;

  constructor() {
    this.prisma = new PrismaClient();
    this.taskSelector = new TaskSelectorService(this.prisma);
    this.AWS_REGION = process.env.AWS_REGION || 'ap-northeast-1';
    this.cloudWatch = new CloudWatchClient({ region: this.AWS_REGION });
    this.sns = new SNSClient({ region: this.AWS_REGION });
    this.FRONTEND_URL = process.env.FRONTEND_URL || 'https://goal-mandala.com';
    this.SNS_TOPIC_ARN = process.env.SNS_TOPIC_ARN || '';
  }

  /**
   * Main handler function
   *
   * Requirements: 1.1, 6.1, 6.4
   */
  async handler(event: EventBridgeEvent<string, unknown>): Promise<ReminderResult> {
    const startTime = Date.now();

    console.log('Reminder Lambda started', {
      time: event.time,
      region: event.region,
    });

    try {
      // Process all users
      const result = await this.processAllUsers();

      // Calculate processing time
      const processingTimeMs = Date.now() - startTime;
      result.processingTimeMs = processingTimeMs;

      // Log completion
      console.log('Reminder Lambda completed', result);

      // Publish metrics
      await this.publishMetrics(result);

      // Check if processing time exceeded limit (5 minutes = 300,000 ms)
      if (processingTimeMs > 300000) {
        console.warn('Processing time exceeded 5 minutes', {
          processingTimeMs,
          limit: 300000,
        });
      }

      return result;
    } catch (error) {
      console.error('Reminder Lambda failed', error);

      // Alert operations team
      await this.alertOperations(error as Error);

      throw error;
    } finally {
      // Disconnect Prisma
      await this.prisma.$disconnect();
    }
  }

  /**
   * Process all eligible users
   *
   * Requirements: 1.1, 6.4
   */
  private async processAllUsers(): Promise<ReminderResult> {
    let totalUsers = 0;
    let emailsSent = 0;
    let emailsFailed = 0;

    // Get all active users with active goals
    const users = await this.getEligibleUsers();
    totalUsers = users.length;

    console.log(`Processing ${totalUsers} eligible users`);

    // Process users in batches
    for (let i = 0; i < users.length; i += this.BATCH_SIZE) {
      const batch = users.slice(i, i + this.BATCH_SIZE);

      // Process batch in parallel
      const results = await Promise.allSettled(batch.map(user => this.processUser(user.id)));

      // Count successes and failures
      for (const result of results) {
        if (result.status === 'fulfilled') {
          if (result.value) {
            emailsSent++;
          }
        } else {
          emailsFailed++;
          console.error('User processing failed', {
            error: result.reason,
          });
        }
      }
    }

    return {
      totalUsers,
      emailsSent,
      emailsFailed,
      processingTimeMs: 0, // Will be set by handler
    };
  }

  /**
   * Get eligible users for reminders
   *
   * Requirements: 7.1-7.5
   */
  private async getEligibleUsers(): Promise<Array<{ id: string; email: string; name: string }>> {
    // Get users with:
    // 1. Active goals
    // 2. Reminder preference enabled (or not set, default to enabled)
    // 3. Not unsubscribed
    const users = await this.prisma.user.findMany({
      where: {
        goals: {
          some: {
            status: GoalStatus.ACTIVE,
          },
        },
        userReminderPreference: {
          OR: [
            { enabled: true },
            { enabled: null }, // Default to enabled if not set
          ],
          unsubscribedAt: null,
        },
      },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    return users;
  }

  /**
   * Process a single user
   *
   * Requirements: 1.1-1.3, 7.1-7.5
   */
  private async processUser(userId: string): Promise<boolean> {
    try {
      // Get user details
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          userReminderPreference: true,
        },
      });

      if (!user) {
        console.warn('User not found', { userId });
        return false;
      }

      // Get user's active goals
      const goals = await this.prisma.goal.findMany({
        where: {
          userId,
          status: GoalStatus.ACTIVE,
        },
      });

      if (goals.length === 0) {
        console.info('No active goals for user', { userId });
        return false;
      }

      // Process each goal
      let emailSent = false;
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
          console.info('No tasks for user goal', { userId, goalId: goal.id });
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

        if (result.success) {
          emailSent = true;
          console.info('Reminder email sent', {
            userId,
            goalId: goal.id,
            taskCount: tasks.length,
            messageId: result.messageId,
          });
        } else {
          console.error('Reminder email failed', {
            userId,
            goalId: goal.id,
            error: result.error,
          });
        }

        // Update habit task reminder tracking
        await this.updateHabitTaskTracking(tasks);
      }

      return emailSent;
    } catch (error) {
      // Handle error
      await this.handleError(error as Error, userId);
      throw error;
    }
  }

  /**
   * Log reminder delivery
   *
   * Requirements: 1.3, 8.1-8.3
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
          retryCount: 0, // Email service handles retries internally
        },
      });
    } catch (error) {
      console.error('Failed to log reminder', { userId, error });
      // Don't throw - logging failure shouldn't stop processing
    }
  }

  /**
   * Update habit task reminder tracking
   *
   * Requirements: 5.2-5.4
   */
  private async updateHabitTaskTracking(tasks: Array<{ id: string; type: string }>): Promise<void> {
    const habitTasks = tasks.filter(task => task.type === 'HABIT');

    if (habitTasks.length === 0) {
      return;
    }

    const now = new Date();
    const weekNumber = this.getISOWeekNumber(now);

    for (const task of habitTasks) {
      try {
        // Upsert habit task reminder tracking
        await this.prisma.habitTaskReminderTracking.upsert({
          where: { taskId: task.id },
          update: {
            lastRemindedAt: now,
            reminderCount: { increment: 1 },
            weekNumber,
          },
          create: {
            taskId: task.id,
            lastRemindedAt: now,
            reminderCount: 1,
            weekNumber,
          },
        });
      } catch (error) {
        console.error('Failed to update habit task tracking', {
          taskId: task.id,
          error,
        });
        // Don't throw - tracking failure shouldn't stop processing
      }
    }
  }

  /**
   * Get ISO week number
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
   * Handle errors
   *
   * Requirements: 1.4, 1.5
   */
  private async handleError(error: Error, userId: string): Promise<void> {
    const errorType = this.classifyError(error);

    switch (errorType) {
      case ErrorType.TRANSIENT:
        console.warn('Transient error, will retry on next invocation', {
          userId,
          error: error.message,
        });
        break;

      case ErrorType.PERMANENT:
        console.warn('Permanent error, skipping user', {
          userId,
          error: error.message,
        });
        break;

      case ErrorType.CRITICAL:
        console.error('Critical error', {
          userId,
          error: error.message,
        });
        await this.alertOperations(error);
        break;
    }
  }

  /**
   * Classify error type
   */
  private classifyError(error: Error): ErrorType {
    const message = error.message.toLowerCase();

    // Transient errors (retry)
    if (
      message.includes('timeout') ||
      message.includes('throttl') ||
      message.includes('connection') ||
      message.includes('network')
    ) {
      return ErrorType.TRANSIENT;
    }

    // Permanent errors (skip)
    if (
      message.includes('not found') ||
      message.includes('invalid email') ||
      message.includes('no tasks')
    ) {
      return ErrorType.PERMANENT;
    }

    // Critical errors (alert)
    return ErrorType.CRITICAL;
  }

  /**
   * Publish metrics to CloudWatch
   *
   * Requirements: 8.4
   */
  private async publishMetrics(result: ReminderResult): Promise<void> {
    try {
      const command = new PutMetricDataCommand({
        Namespace: 'GoalMandala/Reminders',
        MetricData: [
          {
            MetricName: 'EmailsSent',
            Value: result.emailsSent,
            Unit: 'Count',
            Timestamp: new Date(),
          },
          {
            MetricName: 'EmailsFailed',
            Value: result.emailsFailed,
            Unit: 'Count',
            Timestamp: new Date(),
          },
          {
            MetricName: 'ProcessingTime',
            Value: result.processingTimeMs,
            Unit: 'Milliseconds',
            Timestamp: new Date(),
          },
          {
            MetricName: 'FailureRate',
            Value: result.totalUsers > 0 ? (result.emailsFailed / result.totalUsers) * 100 : 0,
            Unit: 'Percent',
            Timestamp: new Date(),
          },
        ],
      });

      await this.cloudWatch.send(command);
    } catch (error) {
      console.error('Failed to publish metrics', error);
      // Don't throw - metrics failure shouldn't stop processing
    }
  }

  /**
   * Alert operations team
   *
   * Requirements: 1.5
   */
  private async alertOperations(error: Error): Promise<void> {
    if (!this.SNS_TOPIC_ARN) {
      console.warn('SNS_TOPIC_ARN not configured, skipping alert');
      return;
    }

    try {
      const command = new PublishCommand({
        TopicArn: this.SNS_TOPIC_ARN,
        Subject: 'Reminder Lambda Critical Error',
        Message: JSON.stringify(
          {
            error: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString(),
          },
          null,
          2
        ),
      });

      await this.sns.send(command);
    } catch (alertError) {
      console.error('Failed to send alert', alertError);
      // Don't throw - alert failure shouldn't stop processing
    }
  }
}

// Lambda handler function
const handlerInstance = new ReminderLambdaHandler();

export const handler = async (
  event: EventBridgeEvent<string, unknown>
): Promise<ReminderResult> => {
  return handlerInstance.handler(event);
};
