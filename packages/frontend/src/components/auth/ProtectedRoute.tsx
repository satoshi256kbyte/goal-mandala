import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthContext } from '../../hooks/useAuth';

/**
 * 保護されたルートのプロパティ
 */
interface ProtectedRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
  requiresProfile?: boolean;
  fallback?: React.ReactNode;
  onUnauthorized?: () => void;
}

/**
 * 保護されたルートコンポーネント
 *
 * 機能:
 * - 認証状態をチェック
 * - 未認証の場合はログイン画面にリダイレクト
 * - 認証済みの場合は子コンポーネントを表示
 * - ローディング状態の表示
 * - プロフィール完了チェック機能
 * - カスタムフォールバック機能
 * - 未認証時のコールバック機能
 *
 * 要件: 3.1, 3.2, 3.4, 3.5
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  redirectTo = '/login',
  requiresProfile = false,
  fallback,
  onUnauthorized,
}) => {
  const { isAuthenticated, isLoading, user } = useAuthContext();
  const location = useLocation();

  // ローディング中はスピナーまたはカスタムフォールバックを表示
  // 要件 3.4: 認証状態の確認中に適切なローディング画面が表示される
  if (isLoading) {
    if (fallback) {
      return <>{fallback}</>;
    }

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
  // 要件 3.1: 未認証ユーザーが保護されたページにアクセスした時にログイン画面にリダイレクトされる
  if (!isAuthenticated) {
    // 未認証時のコールバックを実行
    if (onUnauthorized) {
      try {
        onUnauthorized();
      } catch (error) {
        console.error('未認証時コールバックでエラーが発生しました:', error);
      }
    }

    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // プロフィール完了チェック
  // 要件 3.2: プロフィール完了チェック機能
  if (requiresProfile && user && typeof user === 'object' && 'profileComplete' in user) {
    const profileComplete = user.profileComplete as boolean | undefined;

    if (!profileComplete) {
      // プロフィールが未完了の場合はプロフィール設定画面にリダイレクト
      return <Navigate to="/profile/setup" state={{ from: location }} replace />;
    }
  }

  // 認証済みかつ必要に応じてプロフィール完了済みの場合は子コンポーネントを表示
  // 要件 3.5: ProtectedRouteコンポーネントが使用されている時に認証状態に応じて適切なコンポーネントが表示される
  return <>{children}</>;
};

export default ProtectedRoute;
