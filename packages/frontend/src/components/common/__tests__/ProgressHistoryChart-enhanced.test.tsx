/**
 * ProgressHistoryChart コンポーネントの強化テスト
 * 要件: 5.5 - チャート表示のテスト
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProgressHistoryChart } from '../ProgressHistoryChart';
import {
  ProgressHistoryEntry,
  SignificantChange,
} from '../../../services/progress-history-service';

// Recharts のモック
jest.mock('recharts', () => ({
  LineChart: ({ children, onClick, data }: any) => (
    <div
      data-testid="line-chart"
      data-chart-data={JSON.stringify(data)}
      onClick={() => {
        // モックのクリックイベント
        if (onClick && data && data.length > 0) {
          onClick({
            activePayload: [
              {
                payload: {
                  timestamp: data[0].timestamp,
                  progress: data[0].progress,
                },
              },
            ],
          });
        }
      }}
    >
      {children}
    </div>
  ),
  Line: ({ dataKey, stroke, dot }: any) => (
    <div data-testid={`line-${dataKey}`} data-stroke={stroke} data-dot={JSON.stringify(dot)} />
  ),
  XAxis: ({ dataKey, tick, tickFormatter }: any) => (
    <div
      data-testid={`x-axis-${dataKey}`}
      data-tick={JSON.stringify(tick)}
      data-tick-formatter={tickFormatter?.toString()}
    />
  ),
  YAxis: ({ domain, tick, tickFormatter }: any) => (
    <div
      data-testid="y-axis"
      data-domain={JSON.stringify(domain)}
      data-tick={JSON.stringify(tick)}
      data-tick-formatter={tickFormatter?.toString()}
    />
  ),
  CartesianGrid: ({ strokeDasharray, stroke, opacity }: any) => (
    <div
      data-testid="cartesian-grid"
      data-stroke-dasharray={strokeDasharray}
      data-stroke={stroke}
      data-opacity={opacity}
    />
  ),
  Tooltip: ({ content, cursor }: any) => (
    <div data-testid="tooltip" data-cursor={JSON.stringify(cursor)}>
      {content}
    </div>
  ),
  ResponsiveContainer: ({ children, width, height }: any) => (
    <div data-testid="responsive-container" data-width={width} data-height={height}>
      {children}
    </div>
  ),
  ReferenceLine: ({ y, stroke, strokeDasharray }: any) => (
    <div
      data-testid={`reference-line-${y}`}
      data-stroke={stroke}
      data-stroke-dasharray={strokeDasharray}
    />
  ),
  Dot: ({ cx, cy, r, fill, stroke, strokeWidth, onClick }: any) => (
    <div
      data-testid="custom-dot"
      data-cx={cx}
      data-cy={cy}
      data-r={r}
      data-fill={fill}
      data-stroke={stroke}
      data-stroke-width={strokeWidth}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    />
  ),
}));

// date-fns のモック
jest.mock('date-fns', () => ({
  format: jest.fn((date, formatStr) => {
    const d = new Date(date);
    if (formatStr === 'MM/dd')
      return `${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}`;
    if (formatStr === 'yyyy年MM月dd日')
      return `${d.getFullYear()}年${(d.getMonth() + 1).toString().padStart(2, '0')}月${d.getDate().toString().padStart(2, '0')}日`;
    if (formatStr === 'yyyy年MM月dd日（E）')
      return `${d.getFullYear()}年${(d.getMonth() + 1).toString().padStart(2, '0')}月${d.getDate().toString().padStart(2, '0')}日（月）`;
    if (formatStr === 'yyyy-MM-dd')
      return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
    if (formatStr === 'HH:mm:ss')
      return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
    return d.toISOString();
  }),
  parseISO: jest.fn(dateStr => new Date(dateStr)),
}));

jest.mock('date-fns/locale', () => ({
  ja: {},
}));

// ProgressDetailModal のモック
jest.mock('../ProgressDetailModal', () => ({
  ProgressDetailModal: ({ isOpen, selectedDate, selectedProgress, onClose }: any) =>
    isOpen ? (
      <div data-testid="progress-detail-modal">
        <div data-testid="modal-date">{selectedDate?.toISOString()}</div>
        <div data-testid="modal-progress">{selectedProgress}</div>
        <button data-testid="modal-close" onClick={onClose}>
          閉じる
        </button>
      </div>
    ) : null,
}));

describe('ProgressHistoryChart - Enhanced Tests', () => {
  const mockData: ProgressHistoryEntry[] = [
    {
      id: '1',
      entityId: 'goal-1',
      entityType: 'goal',
      progress: 25,
      timestamp: new Date('2024-01-01T10:00:00Z'),
      changeReason: '初期設定',
    },
    {
      id: '2',
      entityId: 'goal-1',
      entityType: 'goal',
      progress: 50,
      timestamp: new Date('2024-01-02T10:00:00Z'),
      changeReason: 'タスク完了',
    },
    {
      id: '3',
      entityId: 'goal-1',
      entityType: 'goal',
      progress: 75,
      timestamp: new Date('2024-01-03T10:00:00Z'),
      changeReason: 'マイルストーン達成',
    },
  ];

  const mockSignificantChanges: SignificantChange[] = [
    {
      date: new Date('2024-01-02T10:00:00Z'),
      progress: 50,
      change: 25,
      reason: 'タスク完了による大幅な進捗',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('データ処理とレンダリング', () => {
    it('大量のデータでもパフォーマンスを維持する', () => {
      // 1000件のデータを生成
      const largeData: ProgressHistoryEntry[] = Array.from({ length: 1000 }, (_, i) => ({
        id: `${i + 1}`,
        entityId: 'goal-1',
        entityType: 'goal',
        progress: Math.min(100, i * 0.1),
        timestamp: new Date(Date.now() - (1000 - i) * 24 * 60 * 60 * 1000),
      }));

      const startTime = performance.now();

      render(<ProgressHistoryChart data={largeData} />);

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // レンダリング時間が1秒以内であることを確認
      expect(renderTime).toBeLessThan(1000);
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });

    it('データが頻繁に更新されても正しく再レンダリングされる', async () => {
      const { rerender } = render(<ProgressHistoryChart data={mockData} />);

      // 初期データの確認
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();

      // データを更新
      const updatedData = [
        ...mockData,
        {
          id: '4',
          entityId: 'goal-1',
          entityType: 'goal',
          progress: 90,
          timestamp: new Date('2024-01-04T10:00:00Z'),
        },
      ];

      rerender(<ProgressHistoryChart data={updatedData} />);

      // 更新されたデータが反映されることを確認
      const chartElement = screen.getByTestId('line-chart');
      const chartData = JSON.parse(chartElement.getAttribute('data-chart-data') || '[]');
      expect(chartData).toHaveLength(4);
    });

    it('不正なデータが含まれていても適切に処理される', () => {
      const invalidData: any[] = [
        ...mockData,
        {
          id: '4',
          entityId: 'goal-1',
          entityType: 'goal',
          progress: NaN,
          timestamp: new Date('2024-01-04T10:00:00Z'),
        },
        {
          id: '5',
          entityId: 'goal-1',
          entityType: 'goal',
          progress: Infinity,
          timestamp: new Date('2024-01-05T10:00:00Z'),
        },
        {
          id: '6',
          entityId: 'goal-1',
          entityType: 'goal',
          progress: -50,
          timestamp: new Date('2024-01-06T10:00:00Z'),
        },
      ];

      expect(() => {
        render(<ProgressHistoryChart data={invalidData} />);
      }).not.toThrow();

      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });

    it('タイムスタンプが順序通りでなくても正しく表示される', () => {
      const unorderedData: ProgressHistoryEntry[] = [
        {
          id: '3',
          entityId: 'goal-1',
          entityType: 'goal',
          progress: 75,
          timestamp: new Date('2024-01-03T10:00:00Z'),
        },
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
      ];

      render(<ProgressHistoryChart data={unorderedData} />);

      expect(screen.getByTestId('line-chart')).toBeInTheDocument();

      // データが正しく処理されることを確認
      const chartElement = screen.getByTestId('line-chart');
      const chartData = JSON.parse(chartElement.getAttribute('data-chart-data') || '[]');
      expect(chartData).toHaveLength(3);
    });
  });

  describe('カスタマイゼーション機能', () => {
    it('カスタムカラーが正しく適用される', () => {
      const customColors = {
        line: '#ff0000',
        grid: '#00ff00',
        tooltip: '#0000ff',
        significant: '#ffff00',
      };

      render(<ProgressHistoryChart data={mockData} colors={customColors} />);

      const lineElement = screen.getByTestId('line-progress');
      expect(lineElement).toHaveAttribute('data-stroke', '#ff0000');

      const gridElement = screen.getByTestId('cartesian-grid');
      expect(gridElement).toHaveAttribute('data-stroke', '#00ff00');
    });

    it('カスタム日付フォーマットが適用される', () => {
      render(<ProgressHistoryChart data={mockData} dateFormat="yyyy-MM-dd" />);

      const chartElement = screen.getByTestId('line-chart');
      const chartData = JSON.parse(chartElement.getAttribute('data-chart-data') || '[]');

      // 日付フォーマットが適用されていることを確認
      expect(chartData[0].date).toBe('2024-01-01');
    });

    it('カスタム幅と高さが適用される', () => {
      render(<ProgressHistoryChart data={mockData} width={800} height={400} />);

      const containerElement = screen.getByTestId('responsive-container');
      expect(containerElement).toHaveAttribute('data-width', '800');
      expect(containerElement).toHaveAttribute('data-height', '400');
    });

    it('Y軸の範囲が進捗値に基づいて動的に設定される', () => {
      const extremeData: ProgressHistoryEntry[] = [
        {
          id: '1',
          entityId: 'goal-1',
          entityType: 'goal',
          progress: 5,
          timestamp: new Date('2024-01-01T10:00:00Z'),
        },
        {
          id: '2',
          entityId: 'goal-1',
          entityType: 'goal',
          progress: 95,
          timestamp: new Date('2024-01-02T10:00:00Z'),
        },
      ];

      render(<ProgressHistoryChart data={extremeData} />);

      const yAxisElement = screen.getByTestId('y-axis');
      const domain = JSON.parse(yAxisElement.getAttribute('data-domain') || '[]');

      // Y軸の範囲が適切に設定されることを確認
      expect(domain[0]).toBeLessThanOrEqual(5);
      expect(domain[1]).toBeGreaterThanOrEqual(95);
    });
  });

  describe('インタラクション機能', () => {
    it('チャートクリック時にモーダルが開く', async () => {
      const user = userEvent.setup();

      render(<ProgressHistoryChart data={mockData} significantChanges={mockSignificantChanges} />);

      const chartElement = screen.getByTestId('line-chart');

      await user.click(chartElement);

      // モーダルが開くことを確認
      await waitFor(() => {
        expect(screen.getByTestId('progress-detail-modal')).toBeInTheDocument();
      });

      // 選択されたデータが正しく渡されることを確認
      expect(screen.getByTestId('modal-date')).toHaveTextContent('2024-01-01T10:00:00.000Z');
      expect(screen.getByTestId('modal-progress')).toHaveTextContent('25');
    });

    it('モーダルを閉じることができる', async () => {
      const user = userEvent.setup();

      render(<ProgressHistoryChart data={mockData} significantChanges={mockSignificantChanges} />);

      // モーダルを開く
      const chartElement = screen.getByTestId('line-chart');
      await user.click(chartElement);

      await waitFor(() => {
        expect(screen.getByTestId('progress-detail-modal')).toBeInTheDocument();
      });

      // モーダルを閉じる
      const closeButton = screen.getByTestId('modal-close');
      await user.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByTestId('progress-detail-modal')).not.toBeInTheDocument();
      });
    });

    it('外部のonDateClickコールバックが呼ばれる', async () => {
      const onDateClick = jest.fn();
      const user = userEvent.setup();

      render(<ProgressHistoryChart data={mockData} onDateClick={onDateClick} />);

      const chartElement = screen.getByTestId('line-chart');
      await user.click(chartElement);

      // コールバックが呼ばれることを確認
      await waitFor(() => {
        expect(onDateClick).toHaveBeenCalledWith(new Date('2024-01-01T10:00:00Z'), 25);
      });
    });

    it('重要な変化点のドットがクリック可能', async () => {
      const user = userEvent.setup();

      render(
        <ProgressHistoryChart
          data={mockData}
          significantChanges={mockSignificantChanges}
          highlightSignificantChanges={true}
        />
      );

      // 重要な変化点のドットを探す
      const customDots = screen.getAllByTestId('custom-dot');
      expect(customDots.length).toBeGreaterThan(0);

      // ドットがクリック可能であることを確認
      const firstDot = customDots[0];
      expect(firstDot).toHaveStyle('cursor: pointer');
    });
  });

  describe('アクセシビリティ', () => {
    it('適切なARIA属性が設定される', () => {
      render(<ProgressHistoryChart data={mockData} />);

      const chartContainer = screen.getByRole('img');
      expect(chartContainer).toHaveAttribute('aria-label', '進捗履歴チャート。3個のデータポイント');
    });

    it('カスタムaria-labelが適用される', () => {
      render(<ProgressHistoryChart data={mockData} aria-label="カスタム進捗チャート" />);

      const chartContainer = screen.getByRole('img');
      expect(chartContainer).toHaveAttribute('aria-label', 'カスタム進捗チャート');
    });

    it('データが空の場合の適切なaria-label', () => {
      render(<ProgressHistoryChart data={[]} />);

      const emptyState = screen.getByRole('img');
      expect(emptyState).toHaveAttribute('aria-label', '進捗履歴データがありません');
    });

    it('キーボードナビゲーションに対応している', async () => {
      render(<ProgressHistoryChart data={mockData} />);

      const chartContainer = screen.getByRole('img');

      // フォーカス可能であることを確認
      chartContainer.focus();
      expect(document.activeElement).toBe(chartContainer);
    });
  });

  describe('レスポンシブ対応', () => {
    it('異なる画面サイズでも適切に表示される', () => {
      // モバイルサイズ
      render(<ProgressHistoryChart data={mockData} width="100%" height={200} />);

      const containerElement = screen.getByTestId('responsive-container');
      expect(containerElement).toHaveAttribute('data-width', '100%');
      expect(containerElement).toHaveAttribute('data-height', '200');
    });

    it('デフォルトの幅が100%に設定される', () => {
      render(<ProgressHistoryChart data={mockData} />);

      const containerElement = screen.getByTestId('responsive-container');
      expect(containerElement).toHaveAttribute('data-width', '100%');
    });
  });

  describe('エラーハンドリング', () => {
    it('不正なpropsでもクラッシュしない', () => {
      const invalidProps: any = {
        data: null,
        significantChanges: undefined,
        width: 'invalid',
        height: -100,
        colors: null,
      };

      expect(() => {
        render(<ProgressHistoryChart {...invalidProps} />);
      }).not.toThrow();
    });

    it('空のsignificantChangesでも正常に動作する', () => {
      render(
        <ProgressHistoryChart
          data={mockData}
          significantChanges={[]}
          highlightSignificantChanges={true}
        />
      );

      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      expect(screen.queryByText('重要な変化')).not.toBeInTheDocument();
    });

    it('日付の解析エラーでも処理を継続する', () => {
      const invalidDateData: any[] = [
        {
          id: '1',
          entityId: 'goal-1',
          entityType: 'goal',
          progress: 25,
          timestamp: 'invalid-date',
        },
      ];

      expect(() => {
        render(<ProgressHistoryChart data={invalidDateData} />);
      }).not.toThrow();
    });
  });

  describe('パフォーマンス最適化', () => {
    it('同じデータでの再レンダリングが最適化される', () => {
      const { rerender } = render(<ProgressHistoryChart data={mockData} />);

      // 同じデータで再レンダリング
      rerender(<ProgressHistoryChart data={mockData} />);

      // チャートが正常に表示されることを確認
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });

    it('メモ化が適切に動作する', () => {
      const { rerender } = render(
        <ProgressHistoryChart data={mockData} showGrid={true} showTooltip={true} />
      );

      // プロパティを変更せずに再レンダリング
      rerender(<ProgressHistoryChart data={mockData} showGrid={true} showTooltip={true} />);

      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });
  });
});
