import React, { useEffect, useState } from 'react';
import { useResponsive } from '../../hooks/useResponsive';

interface OrientationLayoutProps {
  children: React.ReactNode;
  portraitLayout?: React.ReactNode;
  landscapeLayout?: React.ReactNode;
  className?: string;
  showOrientationPrompt?: boolean;
  preferredOrientation?: 'portrait' | 'landscape' | 'any';
}

/**
 * 画面向き対応レイアウトコンポーネント
 */
export function OrientationLayout({
  children,
  portraitLayout,
  landscapeLayout,
  className = '',
  showOrientationPrompt = false,
  preferredOrientation = 'any',
}: OrientationLayoutProps) {
  const { isPortrait, isLandscape } = useResponsive();
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    if (showOrientationPrompt && preferredOrientation !== 'any') {
      const shouldShowPrompt =
        (preferredOrientation === 'portrait' && isLandscape) ||
        (preferredOrientation === 'landscape' && isPortrait);

      setShowPrompt(shouldShowPrompt);
    }
  }, [isPortrait, isLandscape, preferredOrientation, showOrientationPrompt]);

  // 向き変更プロンプト
  if (showPrompt) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
        <div className="text-center max-w-md">
          <div className="mb-4">
            {preferredOrientation === 'portrait' ? (
              <svg
                className="w-16 h-16 mx-auto text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <rect x="6" y="2" width="12" height="20" rx="2" ry="2" strokeWidth={2} />
                <line x1="12" y1="18" x2="12.01" y2="18" strokeWidth={2} />
              </svg>
            ) : (
              <svg
                className="w-16 h-16 mx-auto text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <rect x="2" y="6" width="20" height="12" rx="2" ry="2" strokeWidth={2} />
                <line x1="18" y1="12" x2="18.01" y2="12" strokeWidth={2} />
              </svg>
            )}
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            画面を{preferredOrientation === 'portrait' ? '縦向き' : '横向き'}にしてください
          </h2>
          <p className="text-gray-600 mb-4">
            この機能は{preferredOrientation === 'portrait' ? '縦向き' : '横向き'}
            での使用に最適化されています。
          </p>
          <button
            onClick={() => setShowPrompt(false)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            このまま続行
          </button>
        </div>
      </div>
    );
  }

  // 向きに応じたレイアウトを選択
  if (isPortrait && portraitLayout) {
    return <div className={className}>{portraitLayout}</div>;
  }

  if (isLandscape && landscapeLayout) {
    return <div className={className}>{landscapeLayout}</div>;
  }

  return <div className={className}>{children}</div>;
}

/**
 * 縦向き専用コンポーネント
 */
interface PortraitOnlyProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  className?: string;
}

export function PortraitOnly({ children, fallback, className = '' }: PortraitOnlyProps) {
  const { isPortrait } = useResponsive();

  if (!isPortrait) {
    return fallback ? <div className={className}>{fallback}</div> : null;
  }

  return <div className={className}>{children}</div>;
}

/**
 * 横向き専用コンポーネント
 */
interface LandscapeOnlyProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  className?: string;
}

export function LandscapeOnly({ children, fallback, className = '' }: LandscapeOnlyProps) {
  const { isLandscape } = useResponsive();

  if (!isLandscape) {
    return fallback ? <div className={className}>{fallback}</div> : null;
  }

  return <div className={className}>{children}</div>;
}

/**
 * 向き変更検出コンポーネント
 */
interface OrientationDetectorProps {
  onOrientationChange?: (orientation: 'portrait' | 'landscape') => void;
  children: React.ReactNode;
}

export function OrientationDetector({ onOrientationChange, children }: OrientationDetectorProps) {
  const { isPortrait, isLandscape } = useResponsive();

  useEffect(() => {
    if (onOrientationChange) {
      onOrientationChange(isPortrait ? 'portrait' : 'landscape');
    }
  }, [isPortrait, isLandscape, onOrientationChange]);

  return <>{children}</>;
}

/**
 * レスポンシブグリッドコンポーネント
 */
interface ResponsiveGridProps {
  children: React.ReactNode;
  portraitColumns?: number;
  landscapeColumns?: number;
  gap?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function ResponsiveGrid({
  children,
  portraitColumns = 1,
  landscapeColumns = 2,
  gap = 'md',
  className = '',
}: ResponsiveGridProps) {
  const { isPortrait } = useResponsive();

  const columns = isPortrait ? portraitColumns : landscapeColumns;

  const gapClasses = {
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6',
  };

  const gridColsClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
    5: 'grid-cols-5',
    6: 'grid-cols-6',
  };

  return (
    <div
      className={`
      grid ${gridColsClasses[columns as keyof typeof gridColsClasses] || 'grid-cols-1'}
      ${gapClasses[gap]}
      ${className}
    `}
    >
      {children}
    </div>
  );
}

/**
 * 向き対応ナビゲーションコンポーネント
 */
interface OrientationNavProps {
  items: Array<{
    id: string;
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
  }>;
  activeId?: string;
  className?: string;
}

export function OrientationNav({ items, activeId, className = '' }: OrientationNavProps) {
  const { isPortrait, isMobile } = useResponsive();

  // モバイル縦向きの場合は下部タブ
  if (isMobile && isPortrait) {
    return (
      <nav
        className={`
        fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200
        safe-bottom z-50 ${className}
      `}
      >
        <div className="flex">
          {items.map(item => (
            <button
              key={item.id}
              onClick={item.onClick}
              className={`
                flex-1 flex flex-col items-center justify-center py-2 px-1
                transition-colors duration-200 touch-target
                ${
                  activeId === item.id
                    ? 'text-blue-600 bg-blue-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }
              `}
            >
              {item.icon && <div className="w-6 h-6 mb-1">{item.icon}</div>}
              <span className="text-xs font-medium truncate">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    );
  }

  // その他の場合は横並びタブ
  return (
    <nav
      className={`
      flex bg-white border-b border-gray-200 overflow-x-auto
      ${className}
    `}
    >
      {items.map(item => (
        <button
          key={item.id}
          onClick={item.onClick}
          className={`
            flex items-center space-x-2 px-4 py-3 whitespace-nowrap
            transition-colors duration-200 border-b-2
            ${
              activeId === item.id
                ? 'text-blue-600 border-blue-600 bg-blue-50'
                : 'text-gray-600 border-transparent hover:text-gray-900 hover:border-gray-300'
            }
          `}
        >
          {item.icon && <div className="w-5 h-5">{item.icon}</div>}
          <span className="font-medium">{item.label}</span>
        </button>
      ))}
    </nav>
  );
}

/**
 * 向き対応コンテンツコンテナ
 */
interface OrientationContentProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function OrientationContent({
  children,
  className = '',
  padding = 'md',
}: OrientationContentProps) {
  const { isPortrait, isMobile } = useResponsive();

  const paddingClasses = {
    none: '',
    sm: isPortrait ? 'p-3' : 'p-4',
    md: isPortrait ? 'p-4' : 'p-6',
    lg: isPortrait ? 'p-6' : 'p-8',
  };

  return (
    <div
      className={`
      ${paddingClasses[padding]}
      ${isMobile && isPortrait ? 'pb-20' : ''} // 下部ナビゲーション分のスペース
      ${className}
    `}
    >
      {children}
    </div>
  );
}
