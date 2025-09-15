import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthLayout from '../components/auth/AuthLayout';
import { SignupForm } from '../components/auth/SignupForm';
import { ErrorAlert, SuccessMessage, NetworkStatus } from '../components/common';
import { useAuthForm } from '../hooks/useAuthForm';
import type { SignupFormData } from '../utils/validation';

/**
 * サインアップページコンポーネント
 *
 * 機能:
 * - サインアップフォームの表示
 * - ユーザー登録処理の実行
 * - 成功時の確認画面への遷移
 * - 高度なエラーハンドリング
 * - ネットワーク状態監視
 * - 自動リトライ機能
 *
 * 要件: 2.1, 2.2, 2.3, 2.4, 2.5, 5.1, 5.2, 5.3, 5.4, 5.5
 */
export const SignupPage: React.FC = () => {
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  // 認証フォームフックを使用
  const {
    isLoading,
    successMessage,
    error,
    isNetworkError,
    isRetryable,
    isOnline,
    signUp,
    clearError,
    clearSuccess,
    retry,
  } = useAuthForm({
    onSuccess: () => {
      // サインアップ成功時は成功メッセージを表示
      setSuccess(true);

      // 3秒後にログイン画面にリダイレクト
      setTimeout(() => {
        navigate('/login', {
          replace: true,
          state: {
            message: 'アカウントが作成されました。確認メールをご確認ください。',
          },
        });
      }, 3000);
    },
  });

  const handleSignup = async (data: SignupFormData) => {
    await signUp(data.email, data.password, data.name);
  };

  // 成功画面の表示
  if (success) {
    return (
      <AuthLayout title="アカウント作成完了" subtitle="確認メールを送信しました">
        <div className="text-center space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-green-400"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">
                  アカウントが正常に作成されました
                </h3>
                <div className="mt-2 text-sm text-green-700">
                  <p>
                    登録されたメールアドレスに確認メールを送信しました。
                    メール内のリンクをクリックしてアカウントを有効化してください。
                  </p>
                </div>
              </div>
            </div>
          </div>
          <p className="text-sm text-gray-600">3秒後にログイン画面に移動します...</p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <>
      {/* ネットワーク状態表示 */}
      <NetworkStatus />

      <AuthLayout title="新規登録" subtitle="アカウントを作成してください">
        {/* 成功メッセージ表示 */}
        {successMessage && (
          <SuccessMessage message={successMessage} className="mb-6" onClose={clearSuccess} />
        )}

        {/* エラーメッセージ表示 */}
        {error && (
          <ErrorAlert
            error={error}
            isRetryable={isRetryable}
            isNetworkError={isNetworkError}
            onRetry={retry}
            onClose={clearError}
            className="mb-6"
            title={isNetworkError ? '接続エラー' : '登録エラー'}
          />
        )}

        {/* オフライン時の警告 */}
        {!isOnline && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-yellow-400"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  インターネット接続がありません。接続が復旧するまで新規登録できません。
                </p>
              </div>
            </div>
          </div>
        )}

        <SignupForm
          onSubmit={handleSignup}
          isLoading={isLoading}
          error={undefined} // エラーは上で表示するため、フォーム内では表示しない
        />
      </AuthLayout>
    </>
  );
};

export default SignupPage;
