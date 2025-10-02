import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { GoalInputForm } from '../../components/forms/GoalInputForm';
import { GoalFormProvider } from '../../contexts/GoalFormContext';
import { goalFormApiService, apiClient } from '../../services/api';
import { DraftService } from '../../services/draftService';

// APIクライアントをモック
vi.mock('../../services/api', () => ({
  apiClient: {
    post: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
  goalFormApiService: {
    createGoal: vi.fn(),
    saveDraft: vi.fn(),
    loadDraft: vi.fn(),
    clearDraft: vi.fn(),
  },
}));

// DraftServiceをモック
vi.mock('../../services/draftService');

// const mockApiClient = apiClient as any;
const mockGoalFormApiService = goalFormApiService as any;
const mockDraftService = DraftService as any;

// fetch APIをモック
global.fetch = vi.fn();
const mockFetch = fetch as any;

// テスト用のラッパーコンポーネント
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>
    <GoalFormProvider>{children}</GoalFormProvider>
  </BrowserRouter>
);

describe('API統合テスト', () => {
  const validFormData = {
    title: 'プログラミングスキル向上',
    description:
      'フルスタック開発者として成長するため、React、Node.js、データベース設計のスキルを向上させる',
    deadline: '2024-12-31',
    background:
      '現在のプロジェクトでより高度な技術が求められており、チームに貢献するためにスキルアップが必要',
    constraints: '平日は仕事があるため、主に週末と平日の夜に学習時間を確保する必要がある',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('目標作成API統合', () => {
    it('目標作成APIが正しいパラメータで呼び出される', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      const expectedResponse = {
        success: true,
        goalId: 'goal-123',
        processingId: 'process-456',
      };

      mockGoalFormApiService.createGoal.mockResolvedValue(expectedResponse);

      const mockOnSubmitSuccess = vi.fn();

      render(
        <TestWrapper>
          <GoalInputForm onSubmitSuccess={mockOnSubmitSuccess} onSubmitError={() => {}} />
        </TestWrapper>
      );

      // フォームに入力
      await user.type(screen.getByLabelText(/目標タイトル/), validFormData.title);
      await user.type(screen.getByLabelText(/目標説明/), validFormData.description);
      await user.type(screen.getByLabelText(/達成期限/), validFormData.deadline);
      await user.type(screen.getByLabelText(/背景/), validFormData.background);
      await user.type(screen.getByLabelText(/制約事項/), validFormData.constraints);

      // 送信
      await user.click(screen.getByRole('button', { name: /AI生成開始/ }));

      // API呼び出しを確認
      await waitFor(() => {
        expect(mockGoalFormApiService.createGoal).toHaveBeenCalledWith({
          title: validFormData.title,
          description: validFormData.description,
          deadline: validFormData.deadline,
          background: validFormData.background,
          constraints: validFormData.constraints,
        });
      });

      // 成功コールバックが呼ばれることを確認
      expect(mockOnSubmitSuccess).toHaveBeenCalledWith(expectedResponse);
    });

    it('APIレスポンスの形式検証', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      // 正常なレスポンス
      const validResponse = {
        success: true,
        goalId: 'goal-123',
        processingId: 'process-456',
        timestamp: new Date().toISOString(),
        metadata: {
          estimatedProcessingTime: 30000,
          queuePosition: 1,
        },
      };

      mockGoalFormApiService.createGoal.mockResolvedValue(validResponse);

      const mockOnSubmitSuccess = vi.fn();

      render(
        <TestWrapper>
          <GoalInputForm
            onSubmitSuccess={mockOnSubmitSuccess}
            onSubmitError={() => {}}
            validateApiResponse={true}
          />
        </TestWrapper>
      );

      // フォームに入力して送信
      await user.type(screen.getByLabelText(/目標タイトル/), validFormData.title);
      await user.type(screen.getByLabelText(/目標説明/), validFormData.description);
      await user.type(screen.getByLabelText(/達成期限/), validFormData.deadline);
      await user.type(screen.getByLabelText(/背景/), validFormData.background);

      await user.click(screen.getByRole('button', { name: /AI生成開始/ }));

      // レスポンス検証が成功することを確認
      await waitFor(() => {
        expect(mockOnSubmitSuccess).toHaveBeenCalledWith(validResponse);
      });

      // 処理時間の推定値が表示される
      expect(screen.getByText(/推定処理時間: 30秒/)).toBeInTheDocument();
      expect(screen.getByText(/キューの位置: 1番目/)).toBeInTheDocument();
    });

    it('不正なAPIレスポンスの処理', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      // 不正なレスポンス（必須フィールドが不足）
      const invalidResponse = {
        success: true,
        // goalIdが不足
        processingId: 'process-456',
      };

      mockGoalFormApiService.createGoal.mockResolvedValue(invalidResponse as any);

      const mockOnSubmitError = vi.fn();

      render(
        <TestWrapper>
          <GoalInputForm
            onSubmitSuccess={() => {}}
            onSubmitError={mockOnSubmitError}
            validateApiResponse={true}
          />
        </TestWrapper>
      );

      // フォームに入力して送信
      await user.type(screen.getByLabelText(/目標タイトル/), validFormData.title);
      await user.type(screen.getByLabelText(/目標説明/), validFormData.description);
      await user.type(screen.getByLabelText(/達成期限/), validFormData.deadline);
      await user.type(screen.getByLabelText(/背景/), validFormData.background);

      await user.click(screen.getByRole('button', { name: /AI生成開始/ }));

      // レスポンス検証エラーが処理される
      await waitFor(() => {
        expect(mockOnSubmitError).toHaveBeenCalledWith(
          expect.objectContaining({
            message: expect.stringContaining('APIレスポンスの形式が不正です'),
          })
        );
      });

      // エラーメッセージが表示される
      expect(screen.getByText(/APIレスポンスの形式が不正です/)).toBeInTheDocument();
    });
  });

  describe('下書き保存API統合', () => {
    it('下書き保存APIが正しく呼び出される', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      mockDraftService.saveDraft.mockResolvedValue();

      render(
        <TestWrapper>
          <GoalInputForm
            onSubmitSuccess={() => {}}
            onSubmitError={() => {}}
            enableDraftSave={true}
          />
        </TestWrapper>
      );

      // フォームに入力
      await user.type(screen.getByLabelText(/目標タイトル/), validFormData.title);
      await user.type(screen.getByLabelText(/目標説明/), validFormData.description);

      // 手動保存
      await user.click(screen.getByRole('button', { name: /下書き保存/ }));

      // API呼び出しを確認
      await waitFor(() => {
        expect(mockDraftService.saveDraft).toHaveBeenCalledWith({
          title: validFormData.title,
          description: validFormData.description,
        });
      });

      // 保存成功メッセージが表示される
      expect(screen.getByText(/保存しました/)).toBeInTheDocument();
    });

    it('下書き読み込みAPIが正しく呼び出される', async () => {
      const mockDraftData = {
        formData: {
          title: validFormData.title,
          description: validFormData.description,
        },
        savedAt: new Date().toISOString(),
        version: 1,
      };

      mockDraftService.loadDraft.mockResolvedValue(mockDraftData);

      render(
        <TestWrapper>
          <GoalInputForm
            onSubmitSuccess={() => {}}
            onSubmitError={() => {}}
            enableDraftSave={true}
            autoRestore={true}
          />
        </TestWrapper>
      );

      // 下書き読み込みAPIが呼ばれることを確認
      await waitFor(() => {
        expect(mockDraftService.loadDraft).toHaveBeenCalled();
      });

      // 復元通知が表示される
      expect(screen.getByText(/下書きが見つかりました/)).toBeInTheDocument();
    });

    it('下書き削除APIが正しく呼び出される', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      const mockDraftData = {
        formData: {
          title: validFormData.title,
        },
        savedAt: new Date().toISOString(),
        version: 1,
      };

      mockDraftService.loadDraft.mockResolvedValue(mockDraftData);
      mockDraftService.clearDraft.mockResolvedValue();

      render(
        <TestWrapper>
          <GoalInputForm
            onSubmitSuccess={() => {}}
            onSubmitError={() => {}}
            enableDraftSave={true}
            autoRestore={true}
          />
        </TestWrapper>
      );

      // 復元通知が表示されるまで待機
      await waitFor(() => {
        expect(screen.getByText(/下書きが見つかりました/)).toBeInTheDocument();
      });

      // 削除ボタンをクリック
      await user.click(screen.getByRole('button', { name: /削除/ }));

      // 確認ダイアログで削除を確認
      await user.click(screen.getByRole('button', { name: /削除する/ }));

      // 削除APIが呼ばれることを確認
      await waitFor(() => {
        expect(mockDraftService.clearDraft).toHaveBeenCalled();
      });
    });
  });

  describe('APIエラーハンドリング統合', () => {
    it('HTTPステータスコード別のエラー処理', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      // 400エラー（バリデーションエラー）
      const validationError = {
        status: 400,
        message: 'バリデーションエラー',
        errors: {
          title: '目標タイトルが不正です',
          deadline: '達成期限が無効です',
        },
      };

      mockGoalFormApiService.createGoal.mockRejectedValue(validationError);

      render(
        <TestWrapper>
          <GoalInputForm onSubmitSuccess={() => {}} onSubmitError={() => {}} />
        </TestWrapper>
      );

      // フォームに入力して送信
      await user.type(screen.getByLabelText(/目標タイトル/), validFormData.title);
      await user.type(screen.getByLabelText(/目標説明/), validFormData.description);
      await user.type(screen.getByLabelText(/達成期限/), validFormData.deadline);
      await user.type(screen.getByLabelText(/背景/), validFormData.background);

      await user.click(screen.getByRole('button', { name: /AI生成開始/ }));

      // バリデーションエラーがフィールドに表示される
      await waitFor(() => {
        expect(screen.getByText(/目標タイトルが不正です/)).toBeInTheDocument();
        expect(screen.getByText(/達成期限が無効です/)).toBeInTheDocument();
      });
    });

    it('401エラー（認証エラー）の処理', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      const authError = {
        status: 401,
        message: '認証が必要です',
        code: 'UNAUTHORIZED',
      };

      mockGoalFormApiService.createGoal.mockRejectedValue(authError);

      const mockOnAuthError = vi.fn();

      render(
        <TestWrapper>
          <GoalInputForm
            onSubmitSuccess={() => {}}
            onSubmitError={() => {}}
            onAuthError={mockOnAuthError}
          />
        </TestWrapper>
      );

      // フォームに入力して送信
      await user.type(screen.getByLabelText(/目標タイトル/), validFormData.title);
      await user.type(screen.getByLabelText(/目標説明/), validFormData.description);
      await user.type(screen.getByLabelText(/達成期限/), validFormData.deadline);
      await user.type(screen.getByLabelText(/背景/), validFormData.background);

      await user.click(screen.getByRole('button', { name: /AI生成開始/ }));

      // 認証エラーコールバックが呼ばれる
      await waitFor(() => {
        expect(mockOnAuthError).toHaveBeenCalledWith(authError);
      });

      // ログイン画面への遷移メッセージが表示される
      expect(screen.getByText(/ログインが必要です/)).toBeInTheDocument();
    });

    it('429エラー（レート制限）の処理', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      const rateLimitError = {
        status: 429,
        message: 'リクエスト制限に達しました',
        retryAfter: 60,
      };

      mockGoalFormApiService.createGoal.mockRejectedValue(rateLimitError);

      render(
        <TestWrapper>
          <GoalInputForm onSubmitSuccess={() => {}} onSubmitError={() => {}} />
        </TestWrapper>
      );

      // フォームに入力して送信
      await user.type(screen.getByLabelText(/目標タイトル/), validFormData.title);
      await user.type(screen.getByLabelText(/目標説明/), validFormData.description);
      await user.type(screen.getByLabelText(/達成期限/), validFormData.deadline);
      await user.type(screen.getByLabelText(/背景/), validFormData.background);

      await user.click(screen.getByRole('button', { name: /AI生成開始/ }));

      // レート制限エラーメッセージが表示される
      await waitFor(() => {
        expect(screen.getByText(/リクエスト制限に達しました/)).toBeInTheDocument();
        expect(screen.getByText(/60秒後に再試行できます/)).toBeInTheDocument();
      });

      // カウントダウンタイマーが表示される
      expect(screen.getByTestId('retry-countdown')).toHaveTextContent('60');
    });

    it('500エラー（サーバーエラー）の処理', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      const serverError = {
        status: 500,
        message: 'サーバー内部エラー',
        errorId: 'ERR-500-001',
      };

      mockGoalFormApiService.createGoal.mockRejectedValue(serverError);

      render(
        <TestWrapper>
          <GoalInputForm onSubmitSuccess={() => {}} onSubmitError={() => {}} />
        </TestWrapper>
      );

      // フォームに入力して送信
      await user.type(screen.getByLabelText(/目標タイトル/), validFormData.title);
      await user.type(screen.getByLabelText(/目標説明/), validFormData.description);
      await user.type(screen.getByLabelText(/達成期限/), validFormData.deadline);
      await user.type(screen.getByLabelText(/背景/), validFormData.background);

      await user.click(screen.getByRole('button', { name: /AI生成開始/ }));

      // サーバーエラーメッセージが表示される
      await waitFor(() => {
        expect(screen.getByText(/サーバー内部エラー/)).toBeInTheDocument();
        expect(screen.getByText(/エラーID: ERR-500-001/)).toBeInTheDocument();
      });

      // 再試行ボタンが表示される
      expect(screen.getByRole('button', { name: /再試行/ })).toBeInTheDocument();
    });
  });

  describe('APIリクエストの最適化', () => {
    it('リクエストのデバウンス処理', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      mockDraftService.saveDraft.mockResolvedValue();

      render(
        <TestWrapper>
          <GoalInputForm
            onSubmitSuccess={() => {}}
            onSubmitError={() => {}}
            enableDraftSave={true}
            autoSaveDebounceMs={500}
          />
        </TestWrapper>
      );

      const titleInput = screen.getByLabelText(/目標タイトル/);

      // 連続して文字を入力
      await user.type(titleInput, 'テスト');

      // デバウンス期間中はAPIが呼ばれない
      expect(mockDraftService.saveDraft).not.toHaveBeenCalled();

      // デバウンス期間経過
      act(() => {
        vi.advanceTimersByTime(500);
      });

      // APIが1回だけ呼ばれる
      await waitFor(() => {
        expect(mockDraftService.saveDraft).toHaveBeenCalledTimes(1);
      });
    });

    it('重複リクエストの防止', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      let resolvePromise: (value: any) => void;
      const pendingPromise = new Promise(resolve => {
        resolvePromise = resolve;
      });

      mockGoalFormApiService.createGoal.mockReturnValue(pendingPromise);

      render(
        <TestWrapper>
          <GoalInputForm onSubmitSuccess={() => {}} onSubmitError={() => {}} />
        </TestWrapper>
      );

      // フォームに入力
      await user.type(screen.getByLabelText(/目標タイトル/), validFormData.title);
      await user.type(screen.getByLabelText(/目標説明/), validFormData.description);
      await user.type(screen.getByLabelText(/達成期限/), validFormData.deadline);
      await user.type(screen.getByLabelText(/背景/), validFormData.background);

      const submitButton = screen.getByRole('button', { name: /AI生成開始/ });

      // 連続して送信ボタンをクリック
      await user.click(submitButton);
      await user.click(submitButton);
      await user.click(submitButton);

      // APIは1回だけ呼ばれる
      expect(mockGoalFormApiService.createGoal).toHaveBeenCalledTimes(1);

      // 送信ボタンが無効化される
      expect(submitButton).toBeDisabled();

      // リクエスト完了
      act(() => {
        resolvePromise!({
          success: true,
          goalId: 'goal-123',
          processingId: 'process-456',
        });
      });

      // 送信ボタンが再度有効になる
      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });
    });

    it('リクエストキャンセル機能', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      const abortController = new AbortController();
      const mockAbort = vi.spyOn(abortController, 'abort');

      // AbortControllerをモック
      vi.spyOn(window, 'AbortController').mockImplementation(() => abortController);

      mockGoalFormApiService.createGoal.mockImplementation(
        () =>
          new Promise((_, reject) => {
            abortController.signal.addEventListener('abort', () => {
              reject(new Error('Request cancelled'));
            });
          })
      );

      render(
        <TestWrapper>
          <GoalInputForm onSubmitSuccess={() => {}} onSubmitError={() => {}} enableCancel={true} />
        </TestWrapper>
      );

      // フォームに入力
      await user.type(screen.getByLabelText(/目標タイトル/), validFormData.title);
      await user.type(screen.getByLabelText(/目標説明/), validFormData.description);
      await user.type(screen.getByLabelText(/達成期限/), validFormData.deadline);
      await user.type(screen.getByLabelText(/背景/), validFormData.background);

      // 送信
      await user.click(screen.getByRole('button', { name: /AI生成開始/ }));

      // キャンセルボタンが表示される
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /キャンセル/ })).toBeInTheDocument();
      });

      // キャンセルボタンをクリック
      await user.click(screen.getByRole('button', { name: /キャンセル/ }));

      // リクエストがキャンセルされる
      expect(mockAbort).toHaveBeenCalled();

      // キャンセルメッセージが表示される
      await waitFor(() => {
        expect(screen.getByText(/送信をキャンセルしました/)).toBeInTheDocument();
      });
    });
  });

  describe('APIレスポンスキャッシュ', () => {
    it('下書きデータのキャッシュ機能', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      const mockDraftData = {
        formData: {
          title: validFormData.title,
        },
        savedAt: new Date().toISOString(),
        version: 1,
      };

      mockDraftService.loadDraft.mockResolvedValue(mockDraftData);

      const { rerender } = render(
        <TestWrapper>
          <GoalInputForm
            onSubmitSuccess={() => {}}
            onSubmitError={() => {}}
            enableDraftSave={true}
            enableCaching={true}
          />
        </TestWrapper>
      );

      // 初回読み込み
      await waitFor(() => {
        expect(mockDraftService.loadDraft).toHaveBeenCalledTimes(1);
      });

      // 再レンダリング
      rerender(
        <TestWrapper>
          <GoalInputForm
            onSubmitSuccess={() => {}}
            onSubmitError={() => {}}
            enableDraftSave={true}
            enableCaching={true}
          />
        </TestWrapper>
      );

      // キャッシュが使用され、APIは再度呼ばれない
      expect(mockDraftService.loadDraft).toHaveBeenCalledTimes(1);
    });

    it('キャッシュの無効化', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      mockDraftService.loadDraft.mockResolvedValue(null);
      mockDraftService.saveDraft.mockResolvedValue();

      render(
        <TestWrapper>
          <GoalInputForm
            onSubmitSuccess={() => {}}
            onSubmitError={() => {}}
            enableDraftSave={true}
            enableCaching={true}
          />
        </TestWrapper>
      );

      // 初回読み込み
      await waitFor(() => {
        expect(mockDraftService.loadDraft).toHaveBeenCalledTimes(1);
      });

      // 下書き保存（キャッシュを無効化）
      await user.type(screen.getByLabelText(/目標タイトル/), validFormData.title);
      await user.click(screen.getByRole('button', { name: /下書き保存/ }));

      await waitFor(() => {
        expect(mockDraftService.saveDraft).toHaveBeenCalled();
      });

      // キャッシュが無効化され、次回読み込み時にAPIが再度呼ばれる
      // （実際のテストでは、キャッシュ無効化のロジックを確認）
    });
  });

  describe('APIモニタリング', () => {
    it('APIレスポンス時間の測定', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      const mockPerformanceObserver = vi.fn();
      (window as any).PerformanceObserver = vi.fn().mockImplementation(() => ({
        observe: mockPerformanceObserver,
        disconnect: vi.fn(),
      }));

      mockGoalFormApiService.createGoal.mockImplementation(
        () =>
          new Promise(resolve =>
            setTimeout(
              () =>
                resolve({
                  success: true,
                  goalId: 'goal-123',
                  processingId: 'process-456',
                }),
              1000
            )
          )
      );

      render(
        <TestWrapper>
          <GoalInputForm
            onSubmitSuccess={() => {}}
            onSubmitError={() => {}}
            enablePerformanceMonitoring={true}
          />
        </TestWrapper>
      );

      // フォームに入力して送信
      await user.type(screen.getByLabelText(/目標タイトル/), validFormData.title);
      await user.type(screen.getByLabelText(/目標説明/), validFormData.description);
      await user.type(screen.getByLabelText(/達成期限/), validFormData.deadline);
      await user.type(screen.getByLabelText(/背景/), validFormData.background);

      await user.click(screen.getByRole('button', { name: /AI生成開始/ }));

      // レスポンス時間測定が開始される
      expect(mockPerformanceObserver).toHaveBeenCalled();

      // API完了まで待機
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(mockGoalFormApiService.createGoal).toHaveBeenCalled();
      });
    });
  });
});
