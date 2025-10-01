import { lazy } from 'react';

/**
 * 遅延ローディング用のページコンポーネント
 *
 * 機能:
 * - Code Splittingによるページの遅延ローディング
 * - バンドルサイズの最適化
 * - 初期ロード時間の短縮
 *
 * 要件: 1.2, 2.2, 3.5
 */

// 認証関連ページ
export const LazyLoginPage = lazy(() => import('./LoginPage'));
export const LazySignupPage = lazy(() => import('./SignupPage'));
export const LazyPasswordResetPage = lazy(() => import('./PasswordResetPage'));

// 目標作成関連ページ
export const LazyGoalInputPage = lazy(() => import('./GoalInputPage'));

// メインアプリケーションページ（将来実装予定）
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
    default: () => (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">マンダラチャート</h1>
          <p className="text-gray-600">マンダラチャートページは現在開発中です。</p>
        </div>
      </div>
    ),
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
