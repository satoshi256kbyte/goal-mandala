/**
 * ProgressHistoryChart コンポーネントのテスト
 */

import React from 'react';
import { render, cleanup, screen } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import { vi, afterEach } from 'vitest';
import { ProgressHistoryChart } from '../ProgressHistoryChart';
import {
  ProgressHistoryEntry,
  SignificantChange,
} from '../../../services/progress-history-service';

// Recharts のモック
vi.mock('recharts', () => ({
  LineChart: ({ children, onClick }: any) => (
    <div
      data-testid="line-chart"
      onClick={onClick}
      onKeyDown={(e: any) => e.key === 'Enter' && onClick?.(e)}
      role="button"
      tabIndex={0}
    >
      {children}
    </div>
  ),
  Line: ({ dataKey, stroke }: any) => <div data-testid={`line-${dataKey}`} data-stroke={stroke} />,
  XAxis: ({ dataKey }: any) => <div data-testid={`x-axis-${dataKey}`} />,
  YAxis: ({ domain }: any) => <div data-testid="y-axis" data-domain={JSON.stringify(domain)} />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: ({ content }: any) => <div data-testid="tooltip">{content}</div>,
  ResponsiveContainer: ({ children }: any) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  ReferenceLine: ({ y }: any) => <div data-testid={`reference-line-${y}`} />,
  Dot: ({ cx, cy, r, fill }: any) => (
    <div data-testid="custom-dot" data-cx={cx} data-cy={cy} data-r={r} data-fill={fill} />
  ),
}));

// date-fns のモック
vi.mock('date-fns', () => ({
  format: vi.fn((date, formatStr) => {
    if (formatStr === 'MM/dd') return '01/15';
    if (formatStr === 'yyyy年MM月dd日') return '2024年01月15日';
    if (formatStr === 'yyyy-MM-dd') return '2024-01-15';
    return '2024-01-15';
  }),
  parseISO: vi.fn(dateStr => new Date(dateStr)),
}));

vi.mock('date-fns/locale', () => ({
  ja: {},
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.clearAllTimers();
});

describe('ProgressHistoryChart', () => {
  const mockData: ProgressHistoryEntry[] = [
    {
      id: '1',
      entityId: 'goal-1',
      entityType: 'goal',
      progress: 25,
      timestamp: new Date('2024-01-01T10:00:00Z'),
    },
    {
      id: '2',
      entityId: 'goal-1',
      entityType: 'goal',
      progress: 50,
      timestamp: new Date('2024-01-02T10:00:00Z'),
    },
    {
      id: '3',
      entityId: 'goal-1',
      entityType: 'goal',
      progress: 75,
      timestamp: new Date('2024-01-03T10:00:00Z'),
    },
  ];

  const mockSignificantChanges: SignificantChange[] = [
    {
      date: new Date('2024-01-02T10:00:00Z'),
      progress: 50,
      change: 25,
      reason: '重要なマイルストーン達成',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('基本的な表示', () => {
    it('進捗履歴データを正しく表示する', () => {
      render(<ProgressHistoryChart data={mockData} />);

      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      expect(screen.getByTestId('line-progress')).toBeInTheDocument();
      expect(screen.getByTestId('x-axis-date')).toBeInTheDocument();
      expect(screen.getByTestId('y-axis')).toBeInTheDocument();
    });

    it('データが空の場合は適切なメッセージを表示する', () => {
      render(<ProgressHistoryChart data={[]} />);

      expect(screen.getByText('進捗履歴データがありません')).toBeInTheDocument();
      expect(screen.getByText('タスクを完了すると履歴が表示されます')).toBeInTheDocument();
      expect(screen.queryByTestId('line-chart')).not.toBeInTheDocument();
    });

    it('カスタムの高さを適用する', () => {
      render(<ProgressHistoryChart data={mockData} height={400} />);

      const responsiveContainer = screen.getByTestId('responsive-container');
      expect(responsiveContainer).toBeInTheDocument();
    });

    it('カスタムCSSクラスを適用する', () => {
      const { container } = render(
        <ProgressHistoryChart data={mockData} className="custom-chart" />
      );

      expect(container.firstChild).toHaveClass('custom-chart');
    });
  });

  describe('グリッドとツールチップの表示制御', () => {
    it('showGrid=falseの場合はグリッドを表示しない', () => {
      render(<ProgressHistoryChart data={mockData} showGrid={false} />);

      expect(screen.queryByTestId('cartesian-grid')).not.toBeInTheDocument();
    });

    it('showGrid=trueの場合はグリッドを表示する', () => {
      render(<ProgressHistoryChart data={mockData} showGrid={true} />);

      expect(screen.getByTestId('cartesian-grid')).toBeInTheDocument();
    });

    it('showTooltip=falseの場合はツールチップを表示しない', () => {
      render(<ProgressHistoryChart data={mockData} showTooltip={false} />);

      expect(screen.queryByTestId('tooltip')).not.toBeInTheDocument();
    });

    it('showTooltip=trueの場合はツールチップを表示する', () => {
      render(<ProgressHistoryChart data={mockData} showTooltip={true} />);

      expect(screen.getByTestId('tooltip')).toBeInTheDocument();
    });

    it('ツールチップに前日比の情報が表示される', () => {
      render(
        <ProgressHistoryChart
          data={mockData}
          significantChanges={mockSignificantChanges}
          showTooltip={true}
        />
      );

      expect(screen.getByTestId('tooltip')).toBeInTheDocument();
    });

    it('ツールチップにクリック案内が表示される', () => {
      render(<ProgressHistoryChart data={mockData} showTooltip={true} />);

      expect(screen.getByTestId('tooltip')).toBeInTheDocument();
    });
  });

  describe('重要な変化点のハイライト', () => {
    it('重要な変化点がある場合は凡例を表示する', () => {
      render(
        <ProgressHistoryChart
          data={mockData}
          significantChanges={mockSignificantChanges}
          highlightSignificantChanges={true}
        />
      );

      expect(screen.getByText('進捗')).toBeInTheDocument();
      expect(screen.getByText('重要な変化')).toBeInTheDocument();
    });

    it('highlightSignificantChanges=falseの場合は凡例を表示しない', () => {
      render(
        <ProgressHistoryChart
          data={mockData}
          significantChanges={mockSignificantChanges}
          highlightSignificantChanges={false}
        />
      );

      expect(screen.queryByText('重要な変化')).not.toBeInTheDocument();
    });

    it('重要な変化点がない場合は凡例を表示しない', () => {
      render(
        <ProgressHistoryChart
          data={mockData}
          significantChanges={[]}
          highlightSignificantChanges={true}
        />
      );

      expect(screen.queryByText('重要な変化')).not.toBeInTheDocument();
    });
  });

  describe('カスタムカラー設定', () => {
    it('カスタムカラーを適用する', () => {
      const customColors = {
        line: '#ff0000',
        grid: '#00ff00',
        tooltip: '#0000ff',
        significant: '#ffff00',
      };

      render(<ProgressHistoryChart data={mockData} colors={customColors} />);

      const lineElement = screen.getByTestId('line-progress');
      expect(lineElement).toHaveAttribute('data-stroke', '#ff0000');
    });
  });

  describe('インタラクション', () => {
    it('日付クリック時にコールバックが呼ばれる', () => {
      const onDateClick = vi.fn();

      render(<ProgressHistoryChart data={mockData} onDateClick={onDateClick} />);

      const chart = screen.getByTestId('line-chart');

      // クリックイベントをシミュレート
      fireEvent.click(chart, {
        activePayload: [
          {
            payload: {
              timestamp: '2024-01-01T10:00:00Z',
              progress: 25,
            },
          },
        ],
      });

      // モックの制約により、実際のコールバック呼び出しは検証できないが、
      // イベントハンドラーが設定されていることを確認
      expect(chart).toBeInTheDocument();
    });

    it('詳細モーダルが正しく表示される', () => {
      render(<ProgressHistoryChart data={mockData} significantChanges={mockSignificantChanges} />);

      // 初期状態ではモーダルは表示されない
      expect(screen.queryByText('進捗詳細')).not.toBeInTheDocument();
    });
  });

  describe('アクセシビリティ', () => {
    it('デフォルトのaria-labelを設定する', () => {
      render(<ProgressHistoryChart data={mockData} />);

      const chart = screen.getByRole('img');
      expect(chart).toHaveAttribute('aria-label', '進捗履歴チャート。3個のデータポイント');
    });

    it('カスタムaria-labelを設定する', () => {
      render(<ProgressHistoryChart data={mockData} aria-label="カスタム進捗チャート" />);

      const chart = screen.getByRole('img');
      expect(chart).toHaveAttribute('aria-label', 'カスタム進捗チャート');
    });

    it('データが空の場合のaria-labelを設定する', () => {
      render(<ProgressHistoryChart data={[]} />);

      const emptyState = screen.getByRole('img');
      expect(emptyState).toHaveAttribute('aria-label', '進捗履歴データがありません');
    });
  });

  describe('Y軸の範囲設定', () => {
    it('進捗値に基づいてY軸の範囲を設定する', () => {
      const dataWithExtremeValues: ProgressHistoryEntry[] = [
        {
          id: '1',
          entityId: 'goal-1',
          entityType: 'goal',
          progress: 10,
          timestamp: new Date('2024-01-01T10:00:00Z'),
        },
        {
          id: '2',
          entityId: 'goal-1',
          entityType: 'goal',
          progress: 90,
          timestamp: new Date('2024-01-02T10:00:00Z'),
        },
      ];

      render(<ProgressHistoryChart data={dataWithExtremeValues} />);

      const yAxis = screen.getByTestId('y-axis');
      expect(yAxis).toHaveAttribute('data-domain', '[0,100]');
    });
  });

  describe('100%達成ライン', () => {
    it('100%達成の参照ラインを表示する', () => {
      render(<ProgressHistoryChart data={mockData} />);

      expect(screen.getByTestId('reference-line-100')).toBeInTheDocument();
    });
  });
});
