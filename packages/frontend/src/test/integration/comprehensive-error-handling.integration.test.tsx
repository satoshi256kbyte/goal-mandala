import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { GoalInputForm } from '../../components/forms/GoalInputForm';
import { GoalFormProvider } from '../../contexts/GoalFormContext';
import { goalFormApiService } from '../../services/api';
import { DraftService } from '../../services/draftService';
import { ApiError, NetworkErrorType } from '../../services/api';

// APIサービスをモック
vi.mock('../../services/api', () => ({
  goalFormApiService: {
    createGoal: vi.fn(),
    saveDraft: vi.fn(),
    loadDraft: vi.fn(),
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

// DraftServiceをモック
vi.mock('../../services/draftService');

const mockGoalFormApiService = goalFormApiService as any;
const mockDraftService = DraftService as any;

// navigator.onLineをモック
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true,
});

// テスト用のラッパーコンポーネント
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>
    <GoalFormProvider>{children}</GoalFormProvider>
  </BrowserRouter>
);

describe('包括的エラーハンドリング統合テスト', () => {
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
    (navigator as any).onLine = true;
    mockDraftService.saveDraft.mockResolvedValue();
    mockDraftService.loadDraft.mockResolvedValue(null);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('ネットワークエラーの包括的処理', () => {
    it('接続エラー時の完全なエラーハンドリングフロー', async () => {
      const user = userEvent.setup({ delay: null });

      const connectionError: ApiError = {
        code: NetworkErrorType.CONNECTION_ERROR,
        message: 'ネットワーク接続エラーが発生しました',
        retryable: true,
        timestamp: new Date(),
        details: {
          originalError: new Error('Network connection failed'),
          retryCount: 0,
          maxRetries: 3,
        },
      };

      mockGoalFormApiService.createGoal.mockRejectedValue(connectionError);

      render(
        <TestWrapper>
          <GoalInputForm
            onSubmitSuccess={() => {}}
            onSubmitError={() => {}}
            enableErrorRecovery={true}
            maxRetries={3}
          />
        </TestWrapper>
      );

      // フォームに入力
      const titleInput = screen.getByRole('textbox', { name: /目標タイトル/ });
      fireEvent.change(titleInput, { target: { value: validFormData.title } });

      const descInput = screen.getByRole('textbox', { name: /目標説明/ });
      fireEvent.change(descInput, { target: { value: validFormData.description } });

      const deadlineInput = screen.getByRole('textbox', { name: /達成期限/ });
      fireEvent.change(deadlineInput, { target: { value: validFormData.deadline } });

      const backgroundInput = screen.getByRole('textbox', { name: /背景/ });
      fireEvent.change(backgroundInput, { target: { value: validFormData.background } });

      // 送信
      await user.click(screen.getByRole('button', { name: /AI生成開始/ }));

      // エラーメッセージが表示される
      await waitFor(() => {
        expect(screen.getByText(/ネットワーク接続エラーが発生しました/)).toBeInTheDocument();
      });

      // エラー詳細が表示される
      expect(screen.getByText(/再試行可能なエラーです/)).toBeInTheDocument();
      expect(screen.getByText(/残り試行回数: 3回/)).toBeInTheDocument();

      // 再試行ボタンが表示される
      const retryButton = screen.getByRole('button', { name: /再試行/ });
      expect(retryButton).toBeInTheDocument();

      // 自動再試行が開始される
      act(() => {
        vi.advanceTimersByTime(2000); // 2秒後に自動再試行
      });

      await waitFor(() => {
        expect(mockGoalFormApiService.createGoal).toHaveBeenCalledTimes(2);
      });
    });

    it('タイムアウトエラー時の段階的エラー処理', async () => {
      const user = userEvent.setup({ delay: null });

      // タイムアウトエラーをシミュレート
      mockGoalFormApiService.createGoal.mockImplementation(
        () =>
          new Promise((_, reject) =>
            setTimeout(
              () =>
                reject({
                  code: NetworkErrorType.TIMEOUT,
                  message: 'リクエストがタイムアウトしました',
                  retryable: true,
                  timestamp: new Date(),
                }),
              30000
            )
          )
      );

      render(
        <TestWrapper>
          <GoalInputForm
            onSubmitSuccess={() => {}}
            onSubmitError={() => {}}
            timeout={5000}
            enableProgressTracking={true}
          />
        </TestWrapper>
      );

      // フォームに入力
      const titleInput = screen.getByRole('textbox', { name: /目標タイトル/ });
      fireEvent.change(titleInput, { target: { value: validFormData.title } });
      const descInput = screen.getByRole('textbox', { name: /目標説明/ });
      fireEvent.change(descInput, { target: { value: validFormData.description } });
      const deadlineInput = screen.getByRole('textbox', { name: /達成期限/ });
      fireEvent.change(deadlineInput, { target: { value: validFormData.deadline } });
      const backgroundInput = screen.getByRole('textbox', { name: /背景/ });
      fireEvent.change(backgroundInput, { target: { value: validFormData.background } });

      // 送信
      await user.click(screen.getByRole('button', { name: /AI生成開始/ }));

      // 進捗表示が開始される
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.getByText(/送信中/)).toBeInTheDocument();

      // 進捗が更新される
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(screen.getByText(/40%/)).toBeInTheDocument();

      // タイムアウト発生
      act(() => {
        vi.advanceTimersByTime(3000);
      });

      // タイムアウトエラーが表示される
      await waitFor(() => {
        expect(screen.getByText(/リクエストがタイムアウトしました/)).toBeInTheDocument();
      });

      // 進捗バーが非表示になる
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();

      // タイムアウト対策の提案が表示される
      expect(screen.getByText(/ネットワーク環境を確認してください/)).toBeInTheDocument();
    });

    it('レート制限エラー時の適切な待機処理', async () => {
      const user = userEvent.setup({ delay: null });

      const rateLimitError: ApiError = {
        code: NetworkErrorType.RATE_LIMIT,
        message: 'リクエスト制限に達しました',
        retryable: true,
        timestamp: new Date(),
        details: {
          retryAfter: 60, // 60秒後に再試行可能
        },
      };

      mockGoalFormApiService.createGoal.mockRejectedValue(rateLimitError);

      render(
        <TestWrapper>
          <GoalInputForm
            onSubmitSuccess={() => {}}
            onSubmitError={() => {}}
            enableErrorRecovery={true}
          />
        </TestWrapper>
      );

      // フォームに入力して送信
      const titleInput = screen.getByRole('textbox', { name: /目標タイトル/ });
      fireEvent.change(titleInput, { target: { value: validFormData.title } });
      const descInput = screen.getByRole('textbox', { name: /目標説明/ });
      fireEvent.change(descInput, { target: { value: validFormData.description } });
      const deadlineInput = screen.getByRole('textbox', { name: /達成期限/ });
      fireEvent.change(deadlineInput, { target: { value: validFormData.deadline } });
      const backgroundInput = screen.getByRole('textbox', { name: /背景/ });
      fireEvent.change(backgroundInput, { target: { value: validFormData.background } });

      await user.click(screen.getByRole('button', { name: /AI生成開始/ }));

      // レート制限エラーが表示される
      await waitFor(() => {
        expect(screen.getByText(/リクエスト制限に達しました/)).toBeInTheDocument();
      });

      // 待機時間が表示される
      expect(screen.getByText(/60秒後に再試行できます/)).toBeInTheDocument();

      // カウントダウンタイマーが表示される
      expect(screen.getByTestId('retry-countdown')).toHaveTextContent('60');

      // 時間が経過するとカウントダウンが更新される
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(screen.getByTestId('retry-countdown')).toHaveTextContent('59');

      // 待機時間経過後に再試行ボタンが有効になる
      act(() => {
        vi.advanceTimersByTime(59000);
      });

      await waitFor(() => {
        const retryButton = screen.getByRole('button', { name: /再試行/ });
        expect(retryButton).not.toBeDisabled();
      });
    });
  });

  describe('オフライン状態の処理', () => {
    it('オフライン検出と復旧の完全フロー', async () => {
      const user = userEvent.setup({ delay: null });

      render(
        <TestWrapper>
          <GoalInputForm
            onSubmitSuccess={() => {}}
            onSubmitError={() => {}}
            enableOfflineDetection={true}
            enableOfflineQueue={true}
          />
        </TestWrapper>
      );

      // フォームに入力
      const titleInput = screen.getByRole('textbox', { name: /目標タイトル/ });
      fireEvent.change(titleInput, { target: { value: validFormData.title } });
      const descInput = screen.getByRole('textbox', { name: /目標説明/ });
      fireEvent.change(descInput, { target: { value: validFormData.description } });
      const deadlineInput = screen.getByRole('textbox', { name: /達成期限/ });
      fireEvent.change(deadlineInput, { target: { value: validFormData.deadline } });
      const backgroundInput = screen.getByRole('textbox', { name: /背景/ });
      fireEvent.change(backgroundInput, { target: { value: validFormData.background } });

      // オフライン状態にする
      act(() => {
        (navigator as any).onLine = false;
        window.dispatchEvent(new Event('offline'));
      });

      // オフライン通知が表示される
      await waitFor(() => {
        expect(screen.getByText(/オフラインです/)).toBeInTheDocument();
      });

      // 送信ボタンをクリック
      await user.click(screen.getByRole('button', { name: /AI生成開始/ }));

      // オフラインキューに追加される
      await waitFor(() => {
        expect(
          screen.getByText(/オフラインのため、送信をキューに追加しました/)
        ).toBeInTheDocument();
      });

      // キューの状態が表示される
      expect(screen.getByText(/キューに1件の送信待ちがあります/)).toBeInTheDocument();

      // オンライン復旧
      act(() => {
        (navigator as any).onLine = true;
        window.dispatchEvent(new Event('online'));
      });

      // オンライン復旧通知が表示される
      await waitFor(() => {
        expect(screen.getByText(/オンラインに復旧しました/)).toBeInTheDocument();
      });

      // キューの自動処理が開始される
      expect(screen.getByText(/キューの処理を開始しています/)).toBeInTheDocument();

      // 成功時の処理
      mockGoalFormApiService.createGoal.mockResolvedValue({
        success: true,
        goalId: 'goal-123',
        processingId: 'process-456',
      });

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(mockGoalFormApiService.createGoal).toHaveBeenCalled();
        expect(screen.getByText(/キューの処理が完了しました/)).toBeInTheDocument();
      });
    });

    it('オフライン時の下書き保存フォールバック', async () => {
      const user = userEvent.setup({ delay: null });

      // オフライン状態でAPIエラー
      mockDraftService.saveDraft.mockRejectedValue(new Error('Network error'));

      render(
        <TestWrapper>
          <GoalInputForm
            onSubmitSuccess={() => {}}
            onSubmitError={() => {}}
            enableDraftSave={true}
            enableOfflineFallback={true}
          />
        </TestWrapper>
      );

      // オフライン状態にする
      act(() => {
        (navigator as any).onLine = false;
        window.dispatchEvent(new Event('offline'));
      });

      // フォームに入力
      const titleInput = screen.getByRole('textbox', { name: /目標タイトル/ });
      fireEvent.change(titleInput, { target: { value: validFormData.title } });

      // 自動保存が実行される
      act(() => {
        vi.advanceTimersByTime(30000);
      });

      // ローカルストレージへのフォールバック保存が実行される
      await waitFor(() => {
        expect(screen.getByText(/オフラインのため、ローカルに保存しました/)).toBeInTheDocument();
      });

      // ローカルストレージに保存されることを確認
      const savedData = localStorage.getItem('goal-form-offline-draft');
      expect(savedData).toBeTruthy();
      expect(JSON.parse(savedData!)).toMatchObject({
        title: validFormData.title,
      });
    });
  });

  describe('サーバーエラーの処理', () => {
    it('500エラー時の詳細エラー情報表示', async () => {
      const user = userEvent.setup({ delay: null });

      const serverError: ApiError = {
        code: NetworkErrorType.SERVER_ERROR,
        message: 'サーバー内部エラーが発生しました',
        retryable: true,
        timestamp: new Date(),
        details: {
          statusCode: 500,
          errorId: 'ERR-2024-001',
          supportContact: 'support@example.com',
        },
      };

      mockGoalFormApiService.createGoal.mockRejectedValue(serverError);

      render(
        <TestWrapper>
          <GoalInputForm
            onSubmitSuccess={() => {}}
            onSubmitError={() => {}}
            enableDetailedErrors={true}
          />
        </TestWrapper>
      );

      // フォームに入力して送信
      const titleInput = screen.getByRole('textbox', { name: /目標タイトル/ });
      fireEvent.change(titleInput, { target: { value: validFormData.title } });
      const descInput = screen.getByRole('textbox', { name: /目標説明/ });
      fireEvent.change(descInput, { target: { value: validFormData.description } });
      const deadlineInput = screen.getByRole('textbox', { name: /達成期限/ });
      fireEvent.change(deadlineInput, { target: { value: validFormData.deadline } });
      const backgroundInput = screen.getByRole('textbox', { name: /背景/ });
      fireEvent.change(backgroundInput, { target: { value: validFormData.background } });

      await user.click(screen.getByRole('button', { name: /AI生成開始/ }));

      // 詳細エラー情報が表示される
      await waitFor(() => {
        expect(screen.getByText(/サーバー内部エラーが発生しました/)).toBeInTheDocument();
        expect(screen.getByText(/エラーID: ERR-2024-001/)).toBeInTheDocument();
        expect(screen.getByText(/サポート連絡先: support@example.com/)).toBeInTheDocument();
      });

      // エラー報告ボタンが表示される
      expect(screen.getByRole('button', { name: /エラーを報告/ })).toBeInTheDocument();

      // 詳細情報の展開/折りたたみ
      const detailsToggle = screen.getByRole('button', { name: /詳細を表示/ });
      await user.click(detailsToggle);

      expect(screen.getByText(/ステータスコード: 500/)).toBeInTheDocument();
      expect(screen.getByText(/発生時刻:/)).toBeInTheDocument();
    });

    it('400エラー時のバリデーションエラー統合処理', async () => {
      const user = userEvent.setup({ delay: null });

      const validationError: ApiError = {
        code: NetworkErrorType.CLIENT_ERROR,
        message: 'バリデーションエラーが発生しました',
        retryable: false,
        timestamp: new Date(),
        details: {
          statusCode: 400,
          fieldErrors: {
            title: '目標タイトルが不適切です',
            deadline: '達成期限が無効です',
          },
        },
      };

      mockGoalFormApiService.createGoal.mockRejectedValue(validationError);

      render(
        <TestWrapper>
          <GoalInputForm
            onSubmitSuccess={() => {}}
            onSubmitError={() => {}}
            enableServerValidation={true}
          />
        </TestWrapper>
      );

      // フォームに入力して送信
      const titleInput = screen.getByRole('textbox', { name: /目標タイトル/ });
      fireEvent.change(titleInput, { target: { value: validFormData.title } });
      const descInput = screen.getByRole('textbox', { name: /目標説明/ });
      fireEvent.change(descInput, { target: { value: validFormData.description } });
      const deadlineInput = screen.getByRole('textbox', { name: /達成期限/ });
      fireEvent.change(deadlineInput, { target: { value: validFormData.deadline } });
      const backgroundInput = screen.getByRole('textbox', { name: /背景/ });
      fireEvent.change(backgroundInput, { target: { value: validFormData.background } });

      await user.click(screen.getByRole('button', { name: /AI生成開始/ }));

      // サーバーサイドバリデーションエラーがフィールドに表示される
      await waitFor(() => {
        expect(screen.getByText(/目標タイトルが不適切です/)).toBeInTheDocument();
        expect(screen.getByText(/達成期限が無効です/)).toBeInTheDocument();
      });

      // 該当フィールドがエラー状態になる
      const titleInput = screen.getByRole('textbox', { name: /目標タイトル/ });
      const deadlineInput = screen.getByRole('textbox', { name: /達成期限/ });

      expect(titleInput).toHaveAttribute('aria-invalid', 'true');
      expect(deadlineInput).toHaveAttribute('aria-invalid', 'true');

      // エラーフィールドに自動フォーカス
      expect(titleInput).toHaveFocus();
    });
  });

  describe('エラー回復機能', () => {
    it('段階的エラー回復戦略', async () => {
      const user = userEvent.setup({ delay: null });

      let attemptCount = 0;
      mockGoalFormApiService.createGoal.mockImplementation(() => {
        attemptCount++;
        if (attemptCount === 1) {
          return Promise.reject({
            code: NetworkErrorType.TIMEOUT,
            message: 'タイムアウト',
            retryable: true,
          });
        } else if (attemptCount === 2) {
          return Promise.reject({
            code: NetworkErrorType.CONNECTION_ERROR,
            message: '接続エラー',
            retryable: true,
          });
        } else {
          return Promise.resolve({
            success: true,
            goalId: 'goal-123',
            processingId: 'process-456',
          });
        }
      });

      render(
        <TestWrapper>
          <GoalInputForm
            onSubmitSuccess={() => {}}
            onSubmitError={() => {}}
            enableErrorRecovery={true}
            maxRetries={3}
            retryStrategy="exponential"
          />
        </TestWrapper>
      );

      // フォームに入力して送信
      const titleInput = screen.getByRole('textbox', { name: /目標タイトル/ });
      fireEvent.change(titleInput, { target: { value: validFormData.title } });
      const descInput = screen.getByRole('textbox', { name: /目標説明/ });
      fireEvent.change(descInput, { target: { value: validFormData.description } });
      const deadlineInput = screen.getByRole('textbox', { name: /達成期限/ });
      fireEvent.change(deadlineInput, { target: { value: validFormData.deadline } });
      const backgroundInput = screen.getByRole('textbox', { name: /背景/ });
      fireEvent.change(backgroundInput, { target: { value: validFormData.background } });

      await user.click(screen.getByRole('button', { name: /AI生成開始/ }));

      // 1回目のエラー
      await waitFor(() => {
        expect(screen.getByText(/タイムアウト/)).toBeInTheDocument();
      });

      // 自動再試行（指数バックオフ: 2秒）
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      // 2回目のエラー
      await waitFor(() => {
        expect(screen.getByText(/接続エラー/)).toBeInTheDocument();
      });

      // 自動再試行（指数バックオフ: 4秒）
      act(() => {
        vi.advanceTimersByTime(4000);
      });

      // 3回目で成功
      await waitFor(() => {
        expect(mockGoalFormApiService.createGoal).toHaveBeenCalledTimes(3);
      });

      // 成功メッセージが表示される
      expect(screen.getByText(/送信が完了しました/)).toBeInTheDocument();
    });

    it('手動回復アクションの提供', async () => {
      const user = userEvent.setup({ delay: null });

      const persistentError: ApiError = {
        code: NetworkErrorType.SERVER_ERROR,
        message: '継続的なサーバーエラー',
        retryable: false,
        timestamp: new Date(),
        details: {
          suggestions: [
            'ブラウザを再読み込みしてください',
            'しばらく時間をおいてから再試行してください',
            'サポートにお問い合わせください',
          ],
        },
      };

      mockGoalFormApiService.createGoal.mockRejectedValue(persistentError);

      render(
        <TestWrapper>
          <GoalInputForm
            onSubmitSuccess={() => {}}
            onSubmitError={() => {}}
            enableManualRecovery={true}
          />
        </TestWrapper>
      );

      // フォームに入力して送信
      const titleInput = screen.getByRole('textbox', { name: /目標タイトル/ });
      fireEvent.change(titleInput, { target: { value: validFormData.title } });
      const descInput = screen.getByRole('textbox', { name: /目標説明/ });
      fireEvent.change(descInput, { target: { value: validFormData.description } });
      const deadlineInput = screen.getByRole('textbox', { name: /達成期限/ });
      fireEvent.change(deadlineInput, { target: { value: validFormData.deadline } });
      const backgroundInput = screen.getByRole('textbox', { name: /背景/ });
      fireEvent.change(backgroundInput, { target: { value: validFormData.background } });

      await user.click(screen.getByRole('button', { name: /AI生成開始/ }));

      // エラーと回復提案が表示される
      await waitFor(() => {
        expect(screen.getByText(/継続的なサーバーエラー/)).toBeInTheDocument();
        expect(screen.getByText(/ブラウザを再読み込みしてください/)).toBeInTheDocument();
        expect(screen.getByText(/しばらく時間をおいてから再試行してください/)).toBeInTheDocument();
        expect(screen.getByText(/サポートにお問い合わせください/)).toBeInTheDocument();
      });

      // 手動回復アクションボタンが表示される
      expect(screen.getByRole('button', { name: /ページを再読み込み/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /サポートに連絡/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /下書きとして保存/ })).toBeInTheDocument();
    });
  });

  describe('エラーログとレポート', () => {
    it('エラーログの自動収集と送信', async () => {
      const user = userEvent.setup({ delay: null });

      const mockErrorReporting = vi.fn();
      (window as any).errorReporting = { report: mockErrorReporting };

      const criticalError: ApiError = {
        code: NetworkErrorType.SERVER_ERROR,
        message: 'クリティカルエラー',
        retryable: false,
        timestamp: new Date(),
        details: {
          severity: 'critical',
          stackTrace: 'Error stack trace...',
        },
      };

      mockGoalFormApiService.createGoal.mockRejectedValue(criticalError);

      render(
        <TestWrapper>
          <GoalInputForm
            onSubmitSuccess={() => {}}
            onSubmitError={() => {}}
            enableErrorReporting={true}
            autoReportCriticalErrors={true}
          />
        </TestWrapper>
      );

      // フォームに入力して送信
      const titleInput = screen.getByRole('textbox', { name: /目標タイトル/ });
      fireEvent.change(titleInput, { target: { value: validFormData.title } });
      const descInput = screen.getByRole('textbox', { name: /目標説明/ });
      fireEvent.change(descInput, { target: { value: validFormData.description } });
      const deadlineInput = screen.getByRole('textbox', { name: /達成期限/ });
      fireEvent.change(deadlineInput, { target: { value: validFormData.deadline } });
      const backgroundInput = screen.getByRole('textbox', { name: /背景/ });
      fireEvent.change(backgroundInput, { target: { value: validFormData.background } });

      await user.click(screen.getByRole('button', { name: /AI生成開始/ }));

      // エラーが自動的に報告される
      await waitFor(() => {
        expect(mockErrorReporting).toHaveBeenCalledWith({
          error: criticalError,
          context: {
            formData: expect.any(Object),
            userAgent: navigator.userAgent,
            timestamp: expect.any(String),
          },
        });
      });

      // 自動報告の通知が表示される
      expect(screen.getByText(/エラーレポートを自動送信しました/)).toBeInTheDocument();
    });

    it('ユーザー主導のエラー報告', async () => {
      const user = userEvent.setup({ delay: null });

      const mockErrorReporting = vi.fn();
      (window as any).errorReporting = { report: mockErrorReporting };

      const userError: ApiError = {
        code: NetworkErrorType.CONNECTION_ERROR,
        message: 'ユーザー報告対象エラー',
        retryable: true,
        timestamp: new Date(),
      };

      mockGoalFormApiService.createGoal.mockRejectedValue(userError);

      render(
        <TestWrapper>
          <GoalInputForm
            onSubmitSuccess={() => {}}
            onSubmitError={() => {}}
            enableErrorReporting={true}
            autoReportCriticalErrors={false}
          />
        </TestWrapper>
      );

      // フォームに入力して送信
      const titleInput = screen.getByRole('textbox', { name: /目標タイトル/ });
      fireEvent.change(titleInput, { target: { value: validFormData.title } });
      const descInput = screen.getByRole('textbox', { name: /目標説明/ });
      fireEvent.change(descInput, { target: { value: validFormData.description } });
      const deadlineInput = screen.getByRole('textbox', { name: /達成期限/ });
      fireEvent.change(deadlineInput, { target: { value: validFormData.deadline } });
      const backgroundInput = screen.getByRole('textbox', { name: /背景/ });
      fireEvent.change(backgroundInput, { target: { value: validFormData.background } });

      await user.click(screen.getByRole('button', { name: /AI生成開始/ }));

      // エラー報告ボタンをクリック
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /エラーを報告/ })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /エラーを報告/ }));

      // エラー報告ダイアログが表示される
      expect(screen.getByText(/エラーレポートの送信/)).toBeInTheDocument();
      expect(screen.getByLabelText(/追加情報/)).toBeInTheDocument();

      // 追加情報を入力
      await user.type(screen.getByLabelText(/追加情報/), 'フォーム送信時に発生しました');

      // 報告を送信
      await user.click(screen.getByRole('button', { name: /レポートを送信/ }));

      // エラーレポートが送信される
      await waitFor(() => {
        expect(mockErrorReporting).toHaveBeenCalledWith({
          error: userError,
          userComment: 'フォーム送信時に発生しました',
          context: expect.any(Object),
        });
      });

      // 送信完了メッセージが表示される
      expect(screen.getByText(/エラーレポートを送信しました/)).toBeInTheDocument();
    });
  });
});
