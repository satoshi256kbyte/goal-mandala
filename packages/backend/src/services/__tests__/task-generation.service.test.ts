/**
 * TaskGenerationService統合テスト
 * ContextService、BedrockService、TaskQualityValidator、TaskDatabaseServiceの統合動作を検証
 */

import { TaskGenerationService } from '../task-generation.service';
import { ContextService } from '../context.service';
import { BedrockService } from '../bedrock.service';
import { TaskQualityValidator } from '../task-quality-validator.service';
import { TaskDatabaseService } from '../task-database.service';
import { TaskGenerationContext, TaskOutput, TaskPriority } from '../../types/task-generation.types';
import { ActionType, TaskType, TaskStatus } from '@prisma/client';
import { QualityError, NotFoundError, ForbiddenError } from '../../errors/task-generation.errors';

// モックの型定義
type MockedContextService = {
  getTaskGenerationContext: jest.Mock;
};

type MockedBedrockService = {
  generateTasks: jest.Mock;
};

type MockedTaskQualityValidator = {
  validateQuality: jest.Mock;
};

type MockedTaskDatabaseService = {
  deleteExistingTasks: jest.Mock;
  createTasks: jest.Mock;
  executeInTransaction: jest.Mock;
};

describe('TaskGenerationService Integration Tests', () => {
  let service: TaskGenerationService;
  let mockContextService: MockedContextService;
  let mockBedrockService: MockedBedrockService;
  let mockQualityValidator: MockedTaskQualityValidator;
  let mockDatabaseService: MockedTaskDatabaseService;

  const testUserId = 'test-user-123';
  const testActionId = 'test-action-456';
  const testSubGoalId = 'test-subgoal-789';
  const testGoalId = 'test-goal-012';

  beforeEach(() => {
    // ContextServiceのモック
    mockContextService = {
      getTaskGenerationContext: jest.fn(),
    };

    // BedrockServiceのモック
    mockBedrockService = {
      generateTasks: jest.fn(),
    };

    // TaskQualityValidatorのモック
    mockQualityValidator = {
      validateQuality: jest.fn(),
    };

    // TaskDatabaseServiceのモック
    mockDatabaseService = {
      deleteExistingTasks: jest.fn(),
      createTasks: jest.fn(),
      executeInTransaction: jest.fn(),
    };

    // サービスのインスタンス化
    service = new TaskGenerationService(
      mockContextService as unknown as ContextService,
      mockBedrockService as unknown as BedrockService,
      mockQualityValidator as unknown as TaskQualityValidator,
      mockDatabaseService as unknown as TaskDatabaseService
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateAndSaveTasks - 正常系', () => {
    it('アクションからタスクを生成して保存できる', async () => {
      // テストデータの準備
      const mockContext: TaskGenerationContext = {
        action: {
          id: testActionId,
          title: 'TypeScript公式ドキュメントを読む',
          description: 'TypeScriptの公式ドキュメントを読んで基礎を理解する',
          background: '基礎知識がなければ応用は理解できない',
          type: ActionType.EXECUTION,
        },
        subGoal: {
          id: testSubGoalId,
          title: 'TypeScriptの基礎文法を習得する',
          description: 'TypeScriptの基本的な型システムと文法を理解する',
        },
        goal: {
          id: testGoalId,
          title: 'TypeScriptのエキスパートになる',
          description: '6ヶ月でTypeScriptの高度な機能を習得する',
          deadline: new Date('2025-12-31'),
        },
        user: {
          preferences: {
            workStyle: '朝型',
            timeAvailable: 120,
          },
        },
        existingTasks: [],
      };

      // AI生成結果のモック
      const mockAITasks: TaskOutput[] = [
        {
          title: 'TypeScript公式ドキュメントの基礎編を読む',
          description:
            'TypeScript公式ドキュメントの基礎編（型システム、インターフェース、クラス）を読み、サンプルコードを実際に動かして理解を深める',
          priority: TaskPriority.HIGH,
          estimatedMinutes: 45,
          position: 0,
        },
        {
          title: 'TypeScriptの型システムを実践する',
          description:
            '学んだ型システムの知識を使って、簡単なTypeScriptプログラムを作成し、型の恩恵を体感する',
          priority: TaskPriority.MEDIUM,
          estimatedMinutes: 60,
          position: 1,
        },
        {
          title: 'TypeScriptの高度な型機能を学ぶ',
          description:
            'ジェネリクス、ユニオン型、インターセクション型などの高度な型機能について学習する',
          priority: TaskPriority.MEDIUM,
          estimatedMinutes: 50,
          position: 2,
        },
      ];

      // データベース保存結果のモック
      const mockSavedTasks = mockAITasks.map((task, i) => ({
        id: `task-${i}`,
        actionId: testActionId,
        title: task.title,
        description: task.description,
        type: TaskType.EXECUTION,
        status: TaskStatus.NOT_STARTED,
        estimatedMinutes: task.estimatedMinutes,
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      // モックの設定
      mockContextService.getTaskGenerationContext.mockResolvedValue(mockContext);
      mockBedrockService.generateTasks.mockResolvedValue(mockAITasks);
      mockQualityValidator.validateQuality.mockReturnValue(undefined);
      mockDatabaseService.executeInTransaction.mockImplementation(async (callback: any) => {
        mockDatabaseService.createTasks.mockResolvedValue(mockSavedTasks);
        return await callback({
          task: mockDatabaseService,
        });
      });

      // 実行
      const result = await service.generateAndSaveTasks(testUserId, testActionId, false);

      // 検証
      expect(result.actionId).toBe(testActionId);
      expect(result.tasks).toHaveLength(3);
      expect(result.metadata).toBeDefined();
      expect(result.metadata.generatedAt).toBeInstanceOf(Date);
      expect(result.metadata.tokensUsed).toBeGreaterThan(0);
      expect(result.metadata.estimatedCost).toBeGreaterThan(0);
      expect(result.metadata.actionContext).toBeDefined();
      expect(result.metadata.actionContext.goalTitle).toBe('TypeScriptのエキスパートになる');
      expect(result.metadata.actionContext.subGoalTitle).toBe('TypeScriptの基礎文法を習得する');
      expect(result.metadata.actionContext.actionTitle).toBe('TypeScript公式ドキュメントを読む');
      expect(result.metadata.actionContext.actionType).toBe(ActionType.EXECUTION);
      expect(result.metadata.taskCount).toBe(3);
      expect(result.metadata.totalEstimatedMinutes).toBe(155);

      // タスクの内容を検証
      result.tasks.forEach((task, index) => {
        expect(task.id).toBe(`task-${index}`);
        expect(task.title).toBe(mockAITasks[index].title);
        expect(task.type).toBe(TaskType.EXECUTION);
        expect(task.status).toBe(TaskStatus.NOT_STARTED);
        expect(task.estimatedMinutes).toBe(mockAITasks[index].estimatedMinutes);
      });

      // モックの呼び出しを検証
      expect(mockContextService.getTaskGenerationContext).toHaveBeenCalledWith(testActionId);
      expect(mockBedrockService.generateTasks).toHaveBeenCalledWith(mockContext);
      expect(mockQualityValidator.validateQuality).toHaveBeenCalledWith(mockAITasks);
      expect(mockDatabaseService.executeInTransaction).toHaveBeenCalled();
    });

    it('習慣アクションからタスクを生成できる', async () => {
      const mockContext: TaskGenerationContext = {
        action: {
          id: testActionId,
          title: '毎日30分TypeScriptのコードを書く',
          description: '毎日継続してTypeScriptのコードを書く習慣をつける',
          background: '継続的な実践が上達の鍵',
          type: ActionType.HABIT,
        },
        subGoal: {
          id: testSubGoalId,
          title: 'TypeScriptの実践力を高める',
          description: '実際にコードを書いて実践力を身につける',
        },
        goal: {
          id: testGoalId,
          title: 'TypeScriptのエキスパートになる',
          description: '6ヶ月でTypeScriptの高度な機能を習得する',
          deadline: new Date('2025-12-31'),
        },
        user: {
          preferences: {},
        },
        existingTasks: [],
      };

      const mockAITasks: TaskOutput[] = [
        {
          title: '簡単なTypeScriptプログラムを書く',
          description: '毎日30分、簡単なTypeScriptプログラムを書いて基礎を固める',
          priority: TaskPriority.HIGH,
          estimatedMinutes: 30,
          position: 0,
        },
      ];

      const mockSavedTasks = mockAITasks.map((task, i) => ({
        id: `task-${i}`,
        actionId: testActionId,
        title: task.title,
        description: task.description,
        type: TaskType.HABIT,
        status: TaskStatus.NOT_STARTED,
        estimatedMinutes: task.estimatedMinutes,
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      mockContextService.getTaskGenerationContext.mockResolvedValue(mockContext);
      mockBedrockService.generateTasks.mockResolvedValue(mockAITasks);
      mockQualityValidator.validateQuality.mockReturnValue(undefined);
      mockDatabaseService.executeInTransaction.mockImplementation(async (callback: any) => {
        mockDatabaseService.createTasks.mockResolvedValue(mockSavedTasks);
        return await callback({
          task: mockDatabaseService,
        });
      });

      const result = await service.generateAndSaveTasks(testUserId, testActionId, false);

      expect(result.actionId).toBe(testActionId);
      expect(result.tasks).toHaveLength(1);
      expect(result.tasks[0].type).toBe(TaskType.HABIT);
      expect(result.metadata.actionContext.actionType).toBe(ActionType.HABIT);
    });

    it('regenerate=trueの場合、既存のタスクを削除してから新規作成する', async () => {
      const mockContext: TaskGenerationContext = {
        action: {
          id: testActionId,
          title: 'テストアクション',
          description: 'テスト説明',
          background: 'テスト背景',
          type: ActionType.EXECUTION,
        },
        subGoal: {
          id: testSubGoalId,
          title: 'テストサブ目標',
          description: 'テストサブ目標説明',
        },
        goal: {
          id: testGoalId,
          title: 'テスト目標',
          description: 'テスト目標説明',
          deadline: new Date('2025-12-31'),
        },
        user: {
          preferences: {},
        },
        existingTasks: [],
      };

      const mockAITasks: TaskOutput[] = [
        {
          title: '新しいタスク1',
          description: '新しいタスク1の説明です。この説明は20文字以上である必要があります。',
          priority: TaskPriority.MEDIUM,
          estimatedMinutes: 45,
          position: 0,
        },
      ];

      const mockSavedTasks = mockAITasks.map((task, i) => ({
        id: `new-task-${i}`,
        actionId: testActionId,
        title: task.title,
        description: task.description,
        type: TaskType.EXECUTION,
        status: TaskStatus.NOT_STARTED,
        estimatedMinutes: task.estimatedMinutes,
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      mockContextService.getTaskGenerationContext.mockResolvedValue(mockContext);
      mockBedrockService.generateTasks.mockResolvedValue(mockAITasks);
      mockQualityValidator.validateQuality.mockReturnValue(undefined);
      mockDatabaseService.executeInTransaction.mockImplementation(async (callback: any) => {
        mockDatabaseService.deleteExistingTasks.mockResolvedValue(undefined);
        mockDatabaseService.createTasks.mockResolvedValue(mockSavedTasks);
        return await callback({
          task: mockDatabaseService,
        });
      });

      const result = await service.generateAndSaveTasks(testUserId, testActionId, true);

      expect(result.actionId).toBe(testActionId);
      expect(result.tasks).toHaveLength(1);
      expect(mockDatabaseService.deleteExistingTasks).toHaveBeenCalledWith(testActionId);
      expect(mockDatabaseService.createTasks).toHaveBeenCalled();
    });
  });

  describe('generateAndSaveTasks - エラーハンドリング', () => {
    it('アクションが存在しない場合、NotFoundErrorが発生する', async () => {
      mockDatabaseService.executeInTransaction.mockImplementation(async (callback: any) => {
        mockContextService.getTaskGenerationContext.mockRejectedValue(
          new NotFoundError('アクションが見つかりません')
        );
        return await callback({
          task: mockDatabaseService,
        });
      });

      await expect(service.generateAndSaveTasks(testUserId, testActionId, false)).rejects.toThrow(
        NotFoundError
      );
      await expect(service.generateAndSaveTasks(testUserId, testActionId, false)).rejects.toThrow(
        'アクションが見つかりません'
      );
    });

    it('ユーザーIDが一致しない場合、ForbiddenErrorが発生する', async () => {
      mockDatabaseService.executeInTransaction.mockImplementation(async (callback: any) => {
        mockContextService.getTaskGenerationContext.mockRejectedValue(
          new ForbiddenError('このアクションにアクセスする権限がありません')
        );
        return await callback({
          task: mockDatabaseService,
        });
      });

      await expect(
        service.generateAndSaveTasks('different-user-id', testActionId, false)
      ).rejects.toThrow(ForbiddenError);
    });

    it('品質検証エラーが発生した場合、QualityErrorが発生する', async () => {
      const mockContext: TaskGenerationContext = {
        action: {
          id: testActionId,
          title: 'テストアクション',
          description: 'テスト説明',
          background: 'テスト背景',
          type: ActionType.EXECUTION,
        },
        subGoal: {
          id: testSubGoalId,
          title: 'テストサブ目標',
          description: 'テストサブ目標説明',
        },
        goal: {
          id: testGoalId,
          title: 'テスト目標',
          description: 'テスト目標説明',
          deadline: new Date('2025-12-31'),
        },
        user: {
          preferences: {},
        },
        existingTasks: [],
      };

      // タスクなし（不正）
      const mockAITasks: TaskOutput[] = [];

      mockDatabaseService.executeInTransaction.mockImplementation(async (callback: any) => {
        mockContextService.getTaskGenerationContext.mockResolvedValue(mockContext);
        mockBedrockService.generateTasks.mockResolvedValue(mockAITasks);
        mockQualityValidator.validateQuality.mockImplementation(() => {
          throw new QualityError('タスクは最低1個以上必要です');
        });
        return await callback({
          task: mockDatabaseService,
        });
      });

      await expect(service.generateAndSaveTasks(testUserId, testActionId, false)).rejects.toThrow(
        QualityError
      );
      await expect(service.generateAndSaveTasks(testUserId, testActionId, false)).rejects.toThrow(
        'タスクは最低1個以上必要です'
      );
    });

    it('Bedrock APIエラーが発生した場合、適切にエラーを伝播する', async () => {
      const mockContext: TaskGenerationContext = {
        action: {
          id: testActionId,
          title: 'テストアクション',
          description: 'テスト説明',
          background: 'テスト背景',
          type: ActionType.EXECUTION,
        },
        subGoal: {
          id: testSubGoalId,
          title: 'テストサブ目標',
          description: 'テストサブ目標説明',
        },
        goal: {
          id: testGoalId,
          title: 'テスト目標',
          description: 'テスト目標説明',
          deadline: new Date('2025-12-31'),
        },
        user: {
          preferences: {},
        },
        existingTasks: [],
      };

      mockDatabaseService.executeInTransaction.mockImplementation(async (callback: any) => {
        mockContextService.getTaskGenerationContext.mockResolvedValue(mockContext);
        mockBedrockService.generateTasks.mockRejectedValue(new Error('Bedrock API呼び出しエラー'));
        return await callback({
          task: mockDatabaseService,
        });
      });

      await expect(service.generateAndSaveTasks(testUserId, testActionId, false)).rejects.toThrow(
        'Bedrock API呼び出しエラー'
      );
    });

    it('データベースエラーが発生した場合、トランザクションがロールバックされる', async () => {
      const mockContext: TaskGenerationContext = {
        action: {
          id: testActionId,
          title: 'テストアクション',
          description: 'テスト説明',
          background: 'テスト背景',
          type: ActionType.EXECUTION,
        },
        subGoal: {
          id: testSubGoalId,
          title: 'テストサブ目標',
          description: 'テストサブ目標説明',
        },
        goal: {
          id: testGoalId,
          title: 'テスト目標',
          description: 'テスト目標説明',
          deadline: new Date('2025-12-31'),
        },
        user: {
          preferences: {},
        },
        existingTasks: [],
      };

      const mockAITasks: TaskOutput[] = [
        {
          title: 'タスク1',
          description: 'タスク1の説明です。この説明は20文字以上である必要があります。',
          priority: TaskPriority.MEDIUM,
          estimatedMinutes: 45,
          position: 0,
        },
      ];

      mockContextService.getTaskGenerationContext.mockResolvedValue(mockContext);
      mockBedrockService.generateTasks.mockResolvedValue(mockAITasks);
      mockQualityValidator.validateQuality.mockReturnValue(undefined);
      mockDatabaseService.executeInTransaction.mockImplementation(async (callback: any) => {
        mockDatabaseService.createTasks.mockRejectedValue(new Error('データベース保存エラー'));
        return await callback({
          task: mockDatabaseService,
        });
      });

      await expect(service.generateAndSaveTasks(testUserId, testActionId, false)).rejects.toThrow(
        'データベース保存エラー'
      );
    });
  });

  describe('generateAndSaveTasks - トランザクション処理', () => {
    it('トランザクション内で全ての処理が実行される', async () => {
      const mockContext: TaskGenerationContext = {
        action: {
          id: testActionId,
          title: 'テストアクション',
          description: 'テスト説明',
          background: 'テスト背景',
          type: ActionType.EXECUTION,
        },
        subGoal: {
          id: testSubGoalId,
          title: 'テストサブ目標',
          description: 'テストサブ目標説明',
        },
        goal: {
          id: testGoalId,
          title: 'テスト目標',
          description: 'テスト目標説明',
          deadline: new Date('2025-12-31'),
        },
        user: {
          preferences: {},
        },
        existingTasks: [],
      };

      const mockAITasks: TaskOutput[] = [
        {
          title: 'タスク1',
          description: 'タスク1の説明です。この説明は20文字以上である必要があります。',
          priority: TaskPriority.MEDIUM,
          estimatedMinutes: 45,
          position: 0,
        },
      ];

      const mockSavedTasks = mockAITasks.map((task, i) => ({
        id: `task-${i}`,
        actionId: testActionId,
        title: task.title,
        description: task.description,
        type: TaskType.EXECUTION,
        status: TaskStatus.NOT_STARTED,
        estimatedMinutes: task.estimatedMinutes,
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      mockContextService.getTaskGenerationContext.mockResolvedValue(mockContext);
      mockBedrockService.generateTasks.mockResolvedValue(mockAITasks);
      mockQualityValidator.validateQuality.mockReturnValue(undefined);

      let transactionCallbackCalled = false;
      mockDatabaseService.executeInTransaction.mockImplementation(async (callback: any) => {
        transactionCallbackCalled = true;
        mockDatabaseService.createTasks.mockResolvedValue(mockSavedTasks);
        return await callback({
          task: mockDatabaseService,
        });
      });

      await service.generateAndSaveTasks(testUserId, testActionId, false);

      expect(transactionCallbackCalled).toBe(true);
      expect(mockDatabaseService.executeInTransaction).toHaveBeenCalledTimes(1);
    });

    it('トランザクション内でエラーが発生した場合、ロールバックされる', async () => {
      const mockContext: TaskGenerationContext = {
        action: {
          id: testActionId,
          title: 'テストアクション',
          description: 'テスト説明',
          background: 'テスト背景',
          type: ActionType.EXECUTION,
        },
        subGoal: {
          id: testSubGoalId,
          title: 'テストサブ目標',
          description: 'テストサブ目標説明',
        },
        goal: {
          id: testGoalId,
          title: 'テスト目標',
          description: 'テスト目標説明',
          deadline: new Date('2025-12-31'),
        },
        user: {
          preferences: {},
        },
        existingTasks: [],
      };

      const mockAITasks: TaskOutput[] = [
        {
          title: 'タスク1',
          description: 'タスク1の説明です。この説明は20文字以上である必要があります。',
          priority: TaskPriority.MEDIUM,
          estimatedMinutes: 45,
          position: 0,
        },
      ];

      mockContextService.getTaskGenerationContext.mockResolvedValue(mockContext);
      mockBedrockService.generateTasks.mockResolvedValue(mockAITasks);
      mockQualityValidator.validateQuality.mockReturnValue(undefined);
      mockDatabaseService.executeInTransaction.mockRejectedValue(
        new Error('トランザクションエラー')
      );

      await expect(service.generateAndSaveTasks(testUserId, testActionId, false)).rejects.toThrow(
        'トランザクションエラー'
      );
    });
  });
});
