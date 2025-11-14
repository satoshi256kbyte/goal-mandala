import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { ErrorRecoveryPanel } from './ErrorRecoveryPanel';
import { ApiError, NetworkErrorType } from '../../services/api';

// useErrorRecoveryをモック
vi.mock('../../hooks/useErrorRecovery', () => ({
  useErrorRecovery: vi.fn(),
  RecoveryStrategy: {
    AUTO_RETRY: 'auto_retry',
    MANUAL_RETRY: 'manual_retry',
    WAIT_ONLINE: 'wait_online',
    FALLBACK: 'fallback',
    USER_INTERVENTION: 'user_intervention',
    UNRECOVERABLE: 'unrecoverable',
  },
  RecoveryAction: {
    RETRY: 'retry',
    RELOAD: 'reload',
    CLEAR_CACHE: 'clear_cache',
    CLEAR_STORAGE: 'clear_storage',
    SUGGEST_ALTERNATIVE: 'suggest_alternative',
    CONTACT_SUPPORT: 'contact_support',
  },
}));

const mockUseErrorRecovery = require('../../hooks/useErrorRecovery').useErrorRecovery;

describe('ErrorRecoveryPanel', () => {
  const mockStartRecovery = vi.fn();
  const mockExecuteRecoveryAction = vi.fn();
  const mockIsRecoverable = vi.fn();
  const mockResetRecovery = vi.fn();

  const defaultMockReturn = {
    recoveryState: {
      isRecovering: false,
      strategy: null,
      recommendedActions: [],
      recoveryAttempts: 0,
      lastRecoveryAttempt: null,
      recoverySuccessful: false,
    },
    recoveryProgress: 0,
    startRecovery: mockStartRecovery,
    executeRecoveryAction: mockExecuteRecoveryAction,
    isRecoverable: mockIsRecoverable,
    resetRecovery: mockResetRecovery,
    getRecoveryStrategy: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseErrorRecovery.mockReturnValue(defaultMockReturn);
    mockIsRecoverable.mockReturnValue(true);
  });

  describe('基本表示', () => {
    it('エラーがない場合は何も表示しない', () => {
      render(<ErrorRecoveryPanel error={null} />);
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('エラーメッセージを表示する', () => {
      const error: ApiError = {
        code: NetworkErrorType.TIMEOUT,
        message: 'タイムアウトエラー',
        retryable: true,
        timestamp: new Date(),
      };

      render(<ErrorRecoveryPanel error={error} />);
      expect(screen.getByText('タイムアウトエラー')).toBeInTheDocument();
    });

    it('回復不可能なエラーの場合は適切なメッセージを表示する', () => {
      mockIsRecoverable.mockReturnValue(false);

      const error: ApiError = {
        code: NetworkErrorType.CLIENT_ERROR,
        message: 'クライアントエラー',
        retryable: false,
        timestamp: new Date(),
      };

      render(<ErrorRecoveryPanel error={error} />);
      expect(
        screen.getByText('このエラーは自動回復できません。サポートにお問い合わせください。')
      ).toBeInTheDocument();
    });
  });

  describe('回復状態表示', () => {
    it('回復中の状態を表示する', () => {
      mockUseErrorRecovery.mockReturnValue({
        ...defaultMockReturn,
        recoveryState: {
          ...defaultMockReturn.recoveryState,
          isRecovering: true,
          strategy: 'auto_retry',
        },
        recoveryProgress: 0.5,
      });

      const error: ApiError = {
        code: NetworkErrorType.TIMEOUT,
        message: 'タイムアウト',
        retryable: true,
        timestamp: new Date(),
      };

      render(<ErrorRecoveryPanel error={error} />);
      expect(screen.getByText('自動的に再試行しています...')).toBeInTheDocument();
      expect(screen.getByText('50%')).toBeInTheDocument();
    });

    it('進捗バーが正しく表示される', () => {
      mockUseErrorRecovery.mockReturnValue({
        ...defaultMockReturn,
        recoveryState: {
          ...defaultMockReturn.recoveryState,
          isRecovering: true,
          strategy: 'auto_retry',
        },
        recoveryProgress: 0.75,
      });

      const error: ApiError = {
        code: NetworkErrorType.TIMEOUT,
        message: 'タイムアウト',
        retryable: true,
        timestamp: new Date(),
      };

      render(<ErrorRecoveryPanel error={error} />);

      const progressBar = screen.getByText('75%').parentElement?.querySelector('.bg-blue-600');
      expect(progressBar).toHaveStyle('width: 75%');
    });
  });

  describe('回復アクション', () => {
    it('推奨アクションボタンを表示する', () => {
      mockUseErrorRecovery.mockReturnValue({
        ...defaultMockReturn,
        recoveryState: {
          ...defaultMockReturn.recoveryState,
          strategy: 'manual_retry',
          recommendedActions: ['retry', 'reload'],
        },
      });

      const error: ApiError = {
        code: NetworkErrorType.TIMEOUT,
        message: 'タイムアウト',
        retryable: true,
        timestamp: new Date(),
      };

      render(<ErrorRecoveryPanel error={error} />);

      expect(screen.getByText('再試行')).toBeInTheDocument();
      expect(screen.getByText('ページを再読み込み')).toBeInTheDocument();
    });

    it('再試行ボタンをクリックすると回復アクションが実行される', async () => {
      mockExecuteRecoveryAction.mockResolvedValue(true);
      mockUseErrorRecovery.mockReturnValue({
        ...defaultMockReturn,
        recoveryState: {
          ...defaultMockReturn.recoveryState,
          strategy: 'manual_retry',
          recommendedActions: ['retry'],
        },
      });

      const mockOnRecoverySuccess = vi.fn();
      const error: ApiError = {
        code: NetworkErrorType.TIMEOUT,
        message: 'タイムアウト',
        retryable: true,
        timestamp: new Date(),
      };

      render(<ErrorRecoveryPanel error={error} onRecoverySuccess={mockOnRecoverySuccess} />);

      const retryButton = screen.getByText('再試行');
      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(mockExecuteRecoveryAction).toHaveBeenCalledWith('retry');
      });

      expect(mockOnRecoverySuccess).toHaveBeenCalled();
    });

    it('回復中はアクションボタンが無効になる', () => {
      mockUseErrorRecovery.mockReturnValue({
        ...defaultMockReturn,
        recoveryState: {
          ...defaultMockReturn.recoveryState,
          isRecovering: true,
          strategy: 'auto_retry',
          recommendedActions: ['retry'],
        },
      });

      const error: ApiError = {
        code: NetworkErrorType.TIMEOUT,
        message: 'タイムアウト',
        retryable: true,
        timestamp: new Date(),
      };

      render(<ErrorRecoveryPanel error={error} />);

      // 回復中はアクションボタンが表示されない
      expect(screen.queryByText('再試行')).not.toBeInTheDocument();
    });
  });

  describe('回復履歴', () => {
    it('回復試行回数を表示する', () => {
      const lastAttempt = new Date('2023-01-01T12:00:00Z');
      mockUseErrorRecovery.mockReturnValue({
        ...defaultMockReturn,
        recoveryState: {
          ...defaultMockReturn.recoveryState,
          recoveryAttempts: 2,
          lastRecoveryAttempt: lastAttempt,
        },
      });

      const error: ApiError = {
        code: NetworkErrorType.TIMEOUT,
        message: 'タイムアウト',
        retryable: true,
        timestamp: new Date(),
      };

      render(<ErrorRecoveryPanel error={error} />);

      expect(screen.getByText(/回復試行回数: 2/)).toBeInTheDocument();
      expect(screen.getByText(/最終試行:/)).toBeInTheDocument();
    });

    it('回復試行がない場合は履歴を表示しない', () => {
      const error: ApiError = {
        code: NetworkErrorType.TIMEOUT,
        message: 'タイムアウト',
        retryable: true,
        timestamp: new Date(),
      };

      render(<ErrorRecoveryPanel error={error} />);

      expect(screen.queryByText(/回復試行回数:/)).not.toBeInTheDocument();
    });
  });

  describe('閉じるボタン', () => {
    it('閉じるボタンが表示される', () => {
      const mockOnClose = vi.fn();
      const error: ApiError = {
        code: NetworkErrorType.TIMEOUT,
        message: 'タイムアウト',
        retryable: true,
        timestamp: new Date(),
      };

      render(<ErrorRecoveryPanel error={error} onClose={mockOnClose} />);

      const closeButton = screen.getByLabelText('エラーパネルを閉じる');
      expect(closeButton).toBeInTheDocument();
    });

    it('閉じるボタンをクリックするとコールバックが実行される', () => {
      const mockOnClose = vi.fn();
      const error: ApiError = {
        code: NetworkErrorType.TIMEOUT,
        message: 'タイムアウト',
        retryable: true,
        timestamp: new Date(),
      };

      render(<ErrorRecoveryPanel error={error} onClose={mockOnClose} />);

      const closeButton = screen.getByLabelText('エラーパネルを閉じる');
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('onCloseが提供されない場合は閉じるボタンが表示されない', () => {
      const error: ApiError = {
        code: NetworkErrorType.TIMEOUT,
        message: 'タイムアウト',
        retryable: true,
        timestamp: new Date(),
      };

      render(<ErrorRecoveryPanel error={error} />);

      expect(screen.queryByLabelText('エラーパネルを閉じる')).not.toBeInTheDocument();
    });
  });

  describe('自動回復', () => {
    it('エラーが変更されると自動回復が開始される', () => {
      const error: ApiError = {
        code: NetworkErrorType.TIMEOUT,
        message: 'タイムアウト',
        retryable: true,
        timestamp: new Date(),
      };

      const context = {
        retryFunction: vi.fn(),
        operation: 'form_submit',
      };

      render(<ErrorRecoveryPanel error={error} context={context} />);

      expect(mockStartRecovery).toHaveBeenCalledWith(error, context);
    });

    it('自動回復を無効にできる', () => {
      const error: ApiError = {
        code: NetworkErrorType.TIMEOUT,
        message: 'タイムアウト',
        retryable: true,
        timestamp: new Date(),
      };

      render(<ErrorRecoveryPanel error={error} enableAutoRecovery={false} />);

      // useErrorRecoveryが適切なオプションで呼ばれることを確認
      expect(mockUseErrorRecovery).toHaveBeenCalledWith(
        expect.objectContaining({
          enableAutoRecovery: false,
        })
      );
    });
  });

  describe('コールバック', () => {
    it('回復失敗時のコールバックが実行される', async () => {
      const mockError = new Error('回復失敗');
      mockExecuteRecoveryAction.mockRejectedValue(mockError);
      const mockOnRecoveryFailure = vi.fn();

      mockUseErrorRecovery.mockReturnValue({
        ...defaultMockReturn,
        recoveryState: {
          ...defaultMockReturn.recoveryState,
          strategy: 'manual_retry',
          recommendedActions: ['retry'],
        },
      });

      const error: ApiError = {
        code: NetworkErrorType.TIMEOUT,
        message: 'タイムアウト',
        retryable: true,
        timestamp: new Date(),
      };

      render(<ErrorRecoveryPanel error={error} onRecoveryFailure={mockOnRecoveryFailure} />);

      const retryButton = screen.getByText('再試行');
      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(mockOnRecoveryFailure).toHaveBeenCalledWith(mockError);
      });
    });
  });
});
