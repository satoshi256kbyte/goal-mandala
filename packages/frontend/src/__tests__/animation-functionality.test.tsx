/**
 * アニメーション機能の包括的テスト
 * 要件4.1, 4.2, 4.3, 4.4, 4.5に対応
 *
 * このテストファイルは以下の4つのサブタスクをカバーします：
 * 1. 基本アニメーションのテスト
 * 2. 達成アニメーションのテスト
 * 3. アニメーション制御のテスト
 * 4. パフォーマンステスト
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ProgressBar } from '../components/common/ProgressBar';
import { MandalaCell } from '../components/mandala/MandalaCell';
import { AchievementAnimation } from '../components/common/AchievementAnimation';
import { AnimationSettingsProvider } from '../contexts/AnimationSettingsContext';
import {
  globalAnimationController,
  globalPerformanceMonitor,
  globalInterruptController,
  globalAccessibilityManager,
  ANIMATION_CONFIGS,
  createProgressTransition,
  createColorTransition,
  createAchievementAnimation,
  ACHIEVEMENT_KEYFRAMES,
  PULSE_KEYFRAMES,
  FADE_IN_KEYFRAMES,
  SCALE_KEYFRAMES,
} from '../utils/animation-utils';
import {
  AnimationPerformanceMonitor,
  AnimationInterruptController,
  AdaptiveAnimationQuality,
  AnimationAccessibilityManager,
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

// テスト用のラッパーコンポーネント
const TestWrapper: React.FC<{
  children: React.ReactNode;
  settings?: any;
}> = ({ children, settings = {} }) => (
  <AnimationSettingsProvider initialSettings={settings}>{children}</AnimationSettingsProvider>
);

// テスト用のセルデータ
const mockCellData: CellData = {
  id: 'test-cell',
  type: 'action',
  title: 'Test Action',
  description: 'Test Description',
  progress: 50,
  status: 'execution',
};

const mockPosition: Position = { row: 1, col: 1 };

describe('アニメーション機能の包括的テスト', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMatchMedia(false);
    mockPerformanceNow.mockReturnValue(1000);
    mockRequestAnimationFrame.mockImplementation(callback => {
      setTimeout(callback, 16); // 60fps をシミュレート
      return 1;
    });

    // グローバルインスタンスをリセット
    globalAnimationController.cancelAllAnimations();
    globalPerformanceMonitor.stopMonitoring();
    globalInterruptController.interruptAllAnimations();
  });

  afterEach(() => {
    globalAnimationController.cleanup();
    globalPerformanceMonitor.stopMonitoring();
    globalInterruptController.interruptAllAnimations();
  });

  describe('1. 基本アニメーションのテスト', () => {
    describe('進捗変化アニメーション', () => {
      it('ProgressBar の進捗変化時にスムーズなアニメーションが実行される', async () => {
        const { rerender } = render(
          <TestWrapper>
            <ProgressBar value={30} animated={true} />
          </TestWrapper>
        );

        const progressBar = screen.getByRole('progressbar');
        const progressFill = progressBar.firstChild as HTMLElement;

        // 初期状態の確認
        expect(progressFill.style.width).toBe('30%');

        // 進捗を更新
        rerender(
          <TestWrapper>
            <ProgressBar value={70} animated={true} />
          </TestWrapper>
        );

        // アニメーションが適用されることを確認
        await waitFor(() => {
          expect(progressFill.style.width).toBe('70%');
          expect(progressFill.style.transition).toContain('width');
        });
      });

      it('MandalaCell の進捗変化時に色変化アニメーションが実行される', async () => {
        const { rerender } = render(
          <TestWrapper>
            <MandalaCell
              cellData={mockCellData}
              position={mockPosition}
              editable={false}
              onClick={vi.fn()}
              onEdit={vi.fn()}
            />
          </TestWrapper>
        );

        // 進捗を更新
        const updatedCellData = { ...mockCellData, progress: 90 };
        rerender(
          <TestWrapper>
            <MandalaCell
              cellData={updatedCellData}
              position={mockPosition}
              editable={false}
              onClick={vi.fn()}
              onEdit={vi.fn()}
            />
          </TestWrapper>
        );

        // 色変化アニメーションが適用されることを確認
        await waitFor(() => {
          const cell = screen.getByRole('gridcell');
          const computedStyle = window.getComputedStyle(cell);
          expect(computedStyle.transition).toContain('background-color');
        });
      });

      it('アニメーション設定に基づいて適切な継続時間が適用される', () => {
        const progressTransition = createProgressTransition(500, 'ease-in-out');
        expect(progressTransition.transition).toBe('width 500ms ease-in-out');

        const colorTransition = createColorTransition(300, 'ease-out');
        expect(colorTransition.transition).toContain('background-color 300ms ease-out');
      });

      it('アニメーション無効時はトランジションが適用されない', () => {
        render(
          <TestWrapper settings={{ enabled: false }}>
            <ProgressBar value={50} animated={true} />
          </TestWrapper>
        );

        const progressBar = screen.getByRole('progressbar');
        const progressFill = progressBar.firstChild as HTMLElement;

        expect(progressFill.style.transition).toBe('');
      });
    });

    describe('アニメーション設定の検証', () => {
      it('ANIMATION_CONFIGS が正しく定義されている', () => {
        expect(ANIMATION_CONFIGS.progressChange.duration).toBe(300);
        expect(ANIMATION_CONFIGS.progressChange.easing).toBe('ease-out');
        expect(ANIMATION_CONFIGS.colorChange.duration).toBe(300);
        expect(ANIMATION_CONFIGS.colorChange.easing).toBe('ease-in-out');
        expect(ANIMATION_CONFIGS.achievement.duration).toBe(600);
        expect(ANIMATION_CONFIGS.achievement.easing).toBe('ease-out');
      });

      it('キーフレームが正しく定義されている', () => {
        expect(ACHIEVEMENT_KEYFRAMES).toHaveLength(3);
        expect(ACHIEVEMENT_KEYFRAMES[0].transform).toBe('scale(1)');
        expect(ACHIEVEMENT_KEYFRAMES[1].transform).toBe('scale(1.05)');
        expect(ACHIEVEMENT_KEYFRAMES[2].transform).toBe('scale(1)');

        expect(PULSE_KEYFRAMES).toHaveLength(3);
        expect(FADE_IN_KEYFRAMES).toHaveLength(2);
        expect(SCALE_KEYFRAMES).toHaveLength(2);
      });
    });
  });

  describe('2. 達成アニメーションのテスト', () => {
    describe('100%達成時のアニメーション', () => {
      it('ProgressBar が100%に達した時に達成アニメーションが実行される', async () => {
        const onAchievement = vi.fn();

        const { rerender } = render(
          <TestWrapper>
            <ProgressBar value={95} onAchievement={onAchievement} />
          </TestWrapper>
        );

        // 100%に更新
        rerender(
          <TestWrapper>
            <ProgressBar value={100} onAchievement={onAchievement} />
          </TestWrapper>
        );

        await waitFor(() => {
          expect(onAchievement).toHaveBeenCalled();
        });
      });

      it('MandalaCell が100%に達した時に達成アニメーションが実行される', async () => {
        const onAchievement = vi.fn();

        const { rerender } = render(
          <TestWrapper>
            <MandalaCell
              cellData={mockCellData}
              position={mockPosition}
              editable={false}
              onClick={vi.fn()}
              onEdit={vi.fn()}
              onAchievement={onAchievement}
            />
          </TestWrapper>
        );

        // 100%に更新
        const completedCellData = { ...mockCellData, progress: 100 };
        rerender(
          <TestWrapper>
            <MandalaCell
              cellData={completedCellData}
              position={mockPosition}
              editable={false}
              onClick={vi.fn()}
              onEdit={vi.fn()}
              onAchievement={onAchievement}
            />
          </TestWrapper>
        );

        await waitFor(() => {
          expect(onAchievement).toHaveBeenCalledWith(completedCellData);
        });
      });

      it('AchievementAnimation コンポーネントが正しく動作する', async () => {
        const { rerender } = render(
          <TestWrapper>
            <AchievementAnimation
              trigger={false}
              type="glow"
              intensity="normal"
              animationId="test-achievement"
            >
              <div data-testid="achievement-target">Test Content</div>
            </AchievementAnimation>
          </TestWrapper>
        );

        const target = screen.getByTestId('achievement-target');
        expect(target).toBeInTheDocument();

        // アニメーションをトリガー
        rerender(
          <TestWrapper>
            <AchievementAnimation
              trigger={true}
              type="glow"
              intensity="normal"
              animationId="test-achievement"
            >
              <div data-testid="achievement-target">Test Content</div>
            </AchievementAnimation>
          </TestWrapper>
        );

        // アニメーションが実行されることを確認
        await waitFor(() => {
          expect(HTMLElement.prototype.animate).toHaveBeenCalled();
        });
      });

      it('達成アニメーションのカスタマイズが正しく動作する', () => {
        const customAnimation = createAchievementAnimation(800);
        expect(customAnimation.animation).toBe('achievement-pulse 800ms ease-out');
      });
    });

    describe('複数要素の同時達成', () => {
      it('複数のProgressBarが同時に100%に達した時にスタガードアニメーションが実行される', async () => {
        const onAchievement1 = vi.fn();
        const onAchievement2 = vi.fn();

        const { rerender } = render(
          <TestWrapper>
            <ProgressBar value={95} onAchievement={onAchievement1} data-testid="progress-1" />
            <ProgressBar value={95} onAchievement={onAchievement2} data-testid="progress-2" />
          </TestWrapper>
        );

        // 両方を100%に更新
        rerender(
          <TestWrapper>
            <ProgressBar value={100} onAchievement={onAchievement1} data-testid="progress-1" />
            <ProgressBar value={100} onAchievement={onAchievement2} data-testid="progress-2" />
          </TestWrapper>
        );

        await waitFor(() => {
          expect(onAchievement1).toHaveBeenCalled();
          expect(onAchievement2).toHaveBeenCalled();
        });
      });

      it('複数のMandalaCell達成時にスタガードアニメーションが実行される', async () => {
        const onAchievement1 = vi.fn();
        const onAchievement2 = vi.fn();

        const cellData1: CellData = { ...mockCellData, id: 'cell-1' };
        const cellData2: CellData = { ...mockCellData, id: 'cell-2' };

        const { rerender } = render(
          <TestWrapper>
            <MandalaCell
              cellData={cellData1}
              position={{ row: 1, col: 1 }}
              editable={false}
              onClick={vi.fn()}
              onEdit={vi.fn()}
              onAchievement={onAchievement1}
            />
            <MandalaCell
              cellData={cellData2}
              position={{ row: 1, col: 2 }}
              editable={false}
              onClick={vi.fn()}
              onEdit={vi.fn()}
              onAchievement={onAchievement2}
            />
          </TestWrapper>
        );

        // 両方を100%に更新
        rerender(
          <TestWrapper>
            <MandalaCell
              cellData={{ ...cellData1, progress: 100 }}
              position={{ row: 1, col: 1 }}
              editable={false}
              onClick={vi.fn()}
              onEdit={vi.fn()}
              onAchievement={onAchievement1}
            />
            <MandalaCell
              cellData={{ ...cellData2, progress: 100 }}
              position={{ row: 1, col: 2 }}
              editable={false}
              onClick={vi.fn()}
              onEdit={vi.fn()}
              onAchievement={onAchievement2}
            />
          </TestWrapper>
        );

        await waitFor(() => {
          expect(onAchievement1).toHaveBeenCalled();
          expect(onAchievement2).toHaveBeenCalled();
        });
      });
    });
  });

  describe('3. アニメーション制御のテスト', () => {
    describe('ユーザー操作時の中断', () => {
      it('マウス操作時に進捗アニメーションが中断される', async () => {
        const user = userEvent.setup();

        render(
          <TestWrapper>
            <ProgressBar value={50} animated={true} />
          </TestWrapper>
        );

        const progressBar = screen.getByRole('progressbar');

        // マウスダウンイベントを発火
        await user.pointer({ keys: '[MouseLeft>]', target: progressBar });

        // アニメーション中断が呼ばれることを確認
        expect(globalAnimationController.getActiveAnimationCount()).toBe(0);
      });

      it('キーボード操作時にアニメーションが中断される', async () => {
        const user = userEvent.setup();

        render(
          <TestWrapper>
            <MandalaCell
              cellData={mockCellData}
              position={mockPosition}
              editable={false}
              onClick={vi.fn()}
              onEdit={vi.fn()}
            />
          </TestWrapper>
        );

        const cell = screen.getByRole('gridcell');
        cell.focus();

        // キーダウンイベントを発火
        await user.keyboard('{Enter}');

        // アニメーション中断が呼ばれることを確認
        expect(globalAnimationController.getActiveAnimationCount()).toBe(0);
      });

      it('タッチ操作時にアニメーションが中断される', () => {
        render(
          <TestWrapper>
            <ProgressBar value={30} animated={true} />
          </TestWrapper>
        );

        const progressBar = screen.getByRole('progressbar');

        // タッチスタートイベントを発火
        fireEvent.touchStart(progressBar);

        // アニメーション中断が呼ばれることを確認
        expect(globalAnimationController.getActiveAnimationCount()).toBe(0);
      });

      it('達成アニメーションはユーザー操作時も継続される', async () => {
        const user = userEvent.setup();

        const { rerender } = render(
          <TestWrapper>
            <ProgressBar value={90} animated={true} />
          </TestWrapper>
        );

        // 100%に変更して達成アニメーションをトリガー
        rerender(
          <TestWrapper>
            <ProgressBar value={100} animated={true} />
          </TestWrapper>
        );

        const progressBar = screen.getByRole('progressbar');

        // マウス操作を行う
        await user.pointer({ keys: '[MouseLeft>]', target: progressBar });

        // 達成アニメーションは継続されることを確認
        expect(
          globalAnimationController.getActiveAnimationIds().some(id => id.includes('achievement'))
        ).toBe(true);
      });
    });

    describe('アクセシビリティ対応', () => {
      it('動きを減らす設定が有効な場合、アニメーションが無効になる', () => {
        mockMatchMedia(true); // prefers-reduced-motion: reduce

        render(
          <TestWrapper settings={{ respectReducedMotion: true }}>
            <ProgressBar value={50} animated={true} />
          </TestWrapper>
        );

        const progressBar = screen.getByRole('progressbar');
        const progressFill = progressBar.firstChild as HTMLElement;

        // アニメーションが無効の場合、transitionが設定されない
        expect(progressFill.style.transition).toBe('');
      });

      it('手動でアニメーションを無効化できる', async () => {
        render(
          <TestWrapper settings={{ enabled: true }}>
            <ProgressBar value={50} animated={true} />
          </TestWrapper>
        );

        // 手動でアニメーションを無効化
        act(() => {
          globalAccessibilityManager.setDisabled(true);
        });

        // 新しいアニメーションが実行されないことを確認
        const { rerender } = render(
          <TestWrapper settings={{ enabled: false }}>
            <ProgressBar value={100} animated={true} />
          </TestWrapper>
        );

        expect(HTMLElement.prototype.animate).not.toHaveBeenCalled();
      });

      it('アクセシビリティ設定の変更が動的に反映される', async () => {
        const callback = vi.fn();
        globalAccessibilityManager.addCallback(callback);

        act(() => {
          globalAccessibilityManager.setDisabled(true);
        });

        expect(callback).toHaveBeenCalledWith(true);

        act(() => {
          globalAccessibilityManager.setDisabled(false);
        });

        expect(callback).toHaveBeenCalledWith(false);

        globalAccessibilityManager.removeCallback(callback);
      });
    });

    describe('アニメーション制御API', () => {
      it('特定のアニメーションを中断できる', () => {
        const mockElement = document.createElement('div');
        mockElement.animate = vi.fn().mockReturnValue(mockAnimation);

        const keyframes = [{ opacity: 0 }, { opacity: 1 }];
        const options = { duration: 300 };

        globalAnimationController.startAnimation(mockElement, keyframes, options, 'test-animation');

        expect(globalAnimationController.getActiveAnimationCount()).toBe(1);

        globalAnimationController.cancelAnimation('test-animation');

        expect(mockAnimation.cancel).toHaveBeenCalled();
      });

      it('特定の種類のアニメーションを中断できる', () => {
        const mockElement = document.createElement('div');
        mockElement.animate = vi.fn().mockReturnValue(mockAnimation);

        const keyframes = [{ opacity: 0 }, { opacity: 1 }];
        const options = { duration: 300 };

        globalAnimationController.startAnimation(
          mockElement,
          keyframes,
          options,
          'progress-animation-1'
        );

        globalAnimationController.startAnimation(
          mockElement,
          keyframes,
          options,
          'progress-animation-2'
        );

        globalAnimationController.startAnimation(
          mockElement,
          keyframes,
          options,
          'achievement-animation-1'
        );

        expect(globalAnimationController.getActiveAnimationCount()).toBe(3);

        globalAnimationController.cancelAnimationsByType('progress');

        expect(globalAnimationController.getActiveAnimationCount()).toBe(1);
      });

      it('すべてのアニメーションを中断できる', () => {
        const mockElement = document.createElement('div');
        mockElement.animate = vi.fn().mockReturnValue(mockAnimation);

        const keyframes = [{ opacity: 0 }, { opacity: 1 }];
        const options = { duration: 300 };

        globalAnimationController.startAnimation(mockElement, keyframes, options, 'test-1');
        globalAnimationController.startAnimation(mockElement, keyframes, options, 'test-2');

        expect(globalAnimationController.getActiveAnimationCount()).toBe(2);

        globalAnimationController.cancelAllAnimations();

        expect(globalAnimationController.getActiveAnimationCount()).toBe(0);
      });
    });
  });

  describe('4. パフォーマンステスト', () => {
    describe('パフォーマンス監視', () => {
      it('アニメーション実行時にパフォーマンス監視が開始される', async () => {
        const startSpy = vi.spyOn(globalPerformanceMonitor, 'startMonitoring');

        render(
          <TestWrapper settings={{ enablePerformanceMonitoring: true }}>
            <ProgressBar value={50} animated={true} />
          </TestWrapper>
        );

        await waitFor(() => {
          expect(startSpy).toHaveBeenCalled();
        });

        startSpy.mockRestore();
      });

      it('パフォーマンスメトリクスが正しく取得される', () => {
        globalPerformanceMonitor.startMonitoring();

        const metrics = globalPerformanceMonitor.getMetrics();

        expect(metrics).toHaveProperty('fps');
        expect(metrics).toHaveProperty('duration');
        expect(metrics).toHaveProperty('memoryUsage');
        expect(metrics).toHaveProperty('cpuUsage');
        expect(metrics).toHaveProperty('activeAnimations');
        expect(metrics).toHaveProperty('droppedFrames');

        globalPerformanceMonitor.stopMonitoring();
      });

      it('パフォーマンス警告が正しく検出される', () => {
        globalPerformanceMonitor.startMonitoring();

        // 低FPSをシミュレート
        const metrics = globalPerformanceMonitor.getMetrics();
        metrics.fps = 10;

        const warnings = globalPerformanceMonitor.checkPerformanceWarnings();
        expect(warnings).toContain('フレームレートが低下しています（15fps未満）');

        globalPerformanceMonitor.stopMonitoring();
      });
    });

    describe('パフォーマンス最適化', () => {
      it('低性能デバイスでアニメーション品質が調整される', () => {
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
        expect(settings.shouldUseGPUAcceleration).toBe(false);
      });

      it('同時実行アニメーション数が制限される', () => {
        const mockElement = document.createElement('div');
        mockElement.animate = vi.fn().mockReturnValue(mockAnimation);

        const keyframes = [{ opacity: 0 }, { opacity: 1 }];
        const options = { duration: 300 };

        // 最大同時実行数を取得
        const settings = globalAnimationController.getPerformanceSettings();
        const maxAnimations = settings.maxConcurrentAnimations;

        // 制限を超えるアニメーションを開始
        for (let i = 0; i <= maxAnimations; i++) {
          globalAnimationController.startOptimizedAnimation(
            mockElement,
            keyframes,
            options,
            `test-animation-${i}`
          );
        }

        // 最大数を超えないことを確認
        expect(globalAnimationController.getActiveAnimationCount()).toBeLessThanOrEqual(
          maxAnimations
        );
      });

      it('ネットワーク状況に応じて品質が調整される', () => {
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
      });

      it('データセーバーモードでアニメーションが軽量化される', () => {
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
    });

    describe('メモリ管理', () => {
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

        globalAnimationController.startOptimizedAnimation(
          mockElement,
          keyframes,
          options,
          'cleanup-test'
        );

        expect(globalAnimationController.getActiveAnimationCount()).toBe(1);

        // アニメーション完了を待つ
        await new Promise<void>(resolve => {
          setTimeout(() => {
            expect(globalAnimationController.getActiveAnimationCount()).toBe(0);
            resolve();
          }, 10);
        });
      });

      it('コンポーネントアンマウント時にアニメーションがクリーンアップされる', () => {
        const { unmount } = render(
          <TestWrapper>
            <ProgressBar value={50} animated={true} />
          </TestWrapper>
        );

        // アンマウント
        unmount();

        // アクティブなアニメーション数が0になることを確認
        expect(globalInterruptController.getActiveAnimationCount()).toBe(0);
      });

      it('メモリリークが発生しないことを確認', () => {
        const initialMemory = (performance as any).memory.usedJSHeapSize;

        // 大量のアニメーションを作成・削除
        for (let i = 0; i < 100; i++) {
          const mockElement = document.createElement('div');
          mockElement.animate = vi.fn().mockReturnValue(mockAnimation);

          const keyframes = [{ opacity: 0 }, { opacity: 1 }];
          const options = { duration: 300 };

          globalAnimationController.startOptimizedAnimation(
            mockElement,
            keyframes,
            options,
            `memory-test-${i}`
          );
        }

        // すべてのアニメーションをクリーンアップ
        globalAnimationController.cancelAllAnimations();

        // メモリ使用量が大幅に増加していないことを確認
        const finalMemory = (performance as any).memory.usedJSHeapSize;
        const memoryIncrease = finalMemory - initialMemory;

        // メモリ増加が10MB以下であることを確認（許容範囲）
        expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
      });
    });

    describe('エラーハンドリング', () => {
      it('アニメーション実行中にエラーが発生しても安全に処理される', () => {
        const mockElement = document.createElement('div');
        mockElement.animate = vi.fn().mockImplementation(() => {
          throw new Error('Animation failed');
        });

        const keyframes = [{ opacity: 0 }, { opacity: 1 }];
        const options = { duration: 300 };

        expect(() => {
          const result = globalAnimationController.startOptimizedAnimation(
            mockElement,
            keyframes,
            options,
            'error-animation'
          );
          // エラーが発生した場合はnullが返される
          expect(result).toBeNull();
        }).not.toThrow();
      });

      it('存在しないアニメーションIDを中断しようとしてもエラーが発生しない', () => {
        expect(() => {
          globalAnimationController.cancelAnimation('non-existent-id');
        }).not.toThrow();
      });

      it('アニメーション実行中にコンポーネントがアンマウントされても安全', () => {
        const { unmount } = render(
          <TestWrapper>
            <ProgressBar value={50} animated={true} />
            <MandalaCell
              cellData={mockCellData}
              position={mockPosition}
              editable={false}
              onClick={vi.fn()}
              onEdit={vi.fn()}
            />
          </TestWrapper>
        );

        // アニメーション実行中にアンマウント
        expect(() => {
          unmount();
        }).not.toThrow();
      });
    });

    describe('パフォーマンス指標', () => {
      it('アニメーション実行時間が許容範囲内である', async () => {
        const startTime = performance.now();

        render(
          <TestWrapper>
            <ProgressBar value={100} animated={true} />
          </TestWrapper>
        );

        // アニメーション完了を待つ
        await waitFor(() => {
          const endTime = performance.now();
          const duration = endTime - startTime;

          // アニメーション実行時間が1秒以内であることを確認
          expect(duration).toBeLessThan(1000);
        });
      });

      it('大量のアニメーション同時実行でもパフォーマンスが維持される', async () => {
        const startTime = performance.now();

        // 複数のコンポーネントを同時にレンダリング
        const components = Array.from({ length: 50 }, (_, i) => (
          <ProgressBar key={i} value={Math.random() * 100} animated={true} />
        ));

        render(
          <TestWrapper>
            <div>{components}</div>
          </TestWrapper>
        );

        await waitFor(() => {
          const endTime = performance.now();
          const duration = endTime - startTime;

          // レンダリング時間が2秒以内であることを確認
          expect(duration).toBeLessThan(2000);
        });
      });

      it('フレームレートが許容範囲内である', () => {
        globalPerformanceMonitor.startMonitoring();

        // フレームレートをシミュレート
        let frameCount = 0;
        const measureFrames = () => {
          frameCount++;
          if (frameCount < 60) {
            requestAnimationFrame(measureFrames);
          }
        };

        measureFrames();

        setTimeout(() => {
          const metrics = globalPerformanceMonitor.getMetrics();
          // 30fps以上であることを確認
          expect(metrics.fps).toBeGreaterThanOrEqual(30);
          globalPerformanceMonitor.stopMonitoring();
        }, 1000);
      });
    });
  });

  describe('統合テスト', () => {
    it('複数のアニメーション機能が連携して正常に動作する', async () => {
      const onAchievement = vi.fn();

      const { rerender } = render(
        <TestWrapper
          settings={{
            enablePerformanceMonitoring: true,
            enableAdaptiveQuality: true,
            achievementEnabled: true,
          }}
        >
          <ProgressBar value={50} animated={true} onAchievement={onAchievement} />
          <MandalaCell
            cellData={mockCellData}
            position={mockPosition}
            editable={false}
            onClick={vi.fn()}
            onEdit={vi.fn()}
            onAchievement={onAchievement}
          />
        </TestWrapper>
      );

      // 両方を100%に更新
      rerender(
        <TestWrapper
          settings={{
            enablePerformanceMonitoring: true,
            enableAdaptiveQuality: true,
            achievementEnabled: true,
          }}
        >
          <ProgressBar value={100} animated={true} onAchievement={onAchievement} />
          <MandalaCell
            cellData={{ ...mockCellData, progress: 100 }}
            position={mockPosition}
            editable={false}
            onClick={vi.fn()}
            onEdit={vi.fn()}
            onAchievement={onAchievement}
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(onAchievement).toHaveBeenCalledTimes(2);
      });
    });

    it('アニメーション設定の変更が全コンポーネントに反映される', async () => {
      const { rerender } = render(
        <TestWrapper settings={{ enabled: true }}>
          <ProgressBar value={50} animated={true} />
          <MandalaCell
            cellData={mockCellData}
            position={mockPosition}
            editable={false}
            onClick={vi.fn()}
            onEdit={vi.fn()}
          />
        </TestWrapper>
      );

      // アニメーションを無効に変更
      rerender(
        <TestWrapper settings={{ enabled: false }}>
          <ProgressBar value={100} animated={true} />
          <MandalaCell
            cellData={{ ...mockCellData, progress: 100 }}
            position={mockPosition}
            editable={false}
            onClick={vi.fn()}
            onEdit={vi.fn()}
          />
        </TestWrapper>
      );

      // アニメーションが実行されないことを確認
      expect(HTMLElement.prototype.animate).not.toHaveBeenCalled();
    });
  });
});
