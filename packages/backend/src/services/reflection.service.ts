import { PrismaClient, Reflection } from '@prisma/client';
import {
  createReflectionSchema,
  updateReflectionSchema,
  type CreateReflectionInput,
  type UpdateReflectionInput,
} from '../schemas/reflection.schema';
import { NotFoundError } from '../utils/errors';

/**
 * ReflectionService
 *
 * 振り返りのビジネスロジックを担当するサービスクラス
 */
export class ReflectionService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * 振り返りを作成
   *
   * @param data - 振り返り作成データ
   * @returns 作成された振り返り
   * @throws {Error} バリデーションエラー、データベースエラー
   */
  async createReflection(data: CreateReflectionInput): Promise<Reflection> {
    // 入力バリデーション
    const validatedData = createReflectionSchema.parse(data);

    try {
      // データベース保存
      const reflection = await this.prisma.reflection.create({
        data: {
          goalId: validatedData.goalId,
          summary: validatedData.summary,
          regretfulActions: validatedData.regretfulActions,
          slowProgressActions: validatedData.slowProgressActions,
          untouchedActions: validatedData.untouchedActions,
        },
      });

      return reflection;
    } catch (error) {
      // エラーハンドリング
      if (error instanceof Error) {
        throw new Error(`振り返りの作成に失敗しました: ${error.message}`);
      }
      throw new Error('振り返りの作成に失敗しました');
    }
  }

  /**
   * 振り返りを取得（単一）
   *
   * @param id - 振り返りID
   * @param userId - ユーザーID
   * @returns 振り返り（見つからない場合はnull）
   * @throws {Error} データベースエラー
   */
  async getReflection(id: string, userId: string): Promise<Reflection | null> {
    try {
      const reflection = await this.prisma.reflection.findFirst({
        where: {
          id,
          goal: {
            userId,
          },
        },
        include: {
          goal: true,
        },
      });

      return reflection;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`振り返りの取得に失敗しました: ${error.message}`);
      }
      throw new Error('振り返りの取得に失敗しました');
    }
  }

  /**
   * 振り返り一覧を取得（目標別）
   *
   * @param goalId - 目標ID
   * @param userId - ユーザーID
   * @returns 振り返り一覧（作成日時降順）
   * @throws {Error} データベースエラー
   */
  async getReflectionsByGoal(goalId: string, userId: string): Promise<Reflection[]> {
    try {
      const reflections = await this.prisma.reflection.findMany({
        where: {
          goalId,
          goal: {
            userId,
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return reflections;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`振り返り一覧の取得に失敗しました: ${error.message}`);
      }
      throw new Error('振り返り一覧の取得に失敗しました');
    }
  }

  /**
   * 振り返りを更新
   *
   * @param id - 振り返りID
   * @param userId - ユーザーID
   * @param data - 更新データ
   * @returns 更新された振り返り
   * @throws {NotFoundError} 振り返りが見つからない
   * @throws {Error} バリデーションエラー、データベースエラー
   */
  async updateReflection(
    id: string,
    userId: string,
    data: UpdateReflectionInput
  ): Promise<Reflection> {
    // 入力バリデーション
    const validatedData = updateReflectionSchema.parse(data);

    try {
      // ユーザーID検証（振り返りが存在し、ユーザーが所有しているか確認）
      const existingReflection = await this.getReflection(id, userId);
      if (!existingReflection) {
        throw new NotFoundError('振り返りが見つかりません');
      }

      // データベース更新
      const reflection = await this.prisma.reflection.update({
        where: { id },
        data: {
          summary: validatedData.summary,
          regretfulActions: validatedData.regretfulActions,
          slowProgressActions: validatedData.slowProgressActions,
          untouchedActions: validatedData.untouchedActions,
        },
      });

      return reflection;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      if (error instanceof Error) {
        throw new Error(`振り返りの更新に失敗しました: ${error.message}`);
      }
      throw new Error('振り返りの更新に失敗しました');
    }
  }

  /**
   * 振り返りを削除
   *
   * @param id - 振り返りID
   * @param userId - ユーザーID
   * @throws {NotFoundError} 振り返りが見つからない
   * @throws {Error} データベースエラー
   */
  async deleteReflection(id: string, userId: string): Promise<void> {
    try {
      // ユーザーID検証（振り返りが存在し、ユーザーが所有しているか確認）
      const existingReflection = await this.getReflection(id, userId);
      if (!existingReflection) {
        throw new NotFoundError('振り返りが見つかりません');
      }

      // データベース削除
      await this.prisma.reflection.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      if (error instanceof Error) {
        throw new Error(`振り返りの削除に失敗しました: ${error.message}`);
      }
      throw new Error('振り返りの削除に失敗しました');
    }
  }
}
