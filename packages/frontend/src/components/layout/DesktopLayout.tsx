import React, { useState, useRef, useEffect } from 'react';
import { useResponsive } from '../../hooks/useResponsive';

interface DesktopLayoutProps {
  children: React.ReactNode;
  sidebar?: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  toolbar?: React.ReactNode;
  className?: string;
  sidebarWidth?: number;
  sidebarCollapsible?: boolean;
  sidebarPosition?: 'left' | 'right';
  maxWidth?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
}

/**
 * デスクトップ専用レイアウトコンポーネント
 */
export function DesktopLayout({
  children,
  sidebar,
  header,
  footer,
  toolbar,
  className = '',
  sidebarWidth = 280,
  sidebarCollapsible = true,
  sidebarPosition = 'left',
  maxWidth = 'full',
}: DesktopLayoutProps) {
  const { isDesktop } = useResponsive();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // デスクトップ以外では通常のレイアウトを使用
  if (!isDesktop) {
    return <div className={className}>{children}</div>;
  }

  const collapsedWidth = 64;
  const actualSidebarWidth = sidebarCollapsed ? collapsedWidth : sidebarWidth;

  const maxWidthClasses = {
    none: '',
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    full: 'max-w-full',
  };

  return (
    <div className={`desktop-layout flex h-screen bg-gray-50 ${className}`}>
      {/* 左サイドバー */}
      {sidebar && sidebarPosition === 'left' && (
        <aside
          className="desktop-sidebar flex-shrink-0 bg-white border-r border-gray-200 overflow-hidden transition-all duration-300 ease-in-out"
          style={{ width: `${actualSidebarWidth}px` }}
        >
          {/* サイドバーヘッダー */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            {!sidebarCollapsed && <h2 className="text-lg font-semibold text-gray-900">メニュー</h2>}
            {sidebarCollapsible && (
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                title={sidebarCollapsed ? 'サイドバーを展開' : 'サイドバーを折りたたむ'}
              >
                <svg
                  className={`w-5 h-5 transition-transform ${sidebarCollapsed ? 'rotate-180' : ''}`}
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
            )}
          </div>

          {/* サイドバーコンテンツ */}
          <div className="flex-1 overflow-auto">
            {sidebarCollapsed ? (
              <div className="p-2">
                {/* 折りたたみ時のアイコンのみ表示 */}
                {React.isValidElement(sidebar) &&
                  React.cloneElement(sidebar as React.ReactElement, { collapsed: true })}
              </div>
            ) : (
              <div className="p-4">{sidebar}</div>
            )}
          </div>
        </aside>
      )}

      {/* メインエリア */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* ヘッダー */}
        {header && (
          <header className="desktop-header flex-shrink-0 bg-white border-b border-gray-200 shadow-sm">
            {header}
          </header>
        )}

        {/* ツールバー */}
        {toolbar && (
          <div className="desktop-toolbar flex-shrink-0 bg-gray-50 border-b border-gray-200 px-6 py-3">
            {toolbar}
          </div>
        )}

        {/* メインコンテンツ */}
        <main className="desktop-main flex-1 overflow-auto">
          <div
            className={`
            mx-auto px-6 py-8
            ${maxWidthClasses[maxWidth]}
          `}
          >
            {children}
          </div>
        </main>

        {/* フッター */}
        {footer && (
          <footer className="desktop-footer flex-shrink-0 bg-white border-t border-gray-200">
            {footer}
          </footer>
        )}
      </div>

      {/* 右サイドバー */}
      {sidebar && sidebarPosition === 'right' && (
        <aside
          className="desktop-sidebar flex-shrink-0 bg-white border-l border-gray-200 overflow-hidden transition-all duration-300 ease-in-out"
          style={{ width: `${actualSidebarWidth}px` }}
        >
          {/* サイドバーヘッダー */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            {sidebarCollapsible && (
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                title={sidebarCollapsed ? 'サイドバーを展開' : 'サイドバーを折りたたむ'}
              >
                <svg
                  className={`w-5 h-5 transition-transform ${sidebarCollapsed ? '' : 'rotate-180'}`}
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
            )}
            {!sidebarCollapsed && (
              <h2 className="text-lg font-semibold text-gray-900">サイドパネル</h2>
            )}
          </div>

          {/* サイドバーコンテンツ */}
          <div className="flex-1 overflow-auto">
            {sidebarCollapsed ? (
              <div className="p-2">
                {React.isValidElement(sidebar) &&
                  React.cloneElement(sidebar as React.ReactElement, { collapsed: true })}
              </div>
            ) : (
              <div className="p-4">{sidebar}</div>
            )}
          </div>
        </aside>
      )}
    </div>
  );
}

/**
 * デスクトップ用ヘッダーコンポーネント
 */
interface DesktopHeaderProps {
  title: string;
  subtitle?: string;
  logo?: React.ReactNode;
  navigation?: React.ReactNode;
  actions?: React.ReactNode[];
  breadcrumbs?: Array<{ label: string; href?: string }>;
  searchBar?: React.ReactNode;
}

export function DesktopHeader({
  title,
  subtitle,
  logo,
  navigation,
  actions = [],
  breadcrumbs,
  searchBar,
}: DesktopHeaderProps) {
  return (
    <div className="px-6 py-4">
      {/* 上部ヘッダー */}
      <div className="flex items-center justify-between mb-4">
        {/* 左側：ロゴとタイトル */}
        <div className="flex items-center space-x-4">
          {logo && <div className="flex-shrink-0">{logo}</div>}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
            {subtitle && <p className="text-sm text-gray-600 mt-1">{subtitle}</p>}
          </div>
        </div>

        {/* 中央：検索バー */}
        {searchBar && <div className="flex-1 max-w-md mx-8">{searchBar}</div>}

        {/* 右側：アクション */}
        {actions.length > 0 && (
          <div className="flex items-center space-x-3">
            {actions.map((action, index) => (
              <div key={index}>{action}</div>
            ))}
          </div>
        )}
      </div>

      {/* パンくずリスト */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="mb-4" aria-label="パンくずリスト">
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

      {/* ナビゲーション */}
      {navigation && <div className="border-t border-gray-200 pt-4">{navigation}</div>}
    </div>
  );
}

/**
 * キーボードショートカット対応コンポーネント
 */
interface KeyboardShortcutsProps {
  shortcuts: Array<{
    key: string;
    ctrlKey?: boolean;
    shiftKey?: boolean;
    altKey?: boolean;
    action: () => void;
    description: string;
  }>;
  children: React.ReactNode;
  showHelp?: boolean;
}

export function KeyboardShortcuts({
  shortcuts,
  children,
  showHelp: _showHelp = false,
}: KeyboardShortcutsProps) {
  const [showHelpModal, setShowHelpModal] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ヘルプモーダル表示（Ctrl+?）
      if (e.ctrlKey && e.key === '?') {
        e.preventDefault();
        setShowHelpModal(true);
        return;
      }

      // 入力フィールドにフォーカスがある場合はスキップ
      const activeElement = document.activeElement;
      if (
        activeElement &&
        (activeElement.tagName === 'INPUT' ||
          activeElement.tagName === 'TEXTAREA' ||
          activeElement.getAttribute('contenteditable') === 'true')
      ) {
        return;
      }

      // ショートカットの実行
      for (const shortcut of shortcuts) {
        if (
          e.key.toLowerCase() === shortcut.key.toLowerCase() &&
          !!e.ctrlKey === !!shortcut.ctrlKey &&
          !!e.shiftKey === !!shortcut.shiftKey &&
          !!e.altKey === !!shortcut.altKey
        ) {
          e.preventDefault();
          shortcut.action();
          break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);

  return (
    <>
      {children}

      {/* ヘルプモーダル */}
      {showHelpModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">キーボードショートカット</h3>
            </div>
            <div className="px-6 py-4 max-h-96 overflow-auto">
              <div className="space-y-3">
                {shortcuts.map((shortcut, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">{shortcut.description}</span>
                    <div className="flex items-center space-x-1">
                      {shortcut.ctrlKey && (
                        <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">
                          Ctrl
                        </kbd>
                      )}
                      {shortcut.shiftKey && (
                        <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">
                          Shift
                        </kbd>
                      )}
                      {shortcut.altKey && (
                        <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">
                          Alt
                        </kbd>
                      )}
                      <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">
                        {shortcut.key.toUpperCase()}
                      </kbd>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setShowHelpModal(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * 複数ウィンドウ対応コンポーネント
 */
interface MultiWindowManagerProps {
  children: React.ReactNode;
  windowId: string;
  onWindowOpen?: (windowId: string, url: string) => void;
  onWindowClose?: (windowId: string) => void;
}

export function MultiWindowManager({
  children,
  windowId,
  onWindowOpen,
  onWindowClose,
}: MultiWindowManagerProps) {
  const windowRef = useRef<Window | null>(null);

  const openNewWindow = useCallback(
    (url: string, features?: string) => {
      const newWindow = window.open(url, windowId, features || 'width=800,height=600');
      if (newWindow) {
        windowRef.current = newWindow;
        onWindowOpen?.(windowId, url);

        // ウィンドウが閉じられた時の処理
        const checkClosed = setInterval(() => {
          if (newWindow.closed) {
            clearInterval(checkClosed);
            onWindowClose?.(windowId);
          }
        }, 1000);
      }
    },
    [windowId, onWindowOpen, onWindowClose]
  );

  const closeWindow = useCallback(() => {
    if (windowRef.current && !windowRef.current.closed) {
      windowRef.current.close();
    }
  }, []);

  // コンポーネントのアンマウント時にウィンドウを閉じる
  useEffect(() => {
    return () => {
      closeWindow();
    };
  }, [closeWindow]);

  return (
    <div data-window-id={windowId}>
      {React.cloneElement(children as React.ReactElement, {
        openNewWindow,
        closeWindow,
      })}
    </div>
  );
}

/**
 * デスクトップ用ツールバーコンポーネント
 */
interface DesktopToolbarProps {
  children: React.ReactNode;
  className?: string;
  position?: 'top' | 'bottom';
  sticky?: boolean;
}

export function DesktopToolbar({
  children,
  className = '',
  position = 'top',
  sticky = false,
}: DesktopToolbarProps) {
  const positionClasses = {
    top: 'border-b',
    bottom: 'border-t',
  };

  return (
    <div
      className={`
      flex items-center justify-between px-6 py-3
      bg-white ${positionClasses[position]} border-gray-200
      ${sticky ? 'sticky top-0 z-40' : ''}
      ${className}
    `}
    >
      {children}
    </div>
  );
}

/**
 * デスクトップ用カードグリッドコンポーネント
 */
interface DesktopCardGridProps {
  children: React.ReactNode;
  columns?: 1 | 2 | 3 | 4 | 5 | 6;
  gap?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function DesktopCardGrid({
  children,
  columns = 3,
  gap = 'md',
  className = '',
}: DesktopCardGridProps) {
  const columnClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
    5: 'grid-cols-5',
    6: 'grid-cols-6',
  };

  const gapClasses = {
    sm: 'gap-4',
    md: 'gap-6',
    lg: 'gap-8',
    xl: 'gap-10',
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
