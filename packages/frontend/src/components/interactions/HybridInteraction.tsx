import React, { useRef, useState, useEffect } from 'react';
import { useResponsive } from '../../hooks/useResponsive';
import { useLongPress } from '../../hooks/useTouch';

interface HybridButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  onLongPress?: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
  tooltip?: string;
}

/**
 * タッチとマウス両対応のボタンコンポーネント
 */
export function HybridButton({
  children,
  onClick,
  onLongPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  className = '',
  tooltip,
}: HybridButtonProps) {
  const { isTouch } = useResponsive();
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  const longPressHandlers = useLongPress(onLongPress || (() => {}), 500);

  const baseClasses = `
    inline-flex items-center justify-center font-medium rounded-lg
    transition-all duration-200 ease-in-out
    focus:outline-none focus:ring-2 focus:ring-offset-2
    disabled:opacity-50 disabled:cursor-not-allowed
    select-none
    ${isTouch ? 'touch-target' : ''}
  `;

  const variantClasses = {
    primary: `
      bg-blue-600 text-white
      ${!disabled && isHovered ? 'bg-blue-700' : ''}
      ${!disabled && isPressed ? 'bg-blue-800 scale-95' : ''}
      focus:ring-blue-500
    `,
    secondary: `
      bg-gray-600 text-white
      ${!disabled && isHovered ? 'bg-gray-700' : ''}
      ${!disabled && isPressed ? 'bg-gray-800 scale-95' : ''}
      focus:ring-gray-500
    `,
    outline: `
      border-2 border-blue-600 text-blue-600 bg-white
      ${!disabled && isHovered ? 'bg-blue-50' : ''}
      ${!disabled && isPressed ? 'bg-blue-100 scale-95' : ''}
      focus:ring-blue-500
    `,
    ghost: `
      text-blue-600 bg-transparent
      ${!disabled && isHovered ? 'bg-blue-50' : ''}
      ${!disabled && isPressed ? 'bg-blue-100 scale-95' : ''}
      focus:ring-blue-500
    `,
  };

  const sizeClasses = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-3 text-base',
    lg: 'px-6 py-4 text-lg',
  };

  const handleMouseEnter = () => {
    if (!isTouch && !disabled) {
      setIsHovered(true);
      if (tooltip) {
        setShowTooltip(true);
      }
    }
  };

  const handleMouseLeave = () => {
    if (!isTouch) {
      setIsHovered(false);
      setShowTooltip(false);
    }
  };

  const handleMouseDown = () => {
    if (!isTouch && !disabled) {
      setIsPressed(true);
    }
  };

  const handleMouseUp = () => {
    if (!isTouch) {
      setIsPressed(false);
    }
  };

  const handleTouchStart = () => {
    if (isTouch && !disabled) {
      setIsPressed(true);
    }
  };

  const handleTouchEnd = () => {
    if (isTouch) {
      setIsPressed(false);
    }
  };

  const handleClick = () => {
    if (!disabled) {
      onClick?.();
    }
  };

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        {...(onLongPress ? longPressHandlers : {})}
        className={`
          ${baseClasses}
          ${variantClasses[variant]}
          ${sizeClasses[size]}
          ${className}
        `}
        aria-label={typeof children === 'string' ? children : undefined}
      >
        {children}
      </button>

      {/* ツールチップ */}
      {tooltip && showTooltip && !isTouch && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded whitespace-nowrap z-50">
          {tooltip}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-gray-900"></div>
        </div>
      )}
    </div>
  );
}

/**
 * ドラッグ&ドロップ対応のアイテムコンポーネント
 */
interface HybridDraggableProps {
  children: React.ReactNode;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  onTouchMove?: (e: React.TouchEvent) => void;
  draggable?: boolean;
  className?: string;
  dragHandle?: boolean;
}

export function HybridDraggable({
  children,
  onDragStart,
  onDragEnd,
  onTouchMove,
  draggable = true,
  className = '',
  dragHandle = false,
}: HybridDraggableProps) {
  const { isTouch } = useResponsive();
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<HTMLDivElement>(null);

  const handleDragStart = (e: React.DragEvent) => {
    setIsDragging(true);
    onDragStart?.(e);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setIsDragging(false);
    onDragEnd?.(e);
  };

  const handleTouchStart = (_e: React.TouchEvent) => {
    if (isTouch && draggable) {
      setIsDragging(true);
    }
  };

  const handleTouchEnd = () => {
    if (isTouch) {
      setIsDragging(false);
    }
  };

  const handleTouchMoveWrapper = (e: React.TouchEvent) => {
    if (isTouch && draggable) {
      onTouchMove?.(e);
    }
  };

  return (
    <div
      ref={dragRef}
      draggable={!isTouch && draggable}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchMoveWrapper}
      className={`
        ${isDragging ? 'opacity-50 scale-95' : ''}
        ${draggable ? 'cursor-move' : ''}
        transition-all duration-200
        ${className}
      `}
    >
      {dragHandle && (
        <div className="drag-handle p-1 text-gray-400 hover:text-gray-600">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
          </svg>
        </div>
      )}
      {children}
    </div>
  );
}

/**
 * ホバー/タッチ対応のカードコンポーネント
 */
interface HybridCardProps {
  children: React.ReactNode;
  onClick?: () => void;
  onSecondaryAction?: () => void;
  className?: string;
  elevation?: 'none' | 'sm' | 'md' | 'lg';
  interactive?: boolean;
}

export function HybridCard({
  children,
  onClick,
  onSecondaryAction,
  className = '',
  elevation = 'sm',
  interactive = true,
}: HybridCardProps) {
  const { isTouch } = useResponsive();
  const [, setIsHovered] = useState(false); // isHoveredは将来使用予定
  const [isPressed, setIsPressed] = useState(false);

  const elevationClasses = {
    none: '',
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg',
  };

  const hoverElevationClasses = {
    none: '',
    sm: 'hover:shadow-md',
    md: 'hover:shadow-lg',
    lg: 'hover:shadow-xl',
  };

  const longPressHandlers = useLongPress(onSecondaryAction || (() => {}), 500);

  const handleMouseEnter = () => {
    if (!isTouch && interactive) {
      setIsHovered(true);
    }
  };

  const handleMouseLeave = () => {
    if (!isTouch) {
      setIsHovered(false);
    }
  };

  const handleMouseDown = () => {
    if (!isTouch && interactive) {
      setIsPressed(true);
    }
  };

  const handleMouseUp = () => {
    if (!isTouch) {
      setIsPressed(false);
    }
  };

  const handleTouchStart = () => {
    if (isTouch && interactive) {
      setIsPressed(true);
    }
  };

  const handleTouchEnd = () => {
    if (isTouch) {
      setIsPressed(false);
    }
  };

  const handleClick = () => {
    if (interactive) {
      onClick?.();
    }
  };

  const Component = onClick ? 'button' : 'div';

  return (
    <Component
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      {...(onSecondaryAction ? longPressHandlers : {})}
      className={`
        bg-white rounded-lg border border-gray-200
        ${elevationClasses[elevation]}
        ${interactive && !isTouch ? hoverElevationClasses[elevation] : ''}
        ${interactive ? 'transition-all duration-200 ease-in-out' : ''}
        ${isPressed ? 'scale-95' : ''}
        ${onClick ? 'cursor-pointer' : ''}
        ${isTouch && interactive ? 'touch-target' : ''}
        ${className}
      `}
    >
      {children}
    </Component>
  );
}

/**
 * スクロール対応のコンテナコンポーネント
 */
interface HybridScrollContainerProps {
  children: React.ReactNode;
  direction?: 'vertical' | 'horizontal' | 'both';
  className?: string;
  showScrollbars?: boolean;
  onScroll?: (e: React.UIEvent) => void;
}

export function HybridScrollContainer({
  children,
  direction = 'vertical',
  className = '',
  showScrollbars = true,
  onScroll,
}: HybridScrollContainerProps) {
  const { isTouch } = useResponsive();

  const scrollClasses = {
    vertical: 'overflow-y-auto overflow-x-hidden',
    horizontal: 'overflow-x-auto overflow-y-hidden',
    both: 'overflow-auto',
  };

  const scrollbarClasses = showScrollbars ? '' : 'scrollbar-hide';

  return (
    <div
      className={`
        ${scrollClasses[direction]}
        ${scrollbarClasses}
        ${isTouch ? 'scroll-touch' : 'scroll-smooth'}
        ${className}
      `}
      onScroll={onScroll}
    >
      {children}
    </div>
  );
}

/**
 * フォーカス管理コンポーネント
 */
interface HybridFocusManagerProps {
  children: React.ReactNode;
  trapFocus?: boolean;
  restoreFocus?: boolean;
  className?: string;
}

export function HybridFocusManager({
  children,
  trapFocus = false, // eslint-disable-line @typescript-eslint/no-unused-vars
  restoreFocus = false,
  className = '',
}: HybridFocusManagerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<Element | null>(null);

  useEffect(() => {
    if (restoreFocus) {
      previousActiveElement.current = document.activeElement;
    }

    return () => {
      if (restoreFocus && previousActiveElement.current) {
        (previousActiveElement.current as HTMLElement).focus?.();
      }
    };
  }, [restoreFocus]);

  /*
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!trapFocus || e.key !== 'Tab') return;

    const container = containerRef.current;
    if (!container) return;

    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    if (e.shiftKey) {
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      }
    } else {
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    }
  };
  */

  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  );
}
