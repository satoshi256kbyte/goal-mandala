import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LazyLoad, LazyImage, LazyContent } from '../LazyLoad';

// useLazyLoadフックのモック
vi.mock('../../../utils/performance', () => ({
  useLazyLoad: vi.fn(),
}));

import { useLazyLoad } from '../../../utils/performance';

describe('LazyLoad', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('基本機能', () => {
    it('子要素が表示される前にプレースホルダーを表示する', () => {
      vi.mocked(useLazyLoad).mockReturnValue({
        elementRef: { current: null },
        isVisible: false,
        hasLoaded: false,
      });

      render(
        <LazyLoad>
          <div>コンテンツ</div>
        </LazyLoad>
      );

      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByLabelText('読み込み待機中')).toBeInTheDocument();
      expect(screen.queryByText('コンテンツ')).not.toBeInTheDocument();
    });

    it('要素が表示されると子要素をレンダリングする', () => {
      vi.mocked(useLazyLoad).mockReturnValue({
        elementRef: { current: null },
        isVisible: true,
        hasLoaded: true,
      });

      render(
        <LazyLoad>
          <div>コンテンツ</div>
        </LazyLoad>
      );

      expect(screen.getByText('コンテンツ')).toBeInTheDocument();
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    it('カスタムfallbackを表示する', () => {
      vi.mocked(useLazyLoad).mockReturnValue({
        elementRef: { current: null },
        isVisible: false,
        hasLoaded: false,
      });

      render(
        <LazyLoad fallback={<div>カスタムローディング</div>}>
          <div>コンテンツ</div>
        </LazyLoad>
      );

      expect(screen.getByText('カスタムローディング')).toBeInTheDocument();
    });

    it('classNameを適用する', () => {
      vi.mocked(useLazyLoad).mockReturnValue({
        elementRef: { current: null },
        isVisible: false,
        hasLoaded: false,
      });

      const { container } = render(
        <LazyLoad className="custom-class">
          <div>コンテンツ</div>
        </LazyLoad>
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('高さと幅を設定する', () => {
      vi.mocked(useLazyLoad).mockReturnValue({
        elementRef: { current: null },
        isVisible: false,
        hasLoaded: false,
      });

      const { container } = render(
        <LazyLoad height={200} width="100%">
          <div>コンテンツ</div>
        </LazyLoad>
      );

      const element = container.firstChild as HTMLElement;
      expect(element.style.height).toBe('200px');
      expect(element.style.width).toBe('100%');
    });
  });

  describe('コールバック', () => {
    it('読み込み完了時にonLoadコールバックを呼び出す', async () => {
      const onLoad = vi.fn();

      // 初期状態: 非表示
      vi.mocked(useLazyLoad).mockReturnValue({
        elementRef: { current: null },
        isVisible: false,
        hasLoaded: false,
      });

      const { rerender } = render(
        <LazyLoad onLoad={onLoad}>
          <div>コンテンツ</div>
        </LazyLoad>
      );

      expect(onLoad).not.toHaveBeenCalled();

      // 読み込み完了
      vi.mocked(useLazyLoad).mockReturnValue({
        elementRef: { current: null },
        isVisible: true,
        hasLoaded: true,
      });

      rerender(
        <LazyLoad onLoad={onLoad}>
          <div>コンテンツ</div>
        </LazyLoad>
      );

      await waitFor(() => {
        expect(onLoad).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Intersection Observerオプション', () => {
    it('カスタムthresholdを使用する', () => {
      vi.mocked(useLazyLoad).mockReturnValue({
        elementRef: { current: null },
        isVisible: false,
        hasLoaded: false,
      });

      render(
        <LazyLoad threshold={0.5}>
          <div>コンテンツ</div>
        </LazyLoad>
      );

      expect(useLazyLoad).toHaveBeenCalledWith(0.5, '50px');
    });

    it('カスタムrootMarginを使用する', () => {
      vi.mocked(useLazyLoad).mockReturnValue({
        elementRef: { current: null },
        isVisible: false,
        hasLoaded: false,
      });

      render(
        <LazyLoad rootMargin="100px">
          <div>コンテンツ</div>
        </LazyLoad>
      );

      expect(useLazyLoad).toHaveBeenCalledWith(0.1, '100px');
    });
  });

  describe('エッジケース', () => {
    it('空の子要素を処理する', () => {
      vi.mocked(useLazyLoad).mockReturnValue({
        elementRef: { current: null },
        isVisible: true,
        hasLoaded: true,
      });

      const { container } = render(<LazyLoad>{null}</LazyLoad>);

      expect(container.firstChild).toBeInTheDocument();
    });

    it('複数の子要素を処理する', () => {
      vi.mocked(useLazyLoad).mockReturnValue({
        elementRef: { current: null },
        isVisible: true,
        hasLoaded: true,
      });

      render(
        <LazyLoad>
          <div>コンテンツ1</div>
          <div>コンテンツ2</div>
          <div>コンテンツ3</div>
        </LazyLoad>
      );

      expect(screen.getByText('コンテンツ1')).toBeInTheDocument();
      expect(screen.getByText('コンテンツ2')).toBeInTheDocument();
      expect(screen.getByText('コンテンツ3')).toBeInTheDocument();
    });

    it('ネストされた要素を処理する', () => {
      vi.mocked(useLazyLoad).mockReturnValue({
        elementRef: { current: null },
        isVisible: true,
        hasLoaded: true,
      });

      render(
        <LazyLoad>
          <div>
            <span>ネスト1</span>
            <div>
              <span>ネスト2</span>
            </div>
          </div>
        </LazyLoad>
      );

      expect(screen.getByText('ネスト1')).toBeInTheDocument();
      expect(screen.getByText('ネスト2')).toBeInTheDocument();
    });
  });
});

describe('LazyImage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('基本機能', () => {
    it('画像が表示される前にプレースホルダーを表示する', () => {
      vi.mocked(useLazyLoad).mockReturnValue({
        elementRef: { current: null },
        isVisible: false,
        hasLoaded: false,
      });

      render(<LazyImage src="/test.jpg" alt="テスト画像" />);

      expect(screen.queryByAltText('テスト画像')).not.toBeInTheDocument();
    });

    it('要素が表示されると画像をレンダリングする', () => {
      vi.mocked(useLazyLoad).mockReturnValue({
        elementRef: { current: null },
        isVisible: true,
        hasLoaded: false,
      });

      render(<LazyImage src="/test.jpg" alt="テスト画像" />);

      expect(screen.getByAltText('テスト画像')).toBeInTheDocument();
    });

    it('画像読み込み完了時にonLoadコールバックを呼び出す', () => {
      const onLoad = vi.fn();

      vi.mocked(useLazyLoad).mockReturnValue({
        elementRef: { current: null },
        isVisible: true,
        hasLoaded: false,
      });

      render(<LazyImage src="/test.jpg" alt="テスト画像" onLoad={onLoad} />);

      const img = screen.getByAltText('テスト画像');
      img.dispatchEvent(new Event('load'));

      expect(onLoad).toHaveBeenCalledTimes(1);
    });

    it('画像読み込みエラー時にonErrorコールバックを呼び出す', () => {
      const onError = vi.fn();

      vi.mocked(useLazyLoad).mockReturnValue({
        elementRef: { current: null },
        isVisible: true,
        hasLoaded: false,
      });

      render(<LazyImage src="/test.jpg" alt="テスト画像" onError={onError} />);

      const img = screen.getByAltText('テスト画像');
      img.dispatchEvent(new Event('error'));

      expect(onError).toHaveBeenCalledTimes(1);
    });

    it('画像読み込みエラー時にエラーメッセージを表示する', async () => {
      vi.mocked(useLazyLoad).mockReturnValue({
        elementRef: { current: null },
        isVisible: true,
        hasLoaded: false,
      });

      render(<LazyImage src="/test.jpg" alt="テスト画像" />);

      const img = screen.getByAltText('テスト画像');
      img.dispatchEvent(new Event('error'));

      await waitFor(() => {
        expect(screen.getByText('画像を読み込めませんでした')).toBeInTheDocument();
      });
    });
  });

  describe('プレースホルダー', () => {
    it('カスタムプレースホルダー画像を表示する', () => {
      vi.mocked(useLazyLoad).mockReturnValue({
        elementRef: { current: null },
        isVisible: false,
        hasLoaded: false,
      });

      render(<LazyImage src="/test.jpg" alt="テスト画像" placeholder="/placeholder.jpg" />);

      const placeholder = screen.getByAltText('');
      expect(placeholder).toHaveAttribute('src', '/placeholder.jpg');
    });
  });

  describe('エッジケース', () => {
    it('空のsrcを処理する', () => {
      vi.mocked(useLazyLoad).mockReturnValue({
        elementRef: { current: null },
        isVisible: true,
        hasLoaded: false,
      });

      render(<LazyImage src="" alt="テスト画像" />);

      expect(screen.getByAltText('テスト画像')).toHaveAttribute('src', '');
    });

    it('特殊文字を含むsrcを処理する', () => {
      vi.mocked(useLazyLoad).mockReturnValue({
        elementRef: { current: null },
        isVisible: true,
        hasLoaded: false,
      });

      const src = '/test image with spaces.jpg?param=value&other=123';
      render(<LazyImage src={src} alt="テスト画像" />);

      expect(screen.getByAltText('テスト画像')).toHaveAttribute('src', src);
    });
  });
});

describe('LazyContent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('基本機能', () => {
    it('コンテンツが表示される前にスケルトンを表示する', () => {
      vi.mocked(useLazyLoad).mockReturnValue({
        elementRef: { current: null },
        isVisible: false,
        hasLoaded: false,
      });

      const { container } = render(
        <LazyContent>
          <div>コンテンツ</div>
        </LazyContent>
      );

      expect(screen.queryByText('コンテンツ')).not.toBeInTheDocument();
      expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
    });

    it('要素が表示されるとコンテンツをレンダリングする', () => {
      vi.mocked(useLazyLoad).mockReturnValue({
        elementRef: { current: null },
        isVisible: true,
        hasLoaded: true,
      });

      render(
        <LazyContent>
          <div>コンテンツ</div>
        </LazyContent>
      );

      expect(screen.getByText('コンテンツ')).toBeInTheDocument();
    });

    it('カスタムスケルトンを表示する', () => {
      vi.mocked(useLazyLoad).mockReturnValue({
        elementRef: { current: null },
        isVisible: false,
        hasLoaded: false,
      });

      render(
        <LazyContent skeleton={<div>カスタムスケルトン</div>}>
          <div>コンテンツ</div>
        </LazyContent>
      );

      expect(screen.getByText('カスタムスケルトン')).toBeInTheDocument();
    });

    it('最小高さを設定する', () => {
      vi.mocked(useLazyLoad).mockReturnValue({
        elementRef: { current: null },
        isVisible: false,
        hasLoaded: false,
      });

      const { container } = render(
        <LazyContent minHeight={300}>
          <div>コンテンツ</div>
        </LazyContent>
      );

      const element = container.firstChild as HTMLElement;
      expect(element.style.minHeight).toBe('300px');
    });

    it('classNameを適用する', () => {
      vi.mocked(useLazyLoad).mockReturnValue({
        elementRef: { current: null },
        isVisible: false,
        hasLoaded: false,
      });

      const { container } = render(
        <LazyContent className="custom-class">
          <div>コンテンツ</div>
        </LazyContent>
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('Intersection Observerオプション', () => {
    it('カスタムthresholdを使用する', () => {
      vi.mocked(useLazyLoad).mockReturnValue({
        elementRef: { current: null },
        isVisible: false,
        hasLoaded: false,
      });

      render(
        <LazyContent threshold={0.5}>
          <div>コンテンツ</div>
        </LazyContent>
      );

      expect(useLazyLoad).toHaveBeenCalledWith(0.5, '100px');
    });

    it('カスタムrootMarginを使用する', () => {
      vi.mocked(useLazyLoad).mockReturnValue({
        elementRef: { current: null },
        isVisible: false,
        hasLoaded: false,
      });

      render(
        <LazyContent rootMargin="200px">
          <div>コンテンツ</div>
        </LazyContent>
      );

      expect(useLazyLoad).toHaveBeenCalledWith(0.1, '200px');
    });
  });

  describe('エッジケース', () => {
    it('空のコンテンツを処理する', () => {
      vi.mocked(useLazyLoad).mockReturnValue({
        elementRef: { current: null },
        isVisible: true,
        hasLoaded: true,
      });

      const { container } = render(<LazyContent>{null}</LazyContent>);

      expect(container.firstChild).toBeInTheDocument();
    });

    it('複雑なコンテンツを処理する', () => {
      vi.mocked(useLazyLoad).mockReturnValue({
        elementRef: { current: null },
        isVisible: true,
        hasLoaded: true,
      });

      render(
        <LazyContent>
          <div>
            <h1>タイトル</h1>
            <p>段落1</p>
            <p>段落2</p>
            <ul>
              <li>アイテム1</li>
              <li>アイテム2</li>
            </ul>
          </div>
        </LazyContent>
      );

      expect(screen.getByText('タイトル')).toBeInTheDocument();
      expect(screen.getByText('段落1')).toBeInTheDocument();
      expect(screen.getByText('段落2')).toBeInTheDocument();
      expect(screen.getByText('アイテム1')).toBeInTheDocument();
      expect(screen.getByText('アイテム2')).toBeInTheDocument();
    });
  });
});
