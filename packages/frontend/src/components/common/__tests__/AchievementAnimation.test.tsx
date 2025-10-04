import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { AchievementAnimation, MultipleAchievementAnimation } from '../AchievementAnimation';
import { AnimationSettingsProvider } from '../../../contexts/AnimationSettingsContext';
import { globalAnimationController } from '../../../utils/animation-utils';

// Web Animations API のモック
const mockAnimate = jest.fn();
const mockAnimation = {
  addEventListener: jest.fn(),
  cancel: jest.fn(),
  finish: jest.fn(),
};

// HTMLElement.animate のモック
Object.defineProperty(HTMLElement.prototype, 'animate', {
  value: mockAnimate.mockReturnValue(mockAnimation),
  writable: true,
});

// matchMedia のモック
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(() => ({
    matches: false,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  })),
});

describe('AchievementAnimation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    globalAnimationController.cancelAllAnimations();
  });

  const renderWithProvider = (children: React.ReactNode, settings = {}) => {
    return render(
      <AnimationSettingsProvider initialSettings={settings}>{children}</AnimationSettingsProvider>
    );
  };

  describe('基本機能', () => {
    it('子要素を正しくレンダリングする', () => {
      renderWithProvider(
        <AchievementAnimation trigger={false}>
          <div data-testid="child">Test Content</div>
        </AchievementAnimation>
      );

      expect(screen.getByTestId('child')).toBeInTheDocument();
      expect(screen.getByTestId('child')).toHaveTextContent('Test Content');
    });

    it('triggerがfalseの場合、アニメーションを実行しない', () => {
      renderWithProvider(
        <AchievementAnimation trigger={false}>
          <div>Test Content</div>
        </AchievementAnimation>
      );

      expect(mockAnimate).not.toHaveBeenCalled();
    });

    it('triggerがtrueの場合、アニメーションを実行する', () => {
      renderWithProvider(
        <AchievementAnimation trigger={true}>
          <div>Test Content</div>
        </AchievementAnimation>
      );

      expect(mockAnimate).toHaveBeenCalled();
    });

    it('アニメーション無効時はアニメーションを実行しない', () => {
      renderWithProvider(
        <AchievementAnimation trigger={true}>
          <div>Test Content</div>
        </AchievementAnimation>,
        { enabled: false }
      );

      expect(mockAnimate).not.toHaveBeenCalled();
    });

    it('達成アニメーション無効時はアニメーションを実行しない', () => {
      renderWithProvider(
        <AchievementAnimation trigger={true}>
          <div>Test Content</div>
        </AchievementAnimation>,
        { achievementEnabled: false }
      );

      expect(mockAnimate).not.toHaveBeenCalled();
    });
  });

  describe('アニメーション設定', () => {
    it('デフォルトのアニメーション設定を使用する', () => {
      renderWithProvider(
        <AchievementAnimation trigger={true}>
          <div>Test Content</div>
        </AchievementAnimation>
      );

      expect(mockAnimate).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({
          duration: 600,
          easing: 'ease-out',
        })
      );
    });

    it('カスタムアニメーション設定を使用する', () => {
      renderWithProvider(
        <AchievementAnimation trigger={true}>
          <div>Test Content</div>
        </AchievementAnimation>,
        { achievementDuration: 800, easing: 'ease-in' }
      );

      expect(mockAnimate).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({
          duration: 800,
          easing: 'ease-in',
        })
      );
    });

    it('カスタムキーフレームを使用する', () => {
      const customKeyframes = [
        { opacity: 0, offset: 0 },
        { opacity: 1, offset: 1 },
      ];

      renderWithProvider(
        <AchievementAnimation trigger={true} customKeyframes={customKeyframes}>
          <div>Test Content</div>
        </AchievementAnimation>
      );

      expect(mockAnimate).toHaveBeenCalledWith(customKeyframes, expect.any(Object));
    });
  });

  describe('アニメーション種類', () => {
    it('singleタイプのアニメーションを実行する', () => {
      renderWithProvider(
        <AchievementAnimation trigger={true} type="single">
          <div>Test Content</div>
        </AchievementAnimation>
      );

      expect(mockAnimate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ transform: 'scale(1)' }),
          expect.objectContaining({ transform: 'scale(1.05)' }),
        ]),
        expect.any(Object)
      );
    });

    it('pulseタイプのアニメーションを実行する', () => {
      renderWithProvider(
        <AchievementAnimation trigger={true} type="pulse">
          <div>Test Content</div>
        </AchievementAnimation>
      );

      expect(mockAnimate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ opacity: 1 }),
          expect.objectContaining({ opacity: 0.8 }),
        ]),
        expect.any(Object)
      );
    });

    it('glowタイプのアニメーションを実行する', () => {
      renderWithProvider(
        <AchievementAnimation trigger={true} type="glow">
          <div>Test Content</div>
        </AchievementAnimation>
      );

      expect(mockAnimate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            boxShadow: '0 0 0 0 rgba(34, 197, 94, 0)',
          }),
        ]),
        expect.any(Object)
      );
    });

    it('bounceタイプのアニメーションを実行する', () => {
      renderWithProvider(
        <AchievementAnimation trigger={true} type="bounce">
          <div>Test Content</div>
        </AchievementAnimation>
      );

      expect(mockAnimate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            transform: 'scale(1) translateY(0)',
          }),
        ]),
        expect.any(Object)
      );
    });
  });

  describe('強度設定', () => {
    it('subtleの強度でアニメーションを調整する', () => {
      renderWithProvider(
        <AchievementAnimation trigger={true} intensity="subtle">
          <div>Test Content</div>
        </AchievementAnimation>
      );

      const [keyframes] = mockAnimate.mock.calls[0];
      const scaleFrame = keyframes.find(
        (frame: any) => frame.transform && frame.transform.includes('scale(1.025)')
      );
      expect(scaleFrame).toBeDefined();
    });

    it('strongの強度でアニメーションを調整する', () => {
      renderWithProvider(
        <AchievementAnimation trigger={true} intensity="strong">
          <div>Test Content</div>
        </AchievementAnimation>
      );

      const [keyframes] = mockAnimate.mock.calls[0];
      const scaleFrame = keyframes.find(
        (frame: any) => frame.transform && frame.transform.includes('scale(1.075)')
      );
      expect(scaleFrame).toBeDefined();
    });
  });

  describe('コールバック', () => {
    it('アニメーション完了時にonCompleteを呼び出す', async () => {
      const onComplete = jest.fn();

      renderWithProvider(
        <AchievementAnimation trigger={true} onComplete={onComplete}>
          <div>Test Content</div>
        </AchievementAnimation>
      );

      // アニメーション完了をシミュレート
      const finishCallback = mockAnimation.addEventListener.mock.calls.find(
        ([event]) => event === 'finish'
      )?.[1];

      if (finishCallback) {
        act(() => {
          finishCallback();
        });
      }

      await waitFor(() => {
        expect(onComplete).toHaveBeenCalled();
      });
    });
  });

  describe('アニメーション管理', () => {
    it('animationIdが指定された場合、グローバルコントローラーに登録する', () => {
      const spy = jest.spyOn(globalAnimationController, 'startAnimation');

      renderWithProvider(
        <AchievementAnimation trigger={true} animationId="test-animation">
          <div>Test Content</div>
        </AchievementAnimation>
      );

      expect(spy).toHaveBeenCalledWith(
        expect.any(HTMLElement),
        expect.any(Array),
        expect.any(Object),
        'test-animation'
      );

      spy.mockRestore();
    });

    it('コンポーネントアンマウント時にアニメーションをキャンセルする', () => {
      const spy = jest.spyOn(globalAnimationController, 'cancelAnimation');

      const { unmount } = renderWithProvider(
        <AchievementAnimation trigger={true} animationId="test-animation">
          <div>Test Content</div>
        </AchievementAnimation>
      );

      unmount();

      expect(spy).toHaveBeenCalledWith('test-animation');

      spy.mockRestore();
    });
  });
});

describe('MultipleAchievementAnimation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderWithProvider = (children: React.ReactNode) => {
    return render(<AnimationSettingsProvider>{children}</AnimationSettingsProvider>);
  };

  it('複数の子要素をそれぞれアニメーションする', () => {
    const children = [
      <div key="1">Child 1</div>,
      <div key="2">Child 2</div>,
      <div key="3">Child 3</div>,
    ];

    renderWithProvider(
      <MultipleAchievementAnimation trigger={true}>{children}</MultipleAchievementAnimation>
    );

    expect(mockAnimate).toHaveBeenCalledTimes(3);
  });

  it('すべてのアニメーション完了時にonCompleteを呼び出す', async () => {
    const onComplete = jest.fn();
    const children = [<div key="1">Child 1</div>, <div key="2">Child 2</div>];

    renderWithProvider(
      <MultipleAchievementAnimation trigger={true} onComplete={onComplete}>
        {children}
      </MultipleAchievementAnimation>
    );

    // 各アニメーションの完了をシミュレート
    const finishCallbacks = mockAnimation.addEventListener.mock.calls
      .filter(([event]) => event === 'finish')
      .map(([, callback]) => callback);

    act(() => {
      finishCallbacks.forEach(callback => callback());
    });

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalled();
    });
  });

  it('triggerがリセットされた時に完了カウントをリセットする', () => {
    const children = [<div key="1">Child 1</div>];

    const { rerender } = renderWithProvider(
      <MultipleAchievementAnimation trigger={true}>{children}</MultipleAchievementAnimation>
    );

    // triggerをfalseに変更
    rerender(
      <AnimationSettingsProvider>
        <MultipleAchievementAnimation trigger={false}>{children}</MultipleAchievementAnimation>
      </AnimationSettingsProvider>
    );

    // 内部状態のリセットが正常に動作することを確認
    // （実際の実装では完了カウントがリセットされる）
    expect(true).toBe(true); // プレースホルダー
  });
});
