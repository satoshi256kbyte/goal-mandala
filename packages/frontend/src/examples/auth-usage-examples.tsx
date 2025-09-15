/**
 * 認証状態管理の使用方法サンプル
 */

import React from 'react';
import { useAuth, useAuthState, useAuthUser, useAuthActions } from '../hooks/useAuth';
import { useAuthStateMonitorContext } from '../components/auth/AuthStateMonitorProvider';

// 基本的な認証フォーム
export const BasicAuthForm: React.FC = () => {
  const { signIn, isLoading, error } = useAuth();

  const handleLogin = async (email: string, password: string) => {
    try {
      await signIn(email, password);
    } catch (err) {
      console.error('ログインエラー:', err);
    }
  };

  return (
    <div>
      {error && <div className="error">{error.message}</div>}
      <button onClick={() => handleLogin('user@example.com', 'password')} disabled={isLoading}>
        {isLoading ? 'ログイン中...' : 'ログイン'}
      </button>
    </div>
  );
};

// 最適化された認証状態表示
export const OptimizedAuthStatus: React.FC = () => {
  // 認証状態のみを監視（ユーザー情報変更時は再レンダリングされない）
  const { isAuthenticated, isLoading } = useAuthState();

  if (isLoading) return <div>読み込み中...</div>;

  return <div>ステータス: {isAuthenticated ? '認証済み' : '未認証'}</div>;
};

// ユーザー情報表示
export const UserProfile: React.FC = () => {
  // ユーザー情報のみを監視（認証状態変更時は再レンダリングされない）
  const { user } = useAuthUser();

  if (!user) return null;

  return (
    <div>
      <h2>プロフィール</h2>
      <p>名前: {user.name}</p>
      <p>メール: {user.email}</p>
    </div>
  );
};

// 認証アクション
export const AuthActions: React.FC = () => {
  // アクションのみを取得（状態変更時は再レンダリングされない）
  const { signOut, refreshToken } = useAuthActions();

  return (
    <div>
      <button onClick={signOut}>ログアウト</button>
      <button onClick={refreshToken}>トークン更新</button>
    </div>
  );
};

// 監視統計表示
export const MonitoringStats: React.FC = () => {
  const { isMonitoring, listenerCount, errorHistory, monitoringStats } =
    useAuthStateMonitorContext();

  return (
    <div>
      <h3>監視統計</h3>
      <p>監視中: {isMonitoring ? 'はい' : 'いいえ'}</p>
      <p>リスナー数: {listenerCount}</p>
      <p>エラー履歴: {errorHistory.length}件</p>
      <p>稼働時間: {monitoringStats.uptime}秒</p>
      <p>状態変更回数: {monitoringStats.totalStateChanges}回</p>
    </div>
  );
};

// 条件付き認証チェック
export const ConditionalAuth: React.FC<{ requireAuth: boolean }> = ({ requireAuth }) => {
  const authData = useConditionalAuth(requireAuth);

  if (requireAuth && !authData.isAuthenticated) {
    return <div>認証が必要です</div>;
  }

  return <div>{authData.user ? `こんにちは、${authData.user.name}さん` : 'ゲストユーザー'}</div>;
};

// 認証が必要なコンポーネント
export const ProtectedComponent: React.FC = () => {
  const { isAuthenticated, user, signOut } = useRequireAuth();

  if (!isAuthenticated) {
    return <div>このコンポーネントは認証が必要です</div>;
  }

  return (
    <div>
      <h2>保護されたコンテンツ</h2>
      <p>ようこそ、{user?.name}さん</p>
      <button onClick={signOut}>ログアウト</button>
    </div>
  );
};

// エラーハンドリング例
export const ErrorHandlingExample: React.FC = () => {
  const { error, clearError } = useAuth();

  React.useEffect(() => {
    if (error) {
      // エラーの種類に応じた処理
      switch (error.code) {
        case 'TOKEN_EXPIRED':
          console.log('トークンが期限切れです。再ログインしてください。');
          break;
        case 'NETWORK_ERROR':
          console.log('ネットワークエラーが発生しました。');
          break;
        default:
          console.log('認証エラーが発生しました:', error.message);
      }

      // 5秒後にエラーをクリア
      const timer = setTimeout(clearError, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, clearError]);

  return error ? (
    <div className="error-banner">
      {error.message}
      <button onClick={clearError}>×</button>
    </div>
  ) : null;
};

// パフォーマンス監視例
export const PerformanceMonitor: React.FC = () => {
  const { renderCount, stateChangeFrequency } = useAuthPerformance();

  return (
    <div>
      <h3>パフォーマンス統計</h3>
      <p>レンダリング回数: {renderCount}</p>
      <p>状態変更頻度: {stateChangeFrequency.toFixed(2)} 回/秒</p>
    </div>
  );
};
