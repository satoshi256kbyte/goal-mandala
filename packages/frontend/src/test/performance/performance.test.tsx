/**
 * パフォーマンステスト
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient } from '@tanstack/react-query';
import { QueryProvider } from '../../providers/QueryProvider';
import { DynamicFormField } from '../../components/forms/DynamicFormField';
import { VirtualScroll, VirtualGrid } from '../../components/common/VirtualScroll';
import { useOptimizedDraftSave } from '../../hooks/useOptimizedDraftSave';
import { useForm } from 'react-hook-form';
import { FieldPresets } from '../../components/forms/DynamicFormField';

/**
 * パフォーマンス測定ユーティリティ
 */
class PerformanceMeasurer {
  private measurements: Map<string, number[]> = new Map();

  start(name: string): () => number {
    const startTime = performance.now();
    return () => {
      const duration = performance.now() - startTime;
      this.addMeasurement(name, duration);
      return duration;
    };
  }

  addMeasurement(name: string, duration: number): void {
    if (!this.measurements.has(name)) {
      this.measurements.set(name, []);
    }
    this.measurements.get(name)!.push(duration);
  }

  getStats(name: string) {
    const measurements = this.measurements.get(name) || [];
    if (measurements.length === 0) {
      return null;
    }

    const sorted = [...measurements].sort((a, b) => a - b);
    return {
      count: measurements.length,
      min: Math.min(...measurements),
      max: Math.max(...measurements),
      avg: measurements.reduce((a, b) => a + b, 0) / measurements.length,
      median: sorted[Math.floor(sorted.length / 2)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
    };
  }

  getAllStats() {
    const stats: Record<string, any> = {};
    for (const [name] of this.measurements) {
      stats[name] = this.getStats(name);
    }
    return stats;
  }

  clear(): void {
    this.measurements.clear();
  }
}

const measurer = new PerformanceMeasurer();

/**
 * テスト用のコンポーネント
 */
const TestFormComponent: React.FC<{ fieldCount: number }> = ({ fieldCount }) => {
  const { register, watch } = useForm();

  return (
    <div>
      {Array.from({ length: fieldCount }, (_, index) => (
        <DynamicFormField
          key={index}
          field={{
            ...FieldPresets.title(),
            name: `field_${index}`,
          }}
          value=""
          onChange={() => {}}
          register={register}
          watch={watch}
        />
      ))}
    </div>
  );
};

const TestVirtualScrollComponent: React.FC<{ itemCount: number }> = ({ itemCount }) => {
  const items = Array.from({ length: itemCount }, (_, index) => ({
    id: `item-${index}`,
    data: { title: `Item ${index}`, description: `Description for item ${index}` },
  }));

  return (
    <VirtualScroll
      items={items}
      itemHeight={50}
      height={400}
      renderItem={item => (
        <div className="p-2 border-b">
          <h3>{item.data.title}</h3>
          <p>{item.data.description}</p>
        </div>
      )}
    />
  );
};

const TestVirtualGridComponent: React.FC<{ itemCount: number }> = ({ itemCount }) => {
  const items = Array.from({ length: itemCount }, (_, index) => ({
    id: `item-${index}`,
    data: { title: `Item ${index}` },
  }));

  return (
    <VirtualGrid
      items={items}
      itemsPerRow={8}
      itemHeight={100}
      height={400}
      renderItem={item => (
        <div className="p-2 border rounded">
          <h3>{item.data.title}</h3>
        </div>
      )}
    />
  );
};

/**
 * テスト用のプロバイダー
 */
const TestProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return <QueryProvider client={queryClient}>{children}</QueryProvider>;
};

describe('パフォーマンステスト', () => {
  beforeEach(() => {
    measurer.clear();
  });

  afterEach(() => {
    const stats = measurer.getAllStats();
    console.log('Performance Stats:', stats);
  });

  describe('レンダリング性能テスト', () => {
    test('DynamicFormFieldの大量レンダリング性能', async () => {
      const fieldCounts = [10, 50, 100];

      for (const count of fieldCounts) {
        const end = measurer.start(`render_${count}_fields`);

        render(
          <TestProvider>
            <TestFormComponent fieldCount={count} />
          </TestProvider>
        );

        const duration = end();

        // 100フィールドでも500ms以内でレンダリング完了
        if (count === 100) {
          expect(duration).toBeLessThan(500);
        }

        // 50フィールドでも200ms以内でレンダリング完了
        if (count === 50) {
          expect(duration).toBeLessThan(200);
        }

        // 10フィールドでも50ms以内でレンダリング完了
        if (count === 10) {
          expect(duration).toBeLessThan(50);
        }
      }
    });

    test('VirtualScrollの大量アイテム表示性能', async () => {
      const itemCounts = [100, 500, 1000];

      for (const count of itemCounts) {
        const end = measurer.start(`virtual_scroll_${count}_items`);

        render(
          <TestProvider>
            <TestVirtualScrollComponent itemCount={count} />
          </TestProvider>
        );

        const duration = end();

        // 1000アイテムでも100ms以内でレンダリング完了
        if (count === 1000) {
          expect(duration).toBeLessThan(100);
        }

        // 500アイテムでも50ms以内でレンダリング完了
        if (count === 500) {
          expect(duration).toBeLessThan(50);
        }
      }
    });

    test('VirtualGridの64アイテム表示性能（8x8グリッド）', async () => {
      const end = measurer.start('virtual_grid_64_items');

      render(
        <TestProvider>
          <TestVirtualGridComponent itemCount={64} />
        </TestProvider>
      );

      const duration = end();

      // 64アイテム（8x8グリッド）は30ms以内でレンダリング完了
      expect(duration).toBeLessThan(30);
    });

    test('React.memoの効果測定', async () => {
      const TestMemoComponent = React.memo(({ value }: { value: string }) => <div>{value}</div>);

      const TestNonMemoComponent = ({ value }: { value: string }) => <div>{value}</div>;

      const TestContainer: React.FC<{ useMemo: boolean }> = ({ useMemo }) => {
        const [count, setCount] = React.useState(0);
        const Component = useMemo ? TestMemoComponent : TestNonMemoComponent;

        React.useEffect(() => {
          const timer = setInterval(() => {
            setCount(c => c + 1);
          }, 10);

          setTimeout(() => {
            clearInterval(timer);
          }, 100);

          return () => clearInterval(timer);
        }, []);

        return (
          <div>
            {Array.from({ length: 50 }, (_, index) => (
              <Component key={index} value="static value" />
            ))}
            <div>Count: {count}</div>
          </div>
        );
      };

      // メモ化なしの場合
      const endNonMemo = measurer.start('render_without_memo');
      const { unmount: unmountNonMemo } = render(<TestContainer useMemo={false} />);
      unmountNonMemo();
      endNonMemo();

      // メモ化ありの場合
      const endMemo = measurer.start('render_with_memo');
      const { unmount: unmountMemo } = render(<TestContainer useMemo={true} />);
      unmountMemo();
      endMemo();

      const nonMemoStats = measurer.getStats('render_without_memo');
      const memoStats = measurer.getStats('render_with_memo');

      // メモ化により性能向上があることを確認
      // 実際の数値は環境により異なるため、ここでは測定のみ
      expect(nonMemoStats).toBeTruthy();
      expect(memoStats).toBeTruthy();
    });
  });

  describe('メモリ使用量テスト', () => {
    test('大量コンポーネントのメモリ使用量', async () => {
      // メモリ使用量の測定（performance.memory が利用可能な場合のみ）
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        const initialMemory = memory.usedJSHeapSize;

        render(
          <TestProvider>
            <TestFormComponent fieldCount={200} />
          </TestProvider>
        );

        // レンダリング後のメモリ使用量
        const afterRenderMemory = memory.usedJSHeapSize;
        const memoryIncrease = afterRenderMemory - initialMemory;

        // メモリ増加量が10MB以内であることを確認
        expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);

        console.log(`Memory increase: ${Math.round(memoryIncrease / 1024 / 1024)}MB`);
      }
    });

    test('VirtualScrollのメモリ効率性', async () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        const initialMemory = memory.usedJSHeapSize;

        // 大量のアイテムを仮想スクロールで表示
        render(
          <TestProvider>
            <TestVirtualScrollComponent itemCount={10000} />
          </TestProvider>
        );

        const afterRenderMemory = memory.usedJSHeapSize;
        const memoryIncrease = afterRenderMemory - initialMemory;

        // 10000アイテムでもメモリ増加量が5MB以内であることを確認
        expect(memoryIncrease).toBeLessThan(5 * 1024 * 1024);

        console.log(
          `Virtual scroll memory increase: ${Math.round(memoryIncrease / 1024 / 1024)}MB`
        );
      }
    });
  });

  describe('ネットワーク効率テスト', () => {
    test('React Queryキャッシュ効率性', async () => {
      const queryClient = new QueryClient();
      let apiCallCount = 0;

      // モックAPI関数
      const mockAPI = jest.fn().mockImplementation(async (id: string) => {
        apiCallCount++;
        return { id, data: `Data for ${id}` };
      });

      const TestQueryComponent: React.FC<{ id: string }> = ({ id }) => {
        const [data, setData] = React.useState(null);

        React.useEffect(() => {
          // キャッシュチェック
          const cached = queryClient.getQueryData(['test', id]);
          if (cached) {
            setData(cached);
          } else {
            mockAPI(id).then(result => {
              queryClient.setQueryData(['test', id], result);
              setData(result);
            });
          }
        }, [id]);

        return <div>{data ? JSON.stringify(data) : 'Loading...'}</div>;
      };

      // 同じIDで複数回レンダリング
      const { rerender } = render(
        <QueryProvider client={queryClient}>
          <TestQueryComponent id="test-1" />
        </QueryProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/Data for test-1/)).toBeInTheDocument();
      });

      // 同じIDで再レンダリング
      rerender(
        <QueryProvider client={queryClient}>
          <TestQueryComponent id="test-1" />
        </QueryProvider>
      );

      // APIが1回のみ呼ばれることを確認（キャッシュが効いている）
      expect(apiCallCount).toBe(1);
    });

    test('楽観的更新の効率性', async () => {
      const queryClient = new QueryClient();
      let updateCallCount = 0;

      const mockUpdateAPI = jest.fn().mockImplementation(async (id: string, data: any) => {
        updateCallCount++;
        // 意図的に遅延を追加
        await new Promise(resolve => setTimeout(resolve, 100));
        return { id, ...data };
      });

      const TestOptimisticComponent: React.FC = () => {
        const [data, setData] = React.useState({ id: 'test', value: 'initial' });

        const handleUpdate = async (newValue: string) => {
          const end = measurer.start('optimistic_update');

          // 楽観的更新
          const optimisticData = { ...data, value: newValue };
          setData(optimisticData);

          try {
            const result = await mockUpdateAPI(data.id, { value: newValue });
            setData(result);
          } catch (error) {
            // エラー時はロールバック
            setData(data);
          }

          end();
        };

        return (
          <div>
            <div data-testid="value">{data.value}</div>
            <button onClick={() => handleUpdate('updated')}>Update</button>
          </div>
        );
      };

      render(
        <QueryProvider client={queryClient}>
          <TestOptimisticComponent />
        </QueryProvider>
      );

      const updateButton = screen.getByText('Update');
      const end = measurer.start('ui_response_time');

      fireEvent.click(updateButton);

      // UIの即座の更新を確認
      await waitFor(() => {
        expect(screen.getByTestId('value')).toHaveTextContent('updated');
      });

      const uiResponseTime = end();

      // UI応答時間が50ms以内であることを確認
      expect(uiResponseTime).toBeLessThan(50);

      const optimisticStats = measurer.getStats('optimistic_update');
      expect(optimisticStats).toBeTruthy();
    });
  });

  describe('下書き保存性能テスト', () => {
    test('デバウンス処理の効率性', async () => {
      let saveCallCount = 0;

      const TestDraftComponent: React.FC = () => {
        const { autoSave } = useOptimizedDraftSave('test-draft', 'subgoal', {
          debounceDelay: 100,
        });

        // モック保存関数
        React.useEffect(() => {
          const originalSave = autoSave;
          (autoSave as any) = jest.fn().mockImplementation((...args) => {
            saveCallCount++;
            return originalSave(...args);
          });
        }, [autoSave]);

        const [value, setValue] = React.useState('');

        React.useEffect(() => {
          if (value) {
            autoSave({ value });
          }
        }, [value, autoSave]);

        return <input data-testid="input" value={value} onChange={e => setValue(e.target.value)} />;
      };

      render(<TestDraftComponent />);

      const input = screen.getByTestId('input');

      // 高速で複数回入力
      const end = measurer.start('debounce_efficiency');

      fireEvent.change(input, { target: { value: 'a' } });
      fireEvent.change(input, { target: { value: 'ab' } });
      fireEvent.change(input, { target: { value: 'abc' } });
      fireEvent.change(input, { target: { value: 'abcd' } });
      fireEvent.change(input, { target: { value: 'abcde' } });

      // デバウンス期間を短時間待つ
      await waitFor(() => {}, { timeout: 50 });

      end();

      // デバウンスにより保存回数が削減されることを確認
      // 実際の実装では1回のみ保存されるはず
      expect(saveCallCount).toBeLessThanOrEqual(2);
    });

    test('差分検出の性能', async () => {
      const largeObject = {
        subGoals: Array.from({ length: 8 }, (_, i) => ({
          id: `subgoal-${i}`,
          title: `SubGoal ${i}`,
          description: `Description for subgoal ${i}`,
          actions: Array.from({ length: 8 }, (_, j) => ({
            id: `action-${i}-${j}`,
            title: `Action ${i}-${j}`,
            description: `Description for action ${i}-${j}`,
          })),
        })),
      };

      const modifiedObject = {
        ...largeObject,
        subGoals: largeObject.subGoals.map((sg, i) =>
          i === 0 ? { ...sg, title: 'Modified SubGoal 0' } : sg
        ),
      };

      const end = measurer.start('diff_detection');

      // 差分検出の実行（実際の実装では useOptimizedDraftSave 内で実行）
      const { detectDiff } = await import('../../utils/diff-detection');
      const diff = detectDiff(largeObject, modifiedObject);

      const duration = end();

      // 大きなオブジェクトでも差分検出が10ms以内で完了
      expect(duration).toBeLessThan(10);
      expect(diff.hasChanges).toBe(true);
      expect(diff.summary.modified).toBeGreaterThan(0);
    });
  });

  describe('統合パフォーマンステスト', () => {
    test('サブ目標・アクション編集画面の総合性能', async () => {
      const TestIntegratedComponent: React.FC = () => {
        const [subGoals] = React.useState(
          Array.from({ length: 8 }, (_, i) => ({
            id: `subgoal-${i}`,
            goal_id: 'test-goal',
            title: `SubGoal ${i}`,
            description: `Description ${i}`,
            position: i,
            progress: Math.floor(Math.random() * 100),
          }))
        );

        const [actions] = React.useState(
          Array.from({ length: 64 }, (_, i) => ({
            id: `action-${i}`,
            sub_goal_id: `subgoal-${Math.floor(i / 8)}`,
            title: `Action ${i}`,
            description: `Description ${i}`,
            type: i % 2 === 0 ? 'execution' : 'habit',
            position: i % 8,
            progress: Math.floor(Math.random() * 100),
          }))
        );

        return (
          <div>
            <div data-testid="subgoals">
              {subGoals.map(subGoal => (
                <div key={subGoal.id}>{subGoal.title}</div>
              ))}
            </div>
            <VirtualGrid
              items={actions.map(action => ({ id: action.id, data: action }))}
              itemsPerRow={8}
              itemHeight={100}
              height={400}
              renderItem={item => (
                <div className="p-2 border">
                  <h3>{item.data.title}</h3>
                  <p>{item.data.description}</p>
                </div>
              )}
            />
          </div>
        );
      };

      const end = measurer.start('integrated_performance');

      render(
        <TestProvider>
          <TestIntegratedComponent />
        </TestProvider>
      );

      // すべての要素がレンダリングされるまで待機
      await waitFor(() => {
        expect(screen.getByTestId('subgoals')).toBeInTheDocument();
      });

      const duration = end();

      // 統合画面が200ms以内でレンダリング完了
      expect(duration).toBeLessThan(200);
    });
  });
});

/**
 * パフォーマンスベンチマーク
 */
describe('パフォーマンスベンチマーク', () => {
  test('ベンチマーク実行', async () => {
    const benchmarks = [
      {
        name: 'Small Form (10 fields)',
        test: () =>
          render(
            <TestProvider>
              <TestFormComponent fieldCount={10} />
            </TestProvider>
          ),
        target: 50, // ms
      },
      {
        name: 'Medium Form (50 fields)',
        test: () =>
          render(
            <TestProvider>
              <TestFormComponent fieldCount={50} />
            </TestProvider>
          ),
        target: 200, // ms
      },
      {
        name: 'Large Form (100 fields)',
        test: () =>
          render(
            <TestProvider>
              <TestFormComponent fieldCount={100} />
            </TestProvider>
          ),
        target: 500, // ms
      },
      {
        name: 'Virtual Scroll (1000 items)',
        test: () =>
          render(
            <TestProvider>
              <TestVirtualScrollComponent itemCount={1000} />
            </TestProvider>
          ),
        target: 100, // ms
      },
      {
        name: 'Virtual Grid (64 items)',
        test: () =>
          render(
            <TestProvider>
              <TestVirtualGridComponent itemCount={64} />
            </TestProvider>
          ),
        target: 30, // ms
      },
    ];

    const results: Array<{ name: string; duration: number; target: number; passed: boolean }> = [];

    for (const benchmark of benchmarks) {
      const end = measurer.start(benchmark.name);
      benchmark.test();
      const duration = end();

      const passed = duration <= benchmark.target;
      results.push({
        name: benchmark.name,
        duration,
        target: benchmark.target,
        passed,
      });

      expect(passed).toBe(true);
    }

    // ベンチマーク結果をコンソールに出力
    console.table(results);
  });
});
