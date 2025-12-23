import React from 'react';
import { render, cleanup, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SuccessMessage } from './SuccessMessage';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.clearAllTimers();
});

describe('SuccessMessage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('成功メッセージが表示される', () => {
    render(<SuccessMessage message="保存しました" />);

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('保存しました')).toBeInTheDocument();
  });

  it('メッセージがない場合は何も表示されない', () => {
    const { container } = render(<SuccessMessage message={null} />);

    expect(container.firstChild).toBeNull();
  });

  it('アイコンが表示される', () => {
    const { container } = render(<SuccessMessage message="成功" showIcon={true} />);

    const icon = container.querySelector('svg');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveClass('text-green-400');
  });

  it('アイコンを非表示にできる', () => {
    const { container } = render(<SuccessMessage message="成功" showIcon={false} />);

    const icon = container.querySelector('svg.text-green-400');
    expect(icon).not.toBeInTheDocument();
  });

  it('閉じるボタンが機能する', () => {
    const onClose = vi.fn();
    render(<SuccessMessage message="成功" onClose={onClose} />);

    const closeButton = screen.getByLabelText('成功メッセージを閉じる');
    fireEvent.click(closeButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('閉じるボタンをクリックするとメッセージが非表示になる', async () => {
    const onClose = vi.fn();
    render(<SuccessMessage message="成功" onClose={onClose} />);

    const closeButton = screen.getByLabelText('成功メッセージを閉じる');
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });
  });

  it('カスタムクラス名が適用される', () => {
    const { container } = render(<SuccessMessage message="成功" className="custom-class" />);

    const status = container.querySelector('[role="status"]');
    expect(status).toHaveClass('custom-class');
  });

  it('カスタムIDが設定される', () => {
    render(<SuccessMessage message="成功" id="custom-id" />);

    expect(screen.getByRole('status')).toHaveAttribute('id', 'custom-id');
  });

  it('アクセシビリティ属性が正しく設定される', () => {
    render(<SuccessMessage message="成功" />);

    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
  });

  it('メッセージが変更されると表示状態がリセットされる', async () => {
    const { rerender } = render(<SuccessMessage message="メッセージ1" />);

    expect(screen.getByText('メッセージ1')).toBeInTheDocument();

    rerender(<SuccessMessage message="メッセージ2" />);

    await waitFor(() => {
      expect(screen.getByText('メッセージ2')).toBeInTheDocument();
      expect(screen.queryByText('メッセージ1')).not.toBeInTheDocument();
    });
  });
});
