import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import AuthLayout from '../components/auth/AuthLayout';
import { LoginForm } from '../components/auth/LoginForm';
import { ErrorAlert, SuccessMessage } from '../components/common';
import { useAuthForm } from '../hooks/useAuthForm';
import type { LoginFormData } from '../utils/validation';

// TODO: NetworkStatusコンポーネントを適切な場所に移動
const NetworkStatus: React.FC = () => null;

/**
 * ログインページコンポーネント
 *
 * 機能:
 * - ログインフォームの表示
 * - 認証処理の実行
 * - 成功時のリダイレクト処理
 * - 高度なエラーハンドリング
 * - ネットワーク状態監視
 * - 自動リトライ機能
 *
 * 要件: 1.1, 1.2, 1.3, 1.4, 1.5, 5.1, 5.2, 5.3, 5.4, 5.5
 */
export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // 他のページからのメッセージを取得
  const stateMessage = location.state?.message as string;

  // 認証フォームフックを使用
  const {
    isLoading,
    successMessage,
    error,
    isNetworkError,
    isRetryable,
    isOnline,
    signIn,
    clearError,
    clearSuccess,
    retry,
  } = useAuthForm({
    onSuccess: () => {
      // ログイン成功時の遷移先を決定
      const from = (location.state as { from?: Location })?.from?.pathname || '/';
      navigate(from, { replace: true });
    },
  });

  const handleLogin = async (data: LoginFormData) => {
    await signIn(data.email, data.password);
  };

  return (
    <>
      {/* ネットワーク状態表示 */}
      <NetworkStatus />

      <AuthLayout title="ログイン" subtitle="アカウントにサインインしてください">
        {/* 他のページからのメッセージ表示 */}
        {stateMessage && (
          <SuccessMessage message={stateMessage} className="mb-6" autoCloseDelay={5000} />
        )}

        {/* 成功メッセージ表示 */}
        {successMessage && (
          <SuccessMessage
            message={successMessage}
            className="mb-6"
            onClose={clearSuccess}
            autoCloseDelay={3000}
          />
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
            title={isNetworkError ? '接続エラー' : 'ログインエラー'}
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
                  インターネット接続がありません。接続が復旧するまでログインできません。
                </p>
              </div>
            </div>
          </div>
        )}

        <LoginForm
          onSubmit={handleLogin}
          isLoading={isLoading}
          error={undefined} // エラーは上で表示するため、フォーム内では表示しない
        />
      </AuthLayout>
    </>
  );
};

export default LoginPage;
