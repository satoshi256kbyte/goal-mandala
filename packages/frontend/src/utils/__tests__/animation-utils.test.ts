/**
import { vi } from 'vitest';
 * アニメーションユーティリティ関数の単体テスト
 * 要件4.1, 4.2, 4.3, 4.4, 4.5に対応
 */

import {
  ANIMATION_CONFIGS,
  createTransition,
  createProgressTransition,
  createColorTransition,
  createAchievementAnimation,
  AnimationController,
  IntegratedAnimationController,
  globalAnimationController,
  ACHIEVEMENT_KEYFRAMES,
  PULSE_KEYFRAMES,
  FADE_IN_KEYFRAMES,
  SCALE_KEYFRAMES,
  PERFORMANCE_LEVEL_OPTIONS,
  isReducedMotionPreferred,
  getAccessibilitySettings,
  adjustAnimationForPerformance,
  createStaggeredAnimation,
  getOptimalAnimationSettings,
} from '../animation-utils';

// Web Animations API のモック
const mockAnimation = {
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  cancel: vi.fn(),
  finish: vi.fn(),
  play: vi.fn(),
  pause: vi.fn(),
  currentTime: 0,
  playbackRate: 1,
  playState: 'running' as AnimationPlayState,
};

// HTMLElement.animate のモック
HTMLElement.prototype.animate = vi.fn().mockReturnValue(mockAnimation);

// matchMedia のモック
const mockMatchMedia = (matches: boolean) => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(() => ({
      matches,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  });
};

// navigator のモック
Object.defineProperty(navigator, 'deviceMemory', {
  value: 4,
  writable: true,
});
Object.defineProperty(navigator, 'hardwareConcurrency', {
  value: 4,
  writable: true,
});

describe('アニメーションユーティリティ関数', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMatchMedia(false);
  });

  describe('基本設定とキーフレーム', () => {
    it('ANIMATION_CONFIGS が正しく定義されている', () => {
      expect(ANIMATION_CONFIGS.progressChange).toEqual({
        duration: 300,
        easing: 'ease-out',
      });

      expect(ANIMATION_CONFIGS.colorChange).toEqual({
        duration: 300,
        easing: 'ease-in-out',
      });

      expect(ANIMATION_CONFIGS.achievement).toEqual({
        duration: 600,
        easing: 'ease-out',
      });

      expect(ANIMATION_CONFIGS.fast).toEqual({
        duration: 150,
        easing: 'ease-out',
      });

      expect(ANIMATION_CONFIGS.slow).toEqual({
        duration: 500,
        easing: 'ease-in-out',
      });
    });

    it('キーフレームが正しく定義されている', () => {
      // 達成アニメーションキーフレーム
      expect(ACHIEVEMENT_KEYFRAMES).toHaveLength(3);
      expect(ACHIEVEMENT_KEYFRAMES[0]).toEqual({
        transform: 'scale(1)',
        boxShadow: '0 0 0 0 rgba(34, 197, 94, 0.7)',
        offset: 0,
      });
      expect(ACHIEVEMENT_KEYFRAMES[1]).toEqual({
        transform: 'scale(1.05)',
        boxShadow: '0 0 20px 10px rgba(34, 197, 94, 0.4)',
        offset: 0.5,
      });
      expect(ACHIEVEMENT_KEYFRAMES[2]).toEqual({
        transform: 'scale(1)',
        boxShadow: '0 0 0 0 rgba(34, 197, 94, 0)',
        offset: 1,
      });

      // パルスアニメーションキーフレーム
      expect(PULSE_KEYFRAMES).toHaveLength(3);
      expect(PULSE_KEYFRAMES[0]).toEqual({ opacity: 1, offset: 0 });
      expect(PULSE_KEYFRAMES[1]).toEqual({ opacity: 0.7, offset: 0.5 });
      expect(PULSE_KEYFRAMES[2]).toEqual({ opacity: 1, offset: 1 });

      // フェードインアニメーションキーフレーム
      expect(FADE_IN_KEYFRAMES).toHaveLength(2);
      expect(FADE_IN_KEYFRAMES[0]).toEqual({ opacity: 0, offset: 0 });
      expect(FADE_IN_KEYFRAMES[1]).toEqual({ opacity: 1, offset: 1 });

      // スケールアニメーションキーフレーム
      expect(SCALE_KEYFRAMES).toHaveLength(2);
      expect(SCALE_KEYFRAMES[0]).toEqual({ transform: 'scale(0.95)', offset: 0 });
      expect(SCALE_KEYFRAMES[1]).toEqual({ transform: 'scale(1)', offset: 1 });
    });
  });

  describe('トランジション生成関数', () => {
    it('createTransition が正しいCSS文字列を生成する', () => {
      const properties = ['opacity', 'transform'];
      const config = { duration: 300, easing: 'ease-out' };

      const result = createTransition(properties, config);
      expect(result).toBe('opacity 300ms ease-out, transform 300ms ease-out');
    });

    it('createTransition が遅延付きで正しいCSS文字列を生成する', () => {
      const properties = ['opacity'];
      const config = { duration: 300, easing: 'ease-out', delay: 100 };

      const result = createTransition(properties, config);
      expect(result).toBe('opacity 300ms ease-out 100ms');
    });

    it('createProgressTransition が正しいスタイルオブジェクトを生成する', () => {
      const result = createProgressTransition(400, 'ease-in');
      expect(result).toEqual({
        transition: 'width 400ms ease-in',
      });
    });

    it('createProgressTransition がデフォルト値で正しく動作する', () => {
      const result = createProgressTransition();
      expect(result).toEqual({
        transition: 'width 300ms ease-out',
      });
    });

    it('createColorTransition が正しいスタイルオブジェクトを生成する', () => {
      const result = createColorTransition(250, 'ease-in-out');
      expect(result.transition).toContain('background-color 250ms ease-in-out');
      expect(result.transition).toContain('border-color 250ms ease-in-out');
      expect(result.transition).toContain('color 250ms ease-in-out');
      expect(result.transition).toContain('box-shadow 250ms ease-in-out');
    });

    it('createAchievementAnimation が正しいスタイルオブジェクトを生成する', () => {
      const result = createAchievementAnimation(800);
      expect(result).toEqual({
        animation: 'achievement-pulse 800ms ease-out',
      });
    });
  });

  describe('AnimationController', () => {
    let controller: AnimationController;
    let mockElement: HTMLElement;

    beforeEach(() => {
      controller = new AnimationController();
      mockElement = document.createElement('div');
      mockElement.animate = vi.fn().mockReturnValue(mockAnimation);
    });

    afterEach(() => {
      controller.cleanup();
    });

    it('アニメーションを開始できる', () => {
      const keyframes = [{ opacity: 0 }, { opacity: 1 }];
      const options = { duration: 300 };

      const animation = controller.startAnimation(
        mockElement,
        keyframes,
        options,
        'test-animation'
      );

      expect(animation).toBe(mockAnimation);
      expect(mockElement.animate).toHaveBeenCalledWith(keyframes, options);
      expect(controller.getActiveAnimationCount()).toBe(1);
      expect(controller.getActiveAnimationIds()).toContain('test-animation');
    });

    it('同じIDのアニメーションを開始すると既存のアニメーションが中断される', () => {
      const keyframes = [{ opacity: 0 }, { opacity: 1 }];
      const options = { duration: 300 };

      controller.startAnimation(mockElement, keyframes, options, 'test-animation');
      controller.startAnimation(mockElement, keyframes, options, 'test-animation');

      expect(mockAnimation.cancel).toHaveBeenCalled();
      expect(controller.getActiveAnimationCount()).toBe(1);
    });

    it('特定のアニメーションを中断できる', () => {
      const keyframes = [{ opacity: 0 }, { opacity: 1 }];
      const options = { duration: 300 };

      controller.startAnimation(mockElement, keyframes, options, 'test-animation');
      controller.cancelAnimation('test-animation');

      expect(mockAnimation.cancel).toHaveBeenCalled();
      expect(controller.getActiveAnimationCount()).toBe(0);
    });

    it('すべてのアニメーションを中断できる', () => {
      const keyframes = [{ opacity: 0 }, { opacity: 1 }];
      const options = { duration: 300 };

      controller.startAnimation(mockElement, keyframes, options, 'test-1');
      controller.startAnimation(mockElement, keyframes, options, 'test-2');

      expect(controller.getActiveAnimationCount()).toBe(2);

      controller.cancelAllAnimations();

      expect(controller.getActiveAnimationCount()).toBe(0);
    });

    it('特定の種類のアニメーションを中断できる', () => {
      const keyframes = [{ opacity: 0 }, { opacity: 1 }];
      const options = { duration: 300 };

      controller.startAnimation(mockElement, keyframes, options, 'progress-animation-1');
      controller.startAnimation(mockElement, keyframes, options, 'progress-animation-2');
      controller.startAnimation(mockElement, keyframes, options, 'achievement-animation-1');

      expect(controller.getActiveAnimationCount()).toBe(3);

      controller.cancelAnimationsByType('progress');

      expect(controller.getActiveAnimationCount()).toBe(1);
      expect(controller.getActiveAnimationIds()).toContain('achievement-animation-1');
    });

    it('中断コールバックが正しく呼ばれる', () => {
      const keyframes = [{ opacity: 0 }, { opacity: 1 }];
      const options = { duration: 300 };
      const onInterrupt = vi.fn();

      // モックアニメーションのcancelイベントをトリガーするように設定
      const mockAnimationWithCancel = {
        ...mockAnimation,
        cancel: vi.fn(() => {
          // cancelイベントリスナーを手動でトリガー
          const cancelEvent = new Event('cancel');
          mockAnimationWithCancel.addEventListener.mock.calls.forEach(([event, handler]) => {
            if (event === 'cancel') {
              handler(cancelEvent);
            }
          });
        }),
      };

      mockElement.animate = vi.fn().mockReturnValue(mockAnimationWithCancel);

      controller.startAnimation(mockElement, keyframes, options, 'test-animation', onInterrupt);

      controller.cancelAnimation('test-animation');

      expect(onInterrupt).toHaveBeenCalled();
    });
  });

  describe('IntegratedAnimationController', () => {
    let controller: IntegratedAnimationController;
    let mockElement: HTMLElement;

    beforeEach(() => {
      controller = new IntegratedAnimationController();
      mockElement = document.createElement('div');
      mockElement.animate = vi.fn().mockReturnValue(mockAnimation);
    });

    afterEach(() => {
      controller.cleanup();
    });

    it('最適化されたアニメーションを開始できる', () => {
      const keyframes = [{ opacity: 0 }, { opacity: 1 }];
      const options = { duration: 300 };

      const animation = controller.startOptimizedAnimation(
        mockElement,
        keyframes,
        options,
        'test-animation'
      );

      expect(animation).toBeTruthy();
      expect(mockElement.animate).toHaveBeenCalled();
    });

    it('アニメーション無効時はnullを返す', () => {
      // アクセシビリティ設定でアニメーション無効をシミュレート
      mockMatchMedia(true);

      // 新しいコントローラーを作成して設定を反映
      const newController = new IntegratedAnimationController();
      const newMockElement = document.createElement('div');
      newMockElement.animate = vi.fn().mockReturnValue(mockAnimation);

      const keyframes = [{ opacity: 0 }, { opacity: 1 }];
      const options = { duration: 300 };

      const animation = newController.startOptimizedAnimation(
        newMockElement,
        keyframes,
        options,
        'test-animation'
      );

      expect(animation).toBeNull();
      newController.cleanup();
    });

    it('同時実行数制限を適用する', () => {
      const keyframes = [{ opacity: 0 }, { opacity: 1 }];
      const options = { duration: 300 };

      const performanceSettings = controller.getPerformanceSettings();
      const maxAnimations = performanceSettings.maxConcurrentAnimations;

      // 制限を超えるアニメーションを開始
      for (let i = 0; i <= maxAnimations; i++) {
        controller.startOptimizedAnimation(mockElement, keyframes, options, `test-animation-${i}`);
      }

      // 最大数を超えないことを確認
      expect(controller.getActiveAnimationCount()).toBeLessThanOrEqual(maxAnimations);
    });

    it('パフォーマンス設定を取得できる', () => {
      const settings = controller.getPerformanceSettings();

      expect(settings).toHaveProperty('enableAnimations');
      expect(settings).toHaveProperty('performanceLevel');
      expect(settings).toHaveProperty('maxConcurrentAnimations');
      expect(settings).toHaveProperty('shouldUseGPUAcceleration');
    });

    it('アニメーション実行可能性をチェックできる', () => {
      const canStart = controller.canStartAnimation();
      expect(typeof canStart).toBe('boolean');
    });
  });

  describe('パフォーマンス最適化', () => {
    it('PERFORMANCE_LEVEL_OPTIONS が正しく定義されている', () => {
      expect(PERFORMANCE_LEVEL_OPTIONS.high).toHaveProperty('composite', 'replace');
      expect(PERFORMANCE_LEVEL_OPTIONS.medium).toHaveProperty('composite', 'add');
      expect(PERFORMANCE_LEVEL_OPTIONS.low).toHaveProperty('composite', 'accumulate');
    });

    it('adjustAnimationForPerformance が正しく動作する', () => {
      const baseConfig = { duration: 300, easing: 'ease-out' };

      const highPerf = adjustAnimationForPerformance(baseConfig, 'high');
      expect(highPerf.duration).toBe(300);

      const mediumPerf = adjustAnimationForPerformance(baseConfig, 'medium');
      expect(mediumPerf.duration).toBe(210); // 300 * 0.7

      const lowPerf = adjustAnimationForPerformance(baseConfig, 'low');
      expect(lowPerf.duration).toBe(150); // 300 * 0.5
    });

    it('createStaggeredAnimation が正しく動作する', () => {
      const elements = [
        document.createElement('div'),
        document.createElement('div'),
        document.createElement('div'),
      ];

      elements.forEach(el => {
        el.animate = vi.fn().mockReturnValue(mockAnimation);
      });

      const keyframes = [{ opacity: 0 }, { opacity: 1 }];
      const baseOptions = { duration: 300 };

      const animations = createStaggeredAnimation(elements, keyframes, baseOptions, 100);

      expect(animations).toHaveLength(3);
      expect(elements[0].animate).toHaveBeenCalledWith(keyframes, { duration: 300, delay: 0 });
      expect(elements[1].animate).toHaveBeenCalledWith(keyframes, { duration: 300, delay: 100 });
      expect(elements[2].animate).toHaveBeenCalledWith(keyframes, { duration: 300, delay: 200 });
    });
  });

  describe('アクセシビリティ対応', () => {
    it('isReducedMotionPreferred が正しく動作する', () => {
      mockMatchMedia(false);
      expect(isReducedMotionPreferred()).toBe(false);

      mockMatchMedia(true);
      expect(isReducedMotionPreferred()).toBe(true);
    });

    it('getAccessibilitySettings が正しく動作する', () => {
      mockMatchMedia(false);
      const settings = getAccessibilitySettings();

      expect(settings).toHaveProperty('reducedMotion', false);
      expect(settings).toHaveProperty('highContrast', false);
      expect(settings).toHaveProperty('forcedColors', false);
    });

    it('サーバーサイドレンダリング環境で安全に動作する', () => {
      // window オブジェクトを一時的に削除
      const originalWindow = global.window;
      delete (global as any).window;

      expect(isReducedMotionPreferred()).toBe(false);

      const settings = getAccessibilitySettings();
      expect(settings.reducedMotion).toBe(false);
      expect(settings.highContrast).toBe(false);
      expect(settings.forcedColors).toBe(false);

      // window オブジェクトを復元
      global.window = originalWindow;
    });
  });

  describe('最適なアニメーション設定', () => {
    it('getOptimalAnimationSettings が基本設定を返す', () => {
      const settings = getOptimalAnimationSettings();

      expect(settings).toHaveProperty('enableAnimations');
      expect(settings).toHaveProperty('performanceLevel');
      expect(settings).toHaveProperty('maxConcurrentAnimations');
      expect(settings).toHaveProperty('shouldUseGPUAcceleration');
    });

    it('動きを減らす設定が有効な場合、アニメーションを無効にする', () => {
      mockMatchMedia(true);

      const settings = getOptimalAnimationSettings();
      expect(settings.enableAnimations).toBe(false);
      expect(settings.performanceLevel).toBe('low');
    });

    it('低性能デバイスを検出して設定を調整する', () => {
      // 低性能デバイスをシミュレート
      Object.defineProperty(navigator, 'deviceMemory', {
        value: 1, // 1GB
        writable: true,
      });
      Object.defineProperty(navigator, 'hardwareConcurrency', {
        value: 1, // 1コア
        writable: true,
      });

      const settings = getOptimalAnimationSettings();
      expect(settings.performanceLevel).toBe('low');
      expect(settings.maxConcurrentAnimations).toBe(3);
      expect(settings.shouldUseGPUAcceleration).toBe(false);
    });

    it('ネットワーク状況に基づいて設定を調整する', () => {
      // 低速回線をシミュレート
      Object.defineProperty(navigator, 'connection', {
        value: {
          effectiveType: '2g',
          saveData: false,
        },
        writable: true,
      });

      const settings = getOptimalAnimationSettings();
      expect(settings.performanceLevel).toBe('low');
    });

    it('データセーバーモードを検出して設定を調整する', () => {
      Object.defineProperty(navigator, 'connection', {
        value: {
          effectiveType: '4g',
          saveData: true,
        },
        writable: true,
      });

      const settings = getOptimalAnimationSettings();
      expect(settings.performanceLevel).toBe('low');
      expect(settings.shouldUseGPUAcceleration).toBe(false);
    });
  });

  describe('グローバルアニメーションコントローラー', () => {
    afterEach(() => {
      globalAnimationController.cleanup();
    });

    it('グローバルインスタンスが正しく初期化される', () => {
      // globalAnimationControllerはプロキシオブジェクトなので、instanceプロパティをチェック
      expect(globalAnimationController.instance).toBeInstanceOf(IntegratedAnimationController);
    });

    it('グローバルインスタンスのメソッドが正しく動作する', () => {
      const mockElement = document.createElement('div');
      mockElement.animate = vi.fn().mockReturnValue(mockAnimation);

      const keyframes = [{ opacity: 0 }, { opacity: 1 }];
      const options = { duration: 300 };

      const animation = globalAnimationController.startAnimation(
        mockElement,
        keyframes,
        options,
        'global-test'
      );

      expect(animation).toBeTruthy();
      expect(globalAnimationController.getActiveAnimationCount()).toBe(1);

      globalAnimationController.cancelAnimation('global-test');
      expect(globalAnimationController.getActiveAnimationCount()).toBe(0);
    });

    it('グローバルインスタンスの最適化されたアニメーションが正しく動作する', () => {
      const mockElement = document.createElement('div');
      mockElement.animate = vi.fn().mockReturnValue(mockAnimation);

      const keyframes = [{ opacity: 0 }, { opacity: 1 }];
      const options = { duration: 300 };

      const animation = globalAnimationController.startOptimizedAnimation(
        mockElement,
        keyframes,
        options,
        'global-optimized-test'
      );

      expect(animation).toBeTruthy();
      expect(globalAnimationController.canStartAnimation()).toBe(true);
    });
  });

  describe('エラーハンドリング', () => {
    it('無効な要素でアニメーションを開始するとエラーが発生する', () => {
      const controller = new AnimationController();
      const invalidElement = null as any;

      // nullの要素に対してanimateを呼ぶとTypeErrorが発生する
      expect(() => {
        controller.startAnimation(invalidElement, [{ opacity: 0 }, { opacity: 1 }], {
          duration: 300,
        });
      }).toThrow(TypeError);

      controller.cleanup();
    });

    it('存在しないアニメーションIDを中断してもエラーが発生しない', () => {
      const controller = new AnimationController();

      expect(() => {
        controller.cancelAnimation('non-existent-id');
      }).not.toThrow();

      controller.cleanup();
    });

    it('クリーンアップ処理が安全に実行される', () => {
      const controller = new AnimationController();

      expect(() => {
        controller.cleanup();
      }).not.toThrow();
    });
  });
});
