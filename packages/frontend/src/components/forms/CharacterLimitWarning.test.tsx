import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { CharacterLimitWarning } from './CharacterLimitWarning';

describe('CharacterLimitWarning', () => {
  it('80%未満では何も表示されない', () => {
    const { container } = render(<CharacterLimitWarning currentLength={50} maxLength={100} />);

    expect(container.firstChild).toBeNull();
  });

  it('80%以上で警告が表示される', () => {
    render(<CharacterLimitWarning currentLength={85} maxLength={100} />);

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('残り15文字です')).toBeInTheDocument();
  });

  it('100%以上でエラーが表示される', () => {
    render(<CharacterLimitWarning currentLength={105} maxLength={100} />);

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('文字数制限を超えています（5文字超過）')).toBeInTheDocument();
  });

  it('カスタム警告しきい値が機能する', () => {
    render(<CharacterLimitWarning currentLength={60} maxLength={100} warningThreshold={50} />);

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('残り40文字です')).toBeInTheDocument();
  });

  it('カスタム警告メッセージが表示される', () => {
    render(
      <CharacterLimitWarning currentLength={85} maxLength={100} warningMessage="もうすぐ上限です" />
    );

    expect(screen.getByText('もうすぐ上限です')).toBeInTheDocument();
  });

  it('カスタムエラーメッセージが表示される', () => {
    render(
      <CharacterLimitWarning
        currentLength={105}
        maxLength={100}
        errorMessage="文字数が多すぎます"
      />
    );

    expect(screen.getByText('文字数が多すぎます')).toBeInTheDocument();
  });

  it('警告状態で警告アイコンが表示される', () => {
    const { container } = render(<CharacterLimitWarning currentLength={85} maxLength={100} />);

    const icon = container.querySelector('svg');
    expect(icon).toBeInTheDocument();
  });

  it('エラー状態でエラーアイコンが表示される', () => {
    const { container } = render(<CharacterLimitWarning currentLength={105} maxLength={100} />);

    const icon = container.querySelector('svg');
    expect(icon).toBeInTheDocument();
  });

  it('inline位置でスタイルが適用される', () => {
    const { container } = render(
      <CharacterLimitWarning currentLength={85} maxLength={100} position="inline" />
    );

    const alert = container.querySelector('[role="alert"]');
    expect(alert).toHaveClass('text-yellow-600');
  });

  it('tooltip位置でスタイルが適用される', () => {
    const { container } = render(
      <CharacterLimitWarning currentLength={85} maxLength={100} position="tooltip" />
    );

    const alert = container.querySelector('[role="alert"]');
    expect(alert).toHaveClass('absolute', 'z-10', 'bg-yellow-50');
  });

  it('カスタムクラス名が適用される', () => {
    const { container } = render(
      <CharacterLimitWarning currentLength={85} maxLength={100} className="custom-class" />
    );

    const alert = container.querySelector('[role="alert"]');
    expect(alert).toHaveClass('custom-class');
  });

  it('アクセシビリティ属性が正しく設定される - 警告', () => {
    render(<CharacterLimitWarning currentLength={85} maxLength={100} />);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveAttribute('aria-live', 'polite');
    expect(alert).toHaveAttribute('aria-label');
    expect(alert.getAttribute('aria-label')).toContain('警告');
  });

  it('アクセシビリティ属性が正しく設定される - エラー', () => {
    render(<CharacterLimitWarning currentLength={105} maxLength={100} />);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveAttribute('aria-live', 'polite');
    expect(alert).toHaveAttribute('aria-label');
    expect(alert.getAttribute('aria-label')).toContain('エラー');
  });

  it('maxLengthが0の場合は何も表示されない', () => {
    const { container } = render(<CharacterLimitWarning currentLength={10} maxLength={0} />);

    expect(container.firstChild).toBeNull();
  });
});
