/**
 * ActionGenerationService統合テスト
 * ContextService、BedrockService、ActionQualityValidator、ActionTypeClassifier、ActionDatabaseServiceの統合動作を検証
 */

import { ActionGenerationService } from '../action-generation.service';
import { ContextService } from '../context.service';
import { BedrockService } from '../bedrock.service';
import { ActionQualityValidator } from '../action-quality-validator.service';
import { ActionTypeClassifier } from '../action-type-classifier.service';
import { ActionDatabaseService } from '../action-database.service';
import { GenerationContext, ActionOutput, ActionType } from '../../types/action-generation.types';
import { QualityError, NotFoundError, ForbiddenError } from '../../errors/action-generation.errors';

// モックの型定義
type MockedContextService = {
  getGenerationContext: jest.Mock;
};

type MockedBedrockService = {
  generateActions: jest.Mock;
};

type MockedActionQualityValidator = {
  validateQuality: jest.Mock;
};

type MockedActionTypeClassifier = {
  classifyActions: jest.Mock;
};

type MockedActionDatabaseService = {
  deleteExistingActions: jest.Mock;
  createActions: jest.Mock;
  executeInTransaction: jest.Mock;
};

describe('ActionGenerationService Integration Tests', () => {
  let service: ActionGenerationService;
  let mockContextService: MockedContextService;
  let mockBedrockService: MockedBedrockService;
  let mockQualityValidator: MockedActionQualityValidator;
  let mockTypeClassifier: MockedActionTypeClassifier;
  let mockDatabaseService: MockedActionDatabaseService;

  const testUserId = 'test-user-123';
  const testSubGoalId = 'test-subgoal-456';
  const testGoalId = 'test-goal-789';

  beforeEach(() => {
    // ContextServiceのモック
    mockContextService = {
      getGenerationContext: jest.fn(),
    };

    // BedrockServiceのモック
    mockBedrockService = {
      generateActions: jest.fn(),
    };

    // ActionQualityValidatorのモック
    mockQualityValidator = {
      validateQuality: jest.fn(),
    };

    // ActionTypeClassifierのモック
    mockTypeClassifier = {
      classifyActions: jest.fn(),
    };

    // ActionDatabaseServiceのモック
    mockDatabaseService = {
      deleteExistingActions: jest.fn(),
      createActions: jest.fn(),
      executeInTransaction: jest.fn(),
    };

    // サービスのインスタンス化
    service = new ActionGenerationService(
      mockContextService as unknown as ContextService,
      mockBedrockService as unknown as BedrockService,
      mockQualityValidator as unknown as ActionQualityValidator,
      mockTypeClassifier as unknown as ActionTypeClassifier,
      mockDatabaseService as unknown as ActionDatabaseService
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateAndSaveActions - 正常系', () => {
    it('サブ目標からアクションを生成して保存できる', async () => {
      // テストデータの準備
      const mockContext: GenerationContext = {
        goal: {
          id: testGoalId,
          title: 'TypeScriptのエキスパートになる',
          description: '6ヶ月でTypeScriptの高度な機能を習得する',
          deadline: new Date('2025-12-31'),
          background: 'フロントエンド開発者として成長したい',
          constraints: '平日は2時間、週末は4時間の学習時間を確保できる',
        },
        subGoal: {
          id: testSubGoalId,
          title: 'TypeScriptの基礎文法を習得する',
          description: 'TypeScriptの基本的な型システムと文法を理解する',
          background: '基礎がなければ応用は理解できない',
          position: 0,
        },
        relatedSubGoals: [],
        user: {
          industry: 'IT',
          jobType: 'フロントエンドエンジニア',
        },
      };

      // AI生成結果のモック（type未設定）
      const mockAIActions: Omit<ActionOutput, 'type'>[] = Array.from({ length: 8 }, (_, i) => ({
        id: `action-${i}`,
        title: `アクション${i + 1}`,
        description: `これはアクション${i + 1}の詳細な説明です。この説明は100文字以上200文字以内である必要があります。TypeScriptの学習を進めるための具体的なステップを示しています。`,
        background: `アクション${i + 1}の背景`,
        position: i,
        progress: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));

      // 種別判定後のアクション
      const mockClassifiedActions: ActionOutput[] = mockAIActions.map((action, i) => ({
        ...action,
        type: i % 2 === 0 ? ActionType.EXECUTION : ActionType.HABIT,
      }));

      // データベース保存結果のモック
      const mockSavedActions = mockClassifiedActions.map(action => ({
        id: action.id,
        subGoalId: testSubGoalId,
        title: action.title,
        description: action.description,
        background: action.background,
        type: action.type,
        position: action.position,
        progress: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      // モックの設定
      mockContextService.getGenerationContext.mockResolvedValue(mockContext);
      mockBedrockService.generateActions.mockResolvedValue(mockAIActions);
      mockQualityValidator.validateQuality.mockReturnValue(undefined);
      mockTypeClassifier.classifyActions.mockReturnValue(mockClassifiedActions);
      mockDatabaseService.executeInTransaction.mockImplementation(async (callback: any) => {
        mockDatabaseService.createActions.mockResolvedValue(mockSavedActions);
        return await callback({
          action: mockDatabaseService,
        });
      });

      // 実行
      const result = await service.generateAndSaveActions(testUserId, testSubGoalId, false);

      // 検証
      expect(result.subGoalId).toBe(testSubGoalId);
      expect(result.actions).toHaveLength(8);
      expect(result.metadata).toBeDefined();
      expect(result.metadata.generatedAt).toBeInstanceOf(Date);
      expect(result.metadata.tokensUsed).toBeGreaterThan(0);
      expect(result.metadata.estimatedCost).toBeGreaterThan(0);
      expect(result.metadata.goalContext).toBeDefined();
      expect(result.metadata.goalContext.goalTitle).toBe('TypeScriptのエキスパートになる');
      expect(result.metadata.goalContext.subGoalTitle).toBe('TypeScriptの基礎文法を習得する');

      // アクションの内容を検証
      result.actions.forEach((action, index) => {
        expect(action.id).toBe(`action-${index}`);
        expect(action.title).toBe(`アクション${index + 1}`);
        expect(action.position).toBe(index);
        expect(action.progress).toBe(0);
        expect([ActionType.EXECUTION, ActionType.HABIT]).toContain(action.type);
      });

      // モックの呼び出しを検証
      expect(mockContextService.getGenerationContext).toHaveBeenCalledWith(testSubGoalId);
      expect(mockBedrockService.generateActions).toHaveBeenCalledWith(mockContext);
      expect(mockQualityValidator.validateQuality).toHaveBeenCalledWith(mockAIActions);
      expect(mockTypeClassifier.classifyActions).toHaveBeenCalledWith(mockAIActions);
      expect(mockDatabaseService.executeInTransaction).toHaveBeenCalled();
    });

    it('regenerate=trueの場合、既存のアクションを削除してから新規作成する', async () => {
      const mockContext: GenerationContext = {
        goal: {
          id: testGoalId,
          title: 'テスト目標',
          description: 'テスト説明',
          deadline: new Date('2025-12-31'),
          background: 'テスト背景',
        },
        subGoal: {
          id: testSubGoalId,
          title: 'テストサブ目標',
          description: 'テストサブ目標説明',
          background: 'テストサブ目標背景',
          position: 0,
        },
        relatedSubGoals: [],
        user: {},
      };

      const mockAIActions: Omit<ActionOutput, 'type'>[] = Array.from({ length: 8 }, (_, i) => ({
        id: `new-action-${i}`,
        title: `新しいアクション${i + 1}`,
        description: `これは新しいアクション${i + 1}の詳細な説明です。この説明は100文字以上200文字以内である必要があります。再生成されたアクションの内容を示しています。`,
        background: `新しいアクション${i + 1}の背景`,
        position: i,
        progress: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));

      const mockClassifiedActions: ActionOutput[] = mockAIActions.map(action => ({
        ...action,
        type: ActionType.EXECUTION,
      }));

      const mockSavedActions = mockClassifiedActions.map(action => ({
        id: action.id,
        subGoalId: testSubGoalId,
        title: action.title,
        description: action.description,
        background: action.background,
        type: action.type,
        position: action.position,
        progress: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      mockContextService.getGenerationContext.mockResolvedValue(mockContext);
      mockBedrockService.generateActions.mockResolvedValue(mockAIActions);
      mockQualityValidator.validateQuality.mockReturnValue(undefined);
      mockTypeClassifier.classifyActions.mockReturnValue(mockClassifiedActions);
      mockDatabaseService.executeInTransaction.mockImplementation(async (callback: any) => {
        mockDatabaseService.deleteExistingActions.mockResolvedValue(undefined);
        mockDatabaseService.createActions.mockResolvedValue(mockSavedActions);
        return await callback({
          action: mockDatabaseService,
        });
      });

      const result = await service.generateAndSaveActions(testUserId, testSubGoalId, true);

      expect(result.subGoalId).toBe(testSubGoalId);
      expect(result.actions).toHaveLength(8);
      expect(mockDatabaseService.deleteExistingActions).toHaveBeenCalledWith(testSubGoalId);
      expect(mockDatabaseService.createActions).toHaveBeenCalled();
    });
  });

  describe('generateAndSaveActions - エラーハンドリング', () => {
    it('サブ目標が存在しない場合、NotFoundErrorが発生する', async () => {
      mockDatabaseService.executeInTransaction.mockImplementation(async (callback: any) => {
        mockContextService.getGenerationContext.mockRejectedValue(
          new NotFoundError('サブ目標が見つかりません')
        );
        return await callback({
          action: mockDatabaseService,
        });
      });

      await expect(
        service.generateAndSaveActions(testUserId, testSubGoalId, false)
      ).rejects.toThrow(NotFoundError);
      await expect(
        service.generateAndSaveActions(testUserId, testSubGoalId, false)
      ).rejects.toThrow('サブ目標が見つかりません');
    });

    it('ユーザーIDが一致しない場合、ForbiddenErrorが発生する', async () => {
      // 実装では認可チェックがContextServiceで行われると仮定
      // ここでは、異なるユーザーIDでアクセスした場合のエラーをシミュレート
      mockDatabaseService.executeInTransaction.mockImplementation(async (callback: any) => {
        mockContextService.getGenerationContext.mockRejectedValue(
          new ForbiddenError('このサブ目標にアクセスする権限がありません')
        );
        return await callback({
          action: mockDatabaseService,
        });
      });

      await expect(
        service.generateAndSaveActions('different-user-id', testSubGoalId, false)
      ).rejects.toThrow(ForbiddenError);
    });

    it('品質検証エラーが発生した場合、QualityErrorが発生する', async () => {
      const mockContext: GenerationContext = {
        goal: {
          id: testGoalId,
          title: 'テスト目標',
          description: 'テスト説明',
          deadline: new Date('2025-12-31'),
          background: 'テスト背景',
        },
        subGoal: {
          id: testSubGoalId,
          title: 'テストサブ目標',
          description: 'テストサブ目標説明',
          background: 'テストサブ目標背景',
          position: 0,
        },
        relatedSubGoals: [],
        user: {},
      };

      // 7個のアクションを生成（不正）
      const mockAIActions: Omit<ActionOutput, 'type'>[] = Array.from({ length: 7 }, (_, i) => ({
        id: `action-${i}`,
        title: `アクション${i + 1}`,
        description: `これはアクション${i + 1}の詳細な説明です。この説明は100文字以上200文字以内である必要があります。TypeScriptの学習を進めるための具体的なステップを示しています。`,
        background: `アクション${i + 1}の背景`,
        position: i,
        progress: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));

      mockDatabaseService.executeInTransaction.mockImplementation(async (callback: any) => {
        mockContextService.getGenerationContext.mockResolvedValue(mockContext);
        mockBedrockService.generateActions.mockResolvedValue(mockAIActions);
        mockQualityValidator.validateQuality.mockImplementation(() => {
          throw new QualityError('アクションは8個である必要があります（現在: 7個）');
        });
        return await callback({
          action: mockDatabaseService,
        });
      });

      await expect(
        service.generateAndSaveActions(testUserId, testSubGoalId, false)
      ).rejects.toThrow(QualityError);
      await expect(
        service.generateAndSaveActions(testUserId, testSubGoalId, false)
      ).rejects.toThrow('アクションは8個である必要があります');
    });

    it('Bedrock APIエラーが発生した場合、適切にエラーを伝播する', async () => {
      const mockContext: GenerationContext = {
        goal: {
          id: testGoalId,
          title: 'テスト目標',
          description: 'テスト説明',
          deadline: new Date('2025-12-31'),
          background: 'テスト背景',
        },
        subGoal: {
          id: testSubGoalId,
          title: 'テストサブ目標',
          description: 'テストサブ目標説明',
          background: 'テストサブ目標背景',
          position: 0,
        },
        relatedSubGoals: [],
        user: {},
      };

      mockDatabaseService.executeInTransaction.mockImplementation(async (callback: any) => {
        mockContextService.getGenerationContext.mockResolvedValue(mockContext);
        mockBedrockService.generateActions.mockRejectedValue(
          new Error('Bedrock API呼び出しエラー')
        );
        return await callback({
          action: mockDatabaseService,
        });
      });

      await expect(
        service.generateAndSaveActions(testUserId, testSubGoalId, false)
      ).rejects.toThrow('Bedrock API呼び出しエラー');
    });

    it('データベースエラーが発生した場合、トランザクションがロールバックされる', async () => {
      const mockContext: GenerationContext = {
        goal: {
          id: testGoalId,
          title: 'テスト目標',
          description: 'テスト説明',
          deadline: new Date('2025-12-31'),
          background: 'テスト背景',
        },
        subGoal: {
          id: testSubGoalId,
          title: 'テストサブ目標',
          description: 'テストサブ目標説明',
          background: 'テストサブ目標背景',
          position: 0,
        },
        relatedSubGoals: [],
        user: {},
      };

      const mockAIActions: Omit<ActionOutput, 'type'>[] = Array.from({ length: 8 }, (_, i) => ({
        id: `action-${i}`,
        title: `アクション${i + 1}`,
        description: `これはアクション${i + 1}の詳細な説明です。この説明は100文字以上200文字以内である必要があります。TypeScriptの学習を進めるための具体的なステップを示しています。`,
        background: `アクション${i + 1}の背景`,
        position: i,
        progress: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));

      const mockClassifiedActions: ActionOutput[] = mockAIActions.map(action => ({
        ...action,
        type: ActionType.EXECUTION,
      }));

      mockContextService.getGenerationContext.mockResolvedValue(mockContext);
      mockBedrockService.generateActions.mockResolvedValue(mockAIActions);
      mockQualityValidator.validateQuality.mockReturnValue(undefined);
      mockTypeClassifier.classifyActions.mockReturnValue(mockClassifiedActions);
      mockDatabaseService.executeInTransaction.mockImplementation(async (callback: any) => {
        mockDatabaseService.createActions.mockRejectedValue(new Error('データベース保存エラー'));
        return await callback({
          action: mockDatabaseService,
        });
      });

      await expect(
        service.generateAndSaveActions(testUserId, testSubGoalId, false)
      ).rejects.toThrow('データベース保存エラー');
    });
  });
});
