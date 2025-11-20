import { describe, it } from 'vitest';
import {
  loginZodSchema,
  signupZodSchema,
  passwordResetZodSchema,
  newPasswordZodSchema,
} from './validation';

describe('Validation Schemas', () => {
  describe('loginZodSchema', () => {
    it('有効なログインデータを受け入れる', () => {
      const validData = {
        email: 'test@example.com',
        password: 'password123',
      };

      const result = loginZodSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('無効なメールアドレスを拒否する', () => {
      const invalidData = {
        email: 'invalid-email',
        password: 'password123',
      };

      const result = loginZodSchema.safeParse(invalidData);
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

      const result = loginZodSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        // Zodは空文字列に対してもemailバリデーションエラーを返す
        expect(result.error.issues[0].message).toBe('有効なメールアドレスを入力してください');
      }
    });

    it('空のパスワードを拒否する', () => {
      const invalidData = {
        email: 'test@example.com',
        password: '',
      };

      const result = loginZodSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('パスワードは8文字以上で入力してください');
      }
    });
  });

  describe('signupZodSchema', () => {
    it('有効なサインアップデータを受け入れる', () => {
      const validData = {
        name: '山田太郎',
        email: 'test@example.com',
        password: 'Password123',
        confirmPassword: 'Password123',
      };

      const result = signupZodSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('短すぎるパスワードを拒否する', () => {
      const invalidData = {
        name: '山田太郎',
        email: 'test@example.com',
        password: 'Pass1',
        confirmPassword: 'Pass1',
      };

      const result = signupZodSchema.safeParse(invalidData);
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

      const result = signupZodSchema.safeParse(invalidData);
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

      const result = signupZodSchema.safeParse(invalidData);
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

      const result = signupZodSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('名前は50文字以内で入力してください');
      }
    });
  });

  describe('passwordResetZodSchema', () => {
    it('有効なメールアドレスを受け入れる', () => {
      const validData = {
        email: 'test@example.com',
      };

      const result = passwordResetZodSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('無効なメールアドレスを拒否する', () => {
      const invalidData = {
        email: 'invalid-email',
      };

      const result = passwordResetZodSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('有効なメールアドレスを入力してください');
      }
    });
  });

  describe('newPasswordZodSchema', () => {
    it('有効な新しいパスワードデータを受け入れる', () => {
      const validData = {
        newPassword: 'NewPassword123',
        confirmPassword: 'NewPassword123',
        confirmationCode: '123456',
      };

      const result = newPasswordZodSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('確認コードが空の場合でも受け入れる（オプショナル）', () => {
      const validData = {
        newPassword: 'NewPassword123',
        confirmPassword: 'NewPassword123',
        confirmationCode: '',
      };

      const result = newPasswordZodSchema.safeParse(validData);
      // confirmationCodeはoptionalなので、空文字列でも成功する
      expect(result.success).toBe(true);
    });
  });
});
