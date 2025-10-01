import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { SubmitButton, MemoizedSubmitButton } from './SubmitButton';

describe('SubmitButton', () => {
  describe('基本表示', () => {
    it('デフォルトのボタンテキストが表示される', () => {
      render(<SubmitButton />);

      expect(
        screen.getByRole('button', { name: /フォームを送信してAI生成を開始/ })
      ).toBeInTheDocument();
      expect(screen.getByText('AI生成開始')).toBeInTheDocument();
    });

    it('カスタムテキストが表示される', () => {
      render(<SubmitButton>カスタム送信</SubmitButton>);

      expect(screen.getByText('カスタム送信')).toBeInTheDocument();
    });

    it('送信中の表示が正しく表示される', () => {
      render(<SubmitButton isSubmitting={true} />);

      expect(screen.getByText('AI生成中...')).toBeInTheDocument();
      expect(screen.getByRole('button')).toBeDisabled();
      expect(
        screen.getByText('AI生成処理を実行中です。しばらくお待ちください。')
      ).toBeInTheDocument();
    });
  });

  describe('ボタンの状態', () => {
    it('フォームが無効な場合はボタンが無効になる', () => {
      render(<SubmitButton isFormValid={false} />);

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(screen.getByText('必須項目をすべて入力してください。')).toBeInTheDocument();
    });

    it('disabledプロパティでボタンが無効になる', () => {
      render(<SubmitButton disabled={true} />);

      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('送信中はボタンが無効になる', () => {
      render(<SubmitButton isSubmitting={true} />);

      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('フォームが有効で送信中でない場合はボタンが有効になる', () => {
      render(<SubmitButton isFormValid={true} isSubmitting={false} />);

      expect(screen.getByRole('button')).not.toBeDisabled();
    });
  });

  describe('送信機能', () => {
    it('ボタンクリックで送信コールバックが呼ばれる', () => {
      const onSubmit = vi.fn();

      render(<SubmitButton onSubmit={onSubmit} isFormValid={true} type="button" />);

      fireEvent.click(screen.getByRole('button'));

      expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    it('無効状態ではクリックしても送信コールバックが呼ばれない', () => {
      const onSubmit = vi.fn();

      render(<SubmitButton onSubmit={onSubmit} isFormValid={false} type="button" />);

      fireEvent.click(screen.getByRole('button'));

      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('送信中はクリックしても送信コールバックが呼ばれない', () => {
      const onSubmit = vi.fn();

      render(<SubmitButton onSubmit={onSubmit} isSubmitting={true} type="button" />);

      fireEvent.click(screen.getByRole('button'));

      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('submitタイプの場合はクリックイベントハンドラーが設定されない', () => {
      const onSubmit = vi.fn();

      render(<SubmitButton onSubmit={onSubmit} type="submit" />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('type', 'submit');
    });
  });

  describe('スタイル', () => {
    it('サイズプロパティが正しく適用される', () => {
      const { rerender } = render(<SubmitButton size="sm" />);
      expect(screen.getByRole('button')).toHaveClass('px-3', 'py-1.5', 'text-sm');

      rerender(<SubmitButton size="lg" />);
      expect(screen.getByRole('button')).toHaveClass('px-6', 'py-3', 'text-base');
    });

    it('バリアントプロパティが正しく適用される', () => {
      const { rerender } = render(<SubmitButton variant="primary" />);
      expect(screen.getByRole('button')).toHaveClass('bg-blue-600', 'text-white');

      rerender(<SubmitButton variant="success" />);
      expect(screen.getByRole('button')).toHaveClass('bg-green-600', 'text-white');

      rerender(<SubmitButton variant="danger" />);
      expect(screen.getByRole('button')).toHaveClass('bg-red-600', 'text-white');
    });

    it('カスタムクラス名が適用される', () => {
      render(<SubmitButton className="custom-class" />);
      expect(screen.getByRole('button')).toHaveClass('custom-class');
    });
  });

  describe('アクセシビリティ', () => {
    it('適切なARIA属性が設定される', () => {
      render(<SubmitButton />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'フォームを送信してAI生成を開始');
    });

    it('送信中は適切なARIA属性が設定される', () => {
      render(<SubmitButton isSubmitting={true} />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-busy', 'true');
      expect(button).toHaveAttribute('aria-describedby', 'submit-status');
    });

    it('フォーム無効時は適切なARIA属性が設定される', () => {
      render(<SubmitButton isFormValid={false} />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-describedby', 'form-validation-error');
    });
  });

  describe('メモ化', () => {
    it('MemoizedSubmitButtonが正しく動作する', () => {
      render(<MemoizedSubmitButton />);

      expect(screen.getByRole('button')).toBeInTheDocument();
      expect(screen.getByText('AI生成開始')).toBeInTheDocument();
    });
  });
});
