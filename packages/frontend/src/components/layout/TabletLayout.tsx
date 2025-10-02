import React, { useState } from 'react';
import { useResponsive } from '../../hooks/useResponsive';

interface TabletLayoutProps {
  children: React.ReactNode;
  sidebar?: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  sidebarWidth?: 'narrow' | 'medium' | 'wide';
  splitView?: boolean;
  collapsibleSidebar?: boolean;
}

/**
 * タブレット専用レイアウトコンポーネント
 */
export function TabletLayout({
  children,
  sidebar,
  header,
  footer,
  className = '',
  sidebarWidth = 'medium',
  splitView: _splitView = false,
  collapsibleSidebar = true,
}: TabletLayoutProps) {
  const { isTablet, isPortrait } = useResponsive();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // タブレット以外では通常のレイアウトを使用
  if (!isTablet) {
    return <div className={className}>{children}</div>;
  }

  const sidebarWidthClasses = {
    narrow: 'w-64',
    medium: 'w-80',
    wide: 'w-96',
  };

  const collapsedSidebarWidth = 'w-16';

  // 縦向きの場合はサイドバーを下部に配置
  if (isPortrait && sidebar) {
    return (
      <div className={`tablet-layout-portrait flex flex-col h-screen ${className}`}>
        {/* ヘッダー */}
        {header && (
          <header className="tablet-header flex-shrink-0 bg-white border-b border-gray-200 sticky top-0 z-50">
            {header}
          </header>
        )}

        {/* メインコンテンツ */}
        <main className="tablet-main flex-1 overflow-auto">
          <div className="p-6">{children}</div>
        </main>

        {/* 下部サイドバー */}
        <aside className="tablet-sidebar-bottom flex-shrink-0 bg-gray-50 border-t border-gray-200 max-h-64 overflow-auto">
          <div className="p-4">{sidebar}</div>
        </aside>

        {/* フッター */}
        {footer && (
          <footer className="tablet-footer flex-shrink-0 bg-white border-t border-gray-200">
            {footer}
          </footer>
        )}
      </div>
    );
  }

  // 横向きの場合はサイドバーを左側に配置
  return (
    <div className={`tablet-layout-landscape flex h-screen ${className}`}>
      {/* サイドバー */}
      {sidebar && (
        <aside
          className={`
          tablet-sidebar flex-shrink-0 bg-gray-50 border-r border-gray-200 overflow-auto
          transition-all duration-300 ease-in-out
          ${sidebarCollapsed ? collapsedSidebarWidth : sidebarWidthClasses[sidebarWidth]}
        `}
        >
          {/* サイドバー折りたたみボタン */}
          {collapsibleSidebar && (
            <div className="p-2 border-b border-gray-200">
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="w-full p-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                aria-label={sidebarCollapsed ? 'サイドバーを展開' : 'サイドバーを折りたたむ'}
              >
                <svg
                  className={`w-5 h-5 mx-auto transition-transform ${sidebarCollapsed ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
            </div>
          )}

          {/* サイドバーコンテンツ */}
          <div className={`p-4 ${sidebarCollapsed ? 'hidden' : ''}`}>{sidebar}</div>
        </aside>
      )}

      {/* メインエリア */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* ヘッダー */}
        {header && (
          <header className="tablet-header flex-shrink-0 bg-white border-b border-gray-200 sticky top-0 z-50">
            {header}
          </header>
        )}

        {/* メインコンテンツ */}
        <main className="tablet-main flex-1 overflow-auto">
          <div className="p-6">{children}</div>
        </main>

        {/* フッター */}
        {footer && (
          <footer className="tablet-footer flex-shrink-0 bg-white border-t border-gray-200">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}

/**
 * タブレット用ヘッダーコンポーネント
 */
interface TabletHeaderProps {
  title: string;
  leftAction?: React.ReactNode;
  rightActions?: React.ReactNode[];
  subtitle?: string;
  breadcrumbs?: Array<{ label: string; href?: string }>;
}

export function TabletHeader({
  title,
  leftAction,
  rightActions = [],
  subtitle,
  breadcrumbs,
}: TabletHeaderProps) {
  return (
    <div className="px-6 py-4">
      {/* パンくずリスト */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="mb-2" aria-label="パンくずリスト">
          <ol className="flex items-center space-x-2 text-sm text-gray-600">
            {breadcrumbs.map((crumb, index) => (
              <li key={index} className="flex items-center">
                {index > 0 && (
                  <svg
                    className="w-4 h-4 mx-2 text-gray-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
                {crumb.href ? (
                  <a href={crumb.href} className="hover:text-gray-900 transition-colors">
                    {crumb.label}
                  </a>
                ) : (
                  <span className="text-gray-900 font-medium">{crumb.label}</span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}

      {/* メインヘッダー */}
      <div className="flex items-center justify-between">
        {/* 左側 */}
        <div className="flex items-center space-x-4">
          {leftAction}
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
            {subtitle && <p className="text-sm text-gray-600 mt-1">{subtitle}</p>}
          </div>
        </div>

        {/* 右側のアクション */}
        {rightActions.length > 0 && (
          <div className="flex items-center space-x-3">
            {rightActions.map((action, index) => (
              <div key={index}>{action}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * タブレット用分割ビューコンポーネント
 */
interface TabletSplitViewProps {
  leftPanel: React.ReactNode;
  rightPanel: React.ReactNode;
  leftPanelWidth?: 'narrow' | 'medium' | 'wide' | 'equal';
  className?: string;
  resizable?: boolean;
}

export function TabletSplitView({
  leftPanel,
  rightPanel,
  leftPanelWidth = 'medium',
  className = '',
  resizable = false,
}: TabletSplitViewProps) {
  const [leftWidth, setLeftWidth] = useState(50);

  const widthClasses = {
    narrow: 'w-1/3',
    medium: 'w-2/5',
    wide: 'w-1/2',
    equal: 'w-1/2',
  };

  const rightWidthClasses = {
    narrow: 'w-2/3',
    medium: 'w-3/5',
    wide: 'w-1/2',
    equal: 'w-1/2',
  };

  if (resizable) {
    return (
      <div className={`flex h-full ${className}`}>
        {/* 左パネル */}
        <div
          className="flex-shrink-0 border-r border-gray-200 overflow-auto"
          style={{ width: `${leftWidth}%` }}
        >
          {leftPanel}
        </div>

        {/* リサイザー */}
        <button
          className="w-1 bg-gray-200 cursor-col-resize hover:bg-gray-300 transition-colors border-0 p-0"
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              // リサイザーのキーボード操作は将来実装予定
            }
          }}
          onMouseDown={e => {
            const startX = e.clientX;
            const startWidth = leftWidth;

            const handleMouseMove = (e: MouseEvent) => {
              const deltaX = e.clientX - startX;
              const containerWidth = (e.target as HTMLElement).parentElement?.offsetWidth || 1;
              const deltaPercent = (deltaX / containerWidth) * 100;
              const newWidth = Math.max(20, Math.min(80, startWidth + deltaPercent));
              setLeftWidth(newWidth);
            };

            const handleMouseUp = () => {
              document.removeEventListener('mousemove', handleMouseMove);
              document.removeEventListener('mouseup', handleMouseUp);
            };

            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
          }}
        ></button>

        {/* 右パネル */}
        <div className="flex-1 overflow-auto">{rightPanel}</div>
      </div>
    );
  }

  return (
    <div className={`flex h-full ${className}`}>
      {/* 左パネル */}
      <div className={`${widthClasses[leftPanelWidth]} border-r border-gray-200 overflow-auto`}>
        {leftPanel}
      </div>

      {/* 右パネル */}
      <div className={`${rightWidthClasses[leftPanelWidth]} overflow-auto`}>{rightPanel}</div>
    </div>
  );
}

/**
 * タブレット用カードグリッドコンポーネント
 */
interface TabletCardGridProps {
  children: React.ReactNode;
  columns?: 2 | 3 | 4;
  gap?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function TabletCardGrid({
  children,
  columns = 2,
  gap = 'md',
  className = '',
}: TabletCardGridProps) {
  const { isPortrait } = useResponsive();

  const columnClasses = {
    2: 'grid-cols-2',
    3: isPortrait ? 'grid-cols-2' : 'grid-cols-3',
    4: isPortrait ? 'grid-cols-2' : 'grid-cols-4',
  };

  const gapClasses = {
    sm: 'gap-3',
    md: 'gap-4',
    lg: 'gap-6',
  };

  return (
    <div
      className={`
      grid ${columnClasses[columns]} ${gapClasses[gap]}
      ${className}
    `}
    >
      {children}
    </div>
  );
}

/**
 * タブレット用ツールバーコンポーネント
 */
interface TabletToolbarProps {
  children: React.ReactNode;
  position?: 'top' | 'bottom';
  className?: string;
}

export function TabletToolbar({ children, position = 'top', className = '' }: TabletToolbarProps) {
  const positionClasses = {
    top: 'border-b',
    bottom: 'border-t',
  };

  return (
    <div
      className={`
      flex items-center justify-between px-6 py-3
      bg-white ${positionClasses[position]} border-gray-200
      ${className}
    `}
    >
      {children}
    </div>
  );
}
