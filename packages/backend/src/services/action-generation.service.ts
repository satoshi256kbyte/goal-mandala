/**
 * ActionGenerationService
 * アクション生成のビジネスロジックを管理するサービス
 */

import { ContextService } from './context.service';
import { BedrockService } from './bedrock.service';
import { ActionQualityValidator } from './action-quality-validator.service';
import { ActionTypeClassifier } from './action-type-classifier.service';
import { ActionDatabaseService } from './action-database.service';
import { ActionGenerationResult, ActionOutput, ActionType } from '../types/action-generation.types';
import { logger, createTimer } from '../utils/logger';

/**
 * ActionGenerationServiceインターフェース
 */
export interface IActionGenerationService {
  /**
   * アクションを生成してデータベースに保存する
   * @param userId ユーザーID
   * @param subGoalId サブ目標ID
   * @param regenerate 既存のアクションを再生成する場合true
   * @returns ActionGenerationResult
   */
  generateAndSaveActions(
    userId: string,
    subGoalId: string,
    regenerate: boolean
  ): Promise<ActionGenerationResult>;
}

/**
 * ActionGenerationService実装クラス
 */
export class ActionGenerationService implements IActionGenerationService {
  constructor(
    private contextService: ContextService,
    private bedrockService: BedrockService,
    private qualityValidator: ActionQualityValidator,
    private typeClassifier: ActionTypeClassifier,
    private databaseService: ActionDatabaseService
  ) {}

  /**
   * アクションを生成してデータベースに保存する
   */
  async generateAndSaveActions(
    userId: string,
    subGoalId: string,
    regenerate: boolean
  ): Promise<ActionGenerationResult> {
    const timer = createTimer();

    logger.info('アクション生成処理開始', {
      userId,
      subGoalId,
      regenerate,
      action: 'generate_and_save_actions_start',
    });

    // トランザクション内で処理を実行
    return await this.databaseService.executeInTransaction(async () => {
      // 1. コンテキスト取得（サブ目標の存在確認と認可チェックを含む）
      const contextTimer = createTimer();
      const context = await this.contextService.getGenerationContext(subGoalId);
      logger.info('コンテキスト取得完了', {
        userId,
        subGoalId,
        duration: `${contextTimer.end()}ms`,
        action: 'context_retrieved',
      });

      // 2. AI生成
      const aiTimer = createTimer();
      // GenerationContextを直接使用してアクション生成
      const aiGeneratedActions = await this.bedrockService.generateActionsWithContext(context);
      logger.info('AI生成完了', {
        userId,
        subGoalId,
        actionCount: aiGeneratedActions.length,
        duration: `${aiTimer.end()}ms`,
        action: 'ai_generation_completed',
      });

      // AI生成結果を適切な型に変換
      const generatedActions: ActionOutput[] = aiGeneratedActions.map(action => ({
        ...action,
        type: action.type === 'execution' ? ActionType.EXECUTION : ActionType.HABIT,
      }));

      // 3. 品質検証
      this.qualityValidator.validateQuality(generatedActions);
      logger.info('品質検証完了', {
        userId,
        subGoalId,
        action: 'quality_validation_completed',
      });

      // 4. アクション種別判定（AIが判定していない場合のフォールバック）
      const classifiedActions = this.typeClassifier.classifyActions(generatedActions);
      const executionCount = classifiedActions.filter(a => a.type === ActionType.EXECUTION).length;
      const habitCount = classifiedActions.filter(a => a.type === ActionType.HABIT).length;
      logger.info('アクション種別判定完了', {
        userId,
        subGoalId,
        executionCount,
        habitCount,
        action: 'type_classification_completed',
      });

      // 5. データベース保存
      // regenerate=trueの場合、既存のアクションを削除
      if (regenerate) {
        await this.databaseService.deleteExistingActions(subGoalId);
        logger.info('既存アクション削除完了', {
          userId,
          subGoalId,
          action: 'existing_actions_deleted',
        });
      }

      // アクションを作成
      const savedActions = await this.databaseService.createActions(subGoalId, classifiedActions);
      logger.info('アクション保存完了', {
        userId,
        subGoalId,
        savedCount: savedActions.length,
        action: 'actions_saved',
      });

      // 6. 結果の構築
      const result: ActionGenerationResult = {
        subGoalId,
        actions: savedActions.map(action => ({
          id: action.id,
          title: action.title,
          description: action.description || '',
          background: action.background || '',
          type: (action.type as string) === 'execution' ? ActionType.EXECUTION : ActionType.HABIT,
          position: action.position,
          progress: action.progress,
          createdAt: action.createdAt.toISOString(),
          updatedAt: action.updatedAt.toISOString(),
        })),
        metadata: {
          generatedAt: new Date(),
          tokensUsed: 2000, // 実際の値はBedrockレスポンスから取得（将来の拡張）
          estimatedCost: 0.0003, // 実際の値はトークン数から計算（将来の拡張）
          goalContext: {
            goalTitle: context.goal.title,
            subGoalTitle: context.subGoal.title,
          },
        },
      };

      const totalDuration = timer.end();
      logger.info('アクション生成処理完了', {
        userId,
        subGoalId,
        totalDuration: `${totalDuration}ms`,
        action: 'generate_and_save_actions_completed',
      });

      return result;
    });
  }
}
