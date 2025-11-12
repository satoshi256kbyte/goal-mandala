import { TaskGenerationService } from '../task-generation.service';
import { ContextService } from '../context.service';
import { BedrockService } from '../bedrock.service';
import { TaskQualityValidator } from '../task-quality-validator.service';
import { TaskDatabaseService } from '../task-database.service';

// モック
jest.mock('../context.service');
jest.mock('../bedrock.service');
jest.mock('../task-quality-validator.service');
jest.mock('../task-database.service');

describe('TaskGenerationService', () => {
  let service: TaskGenerationService;
  let mockContextService: jest.Mocked<ContextService>;
  let mockBedrockService: jest.Mocked<BedrockService>;
  let mockQualityValidator: jest.Mocked<TaskQualityValidator>;
  let mockDatabaseService: jest.Mocked<TaskDatabaseService>;

  beforeEach(() => {
    mockContextService = new ContextService({} as any) as jest.Mocked<ContextService>;
    mockBedrockService = new BedrockService({} as any) as jest.Mocked<BedrockService>;
    mockQualityValidator = new TaskQualityValidator() as jest.Mocked<TaskQualityValidator>;
    mockDatabaseService = new TaskDatabaseService({} as any) as jest.Mocked<TaskDatabaseService>;

    service = new TaskGenerationService(
      mockContextService,
      mockBedrockService,
      mockQualityValidator,
      mockDatabaseService
    );
  });

  describe('generateAndSaveTasks', () => {
    const mockContext = {
      goal: { title: 'Test Goal' },
      subGoal: { title: 'Test SubGoal' },
      action: {
        title: 'Test Action',
        description: 'Test Description',
        type: 'LEARNING',
        background: 'Test Background',
        constraints: 'Test Constraints',
      },
    };

    const mockAiTasks = [
      { title: 'Task 1', description: 'Desc 1', estimatedMinutes: 30 },
      { title: 'Task 2', description: 'Desc 2', estimatedMinutes: 45 },
    ];

    const mockSavedTasks = [
      {
        id: '1',
        title: 'Task 1',
        description: 'Desc 1',
        status: 'PENDING',
        estimatedTime: 30,
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '2',
        title: 'Task 2',
        description: 'Desc 2',
        status: 'PENDING',
        estimatedTime: 45,
        completedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    beforeEach(() => {
      mockContextService.getTaskGenerationContext.mockResolvedValue(mockContext);
      mockBedrockService.generateTasks.mockResolvedValue(mockAiTasks);
      mockQualityValidator.validateQuality.mockReturnValue(undefined);
      mockDatabaseService.executeInTransaction.mockImplementation(async callback => callback());
      mockDatabaseService.createTasks.mockResolvedValue(mockSavedTasks);
    });

    it('regenerate=falseの場合、既存タスクを削除しない', async () => {
      await service.generateAndSaveTasks('user1', 'action1', false);

      expect(mockDatabaseService.deleteExistingTasks).not.toHaveBeenCalled();
    });

    it('regenerate=trueの場合、既存タスクを削除する', async () => {
      await service.generateAndSaveTasks('user1', 'action1', true);

      expect(mockDatabaseService.deleteExistingTasks).toHaveBeenCalledWith('action1');
    });

    it('completedAtがnullの場合とnullでない場合の両方を処理する', async () => {
      const result = await service.generateAndSaveTasks('user1', 'action1', false);

      expect(result.tasks[0].completedAt).toBeNull();
      expect(result.tasks[1].completedAt).toBeTruthy();
    });

    it('estimatedTimeがnullの場合のデフォルト値を処理する', async () => {
      const tasksWithNullTime = [
        { ...mockSavedTasks[0], estimatedTime: null },
        { ...mockSavedTasks[1], estimatedTime: 0 },
      ];
      mockDatabaseService.createTasks.mockResolvedValue(tasksWithNullTime);

      const result = await service.generateAndSaveTasks('user1', 'action1', false);

      expect(result.tasks[0].estimatedMinutes).toBe(0);
      expect(result.metadata.totalEstimatedMinutes).toBe(0);
    });
  });
});
