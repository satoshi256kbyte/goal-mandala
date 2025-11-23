import React, { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { loginZodSchema, LoginFormData } from '../../utils/validation';
import { ErrorMessage } from '../common/ErrorMessage';
import { LoadingButton } from '../common/LoadingButton';
import {
  useKeyboardNavigation,
  useLiveRegion,
  useFocusVisible,
} from '../../hooks/useAccessibility';

/**
 * ログインフォームコンポーネントのProps
 */
export interface LoginFormProps {
  /** フォーム送信時のハンドラー */
  onSubmit: (data: LoginFormData) => Promise<void>;
  /** ローディング状態 */
  isLoading?: boolean;
  /** エラーメッセージ */
  error?: string;
}

/**
 * ログインフォームコンポーネント
 *
 * 機能:
 * - メールアドレスとパスワードの入力フィールド
 * - React Hook Formによるフォーム管理
 * - Zodによるリアルタイムバリデーション
 * - エラー表示機能
 * - アクセシビリティ対応（キーボードナビゲーション、スクリーンリーダー対応、フォーカス管理）
 * - 色覚対応とコントラスト比の確保
 *
 * 要件: 1.1, 1.2, 1.3, 1.4, 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2
 */
export const LoginForm: React.FC<LoginFormProps> = ({ onSubmit, isLoading = false, error }) => {
  const formRef = useRef<HTMLFormElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const { focusVisibleClasses } = useFocusVisible();
  const { announce } = useLiveRegion();

  const {
    register,
    handleSubmit,
    formState: { errors, isValid, touchedFields },
    setFocus,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginZodSchema),
    mode: 'all', // 全てのイベントでバリデーション
    defaultValues: {
      email: '',
      password: '',
    },
  });

  // フォーム読み込み時に最初のフィールドにフォーカス
  useEffect(() => {
    if (emailRef.current) {
      emailRef.current.focus();
    }
  }, []);

  // エラー発生時のアナウンス
  useEffect(() => {
    if (error) {
      announce(`ログインエラー: ${error}`, 'assertive');
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
    () => setFocus('email'), // ArrowUp
    () => setFocus('password') // ArrowDown
  );

  const handleFormSubmit = async (data: LoginFormData) => {
    try {
      announce('ログイン処理を開始します', 'polite');
      await onSubmit(data);
      announce('ログインが完了しました', 'polite');
    } catch (err) {
      // エラーは親コンポーネントで処理される
      // エラーログは開発環境でのみ出力
      if (process.env.NODE_ENV === 'development') {
        console.error('Login form submission error:', err);
      }
      announce('ログインに失敗しました', 'assertive');
    }
  };

  // 入力フィールドの共通スタイル
  const getInputStyles = (hasError: boolean, isTouched: boolean) => `
    appearance-none relative block w-full px-3 py-2 border-2
    placeholder-gray-500 text-gray-900 rounded-md
    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
    focus:z-10 sm:text-sm transition-all duration-200
    ${focusVisibleClasses}
    ${
      hasError
        ? 'border-red-500 focus:ring-red-500 focus:border-red-500 bg-red-50'
        : isTouched && !hasError
          ? 'border-green-500 bg-green-50'
          : 'border-gray-300 bg-white hover:border-gray-400'
    }
  `;

  return (
    <form
      ref={formRef}
      className="space-y-6"
      onSubmit={handleSubmit(handleFormSubmit)}
      noValidate
      aria-label="ログインフォーム"
    >
      {/* 全体エラーメッセージ */}
      {error && (
        <ErrorMessage error={error} className="text-center" id="login-error" type="error" />
      )}

      <fieldset className="space-y-4" disabled={isLoading}>
        <legend className="sr-only">ログイン情報を入力してください</legend>

        {/* メールアドレス入力フィールド */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            メールアドレス{' '}
            <span className="text-red-500" aria-label="必須">
              *
            </span>
          </label>
          <div className="mt-1">
            <input
              {...register('email')}
              ref={e => {
                register('email').ref(e);
                if (emailRef.current !== e) {
                  (emailRef as React.MutableRefObject<HTMLInputElement | null>).current = e;
                }
              }}
              id="email"
              type="email"
              autoComplete="email"
              required
              aria-label="メールアドレス（必須）"
              aria-describedby={errors.email ? 'email-error' : 'email-help'}
              aria-invalid={!!errors.email}
              className={getInputStyles(!!errors.email, !!touchedFields.email)}
              placeholder="example@email.com"
            />
            <div id="email-help" className="sr-only">
              有効なメールアドレスを入力してください
            </div>
          </div>
          <ErrorMessage error={errors.email?.message} id="email-error" type="error" />
        </div>

        {/* パスワード入力フィールド */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            パスワード{' '}
            <span className="text-red-500" aria-label="必須">
              *
            </span>
          </label>
          <div className="mt-1">
            <input
              {...register('password')}
              id="password"
              type="password"
              autoComplete="current-password"
              required
              aria-label="パスワード（必須）"
              aria-describedby={errors.password ? 'password-error' : 'password-help'}
              aria-invalid={!!errors.password}
              className={getInputStyles(!!errors.password, !!touchedFields.password)}
              placeholder="パスワードを入力してください"
            />
            <div id="password-help" className="sr-only">
              アカウント作成時に設定したパスワードを入力してください
            </div>
          </div>
          <ErrorMessage error={errors.password?.message} id="password-error" type="error" />
        </div>
      </fieldset>

      {/* パスワードを忘れた場合のリンク */}
      <div className="flex items-center justify-end">
        <div className="text-sm">
          <Link
            to="/password-reset"
            className={`
              font-medium text-blue-600 hover:text-blue-500 underline
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded
              ${focusVisibleClasses}
            `}
            aria-describedby="password-reset-help"
          >
            パスワードを忘れた場合
          </Link>
          <div id="password-reset-help" className="sr-only">
            パスワードリセット画面に移動します
          </div>
        </div>
      </div>

      {/* ログインボタン */}
      <div>
        <LoadingButton
          type="submit"
          isLoading={isLoading}
          disabled={!isValid || isLoading}
          className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          loadingText="ログイン中..."
          ariaLabel="ログインボタン"
          ariaDescribedBy="login-button-help"
        >
          ログイン
        </LoadingButton>
        <div id="login-button-help" className="sr-only">
          入力した情報でログインを実行します
        </div>
      </div>

      {/* サインアップリンク */}
      <div className="text-center">
        <p className="text-sm text-gray-600">
          アカウントをお持ちでない場合は{' '}
          <Link
            to="/signup"
            className={`
              font-medium text-blue-600 hover:text-blue-500 underline
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded
              ${focusVisibleClasses}
            `}
            aria-describedby="signup-help"
          >
            新規登録
          </Link>
        </p>
        <div id="signup-help" className="sr-only">
          新規アカウント作成画面に移動します
        </div>
      </div>

      {/* 高コントラストモード用の追加スタイル */}
      <style>{`
        @media (prefers-contrast: high) {
          input {
            border-width: 3px !important;
          }

          input:focus {
            outline: 3px solid currentColor !important;
            outline-offset: 2px !important;
          }

          .text-gray-600 {
            color: #000000 !important;
          }

          .text-gray-700 {
            color: #000000 !important;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .transition-all {
            transition: none !important;
          }
        }
      `}</style>
    </form>
  );
};

export default LoginForm;
