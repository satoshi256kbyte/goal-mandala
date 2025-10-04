import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AnimationSettingsProvider } from '../contexts/AnimationSettingsContext';
import { ProgressBar } from '../components/common/ProgressBar';
import { MandalaCell } from '../components/mandala/MandalaCell';
import {
  globalPerformanceMonitor,
  globalInterruptController,
  globalAdaptiveQuality,
  globalAccessibilityManager,
} from '../utils/animation-performance';
import { globalAchievementManager } from '../utils/achievement-manager';
import type { CellData, Position } from '../types';

// Web Animations API のモック
const mockAnimate = jest.fn();
const mockAnimation = {
  addEventListener: jest.fn(),
  cancel: jest.fn(),
  finish: jest.fn(),
};

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

// performance のモック
Object.defineProperty(global, 'performance', {
  value: {
    now: jest.fn().mockReturnValue(1000),
    memory: {
      usedJSHeapSize: 50 * 1024 * 1024,
    },
  },
  writable: true,
});

// requestAnimationFrame のモック
Object.defineProperty(global, 'requestAnimationFrame', {
  value: jest.fn(callback => {
    setTimeout(callback, 16); // 60fps をシミュレート
    return 1;
  }),
  writable: true,
});

Object.defineProperty(global, 'cancelAnimationFrame', {
  value: jest.fn(),
  writable: true,
});

describe('Animation Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    globalPerformanceMonitor.stopMonitoring();
    globalInterruptController.interruptAllAnimations();
    globalAdaptiveQuality.stopAdaptiveAdjustment();
    globalAchievementManager.clearPendingAchievements();
  });

  afterEach(() => {
    globalPerformanceMonitor.stopMonitoring();
    globalInterruptController.interruptAllAnimations();
    globalAdaptiveQuality.stopAdaptiveAdjustment();
  });

  describe('ProgressBar アニメーション統合', () => {
    it('進捗変化時にスムーズなアニメーションが実行される', async () => {
      const { rerender } = render(
        <AnimationSettingsProvider>
          <ProgressBar value={50} animated={true} />
        </AnimationSettingsProvider>
      );

      // 進捗を更新
      rerender(
        <AnimationSettingsProvider>
          <ProgressBar value={100} animated={true} />
        </AnimationSettingsProvider>
      );

      // プログレスバーが更新されることを確認
      await waitFor(() => {
        const progressBar = screen.getByRole('progressbar');
        expect(progressBar).toHaveAttribute('aria-valuenow', '100');
      });
    });

    it('100%達成時に達成アニメーションが実行される', async () => {
      const onAchievement = jest.fn();

      const { rerender } = render(
        <AnimationSettingsProvider>
          <ProgressBar value={99} onAchievement={onAchievement} />
        </AnimationSettingsProvider>
      );

      // 100%に更新
      rerender(
        <AnimationSettingsProvider>
          <ProgressBar value={100} onAchievement={onAchievement} />
        </AnimationSettingsProvider>
      );

      await waitFor(() => {
        expect(onAchievement).toHaveBeenCalled();
      });
    });

    it('アニメーション無効時はアニメーションが実行されない', () => {
      render(
        <AnimationSettingsProvider initialSettings={{ enabled: false }}>
          <ProgressBar value={100} animated={true} />
        </AnimationSettingsProvider>
      );

      // アニメーションが実行されないことを確認
      expect(mockAnimate).not.toHaveBeenCalled();
    });
  });

  describe('MandalaCell アニメーション統合', () => {
    const mockCellData: CellData = {
      id: 'test-cell',
      type: 'action',
      title: 'Test Action',
      description: 'Test Description',
      progress: 50,
      status: 'execution',
    };

    const mockPosition: Position = { row: 1, col: 1 };

    it('セルの進捗変化時に色変化アニメーションが実行される', async () => {
      const { rerender } = render(
        <AnimationSettingsProvider>
          <MandalaCell
            cellData={mockCellData}
            position={mockPosition}
            editable={false}
            onClick={jest.fn()}
            onEdit={jest.fn()}
          />
        </AnimationSettingsProvider>
      );

      // 進捗を更新
      const updatedCellData = { ...mockCellData, progress: 100 };
      rerender(
        <AnimationSettingsProvider>
          <MandalaCell
            cellData={updatedCellData}
            position={mockPosition}
            editable={false}
            onClick={jest.fn()}
            onEdit={jest.fn()}
          />
        </AnimationSettingsProvider>
      );

      // セルが更新されることを確認
      await waitFor(() => {
        expect(screen.getByText('100%')).toBeInTheDocument();
      });
    });

    it('100%達成時に達成アニメーションが実行される', async () => {
      const onAchievement = jest.fn();

      const { rerender } = render(
        <AnimationSettingsProvider>
          <MandalaCell
            cellData={mockCellData}
            position={mockPosition}
            editable={false}
            onClick={jest.fn()}
            onEdit={jest.fn()}
            onAchievement={onAchievement}
          />
        </AnimationSettingsProvider>
      );

      // 100%に更新
      const completedCellData = { ...mockCellData, progress: 100 };
      rerender(
        <AnimationSettingsProvider>
          <MandalaCell
            cellData={completedCellData}
            position={mockPosition}
            editable={false}
            onClick={jest.fn()}
            onEdit={jest.fn()}
            onAchievement={onAchievement}
          />
        </AnimationSettingsProvider>
      );

      await waitFor(() => {
        expect(onAchievement).toHaveBeenCalledWith(completedCellData);
      });
    });

    it('アニメーション無効時は達成アニメーションが実行されない', async () => {
      const onAchievement = jest.fn();

      render(
        <AnimationSettingsProvider initialSettings={{ enabled: false }}>
          <MandalaCell
            cellData={{ ...mockCellData, progress: 100 }}
            position={mockPosition}
            editable={false}
            onClick={jest.fn()}
            onEdit={jest.fn()}
            onAchievement={onAchievement}
          />
        </AnimationSettingsProvider>
      );

      // 少し待ってもコールバックが呼ばれないことを確認
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(onAchievement).not.toHaveBeenCalled();
    });
  });

  describe('パフォーマンス監視統合', () => {
    it('アニメーション実行時にパフォーマンス監視が開始される', async () => {
      const startSpy = jest.spyOn(globalPerformanceMonitor, 'startMonitoring');

      render(
        <AnimationSettingsProvider initialSettings={{ enablePerformanceMonitoring: true }}>
          <ProgressBar value={50} animated={true} />
        </AnimationSettingsProvider>
      );

      await waitFor(() => {
        expect(startSpy).toHaveBeenCalled();
      });

      startSpy.mockRestore();
    });

    it('アニメーション無効時はパフォーマンス監視が停止される', async () => {
      const stopSpy = jest.spyOn(globalPerformanceMonitor, 'stopMonitoring');

      render(
        <AnimationSettingsProvider
          initialSettings={{
            enabled: false,
            enablePerformanceMonitoring: true,
          }}
        >
          <ProgressBar value={50} animated={true} />
        </AnimationSettingsProvider>
      );

      await waitFor(() => {
        expect(stopSpy).toHaveBeenCalled();
      });

      stopSpy.mockRestore();
    });
  });

  describe('アニメーション中断機能統合', () => {
    it('アニメーション中断時にすべてのアニメーションが停止される', async () => {
      const cancelSpy = jest.spyOn(mockAnimation, 'cancel');

      render(
        <AnimationSettingsProvider>
          <ProgressBar value={100} animated={true} />
        </AnimationSettingsProvider>
      );

      // アニメーションを中断
      act(() => {
        globalInterruptController.interruptAllAnimations();
      });

      expect(cancelSpy).toHaveBeenCalled();

      cancelSpy.mockRestore();
    });
  });

  describe('アクセシビリティ統合', () => {
    it('動きを減らす設定が有効な場合、アニメーションが無効になる', () => {
      // 動きを減らす設定を有効にする
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(() => ({
          matches: true, // prefers-reduced-motion: reduce
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
        })),
      });

      render(
        <AnimationSettingsProvider>
          <ProgressBar value={100} animated={true} />
        </AnimationSettingsProvider>
      );

      // アニメーションが実行されないことを確認
      expect(mockAnimate).not.toHaveBeenCalled();
    });

    it('手動でアニメーションを無効化できる', async () => {
      render(
        <AnimationSettingsProvider>
          <ProgressBar value={50} animated={true} />
        </AnimationSettingsProvider>
      );

      // 手動でアニメーションを無効化
      act(() => {
        globalAccessibilityManager.setDisabled(true);
      });

      // 新しいアニメーションが実行されないことを確認
      const { rerender } = render(
        <AnimationSettingsProvider>
          <ProgressBar value={100} animated={true} />
        </AnimationSettingsProvider>
      );

      expect(mockAnimate).not.toHaveBeenCalled();
    });
  });

  describe('複数コンポーネント間の連携', () => {
    it('複数のProgressBarが同時に動作する', async () => {
      const { rerender } = render(
        <AnimationSettingsProvider>
          <ProgressBar value={50} animated={true} data-testid="progress-1" />
          <ProgressBar value={75} animated={true} data-testid="progress-2" />
        </AnimationSettingsProvider>
      );

      // 両方の進捗を更新
      rerender(
        <AnimationSettingsProvider>
          <ProgressBar value={100} animated={true} data-testid="progress-1" />
          <ProgressBar value={100} animated={true} data-testid="progress-2" />
        </AnimationSettingsProvider>
      );

      // 両方のプログレスバーが更新されることを確認
      await waitFor(() => {
        const progressBars = screen.getAllByRole('progressbar');
        progressBars.forEach(bar => {
          expect(bar).toHaveAttribute('aria-valuenow', '100');
        });
      });
    });

    it('複数のMandalaCell達成時にスタガードアニメーションが実行される', async () => {
      const onAchievement1 = jest.fn();
      const onAchievement2 = jest.fn();

      const cellData1: CellData = { ...mockCellData, id: 'cell-1' };
      const cellData2: CellData = { ...mockCellData, id: 'cell-2' };

      const { rerender } = render(
        <AnimationSettingsProvider>
          <MandalaCell
            cellData={cellData1}
            position={{ row: 1, col: 1 }}
            editable={false}
            onClick={jest.fn()}
            onEdit={jest.fn()}
            onAchievement={onAchievement1}
          />
          <MandalaCell
            cellData={cellData2}
            position={{ row: 1, col: 2 }}
            editable={false}
            onClick={jest.fn()}
            onEdit={jest.fn()}
            onAchievement={onAchievement2}
          />
        </AnimationSettingsProvider>
      );

      // 両方を100%に更新
      rerender(
        <AnimationSettingsProvider>
          <MandalaCell
            cellData={{ ...cellData1, progress: 100 }}
            position={{ row: 1, col: 1 }}
            editable={false}
            onClick={jest.fn()}
            onEdit={jest.fn()}
            onAchievement={onAchievement1}
          />
          <MandalaCell
            cellData={{ ...cellData2, progress: 100 }}
            position={{ row: 1, col: 2 }}
            editable={false}
            onClick={jest.fn()}
            onEdit={jest.fn()}
            onAchievement={onAchievement2}
          />
        </AnimationSettingsProvider>
      );

      await waitFor(() => {
        expect(onAchievement1).toHaveBeenCalled();
        expect(onAchievement2).toHaveBeenCalled();
      });
    });
  });

  describe('エラーハンドリング', () => {
    it('アニメーション実行中にエラーが発生しても他のアニメーションに影響しない', async () => {
      // 一つのアニメーションでエラーを発生させる
      mockAnimate.mockImplementationOnce(() => {
        throw new Error('Animation error');
      });

      const { rerender } = render(
        <AnimationSettingsProvider>
          <ProgressBar value={50} animated={true} data-testid="progress-1" />
          <ProgressBar value={50} animated={true} data-testid="progress-2" />
        </AnimationSettingsProvider>
      );

      // エラーが発生しても他のコンポーネントは正常に動作することを確認
      expect(() => {
        rerender(
          <AnimationSettingsProvider>
            <ProgressBar value={100} animated={true} data-testid="progress-1" />
            <ProgressBar value={100} animated={true} data-testid="progress-2" />
          </AnimationSettingsProvider>
        );
      }).not.toThrow();
    });
  });

  describe('メモリリーク防止', () => {
    it('コンポーネントアンマウント時にアニメーションがクリーンアップされる', () => {
      const { unmount } = render(
        <AnimationSettingsProvider>
          <ProgressBar value={50} animated={true} />
        </AnimationSettingsProvider>
      );

      // アンマウント
      unmount();

      // アクティブなアニメーション数が0になることを確認
      expect(globalInterruptController.getActiveAnimationCount()).toBe(0);
    });
  });
});
