import React from 'react';
import { render, cleanup, screen } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import { vi, afterEach } from 'vitest';
import { TabletLayout, TabletHeader, TabletSplitView } from '../TabletLayout';
import { useResponsive } from '../../../hooks/useResponsive';

// useResponsiveフックのモック
vi.mock('../../../hooks/useResponsive');
const mockUseResponsive = useResponsive as any;

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.clearAllTimers();
});

describe('TabletLayout', () => {
  beforeEach(() => {
    mockUseResponsive.mockReturnValue({
      width: 768,
      height: 1024,
      deviceType: 'tablet',
      orientation: 'portrait',
      pointerType: 'coarse',
      isMobile: false,
      isTablet: true,
      isDesktop: false,
      isPortrait: true,
      isLandscape: false,
      isTouch: true,
      breakpoint: 'md',
    });
  });

  it('タブレット縦向きレイアウトが正しくレンダリングされる', () => {
    render(
      <TabletLayout sidebar={<div>サイドバー</div>}>
        <div>メインコンテンツ</div>
      </TabletLayout>
    );

    expect(screen.getByText('メインコンテンツ')).toBeInTheDocument();
    expect(screen.getByText('サイドバー')).toBeInTheDocument();
    expect(document.querySelector('.tablet-layout-portrait')).toBeInTheDocument();
  });

  it('タブレット横向きレイアウトが正しくレンダリングされる', () => {
    mockUseResponsive.mockReturnValue({
      width: 1024,
      height: 768,
      deviceType: 'tablet',
      orientation: 'landscape',
      pointerType: 'coarse',
      isMobile: false,
      isTablet: true,
      isDesktop: false,
      isPortrait: false,
      isLandscape: true,
      isTouch: true,
      breakpoint: 'lg',
    });

    render(
      <TabletLayout sidebar={<div>サイドバー</div>}>
        <div>メインコンテンツ</div>
      </TabletLayout>
    );

    expect(screen.getByText('メインコンテンツ')).toBeInTheDocument();
    expect(screen.getByText('サイドバー')).toBeInTheDocument();
    expect(document.querySelector('.tablet-layout-landscape')).toBeInTheDocument();
  });

  it('サイドバーの折りたたみが動作する', () => {
    mockUseResponsive.mockReturnValue({
      width: 1024,
      height: 768,
      deviceType: 'tablet',
      orientation: 'landscape',
      pointerType: 'coarse',
      isMobile: false,
      isTablet: true,
      isDesktop: false,
      isPortrait: false,
      isLandscape: true,
      isTouch: true,
      breakpoint: 'lg',
    });

    render(
      <TabletLayout sidebar={<div>サイドバー</div>} collapsibleSidebar>
        <div>メインコンテンツ</div>
      </TabletLayout>
    );

    const toggleButton = screen.getByLabelText('サイドバーを折りたたむ');
    fireEvent.click(toggleButton);

    // 折りたたみ後のラベルが変更される
    expect(screen.getByLabelText('サイドバーを展開')).toBeInTheDocument();
  });

  it('タブレット以外では通常のレイアウトが使用される', () => {
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
      <TabletLayout sidebar={<div>サイドバー</div>}>
        <div>メインコンテンツ</div>
      </TabletLayout>
    );

    expect(document.querySelector('.tablet-layout-portrait')).not.toBeInTheDocument();
    expect(document.querySelector('.tablet-layout-landscape')).not.toBeInTheDocument();
  });
});

describe('TabletHeader', () => {
  it('タイトルとサブタイトルが表示される', () => {
    render(<TabletHeader title="テストタイトル" subtitle="テストサブタイトル" />);

    expect(screen.getByText('テストタイトル')).toBeInTheDocument();
    expect(screen.getByText('テストサブタイトル')).toBeInTheDocument();
  });

  it('パンくずリストが表示される', () => {
    const breadcrumbs = [{ label: 'ホーム', href: '/' }, { label: '現在のページ' }];

    render(<TabletHeader title="テストタイトル" breadcrumbs={breadcrumbs} />);

    expect(screen.getByText('ホーム')).toBeInTheDocument();
    expect(screen.getByText('現在のページ')).toBeInTheDocument();
  });

  it('右側のアクションが表示される', () => {
    const rightActions = [
      <button key="1">アクション1</button>,
      <button key="2">アクション2</button>,
    ];

    render(<TabletHeader title="テストタイトル" rightActions={rightActions} />);

    expect(screen.getByText('アクション1')).toBeInTheDocument();
    expect(screen.getByText('アクション2')).toBeInTheDocument();
  });
});

describe('TabletSplitView', () => {
  it('分割ビューが正しくレンダリングされる', () => {
    render(<TabletSplitView leftPanel={<div>左パネル</div>} rightPanel={<div>右パネル</div>} />);

    expect(screen.getByText('左パネル')).toBeInTheDocument();
    expect(screen.getByText('右パネル')).toBeInTheDocument();
  });

  it('リサイズ可能な分割ビューが動作する', () => {
    render(
      <TabletSplitView leftPanel={<div>左パネル</div>} rightPanel={<div>右パネル</div>} resizable />
    );

    const resizer = document.querySelector('.cursor-col-resize');
    expect(resizer).toBeInTheDocument();
  });

  it('異なる幅比率が適用される', () => {
    const { rerender } = render(
      <TabletSplitView
        leftPanel={<div>左パネル</div>}
        rightPanel={<div>右パネル</div>}
        leftPanelWidth="narrow"
      />
    );

    let leftPanel = screen.getByText('左パネル').parentElement;
    expect(leftPanel).toHaveClass('w-1/3');

    rerender(
      <TabletSplitView
        leftPanel={<div>左パネル</div>}
        rightPanel={<div>右パネル</div>}
        leftPanelWidth="wide"
      />
    );

    leftPanel = screen.getByText('左パネル').parentElement;
    expect(leftPanel).toHaveClass('w-1/2');
  });
});
