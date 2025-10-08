/**
 * SubGoalGenerationService統合テスト
 * BedrockService、DatabaseService、QualityValidatorの統合動作を検証
 */

import { SubGoalGenerationService } from '../subgoal-generation.service';
import { BedrockService } from '../bedrock.service';
import { DatabaseService } from '../subgoal-database.service';
import { SubGoalQualityValidator } from '../subgoal-quality-validator.service';
import { SubGoalGenerationRequest } from '../../types/subgoal-generation.types';
import { SubGoalOutput as AISubGoalOutput } from '../../types/ai-generation.types';
import { QualityError } from '../../errors/subgoal-generation.errors';

// モックの型定義
type MockedBedrockService = {
  generateSubGoals: jest.Mock;
};

type MockedDatabaseService = {
  createGoal: jest.Mock;
  updateGoal: jest.Mock;
  deleteExistingSubGoals: jest.Mock;
  createSubGoals: jest.Mock;
  executeInTransaction: jest.Mock;
};

type MockedQualityValidator = {
  validateQuality: jest.Mock;
};

describe('SubGoalGenerationService Integration Tests', () => {
  let service: SubGoalGenerationService;
  let mockBedrockService: MockedBedrockService;
  let mockDatabaseService: MockedDatabaseService;
  let mockQualityValidator: MockedQualityValidator;

  const testUserId = 'test-user-123';
  const testGoalId = 'test-goal-456';
  const testRequestId = 'test-request-789';

  beforeEach(() => {
    // BedrockServiceのモック
    mockBedrockService = {
      generateSubGoals: jest.fn(),
    };

    // DatabaseServiceのモック
    mockDatabaseService = {
      createGoal: jest.fn(),
      updateGoal: jest.fn(),
      deleteExistingSubGoals: jest.fn(),
      createSubGoals: jest.fn(),
      executeInTransaction: jest.fn(),
    };

    // QualityValidatorのモック
    mockQualityValidator = {
      validateQuality: jest.fn(),
    };

    // サービスのインスタンス化
    service = new SubGoalGenerationService(
      mockBedrockService as unknown as BedrockService,
      mockDatabaseService as unknown as DatabaseService,
      mockQualityValidator as unknown as SubGoalQualityValidator
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateAndSaveSubGoals - 新規目標作成', () => {
    it('新規目標からサブ目標を生成して保存できる', async () => {
      const request: SubGoalGenerationRequest = {
        title: 'TypeScriptのエキスパートになる',
        description: '6ヶ月でTypeScriptの高度な機能を習得する',
        deadline: '2025-12-31T23:59:59Z',
        background: 'フロントエンド開発者として成長したい',
        constraints: '平日は2時間、週末は4時間の学習時間を確保できる',
      };

      // AI生成結果のモック
      const mockAISubGoals: AISubGoalOutput[] = Array.from({ length: 8 }, (_, i) => ({
        title: `サブ目標${i + 1}`,
        description: `これはサブ目標${i + 1}の詳細な説明です。この説明は50文字以上200文字以内である必要があります。`,
        background: `サブ目標${i + 1}の背景`,
        position: i,
      }));

      // データベース保存結果のモック
      const mockSavedSubGoals = mockAISubGoals.map((sg, i) => ({
        id: `subgoal-${i}`,
        goalId: testGoalId,
        title: sg.title,
        description: sg.description,
        background: sg.background,
        constraints: null,
        position: sg.position,
        progress: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      // モックの設定
      mockBedrockService.generateSubGoals.mockResolvedValue(mockAISubGoals);
      mockDatabaseService.executeInTransaction.mockImplementation(async (callback: any) => {
        // トランザクション内の処理をシミュレート
        mockDatabaseService.createGoal.mockResolvedValue(testGoalId);
        mockDatabaseService.createSubGoals.mockResolvedValue(mockSavedSubGoals);
        mockQualityValidator.validateQuality.mockReturnValue(undefined);

        return await callback({
          goal: mockDatabaseService,
          subGoal: mockDatabaseService,
        });
      });

      // 実行
      const result = await service.generateAndSaveSubGoals(testUserId, request, testRequestId);

      // 検証
      expect(result.goalId).toBe(testGoalId);
      expect(result.subGoals).toHaveLength(8);
      expect(result.metadata).toBeDefined();
      expect(result.metadata.generatedAt).toBeInstanceOf(Date);
      expect(result.metadata.tokensUsed).toBeGreaterThan(0);
      expect(result.metadata.estimatedCost).toBeGreaterThan(0);

      // サブ目標の内容を検証
      result.subGoals.forEach((subGoal, index) => {
        expect(subGoal.id).toBe(`subgoal-${index}`);
        expect(subGoal.title).toBe(`サブ目標${index + 1}`);
        expect(subGoal.position).toBe(index);
        expect(subGoal.progress).toBe(0);
      });

      // モックの呼び出しを検証
      expect(mockBedrockService.generateSubGoals).toHaveBeenCalledWith({
        title: request.title,
        description: request.description,
        deadline: request.deadline,
        background: request.background,
        constraints: request.constraints,
      });
      expect(mockDatabaseService.executeInTransaction).toHaveBeenCalled();
    });

    it('制約事項なしで新規目標を作成できる', async () => {
      const request: SubGoalGenerationRequest = {
        title: 'テスト目標',
        description: 'テスト説明',
        deadline: '2025-12-31T23:59:59Z',
        background: 'テスト背景',
      };

      const mockAISubGoals: AISubGoalOutput[] = Array.from({ length: 8 }, (_, i) => ({
        title: `サブ目標${i + 1}`,
        description: `これはサブ目標${i + 1}の詳細な説明です。この説明は50文字以上200文字以内である必要があります。`,
        background: `サブ目標${i + 1}の背景`,
        position: i,
      }));

      const mockSavedSubGoals = mockAISubGoals.map((sg, i) => ({
        id: `subgoal-${i}`,
        goalId: testGoalId,
        title: sg.title,
        description: sg.description,
        background: sg.background,
        constraints: null,
        position: sg.position,
        progress: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      mockBedrockService.generateSubGoals.mockResolvedValue(mockAISubGoals);
      mockDatabaseService.executeInTransaction.mockImplementation(async (callback: any) => {
        mockDatabaseService.createGoal.mockResolvedValue(testGoalId);
        mockDatabaseService.createSubGoals.mockResolvedValue(mockSavedSubGoals);
        mockQualityValidator.validateQuality.mockReturnValue(undefined);

        return await callback({
          goal: mockDatabaseService,
          subGoal: mockDatabaseService,
        });
      });

      const result = await service.generateAndSaveSubGoals(testUserId, request, testRequestId);

      expect(result.goalId).toBe(testGoalId);
      expect(result.subGoals).toHaveLength(8);
      expect(mockBedrockService.generateSubGoals).toHaveBeenCalledWith({
        title: request.title,
        description: request.description,
        deadline: request.deadline,
        background: request.background,
        constraints: undefined,
      });
    });
  });

  describe('generateAndSaveSubGoals - 既存目標更新', () => {
    it('既存目標のサブ目標を再生成できる', async () => {
      const request: SubGoalGenerationRequest = {
        goalId: testGoalId,
        title: '更新された目標',
        description: '更新された説明',
        deadline: '2026-06-30T23:59:59Z',
        background: '更新された背景',
        constraints: '新しい制約',
      };

      const mockAISubGoals: AISubGoalOutput[] = Array.from({ length: 8 }, (_, i) => ({
        title: `更新されたサブ目標${i + 1}`,
        description: `これは更新されたサブ目標${i + 1}の詳細な説明です。この説明は50文字以上200文字以内である必要があります。`,
        background: `更新されたサブ目標${i + 1}の背景`,
        position: i,
      }));

      const mockSavedSubGoals = mockAISubGoals.map((sg, i) => ({
        id: `new-subgoal-${i}`,
        goalId: testGoalId,
        title: sg.title,
        description: sg.description,
        background: sg.background,
        constraints: null,
        position: sg.position,
        progress: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      mockBedrockService.generateSubGoals.mockResolvedValue(mockAISubGoals);
      mockDatabaseService.executeInTransaction.mockImplementation(async (callback: any) => {
        mockDatabaseService.updateGoal.mockResolvedValue(undefined);
        mockDatabaseService.deleteExistingSubGoals.mockResolvedValue(undefined);
        mockDatabaseService.createSubGoals.mockResolvedValue(mockSavedSubGoals);
        mockQualityValidator.validateQuality.mockReturnValue(undefined);

        return await callback({
          goal: mockDatabaseService,
          subGoal: mockDatabaseService,
        });
      });

      const result = await service.generateAndSaveSubGoals(testUserId, request, testRequestId);

      expect(result.goalId).toBe(testGoalId);
      expect(result.subGoals).toHaveLength(8);

      result.subGoals.forEach((subGoal, index) => {
        expect(subGoal.title).toBe(`更新されたサブ目標${index + 1}`);
        expect(subGoal.position).toBe(index);
      });
    });
  });

  describe('品質検証エラー', () => {
    it('サブ目標の個数が8個でない場合エラーが発生する', async () => {
      const request: SubGoalGenerationRequest = {
        title: 'テスト目標',
        description: 'テスト説明',
        deadline: '2025-12-31T23:59:59Z',
        background: 'テスト背景',
      };

      // 7個のサブ目標を生成（不正）
      const mockAISubGoals: AISubGoalOutput[] = Array.from({ length: 7 }, (_, i) => ({
        title: `サブ目標${i + 1}`,
        description: `これはサブ目標${i + 1}の詳細な説明です。この説明は50文字以上200文字以内である必要があります。`,
        background: `サブ目標${i + 1}の背景`,
        position: i,
      }));

      mockBedrockService.generateSubGoals.mockResolvedValue(mockAISubGoals);
      mockDatabaseService.executeInTransaction.mockImplementation(async (callback: any) => {
        mockDatabaseService.createGoal.mockResolvedValue(testGoalId);
        mockQualityValidator.validateQuality.mockImplementation(() => {
          throw new QualityError('サブ目標は8個である必要があります（現在: 7個）');
        });

        return await callback({
          goal: mockDatabaseService,
          subGoal: mockDatabaseService,
        });
      });

      await expect(
        service.generateAndSaveSubGoals(testUserId, request, testRequestId)
      ).rejects.toThrow('サブ目標は8個である必要があります');
    });

    it('サブ目標のタイトルが長すぎる場合エラーが発生する', async () => {
      const request: SubGoalGenerationRequest = {
        title: 'テスト目標',
        description: 'テスト説明',
        deadline: '2025-12-31T23:59:59Z',
        background: 'テスト背景',
      };

      const mockAISubGoals: AISubGoalOutput[] = Array.from({ length: 8 }, (_, i) => ({
        title: `これは非常に長いサブ目標のタイトルです。30文字を超えています。${i + 1}`,
        description: `これはサブ目標${i + 1}の詳細な説明です。この説明は50文字以上200文字以内である必要があります。`,
        background: `サブ目標${i + 1}の背景`,
        position: i,
      }));

      mockBedrockService.generateSubGoals.mockResolvedValue(mockAISubGoals);
      mockDatabaseService.executeInTransaction.mockImplementation(async (callback: any) => {
        mockDatabaseService.createGoal.mockResolvedValue(testGoalId);
        mockQualityValidator.validateQuality.mockImplementation(() => {
          throw new QualityError('サブ目標1のタイトルが長すぎます');
        });

        return await callback({
          goal: mockDatabaseService,
          subGoal: mockDatabaseService,
        });
      });

      await expect(
        service.generateAndSaveSubGoals(testUserId, request, testRequestId)
      ).rejects.toThrow('サブ目標1のタイトルが長すぎます');
    });

    it('サブ目標の説明が短すぎる場合エラーが発生する', async () => {
      const request: SubGoalGenerationRequest = {
        title: 'テスト目標',
        description: 'テスト説明',
        deadline: '2025-12-31T23:59:59Z',
        background: 'テスト背景',
      };

      const mockAISubGoals: AISubGoalOutput[] = Array.from({ length: 8 }, (_, i) => ({
        title: `サブ目標${i + 1}`,
        description: '短い説明', // 50文字未満
        background: `サブ目標${i + 1}の背景`,
        position: i,
      }));

      mockBedrockService.generateSubGoals.mockResolvedValue(mockAISubGoals);
      mockDatabaseService.executeInTransaction.mockImplementation(async (callback: any) => {
        mockDatabaseService.createGoal.mockResolvedValue(testGoalId);
        mockQualityValidator.validateQuality.mockImplementation(() => {
          throw new QualityError('サブ目標1の説明が短すぎます');
        });

        return await callback({
          goal: mockDatabaseService,
          subGoal: mockDatabaseService,
        });
      });

      await expect(
        service.generateAndSaveSubGoals(testUserId, request, testRequestId)
      ).rejects.toThrow('サブ目標1の説明が短すぎます');
    });
  });

  describe('エラーハンドリング', () => {
    it('Bedrock APIエラーが発生した場合、適切にエラーを伝播する', async () => {
      const request: SubGoalGenerationRequest = {
        title: 'テスト目標',
        description: 'テスト説明',
        deadline: '2025-12-31T23:59:59Z',
        background: 'テスト背景',
      };

      mockBedrockService.generateSubGoals.mockRejectedValue(new Error('Bedrock API呼び出しエラー'));
      mockDatabaseService.executeInTransaction.mockImplementation(async (callback: any) => {
        mockDatabaseService.createGoal.mockResolvedValue(testGoalId);
        return await callback({
          goal: mockDatabaseService,
          subGoal: mockDatabaseService,
        });
      });

      await expect(
        service.generateAndSaveSubGoals(testUserId, request, testRequestId)
      ).rejects.toThrow('Bedrock API呼び出しエラー');
    });

    it('データベースエラーが発生した場合、トランザクションがロールバックされる', async () => {
      const request: SubGoalGenerationRequest = {
        title: 'テスト目標',
        description: 'テスト説明',
        deadline: '2025-12-31T23:59:59Z',
        background: 'テスト背景',
      };

      const mockAISubGoals: AISubGoalOutput[] = Array.from({ length: 8 }, (_, i) => ({
        title: `サブ目標${i + 1}`,
        description: `これはサブ目標${i + 1}の詳細な説明です。この説明は50文字以上200文字以内である必要があります。`,
        background: `サブ目標${i + 1}の背景`,
        position: i,
      }));

      mockBedrockService.generateSubGoals.mockResolvedValue(mockAISubGoals);
      mockDatabaseService.executeInTransaction.mockImplementation(async (callback: any) => {
        mockDatabaseService.createGoal.mockResolvedValue(testGoalId);
        mockDatabaseService.createSubGoals.mockRejectedValue(new Error('データベース保存エラー'));
        mockQualityValidator.validateQuality.mockReturnValue(undefined);

        return await callback({
          goal: mockDatabaseService,
          subGoal: mockDatabaseService,
        });
      });

      await expect(
        service.generateAndSaveSubGoals(testUserId, request, testRequestId)
      ).rejects.toThrow('データベース保存エラー');
    });

    it('トランザクション全体がエラーの場合、適切にエラーを伝播する', async () => {
      const request: SubGoalGenerationRequest = {
        title: 'テスト目標',
        description: 'テスト説明',
        deadline: '2025-12-31T23:59:59Z',
        background: 'テスト背景',
      };

      mockDatabaseService.executeInTransaction.mockRejectedValue(
        new Error('トランザクションエラー')
      );

      await expect(
        service.generateAndSaveSubGoals(testUserId, request, testRequestId)
      ).rejects.toThrow('トランザクションエラー');
    });
  });

  describe('エンドツーエンドシナリオ', () => {
    it('完全なサブ目標生成フローが正常に動作する', async () => {
      const request: SubGoalGenerationRequest = {
        title: 'プロジェクトマネージャーとして成長する',
        description: '1年でプロジェクトマネージャーとして必要なスキルを習得する',
        deadline: '2025-12-31T23:59:59Z',
        background: 'チームリーダーからステップアップしたい',
        constraints: '週に10時間の学習時間を確保できる',
      };

      const mockAISubGoals: AISubGoalOutput[] = [
        {
          title: 'プロジェクト管理の基礎を学ぶ',
          description:
            'PMBOKやアジャイル手法などのプロジェクト管理の基礎知識を体系的に学習し、実務で活用できるレベルまで理解を深める。',
          background: 'プロジェクト管理の基礎知識がなければ、効果的なマネジメントは困難である',
          position: 0,
        },
        {
          title: 'リーダーシップスキルを向上させる',
          description:
            'チームメンバーを効果的に導き、モチベーションを高めるためのリーダーシップスキルを習得し、実践する。',
          background: 'プロジェクトマネージャーにはチームを率いるリーダーシップが不可欠である',
          position: 1,
        },
        {
          title: 'コミュニケーション能力を強化する',
          description:
            'ステークホルダーとの効果的なコミュニケーション方法を学び、プレゼンテーションや交渉のスキルを向上させる。',
          background: 'プロジェクトの成功には関係者との円滑なコミュニケーションが重要である',
          position: 2,
        },
        {
          title: 'リスク管理手法を習得する',
          description:
            'プロジェクトのリスクを特定、評価、対応する手法を学び、リスク管理計画を作成できるようになる。',
          background: 'リスク管理はプロジェクトの成功確率を高めるために必須のスキルである',
          position: 3,
        },
        {
          title: '予算管理スキルを身につける',
          description:
            'プロジェクトの予算計画、コスト管理、財務報告の方法を学び、予算内でプロジェクトを完遂できるようになる。',
          background: '予算管理はプロジェクトマネージャーの重要な責任の一つである',
          position: 4,
        },
        {
          title: 'スケジュール管理を最適化する',
          description:
            'WBS作成、クリティカルパス分析、進捗管理などのスケジュール管理手法を習得し、期限内にプロジェクトを完了させる。',
          background: 'スケジュール管理はプロジェクトの成功に直結する重要なスキルである',
          position: 5,
        },
        {
          title: '品質管理の知識を深める',
          description:
            '品質計画、品質保証、品質管理の手法を学び、高品質な成果物を提供できるプロセスを構築する。',
          background: '品質管理はプロジェクトの成果物の価値を決定する重要な要素である',
          position: 6,
        },
        {
          title: '実践経験を積む',
          description:
            '小規模プロジェクトのマネジメントを実際に担当し、学んだ知識を実践で活用して経験を積む。',
          background: '理論だけでなく実践経験を積むことで、真のスキルが身につく',
          position: 7,
        },
      ];

      const mockSavedSubGoals = mockAISubGoals.map((sg, i) => ({
        id: `subgoal-${i}`,
        goalId: testGoalId,
        title: sg.title,
        description: sg.description,
        background: sg.background,
        constraints: null,
        position: sg.position,
        progress: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      mockBedrockService.generateSubGoals.mockResolvedValue(mockAISubGoals);
      mockDatabaseService.executeInTransaction.mockImplementation(async (callback: any) => {
        mockDatabaseService.createGoal.mockResolvedValue(testGoalId);
        mockDatabaseService.createSubGoals.mockResolvedValue(mockSavedSubGoals);
        mockQualityValidator.validateQuality.mockReturnValue(undefined);

        return await callback({
          goal: mockDatabaseService,
          subGoal: mockDatabaseService,
        });
      });

      const result = await service.generateAndSaveSubGoals(testUserId, request, testRequestId);

      // 結果の検証
      expect(result.goalId).toBe(testGoalId);
      expect(result.subGoals).toHaveLength(8);
      expect(result.metadata).toBeDefined();

      // 各サブ目標の検証
      expect(result.subGoals[0].title).toBe('プロジェクト管理の基礎を学ぶ');
      expect(result.subGoals[1].title).toBe('リーダーシップスキルを向上させる');
      expect(result.subGoals[2].title).toBe('コミュニケーション能力を強化する');
      expect(result.subGoals[3].title).toBe('リスク管理手法を習得する');
      expect(result.subGoals[4].title).toBe('予算管理スキルを身につける');
      expect(result.subGoals[5].title).toBe('スケジュール管理を最適化する');
      expect(result.subGoals[6].title).toBe('品質管理の知識を深める');
      expect(result.subGoals[7].title).toBe('実践経験を積む');

      // position値の検証
      result.subGoals.forEach((subGoal, index) => {
        expect(subGoal.position).toBe(index);
        expect(subGoal.progress).toBe(0);
      });

      // モックの呼び出し検証
      expect(mockBedrockService.generateSubGoals).toHaveBeenCalledTimes(1);
      expect(mockQualityValidator.validateQuality).toHaveBeenCalledTimes(1);
      expect(mockDatabaseService.executeInTransaction).toHaveBeenCalledTimes(1);
    });
  });
});
