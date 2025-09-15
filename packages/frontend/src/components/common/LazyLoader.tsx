import React, { Suspense } from 'react';

/**
 * 遅延ローディングのプロパティ
 */
interface LazyLoaderProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * 遅延ローディング用のローディングスピナー
 */
const DefaultFallback: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
      <p className="mt-4 text-gray-600">ページを読み込み中...</p>
    </div>
  </div>
);

/**
 * 遅延ローディングコンポーネント
 *
 * 機能:
 * - React.Suspenseを使用した遅延ローディング
 * - カスタマイズ可能なフォールバック表示
 * - Code Splittingのサポート
 *
 * 要件: 1.2, 2.2, 3.5
 */
export const LazyLoader: React.FC<LazyLoaderProps> = ({
  children,
  fallback = <DefaultFallback />,
}) => {
  return <Suspense fallback={fallback}>{children}</Suspense>;
};

export default LazyLoader;
