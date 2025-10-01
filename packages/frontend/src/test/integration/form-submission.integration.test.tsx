import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { GoalInputForm } from '../../components/forms/GoalInputForm';
import { GoalFormProvider } from '../../contexts/GoalFormContext';
import { goalFormApiService } from '../../services/api';
import { GoalFormData } from '../../schemas/goal-form';

// APIサービスをモック
vi.mock('../../services/api', () => ({
  goalFormApiService: {
    createGoal: vi.fn(),
    saveDraft: vi.fn(),
    loadDraft: vi.fn(),
  },
}));

const mockGoalFormApiService = goalFormApiService as any;

// React Routerのナビゲーションをモック
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => ({
  ...(await vi.importActual('react-router-dom')),
  useNavigate: () => mockNavigate,
}));

// テスト用のラッパーコンポーネント
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>
    <GoalFormProvider>{children}</GoalFormProvider>
  </BrowserRouter>
);

describe('フォーム送信フロー統合テスト', () => {
  const validFormData: GoalFormData = {
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
    mockNavigate.mockClear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('正常な送信フロー', () => {
    it('有効なデータでフォーム送信が成功する', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      mockGoalFormApiService.createGoal.mockResolvedValue({
        success: true,
        goalId: 'goal-123',
        processingId: 'process-456',
      });

      const mockOnSubmitSuccess = vi.fn();

      render(
        <TestWrapper>
          <GoalInputForm onSubmitSuccess={mockOnSubmitSuccess} onSubmitError={() => {}} />
        </TestWrapper>
      );

      // フォームフィールドに入力
      await user.type(screen.getByLabelText(/目標タイトル/), validFormData.title);
      await user.type(screen.getByLabelText(/目標説明/), validFormData.description);
      await user.type(screen.getByLabelText(/達成期限/), validFormData.deadline);
      await user.type(screen.getByLabelText(/背景/), validFormData.background);
      await user.type(screen.getByLabelText(/制約事項/), validFormData.constraints || '');

      // 送信ボタンをクリック
      const submitButton = screen.getByRole('button', { name: /AI生成開始/ });
      expect(submitButton).not.toBeDisabled();

      await user.click(submitButton);

      // 送信中の状態を確認
      expect(screen.getByText(/送信中/)).toBeInTheDocument();
      expect(submitButton).toBeDisabled();

      // API呼び出しを確認
      await waitFor(() => {
        expect(mockGoalFormApiService.createGoal).toHaveBeenCalledWith(validFormData);
      });

      // 成功コールバックが呼ばれることを確認
      await waitFor(() => {
        expect(mockOnSubmitSuccess).toHaveBeenCalledWith({
          success: true,
          goalId: 'goal-123',
          processingId: 'process-456',
        });
      });
    });

    it('送信成功後に適切な画面遷移が行われる', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      mockGoalFormApiService.createGoal.mockResolvedValue({
        success: true,
        goalId: 'goal-123',
        processingId: 'process-456',
      });

      render(
        <TestWrapper>
          <GoalInputForm
            onSubmitSuccess={response => {
              mockNavigate(`/mandala/create/processing?processingId=${response.processingId}`);
            }}
            onSubmitError={() => {}}
          />
        </TestWrapper>
      );

      // フォームに入力
      await user.type(screen.getByLabelText(/目標タイトル/), validFormData.title);
      await user.type(screen.getByLabelText(/目標説明/), validFormData.description);
      await user.type(screen.getByLabelText(/達成期限/), validFormData.deadline);
      await user.type(screen.getByLabelText(/背景/), validFormData.background);

      // 送信
      await user.click(screen.getByRole('button', { name: /AI生成開始/ }));

      // 画面遷移を確認
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(
          '/mandala/create/processing?processingId=process-456'
        );
      });
    });

    it('送信前の最終バリデーションが実行される', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      render(
        <TestWrapper>
          <GoalInputForm onSubmitSuccess={() => {}} onSubmitError={() => {}} />
        </TestWrapper>
      );

      // 不完全なデータを入力（タイトルのみ）
      await user.type(screen.getByLabelText(/目標タイトル/), 'テスト目標');

      // 送信ボタンは無効状態のはず
      const submitButton = screen.getByRole('button', { name: /AI生成開始/ });
      expect(submitButton).toBeDisabled();

      // 必須フィールドを全て入力
      await user.type(screen.getByLabelText(/目標説明/), validFormData.description);
      await user.type(screen.getByLabelText(/達成期限/), validFormData.deadline);
      await user.type(screen.getByLabelText(/背景/), validFormData.background);

      // 送信ボタンが有効になることを確認
      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });
    });
  });

  describe('エラーハンドリング', () => {
    it('API エラー時に適切なエラーメッセージが表示される', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      const apiError = new Error('サーバーエラーが発生しました');
      mockGoalFormApiService.createGoal.mockRejectedValue(apiError);

      const mockOnSubmitError = vi.fn();

      render(
        <TestWrapper>
          <GoalInputForm onSubmitSuccess={() => {}} onSubmitError={mockOnSubmitError} />
        </TestWrapper>
      );

      // フォームに入力
      await user.type(screen.getByLabelText(/目標タイトル/), validFormData.title);
      await user.type(screen.getByLabelText(/目標説明/), validFormData.description);
      await user.type(screen.getByLabelText(/達成期限/), validFormData.deadline);
      await user.type(screen.getByLabelText(/背景/), validFormData.background);

      // 送信
      await user.click(screen.getByRole('button', { name: /AI生成開始/ }));

      // エラーメッセージが表示されることを確認
      await waitFor(() => {
        expect(screen.getByText(/サーバーエラーが発生しました/)).toBeInTheDocument();
      });

      // エラーコールバックが呼ばれることを確認
      expect(mockOnSubmitError).toHaveBeenCalledWith(apiError);

      // 送信ボタンが再度有効になることを確認
      const submitButton = screen.getByRole('button', { name: /AI生成開始/ });
      expect(submitButton).not.toBeDisabled();
    });

    it('ネットワークエラー時に再試行機能が動作する', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      // 最初の呼び出しでエラー、2回目で成功
      mockGoalFormApiService.createGoal
        .mockRejectedValueOnce(new Error('ネットワークエラー'))
        .mockResolvedValueOnce({
          success: true,
          goalId: 'goal-123',
          processingId: 'process-456',
        });

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

      // 最初の送信（エラー）
      await user.click(screen.getByRole('button', { name: /AI生成開始/ }));

      // エラーメッセージと再試行ボタンが表示される
      await waitFor(() => {
        expect(screen.getByText(/ネットワークエラー/)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /再試行/ })).toBeInTheDocument();
      });

      // 再試行
      await user.click(screen.getByRole('button', { name: /再試行/ }));

      // 成功することを確認
      await waitFor(() => {
        expect(mockGoalFormApiService.createGoal).toHaveBeenCalledTimes(2);
      });
    });

    it('タイムアウトエラーが適切に処理される', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      // タイムアウトをシミュレート
      mockGoalFormApiService.createGoal.mockImplementation(
        () =>
          new Promise((_, reject) => setTimeout(() => reject(new Error('Request timeout')), 30000))
      );

      render(
        <TestWrapper>
          <GoalInputForm
            onSubmitSuccess={() => {}}
            onSubmitError={() => {}}
            timeout={5000} // 5秒でタイムアウト
          />
        </TestWrapper>
      );

      // フォームに入力
      await user.type(screen.getByLabelText(/目標タイトル/), validFormData.title);
      await user.type(screen.getByLabelText(/目標説明/), validFormData.description);
      await user.type(screen.getByLabelText(/達成期限/), validFormData.deadline);
      await user.type(screen.getByLabelText(/背景/), validFormData.background);

      // 送信
      await user.click(screen.getByRole('button', { name: /AI生成開始/ }));

      // タイムアウト時間を進める
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      // タイムアウトエラーが表示される
      await waitFor(() => {
        expect(screen.getByText(/タイムアウト/)).toBeInTheDocument();
      });
    });
  });

  describe('バリデーション統合', () => {
    it('リアルタイムバリデーションと送信時バリデーションが連携する', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      render(
        <TestWrapper>
          <GoalInputForm onSubmitSuccess={() => {}} onSubmitError={() => {}} />
        </TestWrapper>
      );

      // 文字数制限を超える入力
      const longTitle = 'a'.repeat(101); // 100文字制限を超える
      await user.type(screen.getByLabelText(/目標タイトル/), longTitle);

      // リアルタイムバリデーションエラーが表示される
      await waitFor(() => {
        expect(screen.getByText(/100文字以内で入力してください/)).toBeInTheDocument();
      });

      // 送信ボタンが無効状態になる
      const submitButton = screen.getByRole('button', { name: /AI生成開始/ });
      expect(submitButton).toBeDisabled();

      // 正しい長さに修正
      await user.clear(screen.getByLabelText(/目標タイトル/));
      await user.type(screen.getByLabelText(/目標タイトル/), validFormData.title);

      // エラーが消える
      await waitFor(() => {
        expect(screen.queryByText(/100文字以内で入力してください/)).not.toBeInTheDocument();
      });
    });

    it('日付バリデーションが正しく動作する', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      render(
        <TestWrapper>
          <GoalInputForm onSubmitSuccess={() => {}} onSubmitError={() => {}} />
        </TestWrapper>
      );

      // 過去の日付を入力
      const pastDate = '2020-01-01';
      await user.type(screen.getByLabelText(/達成期限/), pastDate);

      // バリデーションエラーが表示される
      await waitFor(() => {
        expect(screen.getByText(/今日から1年以内の日付を選択してください/)).toBeInTheDocument();
      });

      // 送信ボタンが無効状態になる
      const submitButton = screen.getByRole('button', { name: /AI生成開始/ });
      expect(submitButton).toBeDisabled();

      // 正しい日付に修正
      await user.clear(screen.getByLabelText(/達成期限/));
      await user.type(screen.getByLabelText(/達成期限/), validFormData.deadline);

      // エラーが消える
      await waitFor(() => {
        expect(
          screen.queryByText(/今日から1年以内の日付を選択してください/)
        ).not.toBeInTheDocument();
      });
    });
  });

  describe('フォーム状態管理', () => {
    it('送信中は入力フィールドが無効化される', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      // 長時間かかる処理をシミュレート
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
              2000
            )
          )
      );

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

      // 送信
      await user.click(screen.getByRole('button', { name: /AI生成開始/ }));

      // 入力フィールドが無効化されることを確認
      expect(screen.getByLabelText(/目標タイトル/)).toBeDisabled();
      expect(screen.getByLabelText(/目標説明/)).toBeDisabled();
      expect(screen.getByLabelText(/達成期限/)).toBeDisabled();
      expect(screen.getByLabelText(/背景/)).toBeDisabled();

      // 送信完了まで待機
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      await waitFor(() => {
        expect(mockGoalFormApiService.createGoal).toHaveBeenCalled();
      });
    });

    it('送信キャンセル機能が動作する', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      let rejectFunction: (reason?: any) => void;
      mockGoalFormApiService.createGoal.mockImplementation(
        () =>
          new Promise((_, reject) => {
            rejectFunction = reject;
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

      // キャンセル実行
      await user.click(screen.getByRole('button', { name: /キャンセル/ }));

      // 送信がキャンセルされる
      act(() => {
        rejectFunction!(new Error('Cancelled'));
      });

      // フォームが元の状態に戻る
      await waitFor(() => {
        expect(screen.getByLabelText(/目標タイトル/)).not.toBeDisabled();
        expect(screen.getByRole('button', { name: /AI生成開始/ })).not.toBeDisabled();
      });
    });
  });

  describe('進捗表示', () => {
    it('送信進捗が適切に表示される', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

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
              3000
            )
          )
      );

      render(
        <TestWrapper>
          <GoalInputForm onSubmitSuccess={() => {}} onSubmitError={() => {}} showProgress={true} />
        </TestWrapper>
      );

      // フォームに入力
      await user.type(screen.getByLabelText(/目標タイトル/), validFormData.title);
      await user.type(screen.getByLabelText(/目標説明/), validFormData.description);
      await user.type(screen.getByLabelText(/達成期限/), validFormData.deadline);
      await user.type(screen.getByLabelText(/背景/), validFormData.background);

      // 送信
      await user.click(screen.getByRole('button', { name: /AI生成開始/ }));

      // 進捗表示が表示される
      await waitFor(() => {
        expect(screen.getByText(/送信中/)).toBeInTheDocument();
        expect(screen.getByRole('progressbar')).toBeInTheDocument();
      });

      // 進捗が更新される
      act(() => {
        vi.advanceTimersByTime(1500);
      });

      // 完了まで待機
      act(() => {
        vi.advanceTimersByTime(1500);
      });

      await waitFor(() => {
        expect(mockGoalFormApiService.createGoal).toHaveBeenCalled();
      });
    });
  });
});
