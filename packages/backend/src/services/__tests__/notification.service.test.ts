/**
 * NotificationServiceのユニットテスト
 * Requirements: 15.1-15.5
 */

import { NotificationService } from '../notification.service';
import { TaskStatus } from '../../generated/prisma-client';

// Prismaクライアントのモック
const mockPrisma = {
  task: {
    findUnique: jest.fn(),
  },
  taskReminder: {
    create: jest.fn(),
    deleteMany: jest.fn(),
  },
};

// SESクライアントのモック
const mockSesClient = {
  sendEmail: jest.fn().mockReturnValue({
    promise: jest.fn().mockResolvedValue({}),
  }),
};

// EventBridgeクライアントのモック
const mockEventBridgeClient = {
  putRule: jest.fn().mockReturnValue({
    promise: jest.fn().mockResolvedValue({}),
  }),
  putTargets: jest.fn().mockReturnValue({
    promise: jest.fn().mockResolvedValue({}),
  }),
  disableRule: jest.fn().mockReturnValue({
    promise: jest.fn().mockResolvedValue({}),
  }),
};

// NotificationServiceのインスタンス作成
const notificationService = new NotificationService(
  mockPrisma,
  mockSesClient,
  mockEventBridgeClient
);

// テスト用のタスクデータ
const mockTask = {
  id: 'task-1',
  actionId: 'action-1',
  title: 'プログラミング学習',
  description: 'TypeScriptの基礎を学ぶ',
  type: 'EXECUTION',
  status: TaskStatus.NOT_STARTED,
  estimatedMinutes: 60,
  deadline: new Date('2025-11-21T10:00:00'),
  completedAt: null,
  createdAt: new Date('2025-11-20'),
  updatedAt: new Date('2025-11-20'),
};

const mockTaskWithUser = {
  ...mockTask,
  action: {
    id: 'action-1',
    title: 'プログラミングスキル向上',
    subGoal: {
      id: 'subgoal-1',
      title: '技術力向上',
      goal: {
        id: 'goal-1',
        title: 'エンジニアとして成長する',
        user: {
          id: 'user-1',
          name: '田中太郎',
          email: 'tanaka@example.com',
        },
      },
    },
  },
};

describe('NotificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // 環境変数をモック
    process.env.FRONTEND_URL = 'https://goal-mandala.com';
    process.env.FROM_EMAIL = 'noreply@goal-mandala.com';
  });

  describe('sendDeadlineReminder', () => {
    it('should send deadline reminder email', async () => {
      mockPrisma.task.findUnique.mockResolvedValue(mockTaskWithUser);
      mockPrisma.taskReminder.create.mockResolvedValue({});

      await notificationService.sendDeadlineReminder(mockTask);

      expect(mockSesClient.sendEmail).toHaveBeenCalledWith({
        Source: 'noreply@goal-mandala.com',
        Destination: {
          ToAddresses: ['tanaka@example.com'],
        },
        Message: {
          Subject: {
            Data: '【リマインド】タスクの期限が近づいています: プログラミング学習',
            Charset: 'UTF-8',
          },
          Body: {
            Text: {
              Data: expect.stringContaining('田中太郎 様'),
              Charset: 'UTF-8',
            },
          },
        },
      });

      expect(mockPrisma.taskReminder.create).toHaveBeenCalledWith({
        data: {
          taskId: mockTask.id,
          reminderDate: expect.any(Date),
          sent: true,
          sentAt: expect.any(Date),
          createdAt: expect.any(Date),
        },
      });
    });

    it('should throw error when task not found', async () => {
      mockPrisma.task.findUnique.mockResolvedValue(null);

      await expect(notificationService.sendDeadlineReminder(mockTask)).rejects.toThrow(
        'Task or user not found'
      );
    });

    it('should throw error when user not found', async () => {
      const taskWithoutUser = {
        ...mockTaskWithUser,
        action: {
          ...mockTaskWithUser.action,
          subGoal: {
            ...mockTaskWithUser.action.subGoal,
            goal: {
              ...mockTaskWithUser.action.subGoal.goal,
              user: null,
            },
          },
        },
      };
      mockPrisma.task.findUnique.mockResolvedValue(taskWithoutUser);

      await expect(notificationService.sendDeadlineReminder(mockTask)).rejects.toThrow(
        'Task or user not found'
      );
    });

    it('should handle task without deadline', async () => {
      const taskWithoutDeadline = { ...mockTask, deadline: null };
      const taskWithUserNoDeadline = { ...mockTaskWithUser, deadline: null };
      mockPrisma.task.findUnique.mockResolvedValue(taskWithUserNoDeadline);
      mockPrisma.taskReminder.create.mockResolvedValue({});

      await notificationService.sendDeadlineReminder(taskWithoutDeadline);

      expect(mockSesClient.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          Message: expect.objectContaining({
            Body: expect.objectContaining({
              Text: expect.objectContaining({
                Data: expect.stringContaining('期限: 未設定'),
              }),
            }),
          }),
        })
      );
    });
  });

  describe('sendOverdueNotification', () => {
    it('should send overdue notification email', async () => {
      mockPrisma.task.findUnique.mockResolvedValue(mockTaskWithUser);
      mockPrisma.taskReminder.create.mockResolvedValue({});

      await notificationService.sendOverdueNotification(mockTask);

      expect(mockSesClient.sendEmail).toHaveBeenCalledWith({
        Source: 'noreply@goal-mandala.com',
        Destination: {
          ToAddresses: ['tanaka@example.com'],
        },
        Message: {
          Subject: {
            Data: '【期限超過】タスクの期限が過ぎています: プログラミング学習',
            Charset: 'UTF-8',
          },
          Body: {
            Text: {
              Data: expect.stringContaining('田中太郎 様'),
              Charset: 'UTF-8',
            },
          },
        },
      });

      expect(mockPrisma.taskReminder.create).toHaveBeenCalledWith({
        data: {
          taskId: mockTask.id,
          reminderDate: expect.any(Date),
          sent: true,
          sentAt: expect.any(Date),
          createdAt: expect.any(Date),
        },
      });
    });
  });

  describe('cancelNotification', () => {
    const mockTaskId = 'task-1';

    it('should cancel scheduled notification', async () => {
      mockPrisma.taskReminder.deleteMany.mockResolvedValue({ count: 1 });

      await notificationService.cancelNotification(mockTaskId);

      expect(mockEventBridgeClient.disableRule).toHaveBeenCalledWith({
        Name: `task-reminder-${mockTaskId}`,
      });

      expect(mockPrisma.taskReminder.deleteMany).toHaveBeenCalledWith({
        where: {
          taskId: mockTaskId,
          sent: false,
        },
      });
    });

    it('should handle EventBridge rule not found', async () => {
      mockEventBridgeClient.disableRule.mockReturnValue({
        promise: jest.fn().mockRejectedValue(new Error('Rule not found')),
      });
      mockPrisma.taskReminder.deleteMany.mockResolvedValue({ count: 0 });

      // エラーが発生しても処理が続行されることを確認
      await expect(notificationService.cancelNotification(mockTaskId)).resolves.not.toThrow();

      expect(mockPrisma.taskReminder.deleteMany).toHaveBeenCalled();
    });
  });

  describe('scheduleNotification', () => {
    beforeEach(() => {
      // 現在時刻を2025-11-20T10:00:00に固定
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-11-20T10:00:00'));
      process.env.REMINDER_LAMBDA_ARN = 'arn:aws:lambda:region:account:function:reminder';
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should schedule notification for future deadline', async () => {
      const futureTask = {
        ...mockTask,
        deadline: new Date('2025-11-22T10:00:00'), // 2日後
      };
      mockPrisma.taskReminder.create.mockResolvedValue({});

      await notificationService.scheduleNotification(futureTask);

      expect(mockEventBridgeClient.putRule).toHaveBeenCalledWith({
        Name: `task-reminder-${futureTask.id}`,
        ScheduleExpression: expect.stringContaining('at(2025-11-21T'), // 24時間前（時刻は環境により異なる）
        Description: `Reminder for task ${futureTask.id}`,
        State: 'ENABLED',
      });

      expect(mockEventBridgeClient.putTargets).toHaveBeenCalledWith({
        Rule: `task-reminder-${futureTask.id}`,
        Targets: [
          {
            Id: '1',
            Arn: 'arn:aws:lambda:region:account:function:reminder',
            Input: JSON.stringify({ taskId: futureTask.id, type: 'deadline_reminder' }),
          },
        ],
      });

      expect(mockPrisma.taskReminder.create).toHaveBeenCalledWith({
        data: {
          taskId: futureTask.id,
          reminderDate: expect.any(Date),
          sent: false,
          createdAt: expect.any(Date),
        },
      });
    });

    it('should not schedule notification for task without deadline', async () => {
      const taskWithoutDeadline = { ...mockTask, deadline: null };

      await notificationService.scheduleNotification(taskWithoutDeadline);

      expect(mockEventBridgeClient.putRule).not.toHaveBeenCalled();
      expect(mockPrisma.taskReminder.create).not.toHaveBeenCalled();
    });

    it('should not schedule notification for past deadline', async () => {
      const pastTask = {
        ...mockTask,
        deadline: new Date('2025-11-19T10:00:00'), // 昨日
      };

      await notificationService.scheduleNotification(pastTask);

      expect(mockEventBridgeClient.putRule).not.toHaveBeenCalled();
      expect(mockPrisma.taskReminder.create).not.toHaveBeenCalled();
    });

    it('should not schedule notification when reminder time is in the past', async () => {
      const nearFutureTask = {
        ...mockTask,
        deadline: new Date('2025-11-20T15:00:00'), // 5時間後（24時間前は過去）
      };

      await notificationService.scheduleNotification(nearFutureTask);

      expect(mockEventBridgeClient.putRule).not.toHaveBeenCalled();
      expect(mockPrisma.taskReminder.create).not.toHaveBeenCalled();
    });
  });
});
