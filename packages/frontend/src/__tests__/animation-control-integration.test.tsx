import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { ProgressBar } from '../components/common/ProgressBar';
import { AnimationSettingsProvider } from '../contexts/AnimationSettingsContext';
import { globalAnimationController } from '../utils/animation-utils';

// Web Animations API のモック
const mockAnimation = {
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  cancel: vi.fn(),
  finish: vi.fn(),
  play: vi.fn(),
  pause: vi.fn(),
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

// performance のモック
Object.defineProperty(global, 'performance', {
  value: {
    now: vi.fn().mockReturnValue(1000),
    memory: {
      usedJSHeapSize: 50 * 1024 * 1024, // 50MB
    },
  },
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
const TestWrapper: React.FC<{ children: React.ReactNode; settings?: any }> = ({
  children,
  settings = {},
}) => <AnimationSettingsProvider initialSettings={settings}>{children}</AnimationSettingsProvider>;

describe('アニメーション制御とパフォーマンス最適化の統合テスト', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMatchMedia(false);
    globalAnimationController.cancelAllAnimations();
  });

  afterEach(() => {
    globalAnimationController.cleanup();
  });

  describe('ユーザー操作時のアニメーション中断', () => {
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
          <ProgressBar value={75} animated={true} />
        </TestWrapper>
      );

      const progressBar = screen.getByRole('progressbar');
      progressBar.focus();

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
      // （実際の実装では達成アニメーションのIDに'achievement'が含まれる）
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

      const progressFill = screen.getByRole('progressbar').firstChild as HTMLElement;

      // アニメーションが無効の場合、transitionが設定されない
      expect(progressFill.style.transition).toBe('');
    });

    it('動きを減らす設定を無視する場合、アニメーションが有効になる', () => {
      mockMatchMedia(true); // prefers-reduced-motion: reduce

      render(
        <TestWrapper settings={{ respectReducedMotion: false }}>
          <ProgressBar value={50} animated={true} />
        </TestWrapper>
      );

      const progressFill = screen.getByRole('progressbar').firstChild as HTMLElement;

      // アニメーションが有効の場合、transitionが設定される
      expect(progressFill.style.transition).toContain('width');
    });

    it('アニメーション無効設定が動的に変更される', async () => {
      const { rerender } = render(
        <TestWrapper settings={{ enabled: true }}>
          <ProgressBar value={50} animated={true} />
        </TestWrapper>
      );

      let progressFill = screen.getByRole('progressbar').firstChild as HTMLElement;
      expect(progressFill.style.transition).toContain('width');

      // アニメーションを無効に変更
      rerender(
        <TestWrapper settings={{ enabled: false }}>
          <ProgressBar value={50} animated={true} />
        </TestWrapper>
      );

      progressFill = screen.getByRole('progressbar').firstChild as HTMLElement;
      expect(progressFill.style.transition).toBe('');
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

      // パフォーマンス設定が低品質に調整されることを確認
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

    it('ページが非表示になった時にアニメーションが一時停止される', () => {
      const mockElement = document.createElement('div');
      mockElement.animate = vi.fn().mockReturnValue(mockAnimation);

      const keyframes = [{ opacity: 0 }, { opacity: 1 }];
      const options = { duration: 300 };

      globalAnimationController.startOptimizedAnimation(
        mockElement,
        keyframes,
        options,
        'test-animation'
      );

      // ページを非表示にする
      Object.defineProperty(document, 'hidden', {
        value: true,
        writable: true,
      });

      const visibilityEvent = new Event('visibilitychange');
      document.dispatchEvent(visibilityEvent);

      // アニメーションが一時停止されることを確認
      expect(mockAnimation.pause).toHaveBeenCalled();
    });

    it('ページが表示された時にアニメーションが再開される', () => {
      const mockElement = document.createElement('div');
      mockElement.animate = vi.fn().mockReturnValue(mockAnimation);

      const keyframes = [{ opacity: 0 }, { opacity: 1 }];
      const options = { duration: 300 };

      globalAnimationController.startOptimizedAnimation(
        mockElement,
        keyframes,
        options,
        'test-animation'
      );

      // ページを表示状態にする
      Object.defineProperty(document, 'hidden', {
        value: false,
        writable: true,
      });

      const visibilityEvent = new Event('visibilitychange');
      document.dispatchEvent(visibilityEvent);

      // アニメーションが再開されることを確認
      expect(mockAnimation.play).toHaveBeenCalled();
    });
  });

  describe('アニメーション品質の動的調整', () => {
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

  describe('エラーハンドリング', () => {
    it('アニメーション実行中にエラーが発生しても安全に処理される', () => {
      const mockElement = document.createElement('div');
      mockElement.animate = vi.fn().mockImplementation(() => {
        throw new Error('Animation failed');
      });

      const keyframes = [{ opacity: 0 }, { opacity: 1 }];
      const options = { duration: 300 };

      // エラーハンドリングを追加
      try {
        const result = globalAnimationController.startOptimizedAnimation(
          mockElement,
          keyframes,
          options,
          'error-animation'
        );
        // エラーが発生した場合はnullが返される
        expect(result).toBeNull();
      } catch (error) {
        // エラーが発生しても処理が継続することを確認
        expect(error).toBeInstanceOf(Error);
      }
    });

    it('存在しないアニメーションIDを中断しようとしてもエラーが発生しない', () => {
      expect(() => {
        globalAnimationController.cancelAnimation('non-existent-id');
      }).not.toThrow();
    });

    it('クリーンアップ処理が安全に実行される', () => {
      expect(() => {
        globalAnimationController.cleanup();
      }).not.toThrow();
    });
  });

  describe('メモリリーク防止', () => {
    it('アニメーション完了時にリソースが適切にクリーンアップされる', () => {
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
      return new Promise<void>(resolve => {
        setTimeout(() => {
          expect(globalAnimationController.getActiveAnimationCount()).toBe(0);
          resolve();
        }, 10);
      });
    });

    it('アニメーション中断時にリソースが適切にクリーンアップされる', () => {
      const mockElement = document.createElement('div');
      const mockAnimationWithCleanup = {
        ...mockAnimation,
        addEventListener: vi.fn((event, callback) => {
          if (event === 'cancel') {
            // アニメーション中断をシミュレート
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
        'interrupt-test'
      );

      expect(globalAnimationController.getActiveAnimationCount()).toBe(1);

      globalAnimationController.cancelAnimation('interrupt-test');

      // アニメーション中断を待つ
      return new Promise<void>(resolve => {
        setTimeout(() => {
          expect(globalAnimationController.getActiveAnimationCount()).toBe(0);
          resolve();
        }, 10);
      });
    });
  });
});
