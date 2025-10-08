/**
 * サブ目標生成サービス
 * BedrockService、DatabaseService、QualityValidatorを統合して
 * サブ目標生成のメインビジネスロジックを提供する
 */

import { BedrockService } from './bedrock.service.js';
import { DatabaseService } from './subgoal-database.service.js';
import { SubGoalQualityValidator } from './subgoal-quality-validator.service.js';
import {
  createTimer,
  logAIGenerationStart,
  logAIGenerationComplete,
  logDatabaseSaveStart,
  logDatabaseSaveComplete,
  logQualityWarning,
} from '../utils/subgoal-generation-logger.js';
import type {
  SubGoalGenerationRequest,
  SubGoalGenerationResult,
  SubGoalOutput,
  ISubGoalGenerationService,
} from '../types/subgoal-generation.types.js';
import type { GoalInput } from '../types/ai-generation.types.js';

/**
 * サブ目標生成サービス
 */
export class SubGoalGenerationService implements ISubGoalGenerationService {
  private bedrockService: BedrockService;
  private databaseService: DatabaseService;
  private qualityValidator: SubGoalQualityValidator;

  constructor(
    bedrockService?: BedrockService,
    databaseService?: DatabaseService,
    qualityValidator?: SubGoalQualityValidator
  ) {
    this.bedrockService = bedrockService || new BedrockService();
    this.databaseService = databaseService || new DatabaseService();
    this.qualityValidator = qualityValidator || new SubGoalQualityValidator();
  }

  /**
   * サブ目標を生成して保存する
   * @param userId ユーザーID
   * @param request リクエストデータ
   * @param requestId リクエストID（ログ用）
   * @returns 生成結果
   */
  async generateAndSaveSubGoals(
    userId: string,
    request: SubGoalGenerationRequest,
    requestId: string = 'unknown'
  ): Promise<SubGoalGenerationResult> {
    try {
      // トランザクション内で処理を実行
      const result = await this.databaseService.executeInTransaction(async () => {
        // 1. 目標の作成または更新
        let goalId: string;
        if (request.goalId) {
          // 既存の目標を更新
          await this.databaseService.updateGoal(request.goalId, request);
          goalId = request.goalId;

          // 既存のサブ目標を削除
          await this.databaseService.deleteExistingSubGoals(goalId);
        } else {
          // 新規目標を作成
          goalId = await this.databaseService.createGoal(userId, request);
        }

        // 2. AI生成
        const aiTimer = createTimer();
        logAIGenerationStart(requestId, request.title);

        const goalInput: GoalInput = {
          title: request.title,
          description: request.description,
          deadline: request.deadline,
          background: request.background,
          constraints: request.constraints,
        };

        const generatedSubGoals = await this.bedrockService.generateSubGoals(goalInput);
        const aiDuration = aiTimer.end();
        logAIGenerationComplete(requestId, generatedSubGoals.length, aiDuration);

        // 3. 品質検証（一時的にSubGoalOutputに変換）
        const subGoalsForValidation: SubGoalOutput[] = generatedSubGoals.map(sg => ({
          id: '', // 一時的な値（保存後に実際のIDが設定される）
          title: sg.title,
          description: sg.description,
          background: sg.background,
          position: sg.position,
          progress: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }));

        try {
          this.qualityValidator.validateQuality(subGoalsForValidation);
        } catch (error) {
          // 品質検証の警告をログに記録
          if (error instanceof Error) {
            logQualityWarning(requestId, error.message);
          }
          throw error;
        }

        // 4. サブ目標の保存
        const dbTimer = createTimer();
        logDatabaseSaveStart(requestId, goalId);

        const savedSubGoals = await this.databaseService.createSubGoals(
          goalId,
          generatedSubGoals.map(sg => ({
            title: sg.title,
            description: sg.description,
            background: sg.background,
            position: sg.position,
          }))
        );

        const dbDuration = dbTimer.end();
        logDatabaseSaveComplete(requestId, goalId, dbDuration);

        // 5. レスポンス用にマッピング
        const subGoalOutputs: SubGoalOutput[] = savedSubGoals.map(sg => ({
          id: sg.id,
          title: sg.title,
          description: sg.description || '',
          background: sg.background || '',
          position: sg.position,
          progress: sg.progress,
          createdAt: sg.createdAt.toISOString(),
          updatedAt: sg.updatedAt.toISOString(),
        }));

        return {
          goalId,
          subGoals: subGoalOutputs,
        };
      });

      // メタデータを追加
      return {
        goalId: result.goalId,
        subGoals: result.subGoals,
        metadata: {
          generatedAt: new Date(),
          tokensUsed: 1500, // TODO: 実際の値はBedrockレスポンスから取得
          estimatedCost: 0.000225, // TODO: 実際のコスト計算
        },
      };
    } catch (error) {
      console.error('サブ目標生成エラー:', error);
      throw error;
    }
  }
}
