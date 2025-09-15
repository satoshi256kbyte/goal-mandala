import { z } from 'zod';

/**
 * ログインフォームのバリデーションスキーマ
 */
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'メールアドレスは必須です')
    .email('有効なメールアドレスを入力してください'),
  password: z.string().min(1, 'パスワードは必須です'),
});

/**
 * サインアップフォームのバリデーションスキーマ
 */
export const signupSchema = z
  .object({
    name: z.string().min(1, '名前は必須です').max(50, '名前は50文字以内で入力してください'),
    email: z
      .string()
      .min(1, 'メールアドレスは必須です')
      .email('有効なメールアドレスを入力してください'),
    password: z
      .string()
      .min(8, 'パスワードは8文字以上で入力してください')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'パスワードは大文字、小文字、数字を含む必要があります'
      ),
    confirmPassword: z.string(),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: 'パスワードが一致しません',
    path: ['confirmPassword'],
  });

/**
 * パスワードリセットフォームのバリデーションスキーマ
 */
export const passwordResetSchema = z.object({
  email: z
    .string()
    .min(1, 'メールアドレスは必須です')
    .email('有効なメールアドレスを入力してください'),
});

/**
 * 新しいパスワード設定フォームのバリデーションスキーマ
 */
export const newPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'パスワードは8文字以上で入力してください')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'パスワードは大文字、小文字、数字を含む必要があります'
      ),
    confirmPassword: z.string(),
    confirmationCode: z.string().min(1, '確認コードは必須です'),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: 'パスワードが一致しません',
    path: ['confirmPassword'],
  });

// 型定義をエクスポート
export type LoginFormData = z.infer<typeof loginSchema>;
export type SignupFormData = z.infer<typeof signupSchema>;
export type PasswordResetFormData = z.infer<typeof passwordResetSchema>;
export type NewPasswordFormData = z.infer<typeof newPasswordSchema>;
