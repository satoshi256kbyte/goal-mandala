import React from 'react';
import { render, screen } from '@testing-library/react';
import { LoadingSpinner, LoadingOverlay, InlineLoading } from './LoadingSpinner';

describe('LoadingSpinner', () => {
  describe('基本表示', () => {
    it('デフォルトのスピナーが表示される', () => {
      render(<LoadingSpinner />);

      const spinner = screen.getByRole('img', { name: '読み込み中' });
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveClass('animate-spin', 'h-6', 'w-6', 'text-blue-600');
    });

    it('テキスト付きで表示される', () => {
      render(<LoadingSpinner text="データを読み込み中..." />);

      expect(screen.getByRole('img')).toBeInTheDocument();
      expect(screen.getByText('データを読み込み中...')).toBeInTheDocument();
    });

    it('カスタムアクセシビリティラベルが設定される', () => {
      render(<LoadingSpinner ariaLabel="カスタム読み込み中" />);

      expect(screen.getByRole('img', { name: 'カスタム読み込み中' })).toBeInTheDocument();
    });
  });

  describe('サイズ設定', () => {
    it('xsサイズが正しく適用される', () => {
      render(<LoadingSpinner size="xs" />);

      expect(screen.getByRole('img')).toHaveClass('h-3', 'w-3');
    });

    it('smサイズが正しく適用される', () => {
      render(<LoadingSpinner size="sm" />);

      expect(screen.getByRole('img')).toHaveClass('h-4', 'w-4');
    });

    it('lgサイズが正しく適用される', () => {
      render(<LoadingSpinner size="lg" />);

      expect(screen.getByRole('img')).toHaveClass('h-8', 'w-8');
    });

    it('xlサイズが正しく適用される', () => {
      render(<LoadingSpinner size="xl" />);

      expect(screen.getByRole('img')).toHaveClass('h-12', 'w-12');
    });
  });

  describe('色設定', () => {
    it('primaryカラーが正しく適用される', () => {
      render(<LoadingSpinner color="primary" />);

      expect(screen.getByRole('img')).toHaveClass('text-blue-600');
    });

    it('secondaryカラーが正しく適用される', () => {
      render(<LoadingSpinner color="secondary" />);

      expect(screen.getByRole('img')).toHaveClass('text-gray-600');
    });

    it('whiteカラーが正しく適用される', () => {
      render(<LoadingSpinner color="white" />);

      expect(screen.getByRole('img')).toHaveClass('text-white');
    });

    it('grayカラーが正しく適用される', () => {
      render(<LoadingSpinner color="gray" />);

      expect(screen.getByRole('img')).toHaveClass('text-gray-400');
    });
  });

  describe('テキスト位置', () => {
    it('テキストが下に表示される（デフォルト）', () => {
      render(<LoadingSpinner text="読み込み中" />);

      const container = screen.getByText('読み込み中').parentElement;
      expect(container).toHaveClass('flex-col');
    });

    it('テキストが右に表示される', () => {
      render(<LoadingSpinner text="読み込み中" textPosition="right" />);

      const container = screen.getByText('読み込み中').parentElement;
      expect(container).toHaveClass('items-center', 'space-x-2');
      expect(container).not.toHaveClass('flex-col');
    });

    it('テキストが表示されない', () => {
      render(<LoadingSpinner text="読み込み中" textPosition="none" />);

      expect(screen.queryByText('読み込み中')).not.toBeInTheDocument();
    });
  });

  describe('カスタムクラス', () => {
    it('カスタムクラス名が適用される', () => {
      render(<LoadingSpinner className="custom-spinner" />);

      const container = screen.getByRole('img').parentElement;
      expect(container).toHaveClass('custom-spinner');
    });
  });
});

describe('LoadingOverlay', () => {
  describe('表示制御', () => {
    it('isVisibleがtrueの場合に表示される', () => {
      render(<LoadingOverlay isVisible={true} />);

      expect(screen.getByRole('dialog', { name: '読み込み中' })).toBeInTheDocument();
      expect(screen.getByText('処理中...')).toBeInTheDocument();
    });

    it('isVisibleがfalseの場合に表示されない', () => {
      render(<LoadingOverlay isVisible={false} />);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('カスタマイズ', () => {
    it('カスタムテキストが表示される', () => {
      render(<LoadingOverlay isVisible={true} text="AI生成中..." />);

      expect(screen.getByText('AI生成中...')).toBeInTheDocument();
    });

    it('透明度が正しく適用される', () => {
      const { rerender } = render(<LoadingOverlay isVisible={true} opacity="light" />);
      expect(screen.getByRole('dialog')).toHaveClass('bg-opacity-25');

      rerender(<LoadingOverlay isVisible={true} opacity="dark" />);
      expect(screen.getByRole('dialog')).toHaveClass('bg-opacity-75');
    });

    it('z-indexが正しく適用される', () => {
      render(<LoadingOverlay isVisible={true} zIndex={100} />);

      const overlay = screen.getByRole('dialog');
      expect(overlay).toHaveStyle({ zIndex: '100' });
    });
  });

  describe('アクセシビリティ', () => {
    it('適切なARIA属性が設定される', () => {
      render(<LoadingOverlay isVisible={true} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-label', '読み込み中');
    });
  });
});

describe('InlineLoading', () => {
  describe('表示制御', () => {
    it('isVisibleがtrueの場合に表示される', () => {
      render(<InlineLoading isVisible={true} />);

      expect(screen.getByRole('img')).toBeInTheDocument();
      expect(screen.getByText('読み込み中...')).toBeInTheDocument();
    });

    it('isVisibleがfalseの場合に表示されない', () => {
      render(<InlineLoading isVisible={false} />);

      expect(screen.queryByRole('img')).not.toBeInTheDocument();
      expect(screen.queryByText('読み込み中...')).not.toBeInTheDocument();
    });
  });

  describe('カスタマイズ', () => {
    it('カスタムテキストが表示される', () => {
      render(<InlineLoading isVisible={true} text="保存中..." />);

      expect(screen.getByText('保存中...')).toBeInTheDocument();
    });

    it('サイズが正しく適用される', () => {
      render(<InlineLoading isVisible={true} size="lg" />);

      expect(screen.getByRole('img')).toHaveClass('h-8', 'w-8');
    });

    it('カスタムクラス名が適用される', () => {
      render(<InlineLoading isVisible={true} className="custom-inline" />);

      const container = screen.getByText('読み込み中...').parentElement;
      expect(container).toHaveClass('custom-inline');
    });
  });

  describe('レイアウト', () => {
    it('スピナーとテキストが横並びで表示される', () => {
      render(<InlineLoading isVisible={true} />);

      const container = screen.getByText('読み込み中...').parentElement;
      expect(container).toHaveClass('inline-flex', 'items-center', 'space-x-2');
    });
  });
});
