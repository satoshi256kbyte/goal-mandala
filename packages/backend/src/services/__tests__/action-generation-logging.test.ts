/**
 * ActionGenerationService ログ出力テスト
 */

import { ActionGenerationService } from '../action-generation.service';
import { ContextService } from '../context.service';
import { BedrockService } from '../bedrock.service';
import { ActionQualityValidator } from '../action-quality-validator.service';
import { ActionTypeClassifier } from '../action-type-classifier.service';
import { ActionDatabaseService } from '../action-database.service';
import { logger } from '../../utils/logger';

// モック
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
  createTimer: jest.fn(() => ({
    end: jest.fn(() => 1000),
  })),
  logError: jest.fn(),
}));

describe('ActionGenerationService - ログ出力', () => {
  let service: ActionGenerationService;
  let contextService: jest.Mocked<ContextService>;
  let bedrockService: jest.Mocked<BedrockService>;
  let qualityValidator: jest.Mocked<ActionQualityValidator>;
  let typeClassifier: jest.Mocked<ActionTypeClassifier>;
  let databaseService: jest.Mocked<ActionDatabaseService>;

  beforeEach(() => {
    // モックのリセット
    jest.clearAllMocks();

    // サービスのモック作成
    contextService = {
      getGenerationContext: jest.fn(),
    } as unknown as jest.Mocked<ContextService>;

    bedrockService = {
      generateActions: jest.fn(),
    } as unknown as jest.Mocked<BedrockService>;

    qualityValidator = {
      validateQuality: jest.fn(),
    } as unknown as jest.Mocked<ActionQualityValidator>;

    typeClassifier = {
      classifyActions: jest.fn(),
    } as unknown as jest.Mocked<ActionTypeClassifier>;

    databaseService = {
      executeInTransaction: jest.fn(async callback => await callback()),
      deleteExistingActions: jest.fn(),
      createActions: jest.fn(),
    } as unknown as jest.Mocked<ActionDatabaseService>;

    // サービスのインスタンス化
    service = new ActionGenerationService(
      contextService,
      bedrockService,
      qualityValidator,
      typeClassifier,
      databaseService
    );
  });

  describe('正常系のログ出力', () => {
    it('アクション生成処理の各ステップでログが出力される', async () => {
      // モックデータの準備
      const mockContext = {
        goal: {
          id: 'goal-001',
          title: 'テスト目標',
          description: 'テスト目標の説明',
          deadline: new Date('2025-12-31'),
          background: 'テスト背景',
        },
        subGoal: {
          id: 'subgoal-001',
          title: 'テストサブ目標',
          description: 'テストサブ目標の説明',
          background: 'テスト背景',
          position: 0,
        },
        relatedSubGoals: [],
        user: {
          industry: 'IT',
          jobType: 'エンジニア',
        },
      };

      const mockGeneratedActions = Array.from({ length: 8 }, (_, i) => ({
        title: `アクション${i + 1}`,
        description: 'a'.repeat(150),
        background: '背景',
        type: 'execution' as const,
        position: i,
      }));

      const mockSavedActions = mockGeneratedActions.map((action, i) => ({
        id: `action-${i + 1}`,
        subGoalId: 'subgoal-001',
        ...action,
        progress: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      // モックの設定
      contextService.getGenerationContext.mockResolvedValue(mockContext);
      bedrockService.generateActions.mockResolvedValue(mockGeneratedActions);
      typeClassifier.classifyActions.mockReturnValue(mockGeneratedActions);
      databaseService.createActions.mockResolvedValue(mockSavedActions);

      // テスト実行
      await service.generateAndSaveActions('user-001', 'subgoal-001', false);

      // ログ出力の検証
      expect(logger.info).toHaveBeenCalledWith(
        'アクション生成処理開始',
        expect.objectContaining({
          userId: 'user-001',
          subGoalId: 'subgoal-001',
          regenerate: false,
          action: 'generate_and_save_actions_start',
        })
      );

      expect(logger.info).toHaveBeenCalledWith(
        'コンテキスト取得完了',
        expect.objectContaining({
          userId: 'user-001',
          subGoalId: 'subgoal-001',
          action: 'context_retrieved',
        })
      );

      expect(logger.info).toHaveBeenCalledWith(
        'AI生成完了',
        expect.objectContaining({
          userId: 'user-001',
          subGoalId: 'subgoal-001',
          actionCount: 8,
          action: 'ai_generation_completed',
        })
      );

      expect(logger.info).toHaveBeenCalledWith(
        '品質検証完了',
        expect.objectContaining({
          userId: 'user-001',
          subGoalId: 'subgoal-001',
          action: 'quality_validation_completed',
        })
      );

      expect(logger.info).toHaveBeenCalledWith(
        'アクション種別判定完了',
        expect.objectContaining({
          userId: 'user-001',
          subGoalId: 'subgoal-001',
          executionCount: 8,
          habitCount: 0,
          action: 'type_classification_completed',
        })
      );

      expect(logger.info).toHaveBeenCalledWith(
        'アクション保存完了',
        expect.objectContaining({
          userId: 'user-001',
          subGoalId: 'subgoal-001',
          savedCount: 8,
          action: 'actions_saved',
        })
      );

      expect(logger.info).toHaveBeenCalledWith(
        'アクション生成処理完了',
        expect.objectContaining({
          userId: 'user-001',
          subGoalId: 'subgoal-001',
          action: 'generate_and_save_actions_completed',
        })
      );
    });

    it('再生成時に既存アクション削除のログが出力される', async () => {
      // モックデータの準備
      const mockContext = {
        goal: {
          id: 'goal-001',
          title: 'テスト目標',
          description: 'テスト目標の説明',
          deadline: new Date('2025-12-31'),
          background: 'テスト背景',
        },
        subGoal: {
          id: 'subgoal-001',
          title: 'テストサブ目標',
          description: 'テストサブ目標の説明',
          background: 'テスト背景',
          position: 0,
        },
        relatedSubGoals: [],
        user: {},
      };

      const mockGeneratedActions = Array.from({ length: 8 }, (_, i) => ({
        title: `アクション${i + 1}`,
        description: 'a'.repeat(150),
        background: '背景',
        type: 'execution' as const,
        position: i,
      }));

      const mockSavedActions = mockGeneratedActions.map((action, i) => ({
        id: `action-${i + 1}`,
        subGoalId: 'subgoal-001',
        ...action,
        progress: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      // モックの設定
      contextService.getGenerationContext.mockResolvedValue(mockContext);
      bedrockService.generateActions.mockResolvedValue(mockGeneratedActions);
      typeClassifier.classifyActions.mockReturnValue(mockGeneratedActions);
      databaseService.createActions.mockResolvedValue(mockSavedActions);

      // テスト実行（regenerate=true）
      await service.generateAndSaveActions('user-001', 'subgoal-001', true);

      // 既存アクション削除のログ出力を検証
      expect(logger.info).toHaveBeenCalledWith(
        '既存アクション削除完了',
        expect.objectContaining({
          userId: 'user-001',
          subGoalId: 'subgoal-001',
          action: 'existing_actions_deleted',
        })
      );

      // deleteExistingActionsが呼ばれたことを確認
      expect(databaseService.deleteExistingActions).toHaveBeenCalledWith('subgoal-001');
    });

    it('処理時間がログに記録される', async () => {
      // モックデータの準備
      const mockContext = {
        goal: {
          id: 'goal-001',
          title: 'テスト目標',
          description: 'テスト目標の説明',
          deadline: new Date('2025-12-31'),
          background: 'テスト背景',
        },
        subGoal: {
          id: 'subgoal-001',
          title: 'テストサブ目標',
          description: 'テストサブ目標の説明',
          background: 'テスト背景',
          position: 0,
        },
        relatedSubGoals: [],
        user: {},
      };

      const mockGeneratedActions = Array.from({ length: 8 }, (_, i) => ({
        title: `アクション${i + 1}`,
        description: 'a'.repeat(150),
        background: '背景',
        type: 'execution' as const,
        position: i,
      }));

      const mockSavedActions = mockGeneratedActions.map((action, i) => ({
        id: `action-${i + 1}`,
        subGoalId: 'subgoal-001',
        ...action,
        progress: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      // モックの設定
      contextService.getGenerationContext.mockResolvedValue(mockContext);
      bedrockService.generateActions.mockResolvedValue(mockGeneratedActions);
      typeClassifier.classifyActions.mockReturnValue(mockGeneratedActions);
      databaseService.createActions.mockResolvedValue(mockSavedActions);

      // テスト実行
      await service.generateAndSaveActions('user-001', 'subgoal-001', false);

      // 処理時間がログに含まれることを確認
      expect(logger.info).toHaveBeenCalledWith(
        'コンテキスト取得完了',
        expect.objectContaining({
          duration: expect.stringMatching(/^\d+ms$/),
        })
      );

      expect(logger.info).toHaveBeenCalledWith(
        'AI生成完了',
        expect.objectContaining({
          duration: expect.stringMatching(/^\d+ms$/),
        })
      );

      expect(logger.info).toHaveBeenCalledWith(
        'アクション生成処理完了',
        expect.objectContaining({
          totalDuration: expect.stringMatching(/^\d+ms$/),
        })
      );
    });
  });
});
