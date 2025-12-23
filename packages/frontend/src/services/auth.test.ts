import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AuthService, AuthError } from './auth';
import * as amplifyAuth from 'aws-amplify/auth';

// aws-amplify/authをモック
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

// Amplifyをモック
vi.mock('aws-amplify', () => ({
  Amplify: {
    configure: vi.fn(),
  },
}));

describe('AuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('signIn', () => {
    it('正常にログインできる', async () => {
      vi.mocked(amplifyAuth.signIn).mockResolvedValue({} as any);

      await expect(AuthService.signIn('test@example.com', 'password123')).resolves.toBeUndefined();

      expect(amplifyAuth.signIn).toHaveBeenCalledWith({
        username: 'test@example.com',
        password: 'password123',
      });
    });

    it('ログインエラーを適切に処理する', async () => {
      const error = { code: 'UserNotFoundException', message: 'User not found' };
      vi.mocked(amplifyAuth.signIn).mockRejectedValue(error);

      await expect(AuthService.signIn('test@example.com', 'wrong')).rejects.toMatchObject({
        code: 'UserNotFoundException',
        message: 'メールアドレスまたはパスワードが正しくありません',
      });
    });
  });

  describe('signUp', () => {
    it('正常にサインアップできる', async () => {
      vi.mocked(amplifyAuth.signUp).mockResolvedValue({} as any);

      await expect(
        AuthService.signUp('test@example.com', 'password123', 'Test User')
      ).resolves.toBeUndefined();

      expect(amplifyAuth.signUp).toHaveBeenCalledWith({
        username: 'test@example.com',
        password: 'password123',
        options: {
          userAttributes: {
            email: 'test@example.com',
            name: 'Test User',
          },
        },
      });
    });

    it('既存ユーザーエラーを適切に処理する', async () => {
      const error = { code: 'UsernameExistsException', message: 'User exists' };
      vi.mocked(amplifyAuth.signUp).mockRejectedValue(error);

      await expect(
        AuthService.signUp('test@example.com', 'password123', 'Test User')
      ).rejects.toMatchObject({
        code: 'UsernameExistsException',
        message: 'このメールアドレスは既に登録されています',
      });
    });
  });

  describe('confirmSignUp', () => {
    it('正常に確認できる', async () => {
      vi.mocked(amplifyAuth.confirmSignUp).mockResolvedValue({} as any);

      await expect(
        AuthService.confirmSignUp('test@example.com', '123456')
      ).resolves.toBeUndefined();

      expect(amplifyAuth.confirmSignUp).toHaveBeenCalledWith({
        username: 'test@example.com',
        confirmationCode: '123456',
      });
    });

    it('確認コードエラーを適切に処理する', async () => {
      const error = { code: 'CodeMismatchException', message: 'Invalid code' };
      vi.mocked(amplifyAuth.confirmSignUp).mockRejectedValue(error);

      await expect(AuthService.confirmSignUp('test@example.com', 'wrong')).rejects.toMatchObject({
        code: 'CodeMismatchException',
        message: '確認コードが正しくありません',
      });
    });
  });

  describe('resetPassword', () => {
    it('正常にパスワードリセットを開始できる', async () => {
      vi.mocked(amplifyAuth.resetPassword).mockResolvedValue({} as any);

      await expect(AuthService.resetPassword('test@example.com')).resolves.toBeUndefined();

      expect(amplifyAuth.resetPassword).toHaveBeenCalledWith({
        username: 'test@example.com',
      });
    });

    it('ユーザー不在エラーを適切に処理する', async () => {
      const error = { code: 'UserNotFoundException', message: 'User not found' };
      vi.mocked(amplifyAuth.resetPassword).mockRejectedValue(error);

      await expect(AuthService.resetPassword('test@example.com')).rejects.toMatchObject({
        code: 'UserNotFoundException',
        message: 'メールアドレスまたはパスワードが正しくありません',
      });
    });
  });

  describe('confirmResetPassword', () => {
    it('正常にパスワードリセットを完了できる', async () => {
      vi.mocked(amplifyAuth.confirmResetPassword).mockResolvedValue({} as any);

      await expect(
        AuthService.confirmResetPassword('test@example.com', '123456', 'newPassword123')
      ).resolves.toBeUndefined();

      expect(amplifyAuth.confirmResetPassword).toHaveBeenCalledWith({
        username: 'test@example.com',
        confirmationCode: '123456',
        newPassword: 'newPassword123',
      });
    });

    it('無効なパスワードエラーを適切に処理する', async () => {
      const error = { code: 'InvalidPasswordException', message: 'Invalid password' };
      vi.mocked(amplifyAuth.confirmResetPassword).mockRejectedValue(error);

      await expect(
        AuthService.confirmResetPassword('test@example.com', '123456', 'weak')
      ).rejects.toMatchObject({
        code: 'InvalidPasswordException',
        message: 'パスワードは8文字以上で、大文字・小文字・数字を含む必要があります',
      });
    });
  });

  describe('signOut', () => {
    it('正常にログアウトできる', async () => {
      vi.mocked(amplifyAuth.signOut).mockResolvedValue({} as any);

      await expect(AuthService.signOut()).resolves.toBeUndefined();

      expect(amplifyAuth.signOut).toHaveBeenCalled();
    });

    it('ログアウトエラーを適切に処理する', async () => {
      const error = { code: 'NetworkError', message: 'Network error' };
      vi.mocked(amplifyAuth.signOut).mockRejectedValue(error);

      await expect(AuthService.signOut()).rejects.toMatchObject({
        code: 'NetworkError',
        message: 'ネットワークエラーが発生しました。インターネット接続を確認してください',
      });
    });
  });

  describe('getCurrentUser', () => {
    it('正常にユーザー情報を取得できる', async () => {
      const mockUser = { userId: '123', username: 'test@example.com' };
      vi.mocked(amplifyAuth.getCurrentUser).mockResolvedValue(mockUser as any);

      const result = await AuthService.getCurrentUser();

      expect(result).toEqual(mockUser);
      expect(amplifyAuth.getCurrentUser).toHaveBeenCalled();
    });

    it('エラー時にnullを返す', async () => {
      vi.mocked(amplifyAuth.getCurrentUser).mockRejectedValue(new Error('Not authenticated'));

      const result = await AuthService.getCurrentUser();

      expect(result).toBeNull();
    });
  });

  describe('getCurrentSession', () => {
    it('正常にセッション情報を取得できる', async () => {
      const mockSession = { tokens: { idToken: 'token123' } };
      vi.mocked(amplifyAuth.fetchAuthSession).mockResolvedValue(mockSession as any);

      const result = await AuthService.getCurrentSession();

      expect(result).toEqual(mockSession);
      expect(amplifyAuth.fetchAuthSession).toHaveBeenCalled();
    });

    it('エラー時にnullを返す', async () => {
      vi.mocked(amplifyAuth.fetchAuthSession).mockRejectedValue(new Error('Session error'));

      const result = await AuthService.getCurrentSession();

      expect(result).toBeNull();
    });
  });

  describe('getCurrentSessionTyped', () => {
    it('正常に型付きセッション情報を取得できる', async () => {
      const mockSession = {
        tokens: {
          idToken: { toString: () => 'idToken123' },
          accessToken: { toString: () => 'accessToken123' },
          refreshToken: { toString: () => 'refreshToken123' },
        },
      };
      vi.mocked(amplifyAuth.fetchAuthSession).mockResolvedValue(mockSession as any);

      const result = await AuthService.getCurrentSessionTyped();

      expect(result).toEqual(mockSession);
      expect(amplifyAuth.fetchAuthSession).toHaveBeenCalled();
    });

    it('エラー時にnullを返す', async () => {
      vi.mocked(amplifyAuth.fetchAuthSession).mockRejectedValue(new Error('Session error'));

      const result = await AuthService.getCurrentSessionTyped();

      expect(result).toBeNull();
    });
  });

  describe('getJwtToken', () => {
    it('正常にJWTトークンを取得できる', async () => {
      const mockSession = {
        tokens: {
          idToken: { toString: () => 'jwtToken123' },
        },
      };
      vi.mocked(amplifyAuth.fetchAuthSession).mockResolvedValue(mockSession as any);

      const result = await AuthService.getJwtToken();

      expect(result).toBe('jwtToken123');
      expect(amplifyAuth.fetchAuthSession).toHaveBeenCalled();
    });

    it('トークンがない場合nullを返す', async () => {
      const mockSession = { tokens: {} };
      vi.mocked(amplifyAuth.fetchAuthSession).mockResolvedValue(mockSession as any);

      const result = await AuthService.getJwtToken();

      expect(result).toBeNull();
    });

    it('エラー時にnullを返す', async () => {
      vi.mocked(amplifyAuth.fetchAuthSession).mockRejectedValue(new Error('Token error'));

      const result = await AuthService.getJwtToken();

      expect(result).toBeNull();
    });
  });

  describe('checkAuthState', () => {
    it('認証済みの場合trueを返す', async () => {
      vi.mocked(amplifyAuth.getCurrentUser).mockResolvedValue({} as any);

      const result = await AuthService.checkAuthState();

      expect(result).toBe(true);
      expect(amplifyAuth.getCurrentUser).toHaveBeenCalled();
    });

    it('未認証の場合falseを返す', async () => {
      vi.mocked(amplifyAuth.getCurrentUser).mockRejectedValue(new Error('Not authenticated'));

      const result = await AuthService.checkAuthState();

      expect(result).toBe(false);
    });
  });

  describe('handleAuthError', () => {
    it('UserNotFoundExceptionを適切に変換する', () => {
      const error = { code: 'UserNotFoundException', message: 'User not found' };

      const result = AuthService.handleAuthError(error);

      expect(result).toMatchObject({
        code: 'UserNotFoundException',
        message: 'メールアドレスまたはパスワードが正しくありません',
      });
    });

    it('NotAuthorizedExceptionを適切に変換する', () => {
      const error = { code: 'NotAuthorizedException', message: 'Not authorized' };

      const result = AuthService.handleAuthError(error);

      expect(result).toMatchObject({
        code: 'NotAuthorizedException',
        message: 'メールアドレスまたはパスワードが正しくありません',
      });
    });

    it('UsernameExistsExceptionを適切に変換する', () => {
      const error = { code: 'UsernameExistsException', message: 'User exists' };

      const result = AuthService.handleAuthError(error);

      expect(result).toMatchObject({
        code: 'UsernameExistsException',
        message: 'このメールアドレスは既に登録されています',
      });
    });

    it('CodeMismatchExceptionを適切に変換する', () => {
      const error = { code: 'CodeMismatchException', message: 'Invalid code' };

      const result = AuthService.handleAuthError(error);

      expect(result).toMatchObject({
        code: 'CodeMismatchException',
        message: '確認コードが正しくありません',
      });
    });

    it('InvalidPasswordExceptionを適切に変換する', () => {
      const error = { code: 'InvalidPasswordException', message: 'Invalid password' };

      const result = AuthService.handleAuthError(error);

      expect(result).toMatchObject({
        code: 'InvalidPasswordException',
        message: 'パスワードは8文字以上で、大文字・小文字・数字を含む必要があります',
      });
    });

    it('TooManyRequestsExceptionを適切に変換する', () => {
      const error = { code: 'TooManyRequestsException', message: 'Too many requests' };

      const result = AuthService.handleAuthError(error);

      expect(result).toMatchObject({
        code: 'TooManyRequestsException',
        message: 'リクエストが多すぎます。しばらく待ってから再試行してください',
      });
    });

    it('ネットワークエラーを検出する（messageから）', () => {
      const error = { message: 'Network request failed' };

      const result = AuthService.handleAuthError(error);

      expect(result).toMatchObject({
        code: 'NetworkError',
        message: 'ネットワークエラーが発生しました。インターネット接続を確認してください',
      });
    });

    it('TypeErrorをネットワークエラーとして扱う', () => {
      const error = new TypeError('Failed to fetch');

      const result = AuthService.handleAuthError(error);

      expect(result).toMatchObject({
        code: 'NetworkError',
        message: 'ネットワークエラーが発生しました。インターネット接続を確認してください',
      });
    });

    it('未知のエラーをデフォルトメッセージで変換する', () => {
      const error = { code: 'UnknownError', message: 'Unknown error' };

      const result = AuthService.handleAuthError(error);

      expect(result).toMatchObject({
        code: 'UnknownError',
        message: 'エラーが発生しました。しばらく待ってから再試行してください',
      });
    });

    it('エラーオブジェクトでない場合もデフォルトメッセージを返す', () => {
      const result = AuthService.handleAuthError(null);

      expect(result).toMatchObject({
        code: 'UnknownError',
        message: 'エラーが発生しました。しばらく待ってから再試行してください',
      });
    });
  });

  describe('testNetworkConnection', () => {
    beforeEach(() => {
      global.fetch = vi.fn();
    });

    it('ネットワーク接続が正常な場合trueを返す', async () => {
      vi.mocked(global.fetch).mockResolvedValue({ ok: true } as Response);

      const result = await AuthService.testNetworkConnection();

      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith('/favicon.ico', {
        method: 'HEAD',
        cache: 'no-cache',
        signal: expect.any(AbortSignal),
      });
    });

    it('ネットワーク接続が失敗した場合falseを返す', async () => {
      vi.mocked(global.fetch).mockRejectedValue(new Error('Network error'));

      const result = await AuthService.testNetworkConnection();

      expect(result).toBe(false);
    });

    it('レスポンスがokでない場合falseを返す', async () => {
      vi.mocked(global.fetch).mockResolvedValue({ ok: false } as Response);

      const result = await AuthService.testNetworkConnection();

      expect(result).toBe(false);
    });
  });

  describe('isRetryableError', () => {
    it('NetworkErrorは再試行可能', () => {
      const error: AuthError = { code: 'NetworkError', message: 'Network error' };

      expect(AuthService.isRetryableError(error)).toBe(true);
    });

    it('TimeoutErrorは再試行可能', () => {
      const error: AuthError = { code: 'TimeoutError', message: 'Timeout' };

      expect(AuthService.isRetryableError(error)).toBe(true);
    });

    it('ServiceUnavailableは再試行可能', () => {
      const error: AuthError = { code: 'ServiceUnavailable', message: 'Service unavailable' };

      expect(AuthService.isRetryableError(error)).toBe(true);
    });

    it('TooManyRequestsExceptionは再試行可能', () => {
      const error: AuthError = {
        code: 'TooManyRequestsException',
        message: 'Too many requests',
      };

      expect(AuthService.isRetryableError(error)).toBe(true);
    });

    it('LimitExceededExceptionは再試行可能', () => {
      const error: AuthError = { code: 'LimitExceededException', message: 'Limit exceeded' };

      expect(AuthService.isRetryableError(error)).toBe(true);
    });

    it('InternalErrorExceptionは再試行可能', () => {
      const error: AuthError = { code: 'InternalErrorException', message: 'Internal error' };

      expect(AuthService.isRetryableError(error)).toBe(true);
    });

    it('UserNotFoundExceptionは再試行不可', () => {
      const error: AuthError = { code: 'UserNotFoundException', message: 'User not found' };

      expect(AuthService.isRetryableError(error)).toBe(false);
    });

    it('CodeMismatchExceptionは再試行不可', () => {
      const error: AuthError = { code: 'CodeMismatchException', message: 'Invalid code' };

      expect(AuthService.isRetryableError(error)).toBe(false);
    });
  });

  describe('isNetworkError', () => {
    it('NetworkErrorはネットワークエラー', () => {
      const error: AuthError = { code: 'NetworkError', message: 'Network error' };

      expect(AuthService.isNetworkError(error)).toBe(true);
    });

    it('TimeoutErrorはネットワークエラー', () => {
      const error: AuthError = { code: 'TimeoutError', message: 'Timeout' };

      expect(AuthService.isNetworkError(error)).toBe(true);
    });

    it('ServiceUnavailableはネットワークエラー', () => {
      const error: AuthError = { code: 'ServiceUnavailable', message: 'Service unavailable' };

      expect(AuthService.isNetworkError(error)).toBe(true);
    });

    it('UserNotFoundExceptionはネットワークエラーではない', () => {
      const error: AuthError = { code: 'UserNotFoundException', message: 'User not found' };

      expect(AuthService.isNetworkError(error)).toBe(false);
    });

    it('TooManyRequestsExceptionはネットワークエラーではない', () => {
      const error: AuthError = {
        code: 'TooManyRequestsException',
        message: 'Too many requests',
      };

      expect(AuthService.isNetworkError(error)).toBe(false);
    });
  });
});
