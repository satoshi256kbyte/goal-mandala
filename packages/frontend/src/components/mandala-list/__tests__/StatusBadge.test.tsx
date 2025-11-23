import { render } from '@testing-library/react';
import { screen } from '@testing-library/react';
import { describe, it } from 'vitest';
import { StatusBadge } from '../StatusBadge';
import { GoalStatus } from '../../../types/mandala';

describe('StatusBadge', () => {
  describe('表示内容', () => {
    it('下書き状態を正しく表示する', () => {
      render(<StatusBadge status={GoalStatus.DRAFT} />);

      const badge = screen.getByRole('status');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('下書き');
      expect(badge).toHaveAttribute('aria-label', '状態: 下書き');
    });

    it('活動中状態を正しく表示する', () => {
      render(<StatusBadge status={GoalStatus.ACTIVE} />);

      const badge = screen.getByRole('status');
      expect(badge).toHaveTextContent('活動中');
      expect(badge).toHaveAttribute('aria-label', '状態: 活動中');
    });

    it('完了状態を正しく表示する', () => {
      render(<StatusBadge status={GoalStatus.COMPLETED} />);

      const badge = screen.getByRole('status');
      expect(badge).toHaveTextContent('完了');
      expect(badge).toHaveAttribute('aria-label', '状態: 完了');
    });

    it('一時停止状態を正しく表示する', () => {
      render(<StatusBadge status={GoalStatus.PAUSED} />);

      const badge = screen.getByRole('status');
      expect(badge).toHaveTextContent('一時停止');
      expect(badge).toHaveAttribute('aria-label', '状態: 一時停止');
    });
  });

  describe('スタイリング', () => {
    it('下書き状態でグレーのスタイルが適用される', () => {
      render(<StatusBadge status={GoalStatus.DRAFT} />);

      const badge = screen.getByRole('status');
      expect(badge).toHaveClass('bg-gray-100', 'text-gray-800');
    });

    it('活動中状態で青色のスタイルが適用される', () => {
      render(<StatusBadge status={GoalStatus.ACTIVE} />);

      const badge = screen.getByRole('status');
      expect(badge).toHaveClass('bg-blue-100', 'text-blue-800');
    });

    it('完了状態で緑色のスタイルが適用される', () => {
      render(<StatusBadge status={GoalStatus.COMPLETED} />);

      const badge = screen.getByRole('status');
      expect(badge).toHaveClass('bg-green-100', 'text-green-800');
    });

    it('一時停止状態でオレンジ色のスタイルが適用される', () => {
      render(<StatusBadge status={GoalStatus.PAUSED} />);

      const badge = screen.getByRole('status');
      expect(badge).toHaveClass('bg-orange-100', 'text-orange-800');
    });

    it('カスタムクラスが適用される', () => {
      render(<StatusBadge status={GoalStatus.ACTIVE} className="custom-class" />);

      const badge = screen.getByRole('status');
      expect(badge).toHaveClass('custom-class');
    });
  });

  describe('アクセシビリティ', () => {
    it('role属性が正しく設定される', () => {
      render(<StatusBadge status={GoalStatus.ACTIVE} />);

      const badge = screen.getByRole('status');
      expect(badge).toBeInTheDocument();
    });

    it('aria-label属性が正しく設定される', () => {
      render(<StatusBadge status={GoalStatus.ACTIVE} />);

      const badge = screen.getByRole('status');
      expect(badge).toHaveAttribute('aria-label', '状態: 活動中');
    });
  });
});
