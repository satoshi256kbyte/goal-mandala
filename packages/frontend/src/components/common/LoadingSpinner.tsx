import React from 'react';

/**
 * ローディングスピナーのプロパティ
 */
export interface LoadingSpinnerProps {
  /** スピナーのサイズ */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /** スピナーの色 */
  color?: 'primary' | 'secondary' | 'white' | 'gray';
  /** 表示テキスト */
  text?: string;
  /** テキストの位置 */
  textPosition?: 'bottom' | 'right' | 'none';
  /** カスタムクラス名 */
  className?: string;
  /** アクセシビリティラベル */
  ariaLabel?: string;
}

/**
 * ローディングスピナーコンポーネント
 */
export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  color = 'primary',
  text,
  textPosition = 'bottom',
  className = '',
  ariaLabel = '読み込み中',
}) => {
  /**
   * スピナーのサイズクラス
   */
  const getSizeClasses = () => {
    const sizeClasses = {
      xs: 'h-3 w-3',
      sm: 'h-4 w-4',
      md: 'h-6 w-6',
      lg: 'h-8 w-8',
      xl: 'h-12 w-12',
    };
    return sizeClasses[size];
  };

  /**
   * スピナーの色クラス
   */
  const getColorClasses = () => {
    const colorClasses = {
      primary: 'text-blue-600',
      secondary: 'text-gray-600',
      white: 'text-white',
      gray: 'text-gray-400',
    };
    return colorClasses[color];
  };

  /**
   * テキストのサイズクラス
   */
  const getTextSizeClasses = () => {
    const textSizeClasses = {
      xs: 'text-xs',
      sm: 'text-sm',
      md: 'text-sm',
      lg: 'text-base',
      xl: 'text-lg',
    };
    return textSizeClasses[size];
  };

  /**
   * コンテナのレイアウトクラス
   */
  const getContainerClasses = () => {
    if (textPosition === 'none' || !text) {
      return 'inline-flex';
    }

    if (textPosition === 'right') {
      return 'inline-flex items-center space-x-2';
    }

    return 'inline-flex flex-col items-center space-y-2';
  };

  /**
   * スピナーSVG
   */
  const SpinnerSVG = () => (
    <svg
      className={`animate-spin ${getSizeClasses()} ${getColorClasses()}`}
      fill="none"
      viewBox="0 0 24 24"
      role="img"
      aria-label={ariaLabel}
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );

  return (
    <div className={`${getContainerClasses()} ${className}`}>
      <SpinnerSVG />
      {text && textPosition !== 'none' && (
        <span className={`${getTextSizeClasses()} ${getColorClasses()}`}>{text}</span>
      )}
    </div>
  );
};

/**
 * ローディングオーバーレイのプロパティ
 */
export interface LoadingOverlayProps {
  /** 表示フラグ */
  isVisible: boolean;
  /** 表示テキスト */
  text?: string;
  /** 背景の透明度 */
  opacity?: 'light' | 'medium' | 'dark';
  /** z-indexの値 */
  zIndex?: number;
  /** カスタムクラス名 */
  className?: string;
}

/**
 * ローディングオーバーレイコンポーネント
 */
export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isVisible,
  text = '処理中...',
  opacity = 'medium',
  zIndex = 50,
  className = '',
}) => {
  if (!isVisible) {
    return null;
  }

  /**
   * 背景の透明度クラス
   */
  const getOpacityClasses = () => {
    const opacityClasses = {
      light: 'bg-black bg-opacity-25',
      medium: 'bg-black bg-opacity-50',
      dark: 'bg-black bg-opacity-75',
    };
    return opacityClasses[opacity];
  };

  return (
    <div
      className={`fixed inset-0 flex items-center justify-center ${getOpacityClasses()} ${className}`}
      style={{ zIndex }}
      role="dialog"
      aria-modal="true"
      aria-label="読み込み中"
    >
      <div className="bg-white rounded-lg p-6 shadow-lg">
        <LoadingSpinner size="lg" color="primary" text={text} textPosition="bottom" />
      </div>
    </div>
  );
};

/**
 * インラインローディングのプロパティ
 */
export interface InlineLoadingProps {
  /** 表示フラグ */
  isVisible: boolean;
  /** 表示テキスト */
  text?: string;
  /** スピナーのサイズ */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /** カスタムクラス名 */
  className?: string;
}

/**
 * インラインローディングコンポーネント
 */
export const InlineLoading: React.FC<InlineLoadingProps> = ({
  isVisible,
  text = '読み込み中...',
  size = 'sm',
  className = '',
}) => {
  if (!isVisible) {
    return null;
  }

  return (
    <div className={`inline-flex items-center space-x-2 ${className}`}>
      <LoadingSpinner size={size} color="primary" textPosition="none" />
      <span className="text-sm text-gray-600">{text}</span>
    </div>
  );
};

/**
 * デフォルトエクスポート
 */
export default LoadingSpinner;
