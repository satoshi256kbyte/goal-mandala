/**
 * TaskGenerationService
 * タスク生成のビジネスロジックを管理するサービス
 *
 * パフォーマンス最適化：
 * - 現在は1アクションずつ処理（MVP版）
 * - 将来的な拡張: 複数アクションの並列処理
 *   - Promise.all()を使用して複数アクションのタスクを同時生成
 *   - ただし、Bedrock APIのレート制限に注意が必要
 *   - 推奨: 最大3-5アクションまでの並列処理
 */

import { ContextService } from './context.service';
import { BedrockService } from './bedrock.service';
import { TaskQualityValidator } from './task-quality-validator.service';
import { TaskDatabaseService } from './task-database.service';
import { TaskGenerationResult, TaskType } from '../types/task-generation.types';
import { logger, createTimer } from '../utils/logger';

/**
 * TaskGenerationServiceインターフェース
 */
export interface ITaskGenerationService {
  /**
   * タスクを生成してデータベースに保存する
   * @param userId ユーザーID
   * @param actionId アクションID
   * @param regenerate 既存のタスクを再生成する場合true
   * @returns TaskGenerationResult
   */
  generateAndSaveTasks(
    userId: string,
    actionId: string,
    regenerate: boolean
  ): Promise<TaskGenerationResult>;
}

/**
 * TaskGenerationService実装クラス
 */
export class TaskGenerationService implements ITaskGenerationService {
  constructor(
    private contextService: ContextService,
    private bedrockService: BedrockService,
    private qualityValidator: TaskQualityValidator,
    private databaseService: TaskDatabaseService
  ) {}

  /**
   * タスクを生成してデータベースに保存する
   */
  async generateAndSaveTasks(
    userId: string,
    actionId: string,
    regenerate: boolean
  ): Promise<TaskGenerationResult> {
    const timer = createTimer();

    logger.info('タスク生成処理開始', {
      userId,
      actionId,
      regenerate,
      action: 'generate_and_save_tasks_start',
    });

    // トランザクション内で処理を実行
    return await this.databaseService.executeInTransaction(async () => {
      // 1. コンテキスト取得（アクションの存在確認を含む）
      // 注: 認可チェックはハンドラー層で実施済み
      const contextTimer = createTimer();
      const context = await this.contextService.getTaskGenerationContext(actionId);
      logger.info('コンテキスト取得完了', {
        userId,
        actionId,
        duration: `${contextTimer.end()}ms`,
        action: 'context_retrieved',
      });

      // 2. AI生成
      const aiTimer = createTimer();
      const actionInput = {
        actionTitle: context.action.title,
        actionDescription: context.action.description,
        actionType: context.action.type,
        background: context.action.background,
        constraints: context.action.constraints,
      };
      const aiGeneratedTasks = await this.bedrockService.generateTasks(actionInput);
      logger.info('AI生成完了', {
        userId,
        actionId,
        taskCount: aiGeneratedTasks.length,
        duration: `${aiTimer.end()}ms`,
        action: 'ai_generation_completed',
      });

      // 3. 品質検証
      this.qualityValidator.validateQuality(aiGeneratedTasks);
      logger.info('品質検証完了', {
        userId,
        actionId,
        action: 'quality_validation_completed',
      });

      // 4. タスク種別の継承（アクションのtypeをタスクに継承）
      const tasksWithType = aiGeneratedTasks.map(task => ({
        ...task,
        type: context.action.type === 'EXECUTION' ? TaskType.EXECUTION : TaskType.HABIT,
      }));

      logger.info('タスク種別継承完了', {
        userId,
        actionId,
        taskType: context.action.type,
        action: 'task_type_inherited',
      });

      // 5. データベース保存
      // regenerate=trueの場合、既存のタスクを削除
      if (regenerate) {
        await this.databaseService.deleteExistingTasks(actionId);
        logger.info('既存タスク削除完了', {
          userId,
          actionId,
          action: 'existing_tasks_deleted',
        });
      }

      // タスクを作成
      const savedTasks = await this.databaseService.createTasks(actionId, tasksWithType);
      logger.info('タスク保存完了', {
        userId,
        actionId,
        savedCount: savedTasks.length,
        action: 'tasks_saved',
      });

      // 6. 結果の構築
      const totalEstimatedMinutes = savedTasks.reduce(
        (sum, task) => sum + (task.estimatedMinutes || 0),
        0
      );

      // 将来の拡張: Bedrockレスポンスから実際のトークン数とコストを取得
      const ESTIMATED_TOKENS_USED = 2500; // 暫定値
      const ESTIMATED_COST_PER_REQUEST = 0.00038; // 暫定値

      const result: TaskGenerationResult = {
        actionId,
        tasks: savedTasks.map(task => ({
          id: task.id,
          title: task.title,
          description: task.description || '',
          type: task.type as TaskType,
          status: task.status,
          estimatedMinutes: task.estimatedMinutes || 0,
          completedAt: task.completedAt?.toISOString() || null,
          createdAt: task.createdAt.toISOString(),
          updatedAt: task.updatedAt.toISOString(),
        })),
        metadata: {
          generatedAt: new Date(),
          tokensUsed: ESTIMATED_TOKENS_USED,
          estimatedCost: ESTIMATED_COST_PER_REQUEST,
          actionContext: {
            goalTitle: context.goal.title,
            subGoalTitle: context.subGoal.title,
            actionTitle: context.action.title,
            actionType: context.action.type,
          },
          taskCount: savedTasks.length,
          totalEstimatedMinutes,
        },
      };

      const totalDuration = timer.end();
      logger.info('タスク生成処理完了', {
        userId,
        actionId,
        totalDuration: `${totalDuration}ms`,
        action: 'generate_and_save_tasks_completed',
      });

      return result;
    });
  }

  /**
   * 複数アクションのタスクを並列生成する（将来の拡張用）
   *
   * 使用例：
   * ```typescript
   * async generateTasksForMultipleActions(
   *   userId: string,
   *   actionIds: string[],
   *   regenerate: boolean
   * ): Promise<TaskGenerationResult[]> {
   *   // レート制限を考慮して、最大5アクションまで並列処理
   *   const batchSize = 5;
   *   const results: TaskGenerationResult[] = [];
   *
   *   for (let i = 0; i < actionIds.length; i += batchSize) {
   *     const batch = actionIds.slice(i, i + batchSize);
   *     const batchResults = await Promise.all(
   *       batch.map(actionId =>
   *         this.generateAndSaveTasks(userId, actionId, regenerate)
   *       )
   *     );
   *     results.push(...batchResults);
   *   }
   *
   *   return results;
   * }
   * ```
   *
   * 注意事項：
   * - Bedrock APIのレート制限に注意
   * - データベース接続数の制限に注意
   * - エラーハンドリングを適切に実装
   * - 部分的な失敗を許容する設計を検討
   */
}
