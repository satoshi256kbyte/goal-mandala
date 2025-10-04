import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { signupZodSchema, type SignupFormData } from '../../utils/validation';
import { ErrorMessage } from '../common/ErrorMessage';
import { LoadingButton } from '../common/LoadingButton';
import {
  useKeyboardNavigation,
  useLiveRegion,
  // useFocusVisible, // 将来の機能拡張用
} from '../../hooks/useAccessibility';

/**
 * サインアップフォームコンポーネントのProps
 */
export interface SignupFormProps {
  /** フォーム送信時のハンドラー */
  onSubmit: (data: SignupFormData) => Promise<void>;
  /** ローディング状態 */
  isLoading?: boolean;
  /** エラーメッセージ */
  error?: string;
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
 * サインアップフォームコンポーネント
 *
 * 機能:
 * - 名前、メールアドレス、パスワード、パスワード確認の入力フィールド
 * - React Hook Formによるフォーム管理
 * - Zodによるリアルタイムバリデーション
 * - パスワード強度インジケーター
 * - パスワード確認バリデーション
 * - エラー表示機能
 * - アクセシビリティ対応（キーボードナビゲーション、スクリーンリーダー対応、フォーカス管理）
 * - 色覚対応とコントラスト比の確保
 *
 * 要件: 2.1, 2.2, 2.3, 2.4, 4.1, 4.2, 4.3, 4.4, 4.5, 5.1
 */
export const SignupForm: React.FC<SignupFormProps> = ({ onSubmit, isLoading = false, error }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  // const { focusVisibleClasses } = useFocusVisible(); // 将来の機能拡張用
  const { announce } = useLiveRegion();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isValid, touchedFields },
    setFocus,
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupZodSchema),
    mode: 'all', // 全てのイベントでバリデーション
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const password = watch('password');
  const confirmPassword = watch('confirmPassword');

  // フォーム読み込み時に最初のフィールドにフォーカス
  useEffect(() => {
    if (nameRef.current) {
      nameRef.current.focus();
    }
  }, []);

  // エラー発生時のアナウンス
  useEffect(() => {
    if (error) {
      announce(`サインアップエラー: ${error}`, 'assertive');
    }
  }, [error, announce]);

  // バリデーションエラー発生時のアナウンス
  useEffect(() => {
    const errorMessages = Object.values(errors)
      .map(err => err?.message)
      .filter(Boolean);
    if (errorMessages.length > 0) {
      announce(`入力エラーがあります: ${errorMessages.join(', ')}`, 'polite');
    }
  }, [errors, announce]);

  // キーボードナビゲーション
  useKeyboardNavigation(
    () => {
      // Enterキーでフォーム送信（フォーカスがボタン以外の場合）
      if (isValid && !isLoading) {
        formRef.current?.requestSubmit();
      }
    },
    undefined, // Escape
    () => {
      // ArrowUp - 前のフィールドにフォーカス
      const activeElement = document.activeElement as HTMLElement;
      if (activeElement?.id === 'email') setFocus('name');
      else if (activeElement?.id === 'password') setFocus('email');
      else if (activeElement?.id === 'confirmPassword') setFocus('password');
    },
    () => {
      // ArrowDown - 次のフィールドにフォーカス
      const activeElement = document.activeElement as HTMLElement;
      if (activeElement?.id === 'name') setFocus('email');
      else if (activeElement?.id === 'email') setFocus('password');
      else if (activeElement?.id === 'password') setFocus('confirmPassword');
    }
  );

  const handleFormSubmit = async (data: SignupFormData) => {
    try {
      announce('アカウント作成処理を開始します', 'polite');
      await onSubmit(data);
      announce('アカウント作成が完了しました', 'polite');
    } catch (err) {
      // エラーは親コンポーネントで処理される
      // エラーログは開発環境でのみ出力
      if (process.env.NODE_ENV === 'development') {
        console.error('Signup form submission error:', err);
      }
      announce('アカウント作成に失敗しました', 'assertive');
    }
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit(handleFormSubmit)} noValidate>
      {/* 全体エラーメッセージ */}
      {error && <ErrorMessage error={error} className="text-center" id="signup-error" />}

      <div className="space-y-4">
        {/* 名前入力フィールド */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            名前
          </label>
          <div className="mt-1">
            <input
              {...register('name')}
              id="name"
              type="text"
              autoComplete="name"
              required
              aria-label="名前"
              aria-describedby={errors.name ? 'name-error' : undefined}
              aria-invalid={!!errors.name}
              className={`
                appearance-none relative block w-full px-3 py-2 border
                placeholder-gray-500 text-gray-900 rounded-md
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                focus:z-10 sm:text-sm transition-colors duration-200
                ${
                  errors.name
                    ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                    : touchedFields.name && !errors.name
                      ? 'border-green-500'
                      : 'border-gray-300'
                }
              `}
              placeholder="お名前を入力してください"
            />
          </div>
          <ErrorMessage error={errors.name?.message} id="name-error" />
        </div>

        {/* メールアドレス入力フィールド */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            メールアドレス
          </label>
          <div className="mt-1">
            <input
              {...register('email')}
              id="email"
              type="email"
              autoComplete="email"
              required
              aria-label="メールアドレス"
              aria-describedby={errors.email ? 'email-error' : undefined}
              aria-invalid={!!errors.email}
              className={`
                appearance-none relative block w-full px-3 py-2 border
                placeholder-gray-500 text-gray-900 rounded-md
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                focus:z-10 sm:text-sm transition-colors duration-200
                ${
                  errors.email
                    ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                    : touchedFields.email && !errors.email
                      ? 'border-green-500'
                      : 'border-gray-300'
                }
              `}
              placeholder="メールアドレスを入力してください"
            />
          </div>
          <ErrorMessage error={errors.email?.message} id="email-error" />
        </div>

        {/* パスワード入力フィールド */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            パスワード
          </label>
          <div className="mt-1 relative">
            <input
              {...register('password')}
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              required
              aria-label="パスワード"
              aria-describedby={errors.password ? 'password-error' : 'password-help'}
              aria-invalid={!!errors.password}
              className={`
                appearance-none relative block w-full px-3 py-2 pr-10 border
                placeholder-gray-500 text-gray-900 rounded-md
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                focus:z-10 sm:text-sm transition-colors duration-200
                ${
                  errors.password
                    ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                    : touchedFields.password && !errors.password
                      ? 'border-green-500'
                      : 'border-gray-300'
                }
              `}
              placeholder="パスワードを入力してください"
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
          <PasswordStrengthIndicator password={password} />
          <ErrorMessage error={errors.password?.message} id="password-error" />
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
                        password === confirmPassword
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
          {confirmPassword && (
            <div className="mt-1 text-xs">
              {password === confirmPassword ? (
                <span className="text-green-600">✓ パスワードが一致しています</span>
              ) : (
                <span className="text-red-600">✗ パスワードが一致しません</span>
              )}
            </div>
          )}
          <ErrorMessage error={errors.confirmPassword?.message} id="confirm-password-error" />
        </div>
      </div>

      {/* サインアップボタン */}
      <div>
        <LoadingButton
          type="submit"
          isLoading={isLoading}
          disabled={!isValid || isLoading}
          className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          loadingText="アカウント作成中..."
        >
          アカウント作成
        </LoadingButton>
      </div>

      {/* ログインリンク */}
      <div className="text-center">
        <p className="text-sm text-gray-600">
          既にアカウントをお持ちの場合は{' '}
          <Link
            to="/login"
            className="font-medium text-blue-600 hover:text-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
          >
            ログイン
          </Link>
        </p>
      </div>
    </form>
  );
};

export default SignupForm;
