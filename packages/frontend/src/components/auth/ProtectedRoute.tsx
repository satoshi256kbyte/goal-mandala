import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireProfileSetup?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireAuth = true,
  requireProfileSetup = true,
}) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        <span className="ml-2 text-gray-600">認証状況を確認中...</span>
      </div>
    );
  }

  // Redirect to login if authentication is required but user is not authenticated
  if (requireAuth && !isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Redirect to profile setup if profile setup is required but not completed
  if (requireProfileSetup && isAuthenticated && user && !user.profileSetup) {
    return <Navigate to="/profile/setup" replace />;
  }

  // Redirect to home if user tries to access profile setup but already completed
  if (location.pathname === '/profile/setup' && isAuthenticated && user?.profileSetup) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
