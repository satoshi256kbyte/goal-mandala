import React from 'react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { EmptyState } from '../EmptyState';

describe('EmptyState', () => {
  describe('空状態表示', () => {
    it('タイトルが表示される', () => {
      render(<EmptyState title="テストタイトル" description="テスト説明" />);

      expect(screen.getByText('テストタイトル')).toBeInTheDocument();
    });

    it('説明テキストが表示される', () => {
      render(<EmptyState title="テストタイトル" description="テスト説明" />);

      expect(screen.getByText('テスト説明')).toBeInTheDocument();
    });

    it('アイコンが表示される', () => {
      const icon = <svg data-testid="test-icon" />;
      render(<EmptyState title="テストタイトル" description="テスト説明" icon={icon} />);

      expect(screen.getByTestId('test-icon')).toBeInTheDocument();
    });

    it('アイコンがない場合は表示されない', () => {
      render(<EmptyState title="テストタイトル" description="テスト説明" />);

      expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });

    it('role="status"とaria-live="polite"が設定されている', () => {
      const { container } = render(<EmptyState title="テストタイトル" description="テスト説明" />);

      const emptyStateElement = container.firstChild as HTMLElement;
      expect(emptyStateElement).toHaveAttribute('role', 'status');
      expect(emptyStateElement).toHaveAttribute('aria-live', 'polite');
    });

    it('カスタムclassNameが適用される', () => {
      const { container } = render(
        <EmptyState title="テストタイトル" description="テスト説明" className="custom-class" />
      );

      const emptyStateElement = container.firstChild as HTMLElement;
      expect(emptyStateElement).toHaveClass('custom-class');
    });
  });

  describe('新規作成ボタン', () => {
    it('actionLabelとonActionが指定されている場合、ボタンが表示される', () => {
      const onAction = vi.fn();
      render(
        <EmptyState
          title="テストタイトル"
          description="テスト説明"
          actionLabel="新規作成"
          onAction={onAction}
        />
      );

      expect(screen.getByRole('button', { name: '新規作成' })).toBeInTheDocument();
    });

    it('actionLabelのみ指定されている場合、ボタンは表示されない', () => {
      render(<EmptyState title="テストタイトル" description="テスト説明" actionLabel="新規作成" />);

      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('onActionのみ指定されている場合、ボタンは表示されない', () => {
      const onAction = vi.fn();
      render(<EmptyState title="テストタイトル" description="テスト説明" onAction={onAction} />);

      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('ボタンをクリックするとonActionが呼ばれる', async () => {
      const user = userEvent.setup();
      const onAction = vi.fn();
      render(
        <EmptyState
          title="テストタイトル"
          description="テスト説明"
          actionLabel="新規作成"
          onAction={onAction}
        />
      );

      const button = screen.getByRole('button', { name: '新規作成' });
      await user.click(button);

      expect(onAction).toHaveBeenCalledTimes(1);
    });

    it('ボタンに適切なaria-labelが設定されている', () => {
      const onAction = vi.fn();
      render(
        <EmptyState
          title="テストタイトル"
          description="テスト説明"
          actionLabel="新規作成"
          onAction={onAction}
        />
      );

      const button = screen.getByRole('button', { name: '新規作成' });
      expect(button).toHaveAttribute('aria-label', '新規作成');
    });

    it('ボタンにホバー時のスタイルが適用されている', () => {
      const onAction = vi.fn();
      render(
        <EmptyState
          title="テストタイトル"
          description="テスト説明"
          actionLabel="新規作成"
          onAction={onAction}
        />
      );

      const button = screen.getByRole('button', { name: '新規作成' });
      expect(button).toHaveClass('hover:bg-blue-700');
    });

    it('ボタンにフォーカス時のスタイルが適用されている', () => {
      const onAction = vi.fn();
      render(
        <EmptyState
          title="テストタイトル"
          description="テスト説明"
          actionLabel="新規作成"
          onAction={onAction}
        />
      );

      const button = screen.getByRole('button', { name: '新規作成' });
      expect(button).toHaveClass(
        'focus:outline-none',
        'focus:ring-2',
        'focus:ring-offset-2',
        'focus:ring-blue-500'
      );
    });
  });

  describe('要件9の検証', () => {
    it('要件9.1: マンダラチャートが1件も存在しない場合、空状態メッセージが表示される', () => {
      render(
        <EmptyState
          title="まだマンダラチャートがありません"
          description="新しい目標を作成して、マンダラチャートを始めましょう"
        />
      );

      expect(screen.getByText('まだマンダラチャートがありません')).toBeInTheDocument();
    });

    it('要件9.2: 「まだマンダラチャートがありません」というテキストが表示される', () => {
      render(
        <EmptyState
          title="まだマンダラチャートがありません"
          description="新しい目標を作成して、マンダラチャートを始めましょう"
        />
      );

      expect(screen.getByText('まだマンダラチャートがありません')).toBeInTheDocument();
    });

    it('要件9.3: 「新しい目標を作成して、マンダラチャートを始めましょう」という説明テキストが表示される', () => {
      render(
        <EmptyState
          title="まだマンダラチャートがありません"
          description="新しい目標を作成して、マンダラチャートを始めましょう"
        />
      );

      expect(
        screen.getByText('新しい目標を作成して、マンダラチャートを始めましょう')
      ).toBeInTheDocument();
    });

    it('要件9.4: 「新規作成」ボタンが表示される', () => {
      const onAction = vi.fn();
      render(
        <EmptyState
          title="まだマンダラチャートがありません"
          description="新しい目標を作成して、マンダラチャートを始めましょう"
          actionLabel="新規作成"
          onAction={onAction}
        />
      );

      expect(screen.getByRole('button', { name: '新規作成' })).toBeInTheDocument();
    });

    it('要件9.5: 空状態の「新規作成」ボタンをクリックすると、onActionが呼ばれる（目標入力画面への遷移）', async () => {
      const user = userEvent.setup();
      const onAction = vi.fn();
      render(
        <EmptyState
          title="まだマンダラチャートがありません"
          description="新しい目標を作成して、マンダラチャートを始めましょう"
          actionLabel="新規作成"
          onAction={onAction}
        />
      );

      const button = screen.getByRole('button', { name: '新規作成' });
      await user.click(button);

      expect(onAction).toHaveBeenCalledTimes(1);
    });
  });
});
