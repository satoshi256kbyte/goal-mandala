import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { newPasswordZodSchema, type NewPasswordFormData } from '../../utils/validation';
import { ErrorMessage } from '../common/ErrorMessage';
import { LoadingButton } from '../common/LoadingButton';

/**
 * 新しいパスワード設定フォームコンポーネントのProps
 */
export interface NewPasswordFormProps {
  /** フォーム送信時のハンドラー */
  onSubmit: (data: NewPasswordFormData) => Promise<void>;
  /** ローディング状態 */
  isLoading?: boolean;
  /** エラーメッセージ */
  error?: string;
  /** 確認コード入力フィールドを表示するか */
  showConfirmationCode?: boolean;
  /** メールアドレス（表示用） */
  email?: string;
  /** 確認コード（URLから取得した場合） */
  confirmationCode?: string;
}

/**
 * パスワード強度の計算
 */
const calculatePasswordStrength = (password: string): number => {
  let strength = 0;
  if (password.length >= 8) strength += 25;
  if (/[a-z]/.test(password)) strength += 25;
  if (/[A-Z]/.test(password)) strength += 25;
  if (/\d/.test(password)) strength += 25;
  return strength;
};

/**
 * パスワード強度インジケーターコンポーネント
 */
const PasswordStrengthIndicator: React.FC<{ password: string }> = ({ password }) => {
  const strength = calculatePasswordStrength(password);

  const getStrengthColor = () => {
    if (strength < 50) return 'bg-red-500';
    if (strength < 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStrengthText = () => {
    if (strength < 50) return '弱い';
    if (strength < 75) return '普通';
    return '強い';
  };

  if (!password) return null;

  return (
    <div className="mt-2">
      <div className="flex items-center space-x-2">
        <div className="flex-1 bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${getStrengthColor()}`}
            style={{ width: `${strength}%` }}
          />
        </div>
        <span className="text-xs text-gray-600">{getStrengthText()}</span>
      </div>
    </div>
  );
};

/**
 * 新しいパスワード設定フォームコンポーネント
 *
 * 機能:
 * - 新しいパスワードとパスワード確認の入力フィールド
 * - 確認コード入力フィールド（オプション）
 * - React Hook Formによるフォーム管理
 * - Zodによるリアルタイムバリデーション
 * - パスワード強度インジケーター
 * - パスワード確認バリデーション
 * - エラー表示機能
 * - アクセシビリティ対応
 *
 * 要件: 3.4, 3.5, 4.1, 4.2, 4.4, 4.5, 5.1
 */
export const NewPasswordForm: React.FC<NewPasswordFormProps> = ({
  onSubmit,
  isLoading = false,
  error,
  showConfirmationCode = true,
  email,
  confirmationCode,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isValid, touchedFields },
  } = useForm<NewPasswordFormData>({
    resolver: zodResolver(newPasswordZodSchema),
    mode: 'all', // 全てのイベントでバリデーション
    defaultValues: {
      newPassword: '',
      confirmPassword: '',
      confirmationCode: confirmationCode || '',
    },
  });

  const newPassword = watch('newPassword');
  const confirmPasswordValue = watch('confirmPassword');

  const handleFormSubmit = async (data: NewPasswordFormData) => {
    try {
      await onSubmit(data);
    } catch (err) {
      // エラーは親コンポーネントで処理される
      // エラーログは開発環境でのみ出力
      if (process.env.NODE_ENV === 'development') {
        console.error('New password form submission error:', err);
      }
    }
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit(handleFormSubmit)} noValidate>
      {/* 全体エラーメッセージ */}
      {error && <ErrorMessage error={error} className="text-center" id="new-password-error" />}

      {/* メールアドレス表示 */}
      {email && (
        <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
          <p className="text-sm text-gray-700">
            <span className="font-medium">アカウント:</span> {email}
          </p>
        </div>
      )}

      <div className="space-y-4">
        {/* 確認コード入力フィールド */}
        {showConfirmationCode && (
          <div>
            <label htmlFor="confirmationCode" className="block text-sm font-medium text-gray-700">
              確認コード
            </label>
            <div className="mt-1">
              <input
                {...register('confirmationCode')}
                id="confirmationCode"
                type="text"
                autoComplete="one-time-code"
                required
                aria-label="確認コード"
                aria-describedby={
                  errors.confirmationCode ? 'confirmation-code-error' : 'confirmation-code-help'
                }
                aria-invalid={!!errors.confirmationCode}
                className={`
                  appearance-none relative block w-full px-3 py-2 border
                  placeholder-gray-500 text-gray-900 rounded-md
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                  focus:z-10 sm:text-sm transition-colors duration-200
                  ${
                    errors.confirmationCode
                      ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                      : touchedFields.confirmationCode && !errors.confirmationCode
                        ? 'border-green-500'
                        : 'border-gray-300'
                  }
                `}
                placeholder="メールで送信された確認コードを入力してください"
              />
            </div>
            <div id="confirmation-code-help" className="text-xs text-gray-600 mt-1">
              メールで送信された6桁の確認コードを入力してください
            </div>
            <ErrorMessage error={errors.confirmationCode?.message} id="confirmation-code-error" />
          </div>
        )}

        {/* 新しいパスワード入力フィールド */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            新しいパスワード
          </label>
          <div className="mt-1 relative">
            <input
              {...register('newPassword')}
              id="newPassword"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              required
              aria-label="新しいパスワード"
              aria-describedby={errors.newPassword ? 'newPassword-error' : 'newPassword-help'}
              aria-invalid={!!errors.newPassword}
              className={`
                appearance-none relative block w-full px-3 py-2 pr-10 border
                placeholder-gray-500 text-gray-900 rounded-md
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                focus:z-10 sm:text-sm transition-colors duration-200
                ${
                  errors.newPassword
                    ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                    : touchedFields.newPassword && !errors.newPassword
                      ? 'border-green-500'
                      : 'border-gray-300'
                }
              `}
              placeholder="新しいパスワードを入力してください"
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'パスワードを隠す' : 'パスワードを表示'}
            >
              {showPassword ? (
                <svg
                  className="h-5 w-5 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"
                  />
                </svg>
              ) : (
                <svg
                  className="h-5 w-5 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
              )}
            </button>
          </div>
          <div id="password-help" className="text-xs text-gray-600 mt-1">
            8文字以上で、大文字・小文字・数字を含む必要があります
          </div>
          <PasswordStrengthIndicator password={newPassword} />
          <ErrorMessage error={errors.newPassword?.message} id="newPassword-error" />
        </div>

        {/* パスワード確認入力フィールド */}
        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
            パスワード確認
          </label>
          <div className="mt-1 relative">
            <input
              {...register('confirmPassword')}
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              autoComplete="new-password"
              required
              aria-label="パスワード確認"
              aria-describedby={errors.confirmPassword ? 'confirm-password-error' : undefined}
              aria-invalid={!!errors.confirmPassword}
              className={`
                appearance-none relative block w-full px-3 py-2 pr-10 border
                placeholder-gray-500 text-gray-900 rounded-md
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                focus:z-10 sm:text-sm transition-colors duration-200
                ${
                  errors.confirmPassword
                    ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                    : touchedFields.confirmPassword &&
                        !errors.confirmPassword &&
                        newPassword === confirmPasswordValue
                      ? 'border-green-500'
                      : 'border-gray-300'
                }
              `}
              placeholder="パスワードを再入力してください"
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              aria-label={showConfirmPassword ? 'パスワード確認を隠す' : 'パスワード確認を表示'}
            >
              {showConfirmPassword ? (
                <svg
                  className="h-5 w-5 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"
                  />
                </svg>
              ) : (
                <svg
                  className="h-5 w-5 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
              )}
            </button>
          </div>
          {/* パスワード一致状況の表示 */}
          {confirmPasswordValue && (
            <div className="mt-1 text-xs">
              {newPassword === confirmPasswordValue ? (
                <span className="text-green-600">✓ パスワードが一致しています</span>
              ) : (
                <span className="text-red-600">✗ パスワードが一致しません</span>
              )}
            </div>
          )}
          <ErrorMessage error={errors.confirmPassword?.message} id="confirm-password-error" />
        </div>
      </div>

      {/* パスワード変更ボタン */}
      <div>
        <LoadingButton
          type="submit"
          isLoading={isLoading}
          disabled={!isValid || isLoading}
          className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          loadingText="パスワード変更中..."
        >
          パスワードを変更
        </LoadingButton>
      </div>

      {/* 戻るリンク */}
      <div className="text-center">
        <Link
          to="/login"
          className="text-sm text-blue-600 hover:text-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
        >
          ログイン画面に戻る
        </Link>
      </div>
    </form>
  );
};

export default NewPasswordForm;
