import React from 'react';

export interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  fallback?: string;
}

/**
 * LazyImage - 遅延読み込み対応の画像コンポーネント
 *
 * loading="lazy"とdecoding="async"属性を自動的に設定し、
 * 画像の遅延読み込みとデコードの最適化を行います。
 *
 * @param src - 画像のURL
 * @param alt - 代替テキスト
 * @param fallback - 読み込み失敗時の代替画像URL
 * @param props - その他のimg要素の属性
 *
 * 要件:
 * - 15.5: 画像やアイコンを表示する THEN 遅延読み込みが適用される
 *
 * @example
 * ```tsx
 * <LazyImage
 *   src="/images/mandala-thumbnail.jpg"
 *   alt="マンダラチャートのサムネイル"
 *   className="w-full h-48 object-cover"
 * />
 * ```
 */
export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  fallback = '/images/placeholder.png',
  onError,
  ...props
}) => {
  const handleError = (event: React.SyntheticEvent<HTMLImageElement, Event>) => {
    // フォールバック画像を設定
    const target = event.currentTarget;
    if (target.src !== fallback) {
      target.src = fallback;
    }

    // カスタムエラーハンドラーを呼び出し
    if (onError) {
      onError(event);
    }
  };

  return (
    <img src={src} alt={alt} loading="lazy" decoding="async" onError={handleError} {...props} />
  );
};

LazyImage.displayName = 'LazyImage';
