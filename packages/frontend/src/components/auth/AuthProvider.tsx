import React from 'react';
import { AuthContext, useAuth as useAuthHook } from '../../hooks/useAuth';

/**
 * 認証プロバイダーのプロパティ
 */
interface AuthProviderProps {
  children: React.ReactNode;
}

/**
 * 認証プロバイダーコンポーネント
 *
 * 機能:
 * - 認証状態をアプリケーション全体で共有
 * - 認証関連の操作を提供
 *
 * 要件: 1.2, 2.2, 3.5
 */
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const auth = useAuthHook();

  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
};

export default AuthProvider;
