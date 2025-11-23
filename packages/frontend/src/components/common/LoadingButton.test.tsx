import React from 'react';
import { render, screen } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { LoadingButton } from './LoadingButton';

describe('LoadingButton', () => {
  it('通常状態でボタンが表示される', () => {
    render(<LoadingButton isLoading={false}>テストボタン</LoadingButton>);

    expect(screen.getByRole('button')).toBeInTheDocument();
    expect(screen.getByText('テストボタン')).toBeInTheDocument();
  });

  it('ローディング状態でスピナーが表示される', () => {
    render(<LoadingButton isLoading={true}>テストボタン</LoadingButton>);

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(button).toBeDisabled();

    // スピナーのSVGが存在することを確認
    const spinner = button.querySelector('svg');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveClass('animate-spin');
  });

  it('ローディング時にカスタムテキストが表示される', () => {
    render(
      <LoadingButton isLoading={true} loadingText="処理中...">
        テストボタン
      </LoadingButton>
    );

    expect(screen.getByText('処理中...')).toBeInTheDocument();
    expect(screen.queryByText('テストボタン')).not.toBeInTheDocument();
  });

  it('クリックイベントが正しく動作する', () => {
    const handleClick = vi.fn();
    render(
      <LoadingButton isLoading={false} onClick={handleClick}>
        テストボタン
      </LoadingButton>
    );

    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('ローディング中はクリックイベントが無効になる', () => {
    const handleClick = vi.fn();
    render(
      <LoadingButton isLoading={true} onClick={handleClick}>
        テストボタン
      </LoadingButton>
    );

    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('disabled状態でボタンが無効になる', () => {
    const handleClick = vi.fn();
    render(
      <LoadingButton isLoading={false} disabled={true} onClick={handleClick}>
        テストボタン
      </LoadingButton>
    );

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();

    fireEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('primaryバリアントのスタイルが適用される', () => {
    render(
      <LoadingButton isLoading={false} variant="primary">
        テストボタン
      </LoadingButton>
    );

    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-blue-600');
  });

  it('secondaryバリアントのスタイルが適用される', () => {
    render(
      <LoadingButton isLoading={false} variant="secondary">
        テストボタン
      </LoadingButton>
    );

    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-white');
  });

  it('dangerバリアントのスタイルが適用される', () => {
    render(
      <LoadingButton isLoading={false} variant="danger">
        テストボタン
      </LoadingButton>
    );

    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-red-600');
  });

  it('サイズバリアントが正しく適用される', () => {
    const { rerender } = render(
      <LoadingButton isLoading={false} size="sm">
        テストボタン
      </LoadingButton>
    );

    expect(screen.getByRole('button')).toHaveClass('px-3', 'py-2', 'text-sm');

    rerender(
      <LoadingButton isLoading={false} size="md">
        テストボタン
      </LoadingButton>
    );

    expect(screen.getByRole('button')).toHaveClass('px-4', 'py-2', 'text-base');

    rerender(
      <LoadingButton isLoading={false} size="lg">
        テストボタン
      </LoadingButton>
    );

    expect(screen.getByRole('button')).toHaveClass('px-6', 'py-3', 'text-lg');
  });

  it('カスタムクラス名が適用される', () => {
    const customClass = 'custom-button-class';
    render(
      <LoadingButton isLoading={false} className={customClass}>
        テストボタン
      </LoadingButton>
    );

    expect(screen.getByRole('button')).toHaveClass(customClass);
  });

  it('submitタイプが正しく設定される', () => {
    render(
      <LoadingButton isLoading={false} type="submit">
        送信
      </LoadingButton>
    );

    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
  });

  it('アクセシビリティ属性が正しく設定される', () => {
    render(<LoadingButton isLoading={true}>テストボタン</LoadingButton>);

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-busy', 'true');

    // スクリーンリーダー用のテキストが存在することを確認
    expect(screen.getByText('処理中です。しばらくお待ちください。')).toBeInTheDocument();
  });
});
