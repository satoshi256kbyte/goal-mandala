import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AuthLayout from '../components/auth/AuthLayout';
import { PasswordResetForm } from '../components/auth/PasswordResetForm';
import { NewPasswordForm } from '../components/auth/NewPasswordForm';
import { ErrorAlert, SuccessMessage, NetworkStatus } from '../components/common';
import { useAuthForm } from '../hooks/useAuthForm';
import { AuthService } from '../services/auth';
import type { PasswordResetFormData, NewPasswordFormData } from '../utils/validation';

/**
 * パスワードリセットページコンポーネント
 *
 * 機能:
 * - パスワードリセット要求フォームの表示
 * - 新しいパスワード設定フォームの表示（確認コード付き）
 * - パスワードリセット処理の実行
 * - 成功時のログイン画面への遷移
 * - 高度なエラーハンドリング
 * - ネットワーク状態監視
 * - 自動リトライ機能
 *
 * 要件: 3.1, 3.2, 3.3, 3.4, 3.5, 5.1, 5.2, 5.3, 5.4, 5.5
 */
export const PasswordResetPage: React.FC = () => {
  const [success, setSuccess] = useState(false);
  const [resetRequested, setResetRequested] = useState(false);
  const [userEmail, setUserEmail] = useState<string>('');
  const [confirmError, setConfirmError] = useState<string>('');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // パスワードリセット要求用のフック
  const {
    isLoading: isResetLoading,
    successMessage: resetSuccessMessage,
    error: resetError,
    isNetworkError: isResetNetworkError,
    isRetryable: isResetRetryable,
    isOnline,
    resetPassword,
    clearError: clearResetError,
    clearSuccess: clearResetSuccess,
    retry: retryReset,
  } = useAuthForm({
    onSuccess: () => {
      setResetRequested(true);
    },
  });

  // URLパラメータから確認コードとメールアドレスを取得
  const confirmationCode = searchParams.get('code');
  const emailFromUrl = searchParams.get('email');

  // 確認コードがある場合は新しいパスワード設定モード
  const isConfirmationMode = !!confirmationCode && !!emailFromUrl;

  React.useEffect(() => {
    if (emailFromUrl) {
      setUserEmail(emailFromUrl);
      setResetRequested(true);
    }
  }, [emailFromUrl]);

  const handlePasswordReset = async (data: PasswordResetFormData) => {
    setUserEmail(data.email);
    await resetPassword(data.email);
  };

  const handleNewPassword = async (data: NewPasswordFormData) => {
    setConfirmError('');

    try {
      const email = emailFromUrl || userEmail;
      const code = confirmationCode || data.confirmationCode;

      await AuthService.confirmResetPassword(email, code, data.newPassword);

      // パスワード変更成功
      setSuccess(true);

      // 3秒後にログイン画面にリダイレクト
      setTimeout(() => {
        navigate('/login', {
          replace: true,
          state: {
            message: 'パスワードが正常に変更されました。新しいパスワードでログインしてください。',
          },
        });
      }, 3000);
    } catch (err) {
      const authError = AuthService.handleAuthError
        ? AuthService.handleAuthError(err)
        : { message: 'パスワードの変更に失敗しました' };
      setConfirmError(authError.message);
    }
  };

  // 成功画面の表示
  if (success) {
    return (
      <AuthLayout title="パスワード変更完了" subtitle="パスワードが正常に変更されました">
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
                  パスワードが正常に変更されました
                </h3>
                <div className="mt-2 text-sm text-green-700">
                  <p>新しいパスワードでログインしてください。</p>
                </div>
              </div>
            </div>
          </div>
          <p className="text-sm text-gray-600">3秒後にログイン画面に移動します...</p>
        </div>
      </AuthLayout>
    );
  }

  // パスワードリセット要求成功画面
  if (resetRequested && !isConfirmationMode) {
    return (
      <AuthLayout title="パスワードリセット要求完了" subtitle="確認メールを送信しました">
        <div className="text-center space-y-6">
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
                <h3 className="text-sm font-medium text-blue-800">
                  パスワードリセットメールを送信しました
                </h3>
                <div className="mt-2 text-sm text-blue-700">
                  <p>
                    <strong>{userEmail}</strong> にパスワードリセット用のメールを送信しました。
                    メール内のリンクをクリックして、新しいパスワードを設定してください。
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 確認コード手動入力フォーム */}
          <div className="border-t border-gray-200 pt-6">
            <p className="text-sm text-gray-600 mb-4">
              メールが届かない場合は、確認コードを直接入力してください：
            </p>

            {/* 確認エラー表示 */}
            {confirmError && (
              <ErrorAlert
                error={confirmError}
                onClose={() => setConfirmError('')}
                className="mb-4"
                title="パスワード変更エラー"
              />
            )}

            <NewPasswordForm
              onSubmit={handleNewPassword}
              isLoading={false}
              error={undefined}
              showConfirmationCode={true}
              email={userEmail}
            />
          </div>

          {/* 戻るリンク */}
          <div className="text-center">
            <button
              onClick={() => {
                setResetRequested(false);
                clearResetError();
                setConfirmError('');
              }}
              className="text-sm text-blue-600 hover:text-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
            >
              別のメールアドレスでやり直す
            </button>
          </div>
        </div>
      </AuthLayout>
    );
  }

  // 確認コード付きの新しいパスワード設定画面
  if (isConfirmationMode) {
    return (
      <>
        {/* ネットワーク状態表示 */}
        <NetworkStatus />

        <AuthLayout title="新しいパスワードの設定" subtitle="新しいパスワードを入力してください">
          {/* 確認エラー表示 */}
          {confirmError && (
            <ErrorAlert
              error={confirmError}
              onClose={() => setConfirmError('')}
              className="mb-6"
              title="パスワード変更エラー"
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
                    インターネット接続がありません。接続が復旧するまでパスワード変更できません。
                  </p>
                </div>
              </div>
            </div>
          )}

          <NewPasswordForm
            onSubmit={handleNewPassword}
            isLoading={false}
            error={undefined}
            showConfirmationCode={false}
            email={emailFromUrl}
            confirmationCode={confirmationCode}
          />
        </AuthLayout>
      </>
    );
  }

  // パスワードリセット要求フォーム
  return (
    <>
      {/* ネットワーク状態表示 */}
      <NetworkStatus />

      <AuthLayout title="パスワードリセット" subtitle="登録されたメールアドレスを入力してください">
        {/* 成功メッセージ表示 */}
        {resetSuccessMessage && (
          <SuccessMessage
            message={resetSuccessMessage}
            className="mb-6"
            onClose={clearResetSuccess}
          />
        )}

        {/* エラーメッセージ表示 */}
        {resetError && (
          <ErrorAlert
            error={resetError}
            isRetryable={isResetRetryable}
            isNetworkError={isResetNetworkError}
            onRetry={retryReset}
            onClose={clearResetError}
            className="mb-6"
            title={isResetNetworkError ? '接続エラー' : 'パスワードリセットエラー'}
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
                  インターネット接続がありません。接続が復旧するまでパスワードリセットできません。
                </p>
              </div>
            </div>
          </div>
        )}

        <PasswordResetForm
          onSubmit={handlePasswordReset}
          isLoading={isResetLoading}
          error={undefined} // エラーは上で表示するため、フォーム内では表示しない
        />
      </AuthLayout>
    </>
  );
};

export default PasswordResetPage;
