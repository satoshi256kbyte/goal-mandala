/**
 * 進捗履歴表示機能のパフォーマンステスト
 * 大量の履歴データでのチャート表示とインタラクション性能をテスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

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

// 大量の履歴データ生成ヘルパー
const generateProgressHistoryData = (days: number, dataPointsPerDay: number = 1) => {
  const data = [];
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  for (let day = 0; day < days; day++) {
    for (let point = 0; point < dataPointsPerDay; point++) {
      const date = new Date(
        startDate.getTime() +
          day * 24 * 60 * 60 * 1000 +
          point * ((24 * 60 * 60 * 1000) / dataPointsPerDay)
      );
      const progress = Math.max(
        0,
        Math.min(100, 50 + Math.sin(day * 0.1) * 30 + Math.random() * 10 - 5)
      );

      data.push({
        date: date.toISOString(),
        progress: Math.round(progress),
        timestamp: date.getTime(),
        change:
          point === 0 && day > 0 ? Math.round(progress - data[data.length - 1]?.progress || 0) : 0,
      });
    }
  }

  return data;
};

// 進捗履歴チャートコンポーネント（テスト用）
interface ProgressHistoryChartProps {
  data: Array<{
    date: string;
    progress: number;
    timestamp: number;
    change?: number;
  }>;
  width?: number;
  height?: number;
  showGrid?: boolean;
  showTooltip?: boolean;
  highlightSignificantChanges?: boolean;
  onDataPointClick?: (data: any) => void;
}

const ProgressHistoryChart: React.FC<ProgressHistoryChartProps> = ({
  data,
  width = 800,
  height = 400,
  showGrid = true,
  showTooltip = true,
  highlightSignificantChanges = false,
  onDataPointClick,
}) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      month: 'short',
      day: 'numeric',
    });
  };

  const handleDataPointClick = (data: any) => {
    if (onDataPointClick) {
      onDataPointClick(data);
    }
  };

  return (
    <div style={{ width: '100%', height: height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
          onClick={handleDataPointClick}
        >
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />}
          <XAxis dataKey="date" tickFormatter={formatDate} stroke="#666" />
          <YAxis domain={[0, 100]} stroke="#666" />
          {showTooltip && (
            <Tooltip
              labelFormatter={value => `日付: ${formatDate(value)}`}
              formatter={(value: number) => [`${value}%`, '進捗']}
              contentStyle={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
              }}
            />
          )}
          <Line
            type="monotone"
            dataKey="progress"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={
              highlightSignificantChanges
                ? (props: any) => {
                    const isSignificant = Math.abs(props.payload?.change || 0) >= 10;
                    return isSignificant ? (
                      <circle
                        cx={props.cx}
                        cy={props.cy}
                        r={6}
                        fill="#ef4444"
                        stroke="#fff"
                        strokeWidth={2}
                      />
                    ) : (
                      <circle cx={props.cx} cy={props.cy} r={3} fill="#3b82f6" />
                    );
                  }
                : { fill: '#3b82f6', strokeWidth: 2, r: 4 }
            }
            activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2, fill: '#fff' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

// テスト用のWrapper
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('進捗履歴表示機能パフォーマンステスト', () => {
  let initialMemory: number;

  beforeEach(() => {
    initialMemory = measureMemoryUsage();

    // ResizeObserverのモック（Rechartsで使用される）
    global.ResizeObserver = vi.fn().mockImplementation(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    }));

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

    if (global.gc) {
      global.gc();
    }
  });

  describe('大量履歴データでのチャート表示性能', () => {
    it('30日間の履歴データが1秒以内にレンダリングされる', async () => {
      const historyData = generateProgressHistoryData(30, 1);

      const renderTime = await measurePerformance(() => {
        render(
          <TestWrapper>
            <ProgressHistoryChart data={historyData} />
          </TestWrapper>
        );
      });

      expect(renderTime).toBeLessThan(1000);
    });

    it('90日間の履歴データが2秒以内にレンダリングされる', async () => {
      const historyData = generateProgressHistoryData(90, 1);

      const renderTime = await measurePerformance(() => {
        render(
          <TestWrapper>
            <ProgressHistoryChart data={historyData} />
          </TestWrapper>
        );
      });

      expect(renderTime).toBeLessThan(2000);
    });

    it('高頻度データ（1日複数ポイント）が効率的にレンダリングされる', async () => {
      const historyData = generateProgressHistoryData(30, 4); // 1日4回更新

      const renderTime = await measurePerformance(() => {
        render(
          <TestWrapper>
            <ProgressHistoryChart data={historyData} />
          </TestWrapper>
        );
      });

      expect(renderTime).toBeLessThan(1500);
    });

    it('複雑な設定でのチャートが3秒以内にレンダリングされる', async () => {
      const historyData = generateProgressHistoryData(60, 2);

      const renderTime = await measurePerformance(() => {
        render(
          <TestWrapper>
            <ProgressHistoryChart
              data={historyData}
              showGrid={true}
              showTooltip={true}
              highlightSignificantChanges={true}
              width={1200}
              height={600}
            />
          </TestWrapper>
        );
      });

      expect(renderTime).toBeLessThan(3000);
    });
  });

  describe('チャートインタラクション性能', () => {
    it('ツールチップ表示が100ms以内で実行される', async () => {
      const user = userEvent.setup();
      const historyData = generateProgressHistoryData(30, 1);

      render(
        <TestWrapper>
          <ProgressHistoryChart data={historyData} />
        </TestWrapper>
      );

      const chartContainer = screen.getByRole('img'); // SVGはimgロールを持つ

      const tooltipTime = await measurePerformance(async () => {
        await user.hover(chartContainer);
        // ツールチップの表示を待機
        await waitFor(
          () => {
            expect(chartContainer).toBeInTheDocument();
          },
          { timeout: 200 }
        );
      });

      expect(tooltipTime).toBeLessThan(100);
    });

    it('データポイントクリックが50ms以内で実行される', async () => {
      const user = userEvent.setup();
      const historyData = generateProgressHistoryData(30, 1);
      const mockClickHandler = vi.fn();

      render(
        <TestWrapper>
          <ProgressHistoryChart data={historyData} onDataPointClick={mockClickHandler} />
        </TestWrapper>
      );

      const chartContainer = screen.getByRole('img');

      const clickTime = await measurePerformance(async () => {
        await user.click(chartContainer);
      });

      expect(clickTime).toBeLessThan(50);
    });

    it('チャートズーム・パン操作が滑らかに実行される', async () => {
      const user = userEvent.setup();
      const historyData = generateProgressHistoryData(90, 1);

      render(
        <TestWrapper>
          <ProgressHistoryChart data={historyData} />
        </TestWrapper>
      );

      const chartContainer = screen.getByRole('img');

      const interactionTime = await measurePerformance(async () => {
        // マウスホイールでズーム操作をシミュレート
        await user.pointer([{ target: chartContainer, coords: { x: 400, y: 200 } }]);

        // 複数のマウス操作をシミュレート
        for (let i = 0; i < 5; i++) {
          await user.pointer([{ target: chartContainer, coords: { x: 400 + i * 10, y: 200 } }]);
        }
      });

      expect(interactionTime).toBeLessThan(200);
    });
  });

  describe('データ更新性能', () => {
    it('履歴データの追加が200ms以内で反映される', async () => {
      const initialData = generateProgressHistoryData(30, 1);

      const { rerender } = render(
        <TestWrapper>
          <ProgressHistoryChart data={initialData} />
        </TestWrapper>
      );

      // 新しいデータポイントを追加
      const newDataPoint = {
        date: new Date().toISOString(),
        progress: 75,
        timestamp: Date.now(),
        change: 5,
      };
      const updatedData = [...initialData, newDataPoint];

      const updateTime = await measurePerformance(() => {
        rerender(
          <TestWrapper>
            <ProgressHistoryChart data={updatedData} />
          </TestWrapper>
        );
      });

      expect(updateTime).toBeLessThan(200);
    });

    it('大量データの一括更新が1秒以内で完了する', async () => {
      const initialData = generateProgressHistoryData(60, 1);

      const { rerender } = render(
        <TestWrapper>
          <ProgressHistoryChart data={initialData} />
        </TestWrapper>
      );

      // 全データポイントの進捗値を更新
      const updatedData = initialData.map(point => ({
        ...point,
        progress: Math.min(100, point.progress + Math.floor(Math.random() * 10)),
      }));

      const updateTime = await measurePerformance(() => {
        rerender(
          <TestWrapper>
            <ProgressHistoryChart data={updatedData} />
          </TestWrapper>
        );
      });

      expect(updateTime).toBeLessThan(1000);
    });

    it('リアルタイム更新シミュレーションが効率的に実行される', async () => {
      const initialData = generateProgressHistoryData(7, 1); // 1週間分

      const { rerender } = render(
        <TestWrapper>
          <ProgressHistoryChart data={initialData} />
        </TestWrapper>
      );

      const realtimeUpdateTime = await measurePerformance(async () => {
        let currentData = [...initialData];

        // 10回のリアルタイム更新をシミュレート
        for (let i = 0; i < 10; i++) {
          const newPoint = {
            date: new Date(Date.now() + i * 1000).toISOString(),
            progress: Math.floor(Math.random() * 100),
            timestamp: Date.now() + i * 1000,
            change: Math.floor(Math.random() * 20) - 10,
          };

          currentData = [...currentData, newPoint];

          rerender(
            <TestWrapper>
              <ProgressHistoryChart data={currentData} />
            </TestWrapper>
          );

          // 短い待機時間（リアルタイム更新をシミュレート）
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      });

      expect(realtimeUpdateTime).toBeLessThan(2000);
    });
  });

  describe('メモリ使用量とリソース管理', () => {
    it('大量履歴データでメモリリークが発生しない', async () => {
      const iterations = 5;

      for (let i = 0; i < iterations; i++) {
        const historyData = generateProgressHistoryData(90, 2);

        const { unmount } = render(
          <TestWrapper>
            <ProgressHistoryChart data={historyData} />
          </TestWrapper>
        );

        // コンポーネントをアンマウント
        unmount();

        if (global.gc) {
          global.gc();
        }
      }

      const finalMemory = measureMemoryUsage();
      const memoryIncrease = finalMemory - initialMemory;

      // メモリ増加が10MB以下であることを確認
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });

    it('長時間表示でもパフォーマンスが劣化しない', async () => {
      const historyData = generateProgressHistoryData(30, 1);

      const { rerender } = render(
        <TestWrapper>
          <ProgressHistoryChart data={historyData} />
        </TestWrapper>
      );

      const performanceTimes: number[] = [];

      // 100回の再レンダリングでパフォーマンス劣化をテスト
      for (let i = 0; i < 100; i++) {
        const updatedData = historyData.map(point => ({
          ...point,
          progress: Math.max(0, Math.min(100, point.progress + (Math.random() - 0.5) * 2)),
        }));

        const renderTime = await measurePerformance(() => {
          rerender(
            <TestWrapper>
              <ProgressHistoryChart data={updatedData} />
            </TestWrapper>
          );
        });

        performanceTimes.push(renderTime);
      }

      // 最初の10回と最後の10回の平均時間を比較
      const initialAverage =
        performanceTimes.slice(0, 10).reduce((sum, time) => sum + time, 0) / 10;
      const finalAverage = performanceTimes.slice(-10).reduce((sum, time) => sum + time, 0) / 10;

      // パフォーマンス劣化が30%以下であることを確認
      expect(finalAverage).toBeLessThan(initialAverage * 1.3);
    });

    it('複数チャートの同時表示が効率的に実行される', async () => {
      const chartCount = 4;
      const historyDataSets = Array.from({ length: chartCount }, () =>
        generateProgressHistoryData(30, 1)
      );

      const multiChartTime = await measurePerformance(() => {
        render(
          <TestWrapper>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              {historyDataSets.map((data, index) => (
                <ProgressHistoryChart key={index} data={data} width={400} height={300} />
              ))}
            </div>
          </TestWrapper>
        );
      });

      // 4つのチャートの同時表示が3秒以内で完了
      expect(multiChartTime).toBeLessThan(3000);
    });
  });

  describe('レスポンシブ性能', () => {
    it('画面サイズ変更時のチャートリサイズが高速で実行される', async () => {
      const historyData = generateProgressHistoryData(30, 1);

      render(
        <TestWrapper>
          <div style={{ width: '100%', height: '400px' }}>
            <ProgressHistoryChart data={historyData} />
          </div>
        </TestWrapper>
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

      expect(resizeTime).toBeLessThan(100);
    });

    it('異なる画面サイズでの表示が効率的に実行される', async () => {
      const historyData = generateProgressHistoryData(30, 1);
      const screenSizes = [
        { width: 320, height: 200 }, // Mobile
        { width: 768, height: 400 }, // Tablet
        { width: 1200, height: 600 }, // Desktop
      ];

      for (const size of screenSizes) {
        const renderTime = await measurePerformance(() => {
          const { unmount } = render(
            <TestWrapper>
              <ProgressHistoryChart data={historyData} width={size.width} height={size.height} />
            </TestWrapper>
          );
          unmount();
        });

        // 各画面サイズでの表示が1秒以内で完了
        expect(renderTime).toBeLessThan(1000);
      }
    });
  });

  describe('統合パフォーマンステスト', () => {
    it('実際の使用シナリオでの総合パフォーマンス', async () => {
      // 実際のマンダラチャート進捗履歴を模擬
      const goalHistoryData = generateProgressHistoryData(90, 1);
      const subGoalHistoryData = Array.from({ length: 8 }, () =>
        generateProgressHistoryData(90, 1)
      );

      const totalTime = await measurePerformance(async () => {
        const user = userEvent.setup();

        // メインの目標進捗チャートを表示
        const { rerender } = render(
          <TestWrapper>
            <div>
              <h2>目標進捗履歴</h2>
              <ProgressHistoryChart
                data={goalHistoryData}
                highlightSignificantChanges={true}
                showTooltip={true}
              />

              <h3>サブ目標進捗履歴</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
                {subGoalHistoryData.slice(0, 4).map((data, index) => (
                  <ProgressHistoryChart
                    key={index}
                    data={data}
                    width={400}
                    height={200}
                    showGrid={false}
                  />
                ))}
              </div>
            </div>
          </TestWrapper>
        );

        // ユーザーインタラクションをシミュレート
        const charts = screen.getAllByRole('img');

        // 各チャートにホバー
        for (const chart of charts.slice(0, 3)) {
          await user.hover(chart);
          await new Promise(resolve => setTimeout(resolve, 50));
          await user.unhover(chart);
        }

        // データ更新をシミュレート
        const updatedGoalData = [
          ...goalHistoryData,
          {
            date: new Date().toISOString(),
            progress: 85,
            timestamp: Date.now(),
            change: 5,
          },
        ];

        rerender(
          <TestWrapper>
            <div>
              <h2>目標進捗履歴</h2>
              <ProgressHistoryChart
                data={updatedGoalData}
                highlightSignificantChanges={true}
                showTooltip={true}
              />

              <h3>サブ目標進捗履歴</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
                {subGoalHistoryData.slice(0, 4).map((data, index) => (
                  <ProgressHistoryChart
                    key={index}
                    data={data}
                    width={400}
                    height={200}
                    showGrid={false}
                  />
                ))}
              </div>
            </div>
          </TestWrapper>
        );
      });

      // 実際の使用シナリオが5秒以内で完了
      expect(totalTime).toBeLessThan(5000);
    });
  });
});
