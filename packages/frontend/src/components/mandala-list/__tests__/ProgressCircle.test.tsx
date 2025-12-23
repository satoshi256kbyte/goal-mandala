import { render, cleanup } from '@testing-library/react';
import { screen } from '@testing-library/react';
import { describe, it, afterEach } from 'vitest';
import { ProgressCircle } from '../ProgressCircle';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.clearAllTimers();
});

describe('ProgressCircle', () => {
  describe('表示内容', () => {
    it('進捗率が正しく表示される', () => {
      render(<ProgressCircle progress={50} />);

      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toBeInTheDocument();
      expect(progressbar).toHaveAttribute('aria-valuenow', '50');
      expect(screen.getByText('50%')).toBeInTheDocument();
    });

    it('進捗率が0%の場合に正しく表示される', () => {
      render(<ProgressCircle progress={0} />);

      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute('aria-valuenow', '0');
      expect(screen.getByText('0%')).toBeInTheDocument();
    });

    it('進捗率が100%の場合に正しく表示される', () => {
      render(<ProgressCircle progress={100} />);

      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute('aria-valuenow', '100');
      expect(screen.getByText('100%')).toBeInTheDocument();
    });

    it('進捗率が100を超える場合に100に制限される', () => {
      render(<ProgressCircle progress={150} />);

      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute('aria-valuenow', '100');
      expect(screen.getByText('100%')).toBeInTheDocument();
    });

    it('進捗率が負の値の場合に0に制限される', () => {
      render(<ProgressCircle progress={-10} />);

      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute('aria-valuenow', '0');
      expect(screen.getByText('0%')).toBeInTheDocument();
    });

    it('showLabel=falseの場合にラベルが表示されない', () => {
      render(<ProgressCircle progress={50} showLabel={false} />);

      expect(screen.queryByText('50%')).not.toBeInTheDocument();
    });
  });

  describe('色分け', () => {
    it('進捗率0-30%で赤色が適用される', () => {
      const { container } = render(<ProgressCircle progress={20} />);

      const circle = container.querySelector('.stroke-red-500');
      expect(circle).toBeInTheDocument();
    });

    it('進捗率31-70%で黄色が適用される', () => {
      const { container } = render(<ProgressCircle progress={50} />);

      const circle = container.querySelector('.stroke-yellow-500');
      expect(circle).toBeInTheDocument();
    });

    it('進捗率71-100%で緑色が適用される', () => {
      const { container } = render(<ProgressCircle progress={80} />);

      const circle = container.querySelector('.stroke-green-500');
      expect(circle).toBeInTheDocument();
    });

    it('進捗率30%で赤色が適用される（境界値）', () => {
      const { container } = render(<ProgressCircle progress={30} />);

      const circle = container.querySelector('.stroke-red-500');
      expect(circle).toBeInTheDocument();
    });

    it('進捗率31%で黄色が適用される（境界値）', () => {
      const { container } = render(<ProgressCircle progress={31} />);

      const circle = container.querySelector('.stroke-yellow-500');
      expect(circle).toBeInTheDocument();
    });

    it('進捗率70%で黄色が適用される（境界値）', () => {
      const { container } = render(<ProgressCircle progress={70} />);

      const circle = container.querySelector('.stroke-yellow-500');
      expect(circle).toBeInTheDocument();
    });

    it('進捗率71%で緑色が適用される（境界値）', () => {
      const { container } = render(<ProgressCircle progress={71} />);

      const circle = container.querySelector('.stroke-green-500');
      expect(circle).toBeInTheDocument();
    });
  });

  describe('サイズ', () => {
    it('size=smで小サイズが適用される', () => {
      const { container } = render(<ProgressCircle progress={50} size="sm" />);

      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('width', '40');
      expect(svg).toHaveAttribute('height', '40');
    });

    it('size=mdで中サイズが適用される（デフォルト）', () => {
      const { container } = render(<ProgressCircle progress={50} size="md" />);

      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('width', '60');
      expect(svg).toHaveAttribute('height', '60');
    });

    it('size=lgで大サイズが適用される', () => {
      const { container } = render(<ProgressCircle progress={50} size="lg" />);

      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('width', '80');
      expect(svg).toHaveAttribute('height', '80');
    });
  });

  describe('アクセシビリティ', () => {
    it('role属性が正しく設定される', () => {
      render(<ProgressCircle progress={50} />);

      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toBeInTheDocument();
    });

    it('aria-valuenow属性が正しく設定される', () => {
      render(<ProgressCircle progress={75} />);

      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute('aria-valuenow', '75');
    });

    it('aria-valuemin属性が正しく設定される', () => {
      render(<ProgressCircle progress={50} />);

      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute('aria-valuemin', '0');
    });

    it('aria-valuemax属性が正しく設定される', () => {
      render(<ProgressCircle progress={50} />);

      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute('aria-valuemax', '100');
    });

    it('aria-label属性が正しく設定される', () => {
      render(<ProgressCircle progress={50} />);

      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute('aria-label', '進捗率50%');
    });
  });
});
