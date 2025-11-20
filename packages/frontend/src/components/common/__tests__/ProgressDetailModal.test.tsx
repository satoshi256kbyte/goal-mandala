/**
 * ProgressDetailModal コンポーネントのテスト
 * 要件: 5.3
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { ProgressDetailModal } from '../ProgressDetailModal';
import {
  ProgressHistoryEntry,
  SignificantChange,
} from '../../../services/progress-history-service';

// date-fns のモック
vi.mock('date-fns', () => ({
  format: vi.fn((date, formatStr) => {
    if (formatStr === 'yyyy年MM月dd日（E）') return '2024年01月15日（月）';
    if (formatStr === 'yyyy年MM月dd日') return '2024年01月15日';
    if (formatStr === 'yyyy-MM-dd') return '2024-01-15';
    if (formatStr === 'HH:mm:ss') return '10:30:00';
    return '2024-01-15';
  }),
}));

vi.mock('date-fns/locale', () => ({
  ja: {},
}));

// アクセシビリティフックのモック
vi.mock('../../../hooks/useAccessibility', async importOriginal => {
  const actual = await importOriginal<typeof import('../../../hooks/useAccessibility')>();
  return {
    ...actual,
    useFocusTrap: vi.fn(() => null),
  };
});

// スクリーンリーダーユーティリティのモック
vi.mock('../../../utils/screen-reader', async importOriginal => {
  const actual = await importOriginal<typeof import('../../../utils/screen-reader')>();
  return {
    ...actual,
  };
});

describe('ProgressDetailModal', () => {
  const mockProgressHistory: ProgressHistoryEntry[] = [
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
      timestamp: new Date('2024-01-15T10:30:00Z'),
      changeReason: 'タスク完了による進捗更新',
    },
  ];

  const mockSignificantChanges: SignificantChange[] = [
    {
      date: new Date('2024-01-15T10:30:00Z'),
      progress: 50,
      change: 25,
      reason: '重要なマイルストーン達成',
    },
  ];

  const defaultProps = {
    isOpen: true,
    selectedDate: new Date('2024-01-15T10:30:00Z'),
    selectedProgress: 50,
    progressHistory: mockProgressHistory,
    significantChanges: mockSignificantChanges,
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('基本的な表示', () => {
    it('モーダルが開いている時に正しく表示される', () => {
      render(<ProgressDetailModal {...defaultProps} />);

      expect(screen.getByText('進捗詳細')).toBeInTheDocument();
      expect(screen.getByText('2024年01月15日（月）')).toBeInTheDocument();
      expect(screen.getByText('50%')).toBeInTheDocument();
      expect(screen.getByText('現在の進捗')).toBeInTheDocument();
    });

    it('モーダルが閉じている時は何も表示しない', () => {
      render(<ProgressDetailModal {...defaultProps} isOpen={false} />);

      expect(screen.queryByText('進捗詳細')).not.toBeInTheDocument();
    });

    it('選択された日付がnullの場合は何も表示しない', () => {
      render(<ProgressDetailModal {...defaultProps} selectedDate={null} />);

      expect(screen.queryByText('進捗詳細')).not.toBeInTheDocument();
    });

    it('選択された進捗がnullの場合は何も表示しない', () => {
      render(<ProgressDetailModal {...defaultProps} selectedProgress={null} />);

      expect(screen.queryByText('進捗詳細')).not.toBeInTheDocument();
    });
  });

  describe('進捗情報の表示', () => {
    it('現在の進捗を正しく表示する', () => {
      render(<ProgressDetailModal {...defaultProps} />);

      expect(screen.getByText('50%')).toBeInTheDocument();
      expect(screen.getByText('現在の進捗')).toBeInTheDocument();
    });

    it('前日からの変化を正しく表示する', () => {
      render(<ProgressDetailModal {...defaultProps} />);

      expect(screen.getByText('+25.0% 向上')).toBeInTheDocument();
      expect(screen.getByText('前日からの変化')).toBeInTheDocument();
    });

    it('前日の進捗を正しく表示する', () => {
      render(<ProgressDetailModal {...defaultProps} />);

      expect(screen.getByText('前日の進捗:')).toBeInTheDocument();
      expect(screen.getByText('25%')).toBeInTheDocument();
    });

    it('前日のデータがない場合は前日の進捗を表示しない', () => {
      const propsWithoutPreviousDay = {
        ...defaultProps,
        progressHistory: [mockProgressHistory[1]], // 当日のデータのみ
      };

      render(<ProgressDetailModal {...propsWithoutPreviousDay} />);

      expect(screen.queryByText('前日の進捗:')).not.toBeInTheDocument();
    });
  });

  describe('重要な変化の表示', () => {
    it('重要な変化がある場合は重要な変化セクションを表示する', () => {
      render(<ProgressDetailModal {...defaultProps} />);

      expect(screen.getByText('重要な変化')).toBeInTheDocument();
      expect(screen.getByText('大きな進捗変化が検出されました')).toBeInTheDocument();
      expect(screen.getByText('変化量:')).toBeInTheDocument();
      expect(screen.getByText('+25%')).toBeInTheDocument();
      expect(screen.getByText('理由: 重要なマイルストーン達成')).toBeInTheDocument();
    });

    it('重要な変化がない場合は重要な変化セクションを表示しない', () => {
      const propsWithoutSignificantChange = {
        ...defaultProps,
        significantChanges: [],
      };

      render(<ProgressDetailModal {...propsWithoutSignificantChange} />);

      expect(screen.queryByText('重要な変化')).not.toBeInTheDocument();
      expect(screen.queryByText('大きな進捗変化が検出されました')).not.toBeInTheDocument();
    });

    it('重要な変化に理由がない場合は理由を表示しない', () => {
      const significantChangeWithoutReason: SignificantChange[] = [
        {
          date: new Date('2024-01-15T10:30:00Z'),
          progress: 50,
          change: 25,
        },
      ];

      render(
        <ProgressDetailModal
          {...defaultProps}
          significantChanges={significantChangeWithoutReason}
        />
      );

      expect(screen.getByText('重要な変化')).toBeInTheDocument();
      expect(screen.queryByText('理由:')).not.toBeInTheDocument();
    });
  });

  describe('詳細情報の表示', () => {
    it('履歴エントリがある場合は詳細情報を表示する', () => {
      render(<ProgressDetailModal {...defaultProps} />);

      expect(screen.getByText('詳細情報')).toBeInTheDocument();
      expect(screen.getByText('エンティティID:')).toBeInTheDocument();
      expect(screen.getByText('goal-1')).toBeInTheDocument();
      expect(screen.getByText('エンティティタイプ:')).toBeInTheDocument();
      expect(screen.getByText('goal')).toBeInTheDocument();
      expect(screen.getByText('記録時刻:')).toBeInTheDocument();
      expect(screen.getByText('10:30:00')).toBeInTheDocument();
    });

    it('変更理由がある場合は変更理由を表示する', () => {
      render(<ProgressDetailModal {...defaultProps} />);

      expect(screen.getByText('変更理由:')).toBeInTheDocument();
      expect(screen.getByText('タスク完了による進捗更新')).toBeInTheDocument();
    });

    it('履歴エントリがない場合は詳細情報を表示しない', () => {
      const propsWithoutHistoryEntry = {
        ...defaultProps,
        progressHistory: [], // 履歴データなし
      };

      render(<ProgressDetailModal {...propsWithoutHistoryEntry} />);

      expect(screen.queryByText('詳細情報')).not.toBeInTheDocument();
    });
  });

  describe('進捗レベルの表示', () => {
    it('進捗レベルセクションを表示する', () => {
      render(<ProgressDetailModal {...defaultProps} />);

      expect(screen.getByText('進捗レベル')).toBeInTheDocument();
    });

    it('進捗に応じたレベル説明を表示する', () => {
      // 50%の場合
      render(<ProgressDetailModal {...defaultProps} />);
      expect(screen.getByText('進行中')).toBeInTheDocument();
    });

    it('0%の場合は未開始を表示する', () => {
      render(<ProgressDetailModal {...defaultProps} selectedProgress={0} />);
      expect(screen.getByText('未開始')).toBeInTheDocument();
    });

    it('25%の場合は開始段階を表示する', () => {
      render(<ProgressDetailModal {...defaultProps} selectedProgress={25} />);
      expect(screen.getByText('開始段階')).toBeInTheDocument();
    });

    it('85%の場合は完成間近を表示する', () => {
      render(<ProgressDetailModal {...defaultProps} selectedProgress={85} />);
      expect(screen.getByText('完成間近')).toBeInTheDocument();
    });

    it('100%の場合は完了を表示する', () => {
      render(<ProgressDetailModal {...defaultProps} selectedProgress={100} />);
      expect(screen.getByText('完了')).toBeInTheDocument();
    });
  });

  describe('インタラクション', () => {
    it('閉じるボタンをクリックするとonCloseが呼ばれる', () => {
      const onClose = vi.fn();
      render(<ProgressDetailModal {...defaultProps} onClose={onClose} />);

      const closeButton = screen.getByLabelText('モーダルを閉じる');
      fireEvent.click(closeButton);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('フッターの閉じるボタンをクリックするとonCloseが呼ばれる', () => {
      const onClose = vi.fn();
      render(<ProgressDetailModal {...defaultProps} onClose={onClose} />);

      const footerCloseButton = screen.getByRole('button', { name: '閉じる' });
      fireEvent.click(footerCloseButton);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('背景をクリックするとonCloseが呼ばれる', () => {
      const onClose = vi.fn();
      render(<ProgressDetailModal {...defaultProps} onClose={onClose} />);

      const backdrop = screen.getByRole('presentation');
      fireEvent.click(backdrop);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('モーダル内部をクリックしてもonCloseが呼ばれない', () => {
      const onClose = vi.fn();
      render(<ProgressDetailModal {...defaultProps} onClose={onClose} />);

      const modal = screen.getByRole('dialog');
      fireEvent.click(modal);

      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('アクセシビリティ', () => {
    it('適切なARIA属性が設定される', () => {
      render(<ProgressDetailModal {...defaultProps} />);

      const modal = screen.getByRole('dialog');
      expect(modal).toHaveAttribute('aria-modal', 'true');
      expect(modal).toHaveAttribute('aria-labelledby');
      expect(modal).toHaveAttribute('aria-describedby');
    });

    it('カスタムCSSクラスが適用される', () => {
      const { container } = render(
        <ProgressDetailModal {...defaultProps} className="custom-modal" />
      );

      expect(container.querySelector('.custom-modal')).toBeInTheDocument();
    });
  });

  describe('進捗変化の分析', () => {
    it('進捗が減少した場合は適切な表示をする', () => {
      const historyWithDecrease: ProgressHistoryEntry[] = [
        {
          id: '1',
          entityId: 'goal-1',
          entityType: 'goal',
          progress: 75,
          timestamp: new Date('2024-01-14T10:00:00Z'),
        },
        {
          id: '2',
          entityId: 'goal-1',
          entityType: 'goal',
          progress: 50,
          timestamp: new Date('2024-01-15T10:30:00Z'),
        },
      ];

      render(<ProgressDetailModal {...defaultProps} progressHistory={historyWithDecrease} />);

      expect(screen.getByText('-25.0% 低下')).toBeInTheDocument();
    });

    it('進捗に変化がない場合は適切な表示をする', () => {
      const historyWithNoChange: ProgressHistoryEntry[] = [
        {
          id: '1',
          entityId: 'goal-1',
          entityType: 'goal',
          progress: 50,
          timestamp: new Date('2024-01-14T10:00:00Z'),
        },
        {
          id: '2',
          entityId: 'goal-1',
          entityType: 'goal',
          progress: 50,
          timestamp: new Date('2024-01-15T10:30:00Z'),
        },
      ];

      render(<ProgressDetailModal {...defaultProps} progressHistory={historyWithNoChange} />);

      expect(screen.getByText('変化なし')).toBeInTheDocument();
    });
  });
});
