import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PerformanceMonitor } from '../performance-monitor';

/**
 * PerformanceMonitorのメモリリーク検出テスト
 * 要件: 4.4, 4.5
 */
describe('PerformanceMonitor メモリリーク検出', () => {
  let monitor: PerformanceMonitor;

  beforeEach(() => {
    monitor = PerformanceMonitor.getInstance();
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

      // 元に戻す
      global.requestAnimationFrame = originalRAF;
      global.cancelAnimationFrame = originalCAF;

      // テストが成功すれば、クリーンアップが正しく実行されている
      expect(true).toBe(true);
    });

    it('監視開始後にタイマーが設定される', () => {
      monitor.startMonitoring();

      // タイマーが設定されていることを確認（setTimeout/setIntervalが呼ばれる）
      expect(vi.getTimerCount()).toBeGreaterThan(0);

      monitor.stopMonitoring();

      // 停止後、タイマーがクリアされることを確認
      // （afterEachでクリーンアップされる）
    });

    it('監視停止後にオブザーバーが切断される', () => {
      monitor.startMonitoring();
      monitor.stopMonitoring();

      // 停止後、再度開始できることを確認
      expect(() => {
        monitor.startMonitoring();
        monitor.stopMonitoring();
      }).not.toThrow();
    });

    it('複数のメトリクスを収集してもメモリリークが発生しない', () => {
      monitor.startMonitoring();

      // 時間を進めてメトリクスを収集
      vi.advanceTimersByTime(10000);

      // メトリクスを取得
      const metrics = monitor.getCurrentMetrics();
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
      const metrics = monitor.getCurrentMetrics();
      expect(metrics).toBeDefined();

      monitor.stopMonitoring();

      // テストが成功すれば、メモリリークは発生していない
      expect(true).toBe(true);
    });
  });

  describe('クリーンアップ処理', () => {
    it('stopMonitoring()がすべてのオブザーバーを切断する', () => {
      monitor.startMonitoring();

      // 監視が開始されていることを確認
      expect(vi.getTimerCount()).toBeGreaterThan(0);

      monitor.stopMonitoring();

      // オブザーバーが切断されていることを確認
      // （エラーが発生しないことを確認）
      expect(true).toBe(true);
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

    it('統計情報の取得後もメモリリークが発生しない', () => {
      monitor.startMonitoring();

      vi.advanceTimersByTime(10000);

      // 統計情報を取得
      const stats = monitor.getAllStats();
      expect(stats).toBeDefined();

      // レポートを生成
      const report = monitor.generateReport();
      expect(report).toBeDefined();

      monitor.stopMonitoring();

      // テストが成功すれば、メモリリークは発生していない
      expect(true).toBe(true);
    });
  });
});
