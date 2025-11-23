import React from 'react';
import { render, screen } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { MandalaCard } from '../MandalaCard';
import { MandalaChartSummary } from '../../../types/mandala-list';
import { GoalStatus } from '../../../types/mandala';

describe('MandalaCard', () => {
  const mockOnClick = vi.fn();

  const mockMandala: MandalaChartSummary = {
    id: 'test-id-1',
    title: 'テスト目標タイトル',
    description: 'これはテスト用の目標説明です。',
    deadline: new Date('2025-12-31'),
    status: GoalStatus.ACTIVE,
    progress: 50,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-15'),
  };

  beforeEach(() => {
    mockOnClick.mockClear();
  });

  describe('カード表示のテスト', () => {
    it('マンダラチャートの基本情報が正しく表示される', () => {
      render(<MandalaCard mandala={mockMandala} onClick={mockOnClick} />);

      // タイトルが表示される
      expect(screen.getByText('テスト目標タイトル')).toBeInTheDocument();

      // 説明が表示される
      expect(screen.getByText('これはテスト用の目標説明です。')).toBeInTheDocument();

      // 進捗率が表示される（ProgressCircleコンポーネント内）
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50');

      // 期限が表示される
      expect(screen.getByText(/期限: 2025\/12\/31/)).toBeInTheDocument();

      // 作成日時が表示される
      expect(screen.getByText(/作成: 2025\/01\/01/)).toBeInTheDocument();

      // 更新日時が表示される
      expect(screen.getByText(/更新: 2025\/01\/15/)).toBeInTheDocument();
    });

    it('タイトルが長い場合、2行で省略される', () => {
      const longTitleMandala: MandalaChartSummary = {
        ...mockMandala,
        title:
          'これは非常に長いタイトルです。これは非常に長いタイトルです。これは非常に長いタイトルです。これは非常に長いタイトルです。',
      };

      render(<MandalaCard mandala={longTitleMandala} onClick={mockOnClick} />);

      const titleElement = screen.getByText(longTitleMandala.title);
      expect(titleElement).toHaveClass('line-clamp-2');
    });

    it('説明が長い場合、3行で省略される', () => {
      const longDescriptionMandala: MandalaChartSummary = {
        ...mockMandala,
        description: 'これは非常に長い説明です。'.repeat(20) + 'これは非常に長い説明です。',
      };

      render(<MandalaCard mandala={longDescriptionMandala} onClick={mockOnClick} />);

      const descriptionElement = screen.getByText(longDescriptionMandala.description);
      expect(descriptionElement).toHaveClass('line-clamp-3');
    });
  });

  describe('進捗率の色分けテスト', () => {
    it('進捗率0-30%の場合、赤色で表示される', () => {
      const lowProgressMandala: MandalaChartSummary = {
        ...mockMandala,
        progress: 20,
      };

      render(<MandalaCard mandala={lowProgressMandala} onClick={mockOnClick} />);

      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute('aria-valuenow', '20');
      // ProgressCircleコンポーネントで色分けが実装されている
    });

    it('進捗率31-70%の場合、黄色で表示される', () => {
      const mediumProgressMandala: MandalaChartSummary = {
        ...mockMandala,
        progress: 50,
      };

      render(<MandalaCard mandala={mediumProgressMandala} onClick={mockOnClick} />);

      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute('aria-valuenow', '50');
    });

    it('進捗率71-100%の場合、緑色で表示される', () => {
      const highProgressMandala: MandalaChartSummary = {
        ...mockMandala,
        progress: 85,
      };

      render(<MandalaCard mandala={highProgressMandala} onClick={mockOnClick} />);

      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute('aria-valuenow', '85');
    });
  });

  describe('状態バッジの表示テスト', () => {
    it('下書き状態の場合、グレーのバッジが表示される', () => {
      const draftMandala: MandalaChartSummary = {
        ...mockMandala,
        status: GoalStatus.DRAFT,
      };

      render(<MandalaCard mandala={draftMandala} onClick={mockOnClick} />);

      const badge = screen.getByRole('status');
      expect(badge).toHaveTextContent('下書き');
      expect(badge).toHaveClass('bg-gray-100', 'text-gray-800');
    });

    it('活動中状態の場合、青色のバッジが表示される', () => {
      const activeMandala: MandalaChartSummary = {
        ...mockMandala,
        status: GoalStatus.ACTIVE,
      };

      render(<MandalaCard mandala={activeMandala} onClick={mockOnClick} />);

      const badge = screen.getByRole('status');
      expect(badge).toHaveTextContent('活動中');
      expect(badge).toHaveClass('bg-blue-100', 'text-blue-800');
    });

    it('完了状態の場合、緑色のバッジが表示される', () => {
      const completedMandala: MandalaChartSummary = {
        ...mockMandala,
        status: GoalStatus.COMPLETED,
      };

      render(<MandalaCard mandala={completedMandala} onClick={mockOnClick} />);

      const badge = screen.getByRole('status');
      expect(badge).toHaveTextContent('完了');
      expect(badge).toHaveClass('bg-green-100', 'text-green-800');
    });

    it('一時停止状態の場合、オレンジ色のバッジが表示される', () => {
      const pausedMandala: MandalaChartSummary = {
        ...mockMandala,
        status: GoalStatus.PAUSED,
      };

      render(<MandalaCard mandala={pausedMandala} onClick={mockOnClick} />);

      const badge = screen.getByRole('status');
      expect(badge).toHaveTextContent('一時停止');
      expect(badge).toHaveClass('bg-orange-100', 'text-orange-800');
    });
  });

  describe('期限切れ警告アイコンのテスト', () => {
    it('活動中で期限切れの場合、警告アイコンが表示される', () => {
      const overdueMandala: MandalaChartSummary = {
        ...mockMandala,
        status: GoalStatus.ACTIVE,
        deadline: new Date('2020-01-01'), // 過去の日付
      };

      render(<MandalaCard mandala={overdueMandala} onClick={mockOnClick} />);

      const alert = screen.getByRole('alert');
      expect(alert).toHaveAttribute('aria-label', '期限切れ');
      expect(alert).toHaveClass('text-red-600');
    });

    it('活動中で期限内の場合、警告アイコンが表示されない', () => {
      const futureMandala: MandalaChartSummary = {
        ...mockMandala,
        status: GoalStatus.ACTIVE,
        deadline: new Date('2030-12-31'), // 未来の日付
      };

      render(<MandalaCard mandala={futureMandala} onClick={mockOnClick} />);

      const alert = screen.queryByRole('alert');
      expect(alert).not.toBeInTheDocument();
    });

    it('完了状態で期限切れの場合、警告アイコンが表示されない', () => {
      const completedOverdueMandala: MandalaChartSummary = {
        ...mockMandala,
        status: GoalStatus.COMPLETED,
        deadline: new Date('2020-01-01'), // 過去の日付
      };

      render(<MandalaCard mandala={completedOverdueMandala} onClick={mockOnClick} />);

      const alert = screen.queryByRole('alert');
      expect(alert).not.toBeInTheDocument();
    });
  });

  describe('クリックイベントのテスト', () => {
    it('カードをクリックすると、onClickコールバックが呼ばれる', () => {
      render(<MandalaCard mandala={mockMandala} onClick={mockOnClick} />);

      const card = screen.getByRole('button');
      fireEvent.click(card);

      expect(mockOnClick).toHaveBeenCalledTimes(1);
      expect(mockOnClick).toHaveBeenCalledWith('test-id-1');
    });

    it('カードにホバーすると、スタイルが変化する', () => {
      render(<MandalaCard mandala={mockMandala} onClick={mockOnClick} />);

      const card = screen.getByRole('button');
      expect(card).toHaveClass('hover:shadow-md', 'hover:border-blue-300');
    });

    it('カードにフォーカスすると、フォーカスリングが表示される', () => {
      render(<MandalaCard mandala={mockMandala} onClick={mockOnClick} />);

      const card = screen.getByRole('button');
      expect(card).toHaveClass('focus:outline-none', 'focus:ring-2', 'focus:ring-blue-500');
    });
  });

  describe('キーボードイベントのテスト', () => {
    it('Enterキーを押すと、onClickコールバックが呼ばれる', () => {
      render(<MandalaCard mandala={mockMandala} onClick={mockOnClick} />);

      const card = screen.getByRole('button');
      fireEvent.keyPress(card, { key: 'Enter', code: 'Enter', charCode: 13 });

      expect(mockOnClick).toHaveBeenCalledTimes(1);
      expect(mockOnClick).toHaveBeenCalledWith('test-id-1');
    });

    it('Spaceキーを押すと、onClickコールバックが呼ばれる', () => {
      render(<MandalaCard mandala={mockMandala} onClick={mockOnClick} />);

      const card = screen.getByRole('button');
      fireEvent.keyPress(card, { key: ' ', code: 'Space', charCode: 32 });

      expect(mockOnClick).toHaveBeenCalledTimes(1);
      expect(mockOnClick).toHaveBeenCalledWith('test-id-1');
    });

    it('他のキーを押しても、onClickコールバックが呼ばれない', () => {
      render(<MandalaCard mandala={mockMandala} onClick={mockOnClick} />);

      const card = screen.getByRole('button');
      fireEvent.keyPress(card, { key: 'a', code: 'KeyA', charCode: 97 });

      expect(mockOnClick).not.toHaveBeenCalled();
    });

    it('カードがtabIndexを持ち、キーボードでフォーカス可能', () => {
      render(<MandalaCard mandala={mockMandala} onClick={mockOnClick} />);

      const card = screen.getByRole('button');
      expect(card).toHaveAttribute('tabIndex', '0');
    });
  });

  describe('アクセシビリティのテスト', () => {
    it('カードに適切なaria-labelが設定されている', () => {
      render(<MandalaCard mandala={mockMandala} onClick={mockOnClick} />);

      const card = screen.getByRole('button');
      expect(card).toHaveAttribute('aria-label', 'テスト目標タイトルのマンダラチャート、進捗率50%');
    });

    it('カードがrole="button"を持つ', () => {
      render(<MandalaCard mandala={mockMandala} onClick={mockOnClick} />);

      const card = screen.getByRole('button');
      expect(card).toBeInTheDocument();
    });
  });

  describe('カスタムクラスのテスト', () => {
    it('classNameプロパティが正しく適用される', () => {
      render(<MandalaCard mandala={mockMandala} onClick={mockOnClick} className="custom-class" />);

      const card = screen.getByRole('button');
      expect(card).toHaveClass('custom-class');
    });
  });
});
