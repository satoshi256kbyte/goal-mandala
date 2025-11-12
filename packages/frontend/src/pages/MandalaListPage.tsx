import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { MandalaListContainer } from '../components/mandala-list/MandalaListContainer';
import { UserMenu } from '../components/mandala-list/UserMenu';

/**
 * MandalaListPage - マンダラチャート一覧画面（TOP画面）
 *
 * @description
 * ユーザーが作成した全てのマンダラチャートを一覧表示し、
 * 検索・フィルター・ソート機能を提供する画面。
 *
 * 要件:
 * - 1.1-1.8: マンダラチャート一覧表示
 * - 12.1-12.4: 認証状態管理
 * - 3.1-3.4: マンダラカード選択機能
 * - 4.1-4.4: 新規作成機能
 * - 10.1-10.7: ユーザーメニュー機能
 * - 11.1-11.7: データ取得機能
 * - 16.1-16.6: エラーハンドリング
 */
const MandalaListPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: authLoading, signOut } = useAuth();
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * 認証状態とプロフィール設定状態をチェック
   * 要件: 12.1, 12.2, 12.3, 12.4
   */
  useEffect(() => {
    if (authLoading) return;

    // 未認証の場合、ログイン画面にリダイレクト
    // 要件: 12.1, 12.2, 12.3
    if (!isAuthenticated) {
      navigate('/login', { replace: true });
      return;
    }

    // プロフィール未設定の場合、プロフィール入力画面にリダイレクト
    // 要件: 12.4
    if (user && !user.profileSetup) {
      navigate('/profile/setup', { replace: true });
      return;
    }

    setIsInitialized(true);
  }, [isAuthenticated, user, authLoading, navigate]);

  /**
   * 設定画面への遷移
   * 要件: 10.6
   */
  const handleSettingsClick = () => {
    navigate('/settings');
  };

  /**
   * ログアウト処理
   * 要件: 10.7
   */
  const handleLogoutClick = async () => {
    try {
      await signOut();
      navigate('/login', { replace: true });
    } catch (err) {
      console.error('Logout failed:', err);
      setError('ログアウトに失敗しました');
    }
  };

  /**
   * エラーメッセージの自動非表示
   * 要件: 16.6
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
   * ローディング表示
   * 認証チェック中またはリダイレクト前の状態
   * 要件: 11.6
   */
  if (authLoading || !isInitialized) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div
          className="flex justify-center items-center min-h-screen"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <div
            className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"
            aria-hidden="true"
          />
          <span className="ml-3 text-gray-600">読み込み中...</span>
        </div>
      </div>
    );
  }

  /**
   * 未認証またはプロフィール未設定の場合は何も表示しない
   * （リダイレクト処理が実行される）
   */
  if (!isAuthenticated || (user && !user.profileSetup)) {
    return null;
  }

  /**
   * メインレンダリング
   * 要件: 1.1-1.8 (ページ基本構造)
   */
  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー - 要件: 1.2, 10.1-10.7 */}
      <header className="bg-white shadow-sm border-b border-gray-200" role="banner">
        <nav
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between"
          aria-label="メインナビゲーション"
        >
          {/* ロゴ・タイトル */}
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-gray-900">マンダラチャート一覧</h1>
          </div>

          {/* ユーザーメニュー */}
          {user && (
            <UserMenu
              userName={user.name}
              userEmail={user.email}
              onSettingsClick={handleSettingsClick}
              onLogoutClick={handleLogoutClick}
            />
          )}
        </nav>
      </header>

      {/* エラーメッセージ表示 - 要件: 16.1-16.6 */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div
            role="alert"
            aria-live="assertive"
            className="p-4 bg-red-50 border border-red-200 rounded-lg"
          >
            <div className="flex items-start">
              <svg
                className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800">{error}</p>
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
        </div>
      )}

      {/* メインコンテンツ - 要件: 1.1-1.8 */}
      <main>
        <MandalaListContainer />
      </main>
    </div>
  );
};

export { MandalaListPage };
export default MandalaListPage;
