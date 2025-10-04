/**
 * アニメーションコンポーネントの専用テスト
 * 要件4.1, 4.2, 4.3, 4.4, 4.5に対応
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ProgressBar } from '../ProgressBar';
import { AchievementAnimation } from '../AchievementAnimation';
import { AnimationSettingsProvider } from '../../../contexts/AnimationSettingsContext';
import { globalAnimationController } from '../../../utils/animation-utils';

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

// performance のモック
Object.defineProperty(global, 'performance', {
  value: {
    now: vi.fn().mockReturnValue(1000),
    memory: {
      usedJSHeapSize: 50 * 1024 * 1024,
    },
  },
  writable: true,
});

// テスト用のラッパーコンポーネント
const TestWrapper: React.FC<{
  children: React.ReactNode;
  settings?: any;
}> = ({ children, settings = {} }) => (
  <AnimationSettingsProvider initialSettings={settings}>{children}</AnimationSettingsProvider>
);

describe('アニメーションコンポーネントのテスト', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMatchMedia(false);
    globalAnimationController.cancelAllAnimations();
  });

  afterEach(() => {
    globalAnimationController.cleanup();
  });

  describe('ProgressBar アニメーション', () => {
    describe('基本アニメーション機能', () => {
      it('進捗変化時にスムーズなアニメーションが適用される', async () => {
        const { rerender } = render(
          <TestWrapper>
            <ProgressBar value={30} animated={true} />
          </TestWrapper>
        );

        const progressBar = screen.getByRole('progressbar');
        const progressFill = progressBar.firstChild as HTMLElement;

        // 初期状態の確認
        expect(progressFill.style.width).toBe('30%');
        expect(progressFill.style.transition).toContain('width');

        // 進捗を更新
        rerender(
          <TestWrapper>
            <ProgressBar value={70} animated={true} />
          </TestWrapper>
        );

        // アニメーションが適用されることを確認
        await waitFor(() => {
          expect(progressFill.style.width).toBe('70%');
        });
      });

      it('アニメーション無効時はトランジションが適用されない', () => {
        render(
          <TestWrapper>
            <ProgressBar value={50} animated={false} />
          </TestWrapper>
        );

        const progressBar = screen.getByRole('progressbar');
        const progressFill = progressBar.firstChild as HTMLElement;

        expect(progressFill.style.transition).toBe('');
      });

      it('アクセシビリティ設定でアニメーションが無効になる', () => {
        mockMatchMedia(true); // prefers-reduced-motion: reduce

        render(
          <TestWrapper settings={{ respectReducedMotion: true }}>
            <ProgressBar value={50} animated={true} />
          </TestWrapper>
        );

        const progressBar = screen.getByRole('progressbar');
        const progressFill = progressBar.firstChild as HTMLElement;

        expect(progressFill.style.transition).toBe('');
      });

      it('カスタムアニメーション設定が適用される', () => {
        render(
          <TestWrapper
            settings={{
              progressTransitionDuration: 500,
              progressTransitionEasing: 'ease-in-out',
            }}
          >
            <ProgressBar value={50} animated={true} />
          </TestWrapper>
        );

        const progressBar = screen.getByRole('progressbar');
        const progressFill = progressBar.firstChild as HTMLElement;

        expect(progressFill.style.transition).toContain('500ms');
        expect(progressFill.style.transition).toContain('ease-in-out');
      });
    });

    describe('達成アニメーション', () => {
      it('100%達成時に達成アニメーションが実行される', async () => {
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

      it('100%未満から100%への変化のみで達成アニメーションが実行される', async () => {
        const onAchievement = vi.fn();

        // 最初から100%の場合
        render(
          <TestWrapper>
            <ProgressBar value={100} onAchievement={onAchievement} />
          </TestWrapper>
        );

        // 少し待ってもコールバックが呼ばれないことを確認
        await new Promise(resolve => setTimeout(resolve, 100));
        expect(onAchievement).not.toHaveBeenCalled();
      });

      it('進捗変化のコールバックが正しく呼ばれる', async () => {
        const onProgressChange = vi.fn();

        const { rerender } = render(
          <TestWrapper>
            <ProgressBar value={30} onProgressChange={onProgressChange} />
          </TestWrapper>
        );

        // 進捗を更新
        rerender(
          <TestWrapper>
            <ProgressBar value={60} onProgressChange={onProgressChange} />
          </TestWrapper>
        );

        await waitFor(() => {
          expect(onProgressChange).toHaveBeenCalledWith(60, 30);
        });
      });

      it('達成アニメーション無効時はアニメーションが実行されない', async () => {
        const onAchievement = vi.fn();

        const { rerender } = render(
          <TestWrapper settings={{ achievementEnabled: false }}>
            <ProgressBar value={95} onAchievement={onAchievement} />
          </TestWrapper>
        );

        // 100%に更新
        rerender(
          <TestWrapper settings={{ achievementEnabled: false }}>
            <ProgressBar value={100} onAchievement={onAchievement} />
          </TestWrapper>
        );

        await waitFor(() => {
          expect(onAchievement).toHaveBeenCalled();
        });

        // アニメーションは実行されないが、コールバックは呼ばれる
        expect(HTMLElement.prototype.animate).not.toHaveBeenCalled();
      });
    });

    describe('ユーザー操作時の中断', () => {
      it('マウス操作時にアニメーションが中断される', async () => {
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
    });

    describe('色分け表示', () => {
      it('進捗値に応じて正しい色クラスが適用される', () => {
        const { rerender } = render(
          <TestWrapper>
            <ProgressBar value={0} />
          </TestWrapper>
        );

        let progressBar = screen.getByRole('progressbar');
        let progressFill = progressBar.firstChild as HTMLElement;
        expect(progressFill.className).toContain('bg-gray-400');

        // 低進捗（赤）
        rerender(
          <TestWrapper>
            <ProgressBar value={30} />
          </TestWrapper>
        );

        progressBar = screen.getByRole('progressbar');
        progressFill = progressBar.firstChild as HTMLElement;
        expect(progressFill.className).toContain('bg-red-500');

        // 中進捗（オレンジ）
        rerender(
          <TestWrapper>
            <ProgressBar value={60} />
          </TestWrapper>
        );

        progressBar = screen.getByRole('progressbar');
        progressFill = progressBar.firstChild as HTMLElement;
        expect(progressFill.className).toContain('bg-orange-500');

        // 高進捗（緑）
        rerender(
          <TestWrapper>
            <ProgressBar value={90} />
          </TestWrapper>
        );

        progressBar = screen.getByRole('progressbar');
        progressFill = progressBar.firstChild as HTMLElement;
        expect(progressFill.className).toContain('bg-green-600');
      });

      it('カラーブラインドネス対応モードで適切な色が適用される', () => {
        render(
          <TestWrapper>
            <ProgressBar value={30} colorBlindFriendly={true} />
          </TestWrapper>
        );

        const progressBar = screen.getByRole('progressbar');
        const progressFill = progressBar.firstChild as HTMLElement;
        expect(progressFill.className).toContain('bg-blue-600');
      });

      it('ハイコントラストモードで適切な色が適用される', () => {
        render(
          <TestWrapper>
            <ProgressBar value={30} highContrast={true} />
          </TestWrapper>
        );

        const progressBar = screen.getByRole('progressbar');
        const progressFill = progressBar.firstChild as HTMLElement;
        expect(progressFill.className).toContain('bg-red-700');
      });

      it('カスタム色設定が適用される', () => {
        const customColors = {
          progressColors: {
            low: '#ff0000',
            medium: '#ffff00',
            high: '#00ff00',
          },
        };

        render(
          <TestWrapper>
            <ProgressBar value={30} colorScheme="custom" customColors={customColors} />
          </TestWrapper>
        );

        const progressBar = screen.getByRole('progressbar');
        const progressFill = progressBar.firstChild as HTMLElement;
        expect(progressFill.style.backgroundColor).toBe('#ff0000');
      });
    });

    describe('サイズバリエーション', () => {
      it('サイズに応じて正しい高さクラスが適用される', () => {
        const { rerender } = render(
          <TestWrapper>
            <ProgressBar value={50} size="small" />
          </TestWrapper>
        );

        let progressBar = screen.getByRole('progressbar');
        expect(progressBar.className).toContain('h-1');

        rerender(
          <TestWrapper>
            <ProgressBar value={50} size="medium" />
          </TestWrapper>
        );

        progressBar = screen.getByRole('progressbar');
        expect(progressBar.className).toContain('h-2');

        rerender(
          <TestWrapper>
            <ProgressBar value={50} size="large" />
          </TestWrapper>
        );

        progressBar = screen.getByRole('progressbar');
        expect(progressBar.className).toContain('h-4');
      });
    });

    describe('ラベル表示', () => {
      it('showLabel=trueの場合にラベルが表示される', () => {
        render(
          <TestWrapper>
            <ProgressBar value={75} showLabel={true} />
          </TestWrapper>
        );

        expect(screen.getByText('進捗')).toBeInTheDocument();
        expect(screen.getByText('75%')).toBeInTheDocument();
      });

      it('showLabel=falseの場合にラベルが表示されない', () => {
        render(
          <TestWrapper>
            <ProgressBar value={75} showLabel={false} />
          </TestWrapper>
        );

        expect(screen.queryByText('進捗')).not.toBeInTheDocument();
        expect(screen.queryByText('75%')).not.toBeInTheDocument();
      });
    });

    describe('アクセシビリティ', () => {
      it('適切なARIA属性が設定される', () => {
        render(
          <TestWrapper>
            <ProgressBar value={60} aria-label="カスタムラベル" />
          </TestWrapper>
        );

        const progressBar = screen.getByRole('progressbar');
        expect(progressBar).toHaveAttribute('aria-valuenow', '60');
        expect(progressBar).toHaveAttribute('aria-valuemin', '0');
        expect(progressBar).toHaveAttribute('aria-valuemax', '100');
        expect(progressBar).toHaveAttribute('aria-label', 'カスタムラベル');
      });

      it('デフォルトのARIAラベルが設定される', () => {
        render(
          <TestWrapper>
            <ProgressBar value={45} />
          </TestWrapper>
        );

        const progressBar = screen.getByRole('progressbar');
        expect(progressBar).toHaveAttribute('aria-label', '進捗 45%');
      });
    });
  });

  describe('AchievementAnimation コンポーネント', () => {
    describe('基本機能', () => {
      it('trigger=falseの場合はアニメーションが実行されない', () => {
        render(
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
        expect(HTMLElement.prototype.animate).not.toHaveBeenCalled();
      });

      it('trigger=trueの場合はアニメーションが実行される', async () => {
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

        await waitFor(() => {
          expect(HTMLElement.prototype.animate).toHaveBeenCalled();
        });
      });

      it('異なるアニメーションタイプが正しく適用される', async () => {
        const animationTypes = ['glow', 'pulse', 'bounce', 'scale'] as const;

        for (const type of animationTypes) {
          const { rerender } = render(
            <TestWrapper>
              <AchievementAnimation
                trigger={false}
                type={type}
                intensity="normal"
                animationId={`test-${type}`}
              >
                <div data-testid={`achievement-${type}`}>Test Content</div>
              </AchievementAnimation>
            </TestWrapper>
          );

          // アニメーションをトリガー
          rerender(
            <TestWrapper>
              <AchievementAnimation
                trigger={true}
                type={type}
                intensity="normal"
                animationId={`test-${type}`}
              >
                <div data-testid={`achievement-${type}`}>Test Content</div>
              </AchievementAnimation>
            </TestWrapper>
          );

          await waitFor(() => {
            expect(HTMLElement.prototype.animate).toHaveBeenCalled();
          });

          vi.clearAllMocks();
        }
      });

      it('異なる強度設定が正しく適用される', async () => {
        const intensities = ['subtle', 'normal', 'strong'] as const;

        for (const intensity of intensities) {
          const { rerender } = render(
            <TestWrapper>
              <AchievementAnimation
                trigger={false}
                type="glow"
                intensity={intensity}
                animationId={`test-${intensity}`}
              >
                <div data-testid={`achievement-${intensity}`}>Test Content</div>
              </AchievementAnimation>
            </TestWrapper>
          );

          // アニメーションをトリガー
          rerender(
            <TestWrapper>
              <AchievementAnimation
                trigger={true}
                type="glow"
                intensity={intensity}
                animationId={`test-${intensity}`}
              >
                <div data-testid={`achievement-${intensity}`}>Test Content</div>
              </AchievementAnimation>
            </TestWrapper>
          );

          await waitFor(() => {
            expect(HTMLElement.prototype.animate).toHaveBeenCalled();
          });

          vi.clearAllMocks();
        }
      });
    });

    describe('アニメーション制御', () => {
      it('アニメーション無効時はアニメーションが実行されない', async () => {
        const { rerender } = render(
          <TestWrapper settings={{ enabled: false }}>
            <AchievementAnimation
              trigger={false}
              type="glow"
              intensity="normal"
              animationId="test-disabled"
            >
              <div data-testid="achievement-disabled">Test Content</div>
            </AchievementAnimation>
          </TestWrapper>
        );

        // アニメーションをトリガー
        rerender(
          <TestWrapper settings={{ enabled: false }}>
            <AchievementAnimation
              trigger={true}
              type="glow"
              intensity="normal"
              animationId="test-disabled"
            >
              <div data-testid="achievement-disabled">Test Content</div>
            </AchievementAnimation>
          </TestWrapper>
        );

        // 少し待ってもアニメーションが実行されないことを確認
        await new Promise(resolve => setTimeout(resolve, 100));
        expect(HTMLElement.prototype.animate).not.toHaveBeenCalled();
      });

      it('動きを減らす設定が有効な場合はアニメーションが実行されない', async () => {
        mockMatchMedia(true); // prefers-reduced-motion: reduce

        const { rerender } = render(
          <TestWrapper settings={{ respectReducedMotion: true }}>
            <AchievementAnimation
              trigger={false}
              type="glow"
              intensity="normal"
              animationId="test-reduced-motion"
            >
              <div data-testid="achievement-reduced">Test Content</div>
            </AchievementAnimation>
          </TestWrapper>
        );

        // アニメーションをトリガー
        rerender(
          <TestWrapper settings={{ respectReducedMotion: true }}>
            <AchievementAnimation
              trigger={true}
              type="glow"
              intensity="normal"
              animationId="test-reduced-motion"
            >
              <div data-testid="achievement-reduced">Test Content</div>
            </AchievementAnimation>
          </TestWrapper>
        );

        // 少し待ってもアニメーションが実行されないことを確認
        await new Promise(resolve => setTimeout(resolve, 100));
        expect(HTMLElement.prototype.animate).not.toHaveBeenCalled();
      });

      it('同じIDのアニメーションが重複実行されない', async () => {
        const { rerender } = render(
          <TestWrapper>
            <AchievementAnimation
              trigger={true}
              type="glow"
              intensity="normal"
              animationId="duplicate-test"
            >
              <div data-testid="achievement-duplicate">Test Content</div>
            </AchievementAnimation>
          </TestWrapper>
        );

        await waitFor(() => {
          expect(HTMLElement.prototype.animate).toHaveBeenCalledTimes(1);
        });

        // 同じIDで再度トリガー
        rerender(
          <TestWrapper>
            <AchievementAnimation
              trigger={true}
              type="glow"
              intensity="normal"
              animationId="duplicate-test"
            >
              <div data-testid="achievement-duplicate">Test Content</div>
            </AchievementAnimation>
          </TestWrapper>
        );

        // 既存のアニメーションがキャンセルされ、新しいアニメーションが開始される
        await waitFor(() => {
          expect(mockAnimation.cancel).toHaveBeenCalled();
        });
      });
    });

    describe('エラーハンドリング', () => {
      it('子要素が存在しない場合でもエラーが発生しない', () => {
        expect(() => {
          render(
            <TestWrapper>
              <AchievementAnimation
                trigger={true}
                type="glow"
                intensity="normal"
                animationId="no-children"
              />
            </TestWrapper>
          );
        }).not.toThrow();
      });

      it('アニメーション実行中にエラーが発生しても安全に処理される', async () => {
        // animate メソッドでエラーを発生させる
        HTMLElement.prototype.animate = vi.fn().mockImplementation(() => {
          throw new Error('Animation failed');
        });

        expect(() => {
          render(
            <TestWrapper>
              <AchievementAnimation
                trigger={true}
                type="glow"
                intensity="normal"
                animationId="error-test"
              >
                <div data-testid="achievement-error">Test Content</div>
              </AchievementAnimation>
            </TestWrapper>
          );
        }).not.toThrow();

        // animate メソッドを元に戻す
        HTMLElement.prototype.animate = vi.fn().mockReturnValue(mockAnimation);
      });
    });
  });

  describe('パフォーマンステスト', () => {
    it('大量のProgressBarコンポーネントが同時にレンダリングされてもパフォーマンスが維持される', async () => {
      const startTime = performance.now();

      const components = Array.from({ length: 100 }, (_, i) => (
        <ProgressBar key={i} value={Math.random() * 100} animated={true} />
      ));

      render(
        <TestWrapper>
          <div>{components}</div>
        </TestWrapper>
      );

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // レンダリング時間が1秒以内であることを確認
      expect(renderTime).toBeLessThan(1000);
    });

    it('大量のAchievementAnimationが同時に実行されてもパフォーマンスが維持される', async () => {
      const startTime = performance.now();

      const components = Array.from({ length: 50 }, (_, i) => (
        <AchievementAnimation
          key={i}
          trigger={true}
          type="glow"
          intensity="normal"
          animationId={`perf-test-${i}`}
        >
          <div>Test {i}</div>
        </AchievementAnimation>
      ));

      render(
        <TestWrapper>
          <div>{components}</div>
        </TestWrapper>
      );

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // レンダリング時間が2秒以内であることを確認
      expect(renderTime).toBeLessThan(2000);
    });

    it('メモリリークが発生しないことを確認', async () => {
      const initialMemory = (performance as any).memory.usedJSHeapSize;

      // 大量のコンポーネントを作成・削除
      for (let i = 0; i < 50; i++) {
        const { unmount } = render(
          <TestWrapper>
            <ProgressBar value={100} animated={true} />
            <AchievementAnimation
              trigger={true}
              type="glow"
              intensity="normal"
              animationId={`memory-test-${i}`}
            >
              <div>Test {i}</div>
            </AchievementAnimation>
          </TestWrapper>
        );

        // すぐにアンマウント
        unmount();
      }

      // ガベージコレクションを促す
      if (global.gc) {
        global.gc();
      }

      const finalMemory = (performance as any).memory.usedJSHeapSize;
      const memoryIncrease = finalMemory - initialMemory;

      // メモリ増加が5MB以下であることを確認（許容範囲）
      expect(memoryIncrease).toBeLessThan(5 * 1024 * 1024);
    });
  });
});
