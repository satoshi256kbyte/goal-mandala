import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { Tooltip } from './Tooltip';

// タイマーのモック
vi.useFakeTimers();

describe('Tooltip', () => {
  beforeEach(() => {
    vi.clearAllTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.useFakeTimers();
  });

  describe('基本的な表示機能', () => {
    it('子要素が正しく表示される', () => {
      render(
        <Tooltip content="テストツールチップ">
          <button>ホバーしてください</button>
        </Tooltip>
      );

      expect(screen.getByText('ホバーしてください')).toBeInTheDocument();
    });

    it('初期状態ではツールチップが表示されない', () => {
      render(
        <Tooltip content="テストツールチップ">
          <button>ホバーしてください</button>
        </Tooltip>
      );

      expect(screen.queryByText('テストツールチップ')).not.toBeInTheDocument();
    });

    it('ホバー時にツールチップが表示される', async () => {
      render(
        <Tooltip content="テストツールチップ" delay={0}>
          <button>ホバーしてください</button>
        </Tooltip>
      );

      const trigger = screen.getByText('ホバーしてください');
      fireEvent.mouseEnter(trigger);

      vi.runAllTimers();

      await waitFor(() => {
        expect(screen.getByText('テストツールチップ')).toBeInTheDocument();
      });
    });

    it('ホバー終了時にツールチップが非表示になる', async () => {
      render(
        <Tooltip content="テストツールチップ" delay={0}>
          <button>ホバーしてください</button>
        </Tooltip>
      );

      const trigger = screen.getByText('ホバーしてください');
      fireEvent.mouseEnter(trigger);
      vi.runAllTimers();

      await waitFor(() => {
        expect(screen.getByText('テストツールチップ')).toBeInTheDocument();
      });

      fireEvent.mouseLeave(trigger);

      await waitFor(() => {
        expect(screen.queryByText('テストツールチップ')).not.toBeInTheDocument();
      });
    });
  });

  describe('遅延機能', () => {
    it('指定した遅延時間後にツールチップが表示される', async () => {
      render(
        <Tooltip content="テストツールチップ" delay={500}>
          <button>ホバーしてください</button>
        </Tooltip>
      );

      const trigger = screen.getByText('ホバーしてください');
      fireEvent.mouseEnter(trigger);

      // 遅延時間前はまだ表示されない
      expect(screen.queryByText('テストツールチップ')).not.toBeInTheDocument();

      // 遅延時間経過後に表示される
      vi.advanceTimersByTime(500);

      await waitFor(() => {
        expect(screen.getByText('テストツールチップ')).toBeInTheDocument();
      });
    });

    it('遅延中にホバーが終了した場合、ツールチップが表示されない', async () => {
      render(
        <Tooltip content="テストツールチップ" delay={500}>
          <button>ホバーしてください</button>
        </Tooltip>
      );

      const trigger = screen.getByText('ホバーしてください');
      fireEvent.mouseEnter(trigger);

      // 遅延時間の半分経過
      vi.advanceTimersByTime(250);

      // ホバー終了
      fireEvent.mouseLeave(trigger);

      // 残りの時間経過
      vi.advanceTimersByTime(250);

      // ツールチップは表示されない
      expect(screen.queryByText('テストツールチップ')).not.toBeInTheDocument();
    });
  });

  describe('位置設定', () => {
    it('top位置のクラスが適用される', async () => {
      render(
        <Tooltip content="テストツールチップ" position="top" delay={0}>
          <button>ホバーしてください</button>
        </Tooltip>
      );

      const trigger = screen.getByText('ホバーしてください');
      fireEvent.mouseEnter(trigger);
      vi.runAllTimers();

      await waitFor(() => {
        const tooltip = screen.getByRole('tooltip');
        expect(tooltip).toHaveClass('bottom-full');
      });
    });

    it('bottom位置のクラスが適用される', async () => {
      render(
        <Tooltip content="テストツールチップ" position="bottom" delay={0}>
          <button>ホバーしてください</button>
        </Tooltip>
      );

      const trigger = screen.getByText('ホバーしてください');
      fireEvent.mouseEnter(trigger);
      vi.runAllTimers();

      await waitFor(() => {
        const tooltip = screen.getByRole('tooltip');
        expect(tooltip).toHaveClass('top-full');
      });
    });

    it('left位置のクラスが適用される', async () => {
      render(
        <Tooltip content="テストツールチップ" position="left" delay={0}>
          <button>ホバーしてください</button>
        </Tooltip>
      );

      const trigger = screen.getByText('ホバーしてください');
      fireEvent.mouseEnter(trigger);
      vi.runAllTimers();

      await waitFor(() => {
        const tooltip = screen.getByRole('tooltip');
        expect(tooltip).toHaveClass('right-full');
      });
    });

    it('right位置のクラスが適用される', async () => {
      render(
        <Tooltip content="テストツールチップ" position="right" delay={0}>
          <button>ホバーしてください</button>
        </Tooltip>
      );

      const trigger = screen.getByText('ホバーしてください');
      fireEvent.mouseEnter(trigger);
      vi.runAllTimers();

      await waitFor(() => {
        const tooltip = screen.getByRole('tooltip');
        expect(tooltip).toHaveClass('left-full');
      });
    });
  });

  describe('フォーカス対応', () => {
    it('フォーカス時にツールチップが表示される', async () => {
      render(
        <Tooltip content="テストツールチップ" delay={0}>
          <button>フォーカスしてください</button>
        </Tooltip>
      );

      const trigger = screen.getByText('フォーカスしてください').parentElement;
      if (trigger) {
        fireEvent.focus(trigger);
        vi.runAllTimers();

        await waitFor(() => {
          expect(screen.getByText('テストツールチップ')).toBeInTheDocument();
        });
      }
    });

    it('ブラー時にツールチップが非表示になる', async () => {
      render(
        <Tooltip content="テストツールチップ" delay={0}>
          <button>フォーカスしてください</button>
        </Tooltip>
      );

      const trigger = screen.getByText('フォーカスしてください').parentElement;
      if (trigger) {
        fireEvent.focus(trigger);
        vi.runAllTimers();

        await waitFor(() => {
          expect(screen.getByText('テストツールチップ')).toBeInTheDocument();
        });

        fireEvent.blur(trigger);

        await waitFor(() => {
          expect(screen.queryByText('テストツールチップ')).not.toBeInTheDocument();
        });
      }
    });
  });

  describe('無効化機能', () => {
    it('disabled=trueの場合、ツールチップが表示されない', async () => {
      render(
        <Tooltip content="テストツールチップ" disabled={true} delay={0}>
          <button>ホバーしてください</button>
        </Tooltip>
      );

      const trigger = screen.getByText('ホバーしてください');
      fireEvent.mouseEnter(trigger);
      vi.runAllTimers();

      expect(screen.queryByText('テストツールチップ')).not.toBeInTheDocument();
    });
  });

  describe('アクセシビリティ', () => {
    it('適切なARIA属性が設定される', async () => {
      render(
        <Tooltip content="テストツールチップ" delay={0}>
          <button>ホバーしてください</button>
        </Tooltip>
      );

      const trigger = screen.getByText('ホバーしてください').parentElement;
      expect(trigger).toHaveAttribute('role', 'button');
      expect(trigger).toHaveAttribute('tabIndex', '0');

      if (trigger) {
        fireEvent.mouseEnter(trigger);
        vi.runAllTimers();

        await waitFor(() => {
          expect(trigger).toHaveAttribute('aria-describedby', 'tooltip');
          const tooltip = screen.getByRole('tooltip');
          expect(tooltip).toHaveAttribute('id', 'tooltip');
        });
      }
    });
  });

  describe('カスタムコンテンツ', () => {
    it('ReactNodeコンテンツが表示される', async () => {
      const customContent = (
        <div>
          <strong>カスタム</strong>
          <span>ツールチップ</span>
        </div>
      );

      render(
        <Tooltip content={customContent} delay={0}>
          <button>ホバーしてください</button>
        </Tooltip>
      );

      const trigger = screen.getByText('ホバーしてください');
      fireEvent.mouseEnter(trigger);
      vi.runAllTimers();

      await waitFor(() => {
        expect(screen.getByText('カスタム')).toBeInTheDocument();
        expect(screen.getByText('ツールチップ')).toBeInTheDocument();
      });
    });
  });

  describe('進捗情報表示', () => {
    it('進捗情報が正しく表示される', async () => {
      const progressInfo = {
        currentValue: 75,
        previousValue: 50,
        targetValue: 100,
        details: {
          completedTasks: 3,
          totalTasks: 4,
          lastUpdated: new Date('2024-01-01'),
        },
      };

      render(
        <Tooltip content="基本コンテンツ" progressInfo={progressInfo} delay={0}>
          <button>ホバーしてください</button>
        </Tooltip>
      );

      const trigger = screen.getByText('ホバーしてください');
      fireEvent.mouseEnter(trigger);
      vi.runAllTimers();

      await waitFor(() => {
        expect(screen.getByText('進捗状況')).toBeInTheDocument();
        expect(screen.getByText('75.0%')).toBeInTheDocument();
        expect(screen.getByText('+25.0%')).toBeInTheDocument();
        expect(screen.getByText('3/4')).toBeInTheDocument();
      });
    });

    it('進捗減少時に正しい色で表示される', async () => {
      const progressInfo = {
        currentValue: 30,
        previousValue: 50,
      };

      render(
        <Tooltip content="基本コンテンツ" progressInfo={progressInfo} delay={0}>
          <button>ホバーしてください</button>
        </Tooltip>
      );

      const trigger = screen.getByText('ホバーしてください');
      fireEvent.mouseEnter(trigger);
      vi.runAllTimers();

      await waitFor(() => {
        const changeElement = screen.getByText('-20.0%');
        expect(changeElement).toHaveClass('text-red-400');
      });
    });
  });

  describe('テーマ機能', () => {
    it('ライトテーマが適用される', async () => {
      render(
        <Tooltip content="テストツールチップ" theme="light" delay={0}>
          <button>ホバーしてください</button>
        </Tooltip>
      );

      const trigger = screen.getByText('ホバーしてください');
      fireEvent.mouseEnter(trigger);
      vi.runAllTimers();

      await waitFor(() => {
        const tooltip = screen.getByRole('tooltip');
        expect(tooltip).toHaveClass('border-gray-200');
      });
    });

    it('カスタムテーマが適用される', async () => {
      const customStyle = {
        backgroundColor: '#ff0000',
        textColor: '#ffffff',
        borderColor: '#000000',
      };

      render(
        <Tooltip content="テストツールチップ" theme="custom" customStyle={customStyle} delay={0}>
          <button>ホバーしてください</button>
        </Tooltip>
      );

      const trigger = screen.getByText('ホバーしてください');
      fireEvent.mouseEnter(trigger);
      vi.runAllTimers();

      await waitFor(() => {
        const tooltip = screen.getByRole('tooltip');
        expect(tooltip).toHaveStyle({
          backgroundColor: '#ff0000',
          color: '#ffffff',
          borderColor: '#000000',
        });
      });
    });
  });

  describe('タッチ操作の詳細設定', () => {
    beforeEach(() => {
      // タッチデバイスをシミュレート
      Object.defineProperty(window, 'ontouchstart', {
        value: () => {},
        writable: true,
      });
    });

    it('長押し検出が動作する', async () => {
      const touchConfig = {
        longPressThreshold: 100,
        touchDelay: 0,
      };

      render(
        <Tooltip content="テストツールチップ" touchConfig={touchConfig} delay={0}>
          <button>タッチしてください</button>
        </Tooltip>
      );

      const trigger = screen.getByText('タッチしてください').parentElement;
      if (trigger) {
        fireEvent.touchStart(trigger);

        // 長押し時間経過
        vi.advanceTimersByTime(100);

        await waitFor(() => {
          expect(screen.getByText('テストツールチップ')).toBeInTheDocument();
        });
      }
    });

    it('短いタップでも表示される', async () => {
      const touchConfig = {
        longPressThreshold: 500,
        touchDelay: 0,
      };

      render(
        <Tooltip content="テストツールチップ" touchConfig={touchConfig} delay={0}>
          <button>タッチしてください</button>
        </Tooltip>
      );

      const trigger = screen.getByText('タッチしてください').parentElement;
      if (trigger) {
        fireEvent.touchStart(trigger);

        // 短時間でタッチ終了
        vi.advanceTimersByTime(100);
        fireEvent.touchEnd(trigger);

        await waitFor(() => {
          expect(screen.getByText('テストツールチップ')).toBeInTheDocument();
        });
      }
    });

    it('タッチ移動時に長押しがキャンセルされる', async () => {
      const touchConfig = {
        longPressThreshold: 200,
        touchDelay: 0,
      };

      render(
        <Tooltip content="テストツールチップ" touchConfig={touchConfig} delay={0}>
          <button>タッチしてください</button>
        </Tooltip>
      );

      const trigger = screen.getByText('タッチしてください').parentElement;
      if (trigger) {
        fireEvent.touchStart(trigger);

        // タッチ移動
        vi.advanceTimersByTime(100);
        fireEvent.touchMove(trigger);

        // 長押し時間経過
        vi.advanceTimersByTime(200);

        // ツールチップは表示されない
        expect(screen.queryByText('テストツールチップ')).not.toBeInTheDocument();
      }
    });
  });

  describe('アニメーション設定', () => {
    it('カスタムアニメーション設定が適用される', async () => {
      const animation = {
        duration: 500,
        easing: 'ease-in',
        scale: false,
        fade: true,
      };

      render(
        <Tooltip content="テストツールチップ" animation={animation} delay={0}>
          <button>ホバーしてください</button>
        </Tooltip>
      );

      const trigger = screen.getByText('ホバーしてください');
      fireEvent.mouseEnter(trigger);
      vi.runAllTimers();

      await waitFor(() => {
        const tooltip = screen.getByRole('tooltip');
        expect(tooltip).toHaveClass('duration-500');
        expect(tooltip).toHaveClass('fade-in-0');
        expect(tooltip).not.toHaveClass('zoom-in-95');
      });
    });
  });
});
