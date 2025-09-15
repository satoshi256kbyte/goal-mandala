import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthContext } from '../../hooks/useAuth';

/**
 * 保護されたルートのプロパティ
 */
interface ProtectedRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
}

/**
 * 保護されたルートコンポーネント
 *
 * 機能:
 * - 認証状態をチェック
 * - 未認証の場合はログイン画面にリダイレクト
 * - 認証済みの場合は子コンポーネントを表示
 * - ローディング状態の表示
 *
 * 要件: 1.2, 2.2, 3.5
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  redirectTo = '/login',
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

  // 未認証の場合はログイン画面にリダイレクト
  if (!isAuthenticated) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // 認証済みの場合は子コンポーネントを表示
  return <>{children}</>;
};

export default ProtectedRoute;
