import React, { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { passwordResetZodSchema } from '../../utils/validation';
import { ErrorMessage } from '../common/ErrorMessage';
import { LoadingButton } from '../common/LoadingButton';
import {
  useKeyboardNavigation,
  useLiveRegion,
  // useFocusVisible, // 将来の機能拡張用
} from '../../hooks/useAccessibility';

/**
 * パスワードリセットフォームコンポーネントのProps
 */
export interface PasswordResetFormProps {
  /** フォーム送信時のハンドラー */
  onSubmit: (data: PasswordResetFormData) => Promise<void>;
  /** ローディング状態 */
  isLoading?: boolean;
  /** エラーメッセージ */
  error?: string;
}

/**
 * パスワードリセットフォームコンポーネント
 *
 * 機能:
 * - メールアドレス入力フォーム
 * - React Hook Formによるフォーム管理
 * - Zodによるリアルタイムバリデーション
 * - エラー表示機能
 * - セキュリティ考慮したエラーハンドリング
 * - アクセシビリティ対応（キーボードナビゲーション、スクリーンリーダー対応、フォーカス管理）
 * - 色覚対応とコントラスト比の確保
 *
 * 要件: 3.1, 3.2, 3.3, 4.1, 4.2, 4.3, 4.4, 4.5, 5.1
 */
export const PasswordResetForm: React.FC<PasswordResetFormProps> = ({
  onSubmit,
  isLoading = false,
  error,
}) => {
  const formRef = useRef<HTMLFormElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  // const { focusVisibleClasses } = useFocusVisible(); // 将来の機能拡張用
  const { announce } = useLiveRegion();

  const {
    register,
    handleSubmit,
    formState: { errors, isValid, touchedFields },
  } = useForm<PasswordResetFormData>({
    resolver: zodResolver(passwordResetZodSchema),
    mode: 'all', // 全てのイベントでバリデーション
    defaultValues: {
      email: '',
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
      announce(`パスワードリセットエラー: ${error}`, 'assertive');
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
  useKeyboardNavigation(() => {
    // Enterキーでフォーム送信（フォーカスがボタン以外の場合）
    if (isValid && !isLoading) {
      formRef.current?.requestSubmit();
    }
  });

  const handleFormSubmit = async (data: PasswordResetFormData) => {
    try {
      announce('パスワードリセットメール送信処理を開始します', 'polite');
      await onSubmit(data);
      announce('パスワードリセットメールを送信しました', 'polite');
    } catch (err) {
      // エラーは親コンポーネントで処理される
      // エラーログは開発環境でのみ出力
      if (process.env.NODE_ENV === 'development') {
        console.error('Password reset form submission error:', err);
      }
      announce('パスワードリセットメール送信に失敗しました', 'assertive');
    }
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit(handleFormSubmit)} noValidate>
      {/* 全体エラーメッセージ */}
      {error && <ErrorMessage error={error} className="text-center" id="password-reset-error" />}

      {/* 説明文 */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-blue-400"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">パスワードリセットについて</h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>
                登録されたメールアドレスを入力してください。
                パスワードリセット用のリンクをお送りします。
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
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
              aria-describedby={errors.email ? 'email-error' : 'email-help'}
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
              placeholder="登録されたメールアドレスを入力してください"
            />
          </div>
          <div id="email-help" className="text-xs text-gray-600 mt-1">
            アカウント登録時に使用したメールアドレスを入力してください
          </div>
          <ErrorMessage error={errors.email?.message} id="email-error" />
        </div>
      </div>

      {/* パスワードリセット送信ボタン */}
      <div>
        <LoadingButton
          type="submit"
          isLoading={isLoading}
          disabled={!isValid || isLoading}
          className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          loadingText="送信中..."
        >
          パスワードリセットメールを送信
        </LoadingButton>
      </div>

      {/* セキュリティに関する注意事項 */}
      <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
        <div className="text-xs text-gray-600">
          <h4 className="font-medium text-gray-700 mb-2">セキュリティについて</h4>
          <ul className="space-y-1">
            <li>
              • 登録されていないメールアドレスでも、セキュリティ上の理由で成功メッセージを表示します
            </li>
            <li>• パスワードリセットリンクの有効期限は24時間です</li>
            <li>• リンクは一度のみ使用可能です</li>
          </ul>
        </div>
      </div>

      {/* 戻るリンク */}
      <div className="text-center space-y-2">
        <Link
          to="/login"
          className="text-sm text-blue-600 hover:text-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
        >
          ログイン画面に戻る
        </Link>
        <div className="text-sm text-gray-600">
          アカウントをお持ちでない場合は{' '}
          <Link
            to="/signup"
            className="font-medium text-blue-600 hover:text-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
          >
            新規登録
          </Link>
        </div>
      </div>
    </form>
  );
};

export default PasswordResetForm;
