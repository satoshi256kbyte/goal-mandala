import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ErrorDisplay, InlineError, ErrorSummary } from './ErrorDisplay';
import { SubmissionErrorType } from '../../hooks/useFormSubmission';

// タイマーをモック化
jest.useFakeTimers();

describe('ErrorDisplay', () => {
  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('基本的な表示機能', () => {
    it('バリデーションエラーが正常に表示される', () => {
      const validationErrors = {
        title: '目標タイトルは必須です',
        description: '目標説明は必須です',
      };

      render(<ErrorDisplay validationErrors={validationErrors} />);

      expect(screen.getByText('目標タイトルは必須です')).toBeInTheDocument();
      expect(screen.getByText('目標説明は必須です')).toBeInTheDocument();
    });

    it('送信エラーが正常に表示される', () => {
      const submissionError = {
        type: SubmissionErrorType.NETWORK_ERROR,
        message: 'ネットワークエラーが発生しました',
      };

      render(<ErrorDisplay submissionError={submissionError} />);

      expect(screen.getByText('ネットワークエラーが発生しました')).toBeInTheDocument();
    });

    it('エラーがない場合は何も表示されない', () => {
      const { container } = render(<ErrorDisplay />);
      expect(container.firstChild).toBeNull();
    });

    it('複数のバリデーションエラーが表示される', () => {
      const validationErrors = {
        title: 'タイトルエラー',
        description: '説明エラー',
        deadline: '期限エラー',
      };

      render(<ErrorDisplay validationErrors={validationErrors} />);

      expect(screen.getByText('タイトルエラー')).toBeInTheDocument();
      expect(screen.getByText('説明エラー')).toBeInTheDocument();
      expect(screen.getByText('期限エラー')).toBeInTheDocument();
    });
  });

  describe('エラー数制限機能', () => {
    it('最大エラー数を超えた場合に制限される', () => {
      const validationErrors = {
        title: 'エラー1',
        description: 'エラー2',
        deadline: 'エラー3',
        background: 'エラー4',
        constraints: 'エラー5',
        extra: 'エラー6',
      };

      render(<ErrorDisplay validationErrors={validationErrors} maxErrors={3} />);

      expect(screen.getByText('エラー1')).toBeInTheDocument();
      expect(screen.getByText('エラー2')).toBeInTheDocument();
      expect(screen.getByText('エラー3')).toBeInTheDocument();
      expect(screen.queryByText('エラー4')).not.toBeInTheDocument();
      expect(screen.getByText('他に 3 件のエラーがあります')).toBeInTheDocument();
    });

    it('エラー数が制限以下の場合は全て表示される', () => {
      const validationErrors = {
        title: 'エラー1',
        description: 'エラー2',
      };

      render(<ErrorDisplay validationErrors={validationErrors} maxErrors={5} />);

      expect(screen.getByText('エラー1')).toBeInTheDocument();
      expect(screen.getByText('エラー2')).toBeInTheDocument();
      expect(screen.queryByText(/他に.*件のエラー/)).not.toBeInTheDocument();
    });
  });

  describe('詳細表示機能', () => {
    it('詳細表示が有効な場合にフィールド名が表示される', () => {
      const validationErrors = {
        title: 'タイトルエラー',
      };

      render(<ErrorDisplay validationErrors={validationErrors} showDetails={true} />);

      expect(screen.getByText('目標タイトル: タイトルエラー')).toBeInTheDocument();
    });

    it('送信エラーの詳細情報が表示される', () => {
      const submissionError = {
        type: SubmissionErrorType.VALIDATION_ERROR,
        message: 'バリデーションエラー',
        details: {
          title: 'タイトルが無効です',
          description: '説明が無効です',
        },
      };

      render(<ErrorDisplay submissionError={submissionError} showDetails={true} />);

      expect(screen.getByText('フォームの入力内容に問題があります')).toBeInTheDocument();
      expect(screen.getByText('目標タイトル: タイトルが無効です')).toBeInTheDocument();
      expect(screen.getByText('目標説明: 説明が無効です')).toBeInTheDocument();
    });
  });

  describe('自動非表示機能', () => {
    it('指定時間後に自動で非表示になる', async () => {
      const onErrorHide = jest.fn();
      const validationErrors = {
        title: 'エラーメッセージ',
      };

      render(
        <ErrorDisplay
          validationErrors={validationErrors}
          autoHideMs={3000}
          onErrorHide={onErrorHide}
        />
      );

      expect(screen.getByText('エラーメッセージ')).toBeInTheDocument();

      // 時間を進める
      jest.advanceTimersByTime(3000);

      await waitFor(() => {
        expect(screen.queryByText('エラーメッセージ')).not.toBeInTheDocument();
      });

      expect(onErrorHide).toHaveBeenCalledTimes(1);
    });

    it('エラーが変更されると表示状態がリセットされる', () => {
      const { rerender } = render(
        <ErrorDisplay validationErrors={{ title: 'エラー1' }} autoHideMs={3000} />
      );

      expect(screen.getByText('エラー1')).toBeInTheDocument();

      // 時間を少し進める
      jest.advanceTimersByTime(1000);

      // エラーを変更
      rerender(<ErrorDisplay validationErrors={{ title: 'エラー2' }} autoHideMs={3000} />);

      expect(screen.getByText('エラー2')).toBeInTheDocument();

      // 残りの時間を進めても表示されたまま
      jest.advanceTimersByTime(2000);
      expect(screen.getByText('エラー2')).toBeInTheDocument();
    });
  });

  describe('エラーヒント機能', () => {
    it('ネットワークエラーのヒントが表示される', () => {
      const submissionError = {
        type: SubmissionErrorType.NETWORK_ERROR,
        message: 'ネットワークエラー',
      };

      render(<ErrorDisplay submissionError={submissionError} />);

      expect(
        screen.getByText('インターネット接続を確認して、再度お試しください。')
      ).toBeInTheDocument();
    });

    it('サーバーエラーのヒントが表示される', () => {
      const submissionError = {
        type: SubmissionErrorType.SERVER_ERROR,
        message: 'サーバーエラー',
      };

      render(<ErrorDisplay submissionError={submissionError} />);

      expect(screen.getByText('しばらく時間をおいて再度お試しください。')).toBeInTheDocument();
    });

    it('バリデーションエラーのヒントが表示される', () => {
      const submissionError = {
        type: SubmissionErrorType.VALIDATION_ERROR,
        message: 'バリデーションエラー',
      };

      render(<ErrorDisplay submissionError={submissionError} />);

      expect(
        screen.getByText('入力内容を確認して、必須項目を入力してください。')
      ).toBeInTheDocument();
    });
  });

  describe('アクセシビリティ', () => {
    it('適切なARIA属性が設定される', () => {
      const validationErrors = {
        title: 'エラーメッセージ',
      };

      render(<ErrorDisplay validationErrors={validationErrors} />);

      const errorContainer = screen.getByRole('alert');
      expect(errorContainer).toHaveAttribute('aria-live', 'assertive');
    });

    it('各エラーメッセージに適切なIDが設定される', () => {
      const validationErrors = {
        title: 'タイトルエラー',
      };

      render(<ErrorDisplay validationErrors={validationErrors} />);

      expect(document.getElementById('validation-error-title')).toBeInTheDocument();
    });
  });
});

describe('InlineError', () => {
  it('エラーメッセージが表示される', () => {
    render(<InlineError error="エラーメッセージ" fieldName="title" />);

    expect(screen.getByText('エラーメッセージ')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('エラーがない場合は何も表示されない', () => {
    const { container } = render(<InlineError fieldName="title" />);
    expect(container.firstChild).toBeNull();
  });

  it('フィールド名に基づいたIDが設定される', () => {
    render(<InlineError error="エラー" fieldName="title" />);

    expect(document.getElementById('title-error')).toBeInTheDocument();
  });

  it('適切なARIA属性が設定される', () => {
    render(<InlineError error="エラー" fieldName="title" />);

    const errorElement = screen.getByRole('alert');
    expect(errorElement).toHaveAttribute('aria-live', 'polite');
  });
});

describe('ErrorSummary', () => {
  it('エラーサマリーが表示される', () => {
    const validationErrors = {
      title: 'タイトルエラー',
      description: '説明エラー',
    };

    render(<ErrorSummary validationErrors={validationErrors} />);

    expect(screen.getByText('2 件のエラーがあります')).toBeInTheDocument();
    expect(screen.getByText('目標タイトル: タイトルエラー')).toBeInTheDocument();
    expect(screen.getByText('目標説明: 説明エラー')).toBeInTheDocument();
  });

  it('送信エラーも含めてカウントされる', () => {
    const validationErrors = {
      title: 'タイトルエラー',
    };
    const submissionError = {
      type: SubmissionErrorType.NETWORK_ERROR,
      message: 'ネットワークエラー',
    };

    render(<ErrorSummary validationErrors={validationErrors} submissionError={submissionError} />);

    expect(screen.getByText('2 件のエラーがあります')).toBeInTheDocument();
  });

  it('フィールドフォーカス機能が動作する', () => {
    const onFieldFocus = jest.fn();
    const validationErrors = {
      title: 'タイトルエラー',
    };

    render(<ErrorSummary validationErrors={validationErrors} onFieldFocus={onFieldFocus} />);

    const fieldButton = screen.getByRole('button', { name: /目標タイトル: タイトルエラー/ });
    fireEvent.click(fieldButton);

    expect(onFieldFocus).toHaveBeenCalledWith('title');
  });

  it('エラーがない場合は何も表示されない', () => {
    const { container } = render(<ErrorSummary />);
    expect(container.firstChild).toBeNull();
  });

  it('適切なARIA属性が設定される', () => {
    const validationErrors = {
      title: 'エラー',
    };

    render(<ErrorSummary validationErrors={validationErrors} />);

    const summaryElement = screen.getByRole('alert');
    expect(summaryElement).toHaveAttribute('aria-labelledby', 'error-summary-title');
  });
});
