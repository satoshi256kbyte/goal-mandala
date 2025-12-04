import React from 'react';
import { render, screen } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import {
  MobileLayout,
  MobileHeader,
  MobileButton,
  MobileCard,
  MobileListItem,
} from '../MobileLayout';
import { useResponsive } from '../../../hooks/useResponsive';

// useResponsiveフックのモック
vi.mock('../../../hooks/useResponsive');
const mockUseResponsive = useResponsive as any;

describe('MobileLayout', () => {
  beforeEach(() => {
    mockUseResponsive.mockReturnValue({
      width: 375,
      height: 667,
      deviceType: 'mobile',
      orientation: 'portrait',
      pointerType: 'coarse',
      isMobile: true,
      isTablet: false,
      isDesktop: false,
      isPortrait: true,
      isLandscape: false,
      isTouch: true,
      breakpoint: 'xs',
    });
  });

  it('モバイルレイアウトが正しくレンダリングされる', () => {
    render(
      <MobileLayout>
        <div>メインコンテンツ</div>
      </MobileLayout>
    );

    expect(screen.getByText('メインコンテンツ')).toBeInTheDocument();
    expect(document.querySelector('.mobile-layout')).toBeInTheDocument();
  });

  it('ヘッダーとフッターが表示される', () => {
    render(
      <MobileLayout header={<div>ヘッダー</div>} footer={<div>フッター</div>}>
        <div>メインコンテンツ</div>
      </MobileLayout>
    );

    expect(screen.getByText('ヘッダー')).toBeInTheDocument();
    expect(screen.getByText('フッター')).toBeInTheDocument();
    expect(screen.getByText('メインコンテンツ')).toBeInTheDocument();
  });

  it('モバイル以外では通常のレイアウトが使用される', () => {
    mockUseResponsive.mockReturnValue({
      width: 1024,
      height: 768,
      deviceType: 'desktop',
      orientation: 'landscape',
      pointerType: 'fine',
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      isPortrait: false,
      isLandscape: true,
      isTouch: false,
      breakpoint: 'lg',
    });

    render(
      <MobileLayout>
        <div>メインコンテンツ</div>
      </MobileLayout>
    );

    expect(document.querySelector('.mobile-layout')).not.toBeInTheDocument();
    expect(screen.getByText('メインコンテンツ')).toBeInTheDocument();
  });
});

describe('MobileHeader', () => {
  beforeEach(() => {
    mockUseResponsive.mockReturnValue({
      width: 375,
      height: 667,
      deviceType: 'mobile',
      orientation: 'portrait',
      pointerType: 'coarse',
      isMobile: true,
      isTablet: false,
      isDesktop: false,
      isPortrait: true,
      isLandscape: false,
      isTouch: true,
      breakpoint: 'xs',
    });
  });

  it('タイトルが表示される', () => {
    render(<MobileHeader title="テストタイトル" />);

    expect(screen.getByText('テストタイトル')).toBeInTheDocument();
  });

  it('サブタイトルが表示される', () => {
    render(<MobileHeader title="テストタイトル" subtitle="テストサブタイトル" />);

    expect(screen.getByText('テストタイトル')).toBeInTheDocument();
    expect(screen.getByText('テストサブタイトル')).toBeInTheDocument();
  });

  it('左右のアクションが表示される', () => {
    render(
      <MobileHeader
        title="テストタイトル"
        leftAction={<button>戻る</button>}
        rightAction={<button>メニュー</button>}
      />
    );

    expect(screen.getByText('戻る')).toBeInTheDocument();
    expect(screen.getByText('メニュー')).toBeInTheDocument();
  });
});

describe('MobileButton', () => {
  it('ボタンがクリックできる', () => {
    const handleClick = vi.fn();
    render(<MobileButton onClick={handleClick}>テストボタン</MobileButton>);

    fireEvent.click(screen.getByText('テストボタン'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('無効化されたボタンはクリックできない', () => {
    const handleClick = vi.fn();
    render(
      <MobileButton onClick={handleClick} disabled>
        無効ボタン
      </MobileButton>
    );

    fireEvent.click(screen.getByText('無効ボタン'));
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('フルワイドボタンが正しいクラスを持つ', () => {
    render(<MobileButton fullWidth>フルワイドボタン</MobileButton>);

    const button = screen.getByText('フルワイドボタン');
    expect(button).toHaveClass('w-full');
  });

  it('異なるバリアントが正しいクラスを持つ', () => {
    const { rerender } = render(<MobileButton variant="primary">プライマリボタン</MobileButton>);

    let button = screen.getByText('プライマリボタン');
    expect(button).toHaveClass('bg-blue-600');

    rerender(<MobileButton variant="secondary">セカンダリボタン</MobileButton>);

    button = screen.getByText('セカンダリボタン');
    expect(button).toHaveClass('bg-gray-600');
  });
});

describe('MobileCard', () => {
  it('カードがクリックできる', () => {
    const handleClick = vi.fn();
    render(
      <MobileCard onClick={handleClick}>
        <div>カードコンテンツ</div>
      </MobileCard>
    );

    fireEvent.click(screen.getByText('カードコンテンツ'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('クリックハンドラーがない場合はdivとしてレンダリングされる', () => {
    render(
      <MobileCard>
        <div>カードコンテンツ</div>
      </MobileCard>
    );

    const card = screen.getByText('カードコンテンツ').closest('div');
    expect(card?.tagName).toBe('DIV');
  });

  it('異なるパディングサイズが適用される', () => {
    const { rerender } = render(
      <MobileCard padding="sm">
        <div>小パディング</div>
      </MobileCard>
    );

    let card = screen.getByText('小パディング').parentElement;
    expect(card).toHaveClass('p-3');

    rerender(
      <MobileCard padding="lg">
        <div>大パディング</div>
      </MobileCard>
    );

    card = screen.getByText('大パディング').parentElement;
    expect(card).toHaveClass('p-6');
  });
});

describe('MobileListItem', () => {
  it('リストアイテムがクリックできる', () => {
    const handleClick = vi.fn();
    render(<MobileListItem onClick={handleClick}>リストアイテム</MobileListItem>);

    fireEvent.click(screen.getByText('リストアイテム'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('左右のアイコンが表示される', () => {
    render(
      <MobileListItem leftIcon={<span>左アイコン</span>} rightIcon={<span>右アイコン</span>}>
        リストアイテム
      </MobileListItem>
    );

    expect(screen.getByText('左アイコン')).toBeInTheDocument();
    expect(screen.getByText('右アイコン')).toBeInTheDocument();
  });

  it('サブタイトルが表示される', () => {
    render(<MobileListItem subtitle="サブタイトル">リストアイテム</MobileListItem>);

    expect(screen.getByText('リストアイテム')).toBeInTheDocument();
    expect(screen.getByText('サブタイトル')).toBeInTheDocument();
  });

  it('クリックハンドラーがない場合はdivとしてレンダリングされる', () => {
    render(<MobileListItem>リストアイテム</MobileListItem>);

    const item = screen.getByText('リストアイテム').closest('div');
    expect(item?.tagName).toBe('DIV');
  });
});
