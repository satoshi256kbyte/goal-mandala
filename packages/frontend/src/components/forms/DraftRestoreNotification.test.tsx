import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { DraftRestoreNotification } from './DraftRestoreNotification';
import { DraftData } from '../../services/draftService';

describe('DraftRestoreNotification', () => {
  const mockDraftData: DraftData = {
    formData: {
      title: 'テスト目標',
      description: 'テスト説明',
      deadline: '2024-12-31',
      background: 'テスト背景',
      constraints: 'テスト制約',
    },
    savedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5分前
    version: 1,
  };

  const defaultProps = {
    draftData: mockDraftData,
    onRestore: vi.fn(),
    onReject: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('基本表示', () => {
    it('下書き復元通知が正しく表示される', () => {
      render(<DraftRestoreNotification {...defaultProps} />);

      expect(screen.getByText('下書きが見つかりました')).toBeInTheDocument();
      expect(screen.getByText('テスト目標')).toBeInTheDocument();
      expect(screen.getByText(/5分前に保存/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '復元する' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '新規作成' })).toBeInTheDocument();
    });

    it('isVisibleがfalseの場合は表示されない', () => {
      render(<DraftRestoreNotification {...defaultProps} isVisible={false} />);

      expect(screen.queryByText('下書きが見つかりました')).not.toBeInTheDocument();
    });

    it('復元中の表示が正しく表示される', () => {
      render(<DraftRestoreNotification {...defaultProps} isRestoring={true} />);

      expect(screen.getByText('復元中...')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '復元中...' })).toBeDisabled();
      expect(screen.getByRole('button', { name: '新規作成' })).toBeDisabled();
    });
  });

  describe('ボタンの動作', () => {
    it('復元ボタンクリックでonRestoreが呼ばれる', () => {
      const onRestore = vi.fn();
      render(<DraftRestoreNotification {...defaultProps} onRestore={onRestore} />);

      fireEvent.click(screen.getByRole('button', { name: '復元する' }));

      expect(onRestore).toHaveBeenCalledTimes(1);
    });

    it('新規作成ボタンクリックでonRejectが呼ばれる', () => {
      const onReject = vi.fn();
      render(<DraftRestoreNotification {...defaultProps} onReject={onReject} />);

      fireEvent.click(screen.getByRole('button', { name: '新規作成' }));

      expect(onReject).toHaveBeenCalledTimes(1);
    });

    it('削除ボタンが提供された場合は表示される', () => {
      const onDelete = vi.fn();
      render(<DraftRestoreNotification {...defaultProps} onDelete={onDelete} />);

      const deleteButton = screen.getByRole('button', { name: '削除' });
      expect(deleteButton).toBeInTheDocument();

      fireEvent.click(deleteButton);
      expect(onDelete).toHaveBeenCalledTimes(1);
    });

    it('閉じるボタンが提供された場合は表示される', () => {
      const onClose = vi.fn();
      render(<DraftRestoreNotification {...defaultProps} onClose={onClose} />);

      const closeButton = screen.getByRole('button', { name: '通知を閉じる' });
      expect(closeButton).toBeInTheDocument();

      fireEvent.click(closeButton);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('下書きデータの表示', () => {
    it('タイトルがない場合は説明を表示する', () => {
      const draftDataWithoutTitle: DraftData = {
        ...mockDraftData,
        formData: {
          ...mockDraftData.formData,
          title: '',
          description: 'タイトルなしの説明',
        },
      };

      render(<DraftRestoreNotification {...defaultProps} draftData={draftDataWithoutTitle} />);

      expect(screen.getByText('タイトルなしの説明')).toBeInTheDocument();
    });

    it('タイトルも説明もない場合はデフォルトメッセージを表示する', () => {
      const emptyDraftData: DraftData = {
        ...mockDraftData,
        formData: {
          title: '',
          description: '',
          deadline: '',
          background: '',
          constraints: '',
        },
      };

      render(<DraftRestoreNotification {...defaultProps} draftData={emptyDraftData} />);

      expect(screen.getByText('無題の下書き')).toBeInTheDocument();
    });

    it('長い説明は省略される', () => {
      const longDescriptionData: DraftData = {
        ...mockDraftData,
        formData: {
          ...mockDraftData.formData,
          title: '',
          description:
            'これは非常に長い説明文です。30文字を超える場合は省略されるはずです。さらに長くしてテストします。',
        },
      };

      render(<DraftRestoreNotification {...defaultProps} draftData={longDescriptionData} />);

      expect(
        screen.getByText(/これは非常に長い説明文です。30文字を超える場合は省略され\.\.\./)
      ).toBeInTheDocument();
    });
  });

  describe('時間表示', () => {
    it('保存時間が正しく表示される', () => {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const draftDataOneHourAgo: DraftData = {
        ...mockDraftData,
        savedAt: oneHourAgo.toISOString(),
      };

      render(<DraftRestoreNotification {...defaultProps} draftData={draftDataOneHourAgo} />);

      expect(screen.getByText(/1時間前に保存/)).toBeInTheDocument();
    });
  });

  describe('スタイル', () => {
    it('カスタムクラス名が適用される', () => {
      const { container } = render(
        <DraftRestoreNotification {...defaultProps} className="custom-class" />
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('アクセシビリティ', () => {
    it('適切なaria-labelが設定されている', () => {
      render(<DraftRestoreNotification {...defaultProps} onClose={vi.fn()} />);

      expect(screen.getByRole('button', { name: '通知を閉じる' })).toBeInTheDocument();
    });

    it('復元中はボタンが無効になる', () => {
      render(<DraftRestoreNotification {...defaultProps} isRestoring={true} />);

      expect(screen.getByRole('button', { name: '復元中...' })).toBeDisabled();
      expect(screen.getByRole('button', { name: '新規作成' })).toBeDisabled();
    });
  });
});
