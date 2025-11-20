import React, { useEffect, useRef } from 'react';
import { useFocusManagement } from '../../hooks/useAccessibility';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

/**
 * 認証画面の共通レイアウトコンポーネント
 *
 * 機能:
 * - 認証画面の統一されたレイアウト提供
 * - レスポンシブデザイン対応
 * - アクセシビリティ対応（フォーカス管理、スクリーンリーダー対応）
 * - 色覚対応とコントラスト比の確保
 *
 * 要件: 1.1, 2.1, 3.1, 4.1, 4.2, 4.3, 4.4, 4.5
 */
const AuthLayout: React.FC<AuthLayoutProps> = ({ children, title, subtitle }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { setupFocusTrap } = useFocusManagement();
  const { announce } = useLiveRegion();

  // ページ読み込み時のアナウンス
  useEffect(() => {
    announce(`${title}ページが読み込まれました。${subtitle || ''}`);
  }, [title, subtitle, announce]);

  // フォーカス管理の設定
  useEffect(() => {
    if (containerRef.current) {
      const cleanup = setupFocusTrap(containerRef.current);
      return cleanup;
    }
  }, [setupFocusTrap]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      {/* スキップリンク */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-blue-600 text-white px-4 py-2 rounded-md z-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        メインコンテンツにスキップ
      </a>

      <div
        ref={containerRef}
        className="max-w-md w-full space-y-8"
        role="main"
        aria-labelledby="page-title"
      >
        {/* ヘッダー部分 */}
        <header className="text-center">
          <h1
            id="page-title"
            className="mt-6 text-center text-3xl font-extrabold text-gray-900"
            tabIndex={-1}
          >
            {title}
          </h1>
          {subtitle && (
            <p className="mt-2 text-center text-sm text-gray-600" aria-describedby="page-title">
              {subtitle}
            </p>
          )}
        </header>

        {/* メインコンテンツ */}
        <main
          id="main-content"
          className="mt-8 space-y-6"
          role="form"
          aria-label={`${title}フォーム`}
        >
          {children}
        </main>

        {/* 高コントラストモード用の追加スタイル */}
        <style>{`
          @media (prefers-contrast: high) {
            .bg-gray-50 {
              background-color: #ffffff;
            }
            .text-gray-600 {
              color: #000000;
            }
            .text-gray-900 {
              color: #000000;
            }
            .border-gray-300 {
              border-color: #000000;
            }
          }

          @media (prefers-reduced-motion: reduce) {
            * {
              animation-duration: 0.01ms !important;
              animation-iteration-count: 1 !important;
              transition-duration: 0.01ms !important;
            }
          }
        `}</style>
      </div>
    </div>
  );
};

export default AuthLayout;
