import React, { useState, useRef, useCallback } from 'react';
import { useResponsive } from '../../hooks/useResponsive';

interface SplitScreenLayoutProps {
  leftPanel: React.ReactNode;
  rightPanel: React.ReactNode;
  defaultSplit?: number; // 0-100の範囲でデフォルトの分割位置
  minLeftWidth?: number; // 左パネルの最小幅（%）
  maxLeftWidth?: number; // 左パネルの最大幅（%）
  resizable?: boolean;
  orientation?: 'horizontal' | 'vertical';
  className?: string;
  onSplitChange?: (split: number) => void;
}

/**
 * 画面分割表示コンポーネント
 */
export function SplitScreenLayout({
  leftPanel,
  rightPanel,
  defaultSplit = 50,
  minLeftWidth = 20,
  maxLeftWidth = 80,
  resizable = true,
  orientation = 'horizontal',
  className = '',
  onSplitChange,
}: SplitScreenLayoutProps) {
  const { isTablet, isPortrait } = useResponsive();
  const [split, setSplit] = useState(defaultSplit);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // タブレット縦向きの場合は縦分割に変更
  const actualOrientation = isTablet && isPortrait ? 'vertical' : orientation;

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!resizable) return;

      e.preventDefault();
      setIsDragging(true);

      const container = containerRef.current;
      if (!container) return;

      const containerRect = container.getBoundingClientRect();
      const isHorizontal = actualOrientation === 'horizontal';

      const handleMouseMove = (e: MouseEvent) => {
        const containerSize = isHorizontal ? containerRect.width : containerRect.height;
        const mousePos = isHorizontal
          ? e.clientX - containerRect.left
          : e.clientY - containerRect.top;
        const newSplit = Math.max(
          minLeftWidth,
          Math.min(maxLeftWidth, (mousePos / containerSize) * 100)
        );

        setSplit(newSplit);
        onSplitChange?.(newSplit);
      };

      const handleMouseUp = () => {
        setIsDragging(false);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [resizable, actualOrientation, minLeftWidth, maxLeftWidth, onSplitChange]
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!resizable) return;

      e.preventDefault();
      setIsDragging(true);

      const container = containerRef.current;
      if (!container) return;

      const containerRect = container.getBoundingClientRect();
      const isHorizontal = actualOrientation === 'horizontal';

      const handleTouchMove = (e: TouchEvent) => {
        const touch = e.touches[0];
        const containerSize = isHorizontal ? containerRect.width : containerRect.height;
        const touchPos = isHorizontal
          ? touch.clientX - containerRect.left
          : touch.clientY - containerRect.top;
        const newSplit = Math.max(
          minLeftWidth,
          Math.min(maxLeftWidth, (touchPos / containerSize) * 100)
        );

        setSplit(newSplit);
        onSplitChange?.(newSplit);
      };

      const handleTouchEnd = () => {
        setIsDragging(false);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
      };

      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('touchend', handleTouchEnd);
    },
    [resizable, actualOrientation, minLeftWidth, maxLeftWidth, onSplitChange]
  );

  if (actualOrientation === 'vertical') {
    return (
      <div ref={containerRef} className={`flex flex-col h-full ${className}`}>
        {/* 上パネル */}
        <div className="overflow-auto border-b border-gray-200" style={{ height: `${split}%` }}>
          {leftPanel}
        </div>

        {/* 縦リサイザー */}
        {resizable && (
          <button
            className={`
              h-2 bg-gray-200 cursor-row-resize hover:bg-gray-300 transition-colors
              flex items-center justify-center border-0 p-0
              ${isDragging ? 'bg-blue-300' : ''}
            `}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                // リサイザーのキーボード操作は将来実装予定
              }
            }}
            aria-label="パネルサイズ調整"
          >
            <div className="w-8 h-1 bg-gray-400 rounded-full"></div>
          </button>
        )}

        {/* 下パネル */}
        <div className="overflow-auto" style={{ height: `${100 - split}%` }}>
          {rightPanel}
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`flex h-full ${className}`}>
      {/* 左パネル */}
      <div className="overflow-auto border-r border-gray-200" style={{ width: `${split}%` }}>
        {leftPanel}
      </div>

      {/* 横リサイザー */}
      {resizable && (
        <button
          className={`
            w-2 bg-gray-200 cursor-col-resize hover:bg-gray-300 transition-colors
            flex items-center justify-center border-0 p-0
            ${isDragging ? 'bg-blue-300' : ''}
          `}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              // リサイザーのキーボード操作は将来実装予定
            }
          }}
          aria-label="パネルサイズ調整"
        >
          <div className="h-8 w-1 bg-gray-400 rounded-full"></div>
        </button>
      )}

      {/* 右パネル */}
      <div className="overflow-auto" style={{ width: `${100 - split}%` }}>
        {rightPanel}
      </div>
    </div>
  );
}

/**
 * マルチパネルレイアウトコンポーネント
 */
interface MultiPanelLayoutProps {
  panels: Array<{
    id: string;
    title: string;
    content: React.ReactNode;
    minWidth?: number;
    defaultWidth?: number;
    collapsible?: boolean;
  }>;
  className?: string;
  onPanelResize?: (panelId: string, width: number) => void;
  onPanelCollapse?: (panelId: string, collapsed: boolean) => void;
}

export function MultiPanelLayout({
  panels,
  className = '',
  onPanelResize: _onPanelResize,
  onPanelCollapse,
}: MultiPanelLayoutProps) {
  const [panelWidths] = useState<Record<string, number>>(() => {
    // setPanelWidthsは将来使用予定
    const initialWidths: Record<string, number> = {};
    const totalDefaultWidth = panels.reduce(
      (sum, panel) => sum + (panel.defaultWidth || 100 / panels.length),
      0
    );

    panels.forEach(panel => {
      initialWidths[panel.id] =
        ((panel.defaultWidth || 100 / panels.length) / totalDefaultWidth) * 100;
    });

    return initialWidths;
  });

  const [collapsedPanels, setCollapsedPanels] = useState<Set<string>>(new Set());

  const handlePanelCollapse = (panelId: string) => {
    const newCollapsed = new Set(collapsedPanels);
    if (newCollapsed.has(panelId)) {
      newCollapsed.delete(panelId);
    } else {
      newCollapsed.add(panelId);
    }
    setCollapsedPanels(newCollapsed);
    onPanelCollapse?.(panelId, newCollapsed.has(panelId));
  };

  // const visiblePanels = panels.filter(panel => !collapsedPanels.has(panel.id)); // 将来使用予定

  return (
    <div className={`flex h-full ${className}`}>
      {panels.map((panel, index) => {
        const isCollapsed = collapsedPanels.has(panel.id);
        const isLast = index === panels.length - 1;

        if (isCollapsed) {
          return (
            <div key={panel.id} className="flex-shrink-0 w-8 border-r border-gray-200 bg-gray-50">
              <button
                onClick={() => handlePanelCollapse(panel.id)}
                className="w-full h-full flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors"
                title={`${panel.title}を展開`}
              >
                <div className="transform -rotate-90 text-xs font-medium whitespace-nowrap">
                  {panel.title}
                </div>
              </button>
            </div>
          );
        }

        return (
          <React.Fragment key={panel.id}>
            <div
              className="flex flex-col overflow-hidden"
              style={{ width: `${panelWidths[panel.id]}%` }}
            >
              {/* パネルヘッダー */}
              <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
                <h3 className="text-sm font-medium text-gray-900">{panel.title}</h3>
                {panel.collapsible && (
                  <button
                    onClick={() => handlePanelCollapse(panel.id)}
                    className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                    title={`${panel.title}を折りたたむ`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

              {/* パネルコンテンツ */}
              <div className="flex-1 overflow-auto">{panel.content}</div>
            </div>

            {/* リサイザー */}
            {!isLast && (
              <div className="w-1 bg-gray-200 cursor-col-resize hover:bg-gray-300 transition-colors" />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

/**
 * アダプティブレイアウトコンポーネント
 */
interface AdaptiveLayoutProps {
  children: React.ReactNode;
  mobileLayout: React.ReactNode;
  tabletLayout: React.ReactNode;
  desktopLayout: React.ReactNode;
  className?: string;
}

export function AdaptiveLayout({
  children,
  mobileLayout,
  tabletLayout,
  desktopLayout,
  className = '',
}: AdaptiveLayoutProps) {
  const { isMobile, isTablet, isDesktop } = useResponsive();

  if (isMobile) {
    return <div className={className}>{mobileLayout}</div>;
  }

  if (isTablet) {
    return <div className={className}>{tabletLayout}</div>;
  }

  if (isDesktop) {
    return <div className={className}>{desktopLayout}</div>;
  }

  // フォールバック
  return <div className={className}>{children}</div>;
}
