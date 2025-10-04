import {
  AnimationPerformanceMonitor,
  AnimationInterruptController,
  AdaptiveAnimationQuality,
  AnimationAccessibilityManager,
  globalPerformanceMonitor,
  globalInterruptController,
  globalAdaptiveQuality,
  globalAccessibilityManager,
} from '../animation-performance';
import {
  globalAnimationController,
  IntegratedAnimationController,
  getOptimalAnimationSettings,
  getAccessibilitySettings,
} from '../animation-utils';

// Web Animations API のモック
const mockAnimation = {
  addEventListener: jest.fn(),
  cancel: jest.fn(),
  finish: jest.fn(),
};

// performance.now のモック
const mockPerformanceNow = jest.fn();
Object.defineProperty(global, 'performance', {
  value: {
    now: mockPerformanceNow,
    memory: {
      usedJSHeapSize: 50 * 1024 * 1024, // 50MB
    },
  },
  writable: true,
});

// requestAnimationFrame のモック
const mockRequestAnimationFrame = jest.fn();
const mockCancelAnimationFrame = jest.fn();
Object.defineProperty(global, 'requestAnimationFrame', {
  value: mockRequestAnimationFrame,
  writable: true,
});
Object.defineProperty(global, 'cancelAnimationFrame', {
  value: mockCancelAnimationFrame,
  writable: true,
});

// matchMedia のモック
const mockMatchMedia = (matches: boolean) => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(() => ({
      matches,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    })),
  });
};

describe('AnimationPerformanceMonitor', () => {
  let monitor: AnimationPerformanceMonitor;

  beforeEach(() => {
    jest.clearAllMocks();
    monitor = new AnimationPerformanceMonitor();
    mockPerformanceNow.mockReturnValue(1000);
  });

  afterEach(() => {
    monitor.stopMonitoring();
  });

  describe('基本機能', () => {
    it('監視を開始・停止できる', () => {
      expect(monitor.getMetrics().fps).toBe(0);

      monitor.startMonitoring();
      expect(mockRequestAnimationFrame).toHaveBeenCalled();

      monitor.stopMonitoring();
      expect(mockCancelAnimationFrame).toHaveBeenCalled();
    });

    it('メトリクスを正しく取得する', () => {
      const metrics = monitor.getMetrics();

      expect(metrics).toHaveProperty('fps');
      expect(metrics).toHaveProperty('duration');
      expect(metrics).toHaveProperty('memoryUsage');
      expect(metrics).toHaveProperty('cpuUsage');
      expect(metrics).toHaveProperty('activeAnimations');
      expect(metrics).toHaveProperty('droppedFrames');
    });

    it('アクティブなアニメーション数を更新できる', () => {
      monitor.setActiveAnimationCount(5);
      expect(monitor.getMetrics().activeAnimations).toBe(5);
    });
  });

  describe('品質設定', () => {
    it('品質レベルを設定できる', () => {
      monitor.setQualitySettings('low');
      const settings = monitor.getQualitySettings();
      expect(settings.level).toBe('low');
      expect(settings.maxConcurrentAnimations).toBe(5);
    });

    it('推奨設定を取得できる', () => {
      const recommended = monitor.getRecommendedSettings();
      expect(recommended).toHaveProperty('level');
      expect(recommended).toHaveProperty('maxConcurrentAnimations');
    });
  });

  describe('パフォーマンス警告', () => {
    it('低FPS時に警告を出す', () => {
      monitor.setActiveAnimationCount(0);
      // 低FPSをシミュレート
      const metrics = monitor.getMetrics();
      metrics.fps = 10;

      const warnings = monitor.checkPerformanceWarnings();
      expect(warnings).toContain('フレームレートが低下しています（15fps未満）');
    });

    it('高メモリ使用量時に警告を出す', () => {
      // 高メモリ使用量をシミュレート
      Object.defineProperty(global, 'performance', {
        value: {
          ...global.performance,
          memory: {
            usedJSHeapSize: 150 * 1024 * 1024, // 150MB
          },
        },
        writable: true,
      });

      monitor.startMonitoring();
      const warnings = monitor.checkPerformanceWarnings();
      expect(warnings.length).toBeGreaterThan(0);
    });
  });
});

describe('AnimationInterruptController', () => {
  let controller: AnimationInterruptController;

  beforeEach(() => {
    controller = new AnimationInterruptController();
  });

  describe('アニメーション管理', () => {
    it('アニメーションを登録・解除できる', () => {
      const animation = mockAnimation as any;
      controller.registerAnimation('test-1', animation);

      expect(controller.getActiveAnimationCount()).toBe(1);
      expect(controller.getActiveAnimationIds()).toContain('test-1');

      controller.unregisterAnimation('test-1');
      expect(controller.getActiveAnimationCount()).toBe(0);
    });

    it('特定のアニメーションを中断できる', () => {
      const animation = mockAnimation as any;
      const onInterrupt = jest.fn();

      controller.registerAnimation('test-1', animation, onInterrupt);
      controller.interruptAnimation('test-1');

      expect(animation.cancel).toHaveBeenCalled();
      expect(onInterrupt).toHaveBeenCalled();
      expect(controller.getActiveAnimationCount()).toBe(0);
    });

    it('すべてのアニメーションを中断できる', () => {
      const animation1 = { ...mockAnimation } as any;
      const animation2 = { ...mockAnimation } as any;

      controller.registerAnimation('test-1', animation1);
      controller.registerAnimation('test-2', animation2);

      controller.interruptAllAnimations();

      expect(animation1.cancel).toHaveBeenCalled();
      expect(animation2.cancel).toHaveBeenCalled();
      expect(controller.getActiveAnimationCount()).toBe(0);
    });

    it('特定の種類のアニメーションを中断できる', () => {
      const animation1 = { ...mockAnimation } as any;
      const animation2 = { ...mockAnimation } as any;
      const animation3 = { ...mockAnimation } as any;

      controller.registerAnimation('achievement-1', animation1);
      controller.registerAnimation('achievement-2', animation2);
      controller.registerAnimation('progress-1', animation3);

      controller.interruptAnimationsByType('achievement');

      expect(animation1.cancel).toHaveBeenCalled();
      expect(animation2.cancel).toHaveBeenCalled();
      expect(animation3.cancel).not.toHaveBeenCalled();
      expect(controller.getActiveAnimationCount()).toBe(1);
    });
  });
});

describe('AdaptiveAnimationQuality', () => {
  let monitor: AnimationPerformanceMonitor;
  let adaptive: AdaptiveAnimationQuality;

  beforeEach(() => {
    monitor = new AnimationPerformanceMonitor();
    adaptive = new AdaptiveAnimationQuality(monitor);
  });

  afterEach(() => {
    adaptive.stopAdaptiveAdjustment();
  });

  describe('自動調整', () => {
    it('自動調整を開始・停止できる', () => {
      adaptive.startAdaptiveAdjustment();
      expect(adaptive.getCurrentLevel()).toBe('high');

      adaptive.stopAdaptiveAdjustment();
      // 停止後も現在のレベルは保持される
      expect(adaptive.getCurrentLevel()).toBe('high');
    });

    it('現在の品質レベルを取得できる', () => {
      expect(adaptive.getCurrentLevel()).toBe('high');
    });
  });
});

describe('AnimationAccessibilityManager', () => {
  let manager: AnimationAccessibilityManager;

  beforeEach(() => {
    manager = new AnimationAccessibilityManager();
  });

  describe('アクセシビリティ設定', () => {
    it('初期状態では無効になっている', () => {
      mockMatchMedia(false);
      const newManager = new AnimationAccessibilityManager();
      expect(newManager.isDisabled()).toBe(false);
    });

    it('動きを減らす設定が有効な場合、無効になる', () => {
      mockMatchMedia(true);
      const newManager = new AnimationAccessibilityManager();
      expect(newManager.isDisabled()).toBe(true);
    });

    it('手動で無効状態を設定できる', () => {
      manager.setDisabled(true);
      expect(manager.isDisabled()).toBe(true);

      manager.setDisabled(false);
      expect(manager.isDisabled()).toBe(false);
    });

    it('コールバックを登録・削除できる', () => {
      const callback = jest.fn();

      manager.addCallback(callback);
      manager.setDisabled(true);
      expect(callback).toHaveBeenCalledWith(true);

      manager.removeCallback(callback);
      manager.setDisabled(false);
      expect(callback).toHaveBeenCalledTimes(1); // 削除後は呼ばれない
    });
  });
});

describe('IntegratedAnimationController', () => {
  let controller: IntegratedAnimationController;
  let mockElement: HTMLElement;

  beforeEach(() => {
    controller = new IntegratedAnimationController();
    mockElement = document.createElement('div');
    mockElement.animate = jest.fn().mockReturnValue(mockAnimation);
  });

  afterEach(() => {
    controller.cleanup();
  });

  describe('最適化されたアニメーション', () => {
    it('パフォーマンス設定に基づいてアニメーションを実行する', () => {
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

    it('アニメーションが無効な場合は実行しない', () => {
      // アクセシビリティ設定でアニメーション無効をシミュレート
      mockMatchMedia(true);

      const keyframes = [{ opacity: 0 }, { opacity: 1 }];
      const options = { duration: 300 };

      const animation = controller.startOptimizedAnimation(
        mockElement,
        keyframes,
        options,
        'test-animation'
      );

      expect(animation).toBeNull();
    });

    it('同時実行数制限を適用する', () => {
      const keyframes = [{ opacity: 0 }, { opacity: 1 }];
      const options = { duration: 300 };

      // 最大同時実行数を超えるアニメーションを開始
      const performanceSettings = controller.getPerformanceSettings();
      const maxAnimations = performanceSettings.maxConcurrentAnimations;

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

  describe('ユーザー操作時の中断', () => {
    it('ユーザー操作時にアニメーションが中断される', () => {
      const keyframes = [{ opacity: 0 }, { opacity: 1 }];
      const options = { duration: 300 };

      controller.startOptimizedAnimation(mockElement, keyframes, options, 'progress-animation');

      // ユーザー操作をシミュレート
      const mouseEvent = new MouseEvent('mousedown');
      document.dispatchEvent(mouseEvent);

      // 進捗アニメーションが中断されることを確認
      expect(controller.getActiveAnimationCount()).toBe(0);
    });

    it('達成アニメーションはユーザー操作時も継続される', () => {
      const keyframes = [{ opacity: 0 }, { opacity: 1 }];
      const options = { duration: 300 };

      controller.startOptimizedAnimation(mockElement, keyframes, options, 'achievement-animation');

      // ユーザー操作をシミュレート
      const mouseEvent = new MouseEvent('mousedown');
      document.dispatchEvent(mouseEvent);

      // 達成アニメーションは継続されることを確認
      expect(controller.getActiveAnimationCount()).toBe(1);
    });
  });
});

describe('アクセシビリティ設定', () => {
  beforeEach(() => {
    // デフォルト状態にリセット
    mockMatchMedia(false);
  });

  describe('getAccessibilitySettings', () => {
    it('アクセシビリティ設定を正しく取得する', () => {
      const settings = getAccessibilitySettings();

      expect(settings).toHaveProperty('reducedMotion');
      expect(settings).toHaveProperty('highContrast');
      expect(settings).toHaveProperty('forcedColors');
    });

    it('動きを減らす設定が有効な場合を検出する', () => {
      mockMatchMedia(true);

      const settings = getAccessibilitySettings();
      expect(settings.reducedMotion).toBe(true);
    });

    it('サーバーサイドレンダリング環境で安全に動作する', () => {
      // window オブジェクトを一時的に削除
      const originalWindow = global.window;
      delete (global as any).window;

      const settings = getAccessibilitySettings();
      expect(settings.reducedMotion).toBe(false);
      expect(settings.highContrast).toBe(false);
      expect(settings.forcedColors).toBe(false);

      // window オブジェクトを復元
      global.window = originalWindow;
    });
  });

  describe('getOptimalAnimationSettings', () => {
    it('最適なアニメーション設定を取得する', () => {
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
});

describe('グローバルインスタンス', () => {
  it('グローバルインスタンスが正しく初期化される', () => {
    expect(globalPerformanceMonitor).toBeInstanceOf(AnimationPerformanceMonitor);
    expect(globalInterruptController).toBeInstanceOf(AnimationInterruptController);
    expect(globalAdaptiveQuality).toBeInstanceOf(AdaptiveAnimationQuality);
    expect(globalAccessibilityManager).toBeInstanceOf(AnimationAccessibilityManager);
    expect(globalAnimationController).toBeInstanceOf(IntegratedAnimationController);
  });

  it('グローバルインスタンスが連携して動作する', () => {
    // パフォーマンス監視開始
    globalPerformanceMonitor.startMonitoring();
    expect(mockRequestAnimationFrame).toHaveBeenCalled();

    // アニメーション登録
    const animation = mockAnimation as any;
    globalInterruptController.registerAnimation('global-test', animation);
    expect(globalInterruptController.getActiveAnimationCount()).toBe(1);

    // 自動品質調整開始
    globalAdaptiveQuality.startAdaptiveAdjustment();
    expect(globalAdaptiveQuality.getCurrentLevel()).toBe('high');

    // 統合アニメーションコントローラーのテスト
    expect(globalAnimationController.canStartAnimation()).toBe(true);

    // クリーンアップ
    globalPerformanceMonitor.stopMonitoring();
    globalInterruptController.interruptAllAnimations();
    globalAdaptiveQuality.stopAdaptiveAdjustment();

    expect(globalInterruptController.getActiveAnimationCount()).toBe(0);
  });
});
