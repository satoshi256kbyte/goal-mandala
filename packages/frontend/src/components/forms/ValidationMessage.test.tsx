import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ValidationMessage } from './ValidationMessage';

describe('ValidationMessage', () => {
  it('メッセージがない場合は何も表示されない', () => {
    const { container } = render(<ValidationMessage />);
    expect(container.firstChild).toBeNull();
  });

  it('エラーメッセージが表示される', () => {
    const message = 'エラーが発生しました';
    render(<ValidationMessage message={message} type="error" />);

    expect(screen.getByText(message)).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('警告メッセージが表示される', () => {
    const message = '警告メッセージです';
    render(<ValidationMessage message={message} type="warning" />);

    expect(screen.getByText(message)).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('情報メッセージが表示される', () => {
    const message = '情報メッセージです';
    render(<ValidationMessage message={message} type="info" />);

    expect(screen.getByText(message)).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('成功メッセージが表示される', () => {
    const message = '成功しました';
    render(<ValidationMessage message={message} type="success" />);

    expect(screen.getByText(message)).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('デフォルトでエラータイプになる', () => {
    const message = 'デフォルトメッセージ';
    render(<ValidationMessage message={message} />);

    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('エラータイプの場合、適切なスタイルが適用される', () => {
    const message = 'エラーメッセージ';
    render(<ValidationMessage message={message} type="error" />);

    const messageElement = screen.getByRole('alert');
    expect(messageElement).toHaveClass('text-red-600', 'bg-red-50', 'border-red-200');
  });

  it('警告タイプの場合、適切なスタイルが適用される', () => {
    const message = '警告メッセージ';
    render(<ValidationMessage message={message} type="warning" />);

    const messageElement = screen.getByRole('status');
    expect(messageElement).toHaveClass('text-yellow-700', 'bg-yellow-50', 'border-yellow-200');
  });

  it('情報タイプの場合、適切なスタイルが適用される', () => {
    const message = '情報メッセージ';
    render(<ValidationMessage message={message} type="info" />);

    const messageElement = screen.getByRole('status');
    expect(messageElement).toHaveClass('text-blue-600', 'bg-blue-50', 'border-blue-200');
  });

  it('成功タイプの場合、適切なスタイルが適用される', () => {
    const message = '成功メッセージ';
    render(<ValidationMessage message={message} type="success" />);

    const messageElement = screen.getByRole('status');
    expect(messageElement).toHaveClass('text-green-600', 'bg-green-50', 'border-green-200');
  });

  it('カスタムIDが設定される', () => {
    const message = 'テストメッセージ';
    const customId = 'custom-validation-id';
    render(<ValidationMessage message={message} id={customId} />);

    const messageElement = screen.getByRole('alert');
    expect(messageElement).toHaveAttribute('id', customId);
  });

  it('カスタムクラス名が適用される', () => {
    const message = 'テストメッセージ';
    const customClass = 'custom-validation-class';
    render(<ValidationMessage message={message} className={customClass} />);

    const messageElement = screen.getByRole('alert');
    expect(messageElement).toHaveClass(customClass);
  });

  it('エラータイプの場合、適切なaria-live属性が設定される', () => {
    const message = 'エラーメッセージ';
    render(<ValidationMessage message={message} type="error" />);

    const messageElement = screen.getByRole('alert');
    expect(messageElement).toHaveAttribute('aria-live', 'assertive');
  });

  it('エラー以外のタイプの場合、適切なaria-live属性が設定される', () => {
    const message = '情報メッセージ';
    render(<ValidationMessage message={message} type="info" />);

    const messageElement = screen.getByRole('status');
    expect(messageElement).toHaveAttribute('aria-live', 'polite');
  });
});
