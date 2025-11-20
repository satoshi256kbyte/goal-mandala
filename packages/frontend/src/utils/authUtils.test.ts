import { describe, it } from 'vitest';
import {
  validatePasswordStrength,
  getPasswordStrengthScore,
  getPasswordStrengthText,
  formatAuthError,
  isValidEmail,
  sanitizeUserInput,
} from './authUtils';

describe('認証ユーティリティ関数', () => {
  describe('validatePasswordStrength', () => {
    it('強いパスワードを正しく検証する', () => {
      const strongPasswords = ['Password123', 'MySecure123', 'Complex1Pass', 'Strong123Password'];

      strongPasswords.forEach(password => {
        expect(validatePasswordStrength(password)).toBe(true);
      });
    });

    it('弱いパスワードを正しく検証する', () => {
      const weakPasswords = [
        'password', // 大文字なし、数字なし
        'PASSWORD', // 小文字なし、数字なし
        '12345678', // 文字なし
        'Pass1', // 短すぎる
        'password123', // 大文字なし
        'PASSWORD123', // 小文字なし
        'Password', // 数字なし
      ];

      weakPasswords.forEach(password => {
        expect(validatePasswordStrength(password)).toBe(false);
      });
    });
  });

  describe('getPasswordStrengthScore', () => {
    it('パスワード強度スコアを正しく計算する', () => {
      expect(getPasswordStrengthScore('weak')).toBe(1);
      expect(getPasswordStrengthScore('Password')).toBe(3);
      expect(getPasswordStrengthScore('password123')).toBe(3);
      expect(getPasswordStrengthScore('Password123')).toBe(4);
      expect(getPasswordStrengthScore('StrongPassword123!')).toBe(4);
    });

    it('空のパスワードでスコア0を返す', () => {
      expect(getPasswordStrengthScore('')).toBe(0);
    });
  });

  describe('getPasswordStrengthText', () => {
    it('パスワード強度テキストを正しく返す', () => {
      expect(getPasswordStrengthText(0)).toBe('');
      expect(getPasswordStrengthText(1)).toBe('弱い');
      expect(getPasswordStrengthText(2)).toBe('普通');
      expect(getPasswordStrengthText(3)).toBe('強い');
      expect(getPasswordStrengthText(4)).toBe('非常に強い');
    });

    it('範囲外のスコアで空文字を返す', () => {
      expect(getPasswordStrengthText(-1)).toBe('');
      expect(getPasswordStrengthText(5)).toBe('');
    });
  });

  describe('formatAuthError', () => {
    it('Cognitoエラーコードを適切にフォーマットする', () => {
      const errorCases = [
        {
          input: { code: 'NotAuthorizedException' },
          expected: 'メールアドレスまたはパスワードが正しくありません',
        },
        {
          input: { code: 'UserNotFoundException' },
          expected: 'メールアドレスまたはパスワードが正しくありません',
        },
        {
          input: { code: 'UsernameExistsException' },
          expected: 'このメールアドレスは既に登録されています',
        },
        {
          input: { code: 'InvalidPasswordException' },
          expected: 'パスワードが要件を満たしていません',
        },
        {
          input: { code: 'CodeMismatchException' },
          expected: '確認コードが正しくありません',
        },
        {
          input: { code: 'ExpiredCodeException' },
          expected: '確認コードの有効期限が切れています',
        },
        {
          input: { code: 'TooManyRequestsException' },
          expected: 'リクエストが多すぎます。しばらく待ってから再試行してください',
        },
      ];

      errorCases.forEach(({ input, expected }) => {
        expect(formatAuthError(input)).toBe(expected);
      });
    });

    it('未知のエラーコードでデフォルトメッセージを返す', () => {
      const unknownError = { code: 'UnknownErrorCode' };
      expect(formatAuthError(unknownError)).toBe(
        'エラーが発生しました。しばらく待ってから再試行してください'
      );
    });

    it('エラーコードがない場合でデフォルトメッセージを返す', () => {
      const errorWithoutCode = { message: 'Some error message' };
      expect(formatAuthError(errorWithoutCode)).toBe(
        'エラーが発生しました。しばらく待ってから再試行してください'
      );
    });

    it('ネットワークエラーを適切に検出する', () => {
      const networkErrors = [
        new TypeError('Failed to fetch'),
        { message: 'network request failed' },
        { message: 'connection timeout' },
      ];

      networkErrors.forEach(error => {
        expect(formatAuthError(error)).toBe(
          'ネットワークエラーが発生しました。インターネット接続を確認してください'
        );
      });
    });
  });

  describe('isValidEmail', () => {
    it('有効なメールアドレスを正しく検証する', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.jp',
        'user+tag@example.org',
        'user123@test-domain.com',
        'a@b.co',
      ];

      validEmails.forEach(email => {
        expect(isValidEmail(email)).toBe(true);
      });
    });

    it('無効なメールアドレスを正しく検証する', () => {
      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'user@',
        'user@.com',
        'user@domain.',
        '',
        'user name@example.com',
      ];

      invalidEmails.forEach(email => {
        expect(isValidEmail(email)).toBe(false);
      });
    });
  });

  describe('sanitizeUserInput', () => {
    it('ユーザー入力を適切にサニタイズする', () => {
      const testCases = [
        {
          input: '  test@example.com  ',
          expected: 'test@example.com',
        },
        {
          input: 'Test User',
          expected: 'Test User',
        },
        {
          input: '<script>alert("xss")</script>',
          expected: '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;',
        },
        {
          input: 'user@domain.com\n\r',
          expected: 'user@domain.com',
        },
      ];

      testCases.forEach(({ input, expected }) => {
        expect(sanitizeUserInput(input)).toBe(expected);
      });
    });

    it('空文字列や null を適切に処理する', () => {
      expect(sanitizeUserInput('')).toBe('');
      expect(sanitizeUserInput(null as any)).toBe('');
      expect(sanitizeUserInput(undefined as any)).toBe('');
    });
  });

  describe('パスワード要件チェック', () => {
    it('パスワード要件を個別にチェックする', () => {
      const requirements = {
        minLength: (password: string) => password.length >= 8,
        hasUppercase: (password: string) => /[A-Z]/.test(password),
        hasLowercase: (password: string) => /[a-z]/.test(password),
        hasNumber: (password: string) => /\d/.test(password),
        hasSpecialChar: (password: string) => /[!@#$%^&*(),.?":{}|<>]/.test(password),
      };

      const testPassword = 'Password123!';

      expect(requirements.minLength(testPassword)).toBe(true);
      expect(requirements.hasUppercase(testPassword)).toBe(true);
      expect(requirements.hasLowercase(testPassword)).toBe(true);
      expect(requirements.hasNumber(testPassword)).toBe(true);
      expect(requirements.hasSpecialChar(testPassword)).toBe(true);

      const weakPassword = 'weak';

      expect(requirements.minLength(weakPassword)).toBe(false);
      expect(requirements.hasUppercase(weakPassword)).toBe(false);
      expect(requirements.hasNumber(weakPassword)).toBe(false);
      expect(requirements.hasSpecialChar(weakPassword)).toBe(false);
    });
  });

  describe('認証状態ヘルパー', () => {
    it('認証エラーの種類を正しく判定する', () => {
      const isAuthenticationError = (error: any) => {
        const authErrorCodes = [
          'NotAuthorizedException',
          'UserNotFoundException',
          'InvalidPasswordException',
        ];
        return authErrorCodes.includes(error.code);
      };

      expect(isAuthenticationError({ code: 'NotAuthorizedException' })).toBe(true);
      expect(isAuthenticationError({ code: 'UserNotFoundException' })).toBe(true);
      expect(isAuthenticationError({ code: 'NetworkError' })).toBe(false);
    });

    it('再試行可能なエラーを正しく判定する', () => {
      expect(isRetryableError({ code: 'TooManyRequestsException' })).toBe(true);
      expect(isRetryableError({ message: 'network timeout' })).toBe(true);
      expect(isRetryableError({ code: 'NotAuthorizedException' })).toBe(false);
    });
  });
});
