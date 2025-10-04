/**
 * ProgressHistoryDetail コンポーネントのテスト
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProgressHistoryDetail, ProgressDayTooltip } from '../ProgressHistoryDetail';
import {
  ProgressHistoryEntry,
  SignificantChange,
} from '../../../services/progress-history-service';

// date-fns のモック
jest.mock('date-fns', () => ({
  format: jest.fn((date, formatStr) => {
    if (formatStr === 'yyyy-MM-dd') return '2024-01-15';
    if (formatStr === 'yyyy年MM月dd日') return '2024年01月15日';
    if (formatStr === 'EEEE') return '月曜日';
    return '2024-01-15';
  }),
}));

jest.mock('date-fns/locale', () => ({
  ja: {},
}));

// Tooltip コンポーネントのモック
jest.mock('../Tooltip', () => ({
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
      changeReason: 'タスク完了による進捗',
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
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
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
      render(
        <ProgressHistoryDetail
          {...defaultProps}
          selectedDate={new Date('2024-01-16T10:00:00Z')}
          selectedProgress={75}
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
      const onClose = jest.fn();
      render(<ProgressHistoryDetail {...defaultProps} onClose={onClose} />);

      const closeButtons = screen.getAllByText('閉じる');
      fireEvent.click(closeButtons[0]); // ヘッダーの×ボタン

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('フッターの閉じるボタンをクリックするとonCloseが呼ばれる', () => {
      const onClose = jest.fn();
      render(<ProgressHistoryDetail {...defaultProps} onClose={onClose} />);

      const closeButtons = screen.getAllByText('閉じる');
      fireEvent.click(closeButtons[1]); // フッターの閉じるボタン

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

describe('ProgressDayTooltip', () => {
  const mockDate = new Date('2024-01-15T10:00:00Z');
  const mockSignificantChange: SignificantChange = {
    date: mockDate,
    progress: 75,
    change: 25,
    reason: 'マイルストーン達成',
  };

  it('基本的なツールチップを表示する', () => {
    render(
      <ProgressDayTooltip date={mockDate} progress={75}>
        <div>Child Content</div>
      </ProgressDayTooltip>
    );

    expect(screen.getByTestId('tooltip')).toBeInTheDocument();
    expect(screen.getByText('Child Content')).toBeInTheDocument();
  });

  it('進捗変化がある場合は変化情報を表示する', () => {
    render(
      <ProgressDayTooltip date={mockDate} progress={75} previousProgress={50}>
        <div>Child Content</div>
      </ProgressDayTooltip>
    );

    expect(screen.getByTestId('tooltip')).toBeInTheDocument();
  });

  it('重要な変化がある場合は特別な情報を表示する', () => {
    render(
      <ProgressDayTooltip date={mockDate} progress={75} significantChange={mockSignificantChange}>
        <div>Child Content</div>
      </ProgressDayTooltip>
    );

    expect(screen.getByTestId('tooltip')).toBeInTheDocument();
  });

  it('変化が小さい場合は変化情報を表示しない', () => {
    render(
      <ProgressDayTooltip
        date={mockDate}
        progress={75}
        previousProgress={74.5} // 0.5%の変化
      >
        <div>Child Content</div>
      </ProgressDayTooltip>
    );

    expect(screen.getByTestId('tooltip')).toBeInTheDocument();
  });
});
