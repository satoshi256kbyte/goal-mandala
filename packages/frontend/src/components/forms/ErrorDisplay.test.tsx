import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi, beforeEach, afterEach } from 'vitest';
import { ErrorDisplay, InlineError, ErrorSummary } from './ErrorDisplay';
import { FormErrorSeverity, FormErrorType } from '../../types/form-error';

describe('ErrorDisplay', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  describe('基本的な表示機能', () => {
    it('errorsプロパティでエラーが表示される', () => {
      const errors = {
        title: 'タイトルエラー',
        description: '説明エラー',
      };

      render(<ErrorDisplay errors={errors} />);

      expect(screen.getByText('• タイトルエラー')).toBeInTheDocument();
      expect(screen.getByText('• 説明エラー')).toBeInTheDocument();
    });

    it('FormErrorオブジェクトでエラーが表示される', () => {
      const error = {
        message: 'フォームエラーが発生しました',
        severity: FormErrorSeverity.MEDIUM,
        type: FormErrorType.VALIDATION_ERROR,
        field: 'title',
        code: 'VALIDATION_ERROR',
        retryable: false,
        timestamp: new Date(),
      };

      render(<ErrorDisplay error={error} />);

      expect(screen.getByText('フォームエラーが発生しました')).toBeInTheDocument();
    });

    it('エラーがない場合は何も表示されない', () => {
      const { container } = render(<ErrorDisplay />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('アクセシビリティ', () => {
    it('適切なARIA属性が設定される', () => {
      const errors = {
        title: 'タイトルエラー',
      };

      render(<ErrorDisplay errors={errors} />);

      const errorContainer = screen.getByRole('alert');
      expect(errorContainer).toHaveAttribute('aria-live', 'polite');
      expect(errorContainer).toHaveAttribute('aria-atomic', 'true');
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
    const errors = [
      {
        message: 'タイトルエラー',
        severity: FormErrorSeverity.HIGH,
        type: FormErrorType.VALIDATION_ERROR,
        field: 'title',
        code: 'VALIDATION_ERROR',
        retryable: false,
        timestamp: new Date(),
      },
      {
        message: '説明エラー',
        severity: FormErrorSeverity.HIGH,
        type: FormErrorType.VALIDATION_ERROR,
        field: 'description',
        code: 'VALIDATION_ERROR',
        retryable: false,
        timestamp: new Date(),
      },
    ];

    render(<ErrorSummary errors={errors} />);

    expect(screen.getByText('エラーが発生しました (2件)')).toBeInTheDocument();
    // より柔軟なマッチャーを使用
    expect(
      screen.getByText((content, element) => {
        return element?.textContent === 'title: ';
      })
    ).toBeInTheDocument();
    expect(screen.getByText('タイトルエラー')).toBeInTheDocument();
    expect(
      screen.getByText((content, element) => {
        return element?.textContent === 'description: ';
      })
    ).toBeInTheDocument();
    expect(screen.getByText('説明エラー')).toBeInTheDocument();
  });

  it('エラーがない場合は何も表示されない', () => {
    const { container } = render(<ErrorSummary />);
    expect(container.firstChild).toBeNull();
  });
});
