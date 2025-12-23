import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LazyImage } from '../LazyImage';

describe('LazyImage', () => {
  describe('基本機能', () => {
    it('should render image with src and alt', () => {
      render(<LazyImage src="/test-image.jpg" alt="Test Image" />);

      const img = screen.getByAltText('Test Image');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', '/test-image.jpg');
    });

    it('should have loading="lazy" attribute', () => {
      render(<LazyImage src="/test-image.jpg" alt="Test Image" />);

      const img = screen.getByAltText('Test Image');
      expect(img).toHaveAttribute('loading', 'lazy');
    });

    it('should have decoding="async" attribute', () => {
      render(<LazyImage src="/test-image.jpg" alt="Test Image" />);

      const img = screen.getByAltText('Test Image');
      expect(img).toHaveAttribute('decoding', 'async');
    });

    it('should apply custom className', () => {
      render(<LazyImage src="/test-image.jpg" alt="Test Image" className="custom-class" />);

      const img = screen.getByAltText('Test Image');
      expect(img).toHaveClass('custom-class');
    });

    it('should apply custom width and height', () => {
      render(<LazyImage src="/test-image.jpg" alt="Test Image" width={200} height={150} />);

      const img = screen.getByAltText('Test Image');
      expect(img).toHaveAttribute('width', '200');
      expect(img).toHaveAttribute('height', '150');
    });
  });

  describe('エラーハンドリング', () => {
    it('should use fallback image on error', () => {
      render(
        <LazyImage src="/invalid-image.jpg" alt="Test Image" fallback="/fallback-image.jpg" />
      );

      const img = screen.getByAltText('Test Image') as HTMLImageElement;

      // エラーイベントをトリガー
      fireEvent.error(img);

      expect(img.src).toContain('/fallback-image.jpg');
    });

    it('should use default fallback when not provided', () => {
      render(<LazyImage src="/invalid-image.jpg" alt="Test Image" />);

      const img = screen.getByAltText('Test Image') as HTMLImageElement;

      // エラーイベントをトリガー
      fireEvent.error(img);

      expect(img.src).toContain('/images/placeholder.png');
    });

    it('should call custom onError handler', () => {
      const onError = vi.fn();
      render(<LazyImage src="/invalid-image.jpg" alt="Test Image" onError={onError} />);

      const img = screen.getByAltText('Test Image');

      // エラーイベントをトリガー
      fireEvent.error(img);

      expect(onError).toHaveBeenCalled();
    });

    it('should not set fallback if already using fallback', () => {
      const fallback = '/fallback-image.jpg';
      render(<LazyImage src="/invalid-image.jpg" alt="Test Image" fallback={fallback} />);

      const img = screen.getByAltText('Test Image') as HTMLImageElement;

      // 最初のエラー
      fireEvent.error(img);
      expect(img.src).toContain(fallback);

      // フォールバック画像のエラー（無限ループを防ぐ）
      const currentSrc = img.src;
      fireEvent.error(img);
      expect(img.src).toBe(currentSrc); // srcが変わらないことを確認
    });
  });

  describe('アクセシビリティ', () => {
    it('should have alt attribute', () => {
      render(<LazyImage src="/test-image.jpg" alt="Accessible Image" />);

      const img = screen.getByAltText('Accessible Image');
      expect(img).toHaveAttribute('alt', 'Accessible Image');
    });

    it('should support aria-label', () => {
      render(<LazyImage src="/test-image.jpg" alt="Test Image" aria-label="Custom Label" />);

      const img = screen.getByAltText('Test Image');
      expect(img).toHaveAttribute('aria-label', 'Custom Label');
    });

    it('should support role attribute', () => {
      render(<LazyImage src="/test-image.jpg" alt="Test Image" role="presentation" />);

      const img = screen.getByAltText('Test Image');
      expect(img).toHaveAttribute('role', 'presentation');
    });
  });

  describe('エッジケース', () => {
    it('should handle empty src', () => {
      render(<LazyImage src="" alt="Empty Source" />);

      const img = screen.getByAltText('Empty Source');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', '');
    });

    it('should handle special characters in alt', () => {
      const altText = 'Image with "quotes" and <tags>';
      render(<LazyImage src="/test-image.jpg" alt={altText} />);

      const img = screen.getByAltText(altText);
      expect(img).toBeInTheDocument();
    });

    it('should handle data URLs', () => {
      const dataUrl =
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      render(<LazyImage src={dataUrl} alt="Data URL Image" />);

      const img = screen.getByAltText('Data URL Image');
      expect(img).toHaveAttribute('src', dataUrl);
    });

    it('should handle long URLs', () => {
      const longUrl =
        '/very/long/path/to/image/with/many/segments/image.jpg?param1=value1&param2=value2&param3=value3';
      render(<LazyImage src={longUrl} alt="Long URL Image" />);

      const img = screen.getByAltText('Long URL Image');
      expect(img).toHaveAttribute('src', longUrl);
    });
  });
});
