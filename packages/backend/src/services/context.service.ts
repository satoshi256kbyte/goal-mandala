import { PrismaClient } from '@prisma/client';
import { GenerationContext } from '../types/action-generation.types';
import { TaskGenerationContext } from '../types/task-generation.types';
import { NotFoundError, DatabaseError, ValidationError } from '../errors/action-generation.errors';

/**
 * ContextServiceインターフェース
 */
export interface IContextService {
  /**
   * アクション生成に必要なコンテキスト情報を取得
   * @param subGoalId サブ目標ID
   * @returns GenerationContext
   */
  getGenerationContext(subGoalId: string): Promise<GenerationContext>;

  /**
   * タスク生成に必要なコンテキスト情報を取得
   * @param actionId アクションID
   * @returns TaskGenerationContext
   */
  getTaskGenerationContext(actionId: string): Promise<TaskGenerationContext>;
}

/**
 * テキストをサニタイズする（プロンプトインジェクション対策）
 * @param text サニタイズ対象のテキスト
 * @returns サニタイズされたテキスト
 */
function sanitizeText(text: string): string {
  // 特殊文字のエスケープ
  const sanitized = text
    .replace(/[<>]/g, '') // HTMLタグ除去
    .replace(/\{|\}/g, '') // 中括弧除去
    .trim();

  // プロンプトインジェクションパターンの検出
  const injectionPatterns = [
    /ignore\s+previous\s+instructions/i,
    /system\s*:/i,
    /assistant\s*:/i,
    /\[INST\]/i,
    /\[\/INST\]/i,
  ];

  for (const pattern of injectionPatterns) {
    if (pattern.test(sanitized)) {
      throw new ValidationError('不正な入力が検出されました');
    }
  }

  return sanitized;
}

/**
 * ContextService
 * アクション生成に必要なコンテキスト情報を取得するサービス
 */
export class ContextService implements IContextService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * アクション生成に必要なコンテキスト情報を取得
   * @param subGoalId サブ目標ID
   * @returns GenerationContext
   */
  async getGenerationContext(subGoalId: string): Promise<GenerationContext> {
    try {
      // サブ目標情報の取得（目標情報を含む）
      const subGoal = await this.prisma.subGoal.findUnique({
        where: { id: subGoalId },
        include: {
          goal: true,
        },
      });

      if (!subGoal) {
        throw new NotFoundError('サブ目標が見つかりません');
      }

      // 目標情報の取得（関連サブ目標を含む）
      const goal = await this.prisma.goal.findUnique({
        where: { id: subGoal.goalId },
        include: {
          subGoals: {
            where: {
              position: { not: subGoal.position },
            },
            select: {
              title: true,
              description: true,
              position: true,
            },
            orderBy: { position: 'asc' },
          },
        },
      });

      if (!goal) {
        throw new NotFoundError('目標が見つかりません');
      }

      // ユーザー情報の取得
      const user = await this.prisma.user.findUnique({
        where: { id: subGoal.goal.userId },
        select: {
          industry: true,
          jobType: true,
        },
      });

      // GenerationContextオブジェクトの構築（サニタイズ適用）
      const context: GenerationContext = {
        goal: {
          id: goal.id,
          title: sanitizeText(goal.title),
          description: sanitizeText(goal.description || ''),
          deadline: goal.deadline || new Date(),
          background: sanitizeText(goal.background || ''),
          constraints: goal.constraints ? sanitizeText(goal.constraints) : undefined,
        },
        subGoal: {
          id: subGoal.id,
          title: sanitizeText(subGoal.title),
          description: sanitizeText(subGoal.description || ''),
          background: sanitizeText(subGoal.background || ''),
          position: subGoal.position,
        },
        relatedSubGoals: goal.subGoals.map(
          (sg: { title: string; description: string | null; position: number }) => ({
            title: sanitizeText(sg.title),
            description: sanitizeText(sg.description || ''),
            position: sg.position,
          })
        ),
        user: {
          industry: user?.industry || undefined,
          jobType: user?.jobType || undefined,
        },
      };

      return context;
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ValidationError) {
        throw error;
      }
      throw new DatabaseError('コンテキスト情報の取得に失敗しました', error as Error);
    }
  }

  /**
   * タスク生成に必要なコンテキスト情報を取得
   * @param actionId アクションID
   * @returns TaskGenerationContext
   */
  async getTaskGenerationContext(actionId: string): Promise<TaskGenerationContext> {
    try {
      // アクション情報の取得（サブ目標、目標、ユーザー情報を一度に取得してN+1問題を解消）
      const action = await this.prisma.action.findUnique({
        where: { id: actionId },
        include: {
          subGoal: {
            include: {
              goal: {
                include: {
                  user: {
                    select: {
                      industry: true,
                      jobType: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!action) {
        throw new NotFoundError('アクションが見つかりません');
      }

      // TaskGenerationContextオブジェクトの構築（サニタイズ適用）
      const context: TaskGenerationContext = {
        action: {
          id: action.id,
          title: sanitizeText(action.title),
          description: sanitizeText(action.description || ''),
          background: sanitizeText(action.background || ''),
          type: action.type as 'execution' | 'habit',
        },
        subGoal: {
          id: action.subGoal.id,
          title: sanitizeText(action.subGoal.title),
          description: sanitizeText(action.subGoal.description || ''),
        },
        goal: {
          id: action.subGoal.goal.id,
          title: sanitizeText(action.subGoal.goal.title),
          description: sanitizeText(action.subGoal.goal.description || ''),
          deadline: action.subGoal.goal.deadline || new Date(),
        },
        user: action.subGoal.goal.user
          ? {
              preferences: {
                workStyle: action.subGoal.goal.user.industry || undefined,
                timeAvailable: undefined,
              },
            }
          : {},
      };

      return context;
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ValidationError) {
        throw error;
      }
      throw new DatabaseError('タスク生成コンテキスト情報の取得に失敗しました', error as Error);
    }
  }
}
