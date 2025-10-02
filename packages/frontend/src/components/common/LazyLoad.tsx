import React, { Suspense, lazy, ComponentType } from 'react';
import { useLazyLoad } from '../../utils/performance';
import { LoadingSpinner } from './LoadingSpinner';

/**
 * 遅延ローディングのプロパティ
 */
export interface LazyLoadProps {
  /** 子要素 */
  children: React.ReactNode;
  /** ローディング中に表示するコンポーネント */
  fallback?: React.ReactNode;
  /** Intersection Observer のしきい値 */
  threshold?: number;
  /** Intersection Observer のルートマージン */
  rootMargin?: string;
  /** カスタムクラス名 */
  className?: string;
  /** 高さ（プレースホルダー用） */
  height?: number | string;
  /** 幅（プレースホルダー用） */
  width?: number | string;
  /** 遅延ローディングが完了した時のコールバック */
  onLoad?: () => void;
}

/**
 * 遅延ローディングコンポーネント
 *
 * Intersection Observer を使用して、要素が画面に表示される直前に
 * 子コンポーネントをレンダリングします。
 *
 * パフォーマンス最適化の一環として、初期表示時に見えない要素の
 * レンダリングを遅延させることで、初期ロード時間を短縮します。
 */
export const LazyLoad: React.FC<LazyLoadProps> = ({
  children,
  fallback,
  threshold = 0.1,
  rootMargin = '50px',
  className = '',
  height,
  width,
  onLoad,
}) => {
  const { elementRef, isVisible, hasLoaded } = useLazyLoad(threshold, rootMargin);

  React.useEffect(() => {
    if (hasLoaded && onLoad) {
      onLoad();
    }
  }, [hasLoaded, onLoad]);

  const placeholderStyle: React.CSSProperties = {
    ...(height && { height }),
    ...(width && { width }),
  };

  if (!isVisible) {
    return (
      <div
        ref={elementRef}
        className={`${className} flex items-center justify-center bg-gray-50`}
        style={placeholderStyle}
        role="status"
        aria-label="読み込み待機中"
      >
        {fallback || <div className="text-gray-400 text-sm">読み込み待機中...</div>}
      </div>
    );
  }

  return (
    <div ref={elementRef} className={className} style={placeholderStyle}>
      {children}
    </div>
  );
};

/**
 * 遅延ローディング用のSuspenseラッパー
 */
export interface LazySuspenseProps {
  /** 子要素 */
  children: React.ReactNode;
  /** ローディング中に表示するコンポーネント */
  fallback?: React.ReactNode;
  /** エラーバウンダリー */
  errorBoundary?: ComponentType<{ error: Error; resetError: () => void }>;
}

/**
 * Suspenseを使用した遅延ローディングラッパー
 */
export const LazySuspense: React.FC<LazySuspenseProps> = ({
  children,
  fallback,
  errorBoundary: ErrorBoundary,
}) => {
  const defaultFallback = (
    <div className="flex items-center justify-center p-8">
      <LoadingSpinner size="medium" message="コンポーネントを読み込んでいます..." />
    </div>
  );

  const content = <Suspense fallback={fallback || defaultFallback}>{children}</Suspense>;

  if (ErrorBoundary) {
    return (
      <ErrorBoundary error={new Error()} resetError={() => {}}>
        {content}
      </ErrorBoundary>
    );
  }

  return content;
};

/**
 * 動的インポート用のヘルパー関数
 */
export const createLazyComponent = <T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  fallback?: React.ReactNode
) => {
  const LazyComponent = lazy(importFunc);

  return React.forwardRef<any, React.ComponentProps<T>>((props, ref) => (
    <LazySuspense fallback={fallback}>
      <LazyComponent {...props} ref={ref} />
    </LazySuspense>
  ));
};

/**
 * 画像の遅延ローディングコンポーネント
 */
export interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  /** 画像のソースURL */
  src: string;
  /** 代替テキスト */
  alt: string;
  /** プレースホルダー画像のURL */
  placeholder?: string;
  /** Intersection Observer のしきい値 */
  threshold?: number;
  /** Intersection Observer のルートマージン */
  rootMargin?: string;
  /** 読み込み完了時のコールバック */
  onLoad?: () => void;
  /** 読み込みエラー時のコールバック */
  onError?: () => void;
}

/**
 * 画像の遅延ローディングコンポーネント
 */
export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  placeholder,
  threshold = 0.1,
  rootMargin = '50px',
  onLoad,
  onError,
  className = '',
  style,
  ...props
}) => {
  const [imageLoaded, setImageLoaded] = React.useState(false);
  const [imageError, setImageError] = React.useState(false);
  const { elementRef, isVisible } = useLazyLoad(threshold, rootMargin);

  const handleImageLoad = React.useCallback(() => {
    setImageLoaded(true);
    onLoad?.();
  }, [onLoad]);

  const handleImageError = React.useCallback(() => {
    setImageError(true);
    onError?.();
  }, [onError]);

  return (
    <div ref={elementRef} className={`relative overflow-hidden ${className}`} style={style}>
      {/* プレースホルダー */}
      {!imageLoaded && !imageError && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
          {placeholder ? (
            <img src={placeholder} alt="" className="w-full h-full object-cover opacity-50" />
          ) : (
            <div className="text-gray-400">
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          )}
        </div>
      )}

      {/* エラー表示 */}
      {imageError && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
          <div className="text-gray-400 text-center">
            <svg className="w-8 h-8 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-sm">画像を読み込めませんでした</span>
          </div>
        </div>
      )}

      {/* 実際の画像 */}
      {isVisible && (
        <img
          src={src}
          alt={alt}
          onLoad={handleImageLoad}
          onError={handleImageError}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          {...props}
        />
      )}
    </div>
  );
};

/**
 * コンテンツの遅延ローディングコンポーネント
 */
export interface LazyContentProps {
  /** 子要素 */
  children: React.ReactNode;
  /** 最小高さ */
  minHeight?: number;
  /** Intersection Observer のしきい値 */
  threshold?: number;
  /** Intersection Observer のルートマージン */
  rootMargin?: string;
  /** カスタムクラス名 */
  className?: string;
  /** スケルトンローダー */
  skeleton?: React.ReactNode;
}

/**
 * コンテンツの遅延ローディングコンポーネント
 *
 * 重いコンテンツ（チャート、複雑なフォームなど）の遅延ローディングに使用
 */
export const LazyContent: React.FC<LazyContentProps> = ({
  children,
  minHeight = 200,
  threshold = 0.1,
  rootMargin = '100px',
  className = '',
  skeleton,
}) => {
  const { elementRef, isVisible } = useLazyLoad(threshold, rootMargin);

  const defaultSkeleton = (
    <div className="animate-pulse space-y-4">
      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      <div className="h-4 bg-gray-200 rounded w-5/6"></div>
      <div className="h-32 bg-gray-200 rounded"></div>
    </div>
  );

  return (
    <div ref={elementRef} className={className} style={{ minHeight }}>
      {isVisible ? children : skeleton || defaultSkeleton}
    </div>
  );
};

/**
 * メモ化された遅延ローディングコンポーネント
 */
export const MemoizedLazyLoad = React.memo(LazyLoad);
export const MemoizedLazyImage = React.memo(LazyImage);
export const MemoizedLazyContent = React.memo(LazyContent);
