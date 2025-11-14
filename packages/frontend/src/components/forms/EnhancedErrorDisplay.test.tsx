import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { EnhancedErrorDisplay, FieldErrorDisplay } from './EnhancedErrorDisplay';
import { ApiError, NetworkErrorType } from '../../services/api';

describe('EnhancedErrorDisplay', () => {
  const mockOnFieldFocus = vi.fn();
  const mockOnRetry = vi.fn();
  const mockOnErrorHide = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('基本表示', () => {
    it('エラーがない場合は何も表示しない', () => {
      render(<EnhancedErrorDisplay />);
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('フィールドエラーを表示する', () => {
      const fieldErrors = {
        title: '目標タイトルは必須です',
        description: '目標説明は必須です',
      };

      render(<EnhancedErrorDisplay fieldErrors={fieldErrors} />);

      expect(screen.getByText('目標タイトルは必須です')).toBeInTheDocument();
      expect(screen.getByText('目標説明は必須です')).toBeInTheDocument();
    });

    it('複数のエラーメッセージを配列で表示する', () => {
      const fieldErrors = {
        title: ['目標タイトルは必須です', '目標タイトルは100文字以内で入力してください'],
      };

      render(<EnhancedErrorDisplay fieldErrors={fieldErrors} />);

      expect(screen.getByText('目標タイトルは必須です')).toBeInTheDocument();
      expect(screen.getByText('目標タイトルは100文字以内で入力してください')).toBeInTheDocument();
    });

    it('ネットワークエラーを表示する', () => {
      const networkError: ApiError = {
        code: NetworkErrorType.CONNECTION_ERROR,
        message: 'ネットワークエラー',
        retryable: true,
        timestamp: new Date(),
      };

      render(<EnhancedErrorDisplay networkError={networkError} />);

      expect(screen.getByText(/ネットワークに接続できません/)).toBeInTheDocument();
    });

    it('一般エラーを表示する', () => {
      render(<EnhancedErrorDisplay generalError="一般的なエラーです" />);

      expect(screen.getByText('一般的なエラーです')).toBeInTheDocument();
    });
  });

  describe('詳細表示', () => {
    it('詳細表示モードでフィールドラベルを含める', () => {
      const fieldErrors = { title: '必須です' };

      render(<EnhancedErrorDisplay fieldErrors={fieldErrors} showDetails />);

      expect(screen.getByText('目標タイトル: 必須です')).toBeInTheDocument();
    });

    it('ネットワークエラーの詳細情報を表示する', () => {
      const networkError: ApiError = {
        code: NetworkErrorType.TIMEOUT,
        message: 'タイムアウト',
        retryable: true,
        timestamp: new Date(),
        status: 408,
      };

      render(<EnhancedErrorDisplay networkError={networkError} showDetails />);

      // 詳細情報のトグルをクリック
      const detailsToggle = screen.getByText('詳細情報');
      fireEvent.click(detailsToggle);

      expect(screen.getByText(/エラーコード:/)).toBeInTheDocument();
      expect(screen.getByText(/HTTPステータス: 408/)).toBeInTheDocument();
    });
  });

  describe('インタラクション', () => {
    it('エラーを個別に非表示にできる', () => {
      const fieldErrors = { title: '必須です' };

      render(<EnhancedErrorDisplay fieldErrors={fieldErrors} />);

      const dismissButton = screen.getByLabelText('目標タイトルのエラーを非表示');
      fireEvent.click(dismissButton);

      expect(screen.queryByText('必須です')).not.toBeInTheDocument();
    });

    it('フィールドフォーカスボタンが機能する', () => {
      const fieldErrors = { title: '必須です' };

      render(<EnhancedErrorDisplay fieldErrors={fieldErrors} onFieldFocus={mockOnFieldFocus} />);

      const focusButton = screen.getByText('目標タイトルに移動');
      fireEvent.click(focusButton);

      expect(mockOnFieldFocus).toHaveBeenCalledWith('title');
    });

    it('再試行ボタンが機能する', () => {
      const networkError: ApiError = {
        code: NetworkErrorType.TIMEOUT,
        message: 'タイムアウト',
        retryable: true,
        timestamp: new Date(),
      };

      render(<EnhancedErrorDisplay networkError={networkError} onRetry={mockOnRetry} />);

      const retryButton = screen.getByText('再試行');
      fireEvent.click(retryButton);

      expect(mockOnRetry).toHaveBeenCalled();
    });
  });

  describe('表示モード', () => {
    it('サマリーモードで表示する', () => {
      const fieldErrors = { title: '必須です' };

      render(<EnhancedErrorDisplay fieldErrors={fieldErrors} mode="summary" />);

      expect(screen.getByText(/件のエラーがあります/)).toBeInTheDocument();
    });

    it('トーストモードで表示する', () => {
      const fieldErrors = { title: '必須です' };

      render(
        <EnhancedErrorDisplay fieldErrors={fieldErrors} mode="toast" className="test-toast" />
      );

      const toastElement = screen.getByRole('alert');
      expect(toastElement).toHaveClass('fixed', 'top-4', 'right-4');
    });

    it('モーダルモードで表示する', () => {
      const fieldErrors = { title: '必須です' };

      render(<EnhancedErrorDisplay fieldErrors={fieldErrors} mode="modal" />);

      expect(screen.getByText('エラーが発生しました')).toBeInTheDocument();
      expect(screen.getByText('閉じる')).toBeInTheDocument();
    });

    it('モーダルの閉じるボタンが機能する', () => {
      const fieldErrors = { title: '必須です' };

      render(<EnhancedErrorDisplay fieldErrors={fieldErrors} mode="modal" />);

      const closeButton = screen.getByText('閉じる');
      fireEvent.click(closeButton);

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  describe('自動非表示', () => {
    it('指定時間後に自動で非表示になる', async () => {
      render(
        <EnhancedErrorDisplay
          generalError="テストエラー"
          autoHideMs={1000}
          onErrorHide={mockOnErrorHide}
        />
      );

      expect(screen.getByText('テストエラー')).toBeInTheDocument();

      // 1秒経過
      vi.advanceTimersByTime(1000);

      await waitFor(() => {
        expect(screen.queryByText('テストエラー')).not.toBeInTheDocument();
      });

      expect(mockOnErrorHide).toHaveBeenCalled();
    });
  });

  describe('アクセシビリティ', () => {
    it('適切なARIA属性が設定される', () => {
      const fieldErrors = { title: '必須です' };

      render(<EnhancedErrorDisplay fieldErrors={fieldErrors} />);

      const alertElement = screen.getByRole('alert');
      expect(alertElement).toHaveAttribute('aria-live', 'assertive');
    });

    it('カスタムエラーサマリーIDが設定される', () => {
      const fieldErrors = { title: '必須です' };

      render(
        <EnhancedErrorDisplay
          fieldErrors={fieldErrors}
          accessibility={{ errorSummaryId: 'custom-error-summary' }}
        />
      );

      expect(screen.getByRole('alert')).toHaveAttribute('id', 'custom-error-summary');
    });
  });

  describe('エラーの重要度判定', () => {
    it('オフラインエラーは高重要度として扱われる', () => {
      const networkError: ApiError = {
        code: NetworkErrorType.OFFLINE,
        message: 'オフライン',
        retryable: true,
        timestamp: new Date(),
      };

      render(<EnhancedErrorDisplay networkError={networkError} showDetails />);

      const detailsToggle = screen.getByText('詳細情報');
      fireEvent.click(detailsToggle);

      expect(screen.getByText(/重要度: high/)).toBeInTheDocument();
    });
  });
});

describe('FieldErrorDisplay', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('単一エラーメッセージを表示する', () => {
    render(<FieldErrorDisplay error="必須項目です" fieldName="title" />);

    expect(screen.getByText('必須項目です')).toBeInTheDocument();
  });

  it('複数エラーメッセージを表示する', () => {
    render(
      <FieldErrorDisplay
        error={['必須項目です', '100文字以内で入力してください']}
        fieldName="title"
      />
    );

    expect(screen.getByText('必須項目です')).toBeInTheDocument();
    expect(screen.getByText('100文字以内で入力してください')).toBeInTheDocument();
  });

  it('エラーがない場合は何も表示しない', () => {
    render(<FieldErrorDisplay fieldName="title" />);

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('自動非表示が機能する', async () => {
    render(<FieldErrorDisplay error="テストエラー" fieldName="title" autoHideMs={1000} />);

    expect(screen.getByText('テストエラー')).toBeInTheDocument();

    vi.advanceTimersByTime(1000);

    await waitFor(() => {
      expect(screen.queryByText('テストエラー')).not.toBeInTheDocument();
    });
  });

  it('アイコン表示を無効にできる', () => {
    render(<FieldErrorDisplay error="テストエラー" fieldName="title" showIcon={false} />);

    const errorElement = screen.getByText('テストエラー').closest('div');
    expect(errorElement).not.toHaveClass('pl-0');
  });
});
