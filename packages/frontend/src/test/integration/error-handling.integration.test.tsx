import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { GoalInputForm } from '../../components/forms/GoalInputForm';
import { ErrorRecoveryPanel } from '../../components/forms/ErrorRecoveryPanel';
import { EnhancedErrorDisplay } from '../../components/forms/EnhancedErrorDisplay';
import { ApiError, NetworkErrorType } from '../../services/api';

// APIクライアントをモック
vi.mock('../../services/api', () => ({
  apiClient: {
    post: vi.fn(),
    get: vi.fn(),
  },
  goalFormApiService: {
    saveDraft: vi.fn(),
    createGoal: vi.fn(),
  },
  NetworkErrorType: {
    TIMEOUT: 'TIMEOUT',
    CONNECTION_ERROR: 'CONNECTION_ERROR',
    SERVER_ERROR: 'SERVER_ERROR',
    CLIENT_ERROR: 'CLIENT_ERROR',
    RATE_LIMIT: 'RATE_LIMIT',
    OFFLINE: 'OFFLINE',
  },
}));

// navigator.onLineをモック
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true,
});

describe('エラーハンドリング統合テスト', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    (navigator as any).onLine = true;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('ネットワークエラーハンドリング', () => {
    it('タイムアウトエラーが発生した場合の完全なフロー', async () => {
      const mockApiCall = vi
        .fn()
        .mockImplementation(
          () =>
            new Promise((_, reject) => setTimeout(() => reject(new Error('Request timeout')), 2000))
        );

      const TestComponent = () => {
        const [error, setError] = React.useState<ApiError | null>(null);
        const [isSubmitting, setIsSubmitting] = React.useState(false);

        const handleSubmit = async () => {
          setIsSubmitting(true);
          setError(null);

          try {
            await mockApiCall();
          } catch (err) {
            const apiError: ApiError = {
              code: NetworkErrorType.TIMEOUT,
              message: 'リクエストがタイムアウトしました',
              retryable: true,
              timestamp: new Date(),
            };
            setError(apiError);
          } finally {
            setIsSubmitting(false);
          }
        };

        return (
          <div>
            <button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? '送信中...' : '送信'}
            </button>
            {error && <EnhancedErrorDisplay networkError={error} onRetry={handleSubmit} />}
          </div>
        );
      };

      render(<TestComponent />);

      // 送信ボタンをクリック
      const submitButton = screen.getByText('送信');
      fireEvent.click(submitButton);

      expect(screen.getByText('送信中...')).toBeInTheDocument();

      // タイムアウト時間経過
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      await waitFor(() => {
        expect(screen.getByText(/リクエストがタイムアウトしました/)).toBeInTheDocument();
      });

      // 再試行ボタンが表示される
      expect(screen.getByText('再試行')).toBeInTheDocument();
    });

    it('オフライン状態からの回復フロー', async () => {
      const TestComponent = () => {
        const [error, setError] = React.useState<ApiError | null>(null);

        React.useEffect(() => {
          const handleOffline = () => {
            setError({
              code: NetworkErrorType.OFFLINE,
              message: 'オフラインです',
              retryable: true,
              timestamp: new Date(),
            });
          };

          const handleOnline = () => {
            setError(null);
          };

          window.addEventListener('offline', handleOffline);
          window.addEventListener('online', handleOnline);

          return () => {
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('online', handleOnline);
          };
        }, []);

        return (
          <div>
            {error ? (
              <ErrorRecoveryPanel
                error={error}
                context={{
                  retryFunction: async () => {
                    console.log('再試行実行');
                  },
                }}
              />
            ) : (
              <div>オンライン状態</div>
            )}
          </div>
        );
      };

      render(<TestComponent />);

      expect(screen.getByText('オンライン状態')).toBeInTheDocument();

      // オフラインイベントを発火
      act(() => {
        (navigator as any).onLine = false;
        window.dispatchEvent(new Event('offline'));
      });

      await waitFor(() => {
        expect(screen.getByText('オフラインです')).toBeInTheDocument();
      });

      // オンラインイベントを発火
      act(() => {
        (navigator as any).onLine = true;
        window.dispatchEvent(new Event('online'));
      });

      await waitFor(() => {
        expect(screen.getByText('オンライン状態')).toBeInTheDocument();
      });
    });
  });

  describe('バリデーションエラーハンドリング', () => {
    it('複数のバリデーションエラーが適切に表示される', async () => {
      const fieldErrors = {
        title: '目標タイトルは必須です',
        description: '目標説明は必須です',
        deadline: '達成期限は必須です',
      };

      render(<EnhancedErrorDisplay fieldErrors={fieldErrors} mode="inline" showDetails={true} />);

      expect(screen.getByText('目標タイトル: 目標タイトルは必須です')).toBeInTheDocument();
      expect(screen.getByText('目標説明: 目標説明は必須です')).toBeInTheDocument();
      expect(screen.getByText('達成期限: 達成期限は必須です')).toBeInTheDocument();
    });

    it('エラーの個別非表示機能が動作する', async () => {
      const fieldErrors = {
        title: '目標タイトルは必須です',
        description: '目標説明は必須です',
      };

      render(<EnhancedErrorDisplay fieldErrors={fieldErrors} mode="inline" />);

      expect(screen.getByText('目標タイトルは必須です')).toBeInTheDocument();
      expect(screen.getByText('目標説明は必須です')).toBeInTheDocument();

      // 目標タイトルのエラーを非表示
      const dismissButton = screen.getByLabelText('目標タイトルのエラーを非表示');
      fireEvent.click(dismissButton);

      expect(screen.queryByText('目標タイトルは必須です')).not.toBeInTheDocument();
      expect(screen.getByText('目標説明は必須です')).toBeInTheDocument();
    });
  });

  describe('エラー回復機能', () => {
    it('自動回復が成功する場合のフロー', async () => {
      let callCount = 0;
      const mockRetryFunction = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(new Error('一時的なエラー'));
        }
        return Promise.resolve('成功');
      });

      const TestComponent = () => {
        const [error, setError] = React.useState<ApiError>({
          code: NetworkErrorType.SERVER_ERROR,
          message: 'サーバーエラー',
          retryable: true,
          timestamp: new Date(),
        });
        const [isRecovered, setIsRecovered] = React.useState(false);

        return (
          <div>
            {!isRecovered ? (
              <ErrorRecoveryPanel
                error={error}
                context={{
                  retryFunction: mockRetryFunction,
                }}
                onRecoverySuccess={() => {
                  setIsRecovered(true);
                  setError(null as any);
                }}
                enableAutoRecovery={true}
              />
            ) : (
              <div>回復成功</div>
            )}
          </div>
        );
      };

      render(<TestComponent />);

      expect(screen.getByText('サーバーエラー')).toBeInTheDocument();

      // 自動回復の遅延時間を進める
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      await waitFor(() => {
        expect(screen.getByText('回復成功')).toBeInTheDocument();
      });
    });

    it('手動回復アクションが機能する', async () => {
      const mockRetryFunction = vi.fn().mockResolvedValue('成功');

      const TestComponent = () => {
        const [isRecovered, setIsRecovered] = React.useState(false);

        const error: ApiError = {
          code: NetworkErrorType.CLIENT_ERROR,
          message: 'クライアントエラー',
          retryable: false,
          timestamp: new Date(),
        };

        return (
          <div>
            {!isRecovered ? (
              <ErrorRecoveryPanel
                error={error}
                context={{
                  retryFunction: mockRetryFunction,
                }}
                onRecoverySuccess={() => setIsRecovered(true)}
                enableAutoRecovery={false}
              />
            ) : (
              <div>手動回復成功</div>
            )}
          </div>
        );
      };

      render(<TestComponent />);

      expect(screen.getByText('クライアントエラー')).toBeInTheDocument();

      // 再試行ボタンをクリック
      const retryButton = screen.getByText('再試行');
      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(mockRetryFunction).toHaveBeenCalled();
        expect(screen.getByText('手動回復成功')).toBeInTheDocument();
      });
    });
  });

  describe('タイムアウト処理', () => {
    it('フォーム送信タイムアウトが正しく動作する', async () => {
      const mockSubmitFunction = vi
        .fn()
        .mockImplementation(() => new Promise(resolve => setTimeout(resolve, 5000)));

      const TestComponent = () => {
        const [isSubmitting, setIsSubmitting] = React.useState(false);
        const [error, setError] = React.useState<ApiError | null>(null);
        const [progress, setProgress] = React.useState(0);

        const handleSubmit = async () => {
          setIsSubmitting(true);
          setError(null);
          setProgress(0);

          const timeoutId = setTimeout(() => {
            setError({
              code: NetworkErrorType.TIMEOUT,
              message: 'フォーム送信がタイムアウトしました',
              retryable: true,
              timestamp: new Date(),
            });
            setIsSubmitting(false);
          }, 3000);

          // 進捗更新
          const progressInterval = setInterval(() => {
            setProgress(prev => {
              const newProgress = prev + 0.1;
              return newProgress >= 1 ? 1 : newProgress;
            });
          }, 300);

          try {
            await mockSubmitFunction();
            clearTimeout(timeoutId);
            clearInterval(progressInterval);
            setIsSubmitting(false);
            setProgress(1);
          } catch (err) {
            clearTimeout(timeoutId);
            clearInterval(progressInterval);
            setIsSubmitting(false);
          }
        };

        return (
          <div>
            <button onClick={handleSubmit} disabled={isSubmitting}>
              送信
            </button>
            {isSubmitting && (
              <div>
                <div>送信中... {Math.round(progress * 100)}%</div>
                <div
                  style={{
                    width: '100px',
                    height: '10px',
                    backgroundColor: '#f0f0f0',
                  }}
                >
                  <div
                    style={{
                      width: `${progress * 100}%`,
                      height: '100%',
                      backgroundColor: '#007bff',
                    }}
                  />
                </div>
              </div>
            )}
            {error && <EnhancedErrorDisplay networkError={error} />}
          </div>
        );
      };

      render(<TestComponent />);

      const submitButton = screen.getByText('送信');
      fireEvent.click(submitButton);

      expect(screen.getByText(/送信中.../)).toBeInTheDocument();

      // 進捗更新を確認
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      // タイムアウト発生
      act(() => {
        vi.advanceTimersByTime(3000);
      });

      await waitFor(() => {
        expect(screen.getByText(/フォーム送信がタイムアウトしました/)).toBeInTheDocument();
      });
    });
  });

  describe('エラー表示モード', () => {
    it('トーストモードでエラーが表示される', () => {
      const error: ApiError = {
        code: NetworkErrorType.CONNECTION_ERROR,
        message: 'ネットワークエラー',
        retryable: true,
        timestamp: new Date(),
      };

      render(<EnhancedErrorDisplay networkError={error} mode="toast" />);

      const toastElement = screen.getByRole('alert');
      expect(toastElement).toHaveClass('fixed', 'top-4', 'right-4');
      expect(screen.getByText('ネットワークエラー')).toBeInTheDocument();
    });

    it('モーダルモードでエラーが表示される', () => {
      const error: ApiError = {
        code: NetworkErrorType.SERVER_ERROR,
        message: 'サーバーエラー',
        retryable: true,
        timestamp: new Date(),
      };

      render(<EnhancedErrorDisplay networkError={error} mode="modal" />);

      expect(screen.getByText('エラーが発生しました')).toBeInTheDocument();
      expect(screen.getByText('サーバーエラー')).toBeInTheDocument();
      expect(screen.getByText('閉じる')).toBeInTheDocument();
    });
  });

  describe('アクセシビリティ', () => {
    it('エラーメッセージが適切なARIA属性で表示される', () => {
      const error: ApiError = {
        code: NetworkErrorType.CONNECTION_ERROR,
        message: 'ネットワークエラー',
        retryable: true,
        timestamp: new Date(),
      };

      render(
        <EnhancedErrorDisplay
          networkError={error}
          accessibility={{
            announceErrors: true,
            errorSummaryId: 'test-error-summary',
          }}
        />
      );

      const alertElement = screen.getByRole('alert');
      expect(alertElement).toHaveAttribute('aria-live', 'assertive');
      expect(alertElement).toHaveAttribute('id', 'test-error-summary');
    });

    it('エラー回復パネルのボタンが適切なラベルを持つ', () => {
      const error: ApiError = {
        code: NetworkErrorType.TIMEOUT,
        message: 'タイムアウト',
        retryable: true,
        timestamp: new Date(),
      };

      const mockOnClose = vi.fn();

      render(<ErrorRecoveryPanel error={error} onClose={mockOnClose} />);

      const closeButton = screen.getByLabelText('エラーパネルを閉じる');
      expect(closeButton).toBeInTheDocument();
    });
  });

  describe('パフォーマンス', () => {
    it('大量のエラーメッセージが効率的に処理される', () => {
      const manyErrors: Record<string, string> = {};
      for (let i = 0; i < 100; i++) {
        manyErrors[`field${i}`] = `エラーメッセージ${i}`;
      }

      const startTime = performance.now();

      render(<EnhancedErrorDisplay fieldErrors={manyErrors} maxErrors={10} />);

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // レンダリング時間が合理的な範囲内であることを確認
      expect(renderTime).toBeLessThan(100); // 100ms以内

      // 最大エラー数の制限が機能していることを確認
      const errorElements = screen.getAllByRole('alert');
      expect(errorElements.length).toBeLessThanOrEqual(10);
    });
  });
});
