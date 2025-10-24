import React, { useState, useEffect, useRef } from 'react';

/**
 * LazyImageコンポーネントのプロパティ
 */
export interface LazyImageProps {
  /** 画像のソースURL */
  src: string;
  /** 代替テキスト */
  alt: string;
  /** 追加のCSSクラス名 */
  className?: string;
  /** プレースホルダー画像のURL */
  placeholder?: string;
  /** ローディング時に表示するコンポーネント */
  loadingComponent?: React.ReactNode;
  /** エラー時に表示するコンポーネント */
  errorComponent?: React.ReactNode;
  /** 画像読み込み完了時のコールバック */
  onLoad?: () => void;
  /** 画像読み込みエラー時のコールバック */
  onError?: () => void;
}

/**
 * 遅延読み込み画像コンポーネント
 *
 * @description
 * Intersection Observer APIを使用して、画像が表示領域に入ったときに読み込みを開始する。
 * パフォーマンス最適化のために使用される。
 *
 * @example
 * ```tsx
 * <LazyImage
 *   src="/images/profile.jpg"
 *   alt="プロフィール画像"
 *   placeholder="/images/placeholder.jpg"
 *   className="w-32 h-32 rounded-full"
 * />
 * ```
 *
 * 要件: 11.5 - 画像の遅延読み込み
 */
export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  className = '',
  placeholder,
  loadingComponent,
  errorComponent,
  onLoad,
  onError,
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  /**
   * Intersection Observerのセットアップ
   */
  useEffect(() => {
    if (!imgRef.current) return;

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '50px', // 50px手前から読み込み開始
        threshold: 0.01,
      }
    );

    observer.observe(imgRef.current);

    return () => {
      observer.disconnect();
    };
  }, []);

  /**
   * 画像読み込み完了ハンドラー
   */
  const handleLoad = () => {
    setIsLoaded(true);
    setHasError(false);
    if (onLoad) {
      onLoad();
    }
  };

  /**
   * 画像読み込みエラーハンドラー
   */
  const handleError = () => {
    setHasError(true);
    setIsLoaded(false);
    if (onError) {
      onError();
    }
  };

  /**
   * エラー時の表示
   */
  if (hasError) {
    if (errorComponent) {
      return <>{errorComponent}</>;
    }
    return (
      <div
        className={`flex items-center justify-center bg-gray-200 ${className}`}
        role="img"
        aria-label={`${alt}（読み込みエラー）`}
      >
        <svg
          className="w-8 h-8 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
    );
  }

  /**
   * ローディング中の表示
   */
  if (!isLoaded && isInView) {
    if (loadingComponent) {
      return <>{loadingComponent}</>;
    }
    if (placeholder) {
      return (
        <img
          ref={imgRef}
          src={placeholder}
          alt={`${alt}（読み込み中）`}
          className={`${className} blur-sm`}
          aria-busy="true"
        />
      );
    }
    return (
      <div
        className={`flex items-center justify-center bg-gray-200 animate-pulse ${className}`}
        role="img"
        aria-label={`${alt}（読み込み中）`}
        aria-busy="true"
      >
        <svg
          className="w-8 h-8 text-gray-400 animate-spin"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      </div>
    );
  }

  /**
   * メイン画像の表示
   */
  return (
    <img
      ref={imgRef}
      src={isInView ? src : placeholder || ''}
      alt={alt}
      className={`${className} ${isLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
      onLoad={handleLoad}
      onError={handleError}
      loading="lazy"
    />
  );
};
