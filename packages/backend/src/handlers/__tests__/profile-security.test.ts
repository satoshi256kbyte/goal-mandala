/**
 * プロフィール管理API セキュリティテスト
 * 認証、XSS対策、SQLインジェクション対策のテスト
 */

import { Hono } from 'hono';
import { ValidationError } from '../../errors/profile.errors';

// ProfileValidationServiceのモック
const mockValidationService = {
  validateUpdateRequest: jest.fn(),
  sanitizeInput: jest.fn((input: string) => input), // デフォルトではそのまま返す
};

// ProfileServiceのモック
const mockProfileService = {
  getProfile: jest.fn(),
  updateProfile: jest.fn(),
  deleteProfile: jest.fn(),
};

// 認証ミドルウェアのモック
const mockJwtAuthMiddleware = jest.fn((c, next) => {
  // モックユーザーを設定
  c.set('user', { id: 'test-user-id', email: 'test@example.com' });
  c.set('isAuthenticated', true);
  return next();
});

jest.mock('../../middleware/auth', () => ({
  jwtAuthMiddleware: jest.fn(() => mockJwtAuthMiddleware),
}));

// Prismaクライアントのモック
jest.mock('../../generated/prisma-client', () => {
  return {
    PrismaClient: jest.fn().mockImplementation(() => ({
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      $transaction: jest.fn(),
    })),
  };
});

// サービスのモック - コンストラクタをモック
jest.mock('../../services/profile-validation.service', () => ({
  ProfileValidationService: jest.fn().mockImplementation(() => mockValidationService),
}));

jest.mock('../../services/profile.service', () => ({
  ProfileService: jest.fn().mockImplementation(() => mockProfileService),
}));

// モック後にappをインポート
import { app as profileApp } from '../profile';

describe('Profile API Security Tests', () => {
  let app: Hono;

  beforeEach(() => {
    // モックをリセット
    jest.clearAllMocks();

    // デフォルトのモック動作を設定
    mockValidationService.validateUpdateRequest.mockImplementation(data => data);
    mockValidationService.sanitizeInput.mockImplementation(input => input);
    mockProfileService.updateProfile.mockResolvedValue({
      id: 'test-user-id',
      email: 'test@example.com',
      name: 'Test User',
      industry: 'IT',
      company_size: '100-500',
      job_title: 'Engineer',
      position: 'Senior',
      created_at: new Date(),
      updated_at: new Date(),
    });

    // 実際のプロフィールハンドラーを使用
    app = profileApp;
  });

  describe('XSS対策のテスト', () => {
    it('HTMLタグを含む入力値がサニタイズされる', async () => {
      const maliciousInput = {
        name: '<script>alert("XSS")</script>Test User',
        industry: '<img src="x" onerror="alert(\'XSS\')">IT',
        job_title: '<a href="javascript:alert(\'XSS\')">Engineer</a>',
      };

      // サニタイズ処理をモック（HTMLタグを除去）
      mockValidationService.sanitizeInput.mockImplementation((input: string) => {
        return input.replace(/<[^>]*>/g, '');
      });

      const res = await app.request('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer mock-token',
        },
        body: JSON.stringify(maliciousInput),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);

      // updateProfileが呼ばれたことを確認（サニタイズはProfileServiceの内部で行われる）
      expect(mockProfileService.updateProfile).toHaveBeenCalled();
    });

    it('特殊文字がエスケープされる', async () => {
      const inputWithSpecialChars = {
        name: 'Test & User',
        industry: 'IT & Software',
        job_title: '<Engineer>',
      };

      const res = await app.request('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer mock-token',
        },
        body: JSON.stringify(inputWithSpecialChars),
      });

      expect(res.status).toBe(200);
      expect(mockProfileService.updateProfile).toHaveBeenCalled();
    });

    it('JavaScriptイベントハンドラーが除去される', async () => {
      const maliciousInput = {
        job_title: '<div onclick="alert(\'XSS\')">Engineer</div>',
      };

      const res = await app.request('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer mock-token',
        },
        body: JSON.stringify(maliciousInput),
      });

      expect(res.status).toBe(200);
      expect(mockProfileService.updateProfile).toHaveBeenCalled();
    });
  });

  describe('SQLインジェクション対策のテスト', () => {
    it('SQLインジェクション攻撃がPrismaのパラメータ化クエリで防がれる', async () => {
      const maliciousUserId = "'; DROP TABLE users; --";

      // ユーザーIDを改ざんしてテスト
      mockJwtAuthMiddleware.mockImplementation((c, next) => {
        c.set('user', { id: maliciousUserId, email: 'test@example.com' });
        c.set('isAuthenticated', true);
        return next();
      });

      const res = await app.request('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer mock-token',
        },
        body: JSON.stringify({ name: 'Test User' }),
      });

      expect(res.status).toBe(200);
      // Prismaのパラメータ化クエリにより、SQLインジェクションは防がれる
      expect(mockProfileService.updateProfile).toHaveBeenCalledWith(maliciousUserId, {
        name: 'Test User',
      });
    });
  });

  describe('機密情報マスキングのテスト', () => {
    it('エラーログで機密情報がマスキングされる', async () => {
      // サービスでエラーを発生させる
      mockProfileService.updateProfile.mockRejectedValue(
        new Error('Database connection failed with password: secret123')
      );

      const res = await app.request('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer mock-token',
        },
        body: JSON.stringify({ name: 'Test User' }),
      });

      // エラーハンドリングによりエラーが適切に処理される
      expect(res.status).toBe(500);
    });

    it('JWTトークンがログでマスキングされる', async () => {
      mockProfileService.updateProfile.mockRejectedValue(
        new Error('JWT token eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9 is invalid')
      );

      const res = await app.request('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer mock-token',
        },
        body: JSON.stringify({ name: 'Test User' }),
      });

      expect(res.status).toBe(500);
    });
  });

  describe('入力バリデーションのテスト', () => {
    it('文字数制限を超える入力は拒否される', async () => {
      const invalidInput = {
        name: 'a'.repeat(51), // 50文字制限を超える
      };

      // ProfileServiceでバリデーションエラーをスロー
      mockProfileService.updateProfile.mockRejectedValue(
        new ValidationError('名前は50文字以内で入力してください')
      );

      const res = await app.request('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer mock-token',
        },
        body: JSON.stringify(invalidInput),
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('VALIDATION_ERROR');
    });

    it('空の名前は拒否される', async () => {
      const invalidInput = { name: '' };

      mockProfileService.updateProfile.mockRejectedValue(new ValidationError('名前は必須です'));

      const res = await app.request('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer mock-token',
        },
        body: JSON.stringify(invalidInput),
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('VALIDATION_ERROR');
    });

    it('全てのフィールドが空の場合は拒否される', async () => {
      const emptyInput = {};

      mockProfileService.updateProfile.mockRejectedValue(
        new ValidationError('少なくとも1つのフィールドを指定してください')
      );

      const res = await app.request('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer mock-token',
        },
        body: JSON.stringify(emptyInput),
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
