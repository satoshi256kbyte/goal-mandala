import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthContext } from '../../hooks/useAuth';

/**
 * パブリックルートのプロパティ
 */
interface PublicRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
  requiresGuest?: boolean; // ゲスト（未認証）のみアクセス可能
}

/**
 * パブリックルートコンポーネント
 *
 * 機能:
 * - 認証状態をチェック
 * - requiresGuestがtrueの場合、認証済みユーザーをリダイレクト
 * - ローディング状態の表示
 *
 * 要件: 1.2, 2.2, 3.5
 */
export const PublicRoute: React.FC<PublicRouteProps> = ({
  children,
  redirectTo = '/',
  requiresGuest = false,
}) => {
  const { isAuthenticated, isLoading } = useAuthContext();
  const location = useLocation();

  // ローディング中はスピナーを表示
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">認証状態を確認中...</p>
        </div>
      </div>
    );
  }

  // ゲストのみアクセス可能で、認証済みの場合はリダイレクト
  if (requiresGuest && isAuthenticated) {
    // location.stateからリダイレクト先を取得、なければデフォルト
    const from = (location.state as { from?: Location })?.from?.pathname || redirectTo;
    return <Navigate to={from} replace />;
  }

  // 子コンポーネントを表示
  return <>{children}</>;
};

export default PublicRoute;
