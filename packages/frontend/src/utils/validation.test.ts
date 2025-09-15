import { describe, it, expect } from 'vitest';
import { loginSchema, signupSchema, passwordResetSchema, newPasswordSchema } from './validation';

describe('Validation Schemas', () => {
  describe('loginSchema', () => {
    it('有効なログインデータを受け入れる', () => {
      const validData = {
        email: 'test@example.com',
        password: 'password123',
      };

      const result = loginSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('無効なメールアドレスを拒否する', () => {
      const invalidData = {
        email: 'invalid-email',
        password: 'password123',
      };

      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('有効なメールアドレスを入力してください');
      }
    });

    it('空のメールアドレスを拒否する', () => {
      const invalidData = {
        email: '',
        password: 'password123',
      };

      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('メールアドレスは必須です');
      }
    });

    it('空のパスワードを拒否する', () => {
      const invalidData = {
        email: 'test@example.com',
        password: '',
      };

      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('パスワードは必須です');
      }
    });
  });

  describe('signupSchema', () => {
    it('有効なサインアップデータを受け入れる', () => {
      const validData = {
        name: '山田太郎',
        email: 'test@example.com',
        password: 'Password123',
        confirmPassword: 'Password123',
      };

      const result = signupSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('短すぎるパスワードを拒否する', () => {
      const invalidData = {
        name: '山田太郎',
        email: 'test@example.com',
        password: 'Pass1',
        confirmPassword: 'Pass1',
      };

      const result = signupSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('パスワードは8文字以上で入力してください');
      }
    });

    it('パスワードの複雑性要件を満たさない場合を拒否する', () => {
      const invalidData = {
        name: '山田太郎',
        email: 'test@example.com',
        password: 'password',
        confirmPassword: 'password',
      };

      const result = signupSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          'パスワードは大文字、小文字、数字を含む必要があります'
        );
      }
    });

    it('パスワードが一致しない場合を拒否する', () => {
      const invalidData = {
        name: '山田太郎',
        email: 'test@example.com',
        password: 'Password123',
        confirmPassword: 'Password456',
      };

      const result = signupSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('パスワードが一致しません');
      }
    });

    it('長すぎる名前を拒否する', () => {
      const invalidData = {
        name: 'a'.repeat(51),
        email: 'test@example.com',
        password: 'Password123',
        confirmPassword: 'Password123',
      };

      const result = signupSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('名前は50文字以内で入力してください');
      }
    });
  });

  describe('passwordResetSchema', () => {
    it('有効なメールアドレスを受け入れる', () => {
      const validData = {
        email: 'test@example.com',
      };

      const result = passwordResetSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('無効なメールアドレスを拒否する', () => {
      const invalidData = {
        email: 'invalid-email',
      };

      const result = passwordResetSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('有効なメールアドレスを入力してください');
      }
    });
  });

  describe('newPasswordSchema', () => {
    it('有効な新しいパスワードデータを受け入れる', () => {
      const validData = {
        password: 'NewPassword123',
        confirmPassword: 'NewPassword123',
        confirmationCode: '123456',
      };

      const result = newPasswordSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('確認コードが空の場合を拒否する', () => {
      const invalidData = {
        password: 'NewPassword123',
        confirmPassword: 'NewPassword123',
        confirmationCode: '',
      };

      const result = newPasswordSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('確認コードは必須です');
      }
    });
  });
});
