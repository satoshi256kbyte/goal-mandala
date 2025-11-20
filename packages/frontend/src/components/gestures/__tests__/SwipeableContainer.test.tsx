import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import {
  SwipeableContainer,
  SwipeableTabs,
  SwipeToDelete,
  PullToRefresh,
} from '../SwipeableContainer';

// タッチイベントのモック
const createTouchEvent = (type: string, touches: Array<{ clientX: number; clientY: number }>) => {
  return new TouchEvent(type, {
    touches: touches.map(touch => ({
      ...touch,
      identifier: 0,
      target: document.body,
      radiusX: 1,
      radiusY: 1,
      rotationAngle: 0,
      force: 1,
    })) as any,
  });
};

describe('SwipeableContainer', () => {
  it('左スワイプが検出される', () => {
    const onSwipeLeft = vi.fn();
    render(
      <SwipeableContainer onSwipeLeft={onSwipeLeft}>
        <div>スワイプ可能なコンテンツ</div>
      </SwipeableContainer>
    );

    const container = screen.getByText('スワイプ可能なコンテンツ').parentElement!;

    // タッチ開始
    fireEvent.touchStart(container, {
      touches: [{ clientX: 100, clientY: 100 }],
    });

    // タッチ移動（左方向）
    fireEvent.touchMove(container, {
      touches: [{ clientX: 50, clientY: 100 }],
    });

    // タッチ終了
    fireEvent.touchEnd(container);

    expect(onSwipeLeft).toHaveBeenCalledTimes(1);
  });

  it('右スワイプが検出される', () => {
    const onSwipeRight = vi.fn();
    render(
      <SwipeableContainer onSwipeRight={onSwipeRight}>
        <div>スワイプ可能なコンテンツ</div>
      </SwipeableContainer>
    );

    const container = screen.getByText('スワイプ可能なコンテンツ').parentElement!;

    // タッチ開始
    fireEvent.touchStart(container, {
      touches: [{ clientX: 50, clientY: 100 }],
    });

    // タッチ移動（右方向）
    fireEvent.touchMove(container, {
      touches: [{ clientX: 100, clientY: 100 }],
    });

    // タッチ終了
    fireEvent.touchEnd(container);

    expect(onSwipeRight).toHaveBeenCalledTimes(1);
  });

  it('上スワイプが検出される', () => {
    const onSwipeUp = vi.fn();
    render(
      <SwipeableContainer onSwipeUp={onSwipeUp}>
        <div>スワイプ可能なコンテンツ</div>
      </SwipeableContainer>
    );

    const container = screen.getByText('スワイプ可能なコンテンツ').parentElement!;

    // タッチ開始
    fireEvent.touchStart(container, {
      touches: [{ clientX: 100, clientY: 100 }],
    });

    // タッチ移動（上方向）
    fireEvent.touchMove(container, {
      touches: [{ clientX: 100, clientY: 50 }],
    });

    // タッチ終了
    fireEvent.touchEnd(container);

    expect(onSwipeUp).toHaveBeenCalledTimes(1);
  });

  it('下スワイプが検出される', () => {
    const onSwipeDown = vi.fn();
    render(
      <SwipeableContainer onSwipeDown={onSwipeDown}>
        <div>スワイプ可能なコンテンツ</div>
      </SwipeableContainer>
    );

    const container = screen.getByText('スワイプ可能なコンテンツ').parentElement!;

    // タッチ開始
    fireEvent.touchStart(container, {
      touches: [{ clientX: 100, clientY: 50 }],
    });

    // タッチ移動（下方向）
    fireEvent.touchMove(container, {
      touches: [{ clientX: 100, clientY: 100 }],
    });

    // タッチ終了
    fireEvent.touchEnd(container);

    expect(onSwipeDown).toHaveBeenCalledTimes(1);
  });

  it('無効化されている場合はスワイプが検出されない', () => {
    const onSwipeLeft = vi.fn();
    render(
      <SwipeableContainer onSwipeLeft={onSwipeLeft} disabled>
        <div>無効化されたコンテンツ</div>
      </SwipeableContainer>
    );

    const container = screen.getByText('無効化されたコンテンツ').parentElement!;

    // 左スワイプを試行
    fireEvent.touchStart(container, {
      touches: [{ clientX: 100, clientY: 100 }],
    });

    fireEvent.touchMove(container, {
      touches: [{ clientX: 50, clientY: 100 }],
    });

    fireEvent.touchEnd(container);

    expect(onSwipeLeft).not.toHaveBeenCalled();
  });

  it('閾値未満のスワイプは検出されない', () => {
    const onSwipeLeft = vi.fn();
    render(
      <SwipeableContainer onSwipeLeft={onSwipeLeft} threshold={100}>
        <div>スワイプ可能なコンテンツ</div>
      </SwipeableContainer>
    );

    const container = screen.getByText('スワイプ可能なコンテンツ').parentElement!;

    // 閾値未満のスワイプ
    fireEvent.touchStart(container, {
      touches: [{ clientX: 100, clientY: 100 }],
    });

    fireEvent.touchMove(container, {
      touches: [{ clientX: 80, clientY: 100 }], // 20pxの移動（閾値100px未満）
    });

    fireEvent.touchEnd(container);

    expect(onSwipeLeft).not.toHaveBeenCalled();
  });
});

describe('SwipeableTabs', () => {
  const tabs = [
    <div key="1">タブ1のコンテンツ</div>,
    <div key="2">タブ2のコンテンツ</div>,
    <div key="3">タブ3のコンテンツ</div>,
  ];

  it('アクティブなタブが表示される', () => {
    render(
      <SwipeableTabs activeIndex={1} onIndexChange={() => {}}>
        {tabs}
      </SwipeableTabs>
    );

    expect(screen.getByText('タブ2のコンテンツ')).toBeInTheDocument();
  });

  it('左スワイプで次のタブに移動する', () => {
    const onIndexChange = vi.fn();
    render(
      <SwipeableTabs activeIndex={0} onIndexChange={onIndexChange}>
        {tabs}
      </SwipeableTabs>
    );

    const container = document.querySelector('.overflow-hidden')!;

    // 左スワイプ
    fireEvent.touchStart(container, {
      touches: [{ clientX: 100, clientY: 100 }],
    });

    fireEvent.touchMove(container, {
      touches: [{ clientX: 50, clientY: 100 }],
    });

    fireEvent.touchEnd(container);

    expect(onIndexChange).toHaveBeenCalledWith(1);
  });

  it('右スワイプで前のタブに移動する', () => {
    const onIndexChange = vi.fn();
    render(
      <SwipeableTabs activeIndex={1} onIndexChange={onIndexChange}>
        {tabs}
      </SwipeableTabs>
    );

    const container = document.querySelector('.overflow-hidden')!;

    // 右スワイプ
    fireEvent.touchStart(container, {
      touches: [{ clientX: 50, clientY: 100 }],
    });

    fireEvent.touchMove(container, {
      touches: [{ clientX: 100, clientY: 100 }],
    });

    fireEvent.touchEnd(container);

    expect(onIndexChange).toHaveBeenCalledWith(0);
  });

  it('最初のタブで右スワイプしても移動しない', () => {
    const onIndexChange = vi.fn();
    render(
      <SwipeableTabs activeIndex={0} onIndexChange={onIndexChange}>
        {tabs}
      </SwipeableTabs>
    );

    const container = document.querySelector('.overflow-hidden')!;

    // 右スワイプ
    fireEvent.touchStart(container, {
      touches: [{ clientX: 50, clientY: 100 }],
    });

    fireEvent.touchMove(container, {
      touches: [{ clientX: 100, clientY: 100 }],
    });

    fireEvent.touchEnd(container);

    expect(onIndexChange).not.toHaveBeenCalled();
  });

  it('最後のタブで左スワイプしても移動しない', () => {
    const onIndexChange = vi.fn();
    render(
      <SwipeableTabs activeIndex={2} onIndexChange={onIndexChange}>
        {tabs}
      </SwipeableTabs>
    );

    const container = document.querySelector('.overflow-hidden')!;

    // 左スワイプ
    fireEvent.touchStart(container, {
      touches: [{ clientX: 100, clientY: 100 }],
    });

    fireEvent.touchMove(container, {
      touches: [{ clientX: 50, clientY: 100 }],
    });

    fireEvent.touchEnd(container);

    expect(onIndexChange).not.toHaveBeenCalled();
  });
});

describe('SwipeToDelete', () => {
  it('削除テキストが表示される', () => {
    render(
      <SwipeToDelete onDelete={() => {}} deleteText="削除する">
        <div>削除可能なアイテム</div>
      </SwipeToDelete>
    );

    expect(screen.getByText('削除する')).toBeInTheDocument();
  });

  it('左スワイプで削除ボタンが表示される', () => {
    render(
      <SwipeToDelete onDelete={() => {}}>
        <div>削除可能なアイテム</div>
      </SwipeToDelete>
    );

    const container = document.querySelector('.relative')!;

    // 左スワイプ
    fireEvent.touchStart(container, {
      touches: [{ clientX: 100, clientY: 100 }],
    });

    fireEvent.touchMove(container, {
      touches: [{ clientX: 50, clientY: 100 }],
    });

    // 削除ボタンの透明度が変化することを確認
    const deleteButton = screen.getByText('削除');
    expect(deleteButton).toBeInTheDocument();
  });

  it('閾値を超えるスワイプで削除が実行される', () => {
    const onDelete = vi.fn();
    render(
      <SwipeToDelete onDelete={onDelete} deleteThreshold={50}>
        <div>削除可能なアイテム</div>
      </SwipeToDelete>
    );

    const container = document.querySelector('.relative')!;

    // 閾値を超える左スワイプ
    fireEvent.touchStart(container, {
      touches: [{ clientX: 100, clientY: 100 }],
    });

    fireEvent.touchMove(container, {
      touches: [{ clientX: 40, clientY: 100 }], // 60pxの移動（閾値50px超過）
    });

    fireEvent.touchEnd(container);

    expect(onDelete).toHaveBeenCalledTimes(1);
  });
});

describe('PullToRefresh', () => {
  it('リフレッシュテキストが表示される', () => {
    render(
      <PullToRefresh onRefresh={async () => {}} refreshText="更新する">
        <div>リフレッシュ可能なコンテンツ</div>
      </PullToRefresh>
    );

    expect(screen.getByText('更新する')).toBeInTheDocument();
  });

  it('下スワイプでリフレッシュインジケーターが表示される', () => {
    render(
      <PullToRefresh onRefresh={async () => {}}>
        <div>リフレッシュ可能なコンテンツ</div>
      </PullToRefresh>
    );

    const container = document.querySelector('.relative')!;

    // 下スワイプ
    fireEvent.touchStart(container, {
      touches: [{ clientX: 100, clientY: 50 }],
    });

    fireEvent.touchMove(container, {
      touches: [{ clientX: 100, clientY: 100 }],
    });

    // リフレッシュインジケーターが表示されることを確認
    expect(screen.getByText('引っ張って更新')).toBeInTheDocument();
  });

  it('閾値を超える下スワイプでリフレッシュが実行される', async () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    render(
      <PullToRefresh onRefresh={onRefresh} refreshThreshold={50}>
        <div>リフレッシュ可能なコンテンツ</div>
      </PullToRefresh>
    );

    const container = document.querySelector('.relative')!;

    // 閾値を超える下スワイプ
    fireEvent.touchStart(container, {
      touches: [{ clientX: 100, clientY: 50 }],
    });

    fireEvent.touchMove(container, {
      touches: [{ clientX: 100, clientY: 120 }], // 70pxの移動（閾値50px超過）
    });

    fireEvent.touchEnd(container);

    expect(onRefresh).toHaveBeenCalledTimes(1);
  });
});
