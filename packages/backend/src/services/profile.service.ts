import { PrismaClient } from '../generated/prisma-client';
import { UserProfile, UpdateProfileRequest } from '../types/profile.types';
import { NotFoundError, DatabaseError } from '../errors/profile.errors';
import { ProfileValidationService, IProfileValidationService } from './profile-validation.service';

/**
 * プロフィールサービスインターフェース
 */
export interface IProfileService {
  getProfile(userId: string): Promise<UserProfile>;
  updateProfile(userId: string, data: UpdateProfileRequest): Promise<UserProfile>;
  deleteProfile(userId: string): Promise<void>;
}

/**
 * プロフィールサービス
 */
export class ProfileService implements IProfileService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly validationService: IProfileValidationService = new ProfileValidationService()
  ) {}

  /**
   * プロフィール取得
   */
  async getProfile(userId: string): Promise<UserProfile> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          industry: true,
          companySize: true,
          jobType: true,
          position: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!user) {
        throw new NotFoundError('プロフィールが見つかりません');
      }

      // snake_caseに変換してUserProfile型に合わせる
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        industry: user.industry as string | null | undefined,
        company_size: user.companySize as string | null | undefined,
        job_title: user.jobType,
        position: user.position,
        created_at: user.createdAt,
        updated_at: user.updatedAt,
      };
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      console.error('Database error in getProfile:', error);
      throw new DatabaseError('データベース接続に失敗しました');
    }
  }

  /**
   * プロフィール更新
   */
  async updateProfile(userId: string, data: UpdateProfileRequest): Promise<UserProfile> {
    try {
      // バリデーション
      const validatedData = this.validationService.validateUpdateRequest(data);

      // camelCaseに変換
      const updateData: Record<string, unknown> = {};
      if (validatedData.name !== undefined) updateData.name = validatedData.name;
      if (validatedData.industry !== undefined) updateData.industry = validatedData.industry;
      if (validatedData.company_size !== undefined)
        updateData.companySize = validatedData.company_size;
      if (validatedData.job_title !== undefined) updateData.jobType = validatedData.job_title;
      if (validatedData.position !== undefined) updateData.position = validatedData.position;

      // 更新
      const user = await this.prisma.user.update({
        where: { id: userId },
        data: {
          ...updateData,
          updatedAt: new Date(),
        },
        select: {
          id: true,
          email: true,
          name: true,
          industry: true,
          companySize: true,
          jobType: true,
          position: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      // snake_caseに変換してUserProfile型に合わせる
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        industry: user.industry as string | null | undefined,
        company_size: user.companySize as string | null | undefined,
        job_title: user.jobType,
        position: user.position,
        created_at: user.createdAt,
        updated_at: user.updatedAt,
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'ValidationError') {
        throw error;
      }
      // Prismaエラーコード P2025: Record not found
      if (error instanceof Error && 'code' in error && error.code === 'P2025') {
        throw new NotFoundError('プロフィールが見つかりません');
      }
      console.error('Database error in updateProfile:', error);
      throw new DatabaseError('データベース更新に失敗しました');
    }
  }

  /**
   * プロフィール削除
   */
  async deleteProfile(userId: string): Promise<void> {
    try {
      await this.prisma.$transaction(async tx => {
        // Userを削除（外部キー制約でGoal以下が自動削除される）
        await tx.user.delete({
          where: { id: userId },
        });
      });
    } catch (error) {
      // Prismaエラーコード P2025: Record not found
      if (error instanceof Error && 'code' in error && error.code === 'P2025') {
        throw new NotFoundError('プロフィールが見つかりません');
      }
      console.error('Database error in deleteProfile:', error);
      throw new DatabaseError('データベース削除に失敗しました');
    }
  }
}
