import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import {
  AnimationSettingsProvider,
  useAnimationSettings,
  useIsAnimationEnabled,
  DEFAULT_ANIMATION_SETTINGS,
} from '../AnimationSettingsContext';

// animation-performanceユーティリティをモック
vi.mock('../../utils/animation-performance', () => ({
  globalPerformanceMonitor: {
    startMonitoring: vi.fn(),
    stopMonitoring: vi.fn(),
  },
  globalInterruptController: {
    interruptAllAnimations: vi.fn(),
    interruptAnimation: vi.fn(),
  },
  globalAdaptiveQuality: {
    startAdaptiveAdjustment: vi.fn(),
    stopAdaptiveAdjustment: vi.fn(),
  },
  globalAccessibilityManager: {
    addCallback: vi.fn(),
    removeCallback: vi.fn(),
    isDisabled: vi.fn(() => false),
  },
}));

// animation-utilsをモック
vi.mock('../../utils/animation-utils', () => ({
  globalAnimationController: {
    cancelAllAnimations: vi.fn(),
    cancelAnimation: vi.fn(),
  },
}));

// テスト用のコンポーネント
const TestComponent: React.FC = () => {
  const {
    settings,
    updateSettings,
    isAnimationEnabled,
    getTransitionStyle,
    getProgressTransitionStyle,
    getColorTransitionStyle,
  } = useAnimationSettings();

  return (
    <div>
      <div data-testid="animation-enabled">{isAnimationEnabled.toString()}</div>
      <div data-testid="progress-duration">{settings.progressDuration}</div>
      <div data-testid="color-duration">{settings.colorDuration}</div>
      <div data-testid="achievement-enabled">{settings.achievementEnabled.toString()}</div>

      <button
        onClick={() => updateSettings({ enabled: !settings.enabled })}
        data-testid="toggle-animation"
      >
        Toggle Animation
      </button>

      <button
        onClick={() => updateSettings({ progressDuration: 500 })}
        data-testid="update-duration"
      >
        Update Duration
      </button>

      <div data-testid="transition-style" style={getTransitionStyle('opacity', 200)}>
        Transition Element
      </div>

      <div data-testid="progress-style" style={getProgressTransitionStyle()}>
        Progress Element
      </div>

      <div data-testid="color-style" style={getColorTransitionStyle()}>
        Color Element
      </div>
    </div>
  );
};

const TestComponentWithHook: React.FC = () => {
  const isEnabled = useIsAnimationEnabled();
  return <div data-testid="hook-enabled">{isEnabled.toString()}</div>;
};

// 不要になったヘルパー関数を削除

describe('AnimationSettingsContext', () => {
  let mockAccessibilityManager: any;

  beforeAll(async () => {
    // 動的importでモックを取得
    const animationPerformance = await import('../../utils/animation-performance');
    mockAccessibilityManager = vi.mocked(animationPerformance.globalAccessibilityManager);
  });

  beforeEach(() => {
    vi.clearAllMocks();
    // デフォルトでは動きを減らす設定は無効
    mockAccessibilityManager.isDisabled.mockReturnValue(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('基本機能', () => {
    it('デフォルト設定で初期化される', () => {
      render(
        <AnimationSettingsProvider>
          <TestComponent />
        </AnimationSettingsProvider>
      );

      expect(screen.getByTestId('animation-enabled')).toHaveTextContent('true');
      expect(screen.getByTestId('progress-duration')).toHaveTextContent('300');
      expect(screen.getByTestId('color-duration')).toHaveTextContent('300');
      expect(screen.getByTestId('achievement-enabled')).toHaveTextContent('true');
    });

    it('初期設定をカスタマイズできる', () => {
      const initialSettings = {
        enabled: false,
        progressDuration: 500,
        colorDuration: 400,
      };

      render(
        <AnimationSettingsProvider initialSettings={initialSettings}>
          <TestComponent />
        </AnimationSettingsProvider>
      );

      expect(screen.getByTestId('animation-enabled')).toHaveTextContent('false');
      expect(screen.getByTestId('progress-duration')).toHaveTextContent('500');
      expect(screen.getByTestId('color-duration')).toHaveTextContent('400');
    });

    it('設定を更新できる', async () => {
      const user = userEvent.setup();

      render(
        <AnimationSettingsProvider>
          <TestComponent />
        </AnimationSettingsProvider>
      );

      // アニメーション有効・無効の切り替え
      await user.click(screen.getByTestId('toggle-animation'));
      expect(screen.getByTestId('animation-enabled')).toHaveTextContent('false');

      // 継続時間の更新
      await user.click(screen.getByTestId('update-duration'));
      expect(screen.getByTestId('progress-duration')).toHaveTextContent('500');
    });
  });

  describe('動きを減らす設定の検出', () => {
    it('システムの動きを減らす設定が有効な場合、アニメーションが無効になる', () => {
      mockAccessibilityManager.isDisabled.mockReturnValue(true);

      render(
        <AnimationSettingsProvider>
          <TestComponent />
        </AnimationSettingsProvider>
      );

      // prefers-reduced-motionが有効な場合、アニメーションは無効になる
      expect(screen.getByTestId('animation-enabled')).toHaveTextContent('false');
    });

    it('respectReducedMotionがfalseの場合、システム設定を無視する', () => {
      mockAccessibilityManager.isDisabled.mockReturnValue(true);

      const initialSettings = {
        respectReducedMotion: false,
      };

      render(
        <AnimationSettingsProvider initialSettings={initialSettings}>
          <TestComponent />
        </AnimationSettingsProvider>
      );

      expect(screen.getByTestId('animation-enabled')).toHaveTextContent('true');
    });

    it('メディアクエリの変更を検出する', async () => {
      let callback: ((disabled: boolean) => void) | undefined;

      mockAccessibilityManager.addCallback.mockImplementation(cb => {
        callback = cb;
      });
      mockAccessibilityManager.isDisabled.mockReturnValue(false);

      render(
        <AnimationSettingsProvider>
          <TestComponent />
        </AnimationSettingsProvider>
      );

      expect(screen.getByTestId('animation-enabled')).toHaveTextContent('true');

      // アクセシビリティ設定の変更をシミュレート
      if (callback) {
        act(() => {
          callback(true);
        });
      }

      await waitFor(() => {
        expect(screen.getByTestId('animation-enabled')).toHaveTextContent('false');
      });
    });
  });

  describe('スタイル生成機能', () => {
    it('アニメーション有効時に適切なトランジションスタイルを生成する', () => {
      render(
        <AnimationSettingsProvider>
          <TestComponent />
        </AnimationSettingsProvider>
      );

      const transitionElement = screen.getByTestId('transition-style');
      const progressElement = screen.getByTestId('progress-style');
      const colorElement = screen.getByTestId('color-style');

      expect(transitionElement).toHaveStyle('transition: opacity 200ms ease-out');
      expect(progressElement).toHaveStyle('transition: width 300ms ease-out');
      expect(colorElement).toHaveStyle(
        'transition: background-color 300ms ease-out, border-color 300ms ease-out, color 300ms ease-out, box-shadow 300ms ease-out'
      );
    });

    it('アニメーション無効時に空のスタイルを生成する', async () => {
      const user = userEvent.setup();

      render(
        <AnimationSettingsProvider>
          <TestComponent />
        </AnimationSettingsProvider>
      );

      // アニメーションを無効にする
      await user.click(screen.getByTestId('toggle-animation'));

      const transitionElement = screen.getByTestId('transition-style');
      const progressElement = screen.getByTestId('progress-style');
      const colorElement = screen.getByTestId('color-style');

      // アニメーション無効時はtransitionプロパティが設定されない（空のオブジェクトが返される）
      expect(transitionElement).not.toHaveStyle('transition: opacity 200ms ease-out');
      expect(progressElement).not.toHaveStyle('transition: width 300ms ease-out');
      expect(colorElement).not.toHaveStyle(
        'transition: background-color 300ms ease-out, border-color 300ms ease-out, color 300ms ease-out, box-shadow 300ms ease-out'
      );
    });
  });

  describe('useIsAnimationEnabled フック', () => {
    it('アニメーション有効状態を正しく返す', () => {
      render(
        <AnimationSettingsProvider>
          <TestComponentWithHook />
        </AnimationSettingsProvider>
      );

      expect(screen.getByTestId('hook-enabled')).toHaveTextContent('true');
    });

    it('動きを減らす設定が有効な場合、falseを返す', () => {
      mockAccessibilityManager.isDisabled.mockReturnValue(true);

      render(
        <AnimationSettingsProvider>
          <TestComponentWithHook />
        </AnimationSettingsProvider>
      );

      // prefers-reduced-motionが有効な場合、falseを返す
      expect(screen.getByTestId('hook-enabled')).toHaveTextContent('false');
    });
  });

  describe('エラーハンドリング', () => {
    it('プロバイダー外でフックを使用するとエラーが発生する', () => {
      // コンソールエラーを抑制
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<TestComponent />);
      }).toThrow('useAnimationSettings must be used within an AnimationSettingsProvider');

      consoleSpy.mockRestore();
    });
  });

  describe('デフォルト設定', () => {
    it('DEFAULT_ANIMATION_SETTINGS が正しい値を持つ', () => {
      expect(DEFAULT_ANIMATION_SETTINGS).toEqual({
        enabled: true,
        progressDuration: 300,
        colorDuration: 300,
        achievementEnabled: true,
        achievementDuration: 600,
        easing: 'ease-out',
        respectReducedMotion: true,
        enablePerformanceMonitoring: true,
        enableAdaptiveQuality: true,
        performanceLevel: 'high',
      });
    });
  });
});
