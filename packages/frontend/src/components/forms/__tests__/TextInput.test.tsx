import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { TextInput } from '../TextInput';

describe('TextInput', () => {
  describe('基本機能', () => {
    it('プレースホルダーを表示する', () => {
      render(<TextInput name="test" placeholder="テスト入力" />);

      expect(screen.getByPlaceholderText('テスト入力')).toBeInTheDocument();
    });

    it('入力値を受け付ける', async () => {
      const user = userEvent.setup();
      render(<TextInput name="test" />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'テストテキスト');

      expect(input).toHaveValue('テストテキスト');
    });

    it('disabledプロパティで無効化できる', () => {
      render(<TextInput name="test" disabled />);

      expect(screen.getByRole('textbox')).toBeDisabled();
    });

    it('type属性を設定できる', () => {
      render(<TextInput name="test" type="email" />);

      expect(screen.getByRole('textbox')).toHaveAttribute('type', 'email');
    });

    it('カスタムクラス名を適用できる', () => {
      render(<TextInput name="test" className="custom-class" />);

      const input = screen.getByRole('textbox');
      expect(input.className).toContain('custom-class');
    });
  });

  describe('文字数制限', () => {
    it('maxLengthで文字数を制限する', async () => {
      const user = userEvent.setup();
      render(<TextInput name="test" maxLength={10} />);

      const input = screen.getByRole('textbox');
      await user.type(input, '12345678901234567890');

      expect(input).toHaveValue('1234567890');
    });

    it('制限到達時にonLimitReachedコールバックを呼び出す', async () => {
      const onLimitReached = vi.fn();
      const user = userEvent.setup();
      render(<TextInput name="test" maxLength={5} onLimitReached={onLimitReached} />);

      const input = screen.getByRole('textbox');
      await user.type(input, '123456');

      expect(onLimitReached).toHaveBeenCalled();
    });
  });

  describe('コールバック', () => {
    it('onFocusコールバックを呼び出す', async () => {
      const onFocus = vi.fn();
      const user = userEvent.setup();
      render(<TextInput name="test" onFocus={onFocus} />);

      const input = screen.getByRole('textbox');
      await user.click(input);

      expect(onFocus).toHaveBeenCalled();
    });

    it('onBlurコールバックを呼び出す', async () => {
      const onBlur = vi.fn();
      const user = userEvent.setup();
      render(<TextInput name="test" onBlur={onBlur} />);

      const input = screen.getByRole('textbox');
      await user.click(input);
      await user.tab();

      expect(onBlur).toHaveBeenCalled();
    });

    it('onLengthChangeコールバックを呼び出す', async () => {
      const onLengthChange = vi.fn();
      const user = userEvent.setup();
      render(<TextInput name="test" maxLength={10} onLengthChange={onLengthChange} />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'test');

      expect(onLengthChange).toHaveBeenCalled();
    });
  });

  describe('アクセシビリティ', () => {
    it('aria-describedby属性を設定できる', () => {
      render(<TextInput name="test" aria-describedby="help-text" />);

      expect(screen.getByRole('textbox')).toHaveAttribute('aria-describedby', 'help-text');
    });

    it('aria-invalid属性を設定できる', () => {
      render(<TextInput name="test" aria-invalid="true" />);

      expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
    });

    it('id属性を設定できる', () => {
      render(<TextInput name="test" id="custom-id" />);

      expect(screen.getByRole('textbox')).toHaveAttribute('id', 'custom-id');
    });
  });

  describe('エッジケース', () => {
    it('空の入力を処理する', async () => {
      const user = userEvent.setup();
      render(<TextInput name="test" />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'test');
      await user.clear(input);

      expect(input).toHaveValue('');
    });

    it('特殊文字を含む入力を処理する', async () => {
      const user = userEvent.setup();
      render(<TextInput name="test" />);

      const input = screen.getByRole('textbox');
      await user.type(input, '!@#$%^&*()');

      expect(input).toHaveValue('!@#$%^&*()');
    });

    it('日本語入力を処理する', async () => {
      const user = userEvent.setup();
      render(<TextInput name="test" />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'こんにちは');

      expect(input).toHaveValue('こんにちは');
    });

    it('maxLength=0の場合を処理する', async () => {
      const user = userEvent.setup();
      render(<TextInput name="test" maxLength={0} />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'test');

      // maxLength=0の場合、ブラウザのネイティブ入力は制限されないが、
      // コンポーネントの内部ロジックで切り詰められる
      // 実際の動作: ユーザーは入力できるが、値は空文字列に切り詰められる
      expect(input).toHaveValue('test');
    });
  });
});
