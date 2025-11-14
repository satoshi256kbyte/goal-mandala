/**
 * ProgressHistoryAnalysis コンポーネントのテスト
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { ProgressHistoryAnalysis } from '../ProgressHistoryAnalysis';
import {
  ProgressHistoryEntry,
  ProgressTrend,
  SignificantChange,
} from '../../../services/progress-history-service';

// date-fns のモック
vi.mock('date-fns', () => ({
  format: vi.fn((date, formatStr) => {
    if (formatStr === 'MM月dd日') return '01月15日';
    return '2024-01-15';
  }),
}));

vi.mock('date-fns/locale', () => ({
  ja: {},
}));

describe('ProgressHistoryAnalysis', () => {
  const mockHistoryData: ProgressHistoryEntry[] = [
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
      progress: 30,
      timestamp: new Date('2024-01-02T10:00:00Z'),
    },
    {
      id: '3',
      entityId: 'goal-1',
      entityType: 'goal',
      progress: 50,
      timestamp: new Date('2024-01-03T10:00:00Z'),
    },
    {
      id: '4',
      entityId: 'goal-1',
      entityType: 'goal',
      progress: 75,
      timestamp: new Date('2024-01-04T10:00:00Z'),
    },
  ];

  const mockSignificantChanges: SignificantChange[] = [
    {
      date: new Date('2024-01-02T10:00:00Z'),
      progress: 30,
      change: 20,
      reason: '重要なマイルストーン達成',
    },
    {
      date: new Date('2024-01-04T10:00:00Z'),
      progress: 75,
      change: 25,
      reason: '大幅な進捗向上',
    },
  ];

  const mockTrendIncreasing: ProgressTrend = {
    direction: 'increasing',
    rate: 5.5,
    confidence: 0.8,
  };

  const mockTrendDecreasing: ProgressTrend = {
    direction: 'decreasing',
    rate: 3.2,
    confidence: 0.7,
  };

  const mockTrendStable: ProgressTrend = {
    direction: 'stable',
    rate: 0.5,
    confidence: 0.6,
  };

  const defaultProps = {
    historyData: mockHistoryData,
    significantChanges: mockSignificantChanges,
    trend: mockTrendIncreasing,
    entityId: 'goal-1',
  };

  describe('基本的な表示', () => {
    it('進捗トレンド分析を表示する', () => {
      render(<ProgressHistoryAnalysis {...defaultProps} />);

      expect(screen.getByText('進捗トレンド分析')).toBeInTheDocument();
      expect(screen.getByText('上昇傾向')).toBeInTheDocument();
      expect(screen.getByText('変化率: 5.5%/日')).toBeInTheDocument();
    });

    it('進捗統計を表示する', () => {
      render(<ProgressHistoryAnalysis {...defaultProps} />);

      expect(screen.getByText('進捗統計')).toBeInTheDocument();
      expect(screen.getByText('4')).toBeInTheDocument(); // 記録日数
      expect(screen.getByText('記録日数')).toBeInTheDocument();
      expect(screen.getByText('平均進捗')).toBeInTheDocument();
      expect(screen.getByText('最高進捗')).toBeInTheDocument();
      expect(screen.getByText('総変化')).toBeInTheDocument();
    });

    it('重要な変化点を表示する', () => {
      render(<ProgressHistoryAnalysis {...defaultProps} />);

      expect(screen.getByText('重要な変化点')).toBeInTheDocument();
      expect(screen.getByText('重要なマイルストーン達成')).toBeInTheDocument();
      expect(screen.getByText('大幅な進捗向上')).toBeInTheDocument();
    });

    it('推奨アクションを表示する', () => {
      render(<ProgressHistoryAnalysis {...defaultProps} />);

      expect(screen.getByText('推奨アクション')).toBeInTheDocument();
    });
  });

  describe('データが空の場合', () => {
    it('適切なメッセージを表示する', () => {
      render(
        <ProgressHistoryAnalysis {...defaultProps} historyData={[]} significantChanges={[]} />
      );

      expect(screen.getByText('履歴データがありません')).toBeInTheDocument();
      expect(screen.getByText('タスクを完了すると進捗分析が表示されます')).toBeInTheDocument();
    });
  });

  describe('トレンド方向別の表示', () => {
    it('上昇傾向の場合の表示', () => {
      render(<ProgressHistoryAnalysis {...defaultProps} trend={mockTrendIncreasing} />);

      expect(screen.getByText('上昇傾向')).toBeInTheDocument();
      expect(screen.getByText(/進捗は.*向上しています/)).toBeInTheDocument();
      expect(screen.getByText(/良いペースで進捗しています/)).toBeInTheDocument();
    });

    it('下降傾向の場合の表示', () => {
      render(<ProgressHistoryAnalysis {...defaultProps} trend={mockTrendDecreasing} />);

      expect(screen.getByText('下降傾向')).toBeInTheDocument();
      expect(screen.getByText(/進捗が.*低下しています/)).toBeInTheDocument();
      expect(screen.getByText(/進捗が低下しています。タスクの見直し/)).toBeInTheDocument();
    });

    it('安定傾向の場合の表示', () => {
      render(<ProgressHistoryAnalysis {...defaultProps} trend={mockTrendStable} />);

      expect(screen.getByText('安定')).toBeInTheDocument();
      expect(
        screen.getByText('進捗は安定しています。継続的な取り組みが重要です。')
      ).toBeInTheDocument();
      expect(screen.getByText(/進捗は安定しています。新しいアプローチ/)).toBeInTheDocument();
    });
  });

  describe('信頼度の表示', () => {
    it('高信頼度の場合', () => {
      const highConfidenceTrend: ProgressTrend = {
        direction: 'increasing',
        rate: 5.0,
        confidence: 0.9,
      };

      render(<ProgressHistoryAnalysis {...defaultProps} trend={highConfidenceTrend} />);

      expect(screen.getByText('90%')).toBeInTheDocument();
      expect(screen.getByText('信頼度高')).toBeInTheDocument();
    });

    it('中信頼度の場合', () => {
      const mediumConfidenceTrend: ProgressTrend = {
        direction: 'increasing',
        rate: 3.0,
        confidence: 0.6,
      };

      render(<ProgressHistoryAnalysis {...defaultProps} trend={mediumConfidenceTrend} />);

      expect(screen.getByText('60%')).toBeInTheDocument();
      expect(screen.getByText('信頼度中')).toBeInTheDocument();
    });

    it('低信頼度の場合', () => {
      const lowConfidenceTrend: ProgressTrend = {
        direction: 'stable',
        rate: 1.0,
        confidence: 0.2,
      };

      render(<ProgressHistoryAnalysis {...defaultProps} trend={lowConfidenceTrend} />);

      expect(screen.getByText('20%')).toBeInTheDocument();
      expect(screen.getByText('信頼度低')).toBeInTheDocument();
      expect(
        screen.getByText('データが不十分なため、明確なトレンドを判定できません。')
      ).toBeInTheDocument();
    });
  });

  describe('進捗統計の計算', () => {
    it('正しい統計値を表示する', () => {
      render(<ProgressHistoryAnalysis {...defaultProps} />);

      // 平均進捗: (10 + 30 + 50 + 75) / 4 = 41.25 → 41%
      expect(screen.getByText('41%')).toBeInTheDocument();

      // 最高進捗: 75%
      expect(screen.getByText('75%')).toBeInTheDocument();

      // 総変化: 75 - 10 = 65%
      expect(screen.getByText('+65%')).toBeInTheDocument();
    });

    it('負の総変化を正しく表示する', () => {
      const decreasingData: ProgressHistoryEntry[] = [
        {
          id: '1',
          entityId: 'goal-1',
          entityType: 'goal',
          progress: 80,
          timestamp: new Date('2024-01-01T10:00:00Z'),
        },
        {
          id: '2',
          entityId: 'goal-1',
          entityType: 'goal',
          progress: 60,
          timestamp: new Date('2024-01-02T10:00:00Z'),
        },
        {
          id: '3',
          entityId: 'goal-1',
          entityType: 'goal',
          progress: 40,
          timestamp: new Date('2024-01-03T10:00:00Z'),
        },
      ];

      render(<ProgressHistoryAnalysis {...defaultProps} historyData={decreasingData} />);

      // 総変化: 40 - 80 = -40%
      expect(screen.getByText('-40%')).toBeInTheDocument();
    });
  });

  describe('ベスト・ワーストデイの表示', () => {
    it('最も進捗した日を表示する', () => {
      render(<ProgressHistoryAnalysis {...defaultProps} />);

      expect(screen.getByText('注目すべき日')).toBeInTheDocument();
      expect(screen.getByText('最も進捗した日')).toBeInTheDocument();
    });

    it('後退した日がある場合は最も後退した日を表示する', () => {
      const mixedData: ProgressHistoryEntry[] = [
        ...mockHistoryData,
        {
          id: '5',
          entityId: 'goal-1',
          entityType: 'goal',
          progress: 60, // 75から60に後退
          timestamp: new Date('2024-01-05T10:00:00Z'),
        },
      ];

      render(<ProgressHistoryAnalysis {...defaultProps} historyData={mixedData} />);

      expect(screen.getByText('最も後退した日')).toBeInTheDocument();
    });
  });

  describe('重要な変化点の表示制限', () => {
    it('5件を超える重要な変化点がある場合は制限して表示する', () => {
      const manySignificantChanges: SignificantChange[] = Array.from({ length: 8 }, (_, i) => ({
        date: new Date(`2024-01-${i + 1}T10:00:00Z`),
        progress: (i + 1) * 10,
        change: 10,
        reason: `変化${i + 1}`,
      }));

      render(
        <ProgressHistoryAnalysis {...defaultProps} significantChanges={manySignificantChanges} />
      );

      expect(screen.getByText('他 3 件の重要な変化')).toBeInTheDocument();
    });
  });

  describe('推奨アクションの条件分岐', () => {
    it('活動日数が少ない場合の推奨アクションを表示する', () => {
      const sparseData: ProgressHistoryEntry[] = [
        {
          id: '1',
          entityId: 'goal-1',
          entityType: 'goal',
          progress: 0,
          timestamp: new Date('2024-01-01T10:00:00Z'),
        },
        {
          id: '2',
          entityId: 'goal-1',
          entityType: 'goal',
          progress: 0,
          timestamp: new Date('2024-01-02T10:00:00Z'),
        },
        {
          id: '3',
          entityId: 'goal-1',
          entityType: 'goal',
          progress: 10,
          timestamp: new Date('2024-01-03T10:00:00Z'),
        },
      ];

      render(<ProgressHistoryAnalysis {...defaultProps} historyData={sparseData} />);

      expect(screen.getByText(/活動日数が少ないようです/)).toBeInTheDocument();
    });
  });

  describe('カスタムCSSクラス', () => {
    it('カスタムCSSクラスを適用する', () => {
      const { container } = render(
        <ProgressHistoryAnalysis {...defaultProps} className="custom-analysis" />
      );

      expect(container.firstChild).toHaveClass('custom-analysis');
    });
  });
});
