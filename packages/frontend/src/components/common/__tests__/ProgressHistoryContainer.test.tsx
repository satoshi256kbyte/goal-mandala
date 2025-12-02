/**
 * ProgressHistoryContainer コンポーネントのテスト
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { ProgressHistoryContainer } from '../ProgressHistoryContainer';
import { progressHistoryService } from '../../../services/progress-history-service';

// サービスのモック
vi.mock('../../../services/progress-history-service', () => ({
  progressHistoryService: {
    getProgressHistory: vi.fn(),
    getProgressTrend: vi.fn(),
    getSignificantChanges: vi.fn(),
  },
}));

// 子コンポーネントのモック
vi.mock('../ProgressHistoryChart', () => ({
  ProgressHistoryChart: ({ onDateClick, data }: any) => (
    <div
      data-testid="progress-history-chart"
      onClick={() => onDateClick && onDateClick(new Date('2024-01-15'), 50)}
      onKeyDown={(e: any) =>
        e.key === 'Enter' && onDateClick && onDateClick(new Date('2024-01-15'), 50)
      }
      role="button"
      tabIndex={0}
    >
      Chart with {data.length} data points
    </div>
  ),
}));

vi.mock('../ProgressHistoryDetail', () => ({
  ProgressHistoryDetail: ({ isVisible, onClose }: any) =>
    isVisible ? (
      <div data-testid="progress-history-detail">
        <button onClick={onClose}>Close Detail</button>
      </div>
    ) : null,
}));

vi.mock('../ProgressHistoryAnalysis', () => ({
  ProgressHistoryAnalysis: ({ historyData }: any) => (
    <div data-testid="progress-history-analysis">
      Analysis with {historyData.length} data points
    </div>
  ),
}));

vi.mock('../LoadingSpinner', () => ({
  LoadingSpinner: () => <div data-testid="loading-spinner">Loading...</div>,
}));

vi.mock('../ErrorMessage', () => ({
  ErrorMessage: ({ message }: any) => <div data-testid="error-message">{message}</div>,
}));

const mockProgressHistoryService = progressHistoryService as any;

describe('ProgressHistoryContainer', () => {
  const mockHistoryData = [
    {
      id: '1',
      entityId: 'goal-1',
      entityType: 'goal' as const,
      progress: 25,
      timestamp: new Date('2024-01-01T10:00:00Z'),
    },
    {
      id: '2',
      entityId: 'goal-1',
      entityType: 'goal' as const,
      progress: 50,
      timestamp: new Date('2024-01-02T10:00:00Z'),
    },
  ];

  const mockTrend = {
    direction: 'increasing' as const,
    rate: 5.0,
    confidence: 0.8,
  };

  const mockSignificantChanges = [
    {
      date: new Date('2024-01-02T10:00:00Z'),
      progress: 50,
      change: 25,
      reason: 'テスト変化',
    },
  ];

  const defaultProps = {
    entityId: 'goal-1',
    entityType: 'goal' as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // デフォルトのモック実装
    mockProgressHistoryService.getProgressHistory.mockResolvedValue(mockHistoryData);
    mockProgressHistoryService.getProgressTrend.mockResolvedValue(mockTrend);
    mockProgressHistoryService.getSignificantChanges.mockResolvedValue(mockSignificantChanges);
  });

  describe('基本的な表示', () => {
    it('コンポーネントが正しく表示される', async () => {
      render(<ProgressHistoryContainer {...defaultProps} />);

      expect(screen.getByText('進捗履歴')).toBeInTheDocument();
      expect(screen.getByText('過去30日間')).toBeInTheDocument();

      // タブが表示される
      expect(screen.getByText('チャート')).toBeInTheDocument();
      expect(screen.getByText('分析')).toBeInTheDocument();
    });

    it('初期状態でローディングが表示される', () => {
      render(<ProgressHistoryContainer {...defaultProps} />);

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });

    it('データ取得後にチャートが表示される', async () => {
      render(<ProgressHistoryContainer {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('progress-history-chart')).toBeInTheDocument();
      });

      expect(screen.getByText('Chart with 2 data points')).toBeInTheDocument();
    });
  });

  describe('データ取得', () => {
    it('初期化時に全てのデータを取得する', async () => {
      render(<ProgressHistoryContainer {...defaultProps} />);

      await waitFor(() => {
        expect(mockProgressHistoryService.getProgressHistory).toHaveBeenCalledWith({
          entityId: 'goal-1',
          entityType: 'goal',
          startDate: expect.any(Date),
          endDate: expect.any(Date),
        });
      });

      expect(mockProgressHistoryService.getProgressTrend).toHaveBeenCalledWith('goal-1', 30);
      expect(mockProgressHistoryService.getSignificantChanges).toHaveBeenCalledWith('goal-1', 10);
    });

    it('カスタム表示期間でデータを取得する', async () => {
      render(<ProgressHistoryContainer {...defaultProps} displayPeriod={7} />);

      await waitFor(() => {
        expect(mockProgressHistoryService.getProgressTrend).toHaveBeenCalledWith('goal-1', 7);
      });

      expect(screen.getByText('過去7日間')).toBeInTheDocument();
    });
  });

  describe('タブ切り替え', () => {
    it('デフォルトでチャートタブが選択される', async () => {
      render(<ProgressHistoryContainer {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('progress-history-chart')).toBeInTheDocument();
      });
    });

    it('分析タブに切り替えできる', async () => {
      render(<ProgressHistoryContainer {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('progress-history-chart')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('分析'));

      expect(screen.getByTestId('progress-history-analysis')).toBeInTheDocument();
      expect(screen.queryByTestId('progress-history-chart')).not.toBeInTheDocument();
    });

    it('初期表示タブを指定できる', async () => {
      render(<ProgressHistoryContainer {...defaultProps} defaultTab="analysis" />);

      await waitFor(() => {
        expect(screen.getByTestId('progress-history-analysis')).toBeInTheDocument();
      });
    });
  });

  describe('詳細表示', () => {
    it('チャートクリック時に詳細表示が開く', async () => {
      render(<ProgressHistoryContainer {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('progress-history-chart')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('progress-history-chart'));

      expect(screen.getByTestId('progress-history-detail')).toBeInTheDocument();
    });

    it('詳細表示を閉じることができる', async () => {
      render(<ProgressHistoryContainer {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('progress-history-chart')).toBeInTheDocument();
      });

      // 詳細表示を開く
      fireEvent.click(screen.getByTestId('progress-history-chart'));
      expect(screen.getByTestId('progress-history-detail')).toBeInTheDocument();

      // 詳細表示を閉じる
      fireEvent.click(screen.getByText('Close Detail'));
      expect(screen.queryByTestId('progress-history-detail')).not.toBeInTheDocument();
    });
  });

  describe('データ更新', () => {
    it('更新ボタンをクリックするとデータが再取得される', async () => {
      render(<ProgressHistoryContainer {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('progress-history-chart')).toBeInTheDocument();
      });

      // 初回の呼び出しをクリア
      vi.clearAllMocks();

      const refreshButton = screen.getByTitle('データを更新');
      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(mockProgressHistoryService.getProgressHistory).toHaveBeenCalled();
      });

      expect(mockProgressHistoryService.getProgressTrend).toHaveBeenCalled();
      expect(mockProgressHistoryService.getSignificantChanges).toHaveBeenCalled();
    });

    it('ローディング中は更新ボタンが無効になる', () => {
      // 長時間のローディングをシミュレート
      mockProgressHistoryService.getProgressHistory.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 1000))
      );

      render(<ProgressHistoryContainer {...defaultProps} />);

      const refreshButton = screen.getByTitle('データを更新');
      expect(refreshButton).toBeDisabled();
    });
  });

  describe('エラーハンドリング', () => {
    it('データ取得エラー時にエラーメッセージを表示する', async () => {
      const error = new Error('データ取得に失敗しました');
      mockProgressHistoryService.getProgressHistory.mockRejectedValue(error);

      render(<ProgressHistoryContainer {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toBeInTheDocument();
      });
    });

    it('エラー時にコールバックが呼ばれる', async () => {
      const onError = vi.fn();
      const error = new Error('テストエラー');
      mockProgressHistoryService.getProgressHistory.mockRejectedValue(error);

      render(<ProgressHistoryContainer {...defaultProps} onError={onError} />);

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(error);
      });
    });
  });

  describe('データサマリー', () => {
    it('チャートタブでデータサマリーを表示する', async () => {
      render(<ProgressHistoryContainer {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('2')).toBeInTheDocument(); // 記録日数
      });

      expect(screen.getByText('記録日数')).toBeInTheDocument();
      expect(screen.getByText('現在の進捗')).toBeInTheDocument();
      expect(screen.getByText('最高進捗')).toBeInTheDocument();
      expect(screen.getByText('重要な変化')).toBeInTheDocument();
    });

    it('正しい統計値を表示する', async () => {
      render(<ProgressHistoryContainer {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getAllByText('50%').length).toBeGreaterThan(0); // 現在の進捗
      });

      expect(screen.getByText('1')).toBeInTheDocument(); // 重要な変化の数
    });
  });

  describe('カスタムCSSクラス', () => {
    it('カスタムCSSクラスを適用する', () => {
      const { container } = render(
        <ProgressHistoryContainer {...defaultProps} className="custom-container" />
      );

      expect(container.firstChild).toHaveClass('custom-container');
    });
  });
});
