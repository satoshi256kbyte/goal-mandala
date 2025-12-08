import React from 'react';
import { render, cleanup, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ErrorAlert } from './ErrorAlert';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.clearAllTimers();
});

describe('ErrorAlert', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('エラーメッセージが表示される', () => {
    render(<ErrorAlert error="テストエラー" />);

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('テストエラー')).toBeInTheDocument();
  });

  it('messageプロパティが優先される', () => {
    render(<ErrorAlert error="エラー1" message="エラー2" />);

    expect(screen.getByText('エラー2')).toBeInTheDocument();
    expect(screen.queryByText('エラー1')).not.toBeInTheDocument();
  });

  it('エラーがない場合は何も表示されない', () => {
    const { container } = render(<ErrorAlert error={null} />);

    expect(container.firstChild).toBeNull();
  });

  it('タイトルが表示される', () => {
    render(<ErrorAlert error="テストエラー" title="エラータイトル" />);

    expect(screen.getByText('エラータイトル')).toBeInTheDocument();
  });

  it('閉じるボタンが機能する', () => {
    const onClose = vi.fn();
    render(<ErrorAlert error="テストエラー" onClose={onClose} />);

    const closeButton = screen.getByLabelText('エラーメッセージを閉じる');
    fireEvent.click(closeButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('再試行ボタンが表示され機能する', () => {
    const onRetry = vi.fn();
    render(<ErrorAlert error="テストエラー" isRetryable={true} onRetry={onRetry} />);

    const retryButton = screen.getByText('再試行');
    fireEvent.click(retryButton);

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('再試行中はローディング状態になる', () => {
    render(
      <ErrorAlert error="テストエラー" isRetryable={true} isRetrying={true} onRetry={vi.fn()} />
    );

    expect(screen.getByText('再試行中...')).toBeInTheDocument();
  });

  it('ネットワークエラーの場合は警告アイコンが表示される', () => {
    const { container } = render(<ErrorAlert error="ネットワークエラー" isNetworkError={true} />);

    const alert = container.querySelector('[role="alert"]');
    expect(alert).toHaveClass('bg-orange-50', 'border-orange-200');
  });

  it('通常エラーの場合はエラーアイコンが表示される', () => {
    const { container } = render(<ErrorAlert error="通常エラー" isNetworkError={false} />);

    const alert = container.querySelector('[role="alert"]');
    expect(alert).toHaveClass('bg-red-50', 'border-red-200');
  });

  it('カスタムクラス名が適用される', () => {
    const { container } = render(<ErrorAlert error="テストエラー" className="custom-class" />);

    const alert = container.querySelector('[role="alert"]');
    expect(alert).toHaveClass('custom-class');
  });

  it('閉じるボタンをクリックするとエラーが非表示になる', async () => {
    const onClose = vi.fn();
    render(<ErrorAlert error="テストエラー" onClose={onClose} />);

    const closeButton = screen.getByLabelText('エラーメッセージを閉じる');
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  it('アクセシビリティ属性が正しく設定される', () => {
    render(<ErrorAlert error="テストエラー" />);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveAttribute('aria-live', 'assertive');
  });
});
