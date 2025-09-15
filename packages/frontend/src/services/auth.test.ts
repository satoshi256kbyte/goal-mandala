import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService } from './auth';

// AWS Amplifyをモック化
vi.mock('aws-amplify', () => ({
  Amplify: {
    configure: vi.fn(),
  },
}));

vi.mock('aws-amplify/auth', () => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
  confirmSignUp: vi.fn(),
  resetPassword: vi.fn(),
  confirmResetPassword: vi.fn(),
  signOut: vi.fn(),
  getCurrentUser: vi.fn(),
  fetchAuthSession: vi.fn(),
}));

import {
  signIn,
  signUp,
  confirmSignUp,
  resetPassword,
  confirmResetPassword,
  signOut,
  getCurrentUser,
  fetchAuthSession,
} from 'aws-amplify/auth';

describe('AuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('signIn', () => {
    it('正常にログインできる', async () => {
      vi.mocked(signIn).mockResolvedValue({} as any);

      await expect(AuthService.signIn('test@example.com', 'password123')).resolves.not.toThrow();

      expect(signIn).toHaveBeenCalledWith({
        username: 'test@example.com',
        password: 'password123',
      });
    });

    it('認証エラーを適切に処理する', async () => {
      const mockError = { code: 'NotAuthorizedException' };
      vi.mocked(signIn).mockRejectedValue(mockError);

      await expect(AuthService.signIn('test@example.com', 'wrongpassword')).rejects.toEqual({
        code: 'NotAuthorizedException',
        message: 'メールアドレスまたはパスワードが正しくありません',
      });
    });
  });

  describe('signUp', () => {
    it('正常にサインアップできる', async () => {
      vi.mocked(signUp).mockResolvedValue({} as any);

      await expect(
        AuthService.signUp('test@example.com', 'password123', '山田太郎')
      ).resolves.not.toThrow();

      expect(signUp).toHaveBeenCalledWith({
        username: 'test@example.com',
        password: 'password123',
        options: {
          userAttributes: {
            email: 'test@example.com',
            name: '山田太郎',
          },
        },
      });
    });

    it('既存ユーザーエラーを適切に処理する', async () => {
      const mockError = { code: 'UsernameExistsException' };
      vi.mocked(signUp).mockRejectedValue(mockError);

      await expect(
        AuthService.signUp('existing@example.com', 'password123', '山田太郎')
      ).rejects.toEqual({
        code: 'UsernameExistsException',
        message: 'このメールアドレスは既に登録されています',
      });
    });
  });

  describe('confirmSignUp', () => {
    it('正常にサインアップを確認できる', async () => {
      vi.mocked(confirmSignUp).mockResolvedValue({} as any);

      await expect(AuthService.confirmSignUp('test@example.com', '123456')).resolves.not.toThrow();

      expect(confirmSignUp).toHaveBeenCalledWith({
        username: 'test@example.com',
        confirmationCode: '123456',
      });
    });

    it('無効な確認コードエラーを適切に処理する', async () => {
      const mockError = { code: 'CodeMismatchException' };
      vi.mocked(confirmSignUp).mockRejectedValue(mockError);

      await expect(AuthService.confirmSignUp('test@example.com', 'invalid')).rejects.toEqual({
        code: 'CodeMismatchException',
        message: '確認コードが正しくありません',
      });
    });
  });

  describe('resetPassword', () => {
    it('正常にパスワードリセットを開始できる', async () => {
      vi.mocked(resetPassword).mockResolvedValue({} as any);

      await expect(AuthService.resetPassword('test@example.com')).resolves.not.toThrow();

      expect(resetPassword).toHaveBeenCalledWith({ username: 'test@example.com' });
    });
  });

  describe('confirmResetPassword', () => {
    it('正常にパスワードリセットを完了できる', async () => {
      vi.mocked(confirmResetPassword).mockResolvedValue({} as any);

      await expect(
        AuthService.confirmResetPassword('test@example.com', '123456', 'newpassword123')
      ).resolves.not.toThrow();

      expect(confirmResetPassword).toHaveBeenCalledWith({
        username: 'test@example.com',
        confirmationCode: '123456',
        newPassword: 'newpassword123',
      });
    });
  });

  describe('signOut', () => {
    it('正常にログアウトできる', async () => {
      vi.mocked(signOut).mockResolvedValue({} as any);

      await expect(AuthService.signOut()).resolves.not.toThrow();

      expect(signOut).toHaveBeenCalled();
    });
  });

  describe('getCurrentUser', () => {
    it('認証済みユーザーを取得できる', async () => {
      const mockUser = { username: 'test@example.com' };
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser);

      const result = await AuthService.getCurrentUser();
      expect(result).toEqual(mockUser);
    });

    it('未認証の場合はnullを返す', async () => {
      vi.mocked(getCurrentUser).mockRejectedValue(new Error('Not authenticated'));

      const result = await AuthService.getCurrentUser();
      expect(result).toBeNull();
    });
  });

  describe('getCurrentSession', () => {
    it('現在のセッションを取得できる', async () => {
      const mockSession = { tokens: { idToken: 'mock-token' } };
      vi.mocked(fetchAuthSession).mockResolvedValue(mockSession);

      const result = await AuthService.getCurrentSession();
      expect(result).toEqual(mockSession);
    });

    it('セッションがない場合はnullを返す', async () => {
      vi.mocked(fetchAuthSession).mockRejectedValue(new Error('No session'));

      const result = await AuthService.getCurrentSession();
      expect(result).toBeNull();
    });
  });

  describe('getJwtToken', () => {
    it('JWTトークンを取得できる', async () => {
      const mockToken = 'mock-jwt-token';
      const mockSession = {
        tokens: {
          idToken: {
            toString: () => mockToken,
          },
        },
      };
      vi.mocked(fetchAuthSession).mockResolvedValue(mockSession);

      const result = await AuthService.getJwtToken();
      expect(result).toBe(mockToken);
    });

    it('セッションがない場合はnullを返す', async () => {
      vi.mocked(fetchAuthSession).mockRejectedValue(new Error('No session'));

      const result = await AuthService.getJwtToken();
      expect(result).toBeNull();
    });
  });

  describe('checkAuthState', () => {
    it('認証済みの場合はtrueを返す', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({});

      const result = await AuthService.checkAuthState();
      expect(result).toBe(true);
    });

    it('未認証の場合はfalseを返す', async () => {
      vi.mocked(getCurrentUser).mockRejectedValue(new Error('Not authenticated'));

      const result = await AuthService.checkAuthState();
      expect(result).toBe(false);
    });
  });

  describe('handleAuthError', () => {
    it('未知のエラーに対してデフォルトメッセージを返す', async () => {
      const mockError = { code: 'UnknownErrorCode' };
      vi.mocked(signIn).mockRejectedValue(mockError);

      await expect(AuthService.signIn('test@example.com', 'password')).rejects.toEqual({
        code: 'UnknownErrorCode',
        message: 'エラーが発生しました。しばらく待ってから再試行してください',
      });
    });

    it('エラーコードがない場合はUnknownErrorとして処理する', async () => {
      const mockError = { message: 'Some error' };
      vi.mocked(signIn).mockRejectedValue(mockError);

      await expect(AuthService.signIn('test@example.com', 'password')).rejects.toEqual({
        code: 'UnknownError',
        message: 'エラーが発生しました。しばらく待ってから再試行してください',
      });
    });

    it('ネットワークエラーを正しく検出する', () => {
      const networkError = new TypeError('Failed to fetch');
      const result = AuthService.handleAuthError(networkError);

      expect(result.code).toBe('NetworkError');
      expect(result.message).toBe(
        'ネットワークエラーが発生しました。インターネット接続を確認してください'
      );
    });

    it('メッセージからネットワークエラーを検出する', () => {
      const error = { message: 'Network connection failed' };
      const result = AuthService.handleAuthError(error);

      expect(result.code).toBe('NetworkError');
      expect(result.message).toBe(
        'ネットワークエラーが発生しました。インターネット接続を確認してください'
      );
    });
  });

  describe('testNetworkConnection', () => {
    beforeEach(() => {
      global.fetch = vi.fn();
    });

    it('ネットワーク接続が正常な場合はtrueを返す', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
      } as Response);

      const result = await AuthService.testNetworkConnection();
      expect(result).toBe(true);
    });

    it('ネットワーク接続が失敗した場合はfalseを返す', async () => {
      vi.mocked(global.fetch).mockRejectedValue(new Error('Network error'));

      const result = await AuthService.testNetworkConnection();
      expect(result).toBe(false);
    });

    it('レスポンスがokでない場合はfalseを返す', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
      } as Response);

      const result = await AuthService.testNetworkConnection();
      expect(result).toBe(false);
    });
  });

  describe('isRetryableError', () => {
    it('再試行可能なエラーを正しく判定する', () => {
      const retryableErrors = [
        { code: 'NetworkError', message: 'Network error' },
        { code: 'TimeoutError', message: 'Timeout error' },
        { code: 'ServiceUnavailable', message: 'Service unavailable' },
        { code: 'TooManyRequestsException', message: 'Too many requests' },
        { code: 'LimitExceededException', message: 'Limit exceeded' },
        { code: 'InternalErrorException', message: 'Internal error' },
      ];

      retryableErrors.forEach(error => {
        expect(AuthService.isRetryableError(error)).toBe(true);
      });
    });

    it('再試行不可能なエラーを正しく判定する', () => {
      const nonRetryableErrors = [
        { code: 'NotAuthorizedException', message: 'Not authorized' },
        { code: 'UserNotFoundException', message: 'User not found' },
        { code: 'InvalidPasswordException', message: 'Invalid password' },
      ];

      nonRetryableErrors.forEach(error => {
        expect(AuthService.isRetryableError(error)).toBe(false);
      });
    });
  });

  describe('isNetworkError', () => {
    it('ネットワークエラーを正しく判定する', () => {
      const networkErrors = [
        { code: 'NetworkError', message: 'Network error' },
        { code: 'TimeoutError', message: 'Timeout error' },
        { code: 'ServiceUnavailable', message: 'Service unavailable' },
      ];

      networkErrors.forEach(error => {
        expect(AuthService.isNetworkError(error)).toBe(true);
      });
    });

    it('非ネットワークエラーを正しく判定する', () => {
      const nonNetworkErrors = [
        { code: 'NotAuthorizedException', message: 'Not authorized' },
        { code: 'TooManyRequestsException', message: 'Too many requests' },
      ];

      nonNetworkErrors.forEach(error => {
        expect(AuthService.isNetworkError(error)).toBe(false);
      });
    });
  });
});
