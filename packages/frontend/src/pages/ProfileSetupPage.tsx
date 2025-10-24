import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthLayout } from '../components/layout/AuthLayout';
import { ProfileSetupForm } from '../components/profile/ProfileSetupForm';
import { useAuth } from '../hooks/useAuth';

/**
 * プロフィール設定ページコンポーネント
 *
 * @description
 * 初回ログイン時にユーザーのプロフィール情報を入力するページ。
 * 認証状態とプロフィール設定状態をチェックし、適切にリダイレクトする。
 *
 * 要件:
 * - 1.1-1.6: ページ基本構造
 * - 8.1-8.5: 認証状態管理
 * - 7.1-7.7: フォーム送信処理
 * - 12.1-12.6: エラーハンドリング
 * - 11.1: コード分割（遅延ローディング）
 */
const ProfileSetupPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  /**
   * 認証状態とプロフィール設定状態をチェック
   * 要件: 8.1, 8.2, 8.3, 8.4
   */
  useEffect(() => {
    if (authLoading) return;

    // 未認証の場合、ログイン画面にリダイレクト
    // 要件: 8.1, 8.2, 8.3
    if (!isAuthenticated) {
      navigate('/login', { replace: true });
      return;
    }

    // プロフィール設定済みの場合、TOP画面にリダイレクト
    // 要件: 8.4
    if (user?.profileSetup) {
      navigate('/', { replace: true });
      return;
    }

    setIsInitialized(true);
  }, [isAuthenticated, user, authLoading, navigate]);

  /**
   * フォーム送信成功時のハンドラー
   * 要件: 7.3, 7.6, 11.2 - コールバックのメモ化
   */
  const handleSuccess = useCallback(() => {
    setError(null);
    setSuccessMessage('プロフィールを保存しました');

    // 1秒後にTOP画面にリダイレクト
    // 要件: 7.3
    setTimeout(() => {
      navigate('/', { replace: true });
    }, 1000);
  }, [navigate]);

  /**
   * フォーム送信エラー時のハンドラー
   * 要件: 7.6, 7.7, 12.1, 12.2, 12.3, 12.4, 11.2 - コールバックのメモ化
   */
  const handleError = useCallback((errorMessage: string) => {
    setError(errorMessage);
    setSuccessMessage(null);
  }, []);

  /**
   * エラーメッセージの自動非表示
   * 要件: 12.5
   */
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  /**
   * 成功メッセージの自動非表示
   */
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  /**
   * ローディング表示
   * 認証チェック中またはリダイレクト前の状態
   * 要件: 10.2 - ローディング状態の通知
   */
  if (authLoading || !isInitialized) {
    return (
      <AuthLayout>
        <div
          className="flex justify-center items-center min-h-[400px]"
          role="status"
          aria-live="polite"
        >
          <div
            className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"
            aria-hidden="true"
          />
          <span className="ml-2 text-gray-600">読み込み中...</span>
        </div>
      </AuthLayout>
    );
  }

  /**
   * 未認証またはプロフィール設定済みの場合は何も表示しない
   * （リダイレクト処理が実行される）
   */
  if (!isAuthenticated || user?.profileSetup) {
    return null;
  }

  /**
   * メインレンダリング
   * 要件: 1.1-1.6 (ページ基本構造)
   */
  return (
    <AuthLayout>
      <div className="max-w-2xl mx-auto">
        {/* ページヘッダー - 要件: 1.2 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">プロフィール設定</h1>
          <p className="mt-2 text-gray-600">
            目標管理をより効果的にするため、あなたの情報を教えてください
          </p>
        </div>

        {/* エラーメッセージ表示 - 要件: 12.1, 12.2, 12.3, 12.4 */}
        {error && (
          <div
            className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md"
            role="alert"
            aria-live="assertive"
          >
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-red-400"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-medium text-red-800">エラーが発生しました</h3>
                <div className="mt-2 text-sm text-red-700">{error}</div>
              </div>
              <button
                type="button"
                onClick={() => setError(null)}
                className="ml-3 flex-shrink-0 inline-flex text-red-400 hover:text-red-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                aria-label="エラーメッセージを閉じる"
              >
                <svg
                  className="h-5 w-5"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* 成功メッセージ表示 - 要件: 10.2 */}
        {successMessage && (
          <div
            className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md"
            role="alert"
            aria-live="polite"
            aria-atomic="true"
          >
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
                <h3 className="text-sm font-medium text-green-800">保存完了</h3>
                <div className="mt-2 text-sm text-green-700">{successMessage}</div>
              </div>
            </div>
          </div>
        )}

        {/* プロフィール設定フォーム - 要件: 7.1-7.7 */}
        <div className="bg-white shadow-sm rounded-lg p-6">
          <ProfileSetupForm onSuccess={handleSuccess} onError={handleError} />
        </div>

        {/* ヘルプテキスト */}
        <div className="mt-6 text-center text-sm text-gray-500">
          この情報は、あなたに最適な目標設定をサポートするために使用されます
        </div>
      </div>
    </AuthLayout>
  );
};

export { ProfileSetupPage };
export default ProfileSetupPage;
