import React from 'react';
import { render } from '@testing-library/react';
import { CharacterCounter } from './CharacterCounter';

describe('CharacterCounter', () => {
  describe('基本表示', () => {
    it('文字数カウンターが正しく表示される', () => {
      render(<CharacterCounter currentLength={50} maxLength={100} />);

      expect(screen.getByText('50/100')).toBeInTheDocument();
    });

    it('aria-labelが正しく設定される', () => {
      render(<CharacterCounter currentLength={50} maxLength={100} />);

      const counter = screen.getByRole('status');
      expect(counter).toHaveAttribute('aria-label', '文字数: 50文字 / 100文字 (入力可能)');
    });

    it('aria-liveが設定される', () => {
      render(<CharacterCounter currentLength={50} maxLength={100} />);

      const counter = screen.getByRole('status');
      expect(counter).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('色の変更', () => {
    it('通常時は灰色で表示される', () => {
      render(<CharacterCounter currentLength={50} maxLength={100} />);

      const counter = screen.getByRole('status');
      expect(counter).toHaveClass('text-gray-500');
    });

    it('80%を超えると警告色（黄色）で表示される', () => {
      render(<CharacterCounter currentLength={81} maxLength={100} />);

      const counter = screen.getByRole('status');
      expect(counter).toHaveClass('text-yellow-600');
    });

    it('100%を超えるとエラー色（赤色）で表示される', () => {
      render(<CharacterCounter currentLength={101} maxLength={100} />);

      const counter = screen.getByRole('status');
      expect(counter).toHaveClass('text-red-600');
    });

    it('カスタム警告しきい値が適用される', () => {
      render(<CharacterCounter currentLength={71} maxLength={100} warningThreshold={70} />);

      const counter = screen.getByRole('status');
      expect(counter).toHaveClass('text-yellow-600');
    });

    it('カスタムエラーしきい値が適用される', () => {
      render(<CharacterCounter currentLength={91} maxLength={100} errorThreshold={90} />);

      const counter = screen.getByRole('status');
      expect(counter).toHaveClass('text-red-600');
    });
  });

  describe('位置設定', () => {
    it('デフォルトでbottom-rightに配置される', () => {
      render(<CharacterCounter currentLength={50} maxLength={100} />);

      const counter = screen.getByRole('status');
      expect(counter).toHaveClass('bottom-2', 'right-2');
    });

    it('bottom-leftに配置される', () => {
      render(<CharacterCounter currentLength={50} maxLength={100} position="bottom-left" />);

      const counter = screen.getByRole('status');
      expect(counter).toHaveClass('bottom-2', 'left-2');
    });

    it('top-rightに配置される', () => {
      render(<CharacterCounter currentLength={50} maxLength={100} position="top-right" />);

      const counter = screen.getByRole('status');
      expect(counter).toHaveClass('top-2', 'right-2');
    });

    it('top-leftに配置される', () => {
      render(<CharacterCounter currentLength={50} maxLength={100} position="top-left" />);

      const counter = screen.getByRole('status');
      expect(counter).toHaveClass('top-2', 'left-2');
    });
  });

  describe('エッジケース', () => {
    it('maxLengthが0の場合でもエラーにならない', () => {
      render(<CharacterCounter currentLength={0} maxLength={0} />);

      expect(screen.getByText('0/0')).toBeInTheDocument();
    });

    it('currentLengthが負の値でも表示される', () => {
      render(<CharacterCounter currentLength={-1} maxLength={100} />);

      expect(screen.getByText('-1/100')).toBeInTheDocument();
    });

    it('カスタムクラス名が適用される', () => {
      render(<CharacterCounter currentLength={50} maxLength={100} className="custom-class" />);

      const counter = screen.getByRole('status');
      expect(counter).toHaveClass('custom-class');
    });
  });

  describe('アクセシビリティ', () => {
    it('警告状態のaria-labelが正しく設定される', () => {
      render(<CharacterCounter currentLength={85} maxLength={100} />);

      const counter = screen.getByRole('status');
      expect(counter).toHaveAttribute(
        'aria-label',
        '文字数: 85文字 / 100文字 (制限に近づいています)'
      );
    });

    it('エラー状態のaria-labelが正しく設定される', () => {
      render(<CharacterCounter currentLength={105} maxLength={100} />);

      const counter = screen.getByRole('status');
      expect(counter).toHaveAttribute('aria-label', '文字数: 105文字 / 100文字 (制限を超過)');
    });
  });
});
