import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { CharacterCounter } from './CharacterCounter';

describe('CharacterCounter', () => {
  it('文字数が表示される', () => {
    render(<CharacterCounter current={10} max={100} />);

    expect(screen.getByText('10/100')).toBeInTheDocument();
  });

  it('currentLengthとmaxLengthでも動作する', () => {
    render(<CharacterCounter currentLength={20} maxLength={200} />);

    expect(screen.getByText('20/200')).toBeInTheDocument();
  });

  it('通常状態では灰色で表示される', () => {
    const { container } = render(<CharacterCounter current={50} max={100} />);

    const counter = container.querySelector('[role="status"]');
    expect(counter).toHaveClass('text-gray-500');
  });

  it('80%を超えると警告色になる', () => {
    const { container } = render(<CharacterCounter current={85} max={100} />);

    const counter = container.querySelector('[role="status"]');
    expect(counter).toHaveClass('text-yellow-600');
  });

  it('100%を超えるとエラー色になる', () => {
    const { container } = render(<CharacterCounter current={105} max={100} />);

    const counter = container.querySelector('[role="status"]');
    expect(counter).toHaveClass('text-red-600');
  });

  it('カスタム警告しきい値が機能する', () => {
    const { container } = render(<CharacterCounter current={60} max={100} warningThreshold={50} />);

    const counter = container.querySelector('[role="status"]');
    expect(counter).toHaveClass('text-yellow-600');
  });

  it('カスタムエラーしきい値が機能する', () => {
    const { container } = render(<CharacterCounter current={90} max={100} errorThreshold={90} />);

    const counter = container.querySelector('[role="status"]');
    expect(counter).toHaveClass('text-red-600');
  });

  it('位置を指定できる - bottom-right', () => {
    const { container } = render(
      <CharacterCounter current={10} max={100} position="bottom-right" />
    );

    const counter = container.querySelector('[role="status"]');
    expect(counter).toHaveClass('bottom-2', 'right-2');
  });

  it('位置を指定できる - bottom-left', () => {
    const { container } = render(
      <CharacterCounter current={10} max={100} position="bottom-left" />
    );

    const counter = container.querySelector('[role="status"]');
    expect(counter).toHaveClass('bottom-2', 'left-2');
  });

  it('位置を指定できる - top-right', () => {
    const { container } = render(<CharacterCounter current={10} max={100} position="top-right" />);

    const counter = container.querySelector('[role="status"]');
    expect(counter).toHaveClass('top-2', 'right-2');
  });

  it('位置を指定できる - top-left', () => {
    const { container } = render(<CharacterCounter current={10} max={100} position="top-left" />);

    const counter = container.querySelector('[role="status"]');
    expect(counter).toHaveClass('top-2', 'left-2');
  });

  it('カスタムクラス名が適用される', () => {
    const { container } = render(
      <CharacterCounter current={10} max={100} className="custom-class" />
    );

    const counter = container.querySelector('[role="status"]');
    expect(counter).toHaveClass('custom-class');
  });

  it('アクセシビリティ属性が正しく設定される', () => {
    render(<CharacterCounter current={10} max={100} />);

    const counter = screen.getByRole('status');
    expect(counter).toHaveAttribute('aria-live', 'polite');
    expect(counter).toHaveAttribute('aria-label');
  });

  it('aria-labelに適切な状態が含まれる - 通常', () => {
    render(<CharacterCounter current={50} max={100} />);

    const counter = screen.getByRole('status');
    const ariaLabel = counter.getAttribute('aria-label');
    expect(ariaLabel).toContain('入力可能');
  });

  it('aria-labelに適切な状態が含まれる - 警告', () => {
    render(<CharacterCounter current={85} max={100} />);

    const counter = screen.getByRole('status');
    const ariaLabel = counter.getAttribute('aria-label');
    expect(ariaLabel).toContain('制限に近づいています');
  });

  it('aria-labelに適切な状態が含まれる - エラー', () => {
    render(<CharacterCounter current={105} max={100} />);

    const counter = screen.getByRole('status');
    const ariaLabel = counter.getAttribute('aria-label');
    expect(ariaLabel).toContain('制限を超過');
  });

  it('デフォルト値が正しく設定される', () => {
    render(<CharacterCounter />);

    expect(screen.getByText('0/0')).toBeInTheDocument();
  });
});
