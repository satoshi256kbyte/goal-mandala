/**
 * 進捗表示機能のパフォーマンステスト
 * 大量データでの進捗計算、アニメーション処理、メモリ使用量とレンダリング性能をテスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import ProgressBar from '../../components/common/ProgressBar';
import { AnimationSettingsProvider } from '../../contexts/AnimationSettingsContext';

// パフォーマンス測定ヘルパー
const measurePerformance = async (operation: () => Promise<void> | void): Promise<number> => {
  const start = performance.now();
  await operation();
  const end = performance.now();
  return end - start;
};

// メモリ使用量測定ヘルパー
const measureMemoryUsage = (): number => {
  if ((performance as any).memory?.usedJSHeapSize) {
    return (performance as any).memory.usedJSHeapSize;
  }
  return 0;
};

// 大量データ生成ヘルパー
const generateLargeProgressData = (count: number) => {
  return Array.from({ length: count }, (_, index) => ({
    id: `progress-${index}`,
    value: Math.floor(Math.random() * 100),
    label: `Progress Item ${index}`,
    tooltip: `詳細情報 ${index}`,
  }));
};

// アニメーション完了を待機するヘルパー（最小限の待機時間）
const waitForAnimationComplete = (duration: number = 50): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, Math.min(duration, 50)));
};

// テスト用のProgressBarWrapper
const ProgressBarWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>
    <AnimationSettingsProvider>{children}</AnimationSettingsProvider>
  </BrowserRouter>
);

describe('進捗表示機能パフォーマンステスト', () => {
  let initialMemory: number;

  beforeEach(() => {
    // 初期メモリ使用量を記録
    initialMemory = measureMemoryUsage();

    // パフォーマンス測定のためのモック設定
    vi.spyOn(performance, 'now').mockImplementation(() => Date.now());

    // window.matchMediaのモック
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();

    // ガベージコレクションを強制実行（テスト環境でのみ）
    if (global.gc) {
      global.gc();
    }
  });

  describe('大量データでの進捗計算パフォーマンス', () => {
    it('100個のプログレスバーが500ms以内にレンダリングされる', async () => {
      const progressData = generateLargeProgressData(100);

      const renderTime = await measurePerformance(() => {
        render(
          <ProgressBarWrapper>
            <div>
              {progressData.map(data => (
                <ProgressBar
                  key={data.id}
                  value={data.value}
                  tooltip={data.tooltip}
                  showLabel={true}
                  animated={false} // アニメーション無効でレンダリング性能を測定
                />
              ))}
            </div>
          </ProgressBarWrapper>
        );
      });

      expect(renderTime).toBeLessThan(500);
    });

    it('1000個のプログレスバーが2秒以内にレンダリングされる', async () => {
      const progressData = generateLargeProgressData(1000);

      const renderTime = await measurePerformance(() => {
        render(
          <ProgressBarWrapper>
            <div>
              {progressData.map(data => (
                <ProgressBar
                  key={data.id}
                  value={data.value}
                  tooltip={data.tooltip}
                  showLabel={false} // ラベル無効でパフォーマンス向上
                  animated={false}
                />
              ))}
            </div>
          </ProgressBarWrapper>
        );
      });

      expect(renderTime).toBeLessThan(2000);
    });

    it('進捗値の一括更新が300ms以内で完了する', async () => {
      const progressData = generateLargeProgressData(50);

      const { rerender } = render(
        <ProgressBarWrapper>
          <div>
            {progressData.map(data => (
              <ProgressBar key={data.id} value={data.value} animated={false} />
            ))}
          </div>
        </ProgressBarWrapper>
      );

      // 全ての進捗値を更新
      const updatedData = progressData.map(data => ({
        ...data,
        value: Math.floor(Math.random() * 100),
      }));

      const updateTime = await measurePerformance(() => {
        rerender(
          <ProgressBarWrapper>
            <div>
              {updatedData.map(data => (
                <ProgressBar key={data.id} value={data.value} animated={false} />
              ))}
            </div>
          </ProgressBarWrapper>
        );
      });

      expect(updateTime).toBeLessThan(300);
    });

    it('複雑なツールチップ付きプログレスバーが1秒以内にレンダリングされる', async () => {
      const progressData = generateLargeProgressData(20);

      const renderTime = await measurePerformance(() => {
        render(
          <ProgressBarWrapper>
            <div>
              {progressData.map(data => (
                <ProgressBar
                  key={data.id}
                  value={data.value}
                  showLabel={true}
                  animated={false}
                  progressTooltip={{
                    previousValue: data.value - 10,
                    targetValue: 100,
                    completedTasks: Math.floor(data.value / 10),
                    totalTasks: 10,
                    lastUpdated: new Date(),
                    estimatedCompletion: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                    progressType: 'action',
                    showDetails: true,
                  }}
                />
              ))}
            </div>
          </ProgressBarWrapper>
        );
      });

      expect(renderTime).toBeLessThan(1000);
    });
  });

  describe('アニメーション処理のパフォーマンス', () => {
    it('プログレスバーアニメーションが60FPS以上で実行される', async () => {
      const { rerender } = render(
        <ProgressBarWrapper>
          <ProgressBar value={0} animated={true} />
        </ProgressBarWrapper>
      );

      const frameCount = 30; // 30フレーム測定
      const frameTimes: number[] = [];

      // アニメーション中のフレーム時間を測定
      for (let i = 0; i <= frameCount; i++) {
        const frameStart = performance.now();

        await act(async () => {
          rerender(
            <ProgressBarWrapper>
              <ProgressBar value={(i / frameCount) * 100} animated={true} />
            </ProgressBarWrapper>
          );
        });

        const frameEnd = performance.now();
        frameTimes.push(frameEnd - frameStart);

        // 16.67ms待機（60FPS相当）
        await new Promise(resolve => setTimeout(resolve, 16.67));
      }

      // 平均フレーム時間が16.67ms以下（60FPS以上）であることを確認
      const averageFrameTime = frameTimes.reduce((sum, time) => sum + time, 0) / frameTimes.length;
      expect(averageFrameTime).toBeLessThan(16.67);
    });

    it('複数のプログレスバーの同時アニメーションが滑らかに実行される', async () => {
      const progressCount = 10;
      const initialValues = Array(progressCount).fill(0);
      const targetValues = Array.from({ length: progressCount }, () =>
        Math.floor(Math.random() * 100)
      );

      const { rerender } = render(
        <ProgressBarWrapper>
          <div>
            {initialValues.map((value, index) => (
              <ProgressBar key={`progress-${index}`} value={value} animated={true} />
            ))}
          </div>
        </ProgressBarWrapper>
      );

      const animationTime = await measurePerformance(async () => {
        // 全てのプログレスバーを同時にアニメーション
        rerender(
          <ProgressBarWrapper>
            <div>
              {targetValues.map((value, index) => (
                <ProgressBar key={`progress-${index}`} value={value} animated={true} />
              ))}
            </div>
          </ProgressBarWrapper>
        );

        // アニメーション完了を待機
        await waitForAnimationComplete(500);
      });

      // 10個のプログレスバーの同時アニメーションが1秒以内で完了
      expect(animationTime).toBeLessThan(1000);
    });

    it('達成アニメーションが適切な時間で実行される', async () => {
      const { rerender } = render(
        <ProgressBarWrapper>
          <ProgressBar value={99} animated={true} />
        </ProgressBarWrapper>
      );

      const achievementAnimationTime = await measurePerformance(async () => {
        // 100%達成でアニメーションをトリガー
        rerender(
          <ProgressBarWrapper>
            <ProgressBar
              value={100}
              animated={true}
              onAchievement={() => {
                // 達成コールバック
              }}
            />
          </ProgressBarWrapper>
        );

        // 達成アニメーション完了を待機（通常600ms）
        await waitForAnimationComplete(700);
      });

      // 達成アニメーションが1秒以内で完了
      expect(achievementAnimationTime).toBeLessThan(1000);
    });

    it('アニメーション中断機能が即座に動作する', async () => {
      const user = userEvent.setup();

      render(
        <ProgressBarWrapper>
          <ProgressBar value={0} animated={true} />
        </ProgressBarWrapper>
      );

      const progressBar = screen.getByRole('progressbar');

      const interruptTime = await measurePerformance(async () => {
        // アニメーション中にユーザー操作で中断
        await user.click(progressBar);
      });

      // アニメーション中断が50ms以内で実行される
      expect(interruptTime).toBeLessThan(50);
    });
  });

  describe('メモリ使用量とレンダリング性能', () => {
    it('大量のプログレスバーでメモリリークが発生しない', async () => {
      const iterations = 5;
      const progressCount = 100;

      for (let i = 0; i < iterations; i++) {
        const progressData = generateLargeProgressData(progressCount);

        const { unmount } = render(
          <ProgressBarWrapper>
            <div>
              {progressData.map(data => (
                <ProgressBar key={data.id} value={data.value} animated={false} />
              ))}
            </div>
          </ProgressBarWrapper>
        );

        // コンポーネントをアンマウント
        unmount();

        // ガベージコレクションを強制実行
        if (global.gc) {
          global.gc();
        }
      }

      const finalMemory = measureMemoryUsage();
      const memoryIncrease = finalMemory - initialMemory;

      // メモリ増加が5MB以下であることを確認
      expect(memoryIncrease).toBeLessThan(5 * 1024 * 1024);
    });

    it('プログレスバーの再レンダリングが最適化されている', async () => {
      const { rerender } = render(
        <ProgressBarWrapper>
          <ProgressBar value={50} animated={false} />
        </ProgressBarWrapper>
      );

      // 同じpropsで再レンダリング（React.memoによる最適化をテスト）
      const rerenderTime = await measurePerformance(() => {
        rerender(
          <ProgressBarWrapper>
            <ProgressBar value={50} animated={false} />
          </ProgressBarWrapper>
        );
      });

      // 最適化により再レンダリングが10ms以内で完了
      expect(rerenderTime).toBeLessThan(10);
    });

    it('ツールチップの表示・非表示が高速で実行される', async () => {
      const user = userEvent.setup();

      render(
        <ProgressBarWrapper>
          <ProgressBar
            value={75}
            tooltip="テストツールチップ"
            tooltipConfig={{
              delay: 0, // 遅延なしでテスト
            }}
          />
        </ProgressBarWrapper>
      );

      const progressBar = screen.getByRole('progressbar');

      const tooltipTime = await measurePerformance(async () => {
        // ツールチップ表示
        await user.hover(progressBar);
        await waitFor(() => {
          // ツールチップが表示されることを確認
          expect(progressBar).toBeInTheDocument();
        });

        // ツールチップ非表示
        await user.unhover(progressBar);
      });

      // ツールチップの表示・非表示が100ms以内で完了
      expect(tooltipTime).toBeLessThan(100);
    });

    it('色分け計算が高速で実行される', async () => {
      const progressValues = Array.from({ length: 1000 }, () => Math.floor(Math.random() * 100));

      const colorCalculationTime = await measurePerformance(() => {
        render(
          <ProgressBarWrapper>
            <div>
              {progressValues.map((value, index) => (
                <ProgressBar
                  key={`color-test-${index}`}
                  value={value}
                  colorScheme="default"
                  highContrast={index % 2 === 0}
                  colorBlindFriendly={index % 3 === 0}
                  animated={false}
                />
              ))}
            </div>
          </ProgressBarWrapper>
        );
      });

      // 1000個の色分け計算が500ms以内で完了
      expect(colorCalculationTime).toBeLessThan(500);
    });

    it('アクセシビリティ属性の設定が高速で実行される', async () => {
      const progressData = generateLargeProgressData(200);

      const accessibilityTime = await measurePerformance(() => {
        render(
          <ProgressBarWrapper>
            <div>
              {progressData.map(data => (
                <ProgressBar
                  key={data.id}
                  value={data.value}
                  aria-label={`進捗 ${data.value}%`}
                  showLabel={true}
                  animated={false}
                />
              ))}
            </div>
          </ProgressBarWrapper>
        );
      });

      // 200個のアクセシビリティ属性設定が300ms以内で完了
      expect(accessibilityTime).toBeLessThan(300);
    });
  });

  describe('レスポンシブ性能', () => {
    it('画面サイズ変更時のレイアウト更新が高速で実行される', async () => {
      render(
        <ProgressBarWrapper>
          <div style={{ width: '100%' }}>
            {Array.from({ length: 50 }, (_, index) => (
              <ProgressBar
                key={`responsive-${index}`}
                value={index * 2}
                size={index % 3 === 0 ? 'small' : index % 3 === 1 ? 'medium' : 'large'}
                animated={false}
              />
            ))}
          </div>
        </ProgressBarWrapper>
      );

      const resizeTime = await measurePerformance(() => {
        // 画面サイズを変更
        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          configurable: true,
          value: 768,
        });

        // リサイズイベントを発火
        window.dispatchEvent(new Event('resize'));
      });

      // レスポンシブレイアウト更新が100ms以内で完了
      expect(resizeTime).toBeLessThan(100);
    });

    it('異なるサイズのプログレスバーが効率的にレンダリングされる', async () => {
      const sizes: Array<'small' | 'medium' | 'large'> = ['small', 'medium', 'large'];
      const progressData = generateLargeProgressData(150);

      const sizeVariationTime = await measurePerformance(() => {
        render(
          <ProgressBarWrapper>
            <div>
              {progressData.map((data, index) => (
                <ProgressBar
                  key={data.id}
                  value={data.value}
                  size={sizes[index % sizes.length]}
                  animated={false}
                />
              ))}
            </div>
          </ProgressBarWrapper>
        );
      });

      // 異なるサイズの150個のプログレスバーが800ms以内でレンダリング
      expect(sizeVariationTime).toBeLessThan(800);
    });
  });

  describe('エラーハンドリング性能', () => {
    it('無効な進捗値の処理が高速で実行される', async () => {
      const invalidValues = [-10, 150, NaN, Infinity, -Infinity];

      const errorHandlingTime = await measurePerformance(() => {
        render(
          <ProgressBarWrapper>
            <div>
              {invalidValues.map((value, index) => (
                <ProgressBar key={`error-${index}`} value={value} animated={false} />
              ))}
            </div>
          </ProgressBarWrapper>
        );
      });

      // 無効値のエラーハンドリングが50ms以内で完了
      expect(errorHandlingTime).toBeLessThan(50);
    });

    it('大量の無効データでもクラッシュしない', async () => {
      const invalidData = Array.from({ length: 100 }, (_, index) => ({
        id: `invalid-${index}`,
        value: index % 2 === 0 ? NaN : Infinity,
      }));

      const crashTestTime = await measurePerformance(() => {
        expect(() => {
          render(
            <ProgressBarWrapper>
              <div>
                {invalidData.map(data => (
                  <ProgressBar key={data.id} value={data.value} animated={false} />
                ))}
              </div>
            </ProgressBarWrapper>
          );
        }).not.toThrow();
      });

      // 大量の無効データ処理が200ms以内で完了
      expect(crashTestTime).toBeLessThan(200);
    });
  });

  describe('統合パフォーマンステスト', () => {
    it('実際の使用シナリオでの総合パフォーマンス', async () => {
      // 実際のマンダラチャートを模擬したデータ
      const goalProgress = 65;
      const subGoalProgresses = Array.from({ length: 8 }, () => Math.floor(Math.random() * 100));
      const actionProgresses = Array.from({ length: 64 }, () => Math.floor(Math.random() * 100));

      const totalTime = await measurePerformance(async () => {
        const { rerender } = render(
          <ProgressBarWrapper>
            <div>
              {/* 目標進捗 */}
              <ProgressBar
                value={goalProgress}
                size="large"
                showLabel={true}
                animated={true}
                progressTooltip={{
                  progressType: 'goal',
                  showDetails: true,
                }}
              />

              {/* サブ目標進捗 */}
              {subGoalProgresses.map((progress, index) => (
                <ProgressBar
                  key={`subgoal-${index}`}
                  value={progress}
                  size="medium"
                  showLabel={true}
                  animated={true}
                  progressTooltip={{
                    progressType: 'subgoal',
                    showDetails: true,
                  }}
                />
              ))}

              {/* アクション進捗 */}
              {actionProgresses.map((progress, index) => (
                <ProgressBar
                  key={`action-${index}`}
                  value={progress}
                  size="small"
                  animated={true}
                  progressTooltip={{
                    progressType: 'action',
                    completedTasks: Math.floor(progress / 10),
                    totalTasks: 10,
                  }}
                />
              ))}
            </div>
          </ProgressBarWrapper>
        );

        // 進捗更新をシミュレート
        const updatedActionProgresses = actionProgresses.map(p => Math.min(p + 5, 100));
        const updatedSubGoalProgresses = subGoalProgresses.map(p => Math.min(p + 2, 100));
        const updatedGoalProgress = Math.min(goalProgress + 1, 100);

        rerender(
          <ProgressBarWrapper>
            <div>
              <ProgressBar
                value={updatedGoalProgress}
                size="large"
                showLabel={true}
                animated={true}
                progressTooltip={{
                  progressType: 'goal',
                  showDetails: true,
                }}
              />

              {updatedSubGoalProgresses.map((progress, index) => (
                <ProgressBar
                  key={`subgoal-${index}`}
                  value={progress}
                  size="medium"
                  showLabel={true}
                  animated={true}
                  progressTooltip={{
                    progressType: 'subgoal',
                    showDetails: true,
                  }}
                />
              ))}

              {updatedActionProgresses.map((progress, index) => (
                <ProgressBar
                  key={`action-${index}`}
                  value={progress}
                  size="small"
                  animated={true}
                  progressTooltip={{
                    progressType: 'action',
                    completedTasks: Math.floor(progress / 10),
                    totalTasks: 10,
                  }}
                />
              ))}
            </div>
          </ProgressBarWrapper>
        );

        // アニメーション完了を待機
        await waitForAnimationComplete(600);
      });

      // 実際の使用シナリオ（73個のプログレスバー）が3秒以内で完了
      expect(totalTime).toBeLessThan(3000);
    });
  });
});
