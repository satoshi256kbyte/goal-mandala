import React from 'react';
import { render } from '@testing-library/react';
import { describe, it } from 'vitest';
import { ErrorMessage } from './ErrorMessage';

describe('ErrorMessage', () => {
  it('エラーメッセージが表示される', () => {
    const errorMessage = 'テストエラーメッセージ';
    render(<ErrorMessage error={errorMessage} />);

    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('エラーがない場合は何も表示されない', () => {
    const { container } = render(<ErrorMessage />);

    expect(container.firstChild).toBeNull();
  });

  it('エラーが空文字の場合は何も表示されない', () => {
    const { container } = render(<ErrorMessage error="" />);

    expect(container.firstChild).toBeNull();
  });

  it('適切なARIA属性が設定される', () => {
    const errorMessage = 'テストエラーメッセージ';
    render(<ErrorMessage error={errorMessage} />);

    const errorContainer = screen.getByRole('alert');
    expect(errorContainer).toHaveAttribute('role', 'alert');
    expect(errorContainer).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('カスタムクラス名が適用される', () => {
    const errorMessage = 'テストエラーメッセージ';
    const customClass = 'custom-error-class';
    render(<ErrorMessage error={errorMessage} className={customClass} />);

    const errorContainer = screen.getByRole('alert');
    expect(errorContainer).toHaveClass(customClass);
  });

  it('IDが設定される', () => {
    const errorMessage = 'テストエラーメッセージ';
    const customId = 'custom-error-id';
    render(<ErrorMessage error={errorMessage} id={customId} />);

    const errorContainer = screen.getByRole('alert');
    expect(errorContainer).toHaveAttribute('id', customId);
  });

  it('デフォルトのスタイルクラスが適用される', () => {
    const errorMessage = 'テストエラーメッセージ';
    render(<ErrorMessage error={errorMessage} />);

    const errorContainer = screen.getByRole('alert');
    expect(errorContainer).toHaveClass('text-sm', 'mt-1');
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });
});
