import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useResponsive } from '../../hooks/useResponsive';

interface MouseOptimizedButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  onDoubleClick?: () => void;
  onRightClick?: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
  tooltip?: string;
  showTooltipDelay?: number;
}

/**
 * マウス操作最適化ボタンコンポーネント
 */
export function MouseOptimizedButton({
  children,
  onClick,
  onDoubleClick,
  onRightClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  className = '',
  tooltip,
  showTooltipDelay = 500,
}: MouseOptimizedButtonProps) {
  const { isTouch } = useResponsive();
  const [, setIsHovered] = useState(false); // isHoveredは将来使用予定
  const [isPressed, setIsPressed] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const baseClasses = `
    inline-flex items-center justify-center font-medium rounded-md
    transition-all duration-150 ease-in-out
    focus:outline-none focus:ring-2 focus:ring-offset-2
    disabled:opacity-50 disabled:cursor-not-allowed
    select-none cursor-pointer
  `;

  const variantClasses = {
    primary: `
      bg-blue-600 text-white border border-blue-600
      hover:bg-blue-700 hover:border-blue-700
      active:bg-blue-800 active:scale-95
      focus:ring-blue-500
    `,
    secondary: `
      bg-gray-600 text-white border border-gray-600
      hover:bg-gray-700 hover:border-gray-700
      active:bg-gray-800 active:scale-95
      focus:ring-gray-500
    `,
    outline: `
      bg-white text-blue-600 border border-blue-600
      hover:bg-blue-50 hover:text-blue-700
      active:bg-blue-100 active:scale-95
      focus:ring-blue-500
    `,
    ghost: `
      bg-transparent text-blue-600 border border-transparent
      hover:bg-blue-50 hover:text-blue-700
      active:bg-blue-100 active:scale-95
      focus:ring-blue-500
    `,
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  const handleMouseEnter = useCallback(() => {
    if (isTouch || disabled) return;

    setIsHovered(true);

    if (tooltip) {
      tooltipTimeoutRef.current = setTimeout(() => {
        setShowTooltip(true);
      }, showTooltipDelay);
    }
  }, [isTouch, disabled, tooltip, showTooltipDelay]);

  const handleMouseLeave = useCallback(() => {
    if (isTouch) return;

    setIsHovered(false);
    setShowTooltip(false);

    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current);
      tooltipTimeoutRef.current = null;
    }
  }, [isTouch]);

  const handleMouseDown = useCallback(() => {
    if (isTouch || disabled) return;
    setIsPressed(true);
  }, [isTouch, disabled]);

  const handleMouseUp = useCallback(() => {
    if (isTouch) return;
    setIsPressed(false);
  }, [isTouch]);

  const handleClick = useCallback(() => {
    if (disabled) return;
    onClick?.();
  }, [disabled, onClick]);

  const handleDoubleClick = useCallback(() => {
    if (disabled) return;
    onDoubleClick?.();
  }, [disabled, onDoubleClick]);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      if (disabled || !onRightClick) return;
      e.preventDefault();
      onRightClick();
    },
    [disabled, onRightClick]
  );

  useEffect(() => {
    return () => {
      if (tooltipTimeoutRef.current) {
        clearTimeout(tooltipTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        disabled={disabled}
        className={`
          ${baseClasses}
          ${variantClasses[variant]}
          ${sizeClasses[size]}
          ${isPressed ? 'transform scale-95' : ''}
          ${className}
        `}
      >
        {children}
      </button>

      {/* ツールチップ */}
      {tooltip && showTooltip && !isTouch && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 text-sm text-white bg-gray-900 rounded-md whitespace-nowrap z-50 shadow-lg">
          {tooltip}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
        </div>
      )}
    </div>
  );
}

/**
 * ホバー効果付きカードコンポーネント
 */
interface HoverCardProps {
  children: React.ReactNode;
  onClick?: () => void;
  onDoubleClick?: () => void;
  className?: string;
  elevation?: 'none' | 'sm' | 'md' | 'lg';
  hoverElevation?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  animateOnHover?: boolean;
}

export function HoverCard({
  children,
  onClick,
  onDoubleClick,
  className = '',
  elevation = 'sm',
  hoverElevation = 'md',
  animateOnHover = true,
}: HoverCardProps) {
  const { isTouch } = useResponsive();
  const [isHovered, setIsHovered] = useState(false);

  const elevationClasses = {
    none: '',
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg',
    xl: 'shadow-xl',
  };

  const Component = onClick ? 'button' : 'div';

  return (
    <Component
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onMouseEnter={() => !isTouch && setIsHovered(true)}
      onMouseLeave={() => !isTouch && setIsHovered(false)}
      className={`
        bg-white rounded-lg border border-gray-200
        ${elevationClasses[elevation]}
        ${!isTouch && isHovered ? elevationClasses[hoverElevation] : ''}
        ${animateOnHover ? 'transition-all duration-200 ease-in-out' : ''}
        ${!isTouch && isHovered && animateOnHover ? 'transform -translate-y-1' : ''}
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
    >
      {children}
    </Component>
  );
}

/**
 * ドラッグ&ドロップ最適化コンポーネント
 */
interface DragDropOptimizedProps {
  children: React.ReactNode;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  className?: string;
  dragPreview?: React.ReactNode;
  dropZone?: boolean;
}

export function DragDropOptimized({
  children,
  draggable = false,
  onDragStart,
  onDragEnd,
  onDrop,
  onDragOver,
  className = '',
  dragPreview,
  dropZone = false,
}: DragDropOptimizedProps) {
  const { isTouch } = useResponsive();
  const [isDragging, setIsDragging] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const dragPreviewRef = useRef<HTMLDivElement>(null);

  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      if (isTouch) return;

      setIsDragging(true);

      // カスタムドラッグプレビューを設定
      if (dragPreview && dragPreviewRef.current) {
        e.dataTransfer.setDragImage(dragPreviewRef.current, 0, 0);
      }

      onDragStart?.(e);
    },
    [isTouch, onDragStart, dragPreview]
  );

  const handleDragEnd = useCallback(
    (e: React.DragEvent) => {
      if (isTouch) return;

      setIsDragging(false);
      onDragEnd?.(e);
    },
    [isTouch, onDragEnd]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      if (isTouch || !dropZone) return;

      e.preventDefault();
      setIsDragOver(true);
      onDragOver?.(e);
    },
    [isTouch, dropZone, onDragOver]
  );

  const handleDragLeave = useCallback(() => {
    if (isTouch || !dropZone) return;
    setIsDragOver(false);
  }, [isTouch, dropZone]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      if (isTouch || !dropZone) return;

      e.preventDefault();
      setIsDragOver(false);
      onDrop?.(e);
    },
    [isTouch, dropZone, onDrop]
  );

  return (
    <>
      <div
        draggable={!isTouch && draggable}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          ${isDragging ? 'opacity-50 cursor-grabbing' : ''}
          ${draggable && !isTouch ? 'cursor-grab' : ''}
          ${dropZone && isDragOver ? 'bg-blue-50 border-blue-300' : ''}
          ${dropZone ? 'border-2 border-dashed border-gray-300' : ''}
          transition-all duration-200
          ${className}
        `}
      >
        {children}
      </div>

      {/* ドラッグプレビュー */}
      {dragPreview && (
        <div ref={dragPreviewRef} className="fixed -top-1000 -left-1000 pointer-events-none z-50">
          {dragPreview}
        </div>
      )}
    </>
  );
}

/**
 * コンテキストメニューコンポーネント
 */
interface ContextMenuProps {
  children: React.ReactNode;
  menuItems: Array<{
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
    disabled?: boolean;
    separator?: boolean;
  }>;
  className?: string;
}

export function ContextMenu({ children, menuItems, className = '' }: ContextMenuProps) {
  const { isTouch } = useResponsive();
  const [showMenu, setShowMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const menuRef = useRef<HTMLDivElement>(null);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      if (isTouch) return;

      e.preventDefault();
      setMenuPosition({ x: e.clientX, y: e.clientY });
      setShowMenu(true);
    },
    [isTouch]
  );

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
      setShowMenu(false);
    }
  }, []);

  useEffect(() => {
    if (showMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showMenu, handleClickOutside]);

  const handleMenuItemClick = useCallback((onClick: () => void) => {
    onClick();
    setShowMenu(false);
  }, []);

  return (
    <>
      <div onContextMenu={handleContextMenu} className={className}>
        {children}
      </div>

      {/* コンテキストメニュー */}
      {showMenu && !isTouch && (
        <div
          ref={menuRef}
          className="fixed bg-white border border-gray-200 rounded-md shadow-lg py-1 z-50 min-w-48"
          style={{
            left: menuPosition.x,
            top: menuPosition.y,
          }}
        >
          {menuItems.map((item, index) => (
            <React.Fragment key={index}>
              {item.separator && <div className="border-t border-gray-200 my-1" />}
              <button
                onClick={() => handleMenuItemClick(item.onClick)}
                disabled={item.disabled}
                className={`
                  w-full text-left px-4 py-2 text-sm
                  ${
                    item.disabled
                      ? 'text-gray-400 cursor-not-allowed'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  }
                  flex items-center space-x-2
                `}
              >
                {item.icon && <span className="w-4 h-4">{item.icon}</span>}
                <span>{item.label}</span>
              </button>
            </React.Fragment>
          ))}
        </div>
      )}
    </>
  );
}

/**
 * スクロール最適化コンテナ
 */
interface ScrollOptimizedProps {
  children: React.ReactNode;
  className?: string;
  showScrollbars?: boolean;
  smoothScroll?: boolean;
  onScroll?: (e: React.UIEvent) => void;
}

export function ScrollOptimized({
  children,
  className = '',
  showScrollbars = true,
  smoothScroll = true,
  onScroll,
}: ScrollOptimizedProps) {
  const { isTouch } = useResponsive();

  return (
    <div
      className={`
        overflow-auto
        ${smoothScroll && !isTouch ? 'scroll-smooth' : ''}
        ${!showScrollbars ? 'scrollbar-hide' : ''}
        ${className}
      `}
      onScroll={onScroll}
    >
      {children}
    </div>
  );
}

/**
 * ズーム対応コンテナ
 */
interface ZoomContainerProps {
  children: React.ReactNode;
  minZoom?: number;
  maxZoom?: number;
  defaultZoom?: number;
  className?: string;
  onZoomChange?: (zoom: number) => void;
}

export function ZoomContainer({
  children,
  minZoom = 0.5,
  maxZoom = 3,
  defaultZoom = 1,
  className = '',
  onZoomChange,
}: ZoomContainerProps) {
  const { isTouch } = useResponsive();
  const [zoom, setZoom] = useState(defaultZoom);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (isTouch || !e.ctrlKey) return;

      e.preventDefault();

      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      const newZoom = Math.max(minZoom, Math.min(maxZoom, zoom + delta));

      setZoom(newZoom);
      onZoomChange?.(newZoom);
    },
    [isTouch, zoom, minZoom, maxZoom, onZoomChange]
  );

  const resetZoom = useCallback(() => {
    setZoom(defaultZoom);
    onZoomChange?.(defaultZoom);
  }, [defaultZoom, onZoomChange]);

  return (
    <div ref={containerRef} onWheel={handleWheel} className={`relative overflow-auto ${className}`}>
      <div
        style={{
          transform: `scale(${zoom})`,
          transformOrigin: 'top left',
          transition: 'transform 0.1s ease-out',
        }}
      >
        {children}
      </div>

      {/* ズームコントロール */}
      {!isTouch && (
        <div className="absolute top-4 right-4 flex items-center space-x-2 bg-white border border-gray-200 rounded-md shadow-sm p-2">
          <button
            onClick={() => {
              const newZoom = Math.max(minZoom, zoom - 0.1);
              setZoom(newZoom);
              onZoomChange?.(newZoom);
            }}
            className="p-1 text-gray-600 hover:text-gray-900"
            disabled={zoom <= minZoom}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </button>

          <span className="text-sm text-gray-700 min-w-12 text-center">
            {Math.round(zoom * 100)}%
          </span>

          <button
            onClick={() => {
              const newZoom = Math.min(maxZoom, zoom + 0.1);
              setZoom(newZoom);
              onZoomChange?.(newZoom);
            }}
            className="p-1 text-gray-600 hover:text-gray-900"
            disabled={zoom >= maxZoom}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
          </button>

          <button
            onClick={resetZoom}
            className="p-1 text-gray-600 hover:text-gray-900"
            title="リセット"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
