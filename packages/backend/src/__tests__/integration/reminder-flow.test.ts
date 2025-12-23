import { PrismaClient } from '../../generated/prisma-client';
import { TaskSelectorService } from '../../services/task-selector.service';
import { emailService } from '../../services/email.service';
import { deepLinkService } from '../../services/deep-link.service';

jest.mock('../../generated/prisma-client');
jest.mock('@aws-sdk/client-ses');
jest.mock('@aws-sdk/client-secrets-manager');

/**
 * リマインド機能の統合テスト
 *
 * このテストは以下の統合フローを検証します：
 * 1. タスク選択ロジック（TaskSelectorService）
 * 2. メール生成・送信（EmailService）
 * 3. Deep Link検証（DeepLinkService）
 *
 * Requirements: All
 */
describe('Reminder Flow Integration Tests', () => {
  let prisma: jest.Mocked<PrismaClient>;
  let taskSelectorService: TaskSelectorService;

  beforeAll(async () => {
    // Prismaモックのセットアップ
    prisma = {
      $disconnect: jest.fn(),
      user: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
      goal: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
      task: {
        findMany: jest.fn(),
        update: jest.fn(),
      },
      userReminderPreference: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
      },
      habitTaskReminderTracking: {
        findMany: jest.fn(),
        upsert: jest.fn(),
      },
      reminderLog: {
        create: jest.fn(),
      },
    } as any;

    // サービスのインスタンス化
    taskSelectorService = new TaskSelectorService(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Complete Reminder Flow', () => {
    it('should complete full reminder flow for user with tasks', async () => {
      // テストデータのセットアップ
      const userId = 'test-user-1';
      const goalId = 'test-goal-1';
      const actionId = 'test-action-1';
      const taskId = 'test-task-1';

      const mockUser = {
        id: userId,
        email: 'test@example.com',
        name: 'Test User',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockGoal = {
        id: goalId,
        userId,
        title: 'Test Goal',
        description: 'Test Description',
        deadline: new Date('2025-12-31'),
        background: 'Test Background',
        status: 'ACTIVE' as const,
        progress: 50,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockTask = {
        id: taskId,
        actionId,
        title: 'Test Task',
        description: 'Test Description',
        type: 'execution' as const,
        status: 'not_started' as const,
        estimatedMinutes: 30,
        createdAt: new Date(),
        updatedAt: new Date(),
        completedAt: null,
        deadline: null,
        action: {
          id: actionId,
          subGoalId: 'test-subgoal-1',
          title: 'Test Action',
          description: 'Test Action Description',
          background: 'Test Background',
          constraints: null,
          type: 'EXECUTION' as const,
          position: 0,
          progress: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
          subGoal: {
            id: 'test-subgoal-1',
            goalId,
            title: 'Test SubGoal',
            description: 'Test SubGoal Description',
            background: 'Test Background',
            constraints: null,
            position: 0,
            progress: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
            goal: mockGoal,
          },
        },
      };

      // モックの設定
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.goal.findMany as jest.Mock).mockResolvedValue([mockGoal]);
      (prisma.task.findMany as jest.Mock).mockResolvedValue([mockTask]);
      (prisma.userReminderPreference.findUnique as jest.Mock).mockResolvedValue({
        userId,
        enabled: true,
        moodPreference: 'stay_on_track',
        lastReminderSentAt: null,
        unsubscribedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      (prisma.habitTaskReminderTracking.findMany as jest.Mock).mockResolvedValue([]);

      // 1. タスク選択
      const selectedTasks = await taskSelectorService.selectTasksForReminder(
        userId,
        'stay_on_track'
      );

      expect(selectedTasks).toHaveLength(1);
      expect(selectedTasks[0].id).toBe(taskId);

      // 2. Deep Link生成
      const deepLinkToken = await deepLinkService.generateToken(userId, taskId, 24 * 60 * 60);
      expect(deepLinkToken).toBeDefined();
      expect(typeof deepLinkToken).toBe('string');

      // 3. Deep Link検証
      const payload = await deepLinkService.validateToken(deepLinkToken);
      expect(payload).toBeDefined();
      expect(payload?.userId).toBe(userId);
      expect(payload?.taskId).toBe(taskId);

      // 4. メール生成（テストモード）
      const emailResult = await emailService.sendReminderEmail(
        mockUser,
        selectedTasks,
        mockGoal,
        true // テストモード
      );

      expect(emailResult.success).toBe(true);
      expect(emailResult.messageId).toBeDefined();
    });

    it('should handle user without tasks', async () => {
      const userId = 'test-user-no-tasks';

      // モックの設定：タスクなし
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: userId,
        email: 'notasks@example.com',
        name: 'No Tasks User',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      (prisma.goal.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.task.findMany as jest.Mock).mockResolvedValue([]);

      // タスク選択
      const selectedTasks = await taskSelectorService.selectTasksForReminder(userId, null);

      // タスクがない場合は空配列が返される
      expect(selectedTasks).toHaveLength(0);
    });
  });

  describe('Deep Link Validation Integration', () => {
    it('should validate deep link token correctly', async () => {
      const userId = 'test-user-deeplink';
      const taskId = 'test-task-deeplink';

      // トークン生成
      const token = await deepLinkService.generateToken(userId, taskId, 24 * 60 * 60);

      // トークン検証
      const payload = await deepLinkService.validateToken(token);

      expect(payload).toBeDefined();
      expect(payload?.userId).toBe(userId);
      expect(payload?.taskId).toBe(taskId);
      expect(payload?.expiresAt).toBeInstanceOf(Date);
    });

    it('should reject expired deep link token', async () => {
      const userId = 'test-user-expired';
      const taskId = 'test-task-expired';

      // 有効期限切れのトークン生成（-1秒）
      const token = await deepLinkService.generateToken(userId, taskId, -1);

      // トークン検証（有効期限切れ）
      const payload = await deepLinkService.validateToken(token);

      expect(payload).toBeNull();
    });

    it('should reject invalid deep link token', async () => {
      const invalidToken = 'invalid.token.here';

      // 無効なトークンの検証
      const payload = await deepLinkService.validateToken(invalidToken);

      expect(payload).toBeNull();
    });
  });
});
