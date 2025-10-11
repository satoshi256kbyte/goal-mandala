/**
 * AIGenerationWorkerのユニットテスト
 */

import { handler } from '../ai-generation-worker';
import { ProcessingStateService } from '../../services/processing-state.service';
import { SubGoalGenerationService } from '../../services/subgoal-generation.service';
import { ActionGenerationService } from '../../services/action-generation.service';
import { TaskGenerationService } from '../../services/task-generation.service';
import { ProcessingType, ProcessingStatus } from '../../generated/prisma-client';
import {
  StepFunctionsExecutionInput,
  SubGoalGenerationParams,
  ActionGenerationParams,
  TaskGenerationParams,
} from '../../types/async-processing.types';

// モック
jest.mock('../../services/processing-state.service');
jest.mock('../../services/subgoal-generation.service');
jest.mock('../../services/action-generation.service');
jest.mock('../../services/task-generation.service');
jest.mock('../../services/context.service');
jest.mock('../../services/bedrock.service');
jest.mock('../../services/action-quality-validator.service');
jest.mock('../../services/action-type-classifier.service');
jest.mock('../../services/action-database.service');
jest.mock('../../services/task-quality-validator.service');
jest.mock('../../services/task-database.service');

describe('AIGenerationWorker', () => {
  let mockProcessingStateService: jest.Mocked<ProcessingStateService>;

  beforeEach(() => {
    jest.clearAllMocks();

    // ProcessingStateServiceのモック
    mockProcessingStateService = {
      updateProcessingProgress: jest.fn(),
      updateProcessingError: jest.fn(),
    } as unknown as jest.Mocked<ProcessingStateService>;

    (ProcessingStateService as jest.Mock).mockImplementation(() => mockProcessingStateService);
  });

  describe('サブ目標生成処理', () => {
    it('正常にサブ目標を生成できる', async () => {
      // Arrange
      const processId = 'test-process-id';
      const userId = 'test-user-id';
      const params: SubGoalGenerationParams = {
        goalId: 'test-goal-id',
        title: 'テスト目標',
        description: 'テスト目標の説明',
        deadline: '2025-12-31T23:59:59Z',
        background: 'テスト背景',
        constraints: 'テスト制約',
      };

      const mockResult = {
        goalId: 'test-goal-id',
        subGoals: [
          {
            id: 'subgoal-1',
            title: 'サブ目標1',
            description: '説明1',
            background: '背景1',
            position: 0,
            progress: 0,
            createdAt: '2025-10-11T00:00:00Z',
            updatedAt: '2025-10-11T00:00:00Z',
          },
        ],
        metadata: {
          generatedAt: new Date(),
          tokensUsed: 1500,
          estimatedCost: 0.000225,
        },
      };

      const mockSubGoalGenerationService = {
        generateAndSaveSubGoals: jest.fn().mockResolvedValue(mockResult),
      };

      (SubGoalGenerationService as jest.Mock).mockImplementation(
        () => mockSubGoalGenerationService
      );

      const event: StepFunctionsExecutionInput = {
        processId,
        userId,
        type: ProcessingType.SUBGOAL_GENERATION,
        params,
      };

      // Act
      const result = await handler(event);

      // Assert
      expect(result.processId).toBe(processId);
      expect(result.status).toBe(ProcessingStatus.COMPLETED);
      expect(result.result).toEqual(mockResult);

      // 進捗更新が呼ばれたことを確認
      expect(mockProcessingStateService.updateProcessingProgress).toHaveBeenCalledWith(
        processId,
        0
      );
      expect(mockProcessingStateService.updateProcessingProgress).toHaveBeenCalledWith(
        processId,
        50
      );
      expect(mockProcessingStateService.updateProcessingProgress).toHaveBeenCalledWith(
        processId,
        100
      );

      // サブ目標生成サービスが呼ばれたことを確認
      expect(mockSubGoalGenerationService.generateAndSaveSubGoals).toHaveBeenCalledWith(
        userId,
        params,
        processId
      );
    });

    it('エラー時に適切にハンドリングされる', async () => {
      // Arrange
      const processId = 'test-process-id';
      const userId = 'test-user-id';
      const params: SubGoalGenerationParams = {
        goalId: 'test-goal-id',
        title: 'テスト目標',
        description: 'テスト目標の説明',
        deadline: '2025-12-31T23:59:59Z',
        background: 'テスト背景',
      };

      const mockError = new Error('AI生成エラー');
      const mockSubGoalGenerationService = {
        generateAndSaveSubGoals: jest.fn().mockRejectedValue(mockError),
      };

      (SubGoalGenerationService as jest.Mock).mockImplementation(
        () => mockSubGoalGenerationService
      );

      const event: StepFunctionsExecutionInput = {
        processId,
        userId,
        type: ProcessingType.SUBGOAL_GENERATION,
        params,
      };

      // Act
      const result = await handler(event);

      // Assert
      expect(result.processId).toBe(processId);
      expect(result.status).toBe(ProcessingStatus.FAILED);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('AI_ERROR');
      expect(result.error?.retryable).toBe(true);

      // エラー更新が呼ばれたことを確認
      expect(mockProcessingStateService.updateProcessingError).toHaveBeenCalledWith(
        processId,
        expect.objectContaining({
          code: 'AI_ERROR',
          retryable: true,
        })
      );
    });
  });

  describe('アクション生成処理', () => {
    it('正常にアクションを生成できる', async () => {
      // Arrange
      const processId = 'test-process-id';
      const userId = 'test-user-id';
      const params: ActionGenerationParams = {
        subGoalId: 'test-subgoal-id',
      };

      const mockResult = {
        subGoalId: 'test-subgoal-id',
        actions: [
          {
            id: 'action-1',
            title: 'アクション1',
            description: '説明1',
            background: '背景1',
            type: 'EXECUTION',
            position: 0,
            progress: 0,
            createdAt: '2025-10-11T00:00:00Z',
            updatedAt: '2025-10-11T00:00:00Z',
          },
        ],
        metadata: {
          generatedAt: new Date(),
          tokensUsed: 2000,
          estimatedCost: 0.0003,
          goalContext: {
            goalTitle: 'テスト目標',
            subGoalTitle: 'テストサブ目標',
          },
        },
      };

      const mockActionGenerationService = {
        generateAndSaveActions: jest.fn().mockResolvedValue(mockResult),
      };

      (ActionGenerationService as jest.Mock).mockImplementation(() => mockActionGenerationService);

      const event: StepFunctionsExecutionInput = {
        processId,
        userId,
        type: ProcessingType.ACTION_GENERATION,
        params,
      };

      // Act
      const result = await handler(event);

      // Assert
      expect(result.processId).toBe(processId);
      expect(result.status).toBe(ProcessingStatus.COMPLETED);
      expect(result.result).toEqual(mockResult);

      // 進捗更新が呼ばれたことを確認
      expect(mockProcessingStateService.updateProcessingProgress).toHaveBeenCalledWith(
        processId,
        0
      );
      expect(mockProcessingStateService.updateProcessingProgress).toHaveBeenCalledWith(
        processId,
        100
      );

      // アクション生成サービスが呼ばれたことを確認
      expect(mockActionGenerationService.generateAndSaveActions).toHaveBeenCalledWith(
        userId,
        params.subGoalId,
        false
      );
    });
  });

  describe('タスク生成処理', () => {
    it('正常にタスクを生成できる', async () => {
      // Arrange
      const processId = 'test-process-id';
      const userId = 'test-user-id';
      const params: TaskGenerationParams = {
        actionId: 'test-action-id',
      };

      const mockResult = {
        actionId: 'test-action-id',
        tasks: [
          {
            id: 'task-1',
            title: 'タスク1',
            description: '説明1',
            type: 'EXECUTION',
            status: 'NOT_STARTED',
            estimatedMinutes: 30,
            completedAt: null,
            createdAt: '2025-10-11T00:00:00Z',
            updatedAt: '2025-10-11T00:00:00Z',
          },
        ],
        metadata: {
          generatedAt: new Date(),
          tokensUsed: 2500,
          estimatedCost: 0.00038,
          actionContext: {
            goalTitle: 'テスト目標',
            subGoalTitle: 'テストサブ目標',
            actionTitle: 'テストアクション',
            actionType: 'EXECUTION',
          },
          taskCount: 1,
          totalEstimatedMinutes: 30,
        },
      };

      const mockTaskGenerationService = {
        generateAndSaveTasks: jest.fn().mockResolvedValue(mockResult),
      };

      (TaskGenerationService as jest.Mock).mockImplementation(() => mockTaskGenerationService);

      const event: StepFunctionsExecutionInput = {
        processId,
        userId,
        type: ProcessingType.TASK_GENERATION,
        params,
      };

      // Act
      const result = await handler(event);

      // Assert
      expect(result.processId).toBe(processId);
      expect(result.status).toBe(ProcessingStatus.COMPLETED);
      expect(result.result).toEqual(mockResult);

      // 進捗更新が呼ばれたことを確認
      expect(mockProcessingStateService.updateProcessingProgress).toHaveBeenCalledWith(
        processId,
        0
      );
      expect(mockProcessingStateService.updateProcessingProgress).toHaveBeenCalledWith(
        processId,
        100
      );

      // タスク生成サービスが呼ばれたことを確認
      expect(mockTaskGenerationService.generateAndSaveTasks).toHaveBeenCalledWith(
        userId,
        params.actionId,
        false
      );
    });
  });

  describe('エラーハンドリング', () => {
    it('ValidationErrorを適切に処理する', async () => {
      // Arrange
      const processId = 'test-process-id';
      const userId = 'test-user-id';
      const params: SubGoalGenerationParams = {
        goalId: 'test-goal-id',
        title: 'テスト目標',
        description: 'テスト目標の説明',
        deadline: '2025-12-31T23:59:59Z',
        background: 'テスト背景',
      };

      const mockError = new Error('Validation failed');
      mockError.name = 'ValidationError';

      const mockSubGoalGenerationService = {
        generateAndSaveSubGoals: jest.fn().mockRejectedValue(mockError),
      };

      (SubGoalGenerationService as jest.Mock).mockImplementation(
        () => mockSubGoalGenerationService
      );

      const event: StepFunctionsExecutionInput = {
        processId,
        userId,
        type: ProcessingType.SUBGOAL_GENERATION,
        params,
      };

      // Act
      const result = await handler(event);

      // Assert
      expect(result.status).toBe(ProcessingStatus.FAILED);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
      expect(result.error?.retryable).toBe(false);
    });

    it('DatabaseErrorを適切に処理する', async () => {
      // Arrange
      const processId = 'test-process-id';
      const userId = 'test-user-id';
      const params: SubGoalGenerationParams = {
        goalId: 'test-goal-id',
        title: 'テスト目標',
        description: 'テスト目標の説明',
        deadline: '2025-12-31T23:59:59Z',
        background: 'テスト背景',
      };

      const mockError = new Error('Database connection failed');

      const mockSubGoalGenerationService = {
        generateAndSaveSubGoals: jest.fn().mockRejectedValue(mockError),
      };

      (SubGoalGenerationService as jest.Mock).mockImplementation(
        () => mockSubGoalGenerationService
      );

      const event: StepFunctionsExecutionInput = {
        processId,
        userId,
        type: ProcessingType.SUBGOAL_GENERATION,
        params,
      };

      // Act
      const result = await handler(event);

      // Assert
      expect(result.status).toBe(ProcessingStatus.FAILED);
      expect(result.error?.code).toBe('DATABASE_ERROR');
      expect(result.error?.retryable).toBe(true);
    });

    it('未対応の処理タイプでエラーになる', async () => {
      // Arrange
      const processId = 'test-process-id';
      const userId = 'test-user-id';

      const event: StepFunctionsExecutionInput = {
        processId,
        userId,
        type: 'INVALID_TYPE' as ProcessingType,
        params: {},
      };

      // Act
      const result = await handler(event);

      // Assert
      expect(result.status).toBe(ProcessingStatus.FAILED);
      expect(result.error?.code).toBe('UNKNOWN_ERROR');
    });
  });
});
