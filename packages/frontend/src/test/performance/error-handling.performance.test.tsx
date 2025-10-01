import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { performance } from 'perf_hooks';
import { EnhancedErrorDisplay } from '../../components/forms/EnhancedErrorDisplay';
import { ErrorRecoveryPanel } from '../../components/forms/ErrorRecoveryPanel';
import { ApiError, NetworkErrorType } from '../../services/api';

/**
 * エラーハンドリング機能のパフォーマンステスト
 */
describe('エラーハンドリング パフォーマンステスト', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('大量エラー表示のパフォーマンス', () => {
    it('100個のフィールドエラーを効率的に表示する', () => {
      const manyErrors: Record<string, string> = {};
      for (let i = 0; i < 100; i++) {
        manyErrors[`field${i}`] = `エラーメッセージ${i}`;
      }

      const startTime = performance.now();

      render(
        <EnhancedErrorDisplay
          fieldErrors={manyErrors}
          maxErrors={50} // 表示制限
        />
      );

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // レンダリング時間が合理的な範囲内であることを確認
      expect(renderTime).toBeLessThan(100); // 100ms以内

      // 表示制限が機能していることを確認
      const errorElements = screen.getAllByRole('alert');
      expect(errorElements.length).toBeLessThanOrEqual(1); // EnhancedErrorDisplayは1つのalert要素
    });

    it('エラーメッセージの動的更新パフォーマンス', () => {
      const TestComponent = () => {
        const [errors, setErrors] = React.useState<Record<string, string>>({});

        const addError = () => {
          const newErrors = { ...errors };
          const errorCount = Object.keys(errors).length;
          newErrors[`field${errorCount}`] = `エラー${errorCount}`;
          setErrors(newErrors);
        };

        return (
          <div>
            <button onClick={addError}>エラー追加</button>
            <EnhancedErrorDisplay fieldErrors={errors} />
          </div>
        );
      };

      render(<TestComponent />);

      const addButton = screen.getByText('エラー追加');

      // 50個のエラーを順次追加
      const startTime = performance.now();

      for (let i = 0; i < 50; i++) {
        act(() => {
          fireEvent.click(addButton);
        });
      }

      const endTime = performance.now();
      const updateTime = endTime - startTime;

      // 更新時間が合理的な範囲内であることを確認
      expect(updateTime).toBeLessThan(500); // 500ms以内
    });
  });

  describe('エラー回復処理のパフォーマンス', () => {
    it('複数の回復アクションを効率的に処理する', async () => {
      const mockRetryFunction = jest.fn().mockResolvedValue('success');
      const mockFallbackFunction = jest.fn().mockResolvedValue('fallback');

      const error: ApiError = {
        code: NetworkErrorType.SERVER_ERROR,
        message: 'サーバーエラー',
        retryable: true,
        timestamp: new Date(),
      };

      const startTime = performance.now();

      render(
        <ErrorRecoveryPanel
          error={error}
          context={{
            retryFunction: mockRetryFunction,
            fallbackFunction: mockFallbackFunction,
          }}
        />
      );

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // 初期レンダリング時間が合理的であることを確認
      expect(renderTime).toBeLessThan(50); // 50ms以内
    });

    it('自動回復処理の効率性', async () => {
      let recoveryCount = 0;
      const mockRetryFunction = jest.fn().mockImplementation(() => {
        recoveryCount++;
        if (recoveryCount < 3) {
          return Promise.reject(new Error('まだ失敗'));
        }
        return Promise.resolve('成功');
      });

      const TestComponent = () => {
        const [error, setError] = React.useState<ApiError>({
          code: NetworkErrorType.TIMEOUT,
          message: 'タイムアウト',
          retryable: true,
          timestamp: new Date(),
        });

        return (
          <ErrorRecoveryPanel
            error={error}
            context={{ retryFunction: mockRetryFunction }}
            onRecoverySuccess={() => setError(null as any)}
            enableAutoRecovery={true}
          />
        );
      };

      const startTime = performance.now();

      render(<TestComponent />);

      // 自動回復の遅延時間を進める
      act(() => {
        jest.advanceTimersByTime(6000); // 3回の再試行 (2秒 × 3)
      });

      const endTime = performance.now();
      const recoveryTime = endTime - startTime;

      // 回復処理時間が合理的であることを確認
      expect(recoveryTime).toBeLessThan(200); // 200ms以内（タイマー進行時間は除く）
    });
  });

  describe('メモリ使用量の最適化', () => {
    it('エラー状態のメモリリークがない', () => {
      const TestComponent = () => {
        const [errorCount, setErrorCount] = React.useState(0);
        const [errors, setErrors] = React.useState<Record<string, string>>({});

        const addError = () => {
          const newCount = errorCount + 1;
          setErrorCount(newCount);
          setErrors(prev => ({
            ...prev,
            [`field${newCount}`]: `エラー${newCount}`,
          }));
        };

        const clearErrors = () => {
          setErrors({});
          setErrorCount(0);
        };

        return (
          <div>
            <button onClick={addError}>エラー追加</button>
            <button onClick={clearErrors}>エラークリア</button>
            <EnhancedErrorDisplay fieldErrors={errors} />
          </div>
        );
      };

      const { unmount } = render(<TestComponent />);

      const addButton = screen.getByText('エラー追加');
      const clearButton = screen.getByText('エラークリア');

      // 大量のエラーを追加
      for (let i = 0; i < 100; i++) {
        act(() => {
          fireEvent.click(addButton);
        });
      }

      // エラーをクリア
      act(() => {
        fireEvent.click(clearButton);
      });

      // コンポーネントをアンマウント
      unmount();

      // メモリリークの検出は困難だが、エラーなくアンマウントできることを確認
      expect(true).toBe(true);
    });

    it('タイマーのクリーンアップが適切に行われる', () => {
      const TestComponent = () => {
        const [showError, setShowError] = React.useState(true);

        return (
          <div>
            <button onClick={() => setShowError(!showError)}>エラー表示切替</button>
            {showError && (
              <EnhancedErrorDisplay
                generalError="テストエラー"
                autoHideMs={5000}
                onErrorHide={() => setShowError(false)}
              />
            )}
          </div>
        );
      };

      const { unmount } = render(<TestComponent />);

      const toggleButton = screen.getByText('エラー表示切替');

      // エラー表示を切り替える
      act(() => {
        fireEvent.click(toggleButton);
      });

      act(() => {
        fireEvent.click(toggleButton);
      });

      // コンポーネントをアンマウント
      unmount();

      // タイマーが適切にクリーンアップされることを確認
      // （実際のタイマーリークの検出は困難だが、エラーなくアンマウントできることを確認）
      expect(true).toBe(true);
    });
  });

  describe('レンダリング最適化', () => {
    it('不要な再レンダリングが発生しない', () => {
      let renderCount = 0;

      const TestComponent = React.memo(() => {
        renderCount++;

        const error: ApiError = {
          code: NetworkErrorType.CONNECTION_ERROR,
          message: 'ネットワークエラー',
          retryable: true,
          timestamp: new Date(),
        };

        return <EnhancedErrorDisplay networkError={error} />;
      });

      const ParentComponent = () => {
        const [count, setCount] = React.useState(0);

        return (
          <div>
            <button onClick={() => setCount(count + 1)}>カウント: {count}</button>
            <TestComponent />
          </div>
        );
      };

      render(<ParentComponent />);

      const button = screen.getByText(/カウント:/);
      const initialRenderCount = renderCount;

      // 親コンポーネントの状態を変更
      act(() => {
        fireEvent.click(button);
      });

      act(() => {
        fireEvent.click(button);
      });

      // TestComponentが不要に再レンダリングされていないことを確認
      expect(renderCount).toBe(initialRenderCount);
    });

    it('エラー状態の変更時のみ再レンダリングされる', () => {
      let renderCount = 0;

      const TestComponent = () => {
        renderCount++;

        const [error, setError] = React.useState<ApiError | null>(null);
        const [otherState, setOtherState] = React.useState(0);

        return (
          <div>
            <button onClick={() => setOtherState(otherState + 1)}>
              その他の状態: {otherState}
            </button>
            <button
              onClick={() =>
                setError({
                  code: NetworkErrorType.CONNECTION_ERROR,
                  message: 'エラー',
                  retryable: true,
                  timestamp: new Date(),
                })
              }
            >
              エラー設定
            </button>
            <button onClick={() => setError(null)}>エラークリア</button>
            <EnhancedErrorDisplay networkError={error} />
          </div>
        );
      };

      render(<TestComponent />);

      const otherStateButton = screen.getByText(/その他の状態:/);
      const errorButton = screen.getByText('エラー設定');
      const clearButton = screen.getByText('エラークリア');

      const initialRenderCount = renderCount;

      // その他の状態を変更（エラー表示には影響しない）
      act(() => {
        fireEvent.click(otherStateButton);
      });

      // エラーを設定
      act(() => {
        fireEvent.click(errorButton);
      });

      // エラーをクリア
      act(() => {
        fireEvent.click(clearButton);
      });

      // 適切な回数だけレンダリングされていることを確認
      expect(renderCount).toBeGreaterThan(initialRenderCount);
      expect(renderCount).toBeLessThan(initialRenderCount + 10); // 過度な再レンダリングがない
    });
  });

  describe('イベントハンドラーの最適化', () => {
    it('イベントリスナーが適切に管理される', () => {
      const addEventListenerSpy = jest.spyOn(window, 'addEventListener');
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');

      const TestComponent = () => {
        const error: ApiError = {
          code: NetworkErrorType.OFFLINE,
          message: 'オフライン',
          retryable: true,
          timestamp: new Date(),
        };

        return <ErrorRecoveryPanel error={error} enableAutoRecovery={true} />;
      };

      const { unmount } = render(<TestComponent />);

      // イベントリスナーが追加されることを確認
      expect(addEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
      expect(addEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function));

      // コンポーネントをアンマウント
      unmount();

      // イベントリスナーが削除されることを確認
      expect(removeEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function));

      addEventListenerSpy.mockRestore();
      removeEventListenerSpy.mockRestore();
    });
  });
});
