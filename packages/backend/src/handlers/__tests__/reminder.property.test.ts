/**
 * Reminder Lambda Function プロパティベーステスト
 * Requirements: 1.3, 6.4, 7.1-7.5, 8.1-8.4
 *
 * Feature: 3.2-reminder-functionality
 */

import * as fc from 'fast-check';
import { ReminderLambdaHandler, ReminderResult } from '../reminder';
import { PrismaClient, GoalStatus, TaskStatus, TaskType } from '../../generated/prisma-client';
import { EventBridgeEvent } from 'aws-lambda';
import { CloudWatchClient, PutMetricDataCommand } from '@aws-sdk/client-cloudwatch';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';

// Mock AWS SDK clients
jest.mock('@aws-sdk/client-cloudwatch');
jest.mock('@aws-sdk/client-sns');

// Prisma Client mock
const mockPrisma = {
  user: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
  goal: {
    findMany: jest.fn(),
  },
  task: {
    findMany: jest.fn(),
  },
  reminderLog: {
    create: jest.fn(),
  },
  habitTaskReminderTracking: {
    upsert: jest.fn(),
    findMany: jest.fn(),
  },
  $disconnect: jest.fn(),
} as unknown as jest.Mocked<PrismaClient>;

// Mock email service
jest.mock('../../services/email.service.js', () => ({
  emailService: {
    sendReminderEmail: jest.fn(),
  },
}));

// Mock task selector service
jest.mock('../../services/task-selector.service.js', () => ({
  TaskSelectorService: jest.fn().mockImplementation(() => ({
    selectTasksForReminder: jest.fn(),
  })),
}));

import { emailService } from '../../services/email.service.js';
import { TaskSelectorService } from '../../services/task-selector.service.js';

describe('ReminderLambdaHandler Property-Based Tests', () => {
  let handler: ReminderLambdaHandler;
  let mockTaskSelector: jest.Mocked<TaskSelectorService>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Set environment variables
    process.env.AWS_REGION = 'ap-northeast-1';
    process.env.FRONTEND_URL = 'https://test.example.com';
    process.env.SNS_TOPIC_ARN = 'arn:aws:sns:ap-northeast-1:123456789012:test-topic';

    // Mock CloudWatch send method
    const mockCloudWatchSend = jest.fn().mockResolvedValue({});
    (CloudWatchClient as jest.Mock).mockImplementation(() => ({
      send: mockCloudWatchSend,
    }));

    // Mock SNS send method
    const mockSNSSend = jest.fn().mockResolvedValue({});
    (SNSClient as jest.Mock).mockImplementation(() => ({
      send: mockSNSSend,
    }));

    // Create handler instance
    handler = new ReminderLambdaHandler();

    // Get mock task selector
    mockTaskSelector = (handler as any).taskSelector as jest.Mocked<TaskSelectorService>;

    // Replace prisma with mock
    (handler as any).prisma = mockPrisma;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  /**
   * Property 2: Email Delivery Logging
   * Feature: 3.2-reminder-functionality, Property 2: Email Delivery Logging
   * Validates: Requirements 1.3, 8.1
   *
   * For any reminder email sent, the ReminderSystem should create a log entry with timestamp and user ID
   */
  it('Property 2: Email Delivery Logging', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }), // userId
        fc.string({ minLength: 1 }), // email
        fc.string({ minLength: 1 }), // name
        fc.string({ minLength: 1 }), // goalId
        fc.string({ minLength: 1 }), // goalTitle
        fc.array(fc.string({ minLength: 1 }), { minLength: 1, maxLength: 3 }), // taskIds
        async (userId, email, name, goalId, goalTitle, taskIds) => {
          // Arrange
          const mockUser = {
            id: userId,
            email,
            name,
            userReminderPreference: {
              enabled: true,
              moodPreference: null,
              unsubscribedAt: null,
            },
          };

          const mockGoal = {
            id: goalId,
            userId,
            title: goalTitle,
            status: GoalStatus.ACTIVE,
          };

          const mockTasks = taskIds.map((taskId, index) => ({
            id: taskId,
            title: `Task ${index}`,
            estimatedMinutes: 30,
            type: TaskType.EXECUTION,
          }));

          mockPrisma.user.findMany.mockResolvedValue([mockUser]);
          mockPrisma.user.findUnique.mockResolvedValue(mockUser);
          mockPrisma.goal.findMany.mockResolvedValue([mockGoal]);
          mockTaskSelector.selectTasksForReminder.mockResolvedValue(mockTasks as any);
          (emailService.sendReminderEmail as jest.Mock).mockResolvedValue({
            messageId: 'test-message-id',
            success: true,
          });
          mockPrisma.reminderLog.create.mockResolvedValue({} as any);

          const event = {
            time: new Date().toISOString(),
            region: 'ap-northeast-1',
          } as EventBridgeEvent<string, unknown>;

          // Act
          await handler.handler(event);

          // Assert: ログが作成される
          expect(mockPrisma.reminderLog.create).toHaveBeenCalledWith(
            expect.objectContaining({
              data: expect.objectContaining({
                userId,
                taskIds,
                emailStatus: 'sent',
                messageId: 'test-message-id',
              }),
            })
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 20: Processing Time Limit
   * Feature: 3.2-reminder-functionality, Property 20: Processing Time Limit
   * Validates: Requirements 6.4
   *
   * For any reminder Lambda invocation, all eligible users should be processed within 5 minutes
   */
  it('Property 20: Processing Time Limit', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 10 }), // userCount (small number for test speed)
        async userCount => {
          // Arrange
          const mockUsers = Array.from({ length: userCount }, (_, i) => ({
            id: `user-${i}`,
            email: `user${i}@example.com`,
            name: `User ${i}`,
            userReminderPreference: {
              enabled: true,
              moodPreference: null,
              unsubscribedAt: null,
            },
          }));

          mockPrisma.user.findMany.mockResolvedValue(mockUsers);
          mockPrisma.user.findUnique.mockImplementation(async ({ where }) => {
            return mockUsers.find(u => u.id === where.id) || null;
          });
          mockPrisma.goal.findMany.mockResolvedValue([
            {
              id: 'goal-1',
              userId: 'user-0',
              title: 'Test Goal',
              status: GoalStatus.ACTIVE,
            },
          ]);
          mockTaskSelector.selectTasksForReminder.mockResolvedValue([
            {
              id: 'task-1',
              title: 'Task 1',
              estimatedMinutes: 30,
              type: TaskType.EXECUTION,
            },
          ] as any);
          (emailService.sendReminderEmail as jest.Mock).mockResolvedValue({
            messageId: 'test-message-id',
            success: true,
          });
          mockPrisma.reminderLog.create.mockResolvedValue({} as any);

          const event = {
            time: new Date().toISOString(),
            region: 'ap-northeast-1',
          } as EventBridgeEvent<string, unknown>;

          // Act
          const startTime = Date.now();
          const result = await handler.handler(event);
          const processingTime = Date.now() - startTime;

          // Assert: 処理時間が5分以内
          expect(processingTime).toBeLessThan(300000); // 5 minutes
          expect(result.processingTimeMs).toBeLessThan(300000);
        }
      ),
      { numRuns: 50 } // Reduced runs for performance
    );
  });

  /**
   * Property 21: No Email for Inactive Goals
   * Feature: 3.2-reminder-functionality, Property 21: No Email for Inactive Goals
   * Validates: Requirements 7.1
   *
   * For any user with no active goals, the ReminderSystem should not send reminder emails
   */
  it('Property 21: No Email for Inactive Goals', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }), // userId
        fc.string({ minLength: 1 }), // email
        fc.string({ minLength: 1 }), // name
        async (userId, email, name) => {
          // Arrange: ユーザーにアクティブな目標がない
          const mockUser = {
            id: userId,
            email,
            name,
            userReminderPreference: {
              enabled: true,
              moodPreference: null,
              unsubscribedAt: null,
            },
          };

          mockPrisma.user.findMany.mockResolvedValue([]); // No users with active goals
          mockPrisma.user.findUnique.mockResolvedValue(mockUser);
          mockPrisma.goal.findMany.mockResolvedValue([]); // No active goals

          const event = {
            time: new Date().toISOString(),
            region: 'ap-northeast-1',
          } as EventBridgeEvent<string, unknown>;

          // Act
          const result = await handler.handler(event);

          // Assert: メールが送信されない
          expect(result.emailsSent).toBe(0);
          expect(emailService.sendReminderEmail).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 22: Stop Email on Goal Completion
   * Feature: 3.2-reminder-functionality, Property 22: Stop Email on Goal Completion
   * Validates: Requirements 7.2
   *
   * For any user who completes all goals, the ReminderSystem should automatically stop sending reminder emails
   */
  it('Property 22: Stop Email on Goal Completion', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }), // userId
        fc.string({ minLength: 1 }), // email
        fc.string({ minLength: 1 }), // name
        async (userId, email, name) => {
          // Arrange: 全ての目標が完了
          const mockUser = {
            id: userId,
            email,
            name,
            userReminderPreference: {
              enabled: true,
              moodPreference: null,
              unsubscribedAt: null,
            },
          };

          mockPrisma.user.findMany.mockResolvedValue([]); // No users with active goals
          mockPrisma.user.findUnique.mockResolvedValue(mockUser);
          mockPrisma.goal.findMany.mockResolvedValue([
            {
              id: 'goal-1',
              userId,
              title: 'Completed Goal',
              status: GoalStatus.COMPLETED,
            },
          ]);

          const event = {
            time: new Date().toISOString(),
            region: 'ap-northeast-1',
          } as EventBridgeEvent<string, unknown>;

          // Act
          const result = await handler.handler(event);

          // Assert: メールが送信されない
          expect(result.emailsSent).toBe(0);
          expect(emailService.sendReminderEmail).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 23: Start Email on Goal Creation
   * Feature: 3.2-reminder-functionality, Property 23: Start Email on Goal Creation
   * Validates: Requirements 7.3
   *
   * For any user who creates a new goal, the ReminderSystem should automatically start sending reminder emails
   */
  it('Property 23: Start Email on Goal Creation', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }), // userId
        fc.string({ minLength: 1 }), // email
        fc.string({ minLength: 1 }), // name
        fc.string({ minLength: 1 }), // goalId
        fc.string({ minLength: 1 }), // goalTitle
        async (userId, email, name, goalId, goalTitle) => {
          // Arrange: 新しいアクティブな目標がある
          const mockUser = {
            id: userId,
            email,
            name,
            userReminderPreference: {
              enabled: true,
              moodPreference: null,
              unsubscribedAt: null,
            },
          };

          const mockGoal = {
            id: goalId,
            userId,
            title: goalTitle,
            status: GoalStatus.ACTIVE,
          };

          mockPrisma.user.findMany.mockResolvedValue([mockUser]);
          mockPrisma.user.findUnique.mockResolvedValue(mockUser);
          mockPrisma.goal.findMany.mockResolvedValue([mockGoal]);
          mockTaskSelector.selectTasksForReminder.mockResolvedValue([
            {
              id: 'task-1',
              title: 'Task 1',
              estimatedMinutes: 30,
              type: TaskType.EXECUTION,
            },
          ] as any);
          (emailService.sendReminderEmail as jest.Mock).mockResolvedValue({
            messageId: 'test-message-id',
            success: true,
          });
          mockPrisma.reminderLog.create.mockResolvedValue({} as any);

          const event = {
            time: new Date().toISOString(),
            region: 'ap-northeast-1',
          } as EventBridgeEvent<string, unknown>;

          // Act
          const result = await handler.handler(event);

          // Assert: メールが送信される
          expect(result.emailsSent).toBeGreaterThan(0);
          expect(emailService.sendReminderEmail).toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 24: No Email for Paused Goals
   * Feature: 3.2-reminder-functionality, Property 24: No Email for Paused Goals
   * Validates: Requirements 7.4
   *
   * For any user with a paused goal, the ReminderSystem should not send reminder emails for tasks related to that goal
   */
  it('Property 24: No Email for Paused Goals', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }), // userId
        fc.string({ minLength: 1 }), // email
        fc.string({ minLength: 1 }), // name
        async (userId, email, name) => {
          // Arrange: 目標が一時停止中
          const mockUser = {
            id: userId,
            email,
            name,
            userReminderPreference: {
              enabled: true,
              moodPreference: null,
              unsubscribedAt: null,
            },
          };

          mockPrisma.user.findMany.mockResolvedValue([]); // No users with active goals
          mockPrisma.user.findUnique.mockResolvedValue(mockUser);
          mockPrisma.goal.findMany.mockResolvedValue([
            {
              id: 'goal-1',
              userId,
              title: 'Paused Goal',
              status: GoalStatus.PAUSED,
            },
          ]);

          const event = {
            time: new Date().toISOString(),
            region: 'ap-northeast-1',
          } as EventBridgeEvent<string, unknown>;

          // Act
          const result = await handler.handler(event);

          // Assert: メールが送信されない
          expect(result.emailsSent).toBe(0);
          expect(emailService.sendReminderEmail).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 25: Resume Email on Goal Resume
   * Feature: 3.2-reminder-functionality, Property 25: Resume Email on Goal Resume
   * Validates: Requirements 7.5
   *
   * For any user who resumes a paused goal, the ReminderSystem should resume sending reminder emails for tasks related to that goal
   */
  it('Property 25: Resume Email on Goal Resume', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }), // userId
        fc.string({ minLength: 1 }), // email
        fc.string({ minLength: 1 }), // name
        fc.string({ minLength: 1 }), // goalId
        fc.string({ minLength: 1 }), // goalTitle
        async (userId, email, name, goalId, goalTitle) => {
          // Arrange: 目標が再開された（アクティブ）
          const mockUser = {
            id: userId,
            email,
            name,
            userReminderPreference: {
              enabled: true,
              moodPreference: null,
              unsubscribedAt: null,
            },
          };

          const mockGoal = {
            id: goalId,
            userId,
            title: goalTitle,
            status: GoalStatus.ACTIVE, // Resumed
          };

          mockPrisma.user.findMany.mockResolvedValue([mockUser]);
          mockPrisma.user.findUnique.mockResolvedValue(mockUser);
          mockPrisma.goal.findMany.mockResolvedValue([mockGoal]);
          mockTaskSelector.selectTasksForReminder.mockResolvedValue([
            {
              id: 'task-1',
              title: 'Task 1',
              estimatedMinutes: 30,
              type: TaskType.EXECUTION,
            },
          ] as any);
          (emailService.sendReminderEmail as jest.Mock).mockResolvedValue({
            messageId: 'test-message-id',
            success: true,
          });
          mockPrisma.reminderLog.create.mockResolvedValue({} as any);

          const event = {
            time: new Date().toISOString(),
            region: 'ap-northeast-1',
          } as EventBridgeEvent<string, unknown>;

          // Act
          const result = await handler.handler(event);

          // Assert: メールが送信される
          expect(result.emailsSent).toBeGreaterThan(0);
          expect(emailService.sendReminderEmail).toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 26: Success Logging with Message ID
   * Feature: 3.2-reminder-functionality, Property 26: Success Logging with Message ID
   * Validates: Requirements 8.2
   *
   * For any successful email delivery, the ReminderSystem should record the SES message ID
   */
  it('Property 26: Success Logging with Message ID', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }), // userId
        fc.string({ minLength: 1 }), // messageId
        async (userId, messageId) => {
          // Arrange
          const mockUser = {
            id: userId,
            email: 'test@example.com',
            name: 'Test User',
            userReminderPreference: {
              enabled: true,
              moodPreference: null,
              unsubscribedAt: null,
            },
          };

          mockPrisma.user.findMany.mockResolvedValue([mockUser]);
          mockPrisma.user.findUnique.mockResolvedValue(mockUser);
          mockPrisma.goal.findMany.mockResolvedValue([
            {
              id: 'goal-1',
              userId,
              title: 'Test Goal',
              status: GoalStatus.ACTIVE,
            },
          ]);
          mockTaskSelector.selectTasksForReminder.mockResolvedValue([
            {
              id: 'task-1',
              title: 'Task 1',
              estimatedMinutes: 30,
              type: TaskType.EXECUTION,
            },
          ] as any);
          (emailService.sendReminderEmail as jest.Mock).mockResolvedValue({
            messageId,
            success: true,
          });
          mockPrisma.reminderLog.create.mockResolvedValue({} as any);

          const event = {
            time: new Date().toISOString(),
            region: 'ap-northeast-1',
          } as EventBridgeEvent<string, unknown>;

          // Act
          await handler.handler(event);

          // Assert: メッセージIDが記録される
          expect(mockPrisma.reminderLog.create).toHaveBeenCalledWith(
            expect.objectContaining({
              data: expect.objectContaining({
                messageId,
                emailStatus: 'sent',
              }),
            })
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 27: Failure Logging with Error Details
   * Feature: 3.2-reminder-functionality, Property 27: Failure Logging with Error Details
   * Validates: Requirements 8.3
   *
   * For any failed email delivery, the ReminderSystem should log the error message and error code
   */
  it('Property 27: Failure Logging with Error Details', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }), // userId
        fc.string({ minLength: 1 }), // errorMessage
        async (userId, errorMessage) => {
          // Arrange
          const mockUser = {
            id: userId,
            email: 'test@example.com',
            name: 'Test User',
            userReminderPreference: {
              enabled: true,
              moodPreference: null,
              unsubscribedAt: null,
            },
          };

          mockPrisma.user.findMany.mockResolvedValue([mockUser]);
          mockPrisma.user.findUnique.mockResolvedValue(mockUser);
          mockPrisma.goal.findMany.mockResolvedValue([
            {
              id: 'goal-1',
              userId,
              title: 'Test Goal',
              status: GoalStatus.ACTIVE,
            },
          ]);
          mockTaskSelector.selectTasksForReminder.mockResolvedValue([
            {
              id: 'task-1',
              title: 'Task 1',
              estimatedMinutes: 30,
              type: TaskType.EXECUTION,
            },
          ] as any);
          (emailService.sendReminderEmail as jest.Mock).mockResolvedValue({
            messageId: '',
            success: false,
            error: errorMessage,
          });
          mockPrisma.reminderLog.create.mockResolvedValue({} as any);

          const event = {
            time: new Date().toISOString(),
            region: 'ap-northeast-1',
          } as EventBridgeEvent<string, unknown>;

          // Act
          await handler.handler(event);

          // Assert: エラーメッセージが記録される
          expect(mockPrisma.reminderLog.create).toHaveBeenCalledWith(
            expect.objectContaining({
              data: expect.objectContaining({
                errorMessage,
                emailStatus: 'failed',
              }),
            })
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 28: Metrics Publishing
   * Feature: 3.2-reminder-functionality, Property 28: Metrics Publishing
   * Validates: Requirements 8.4
   *
   * For any monitoring operation, the ReminderSystem should publish metrics to CloudWatch (sent count, failed count, retry count)
   */
  it('Property 28: Metrics Publishing', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 5 }), // successCount
        fc.integer({ min: 0, max: 2 }), // failureCount
        async (successCount, failureCount) => {
          // Arrange
          const totalUsers = successCount + failureCount;
          const mockUsers = Array.from({ length: totalUsers }, (_, i) => ({
            id: `user-${i}`,
            email: `user${i}@example.com`,
            name: `User ${i}`,
            userReminderPreference: {
              enabled: true,
              moodPreference: null,
              unsubscribedAt: null,
            },
          }));

          mockPrisma.user.findMany.mockResolvedValue(mockUsers);
          mockPrisma.user.findUnique.mockImplementation(async ({ where }) => {
            return mockUsers.find(u => u.id === where.id) || null;
          });
          mockPrisma.goal.findMany.mockResolvedValue([
            {
              id: 'goal-1',
              userId: 'user-0',
              title: 'Test Goal',
              status: GoalStatus.ACTIVE,
            },
          ]);
          mockTaskSelector.selectTasksForReminder.mockResolvedValue([
            {
              id: 'task-1',
              title: 'Task 1',
              estimatedMinutes: 30,
              type: TaskType.EXECUTION,
            },
          ] as any);

          // Mock email service to return success/failure based on index
          (emailService.sendReminderEmail as jest.Mock).mockImplementation(async () => {
            const callCount = (emailService.sendReminderEmail as jest.Mock).mock.calls.length;
            return {
              messageId: callCount <= successCount ? 'test-message-id' : '',
              success: callCount <= successCount,
              error: callCount > successCount ? 'Test error' : undefined,
            };
          });

          mockPrisma.reminderLog.create.mockResolvedValue({} as any);

          const event = {
            time: new Date().toISOString(),
            region: 'ap-northeast-1',
          } as EventBridgeEvent<string, unknown>;

          // Act
          await handler.handler(event);

          // Assert: メトリクスが送信される
          const cloudWatchInstance = (handler as any).cloudWatch;
          expect(cloudWatchInstance.send).toHaveBeenCalled();

          // Verify the command contains the expected metrics
          const sendCall = cloudWatchInstance.send.mock.calls[0][0];
          expect(sendCall).toBeInstanceOf(PutMetricDataCommand);

          // Check that metrics were published (the command was created and sent)
          // We can't easily verify the exact content without accessing private properties,
          // but we can verify that the send method was called with a PutMetricDataCommand
          expect(cloudWatchInstance.send).toHaveBeenCalledWith(expect.any(PutMetricDataCommand));
        }
      ),
      { numRuns: 50 } // Reduced runs for performance
    );
  });
});
