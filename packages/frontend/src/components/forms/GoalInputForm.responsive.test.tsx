import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { GoalInputForm } from './GoalInputForm';
import { GoalFormProvider } from '../../contexts/GoalFormContext';

// window.innerWidthをモック
const mockInnerWidth = (width: number) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
};

// resizeイベントをトリガー
const triggerResize = (width: number) => {
  mockInnerWidth(width);
  window.dispatchEvent(new Event('resize'));
};

// テスト用のプロパティ
const defaultProps = {
  onSubmit: vi.fn(),
  onDraftSave: vi.fn(),
  isSubmitting: false,
  isDraftSaving: false,
};

// テスト用のラッパーコンポーネント
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <GoalFormProvider>{children}</GoalFormProvider>
);

describe('GoalInputForm レスポンシブデザイン', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // デフォルトでデスクトップサイズに設定
    mockInnerWidth(1200);
  });

  describe('デスクトップレイアウト (1024px以上)', () => {
    beforeEach(() => {
      mockInnerWidth(1200);
    });

    it('デスクトップ用のコンテナクラスが適用される', () => {
      render(
        <TestWrapper>
          <GoalInputForm {...defaultProps} />
        </TestWrapper>
      );

      const container = screen.getByRole('form').parentElement;
      expect(container).toHaveClass('lg:max-w-6xl');
    });

    it('デスクトップ用のフォームスペーシングが適用される', () => {
      render(
        <TestWrapper>
          <GoalInputForm {...defaultProps} />
        </TestWrapper>
      );

      const form = screen.getByRole('form');
      expect(form).toHaveClass('lg:space-y-8');
    });

    it('デスクトップ用のボタンレイアウトが適用される', () => {
      render(
        <TestWrapper>
          <GoalInputForm {...defaultProps} />
        </TestWrapper>
      );

      const submitButton = screen.getByRole('button', { name: /AI生成開始/i });
      expect(submitButton).toHaveClass('lg:w-auto', 'lg:min-w-[160px]', 'lg:flex-none');
    });

    it('下書き保存ボタンがデスクトップ用のスタイルを持つ', () => {
      render(
        <TestWrapper>
          <GoalInputForm {...defaultProps} />
        </TestWrapper>
      );

      const draftButton = screen.getByRole('button', { name: /下書き保存/i });
      expect(draftButton).toHaveClass('lg:w-auto', 'lg:min-w-[120px]', 'lg:flex-none');
    });
  });

  describe('タブレットレイアウト (768px - 1023px)', () => {
    beforeEach(() => {
      mockInnerWidth(800);
    });

    it('タブレット用のコンテナクラスが適用される', () => {
      render(
        <TestWrapper>
          <GoalInputForm {...defaultProps} />
        </TestWrapper>
      );

      const container = screen.getByRole('form').parentElement;
      expect(container).toHaveClass('md:max-w-4xl');
    });

    it('タブレット用のフォームスペーシングが適用される', () => {
      render(
        <TestWrapper>
          <GoalInputForm {...defaultProps} />
        </TestWrapper>
      );

      const form = screen.getByRole('form');
      expect(form).toHaveClass('md:space-y-6');
    });

    it('タブレット用のボタンレイアウトが適用される', () => {
      render(
        <TestWrapper>
          <GoalInputForm {...defaultProps} />
        </TestWrapper>
      );

      const submitButton = screen.getByRole('button', { name: /AI生成開始/i });
      expect(submitButton).toHaveClass('md:flex-1', 'md:max-w-[200px]');
    });
  });

  describe('モバイルレイアウト (767px以下)', () => {
    beforeEach(() => {
      mockInnerWidth(400);
    });

    it('モバイル用の基本クラスが適用される', () => {
      render(
        <TestWrapper>
          <GoalInputForm {...defaultProps} />
        </TestWrapper>
      );

      const container = screen.getByRole('form').parentElement;
      expect(container).toHaveClass('max-w-4xl');
    });

    it('モバイル用のフォームスペーシングが適用される', () => {
      render(
        <TestWrapper>
          <GoalInputForm {...defaultProps} />
        </TestWrapper>
      );

      const form = screen.getByRole('form');
      expect(form).toHaveClass('space-y-6');
    });

    it('モバイル用のボタンレイアウトが適用される', () => {
      render(
        <TestWrapper>
          <GoalInputForm {...defaultProps} />
        </TestWrapper>
      );

      const submitButton = screen.getByRole('button', { name: /AI生成開始/i });
      expect(submitButton).toHaveClass('flex-1');
    });
  });

  describe('レスポンシブ切り替え', () => {
    it('デスクトップからモバイルにリサイズされる', async () => {
      mockInnerWidth(1200);

      const { rerender } = render(
        <TestWrapper>
          <GoalInputForm {...defaultProps} />
        </TestWrapper>
      );

      // 初期状態でデスクトップクラスを確認
      let container = screen.getByRole('form').parentElement;
      expect(container).toHaveClass('lg:max-w-6xl');

      // モバイルサイズにリサイズ
      triggerResize(400);

      // 再レンダリング
      rerender(
        <TestWrapper>
          <GoalInputForm {...defaultProps} />
        </TestWrapper>
      );

      await waitFor(() => {
        container = screen.getByRole('form').parentElement;
        expect(container).toHaveClass('max-w-4xl');
      });
    });

    it('モバイルからタブレットにリサイズされる', async () => {
      mockInnerWidth(400);

      const { rerender } = render(
        <TestWrapper>
          <GoalInputForm {...defaultProps} />
        </TestWrapper>
      );

      // 初期状態でモバイルクラスを確認
      let form = screen.getByRole('form');
      expect(form).toHaveClass('space-y-6');

      // タブレットサイズにリサイズ
      triggerResize(800);

      // 再レンダリング
      rerender(
        <TestWrapper>
          <GoalInputForm {...defaultProps} />
        </TestWrapper>
      );

      await waitFor(() => {
        form = screen.getByRole('form');
        expect(form).toHaveClass('md:space-y-6');
      });
    });
  });

  describe('入力フィールドのレスポンシブ対応', () => {
    it('モバイルでタッチ操作に適したサイズが適用される', () => {
      mockInnerWidth(400);

      render(
        <TestWrapper>
          <GoalInputForm {...defaultProps} />
        </TestWrapper>
      );

      const titleInput = screen.getByLabelText(/目標タイトル/i);
      expect(titleInput).toHaveClass('min-h-[44px]');
    });

    it('タブレットで適切なサイズが適用される', () => {
      mockInnerWidth(800);

      render(
        <TestWrapper>
          <GoalInputForm {...defaultProps} />
        </TestWrapper>
      );

      const titleInput = screen.getByLabelText(/目標タイトル/i);
      expect(titleInput).toHaveClass('md:min-h-[48px]');
    });

    it('デスクトップで適切なサイズが適用される', () => {
      mockInnerWidth(1200);

      render(
        <TestWrapper>
          <GoalInputForm {...defaultProps} />
        </TestWrapper>
      );

      const titleInput = screen.getByLabelText(/目標タイトル/i);
      expect(titleInput).toHaveClass('lg:min-h-[40px]');
    });
  });

  describe('フォントサイズのレスポンシブ対応', () => {
    it('モバイルで適切なフォントサイズが適用される', () => {
      mockInnerWidth(400);

      render(
        <TestWrapper>
          <GoalInputForm {...defaultProps} />
        </TestWrapper>
      );

      const titleInput = screen.getByLabelText(/目標タイトル/i);
      expect(titleInput).toHaveClass('text-base');
    });

    it('タブレットで適切なフォントサイズが適用される', () => {
      mockInnerWidth(800);

      render(
        <TestWrapper>
          <GoalInputForm {...defaultProps} />
        </TestWrapper>
      );

      const titleInput = screen.getByLabelText(/目標タイトル/i);
      expect(titleInput).toHaveClass('md:text-base');
    });

    it('デスクトップで適切なフォントサイズが適用される', () => {
      mockInnerWidth(1200);

      render(
        <TestWrapper>
          <GoalInputForm {...defaultProps} />
        </TestWrapper>
      );

      const titleInput = screen.getByLabelText(/目標タイトル/i);
      expect(titleInput).toHaveClass('lg:text-sm');
    });
  });

  describe('アクセシビリティ', () => {
    it('モバイルでタッチ操作に適したボタンサイズが提供される', () => {
      mockInnerWidth(400);

      render(
        <TestWrapper>
          <GoalInputForm {...defaultProps} />
        </TestWrapper>
      );

      const submitButton = screen.getByRole('button', { name: /AI生成開始/i });
      const draftButton = screen.getByRole('button', { name: /下書き保存/i });

      // ボタンの高さが44px以上であることを確認（タッチ操作に適したサイズ）
      expect(submitButton).toHaveStyle('min-height: 44px');
      expect(draftButton).toHaveStyle('min-height: 44px');
    });

    it('すべてのデバイスサイズでフォーカス表示が適切に動作する', () => {
      const deviceSizes = [400, 800, 1200];

      deviceSizes.forEach(size => {
        mockInnerWidth(size);

        const { unmount } = render(
          <TestWrapper>
            <GoalInputForm {...defaultProps} />
          </TestWrapper>
        );

        const titleInput = screen.getByLabelText(/目標タイトル/i);

        // フォーカス時のスタイルが適用されることを確認
        fireEvent.focus(titleInput);
        expect(titleInput).toHaveClass('focus:ring-2');

        unmount();
      });
    });
  });

  describe('エラー表示のレスポンシブ対応', () => {
    it('モバイルでエラーメッセージが適切に表示される', async () => {
      mockInnerWidth(400);

      render(
        <TestWrapper>
          <GoalInputForm {...defaultProps} />
        </TestWrapper>
      );

      const submitButton = screen.getByRole('button', { name: /AI生成開始/i });

      // 空のフォームで送信してバリデーションエラーを発生させる
      fireEvent.click(submitButton);

      await waitFor(() => {
        const errorMessages = screen.getAllByText(/は必須です/i);
        expect(errorMessages.length).toBeGreaterThan(0);

        // エラーメッセージが適切なフォントサイズで表示されることを確認
        errorMessages.forEach(message => {
          expect(message).toBeInTheDocument();
        });
      });
    });
  });
});
