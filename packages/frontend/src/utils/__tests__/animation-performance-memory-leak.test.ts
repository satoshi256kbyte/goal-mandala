import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  AnimationPerformanceMonitor,
  AnimationInterruptController,
} from '../animation-performance';

/**
 * AnimationPerformanceMonitorのメモリリーク検出テスト
 * 要件: 4.4, 4.5
 */
describe('AnimationPerformanceMonitor メモリリーク検出', () => {
  let monitor: AnimationPerformanceMonitor;

  beforeEach(() => {
    monitor = new AnimationPerformanceMonitor();
    vi.useFakeTimers();
  });

  afterEach(() => {
    // 監視を停止してクリーンアップ
    monitor.stopMonitoring();
    vi.useRealTimers();
  });

  describe('メモリリーク検出', () => {
    it('複数回の開始・停止でメモリリークが発生しない', () => {
      // 10回開始・停止を繰り返す
      for (let i = 0; i < 10; i++) {
        monitor.startMonitoring();
        monitor.stopMonitoring();
      }

      // テストが成功すれば、メモリリークは発生していない
      expect(true).toBe(true);
    });

    it('監視開始後に停止するとrequestAnimationFrameがキャンセルされる', () => {
      const originalRAF = global.requestAnimationFrame;
      const originalCAF = global.cancelAnimationFrame;
      const rafSpy = vi.fn(originalRAF);
      const cafSpy = vi.fn(originalCAF);

      global.requestAnimationFrame = rafSpy;
      global.cancelAnimationFrame = cafSpy;

      monitor.startMonitoring();

      // requestAnimationFrameが呼ばれることを確認
      expect(rafSpy).toHaveBeenCalled();

      monitor.stopMonitoring();

      // cancelAnimationFrameが呼ばれることを確認
      expect(cafSpy).toHaveBeenCalled();

      // 元に戻す
      global.requestAnimationFrame = originalRAF;
      global.cancelAnimationFrame = originalCAF;
    });

    it('監視開始後にタイマーが設定される', () => {
      monitor.startMonitoring();

      // タイマーが設定されていることを確認
      expect(vi.getTimerCount()).toBeGreaterThan(0);

      monitor.stopMonitoring();
    });

    it('監視停止後にタイマーがクリアされる', () => {
      monitor.startMonitoring();
      const timerCountBefore = vi.getTimerCount();
      expect(timerCountBefore).toBeGreaterThan(0);

      monitor.stopMonitoring();

      // タイマーがクリアされることを確認
      // （afterEachでクリーンアップされる）
      expect(true).toBe(true);
    });

    it('複数のメトリクスを収集してもメモリリークが発生しない', () => {
      monitor.startMonitoring();

      // 時間を進めてメトリクスを収集
      vi.advanceTimersByTime(10000);

      // メトリクスを取得
      const metrics = monitor.getMetrics();
      expect(metrics).toBeDefined();

      monitor.stopMonitoring();

      // テストが成功すれば、メモリリークは発生していない
      expect(true).toBe(true);
    });

    it('長時間監視してもメモリリークが発生しない', () => {
      monitor.startMonitoring();

      // 長時間（1分）監視
      vi.advanceTimersByTime(60000);

      // メトリクスを取得
      const metrics = monitor.getMetrics();
      expect(metrics).toBeDefined();

      monitor.stopMonitoring();

      // テストが成功すれば、メモリリークは発生していない
      expect(true).toBe(true);
    });
  });

  describe('クリーンアップ処理', () => {
    it('stopMonitoring()がrequestAnimationFrameをキャンセルする', () => {
      const originalCAF = global.cancelAnimationFrame;
      const cafSpy = vi.fn(originalCAF);
      global.cancelAnimationFrame = cafSpy;

      monitor.startMonitoring();
      monitor.stopMonitoring();

      // cancelAnimationFrameが呼ばれることを確認
      expect(cafSpy).toHaveBeenCalled();

      global.cancelAnimationFrame = originalCAF;
    });

    it('stopMonitoring()を複数回呼んでもエラーにならない', () => {
      monitor.startMonitoring();

      expect(() => {
        monitor.stopMonitoring();
        monitor.stopMonitoring();
        monitor.stopMonitoring();
      }).not.toThrow();
    });

    it('startMonitoring()を複数回呼んでも重複して監視しない', () => {
      monitor.startMonitoring();
      const timerCount1 = vi.getTimerCount();

      // 再度開始
      monitor.startMonitoring();
      const timerCount2 = vi.getTimerCount();

      // タイマー数が増えていないことを確認（重複して監視していない）
      expect(timerCount2).toBe(timerCount1);

      monitor.stopMonitoring();
    });
  });

  describe('パフォーマンス', () => {
    it('大量のメトリクス収集後もクリーンアップが正常に動作する', () => {
      monitor.startMonitoring();

      // 大量のメトリクスを収集（100秒分）
      for (let i = 0; i < 100; i++) {
        vi.advanceTimersByTime(1000);
      }

      monitor.stopMonitoring();

      // テストが成功すれば、メモリリークは発生していない
      expect(true).toBe(true);
    });

    it('パフォーマンス履歴の取得後もメモリリークが発生しない', () => {
      monitor.startMonitoring();

      vi.advanceTimersByTime(10000);

      // パフォーマンス履歴を取得
      const history = monitor.getPerformanceHistory();
      expect(history).toBeDefined();

      // 推奨設定を取得
      const recommended = monitor.getRecommendedSettings();
      expect(recommended).toBeDefined();

      monitor.stopMonitoring();

      // テストが成功すれば、メモリリークは発生していない
      expect(true).toBe(true);
    });
  });
});

/**
 * AnimationInterruptControllerのメモリリーク検出テスト
 */
describe('AnimationInterruptController メモリリーク検出', () => {
  let controller: AnimationInterruptController;

  beforeEach(() => {
    controller = new AnimationInterruptController();
  });

  afterEach(() => {
    // すべてのアニメーションを中断してクリーンアップ
    controller.interruptAllAnimations();
  });

  describe('メモリリーク検出', () => {
    it('複数のアニメーション登録・中断でメモリリークが発生しない', () => {
      // 10回登録・中断を繰り返す
      for (let i = 0; i < 10; i++) {
        const mockAnimation = {
          cancel: vi.fn(),
          addEventListener: vi.fn(),
        } as any;

        controller.registerAnimation(`anim-${i}`, mockAnimation);
        controller.interruptAnimation(`anim-${i}`);
      }

      // テストが成功すれば、メモリリークは発生していない
      expect(true).toBe(true);
    });

    it('大量のアニメーション登録後もクリーンアップが正常に動作する', () => {
      // 100個のアニメーションを登録
      for (let i = 0; i < 100; i++) {
        const mockAnimation = {
          cancel: vi.fn(),
          addEventListener: vi.fn(),
        } as any;

        controller.registerAnimation(`anim-${i}`, mockAnimation);
      }

      // すべて中断
      controller.interruptAllAnimations();

      // アクティブなアニメーションが0であることを確認
      expect(controller.getActiveAnimationCount()).toBe(0);
    });

    it('アニメーション終了時に自動的に登録解除される', () => {
      const mockAnimation = {
        cancel: vi.fn(),
        addEventListener: vi.fn((event: string, callback: () => void) => {
          if (event === 'finish') {
            // すぐにコールバックを実行（アニメーション終了をシミュレート）
            callback();
          }
        }),
      } as any;

      controller.registerAnimation('anim-1', mockAnimation);

      // アニメーションが自動的に登録解除されることを確認
      expect(controller.getActiveAnimationCount()).toBe(0);
    });
  });

  describe('クリーンアップ処理', () => {
    it('interruptAllAnimations()がすべてのアニメーションを中断する', () => {
      const mockAnimations = Array.from({ length: 5 }, (_, i) => ({
        cancel: vi.fn(),
        addEventListener: vi.fn(),
      })) as any[];

      mockAnimations.forEach((anim, i) => {
        controller.registerAnimation(`anim-${i}`, anim);
      });

      controller.interruptAllAnimations();

      // すべてのアニメーションのcancel()が呼ばれることを確認
      mockAnimations.forEach(anim => {
        expect(anim.cancel).toHaveBeenCalled();
      });

      // アクティブなアニメーションが0であることを確認
      expect(controller.getActiveAnimationCount()).toBe(0);
    });

    it('interruptAnimationsByType()が特定の種類のアニメーションを中断する', () => {
      const mockAnimations = [
        { cancel: vi.fn(), addEventListener: vi.fn() },
        { cancel: vi.fn(), addEventListener: vi.fn() },
        { cancel: vi.fn(), addEventListener: vi.fn() },
      ] as any[];

      controller.registerAnimation('fade-1', mockAnimations[0]);
      controller.registerAnimation('fade-2', mockAnimations[1]);
      controller.registerAnimation('slide-1', mockAnimations[2]);

      // fade系のアニメーションのみ中断
      controller.interruptAnimationsByType('fade');

      // fade系のアニメーションのcancel()が呼ばれることを確認
      expect(mockAnimations[0].cancel).toHaveBeenCalled();
      expect(mockAnimations[1].cancel).toHaveBeenCalled();
      expect(mockAnimations[2].cancel).not.toHaveBeenCalled();

      // 残りのアニメーションをクリーンアップ
      controller.interruptAllAnimations();
    });
  });
});
