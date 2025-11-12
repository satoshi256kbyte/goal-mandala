/**
 * ProfileServiceのテスト
 */

import { ProfileService } from '../profile.service';
import { NotFoundError } from '../../errors/profile.errors';
import type { UserProfile } from '../../types/profile.types';

// Prismaクライアントのモック
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  $transaction: jest.fn(),
};

// ProfileServiceのインスタンス作成
const profileService = new ProfileService(mockPrisma as any);

describe('ProfileService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getProfile', () => {
    const mockUserId = 'test-user-id';
    const mockUserProfile = {
      id: mockUserId,
      email: 'test@example.com',
      name: 'テストユーザー',
      industry: 'IT・通信',
      company_size: undefined,
      job_title: undefined,
      position: 'マネージャー',
      created_at: undefined,
      updated_at: undefined,
    };

    it('正常系: ユーザーIDからプロフィール情報を取得できる', async () => {
      // Arrange
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUserProfile);

      // Act
      const result = await profileService.getProfile(mockUserId);

      // Assert
      expect(result).toEqual(mockUserProfile);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockUserId },
        select: expect.any(Object),
      });
    });

    it('異常系: ユーザーが存在しない場合はNotFoundErrorをスローする', async () => {
      // Arrange
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(profileService.getProfile(mockUserId)).rejects.toThrow(NotFoundError);
    });
  });

  describe('updateProfile', () => {
    const mockUserId = 'test-user-id';
    const mockUpdateData = {
      name: '更新後ユーザー',
      industry: '製造業',
    };

    it('正常系: プロフィール情報を更新できる', async () => {
      // Arrange
      const mockUpdatedProfile = {
        id: mockUserId,
        email: 'test@example.com',
        name: '更新後ユーザー',
        industry: '製造業',
        company_size: undefined,
        job_title: undefined,
        position: 'シニアマネージャー',
        created_at: undefined,
        updated_at: undefined,
      };

      (mockPrisma.user.update as jest.Mock).mockResolvedValue(mockUpdatedProfile);

      // Act
      const result = await profileService.updateProfile(mockUserId, mockUpdateData);

      // Assert
      expect(result).toEqual(mockUpdatedProfile);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: expect.objectContaining({
          ...mockUpdateData,
          updatedAt: expect.any(Date),
        }),
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
    });
  });

  describe('deleteProfile', () => {
    const mockUserId = 'test-user-id';

    it('正常系: プロフィールを削除できる', async () => {
      // Arrange
      (mockPrisma.$transaction as jest.Mock).mockImplementation(async callback => {
        return await callback(mockPrisma);
      });
      (mockPrisma.user.delete as jest.Mock).mockResolvedValue({ id: mockUserId });

      // Act
      await profileService.deleteProfile(mockUserId);

      // Assert
      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockPrisma.user.delete).toHaveBeenCalledWith({
        where: { id: mockUserId },
      });
    });

    it('異常系: レコードが見つからない場合はNotFoundErrorをスローする', async () => {
      // Arrange
      const error = new Error('Record not found');
      (error as any).code = 'P2025';
      (mockPrisma.$transaction as jest.Mock).mockRejectedValue(error);

      // Act & Assert
      await expect(profileService.deleteProfile(mockUserId)).rejects.toThrow(NotFoundError);
    });

    it('異常系: データベースエラーの場合はDatabaseErrorをスローする', async () => {
      // Arrange
      (mockPrisma.$transaction as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      );

      // Act & Assert
      await expect(profileService.deleteProfile(mockUserId)).rejects.toThrow(
        'データベース削除に失敗しました'
      );
    });
  });

  describe('getProfile - エラーハンドリング', () => {
    const mockUserId = 'test-user-id';

    it('異常系: データベースエラーの場合はDatabaseErrorをスローする', async () => {
      // Arrange
      (mockPrisma.user.findUnique as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      );

      // Act & Assert
      await expect(profileService.getProfile(mockUserId)).rejects.toThrow(
        'データベース接続に失敗しました'
      );
    });
  });

  describe('updateProfile - エラーハンドリング', () => {
    const mockUserId = 'test-user-id';
    const mockUpdateData = { name: '更新後ユーザー' };

    it('異常系: レコードが見つからない場合はNotFoundErrorをスローする', async () => {
      // Arrange
      const error = new Error('Record not found');
      (error as any).code = 'P2025';
      (mockPrisma.user.update as jest.Mock).mockRejectedValue(error);

      // Act & Assert
      await expect(profileService.updateProfile(mockUserId, mockUpdateData)).rejects.toThrow(
        NotFoundError
      );
    });

    it('異常系: バリデーションエラーの場合はそのまま再スローする', async () => {
      // Arrange
      const validationError = new Error('Validation failed');
      validationError.name = 'ValidationError';
      (mockPrisma.user.update as jest.Mock).mockRejectedValue(validationError);

      // Act & Assert
      await expect(profileService.updateProfile(mockUserId, mockUpdateData)).rejects.toThrow(
        validationError
      );
    });

    it('異常系: その他のデータベースエラーの場合はDatabaseErrorをスローする', async () => {
      // Arrange
      (mockPrisma.user.update as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      );

      // Act & Assert
      await expect(profileService.updateProfile(mockUserId, mockUpdateData)).rejects.toThrow(
        'データベース更新に失敗しました'
      );
    });
  });
});
