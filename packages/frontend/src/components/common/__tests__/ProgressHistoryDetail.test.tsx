/**
 * ProgressHistoryDetail コンポーネントのテスト
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { ProgressHistoryDetail } from '../ProgressHistoryDetail';
import {
  ProgressHistoryEntry,
  SignificantChange,
} from '../../../services/progress-history-service';

// date-fns のモック
vi.mock('date-fns', () => {
  const actualFormat = (date: Date, formatStr: string) => {
    const d = new Date(date);
    if (formatStr === 'yyyy-MM-dd') {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    if (formatStr === 'yyyy年MM月dd日') {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}年${month}月${day}日`;
    }
    if (formatStr === 'EEEE') {
      const days = ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'];
      return days[d.getDay()];
    }
    return d.toISOString().split('T')[0];
  };

  return {
    format: actualFormat,
  };
});

vi.mock('date-fns/locale', () => ({
  ja: {},
}));

// Tooltip コンポーネントのモック
vi.mock('../Tooltip', () => ({
  Tooltip: ({ children, content }: any) => (
    <div
      data-testid="tooltip"
      data-content={typeof content === 'string' ? content : 'complex-content'}
    >
      {children}
    </div>
  ),
}));

describe('ProgressHistoryDetail', () => {
  const mockHistoryData: ProgressHistoryEntry[] = [
    {
      id: '1',
      entityId: 'goal-1',
      entityType: 'goal',
      progress: 25,
      timestamp: new Date('2024-01-14T10:00:00Z'),
    },
    {
      id: '2',
      entityId: 'goal-1',
      entityType: 'goal',
      progress: 50,
      timestamp: new Date('2024-01-15T10:00:00Z'),
      // changeReasonを削除（significantChange.reasonを優先させるため）
    },
    {
      id: '3',
      entityId: 'goal-1',
      entityType: 'goal',
      progress: 75,
      timestamp: new Date('2024-01-16T10:00:00Z'),
    },
  ];

  const mockSignificantChanges: SignificantChange[] = [
    {
      date: new Date('2024-01-15T10:00:00Z'),
      progress: 50,
      change: 25,
      reason: '重要なマイルストーン達成',
    },
  ];

  const defaultProps = {
    selectedDate: new Date('2024-01-15T10:00:00Z'),
    selectedProgress: 50,
    historyData: mockHistoryData,
    significantChanges: mockSignificantChanges,
    isVisible: true,
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('基本的な表示', () => {
    it('詳細情報を正しく表示する', () => {
      render(<ProgressHistoryDetail {...defaultProps} />);

      expect(screen.getByText('進捗詳細')).toBeInTheDocument();
      expect(screen.getByText('2024年01月15日')).toBeInTheDocument();
      expect(screen.getByText('月曜日')).toBeInTheDocument();
      expect(screen.getByText('50%')).toBeInTheDocument();
    });

    it('isVisible=falseの場合は表示しない', () => {
      render(<ProgressHistoryDetail {...defaultProps} isVisible={false} />);

      expect(screen.queryByText('進捗詳細')).not.toBeInTheDocument();
    });

    it('selectedDateがない場合は表示しない', () => {
      render(<ProgressHistoryDetail {...defaultProps} selectedDate={undefined} />);

      expect(screen.queryByText('進捗詳細')).not.toBeInTheDocument();
    });

    it('該当する履歴データがない場合は表示しない', () => {
      render(
        <ProgressHistoryDetail {...defaultProps} selectedDate={new Date('2024-01-20T10:00:00Z')} />
      );

      expect(screen.queryByText('進捗詳細')).not.toBeInTheDocument();
    });
  });

  describe('進捗変化の表示', () => {
    it('進捗増加を正しく表示する', () => {
      render(<ProgressHistoryDetail {...defaultProps} />);

      expect(screen.getByText('前回から')).toBeInTheDocument();
      expect(screen.getByText('(25% → 50%)')).toBeInTheDocument();
      expect(screen.getByText('+25%')).toBeInTheDocument();
    });

    it('最初のエントリの場合は前回比較を表示しない', () => {
      render(
        <ProgressHistoryDetail
          {...defaultProps}
          selectedDate={new Date('2024-01-14T10:00:00Z')}
          selectedProgress={25}
        />
      );

      expect(screen.queryByText('前回から')).not.toBeInTheDocument();
    });
  });

  describe('重要な変化の表示', () => {
    it('重要な変化がある場合は特別な表示をする', () => {
      render(<ProgressHistoryDetail {...defaultProps} />);

      expect(screen.getByText('重要な変化')).toBeInTheDocument();
      expect(screen.getByText('この日は25%の大きな変化がありました。')).toBeInTheDocument();
      expect(screen.getByText('重要なマイルストーン達成')).toBeInTheDocument();
    });

    it('重要な変化がない場合は通常の変更理由を表示する', () => {
      const propsWithoutSignificant = {
        ...defaultProps,
        historyData: [
          ...mockHistoryData.slice(0, 1),
          {
            ...mockHistoryData[1],
            changeReason: 'タスク完了による進捗',
          },
          ...mockHistoryData.slice(2),
        ],
        significantChanges: [],
      };

      render(<ProgressHistoryDetail {...propsWithoutSignificant} />);

      expect(screen.queryByText('重要な変化')).not.toBeInTheDocument();
      expect(screen.getByText('変更理由')).toBeInTheDocument();
      expect(screen.getByText('タスク完了による進捗')).toBeInTheDocument();
    });
  });

  describe('進捗評価の表示', () => {
    it('100%達成時の評価を表示する', () => {
      const completedData = [
        ...mockHistoryData,
        {
          id: '4',
          entityId: 'goal-1',
          entityType: 'goal' as const,
          progress: 100,
          timestamp: new Date('2024-01-17T10:00:00Z'),
        },
      ];

      render(
        <ProgressHistoryDetail
          {...defaultProps}
          historyData={completedData}
          selectedDate={new Date('2024-01-17T10:00:00Z')}
          selectedProgress={100}
        />
      );

      expect(screen.getByText('目標達成！')).toBeInTheDocument();
    });

    it('高進捗時の評価を表示する', () => {
      const highProgressData = [
        ...mockHistoryData,
        {
          id: '4',
          entityId: 'goal-1',
          entityType: 'goal' as const,
          progress: 85,
          timestamp: new Date('2024-01-17T10:00:00Z'),
        },
      ];

      render(
        <ProgressHistoryDetail
          {...defaultProps}
          historyData={highProgressData}
          selectedDate={new Date('2024-01-17T10:00:00Z')}
          selectedProgress={85}
        />
      );

      expect(screen.getByText('順調に進捗しています')).toBeInTheDocument();
    });

    it('中進捗時の評価を表示する', () => {
      render(<ProgressHistoryDetail {...defaultProps} />);

      expect(screen.getByText('中程度の進捗です')).toBeInTheDocument();
    });

    it('低進捗時の評価を表示する', () => {
      render(
        <ProgressHistoryDetail
          {...defaultProps}
          selectedDate={new Date('2024-01-14T10:00:00Z')}
          selectedProgress={25}
        />
      );

      expect(screen.getByText('進捗が遅れています')).toBeInTheDocument();
    });

    it('未開始時の評価を表示する', () => {
      const zeroProgressData = [
        {
          id: '0',
          entityId: 'goal-1',
          entityType: 'goal' as const,
          progress: 0,
          timestamp: new Date('2024-01-13T10:00:00Z'),
        },
        ...mockHistoryData,
      ];

      render(
        <ProgressHistoryDetail
          {...defaultProps}
          historyData={zeroProgressData}
          selectedDate={new Date('2024-01-13T10:00:00Z')}
          selectedProgress={0}
        />
      );

      expect(screen.getByText('まだ開始されていません')).toBeInTheDocument();
    });
  });

  describe('インタラクション', () => {
    it('閉じるボタンをクリックするとonCloseが呼ばれる', () => {
      const onClose = vi.fn();
      render(<ProgressHistoryDetail {...defaultProps} onClose={onClose} />);

      const closeButton = screen.getByLabelText('詳細を閉じる');
      fireEvent.click(closeButton);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('フッターの閉じるボタンをクリックするとonCloseが呼ばれる', () => {
      const onClose = vi.fn();
      render(<ProgressHistoryDetail {...defaultProps} onClose={onClose} />);

      const closeButton = screen.getByRole('button', { name: '閉じる' });
      fireEvent.click(closeButton);

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('カスタムCSSクラス', () => {
    it('カスタムCSSクラスを適用する', () => {
      const { container } = render(
        <ProgressHistoryDetail {...defaultProps} className="custom-detail" />
      );

      expect(container.firstChild).toHaveClass('custom-detail');
    });
  });
});
