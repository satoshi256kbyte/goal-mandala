import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { FormField } from './FormField';

describe('FormField', () => {
  it('ラベルが正しく表示される', () => {
    render(
      <FormField label="テストラベル">
        <input type="text" />
      </FormField>
    );

    expect(screen.getByLabelText('テストラベル')).toBeInTheDocument();
  });

  it('必須マークが表示される', () => {
    render(
      <FormField label="必須フィールド" required>
        <input type="text" />
      </FormField>
    );

    expect(screen.getByText('*')).toBeInTheDocument();
    expect(screen.getByLabelText('必須')).toBeInTheDocument();
  });

  it('ヘルプテキストが表示される', () => {
    const helpText = 'これはヘルプテキストです';
    render(
      <FormField label="テストラベル" helpText={helpText}>
        <input type="text" />
      </FormField>
    );

    expect(screen.getByText(helpText)).toBeInTheDocument();
  });

  it('エラーメッセージが表示される', () => {
    const errorMessage = 'エラーが発生しました';
    render(
      <FormField label="テストラベル" error={errorMessage}>
        <input type="text" />
      </FormField>
    );

    expect(screen.getByText(errorMessage)).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('エラーがある場合はヘルプテキストが表示されない', () => {
    const helpText = 'ヘルプテキスト';
    const errorMessage = 'エラーメッセージ';

    render(
      <FormField label="テストラベル" helpText={helpText} error={errorMessage}>
        <input type="text" />
      </FormField>
    );

    expect(screen.getByText(errorMessage)).toBeInTheDocument();
    expect(screen.queryByText(helpText)).not.toBeInTheDocument();
  });

  it('子要素にaria属性が正しく設定される', () => {
    const errorMessage = 'エラーメッセージ';

    render(
      <FormField label="テストラベル" error={errorMessage}>
        <input type="text" data-testid="input" />
      </FormField>
    );

    const input = screen.getByTestId('input');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-describedby');
  });

  it('カスタムクラス名が適用される', () => {
    const { container } = render(
      <FormField label="テストラベル" className="custom-class">
        <input type="text" />
      </FormField>
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });
});
