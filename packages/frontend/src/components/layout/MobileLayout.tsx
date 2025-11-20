import React from 'react';
import { useResponsive, useVirtualKeyboard } from '../../hooks/useResponsive';

interface MobileLayoutProps {
  children: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  showSafeArea?: boolean;
}

/**
 * モバイル専用レイアウトコンポーネント
 */
export function MobileLayout({
  children,
  header,
  footer,
  className = '',
  showSafeArea = true,
}: MobileLayoutProps) {
  const { isMobile, isPortrait } = useResponsive();
  const { isVisible: keyboardVisible, height: keyboardHeight } = useVirtualKeyboard();
  const safeArea = useSafeArea();

  // モバイル以外では通常のレイアウトを使用
  if (!isMobile) {
    return <div className={className}>{children}</div>;
  }

  const containerStyle = {
    paddingTop: showSafeArea ? safeArea.top : 0,
    paddingBottom: showSafeArea && !keyboardVisible ? safeArea.bottom : 0,
    paddingLeft: showSafeArea ? safeArea.left : 0,
    paddingRight: showSafeArea ? safeArea.right : 0,
    minHeight: keyboardVisible ? `calc(100vh - ${keyboardHeight}px)` : '100vh',
  };

  return (
    <div className={`mobile-layout flex flex-col ${className}`} style={containerStyle}>
      {/* ヘッダー */}
      {header && (
        <header className="mobile-header flex-shrink-0 bg-white border-b border-gray-200 sticky top-0 z-50">
          {header}
        </header>
      )}

      {/* メインコンテンツ */}
      <main className="mobile-main flex-1 overflow-auto">
        <div
          className={`
          px-4 py-4
          ${isPortrait ? 'space-y-4' : 'space-y-2'}
        `}
        >
          {children}
        </div>
      </main>

      {/* フッター */}
      {footer && !keyboardVisible && (
        <footer className="mobile-footer flex-shrink-0 bg-white border-t border-gray-200 sticky bottom-0 z-50">
          {footer}
        </footer>
      )}
    </div>
  );
}

/**
 * モバイル用ヘッダーコンポーネント
 */
interface MobileHeaderProps {
  title: string;
  leftAction?: React.ReactNode;
  rightAction?: React.ReactNode;
  subtitle?: string;
}

export function MobileHeader({ title, leftAction, rightAction, subtitle }: MobileHeaderProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3 min-h-touch">
      {/* 左側のアクション */}
      <div className="flex-shrink-0 w-12">{leftAction}</div>

      {/* タイトル */}
      <div className="flex-1 text-center px-2">
        <h1 className="text-lg font-semibold text-gray-900 truncate">{title}</h1>
        {subtitle && <p className="text-sm text-gray-600 truncate">{subtitle}</p>}
      </div>

      {/* 右側のアクション */}
      <div className="flex-shrink-0 w-12 flex justify-end">{rightAction}</div>
    </div>
  );
}

/**
 * モバイル用フッターコンポーネント
 */
interface MobileFooterProps {
  children: React.ReactNode;
  className?: string;
}

export function MobileFooter({ children, className = '' }: MobileFooterProps) {
  return <div className={`px-4 py-3 ${className}`}>{children}</div>;
}

/**
 * モバイル用ボタンコンポーネント
 */
interface MobileButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  disabled?: boolean;
  className?: string;
}

export function MobileButton({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled = false,
  className = '',
}: MobileButtonProps) {
  const baseClasses = `
    touch-target
    inline-flex items-center justify-center
    font-medium rounded-lg
    transition-colors duration-200
    focus:outline-none focus:ring-2 focus:ring-offset-2
    disabled:opacity-50 disabled:cursor-not-allowed
    ${fullWidth ? 'w-full' : ''}
  `;

  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    secondary: 'bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500',
    outline: 'border-2 border-blue-600 text-blue-600 hover:bg-blue-50 focus:ring-blue-500',
    ghost: 'text-blue-600 hover:bg-blue-50 focus:ring-blue-500',
  };

  const sizeClasses = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-3 text-base',
    lg: 'px-6 py-4 text-lg',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`
        ${baseClasses}
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${className}
      `}
    >
      {children}
    </button>
  );
}

/**
 * モバイル用カードコンポーネント
 */
interface MobileCardProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  padding?: 'sm' | 'md' | 'lg';
}

export function MobileCard({ children, onClick, className = '', padding = 'md' }: MobileCardProps) {
  const paddingClasses = {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  };

  const Component = onClick ? 'button' : 'div';

  return (
    <Component
      onClick={onClick}
      className={`
        bg-white rounded-lg border border-gray-200 shadow-sm
        ${paddingClasses[padding]}
        ${onClick ? 'touch-target hover:bg-gray-50 active:bg-gray-100 transition-colors' : ''}
        ${className}
      `}
    >
      {children}
    </Component>
  );
}

/**
 * モバイル用リストアイテムコンポーネント
 */
interface MobileListItemProps {
  children: React.ReactNode;
  onClick?: () => void;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  subtitle?: string;
  className?: string;
}

export function MobileListItem({
  children,
  onClick,
  leftIcon,
  rightIcon,
  subtitle,
  className = '',
}: MobileListItemProps) {
  const Component = onClick ? 'button' : 'div';

  return (
    <Component
      onClick={onClick}
      className={`
        flex items-center w-full text-left
        touch-target px-4 py-3
        border-b border-gray-200 last:border-b-0
        ${onClick ? 'hover:bg-gray-50 active:bg-gray-100 transition-colors' : ''}
        ${className}
      `}
    >
      {/* 左側のアイコン */}
      {leftIcon && <div className="flex-shrink-0 mr-3">{leftIcon}</div>}

      {/* コンテンツ */}
      <div className="flex-1 min-w-0">
        <div className="text-base font-medium text-gray-900 truncate">{children}</div>
        {subtitle && <div className="text-sm text-gray-600 truncate">{subtitle}</div>}
      </div>

      {/* 右側のアイコン */}
      {rightIcon && <div className="flex-shrink-0 ml-3">{rightIcon}</div>}
    </Component>
  );
}
