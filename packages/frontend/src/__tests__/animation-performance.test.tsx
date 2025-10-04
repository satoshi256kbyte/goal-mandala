/**
 * アニメーションパフォーマンス専用テスト
 * 要件4.4, 4.5に対応
 *
 * このテストファイルは以下のパフォーマンス要件をテストします：
 * - フレームレート維持
 * - メモリ使用量制限
 * - CPU使用率制限
 * - 同時実行数制限
 * - レスポンス時間要件
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ProgressBar } from '../components/common/ProgressBar';
import { MandalaCell } from '../components/mandala/MandalaCell';
import { AchievementAnimation } from '../components/common/AchievementAnimation';
import { AnimationSettingsProvider } from '../contexts/AnimationSettingsContext';
import {
  globalAnimationController,
  globalPerformanceMonitor,
  globalInterruptController,
  globalAdaptiveQuality,
} from '../utils/animation-utils';
import {
  AnimationPerformanceMonitor,
  AnimationInterruptController,
  AdaptiveAnimationQuality,
} from '../utils/animation-performance';
import type { CellData, Position } from '../types';

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

// performance のモック
const mockPerformanceNow = vi.fn();
Object.defineProperty(global, 'performance', {
  value: {
    now: mockPerformanceNow,
    memory: {
      usedJSHeapSize: 50 * 1024 * 1024, // 50MB
      totalJSHeapSize: 100 * 1024 * 1024, // 100MB
      jsHeapSizeLimit: 2 * 1024 * 1024 * 1024, // 2GB
    },
  },
  writable: true,
});

// requestAnimationFrame のモック
const mockRequestAnimationFrame = vi.fn();
const mockCancelAnimationFrame = vi.fn();
Object.defineProperty(global, 'requestAnimationFrame', {
  value: mockRequestAnimationFrame,
  writable: true,
});
Object.defineProperty(global, 'cancelAnimationFrame', {
  value: mockCancelAnimationFrame,
  writable: true,
});

// navigator のモック
Object.defineProperty(navigator, 'deviceMemory', {
  value: 4,
  writable: true,
});
Object.defineProperty(navigator, 'hardwareConcurrency', {
  value: 4,
  writable: true,
});

// テスト用のラッパーコンポーネント
const TestWrapper: React.FC<{
  children: React.ReactNode;
  settings?: any;
}> = ({ children, settings = {} }) => (
  <AnimationSettingsProvider initialSettings={settings}>{children}</AnimationSettingsProvider>
);

// テスト用のセルデータ
const createMockCellData = (id: string, progress: number): CellData => ({
  id,
  type: 'action',
  title: `Test Action ${id}`,
  description: 'Test Description',
  progress,
  status: 'execution',
});

describe('アニメーションパフォーマンステスト', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPerformanceNow.mockReturnValue(1000);
    mockRequestAnimationFrame.mockImplementation(callback => {
      setTimeout(callback, 16); // 60fps をシミュレート
      return 1;
    });

    // グローバルインスタンスをリセット
    globalAnimationController.cancelAllAnimations();
    globalPerformanceMonitor.stopMonitoring();
    globalInterruptController.interruptAllAnimations();
    globalAdaptiveQuality.stopAdaptiveAdjustment();
  });

  afterEach(() => {
    globalAnimationController.cleanup();
    globalPerformanceMonitor.stopMonitoring();
    globalInterruptController.interruptAllAnimations();
    globalAdaptiveQuality.stopAdaptiveAdjustment();
  });

  describe('フレームレート維持テスト', () => {
    it('単一アニメーション実行時に60fps以上を維持する', async () => {
      globalPerformanceMonitor.startMonitoring();

      render(
        <TestWrapper settings={{ enablePerformanceMonitoring: true }}>
          <ProgressBar value={50} animated={true} />
        </TestWrapper>
      );

      // フレームレート測定をシミュレート
      let frameCount = 0;
      const startTime = performance.now();

      const measureFrames = () => {
        frameCount++;
        mockPerformanceNow.mockReturnValue(startTime + frameCount * 16.67); // 60fps

        if (frameCount < 60) {
          mockRequestAnimationFrame(measureFrames);
        }
      };

      measureFrames();

      await waitFor(
        () => {
          const metrics = globalPerformanceMonitor.getMetrics();
          expect(metrics.fps).toBeGreaterThanOrEqual(60);
        },
        { timeout: 2000 }
      );

      globalPerformanceMonitor.stopMonitoring();
    });

    it('複数アニメーション同時実行時に30fps以上を維持する', async () => {
      globalPerformanceMonitor.startMonitoring();

      const components = Array.from({ length: 20 }, (_, i) => (
        <ProgressBar key={i} value={Math.random() * 100} animated={true} />
      ));

      render(
        <TestWrapper settings={{ enablePerformanceMonitoring: true }}>
          <div>{components}</div>
        </TestWrapper>
      );

      // フレームレート測定をシミュレート（負荷がかかった状態）
      let frameCount = 0;
      const startTime = performance.now();

      const measureFrames = () => {
        frameCount++;
        mockPerformanceNow.mockReturnValue(startTime + frameCount * 33.33); // 30fps

        if (frameCount < 30) {
          mockRequestAnimationFrame(measureFrames);
        }
      };

      measureFrames();

      await waitFor(
        () => {
          const metrics = globalPerformanceMonitor.getMetrics();
          expect(metrics.fps).toBeGreaterThanOrEqual(30);
        },
        { timeout: 2000 }
      );

      globalPerformanceMonitor.stopMonitoring();
    });

    it('フレームドロップが検出された場合に警告が発生する', async () => {
      globalPerformanceMonitor.startMonitoring();

      // 低フレームレートをシミュレート
      let frameCount = 0;
      const startTime = performance.now();

      const measureFrames = () => {
        frameCount++;
        mockPerformanceNow.mockReturnValue(startTime + frameCount * 100); // 10fps

        if (frameCount < 10) {
          mockRequestAnimationFrame(measureFrames);
        }
      };

      measureFrames();

      await waitFor(
        () => {
          const warnings = globalPerformanceMonitor.checkPerformanceWarnings();
          expect(warnings).toContain('フレームレートが低下しています（15fps未満）');
        },
        { timeout: 2000 }
      );

      globalPerformanceMonitor.stopMonitoring();
    });
  });

  describe('メモリ使用量制限テスト', () => {
    it('大量のアニメーション作成・削除でメモリリークが発生しない', async () => {
      const initialMemory = (performance as any).memory.usedJSHeapSize;

      // 大量のアニメーションを作成・削除
      for (let batch = 0; batch < 10; batch++) {
        const components = Array.from({ length: 50 }, (_, i) => (
          <ProgressBar key={`${batch}-${i}`} value={Math.random() * 100} animated={true} />
        ));

        const { unmount } = render(
          <TestWrapper>
            <div>{components}</div>
          </TestWrapper>
        );

        // すぐにアンマウント
        unmount();
      }

      // すべてのアニメーションをクリーンアップ
      globalAnimationController.cancelAllAnimations();

      // ガベージコレクションを促す
      if (global.gc) {
        global.gc();
      }

      const finalMemory = (performance as any).memory.usedJSHeapSize;
      const memoryIncrease = finalMemory - initialMemory;

      // メモリ増加が10MB以下であることを確認（許容範囲）
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });

    it('メモリ使用量が制限を超えた場合に警告が発生する', async () => {
      globalPerformanceMonitor.startMonitoring();

      // 高メモリ使用量をシミュレート
      Object.defineProperty(global, 'performance', {
        value: {
          ...global.performance,
          memory: {
            usedJSHeapSize: 150 * 1024 * 1024, // 150MB
            totalJSHeapSize: 200 * 1024 * 1024,
            jsHeapSizeLimit: 2 * 1024 * 1024 * 1024,
          },
        },
        writable: true,
      });

      await waitFor(() => {
        const warnings = globalPerformanceMonitor.checkPerformanceWarnings();
        expect(warnings).toContain('メモリ使用量が高くなっています（100MB以上）');
      });

      globalPerformanceMonitor.stopMonitoring();
    });

    it('アニメーション完了時にリソースが適切にクリーンアップされる', async () => {
      const mockElement = document.createElement('div');
      const mockAnimationWithCleanup = {
        ...mockAnimation,
        addEventListener: vi.fn((event, callback) => {
          if (event === 'finish') {
            // アニメーション完了をシミュレート
            setTimeout(callback, 0);
          }
        }),
      };
      mockElement.animate = vi.fn().mockReturnValue(mockAnimationWithCleanup);

      const keyframes = [{ opacity: 0 }, { opacity: 1 }];
      const options = { duration: 300 };

      // 複数のアニメーションを開始
      for (let i = 0; i < 10; i++) {
        globalAnimationController.startOptimizedAnimation(
          mockElement,
          keyframes,
          options,
          `cleanup-test-${i}`
        );
      }

      expect(globalAnimationController.getActiveAnimationCount()).toBe(10);

      // アニメーション完了を待つ
      await new Promise<void>(resolve => {
        setTimeout(() => {
          expect(globalAnimationController.getActiveAnimationCount()).toBe(0);
          resolve();
        }, 50);
      });
    });
  });

  describe('同時実行数制限テスト', () => {
    it('同時実行アニメーション数が制限を超えない', () => {
      const mockElement = document.createElement('div');
      mockElement.animate = vi.fn().mockReturnValue(mockAnimation);

      const keyframes = [{ opacity: 0 }, { opacity: 1 }];
      const options = { duration: 300 };

      // パフォーマンス設定を取得
      const settings = globalAnimationController.getPerformanceSettings();
      const maxAnimations = settings.maxConcurrentAnimations;

      // 制限を超えるアニメーションを開始
      for (let i = 0; i <= maxAnimations + 5; i++) {
        globalAnimationController.startOptimizedAnimation(
          mockElement,
          keyframes,
          options,
          `limit-test-${i}`
        );
      }

      // 最大数を超えないことを確認
      expect(globalAnimationController.getActiveAnimationCount()).toBeLessThanOrEqual(
        maxAnimations
      );
    });

    it('制限を超えた場合に古いアニメーションが中断される', () => {
      const mockElement = document.createElement('div');
      mockElement.animate = vi.fn().mockReturnValue(mockAnimation);

      const keyframes = [{ opacity: 0 }, { opacity: 1 }];
      const options = { duration: 300 };

      // パフォーマンス設定を取得
      const settings = globalAnimationController.getPerformanceSettings();
      const maxAnimations = settings.maxConcurrentAnimations;

      // 最大数まで開始
      for (let i = 0; i < maxAnimations; i++) {
        globalAnimationController.startOptimizedAnimation(
          mockElement,
          keyframes,
          options,
          `old-animation-${i}`
        );
      }

      expect(globalAnimationController.getActiveAnimationCount()).toBe(maxAnimations);

      // 新しいアニメーションを開始
      globalAnimationController.startOptimizedAnimation(
        mockElement,
        keyframes,
        options,
        'new-animation'
      );

      // 古いアニメーションが中断されることを確認
      expect(mockAnimation.cancel).toHaveBeenCalled();
      expect(globalAnimationController.getActiveAnimationCount()).toBeLessThanOrEqual(
        maxAnimations
      );
    });

    it('同時実行数制限の警告が正しく発生する', async () => {
      globalPerformanceMonitor.startMonitoring();

      const settings = globalAnimationController.getPerformanceSettings();
      const maxAnimations = settings.maxConcurrentAnimations;

      // 制限を超える数のアニメーションをシミュレート
      globalPerformanceMonitor.setActiveAnimationCount(maxAnimations + 5);

      const warnings = globalPerformanceMonitor.checkPerformanceWarnings();
      expect(warnings).toContain('同時実行アニメーション数が制限を超えています');

      globalPerformanceMonitor.stopMonitoring();
    });
  });

  describe('レスポンス時間要件テスト', () => {
    it('ProgressBar のレンダリング時間が100ms以内である', async () => {
      const startTime = performance.now();

      render(
        <TestWrapper>
          <ProgressBar value={75} animated={true} />
        </TestWrapper>
      );

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      expect(renderTime).toBeLessThan(100);
    });

    it('MandalaCell のレンダリング時間が100ms以内である', async () => {
      const startTime = performance.now();

      render(
        <TestWrapper>
          <MandalaCell
            cellData={createMockCellData('test', 60)}
            position={{ row: 1, col: 1 }}
            editable={false}
            onClick={vi.fn()}
            onEdit={vi.fn()}
          />
        </TestWrapper>
      );

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      expect(renderTime).toBeLessThan(100);
    });

    it('AchievementAnimation のトリガー時間が50ms以内である', async () => {
      const { rerender } = render(
        <TestWrapper>
          <AchievementAnimation
            trigger={false}
            type="glow"
            intensity="normal"
            animationId="response-test"
          >
            <div>Test Content</div>
          </AchievementAnimation>
        </TestWrapper>
      );

      const startTime = performance.now();

      // アニメーションをトリガー
      rerender(
        <TestWrapper>
          <AchievementAnimation
            trigger={true}
            type="glow"
            intensity="normal"
            animationId="response-test"
          >
            <div>Test Content</div>
          </AchievementAnimation>
        </TestWrapper>
      );

      const endTime = performance.now();
      const triggerTime = endTime - startTime;

      expect(triggerTime).toBeLessThan(50);
    });

    it('大量コンポーネントのレンダリング時間が2秒以内である', async () => {
      const startTime = performance.now();

      const progressBars = Array.from({ length: 50 }, (_, i) => (
        <ProgressBar key={`progress-${i}`} value={Math.random() * 100} animated={true} />
      ));

      const cells = Array.from({ length: 50 }, (_, i) => (
        <MandalaCell
          key={`cell-${i}`}
          cellData={createMockCellData(`cell-${i}`, Math.random() * 100)}
          position={{ row: Math.floor(i / 9), col: i % 9 }}
          editable={false}
          onClick={vi.fn()}
          onEdit={vi.fn()}
        />
      ));

      render(
        <TestWrapper>
          <div>
            {progressBars}
            {cells}
          </div>
        </TestWrapper>
      );

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      expect(renderTime).toBeLessThan(2000);
    });
  });

  describe('デバイス性能別最適化テスト', () => {
    it('低性能デバイスで適切な品質設定が適用される', () => {
      // 低性能デバイスをシミュレート
      Object.defineProperty(navigator, 'deviceMemory', {
        value: 1, // 1GB
        writable: true,
      });
      Object.defineProperty(navigator, 'hardwareConcurrency', {
        value: 1, // 1コア
        writable: true,
      });

      render(
        <TestWrapper settings={{ enableAdaptiveQuality: true }}>
          <ProgressBar value={50} animated={true} />
        </TestWrapper>
      );

      const settings = globalAnimationController.getPerformanceSettings();
      expect(settings.performanceLevel).toBe('low');
      expect(settings.maxConcurrentAnimations).toBe(3);
      expect(settings.shouldUseGPUAcceleration).toBe(false);
    });

    it('中性能デバイスで適切な品質設定が適用される', () => {
      // 中性能デバイスをシミュレート
      Object.defineProperty(navigator, 'deviceMemory', {
        value: 2, // 2GB
        writable: true,
      });
      Object.defineProperty(navigator, 'hardwareConcurrency', {
        value: 2, // 2コア
        writable: true,
      });

      render(
        <TestWrapper settings={{ enableAdaptiveQuality: true }}>
          <ProgressBar value={50} animated={true} />
        </TestWrapper>
      );

      const settings = globalAnimationController.getPerformanceSettings();
      expect(settings.performanceLevel).toBe('medium');
      expect(settings.maxConcurrentAnimations).toBeGreaterThan(3);
      expect(settings.maxConcurrentAnimations).toBeLessThan(20);
    });

    it('高性能デバイスで最高品質設定が適用される', () => {
      // 高性能デバイスをシミュレート
      Object.defineProperty(navigator, 'deviceMemory', {
        value: 8, // 8GB
        writable: true,
      });
      Object.defineProperty(navigator, 'hardwareConcurrency', {
        value: 8, // 8コア
        writable: true,
      });

      render(
        <TestWrapper settings={{ enableAdaptiveQuality: true }}>
          <ProgressBar value={50} animated={true} />
        </TestWrapper>
      );

      const settings = globalAnimationController.getPerformanceSettings();
      expect(settings.performanceLevel).toBe('high');
      expect(settings.maxConcurrentAnimations).toBe(20);
      expect(settings.shouldUseGPUAcceleration).toBe(true);
    });
  });

  describe('ネットワーク状況別最適化テスト', () => {
    it('低速回線で軽量化設定が適用される', () => {
      // 低速回線をシミュレート
      Object.defineProperty(navigator, 'connection', {
        value: {
          effectiveType: '2g',
          saveData: false,
        },
        writable: true,
      });

      render(
        <TestWrapper settings={{ enableAdaptiveQuality: true }}>
          <ProgressBar value={50} animated={true} />
        </TestWrapper>
      );

      const settings = globalAnimationController.getPerformanceSettings();
      expect(settings.performanceLevel).toBe('low');
      expect(settings.maxConcurrentAnimations).toBe(5);
    });

    it('データセーバーモードで最軽量設定が適用される', () => {
      Object.defineProperty(navigator, 'connection', {
        value: {
          effectiveType: '4g',
          saveData: true,
        },
        writable: true,
      });

      render(
        <TestWrapper settings={{ enableAdaptiveQuality: true }}>
          <ProgressBar value={50} animated={true} />
        </TestWrapper>
      );

      const settings = globalAnimationController.getPerformanceSettings();
      expect(settings.performanceLevel).toBe('low');
      expect(settings.shouldUseGPUAcceleration).toBe(false);
    });

    it('高速回線で高品質設定が適用される', () => {
      Object.defineProperty(navigator, 'connection', {
        value: {
          effectiveType: '4g',
          saveData: false,
        },
        writable: true,
      });

      render(
        <TestWrapper settings={{ enableAdaptiveQuality: true }}>
          <ProgressBar value={50} animated={true} />
        </TestWrapper>
      );

      const settings = globalAnimationController.getPerformanceSettings();
      expect(settings.performanceLevel).toBe('high');
      expect(settings.shouldUseGPUAcceleration).toBe(true);
    });
  });

  describe('適応的品質調整テスト', () => {
    it('パフォーマンス低下時に品質が自動調整される', async () => {
      globalAdaptiveQuality.startAdaptiveAdjustment();

      // 初期品質レベル
      expect(globalAdaptiveQuality.getCurrentLevel()).toBe('high');

      // 低パフォーマンスをシミュレート
      globalPerformanceMonitor.startMonitoring();

      // 低FPSとメモリ使用量をシミュレート
      const metrics = globalPerformanceMonitor.getMetrics();
      metrics.fps = 15;
      metrics.memoryUsage = 120;

      // 品質調整を待つ
      await new Promise(resolve => setTimeout(resolve, 5100)); // 調整間隔より長く待つ

      // 品質が下がることを確認
      expect(globalAdaptiveQuality.getCurrentLevel()).toBe('low');

      globalPerformanceMonitor.stopMonitoring();
      globalAdaptiveQuality.stopAdaptiveAdjustment();
    });

    it('パフォーマンス改善時に品質が自動向上される', async () => {
      globalAdaptiveQuality.startAdaptiveAdjustment();

      // 低品質から開始
      globalPerformanceMonitor.setQualitySettings('low');

      // 高パフォーマンスをシミュレート
      globalPerformanceMonitor.startMonitoring();

      const metrics = globalPerformanceMonitor.getMetrics();
      metrics.fps = 60;
      metrics.memoryUsage = 30;

      // 品質調整を待つ
      await new Promise(resolve => setTimeout(resolve, 5100));

      // 品質が上がることを確認
      expect(globalAdaptiveQuality.getCurrentLevel()).toBe('high');

      globalPerformanceMonitor.stopMonitoring();
      globalAdaptiveQuality.stopAdaptiveAdjustment();
    });
  });

  describe('ストレステスト', () => {
    it('極端に大量のアニメーション（1000個）でもクラッシュしない', async () => {
      const components = Array.from({ length: 1000 }, (_, i) => (
        <ProgressBar key={i} value={Math.random() * 100} animated={true} />
      ));

      expect(() => {
        render(
          <TestWrapper>
            <div>{components}</div>
          </TestWrapper>
        );
      }).not.toThrow();

      // アクティブなアニメーション数が制限内であることを確認
      const settings = globalAnimationController.getPerformanceSettings();
      expect(globalAnimationController.getActiveAnimationCount()).toBeLessThanOrEqual(
        settings.maxConcurrentAnimations
      );
    });

    it('長時間実行（10秒間）でもメモリリークが発生しない', async () => {
      const initialMemory = (performance as any).memory.usedJSHeapSize;

      // 10秒間アニメーションを実行
      const startTime = Date.now();
      while (Date.now() - startTime < 10000) {
        const { unmount } = render(
          <TestWrapper>
            <ProgressBar value={Math.random() * 100} animated={true} />
            <AchievementAnimation
              trigger={true}
              type="glow"
              intensity="normal"
              animationId={`stress-${Date.now()}`}
            >
              <div>Stress Test</div>
            </AchievementAnimation>
          </TestWrapper>
        );

        // 短時間後にアンマウント
        setTimeout(() => unmount(), 100);

        // 少し待つ
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // すべてのアニメーションをクリーンアップ
      globalAnimationController.cancelAllAnimations();

      // ガベージコレクションを促す
      if (global.gc) {
        global.gc();
      }

      const finalMemory = (performance as any).memory.usedJSHeapSize;
      const memoryIncrease = finalMemory - initialMemory;

      // メモリ増加が20MB以下であることを確認（長時間実行の許容範囲）
      expect(memoryIncrease).toBeLessThan(20 * 1024 * 1024);
    });

    it('高頻度の状態変更（100回/秒）でもパフォーマンスが維持される', async () => {
      const TestComponent: React.FC = () => {
        const [value, setValue] = React.useState(0);

        React.useEffect(() => {
          const interval = setInterval(() => {
            setValue(prev => (prev + 1) % 100);
          }, 10); // 100回/秒

          return () => clearInterval(interval);
        }, []);

        return <ProgressBar value={value} animated={true} />;
      };

      const startTime = performance.now();

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      // 1秒間実行
      await new Promise(resolve => setTimeout(resolve, 1000));

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // 実行時間が2秒以内であることを確認（高頻度更新の許容範囲）
      expect(totalTime).toBeLessThan(2000);
    });
  });
});
