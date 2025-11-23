import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { act } from '@testing-library/react';
import { useAuthForm } from './useAuthForm';
import { loginSchema, signupSchema } from '../utils/validation';

describe('useAuthForm', () => {
  describe('ログインフォーム', () => {
    it('初期状態が正しく設定される', () => {
      const { result } = renderHook(() => useAuthForm(loginSchema));

      expect(result.current.isValid).toBe(false);
      expect(result.current.errors).toEqual({});
      expect(result.current.values).toEqual({});
    });

    it('有効な値でバリデーションが成功する', async () => {
      const { result } = renderHook(() => useAuthForm(loginSchema));

      await act(async () => {
        result.current.setValue('email', 'test@example.com');
        result.current.setValue('password', 'password123');
      });

      expect(result.current.isValid).toBe(true);
      expect(result.current.errors).toEqual({});
    });

    it('無効な値でバリデーションエラーが発生する', async () => {
      const { result } = renderHook(() => useAuthForm(loginSchema));

      await act(async () => {
        result.current.setValue('email', 'invalid-email');
        result.current.setValue('password', '');
      });

      expect(result.current.isValid).toBe(false);
      expect(result.current.errors.email).toBe('有効なメールアドレスを入力してください');
      expect(result.current.errors.password).toBe('パスワードは必須です');
    });

    it('フィールドのクリアが正しく動作する', async () => {
      const { result } = renderHook(() => useAuthForm(loginSchema));

      await act(async () => {
        result.current.setValue('email', 'test@example.com');
        result.current.setValue('password', 'password123');
      });

      expect(result.current.values.email).toBe('test@example.com');

      await act(async () => {
        result.current.clearField('email');
      });

      expect(result.current.values.email).toBe('');
    });

    it('フォームのリセットが正しく動作する', async () => {
      const { result } = renderHook(() => useAuthForm(loginSchema));

      await act(async () => {
        result.current.setValue('email', 'test@example.com');
        result.current.setValue('password', 'password123');
      });

      await act(async () => {
        result.current.reset();
      });

      expect(result.current.values).toEqual({});
      expect(result.current.errors).toEqual({});
      expect(result.current.isValid).toBe(false);
    });
  });

  describe('サインアップフォーム', () => {
    it('パスワード確認のバリデーションが正しく動作する', async () => {
      const { result } = renderHook(() => useAuthForm(signupSchema));

      await act(async () => {
        result.current.setValue('name', '山田太郎');
        result.current.setValue('email', 'test@example.com');
        result.current.setValue('password', 'Password123');
        result.current.setValue('confirmPassword', 'DifferentPassword');
      });

      expect(result.current.isValid).toBe(false);
      expect(result.current.errors.confirmPassword).toBe('パスワードが一致しません');
    });

    it('パスワード強度の要件が正しく検証される', async () => {
      const { result } = renderHook(() => useAuthForm(signupSchema));

      await act(async () => {
        result.current.setValue('name', '山田太郎');
        result.current.setValue('email', 'test@example.com');
        result.current.setValue('password', 'weakpass');
        result.current.setValue('confirmPassword', 'weakpass');
      });

      expect(result.current.isValid).toBe(false);
      expect(result.current.errors.password).toBe(
        'パスワードは大文字、小文字、数字を含む必要があります'
      );
    });
  });

  describe('パスワードリセットフォーム', () => {
    it('メールアドレスのバリデーションが正しく動作する', async () => {
      const { result } = renderHook(() => useAuthForm(passwordResetSchema));

      await act(async () => {
        result.current.setValue('email', 'test@example.com');
      });

      expect(result.current.isValid).toBe(true);
      expect(result.current.errors).toEqual({});
    });
  });

  describe('フォーム送信', () => {
    it('有効なデータでフォーム送信が成功する', async () => {
      const mockOnSubmit = vi.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() => useAuthForm(loginSchema, mockOnSubmit));

      await act(async () => {
        result.current.setValue('email', 'test@example.com');
        result.current.setValue('password', 'password123');
      });

      await act(async () => {
        await result.current.handleSubmit();
      });

      expect(mockOnSubmit).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });

    it('無効なデータでフォーム送信が失敗する', async () => {
      const mockOnSubmit = vi.fn();
      const { result } = renderHook(() => useAuthForm(loginSchema, mockOnSubmit));

      await act(async () => {
        result.current.setValue('email', 'invalid-email');
      });

      await act(async () => {
        await result.current.handleSubmit();
      });

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('送信中の状態が正しく管理される', async () => {
      const mockOnSubmit = vi
        .fn()
        .mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      const { result } = renderHook(() => useAuthForm(loginSchema, mockOnSubmit));

      await act(async () => {
        result.current.setValue('email', 'test@example.com');
        result.current.setValue('password', 'password123');
      });

      // 送信開始
      const submitPromise = act(async () => {
        await result.current.handleSubmit();
      });

      // 送信中の状態を確認
      expect(result.current.isSubmitting).toBe(true);

      // 送信完了まで待機
      await submitPromise;

      expect(result.current.isSubmitting).toBe(false);
    });

    it('送信エラーが正しく処理される', async () => {
      const mockError = new Error('送信エラー');
      const mockOnSubmit = vi.fn().mockRejectedValue(mockError);
      const { result } = renderHook(() => useAuthForm(loginSchema, mockOnSubmit));

      await act(async () => {
        result.current.setValue('email', 'test@example.com');
        result.current.setValue('password', 'password123');
      });

      await act(async () => {
        await result.current.handleSubmit();
      });

      expect(result.current.submitError).toBe(mockError);
      expect(result.current.isSubmitting).toBe(false);
    });
  });

  describe('フィールド固有の機能', () => {
    it('フィールドのタッチ状態が正しく管理される', async () => {
      const { result } = renderHook(() => useAuthForm(loginSchema));

      expect(result.current.touched.email).toBe(false);

      await act(async () => {
        result.current.setFieldTouched('email', true);
      });

      expect(result.current.touched.email).toBe(true);
    });

    it('フィールドエラーの取得が正しく動作する', async () => {
      const { result } = renderHook(() => useAuthForm(loginSchema));

      await act(async () => {
        result.current.setValue('email', 'invalid-email');
        result.current.setFieldTouched('email', true);
      });

      expect(result.current.getFieldError('email')).toBe('有効なメールアドレスを入力してください');
    });

    it('フィールドの有効性チェックが正しく動作する', async () => {
      const { result } = renderHook(() => useAuthForm(loginSchema));

      await act(async () => {
        result.current.setValue('email', 'test@example.com');
      });

      expect(result.current.isFieldValid('email')).toBe(true);

      await act(async () => {
        result.current.setValue('email', 'invalid-email');
      });

      expect(result.current.isFieldValid('email')).toBe(false);
    });
  });
});
