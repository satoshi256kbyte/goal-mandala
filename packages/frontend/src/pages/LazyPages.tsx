import { lazy } from 'react';
import { MockTestPage } from './MockTestPage';

/**
 * 遅延ローディング用のページコンポーネント
 */

// 認証関連ページ
export const LazyLoginPage = lazy(() => import('./LoginPage'));
export const LazySignupPage = lazy(() => import('./SignupPage'));
export const LazyPasswordResetPage = lazy(() => import('./PasswordResetPage'));

// Deep Link処理ページ
export const LazyDeepLinkPage = lazy(() => import('./DeepLinkPage'));

// リマインド設定ページ
export const LazyReminderSettingsPage = lazy(() => import('./ReminderSettingsPage'));

// 目標作成関連ページ
export const LazyGoalInputPage = lazy(() =>
  Promise.resolve({
    default: () => <MockTestPage pageType="goal-input" />,
  })
);

export const LazySubGoalEditPage = lazy(() =>
  Promise.resolve({
    default: () => <MockTestPage pageType="subgoals" />,
  })
);

export const LazyActionEditPage = lazy(() =>
  Promise.resolve({
    default: () => <MockTestPage pageType="actions" />,
  })
);

// メインアプリケーションページ
export const LazyDashboardPage = lazy(() =>
  Promise.resolve({
    default: () => (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">ダッシュボード</h1>
          <p className="text-gray-600">ダッシュボードページは現在開発中です。</p>
        </div>
      </div>
    ),
  })
);

export const LazyMandalaPage = lazy(() =>
  Promise.resolve({
    default: () => <MockTestPage pageType="mandala" />,
  })
);

export const LazyProfilePage = lazy(() =>
  Promise.resolve({
    default: () => (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">プロフィール設定</h1>
          <p className="text-gray-600">プロフィール設定ページは現在開発中です。</p>
        </div>
      </div>
    ),
  })
);

// プロフィール設定ページ（初回ログイン時）
export const LazyProfileSetupPage = lazy(() => import('./ProfileSetupPage'));

// マンダラチャート一覧ページ
export const LazyMandalaListPage = lazy(() => import('./MandalaListPage'));

// 404ページ
export const LazyNotFoundPage = lazy(() =>
  Promise.resolve({
    default: () => (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">ページが見つかりません</h2>
          <p className="text-gray-600 mb-8">
            お探しのページは存在しないか、移動された可能性があります。
          </p>
          <a
            href="/"
            className="inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            ホームに戻る
          </a>
        </div>
      </div>
    ),
  })
);

export const LazyProcessingPage = lazy(() =>
  Promise.resolve({
    default: () => (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">AI処理中</h1>
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">目標からサブ目標を生成しています...</p>
        </div>
      </div>
    ),
  })
);
